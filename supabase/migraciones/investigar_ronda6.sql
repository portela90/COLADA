-- Limpieza (limpieza-cie) · Investigar: ronda 6 de entrenamiento de «Pregúntale» (18/11/2026).
--
-- Qué enseña: el grupo «rutinas». Son avisos que en realidad son rutinas (cosas que hay que hacer siempre, no problemas):
-- 5S, cambiar bidones (taladrina, jabón, GRG de aceite térmico), reponer Pistonwax, desgasificadora y bolones, llevar insertos,
-- vaciar barreduras y viruta, basuras, tachos y sacas.
--  - En «¿qué trabajos son los que más se repiten?» salen aparte, como «Rutinas pedidas como aviso».
--  - Y se puede preguntar por ellas: «¿cuánto tiempo en rutinas este mes?».
-- Para cambiar la lista, en la app: Investigar › Pregúntale › Enséñale › «Grupos de trabajos» › rutinas.
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
  ('grupo', 'rutinas', '5s, bidon, grg, pistonwax, desgasificadora, bolon, insertos, barredura, viruta, basura, tacho, saca',
   'Ronda 6: avisos que son rutinas, salen aparte de los problemas')
on conflict (tipo, palabra) do update set valor = excluded.valor, nota = excluded.nota;

commit;

-- Comprobación: tiene que salir el grupo «rutinas»
select tipo, palabra, valor from public.inv_dic where nota like 'Ronda 6%';
