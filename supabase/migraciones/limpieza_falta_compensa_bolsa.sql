-- Limpieza (limpieza-cie) · Motivo de falta nuevo: «Compensa horas (bolsa)» (23/11/2026).
--
-- Para el día en que alguien no viene y se le paga con las horas que tiene guardadas en la bolsa
-- (por ejemplo, Ahmed cuando vuelva Aziz). Antes había que usar «Otra falta».
-- La app lo guarda como 'compensa' en horas_dia.falta. Este archivo solo deja que la base de datos lo acepte:
-- cambia la regla de los valores permitidos (baja, vacaciones, permiso, otro) añadiendo 'compensa'.
-- No borra ni cambia ningún dato. Se puede pegar dos veces.
--
-- Pegar ENTERO en el SQL Editor de limpieza-cie (uddejncrjcyyaxjocbpj) y pulsar Run.

begin;

do $$ begin
  if to_regclass('public.horas_dia') is null or to_regprocedure('public._admin(uuid)') is null then
    raise exception 'Esto va en el proyecto limpieza-cie (uddejncrjcyyaxjocbpj). No se ha cambiado nada.';
  end if;
end $$;

alter table public.horas_dia drop constraint if exists horas_dia_falta_check;
alter table public.horas_dia add constraint horas_dia_falta_check
  check (falta is null or falta in ('baja', 'vacaciones', 'permiso', 'compensa', 'otro'));

commit;

-- Comprobación: tiene que salir la regla con 'compensa'
select pg_get_constraintdef(oid) regla from pg_constraint where conname = 'horas_dia_falta_check';
