-- Limpieza (limpieza-cie) · Investigar: ronda 5 de entrenamiento de «Pregúntale» (18/11/2026).
--
-- Qué enseña (lo de «Nave II», «N2», «N-1B» va en la app):
--  - «Vaciar bandejas escoria» es del Horno fusión Nave 1 (aparte de la nave, como el horno).
--  - Rebabax es una empresa externa: sitio aparte, no se suma a ninguna nave.
--  - Grupo «zonas comunes»: zona de café, taller mecánico, almacén y zona de limpieza de moldes.
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
  ('lugar', 'bandejas escoria', 'Horno fusión Nave 1', 'Ronda 5: las bandejas de escoria son del horno de fusión de la Nave 1'),
  ('lugar', 'rebabax', 'Rebabax (empresa externa)', 'Ronda 5: empresa externa, aparte de las naves'),
  ('grupo', 'zonas comunes', 'cafe, taller, almacen, moldes', 'Ronda 5: zona de café, taller mecánico, almacén y zona de limpieza de moldes')
on conflict (tipo, palabra) do update set valor = excluded.valor, nota = excluded.nota;

commit;

-- Comprobación: tienen que salir 2 lugares y 1 grupo de la ronda 5
select tipo, palabra, valor from public.inv_dic where nota like 'Ronda 5%' order by tipo, palabra;
