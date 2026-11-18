-- Limpieza (limpieza-cie) · Investigar: ronda 4 de entrenamiento de «Pregúntale» (18/11/2026).
--
-- Qué enseña (lo demás de la ronda 4 va en la app: los trabajos sin lugar cuentan en la nave que diga el título, y
-- «las 2 naves» / «Nave 1 y 2» cuentan en las dos):
--  - «Limpieza horno mantenedor Nave 1» tiene sitio propio, el Horno mantenedor Nave 1, y se suma a la Nave 1.
--  - Grupo «basuras»: basuras, sacas, tachos, contenedores y la retirada de cartón, plástico, madera y papel.
-- No borra nada. Se puede pegar dos veces.
--
-- Pegar ENTERO en el SQL Editor de limpieza-cie (uddejncrjcyyaxjocbpj) y pulsar Run.

begin;

do $$ begin
  if to_regclass('public.inv_dic') is null or not exists (
       select 1 from pg_constraint where conrelid = 'public.inv_dic'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%grupo%') then
    raise exception 'Esto va en el proyecto limpieza-cie (uddejncrjcyyaxjocbpj), después de investigar_ronda3.sql. No se ha cambiado nada.';
  end if;
end $$;

insert into public.inv_dic (tipo, palabra, valor, nota) values
  ('lugar', 'horno mantenedor nave 1', 'Horno mantenedor Nave 1', 'Ronda 4: sitio propio, se suma a la Nave 1'),
  ('grupo', 'basuras', 'basura, saca, tacho, contenedor, carton, plastico, madera, papel', 'Ronda 4: basuras, sacas, tachos y retirada de cartón, plástico y madera')
on conflict (tipo, palabra) do update set valor = excluded.valor, nota = excluded.nota;

commit;

-- Comprobación: tienen que salir 1 lugar y 1 grupo de la ronda 4
select tipo, palabra, valor from public.inv_dic where nota like 'Ronda 4%' order by tipo, palabra;
