-- Hornos (limpieza-cie): en la ficha del horno, los cambios de piezas y los vaciados cuentan los registre quien los registre.
--
-- Por qué: la regla «la limpieza de un horno solo se ve en la ficha si la hace un operario de hornos»
-- (horno_solo_operarios.sql, 30/10/2026) se aplicaba también a los cambios. Los que registró alguien sin la
-- habilidad «hornos» (por ejemplo el jefe con «Registrar en el horno») no salían en «Último registro» ni en el
-- «Historial», aunque sí en «Últimos cambios» (que sale del gasto). Pasaba en el H-F66 (12/11: tolva, cono y juntas)
-- y en el H-F61 (9/11: tolva).
-- Ahora la regla de la habilidad solo se aplica a las limpiezas. No se borra ni se cambia ningún dato.
--
-- Pegar ENTERO en el SQL Editor de limpieza-cie (uddejncrjcyyaxjocbpj) y pulsar Run.

begin;

do $$ begin
  if to_regprocedure('public._limpieza_horno_valida(ots)') is null then
    raise exception 'Esto va en el proyecto limpieza-cie (uddejncrjcyyaxjocbpj). No se ha cambiado nada.';
  end if;
end $$;

create or replace function public._limpieza_horno_valida(o ots)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case
    -- cambios de piezas y vaciados: siempre cuentan
    when coalesce(o.accion_horno, 'limpieza') <> 'limpieza' then true
    -- limpiezas: solo si las hace un operario con la habilidad «hornos»
    else (o.accion_horno is not null or o.tipo = 'Limpieza horno')
         and exists (select 1 from limp_habilidad h where h.trabajador = o.hecho_por and h.habilidad = 'hornos' and h.activo)
  end
$function$;

commit;

-- Comprobación: tienen que salir los cambios del H-F66 del 12/11 con «se ve = true»
select (select codigo from elementos e where e.id = o.elemento_id) horno, o.fecha, o.accion_horno, _limpieza_horno_valida(o) as "se ve"
  from ots o where o.accion_horno like 'cambio%' and not o.borrado and o.fecha >= '2026-11-09' order by o.fecha, horno;
