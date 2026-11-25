-- Almacén (colada-mapri) · El Pistonwax que repone Limpieza sale del almacén principal del artículo (25/11/2026).
--
-- Qué pasaba: cuando Limpieza repone un bidón de Pistonwax dúo 15, la función alm_consumo_limpieza lo trasladaba
-- siempre desde el «Almacén general» (gen). Pero las entradas del Pistonwax van al «Almacén de consumibles N1» (cn1),
-- que es su almacén principal en el catálogo y donde están de verdad los bidones. Resultado: el Almacén general se
-- quedaba en negativo y Consumibles N1 con más de lo que hay.
--
-- Qué cambia: el bidón repuesto sale del almacén principal del artículo (el que pone su ficha en el catálogo; hoy
-- Consumibles N1). Si algún día cambias el almacén principal en la ficha, la reposición le sigue sola.
-- Si el artículo no tuviera almacén principal, sale del Almacén general, como antes.
-- Lo demás de la función queda igual (aceites a «Baldas aceites y taladrinas», el resto a su almacén principal).
-- No toca ningún apunte ya hecho. Se puede pegar dos veces.
--
-- Pegar ENTERO en el SQL Editor de colada-mapri (whemhkcrgwyjucpaswrm) y pulsar Run.

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
    if p_nota ~* 'nave\s*1\s*b\M' then v_punto := 'n1b'; v_nave := 'Nave 1B';
    elsif p_nota ~* 'nave\s*2\M' then v_punto := 'n2'; v_nave := 'Nave 2';
    elsif p_nota ~* 'nave\s*1' then v_punto := 'n1'; v_nave := 'Nave 1A';
    end if;
    if v_punto is not null then
      v_hay := public._alm_stock(p_art, v_punto);
      v_recs := '[]'::jsonb;
      if v_hay > 0 then
        v_recs := v_recs || jsonb_build_array(jsonb_build_object('f', v_f, 'id', p_id, 'ts', v_ts, 'tipo', 'salida', 'art', p_art,
          'alm', v_punto, 'cant', v_hay, 'nave', v_nave, 'nota', coalesce(p_nota, 'Limpieza') || ' · consumido el bidón que había'));
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
select case when pg_get_functiondef('public.alm_consumo_limpieza(text,text,numeric,text,text)'::regprocedure) like '%almacén principal del artículo (Consumibles N1)%'
  then 'sí: el Pistonwax sale de su almacén principal' else 'NO se ha cambiado' end comprobado;
