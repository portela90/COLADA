-- 27/10/2026 · Corregir el material descontado de una OT de horno ya hecha
-- (p. ej. se apuntó cambio de cono y al final no hizo falta).
-- Aplicado en limpieza-cie (uddejncrjcyyaxjocbpj).
--   · _horno_puede_corregir(t, o): admin, encargado de limpieza, responsable de hornos o quien lo hizo; OT hecha de cambio.
--   · horno_piezas_ot(p_tok, p_ot): piezas descontadas en esa OT (con nombre).
--   · horno_corregir_material(p_tok, p_ot, p_piezas): anula en el Almacén lo descontado antes
--     (alm_consumo_quitar) y vuelve a descontar solo las piezas indicadas (alm_consumo_limpieza).
--   · Las filas anuladas no se borran: envio='anulado', accion='anulado', elemento_id=null (así no cuentan en horno_gasto).

create or replace function public._horno_puede_corregir(t trabajadores, o ots)
returns boolean language sql stable security definer set search_path to 'public'
as $f$
  select (t.rol = 'admin' or _es_enc(t) or _es_resp_hornos(t) or o.hecho_por = t.id)
     and o.estado = 'hecha' and o.accion_horno like 'cambio%' and o.elemento_id is not null and not o.borrado
$f$;

create or replace function public.horno_piezas_ot(p_tok uuid, p_ot uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $f$
declare t trabajadores; o ots;
begin
  t := _yo(p_tok);
  select * into o from ots where id = p_ot and not borrado;
  if not found then raise exception 'NO_EXISTE'; end if;
  if not _horno_puede_corregir(t, o) then raise exception 'NO_PERMITIDO'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('art', h.alm_art, 'nombre', coalesce(p.nombre, h.alm_art),
                                                      'cant', h.cant, 'envio', h.envio) order by h.id)
                     from consumos_horno h left join precios_alm p on p.alm_art = h.alm_art
                    where h.ot_id = p_ot and h.alm_art is not null and h.envio <> 'anulado'), '[]'::jsonb);
end $f$;

create or replace function public.horno_corregir_material(p_tok uuid, p_ot uuid, p_piezas jsonb)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions'
as $f$
declare t trabajadores; o ots; r record; j jsonb; s text; v_cod text; v_quien uuid; v_qn text;
  v_maq text; v_nave text; v_eid text; v_rid bigint; v_info text; v_env text; v_fecha date; v_cuando timestamptz;
  n int := 0; v_quit int := 0;
begin
  t := _yo(p_tok);
  select * into o from ots where id = p_ot and not borrado;
  if not found then raise exception 'NO_EXISTE'; end if;
  if not _horno_puede_corregir(t, o) then raise exception 'NO_PERMITIDO'; end if;
  if p_piezas is null or jsonb_typeof(p_piezas) <> 'array' then raise exception 'PIEZAS_MAL'; end if;
  -- solo piezas que se descontaron en esta OT, y entre 1 y 20 unidades
  if exists (select 1 from jsonb_array_elements(p_piezas) x
              where not exists (select 1 from consumos_horno h where h.ot_id = p_ot and h.alm_art = x->>'art' and h.envio <> 'anulado')
                 or (x->>'cant')::numeric not between 1 and 20) then raise exception 'PIEZA_MAL'; end if;

  select codigo into v_cod from elementos where id = o.elemento_id;
  select v into s from config_int where k = 'consumo_limpieza';

  -- 1) anular en el Almacén lo que se descontó antes
  for r in select envio_id from consumos_horno where ot_id = p_ot and envio_id is not null and envio <> 'anulado' loop
    v_quit := v_quit + 1;
    if s is not null then
      begin
        perform net.http_post(
          url := 'https://whemhkcrgwyjucpaswrm.supabase.co/rest/v1/rpc/alm_consumo_quitar',
          headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'sb_publishable_hcFf66q2-0X6pR1gq5YKpw_u4G6HriG'),
          body := jsonb_build_object('p_secreto', s, 'p_id', r.envio_id));
      exception when others then null;
      end;
    end if;
  end loop;
  update consumos_horno set envio = 'anulado', accion = 'anulado', elemento_id = null
   where ot_id = p_ot and envio <> 'anulado';

  -- 2) descontar solo lo indicado
  v_quien := coalesce(o.hecho_por, o.creado_por);
  select nombre into v_qn from trabajadores where id = v_quien;
  v_maq := regexp_replace(coalesce(v_cod, ''), '^H-', '');
  v_nave := _nave_de(o.nave, o.lugar);
  v_fecha := coalesce((o.fin at time zone 'Europe/Madrid')::date, o.fecha, (now() at time zone 'Europe/Madrid')::date);
  v_cuando := coalesce(o.fin, now());
  for j in select * from jsonb_array_elements(p_piezas) loop
    n := n + 1;
    v_eid := 'hor_' || p_ot::text || '_c' || (extract(epoch from clock_timestamp()) * 1000)::bigint::text || '_' || n;
    v_rid := null; v_info := null;
    if s is null then
      v_env := 'sin_enviar'; v_info := 'falta la clave interna';
    else
      begin
        v_rid := net.http_post(
          url := 'https://whemhkcrgwyjucpaswrm.supabase.co/rest/v1/rpc/alm_consumo_limpieza',
          headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'sb_publishable_hcFf66q2-0X6pR1gq5YKpw_u4G6HriG'),
          body := jsonb_build_object('p_secreto', s, 'p_art', j->>'art', 'p_cant', (j->>'cant')::numeric,
                                     'p_nota', 'Horno ' || v_cod || ': ' || replace(o.accion_horno, '_', ' ') || ' (corregido)',
                                     'p_id', v_eid, 'p_maq', v_maq));
        v_env := 'pendiente';
      exception when others then v_env := 'fallo'; v_info := left(sqlerrm, 200);
      end;
    end if;
    insert into consumos_horno (ot_id, elemento_id, horno, maq, accion, fecha, cuando, alm_art, cant, hecho_por, hecho_por_n, nave, envio, req_id, envio_info, envio_id)
    values (p_ot, o.elemento_id, v_cod, v_maq, o.accion_horno, v_fecha, v_cuando, j->>'art', (j->>'cant')::numeric,
            v_quien, v_qn, v_nave, v_env, v_rid, v_info, v_eid);
  end loop;

  return jsonb_build_object('quitados', v_quit, 'puestos', n, 'almacen', case when s is null then 'sin clave' else 'enviado' end);
end $f$;
