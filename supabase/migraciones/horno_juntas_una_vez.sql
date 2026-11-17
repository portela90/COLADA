-- Hornos (limpieza-cie): las juntas de un horno se descuentan una sola vez por día.
--
-- Por qué (Cristian, 17/11/2026): al cambiar la tolva se descuentan sus juntas y al cambiar el cono también las suyas,
-- que son las mismas. Si se cambian las dos cosas (o además se marca «Cambio de juntas»), las juntas salían 2 o 3 veces
-- (H-F66, 12/11: 6 JPC-375 y 3 JPF-365 en vez de 2 y 1).
-- Ahora, al descontar las juntas de un cambio, se resta lo que ya se ha descontado de esa misma junta en ese horno
-- ese mismo día: cuenta lo que diga el cambio que más juntas lleve, no la suma. Las demás piezas no cambian.
-- (La app, además, ya no manda las juntas repetidas cuando se marcan tolva y cono juntos.)
-- No cambia nada de lo ya apuntado: lo repetido del 12/11 se quita con «Corregir» en la ficha del horno.
--
-- Pegar ENTERO en el SQL Editor de limpieza-cie (uddejncrjcyyaxjocbpj) y pulsar Run.

begin;

do $$ begin
  if to_regclass('public.consumos_horno') is null then
    raise exception 'Esto va en el proyecto limpieza-cie (uddejncrjcyyaxjocbpj). No se ha cambiado nada.';
  end if;
end $$;

create or replace function public.ots_consumo_horno()
 returns trigger language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare
  e record; s text; j jsonb; rid bigint; v_env text; v_info text; v_quien uuid; v_qn text; v_maq text; v_nave text; v_eid text; n int := 0;
  v_fecha date; v_cant numeric; v_ya numeric;
begin
  if NEW.elemento_id is null or NEW.accion_horno is null or NEW.accion_horno not like 'cambio%' or NEW.estado is distinct from 'hecha' then return NEW; end if;
  if TG_OP = 'UPDATE' and OLD.estado = 'hecha' then return NEW; end if;
  if exists (select 1 from consumos_horno where ot_id = NEW.id) then return NEW; end if;
  select codigo, nombre, recambios into e from elementos where id = NEW.elemento_id;
  if e.recambios is null or e.recambios = '{}'::jsonb then return NEW; end if;
  select v into s from config_int where k = 'consumo_limpieza';
  v_quien := coalesce(NEW.hecho_por, NEW.creado_por);
  select nombre into v_qn from trabajadores where id = v_quien;
  v_maq := regexp_replace(coalesce(e.codigo, ''), '^H-', '');
  v_nave := _nave_de(NEW.nave, NEW.lugar);
  v_fecha := coalesce((NEW.fin at time zone 'Europe/Madrid')::date, NEW.fecha, (now() at time zone 'Europe/Madrid')::date);
  for j in select * from jsonb_array_elements(_horno_items(e.recambios, NEW.accion_horno, NEW.tolva_tipo, NEW.juntas)) loop
    v_cant := (j->>'cant')::numeric;
    -- juntas: solo lo que falte respecto a lo ya descontado de esa junta en este horno hoy
    if coalesce(j->>'que', '') like 'junta%' and j->>'art' is not null then
      select coalesce(sum(c.cant), 0) into v_ya
        from consumos_horno c join ots o on o.id = c.ot_id
       where c.elemento_id = NEW.elemento_id and c.fecha = v_fecha and c.alm_art = j->>'art'
         and c.envio <> 'anulado' and coalesce(c.accion, '') <> 'anulado' and not o.borrado and c.ot_id <> NEW.id;
      v_cant := v_cant - v_ya;
      if v_cant <= 0 then continue; end if;
    end if;
    n := n + 1; rid := null; v_info := null;
    v_eid := 'hor_' || NEW.id::text || '_' || n;
    if j->>'art' is null then
      v_env := 'sin_enviar'; v_info := 'falta decir si la tolva es de hierro o refractaria';
    elsif s is null then
      v_env := 'sin_enviar'; v_info := 'falta la clave interna';
    else
      begin
        rid := net.http_post(
          url := 'https://whemhkcrgwyjucpaswrm.supabase.co/rest/v1/rpc/alm_consumo_limpieza',
          headers := jsonb_build_object('Content-Type', 'application/json', 'Content-Profile', 'public', 'apikey', 'sb_publishable_hcFf66q2-0X6pR1gq5YKpw_u4G6HriG'),
          body := jsonb_build_object('p_secreto', s, 'p_art', j->>'art', 'p_cant', v_cant,
                                     'p_nota', 'Horno ' || e.codigo || ': ' || replace(NEW.accion_horno, '_', ' '), 'p_id', v_eid, 'p_maq', v_maq,
                                     'p_motivo', coalesce(NEW.motivo, ''), 'p_resp', coalesce(v_qn, '')));
        v_env := 'pendiente';
      exception when others then v_env := 'fallo'; v_info := left(sqlerrm, 200);
      end;
    end if;
    insert into consumos_horno (ot_id, elemento_id, horno, maq, accion, fecha, cuando, alm_art, cant, hecho_por, hecho_por_n, nave, envio, req_id, envio_info, envio_id)
    values (NEW.id, NEW.elemento_id, e.codigo, v_maq, NEW.accion_horno, v_fecha,
            coalesce(NEW.fin, now()), j->>'art', v_cant, v_quien, v_qn, v_nave, v_env, rid, v_info, v_eid)
    on conflict (envio_id) do nothing;
  end loop;
  return NEW;
end $function$;

commit;

-- Comprobación: tiene que salir «todo bien = true»
select prosrc like '%v_ya%' and prosrc like '%Content-Profile%' as "todo bien" from pg_proc where proname = 'ots_consumo_horno' and pronamespace = 'public'::regnamespace;
