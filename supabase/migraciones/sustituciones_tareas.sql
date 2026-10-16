-- Sustituciones: la persona que cubre ve también los trabajos de «todo el equipo» del equipo de quien falta,
-- y quien falta deja de recibir los recordatorios de trabajos pendientes.
create or replace function public._ve(t trabajadores, o ots) returns boolean
language sql stable security definer set search_path to 'public' as $function$
  select t.rol='admin' or t.id=any(o.asignados) or o.creado_por=t.id
    or (o.todo_equipo and (o.equipo=any(t.equipos) or exists(select 1 from extras e where e.fecha=o.fecha and e.trabajador=t.id and e.equipo=o.equipo and not e.borrado)))
    or exists(select 1 from sustituciones s where s.sustituto=t.id and s.ausente=any(o.asignados) and o.fecha between s.desde and s.hasta and not s.borrado)
    or (o.todo_equipo and exists(select 1 from sustituciones s join trabajadores a on a.id=s.ausente
          where s.sustituto=t.id and o.equipo=any(a.equipos) and o.fecha between s.desde and s.hasta and not s.borrado))
$function$;

create or replace function public._recordatorios(p_forzar boolean default false) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare ahora time := (now() at time zone 'Europe/Madrid')::time; h int := extract(hour from ahora); dn text := _dia(_hoy()); m jsonb := '[]'::jsonb; r record; n int; fin text;
begin
  perform _generar(_hoy());
  for r in select t.id, t.horario->dn tramos, (select array_agg(o.titulo order by o.titulo) from ots o where o.fecha=_hoy() and not o.borrado and o.estado in ('pendiente','en_curso') and _ve(t,o)) ts
           from trabajadores t where t.activo and t.rol<>'admin' and exists(select 1 from push_subs s where s.trabajador=t.id and s.activo)
             -- quien falta hoy no recibe recordatorios (sus trabajos los tiene quien le cubre)
             and not exists(select 1 from sustituciones s where s.ausente=t.id and _hoy() between s.desde and s.hasta and not s.borrado and coalesce(s.motivo,'')<>'Horas extra') loop
    if coalesce(cardinality(r.ts),0)=0 then continue; end if;
    if r.tramos is not null and jsonb_typeof(r.tramos)='array' then
      if jsonb_array_length(r.tramos)=0 then continue; end if;
      fin := r.tramos->(jsonb_array_length(r.tramos)-1)->>1;
      if not p_forzar and h <> extract(hour from (fin::time - interval '1 hour')) then continue; end if;
    elsif not p_forzar and h not in (13,19) then continue; end if;
    m := m || jsonb_build_object('trabajadores',array[r.id],'tag','recordatorio',
      'titulo',case when cardinality(r.ts)=1 then 'Te queda 1 trabajo de hoy' else 'Te quedan '||cardinality(r.ts)||' trabajos de hoy' end,
      'texto',array_to_string(r.ts[1:4],', ')||case when cardinality(r.ts)>4 then '…' else '' end);
  end loop;
  if h=19 or p_forzar then
    select count(*) into n from ots where fecha=_hoy() and not borrado and estado in ('pendiente','en_curso');
    if n>0 then m := m || jsonb_build_object('trabajadores',_admins(),'tag','resumen','titulo','Quedan '||n||' trabajos sin terminar hoy','texto','Toca para verlos.'); end if;
  end if;
  if extract(isodow from _hoy())=1 and h=9 and not p_forzar then
    m := m || jsonb_build_object('trabajadores',_admins(),'tag','informe','url','limpieza.html?ir=resumen','titulo','Informe de la semana pasada','texto','Ya puedes sacar el PDF y el Excel para el jefe. Toca para abrirlo.');
  end if;
  if jsonb_array_length(m)>0 then perform _avisar(jsonb_build_object('mensajes',m)); end if;
  return jsonb_build_object('hora',h,'mensajes',jsonb_array_length(m));
end $function$;
