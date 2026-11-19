-- Coladas (colada-mapri) · Historial de los recuentos diarios (19/11/2026).
--
-- Hasta ahora la app solo guardaba el ÚLTIMO recuento de cada nave (cfg › rdiarioN). Desde hoy, cada recuento
-- también se apunta en el documento rdh/hist, y «Stock de un día» enseña al lado de cada colada lo que se contó ese día.
-- Este archivo rellena ese historial con los recuentos de antes, sacados del historial de cambios de cfg (docs_hist).
-- No borra ni cambia nada de lo que hay: solo añade los que falten. Se puede pegar dos veces.
--
-- Pegar ENTERO en el SQL Editor de colada-mapri (whemhkcrgwyjucpaswrm) y pulsar Run.

begin;

do $$ begin
  if to_regclass('public.docs') is null or to_regclass('public.docs_hist') is null
     or not exists (select 1 from public.docs where col = 'cfg' and id = 'app') then
    raise exception 'Esto va en el proyecto colada-mapri (whemhkcrgwyjucpaswrm). No se ha cambiado nada.';
  end if;
end $$;

with todos as (
  -- los recuentos que estuvieron alguna vez en cfg (historial) y los de ahora
  select e.key nave, e.value v from public.docs_hist h, jsonb_each(h.data -> 'rdiarioN') e
   where h.col = 'cfg' and jsonb_typeof(h.data -> 'rdiarioN') = 'object' and e.value ? 'c' and e.value ? 'ts'
  union all
  select e.key, e.value from public.docs d, jsonb_each(d.data -> 'rdiarioN') e
   where d.col = 'cfg' and d.id = 'app' and jsonb_typeof(d.data -> 'rdiarioN') = 'object' and e.value ? 'c' and e.value ? 'ts'
),
unicos as (
  select distinct on (nave, v ->> 'ts') nave, v from todos order by nave, v ->> 'ts'
),
ya as (
  select coalesce((select data -> 'items' from public.docs where col = 'rdh' and id = 'hist'), '[]'::jsonb) items
),
nuevos as (
  select jsonb_agg(u.v || jsonb_build_object('i', 'r' || (u.v ->> 'ts'), 'nave', u.nave) order by (u.v ->> 'ts')::bigint) items
    from unicos u, ya
   where not exists (select 1 from jsonb_array_elements(ya.items) x where x ->> 'nave' = u.nave and x ->> 'ts' = u.v ->> 'ts')
)
insert into public.docs (col, id, data)
select 'rdh', 'hist', jsonb_build_object('items', ya.items || coalesce(nuevos.items, '[]'::jsonb)) from ya, nuevos
on conflict (col, id) do update set data = excluded.data;

commit;

-- Comprobación: recuentos guardados por nave y desde cuándo
select x ->> 'nave' nave, count(*) recuentos, min(x ->> 'f') desde, max(x ->> 'f') hasta
  from public.docs d, jsonb_array_elements(d.data -> 'items') x where d.col = 'rdh' and d.id = 'hist' group by 1 order by 1;
