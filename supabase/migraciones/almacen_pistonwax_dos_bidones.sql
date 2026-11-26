-- Almacén (colada-mapri) · Pistonwax: si Limpieza repone 2 bidones de golpe, cuenta los 2 como gastados (26/11/2026).
--
-- Qué pasaba: al reponer Pistonwax dúo 15, la función daba por gastado solo el bidón que había puesto en la nave
-- (110 kg) aunque repusieran 2 (220 kg). El 25/11 en la Nave 1A se repusieron 220 kg y solo constó 1 bidón gastado,
-- y el punto se quedó con 220 kg «puestos».
-- Qué cambia: lo gastado es lo que había puesto o lo repuesto, lo que sea más. Con 1 bidón puesto y 2 repuestos
-- se gastan 2 y en el punto sigue quedando 1. Con 1 y 1, como siempre. No toca ningún apunte ya hecho.
-- Lo demás de la función queda igual (sale del almacén principal del artículo, aceites a sus baldas, etc.).

begin;

do $$ begin
  if to_regclass('public.docs') is null or to_regprocedure('public.alm_consumo_limpieza(text,text,numeric,text,text)') is null then
    raise exception 'Esto va en el proyecto colada-mapri (whemhkcrgwyjucpaswrm). No se ha cambiado nada.';
  end if;
end $$;

CREATE OR REPLACE FUNCTION public.alm_consumo_limpieza(p_secreto text, p_art text, p_cant numeric, p_nota text, p_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ahora timestamptz := clock_timestamp();
  v_mes text := to_char(v_ahora at time zone 'Europe/Madrid', 'YYYY-MM');
  v_f text := to_char(v_ahora at time zone 'Europe/Madrid', 'YYYY-MM-DD');
  v_ts bigint := (extract(epoch from v_ahora) * 1000)::bigint;
  v_recs jsonb;
  v_alm text;
  v_ppal text;
  v_punto text; v_nave text; v_hay numeric;
begin
  if not exists (select 1 from public.secretos_int where k = 'consumo_limpieza' and v = p_secreto) then
    raise exception 'no autorizado';
  end if;
  if p_art is null or p_cant is null or p_cant <= 0 then
    raise exception 'datos no válidos';
  end if;
  if exists (
    select 1 from public.docs d, jsonb_array_elements(coalesce(d.data->'items', '[]'::jsonb)) x
    where d.col = 'alm_mov' and x->>'id' in (p_id, p_id || '_tr')
  ) then
    return;
  end if;
  -- almacén principal del artículo (ficha del catálogo)
  select a->>'almPpal' into v_ppal from public.docs d, jsonb_array_elements(d.data->'articulos') a
    where d.col = 'alm_cat' and d.id = 'app' and a->>'id' = p_art limit 1;
  if p_art = 'murbko6upl68d' then
    -- Pistonwax dúo 15: el bidón que había en el punto de la nave (N1A, N1B o N2) se da por consumido
    -- y lo repuesto pasa del almacén principal del artículo (Consumibles N1) a ese punto. «Nave 1» sin letra = N1A.
    -- Si reponen 2 bidones de golpe, se han gastado los 2 (26/11/2026).
    if p_nota ~* 'nave\s*1\s*b\M' then v_punto := 'n1b'; v_nave := 'Nave 1B';
    elsif p_nota ~* 'nave\s*2\M' then v_punto := 'n2'; v_nave := 'Nave 2';
    elsif p_nota ~* 'nave\s*1' then v_punto := 'n1'; v_nave := 'Nave 1A';
    end if;
    if v_punto is not null then
      v_hay := public._alm_stock(p_art, v_punto);
      v_recs := '[]'::jsonb;
      if v_hay > 0 then
        -- si reponen más de lo que había puesto (p. ej. 2 bidones, 220 kg, con 1 puesto), se han gastado todos los
        -- repuestos: en el punto sigue quedando lo que había (26/11/2026)
        v_recs := v_recs || jsonb_build_array(jsonb_build_object('f', v_f, 'id', p_id, 'ts', v_ts, 'tipo', 'salida', 'art', p_art,
          'alm', v_punto, 'cant', greatest(v_hay, p_cant), 'nave', v_nave, 'nota', coalesce(p_nota, 'Limpieza') ||
          case when p_cant > v_hay then ' · consumidos ' || (p_cant / 110)::int || ' bidones' else ' · consumido el bidón que había' end));
      end if;
      v_recs := v_recs || jsonb_build_array(jsonb_build_object('f', v_f, 'id', p_id || '_tr', 'ts', v_ts + 1, 'tipo', 'traslado', 'art', p_art,
        'alm', coalesce(nullif(v_ppal, ''), 'gen'), 'dest', v_punto, 'cant', p_cant, 'nota', coalesce(p_nota, 'Limpieza') || ' · repuesto'));
      insert into public.docs (col, id, data)
      values ('alm_mov', v_mes, jsonb_build_object('items', v_recs))
      on conflict (col, id) do update
        set data = jsonb_set(coalesce(public.docs.data, '{}'::jsonb), '{items}',
                             coalesce(public.docs.data->'items', '[]'::jsonb) || v_recs);
      return;
    end if;
    v_alm := coalesce(nullif(v_ppal, ''), 'gen');  -- sin nave: sale de su almacén principal
  elsif p_art in ('68dfcbac40e836','f0f770138dfe41','1aad128f4c9038','murbntzamwawf','5585ca56f03c26',
               '16f8b603ea4df1','8ab114d9c357dc','c2cb2372d73946','da5cf6517cd2e1') then
    -- aceites, taladrinas y jabones: «Baldas aceites y taladrinas»
    v_alm := 'murbt2pa0rbc0';
  else
    -- el resto: el almacén principal del artículo y, si no tiene, el Almacén general
    v_alm := coalesce(nullif(v_ppal, ''), 'gen');
  end if;
  v_recs := jsonb_build_array(jsonb_build_object('f', v_f, 'id', p_id, 'ts', v_ts, 'tipo', 'salida', 'art', p_art,
    'alm', v_alm, 'cant', p_cant, 'nota', p_nota));
  insert into public.docs (col, id, data)
  values ('alm_mov', v_mes, jsonb_build_object('items', v_recs))
  on conflict (col, id) do update
    set data = jsonb_set(coalesce(public.docs.data, '{}'::jsonb), '{items}',
                         coalesce(public.docs.data->'items', '[]'::jsonb) || v_recs);
end $function$;

commit;

-- Comprobación: tiene que salir «sí»
select case when pg_get_functiondef('public.alm_consumo_limpieza(text,text,numeric,text,text)'::regprocedure) like '%greatest(v_hay, p_cant)%'
  then 'sí: si reponen 2 bidones se cuentan los 2' else 'NO se ha cambiado' end comprobado;
