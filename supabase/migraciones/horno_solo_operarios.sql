-- Limpieza de hornos: solo la hacen (y se ven en la ficha) los trabajadores con la habilidad «hornos».
-- Una OT normal que menciona un horno en el título queda enlazada al horno, pero su limpieza
-- no sale en la ficha si quien la marcó no es de hornos. No se borra nada: los datos siguen en las OT.
-- Idempotente.

create or replace function public._limpieza_horno_valida(o ots)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select (o.accion_horno is not null or o.tipo = 'Limpieza horno')
     and exists (select 1 from limp_habilidad h where h.trabajador = o.hecho_por and h.habilidad = 'hornos' and h.activo)
$function$;

create or replace function public.limpieza_abrir(p_tok uuid, p_el uuid, p_hecha boolean, p_minutos integer default null::integer, p_nota text default null::text, p_checks jsonb default null::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare t trabajadores; e elementos; o ots; me int; mal boolean;
begin t:=_yo(p_tok); select * into e from elementos where id=p_el and not borrado; if not found then raise exception 'NO_EXISTE_EL'; end if;
  if e.tipo='horno' and not exists(select 1 from limp_habilidad h where h.trabajador=t.id and h.habilidad='hornos' and h.activo) then
    raise exception 'Solo los operarios de hornos pueden apuntar la limpieza de un horno';
  end if;
  if p_minutos is not null and (p_minutos<1 or p_minutos>720) then raise exception 'TIEMPO_MAL'; end if;
  me := case when p_hecha then coalesce(p_minutos,e.minutos_est) end;
  mal := exists(select 1 from jsonb_each_text(coalesce(p_checks,'{}'::jsonb)) where value='NO-OK');
  insert into ots(fecha,titulo,descripcion,lugar,tipo,equipo,asignados,origen,creado_por,prioridad,minutos_est,elemento_id,estado,inicio,fin,hecho_por,tiempo_auto,tiempo_decl,nota,checklist,resultado)
  values (_hoy(),'Limpieza '||case when e.tipo='otro' or lower(e.nombre) like e.tipo||'%' then '' else e.tipo||' ' end||e.nombre,null,e.lugar,'Limpieza '||e.tipo,
    case when extract(isodow from _hoy())>=6 and 'Finde'=any(t.equipos) then 'Finde' else t.equipos[1] end,array[t.id],'rapida',t.id,'normal',e.minutos_est,e.id,
    case when p_hecha then 'hecha' else 'en_curso' end,
    case when p_hecha and me is not null then now()-make_interval(mins=>me) when not p_hecha then now() end,
    case when p_hecha then now() end, t.id,
    p_hecha and p_minutos is null and me is not null, p_hecha and p_minutos is not null, nullif(trim(p_nota),''),
    p_checks, case when p_checks is null then null when mal then 'NO-OK' else 'OK' end)
  returning * into o;
  return _otjson(o); end
$function$;

create or replace function public.elemento_ficha(p_tok uuid, p_cod text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare t trabajadores; e elementos;
begin t:=_yo(p_tok);
  select * into e from elementos where not borrado and (upper(codigo)=upper(trim(p_cod)) or id::text=p_cod) limit 1;
  if not found then raise exception 'NO_EXISTE_EL'; end if;
  return _eljson(e) || jsonb_build_object(
    'abierta',(select _otjson(o) from ots o where o.elemento_id=e.id and not o.borrado
                 and (e.tipo<>'horno' or _limpieza_horno_valida(o))
                 and (o.estado='en_curso' and t.id=any(o.asignados)
                      or e.tipo='inyectora' and o.estado='pendiente' and o.fecha<=_hoy() and coalesce(o.accion_horno,'limpieza')='limpieza' and _ve(t,o))
                 order by (o.estado='en_curso') desc, o.fecha desc, o.creado desc limit 1),
    'historial',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'fin',o.fin,'quien',w.nombre,'accion',coalesce(o.accion_horno,'limpieza'),'motivo',o.motivo,'min',case when o.inicio is not null then round(extract(epoch from (o.fin-o.inicio))/60) end,'nota',o.nota,'nfotos',(select count(*) from fotos f where f.ot_id=o.id),'resultado',o.resultado) order by o.fin desc),'[]'::jsonb)
       from (select * from ots o where o.elemento_id=e.id and o.estado='hecha' and not o.borrado and (e.tipo<>'horno' or _limpieza_horno_valida(o)) order by o.fin desc limit 30) o left join trabajadores w on w.id=o.hecho_por),
    'ult',(select coalesce(jsonb_object_agg(s.a,s.j),'{}'::jsonb) from (select distinct on (coalesce(o.accion_horno,'limpieza')) coalesce(o.accion_horno,'limpieza') a, jsonb_build_object('fin',o.fin,'quien',w.nombre,'motivo',o.motivo,'nota',o.nota) j from ots o left join trabajadores w on w.id=o.hecho_por where o.elemento_id=e.id and o.estado='hecha' and not o.borrado and (e.tipo<>'horno' or _limpieza_horno_valida(o)) order by coalesce(o.accion_horno,'limpieza'), o.fin desc nulls last) s));
end $function$;
