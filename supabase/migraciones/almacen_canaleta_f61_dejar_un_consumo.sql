-- Almacén (colada-mapri) · Canaleta K (78795K) en la F61 del 25/11/2026: deja UN solo consumo.
--
-- El consumo se guardó 4 veces seguidas (14:45, 14:47, 14:47 y 14:48). Este archivo:
--  · deja el primero (25/11/2026, F61, 1 ud, de Consumibles N1) y le pone «Iñigo Urizar» como quien la cambió;
--  · quita los otros 3 (son copias del mismo cambio).
-- Solo toca esos 4 apuntes. Se puede pegar dos veces (la segunda ya no cambia nada).
--
-- Pegar ENTERO en el SQL Editor de colada-mapri (whemhkcrgwyjucpaswrm) y pulsar Run.

begin;

do $$ begin
  if to_regclass('public.docs') is null or not exists (select 1 from public.docs where col = 'alm_cat' and id = 'app') then
    raise exception 'Esto va en el proyecto colada-mapri (whemhkcrgwyjucpaswrm). No se ha cambiado nada.';
  end if;
end $$;

update public.docs d set data = jsonb_set(d.data, '{items}', (
  select jsonb_agg(case when x->>'id' = 'mww6f80y6k742' then x || '{"resp":"Iñigo Urizar"}'::jsonb else x end order by o)
    from jsonb_array_elements(d.data->'items') with ordinality t(x, o)
   where x->>'id' not in ('mww6gre8ronw8', 'mww6hflgnek3t', 'mww6iidauyabx')))
where d.col = 'alm_mov' and d.id = '2026-11'
  and exists (select 1 from jsonb_array_elements(d.data->'items') x where x->>'id' = 'mww6f80y6k742');

commit;

-- Comprobación: tiene que salir UNA fila (F61, 1, Iñigo Urizar)
select x->>'f' fecha, x->>'maq' maquina, x->>'cant' cantidad, x->>'resp' cambiada_por
  from public.docs d, jsonb_array_elements(d.data->'items') x
 where d.col = 'alm_mov' and d.id = '2026-11' and x->>'art' = 'mul7t56mv8666' and x->>'f' = '2026-11-25';
