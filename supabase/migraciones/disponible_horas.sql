-- =====================================================================
-- REPARTO AUTOMÁTICO: «¿trabaja ese día?» tiene en cuenta las Horas del día — limpieza-cie
-- Antes solo miraba el horario fijo; si alguien del equipo de semana venía el finde con horas extra
-- (apuntadas en «Horas del día»), la app creía que no estaba y pasaba sus trabajos a otro.
-- Orden: falta/vacaciones → no está; Horas del día con horas → está (con falta o 0 h → no);
--        horas extra (extras o sustitución «Horas extra») → está; si no hay nada apuntado, su horario fijo.
-- =====================================================================
create or replace function public._disponible(w public.trabajadores, f date) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select w.activo and w.rol<>'admin'
    and not exists(select 1 from sustituciones s where s.ausente=w.id and f between s.desde and s.hasta and not s.borrado and coalesce(s.motivo,'')<>'Horas extra')
    and not exists(select 1 from cal_vac v where v.trabajador=w.id and f between v.desde and v.hasta and not v.borrado)
    and (
      exists(select 1 from horas_dia h where h.trabajador=w.id and h.fecha=f and h.falta is null and coalesce(h.trabajadas,0)>0)
      or exists(select 1 from extras e where e.trabajador=w.id and e.fecha=f and not e.borrado)
      or exists(select 1 from sustituciones s where s.sustituto=w.id and f between s.desde and s.hasta and not s.borrado and s.motivo='Horas extra')
      or (not exists(select 1 from horas_dia h where h.trabajador=w.id and h.fecha=f)
          and case when w.horario ? _dia(f) and jsonb_typeof(w.horario->_dia(f))='array'
                   then jsonb_array_length(w.horario->_dia(f))>0
                   else (case when extract(isodow from f)>=6 then 'Finde' else 'Semana' end) = any(w.equipos) end)) $$;
