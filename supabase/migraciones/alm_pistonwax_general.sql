-- =====================================================================
-- Almacén (colada-mapri): el Pistonwax dúo 15 que repone limpieza sale del Almacén general
-- (en vez de Consumibles N1, que es su almacén principal).
-- =====================================================================
do $m$
declare d text;
begin
  select pg_get_functiondef('public.alm_consumo_limpieza(text,text,numeric,text,text)'::regprocedure) into d;
  if position('murbko6upl68d' in d)>0 then return; end if;
  if position(E'  else\n    select a->>''almPpal''' in d)=0 then raise exception 'No se encontró el punto de cambio en alm_consumo_limpieza'; end if;
  d := replace(d, E'  else\n    select a->>''almPpal''', E'  elsif p_art = ''murbko6upl68d'' then\n    v_alm := ''gen'';  -- Pistonwax dúo 15: sale del Almacén general\n  else\n    select a->>''almPpal''');
  EXECUTE d;
end $m$;
