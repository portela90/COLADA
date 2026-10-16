-- =====================================================================
-- ALARMA DE VACIADO POR HORNO — limpieza-cie (sustituye al resumen de los lunes)
-- Cada día a las 8:05 (hora de Madrid en invierno, 9:05 en verano) revisa cada horno y avisa al jefe
-- 30, 15, 7, 3 y 1 días antes del límite, el último día y, si se pasa, cada lunes.
-- No avisa si el horno es una excepción, no tiene fecha o ya tiene una OT de vaciado abierta.
-- =====================================================================
create or replace function public._alarma_vaciados() returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare r record; m jsonb := '[]'; n int := 0;
begin
  for r in select e.codigo, e.nombre, _ult_vaciado(e)+e.vaciado_dias as lim, (_ult_vaciado(e)+e.vaciado_dias) - _hoy() as rest
           from elementos e where e.tipo='horno' and e.activo and not e.borrado and not e.vaciado_excepcion and e.vaciado_dias is not null and _ult_vaciado(e) is not null
             and not exists(select 1 from ots o where o.elemento_id=e.id and not o.borrado and o.estado in ('pendiente','en_curso') and o.accion_horno='vaciado') loop
    if r.rest in (30,15,7,3,1,0) or (r.rest<0 and extract(isodow from _hoy())=1) then
      m := m || jsonb_build_object('trabajadores',_admins(),'tag','vac-'||r.codigo,'url','limpieza.html?el='||r.codigo,'urgente',r.rest<=7,
        'titulo',case when r.rest<0 then '🚨 '||replace(r.codigo,'H-','')||': vaciado atrasado '||(-r.rest)||' días'
                      when r.rest=0 then '🚨 '||replace(r.codigo,'H-','')||': hoy es el último día para vaciarlo'
                      when r.rest=1 then '⚠ '||replace(r.codigo,'H-','')||': mañana se cumple el año sin vaciar'
                      else '🫗 '||replace(r.codigo,'H-','')||': quedan '||r.rest||' días para vaciarlo' end,
        'texto',r.nombre||' · límite '||to_char(r.lim,'DD/MM/YYYY')||'. Vaciarlo a tiempo evita el cambio de tolva y cono.');
      n := n+1;
    end if;
  end loop;
  if n>0 then perform _avisar(jsonb_build_object('mensajes',m)); end if;
  return jsonb_build_object('alarmas',n);
end $$;
revoke all on function public._alarma_vaciados() from public, anon, authenticated;
select cron.schedule('limpieza-aviso-vaciados','5 6 * * *','select public._alarma_vaciados()');
