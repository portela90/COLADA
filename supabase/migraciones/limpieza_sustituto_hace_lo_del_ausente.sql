-- Limpieza (limpieza-cie): quien sustituye a alguien hace SOLO los trabajos del que falta.
--
-- Qué cambia (pedido por Cristian, 16/11/2026):
--  1. Cuando una persona cubre a otra que falta (baja, vacaciones, permiso u otro; NO «Horas extra»), sus propios
--     trabajos pendientes de esos días no se hacen: no le salen a ella, no salen como atrasados, no cuentan en los
--     avisos y el reparto automático no se los pasa a nadie. El jefe los ve marcados «No se hace: X sustituye a Y».
--     Los trabajos de «todo el equipo», los ya empezados o hechos y los que tienen a más gente asignada no cambian.
--     Si se quita la sustitución, vuelven a ser suyos.
--  2. Quien cubre a otro cuenta como que trabaja ese día aunque libre (antes solo con «Horas extra»), para que el
--     reparto automático no le quite los trabajos del ausente.
--  3. Nueva función sust_rango (solo jefe): las sustituciones de unas fechas, para calcular las horas de
--     sustitución en «Horas del día», en el Excel mensual y en el informe de la semana.
--
-- Pegar ENTERO en el SQL Editor de limpieza-cie (uddejncrjcyyaxjocbpj) y pulsar Run. Va todo en una transacción:
-- si algo falla, no se cambia nada. Si se pega en otro proyecto, se para sin hacer nada.

begin;

do $$ begin
  if to_regclass('public.sustituciones') is null or to_regclass('public.ots') is null then
    raise exception 'Esto va en el proyecto limpieza-cie (uddejncrjcyyaxjocbpj). No se ha cambiado nada.';
  end if;
end $$;

-- a quién cubre una persona un día (sin contar «Horas extra»); null si no cubre a nadie
create or replace function public._sustituye(p_w uuid, p_f date)
 returns text language sql stable security definer set search_path to 'public'
as $function$
  select string_agg(a.nombre, ', ' order by a.nombre)
    from sustituciones s join trabajadores a on a.id = s.ausente
   where s.sustituto = p_w and p_f between s.desde and s.hasta and not s.borrado
     and coalesce(s.motivo, '') <> 'Horas extra'
$function$;

-- un trabajo pendiente que no se hace porque todos los que lo tienen asignado están cubriendo a otro ese día
create or replace function public._no_se_hace(o ots)
 returns text language sql stable security definer set search_path to 'public'
as $function$
  select case when o.estado = 'pendiente' and not coalesce(o.todo_equipo, false) and coalesce(cardinality(o.asignados), 0) > 0
               and not exists (select 1 from unnest(o.asignados) x where _sustituye(x, o.fecha) is null)
          then (select string_agg(split_part(w.nombre, ' ', 1) || ' sustituye a ' || _sustituye(w.id, o.fecha), ' · ' order by w.nombre)
                  from trabajadores w where w.id = any(o.asignados)) end
$function$;

revoke all on function public._sustituye(uuid, date) from public, anon, authenticated;
revoke all on function public._no_se_hace(ots) from public, anon, authenticated;

-- quién ve cada trabajo: el sustituto deja de ver los suyos que no se hacen (el jefe los sigue viendo)
create or replace function public._ve(t trabajadores, o ots)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select t.rol='admin' or (_es_enc(t) and not _es_resp_hornos(t)) or (_es_resp_hornos(t) and exists(select 1 from limp_resp_hornos r where r.trabajador=t.id and exists(select 1 from limp_resp_hornos_op p where p.resp=t.id and p.activo and p.operario=any(o.asignados)))) or (t.id=any(o.asignados) and _no_se_hace(o) is null) or o.creado_por=t.id
    or (o.todo_equipo and (o.equipo=any(t.equipos) or exists(select 1 from extras e where e.fecha=o.fecha and e.trabajador=t.id and e.equipo=o.equipo and not e.borrado)))
    or exists(select 1 from sustituciones s where s.sustituto=t.id and s.ausente=any(o.asignados) and o.fecha between s.desde and s.hasta and not s.borrado)
    or (o.todo_equipo and exists(select 1 from sustituciones s join trabajadores a on a.id=s.ausente
          where s.sustituto=t.id and o.equipo=any(a.equipos) and o.fecha between s.desde and s.hasta and not s.borrado))
$function$;

-- cada trabajo lleva «no_se_hace» (texto) para que la app lo marque
create or replace function public._otjson(o ots)
 returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select to_jsonb(o) || jsonb_build_object(
    'nombres',(select coalesce(jsonb_agg(w.nombre order by w.nombre),'[]'::jsonb) from trabajadores w where w.id=any(o.asignados)),
    'orig_n',(select jsonb_agg(w.nombre order by w.nombre) from trabajadores w where w.id=any(o.asignados_orig)),
    'hecho_por_n',(select nombre from trabajadores where id=o.hecho_por),
    'creado_por_n',(select nombre from trabajadores where id=o.creado_por),
    'nfotos',(select count(*) from fotos f where f.ot_id=o.id),
    'minutos',case when o.inicio is not null and o.fin is not null then round(extract(epoch from (o.fin-o.inicio))/60 - coalesce(o.pausado_min,0)) end,
    'pide_alm',(exists(select 1 from tareas_fijas f where f.id=o.tarea_id and f.alm_art is not null)
                or exists(select 1 from tareas_habituales h where h.id=o.habitual_id and h.alm_art is not null and h.alm_cant is null)),
    'cubre',(select coalesce(jsonb_agg(jsonb_build_object('ausente',a.nombre,'sustituto',b.nombre)),'[]'::jsonb)
             from sustituciones s join trabajadores a on a.id=s.ausente left join trabajadores b on b.id=s.sustituto
             where s.ausente=any(o.asignados) and o.fecha between s.desde and s.hasta and not s.borrado),
    'no_se_hace',_no_se_hace(o))
$function$;

-- los que no se hacen no salen como atrasados
create or replace function public.ots_dia(p_tok uuid, p_fecha date)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare t trabajadores; dn text := _dia(p_fecha); g boolean;
begin t:=_yo(p_tok); g := t.rol='admin' or _es_enc(t); perform _generar(p_fecha);
  return jsonb_build_object(
    'dia',(select coalesce(jsonb_agg(_otjson(o) order by o.estado='hecha', o.turno nulls last, o.titulo),'[]'::jsonb) from ots o where o.fecha=p_fecha and not o.borrado and _ve(t,o)),
    'atrasadas',(select coalesce(jsonb_agg(_otjson(o) order by o.fecha),'[]'::jsonb) from ots o where o.fecha<p_fecha and o.fecha>=p_fecha-14 and not o.borrado and o.estado in ('pendiente','en_curso') and _ve(t,o) and p_fecha=_hoy() and _no_se_hace(o) is null),
    'extras',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'trabajador',e.trabajador,'nombre',w.nombre,'equipo',e.equipo,'horas',e.horas,'nota',e.nota) order by w.nombre),'[]'::jsonb)
              from extras e join trabajadores w on w.id=e.trabajador where e.fecha=p_fecha and not e.borrado and (t.rol='admin' or e.trabajador=t.id)),
    'ausencias',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'ausente',s.ausente,'ausente_n',a.nombre,'sustituto',s.sustituto,'sustituto_n',b.nombre,'motivo',case when g or s.ausente=t.id or s.motivo='Horas extra' then s.motivo else 'Ausencia' end,'desde',s.desde,'hasta',s.hasta) order by a.nombre),'[]'::jsonb)
              from sustituciones s join trabajadores a on a.id=s.ausente left join trabajadores b on b.id=s.sustituto
              where p_fecha between s.desde and s.hasta and not s.borrado and (g or s.sustituto=t.id or s.ausente=t.id)),
    'mi_horario', _tramos_dia(t.horario, dn),
    'plantilla',case when g then (select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'nombre',w.nombre,'tramos',_tramos_dia(w.horario, dn)) order by (_tramos_dia(w.horario, dn)->0->>0) nulls last, w.nombre),'[]'::jsonb)
              from trabajadores w where w.activo and w.rol<>'admin') end,
    'espacio',case when t.rol='admin' then round(pg_database_size(current_database())*100.0/(500*1024*1024)) end);
end $function$;

-- quien cubre a otro trabaja ese día aunque libre (antes solo con «Horas extra»)
create or replace function public._disponible(w trabajadores, f date)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select w.activo and w.rol<>'admin'
    and not exists(select 1 from sustituciones s where s.ausente=w.id and f between s.desde and s.hasta and not s.borrado and coalesce(s.motivo,'')<>'Horas extra')
    and not exists(select 1 from cal_vac v where v.trabajador=w.id and f between v.desde and v.hasta and not v.borrado)
    and (
      -- lo apuntado en «Horas del día» manda: si tiene horas ese día, trabaja; si tiene falta o 0 horas, no
      exists(select 1 from horas_dia h where h.trabajador=w.id and h.fecha=f and h.falta is null and coalesce(h.trabajadas,0)>0)
      or exists(select 1 from extras e where e.trabajador=w.id and e.fecha=f and not e.borrado)
      or exists(select 1 from sustituciones s where s.sustituto=w.id and f between s.desde and s.hasta and not s.borrado)
      or (not exists(select 1 from horas_dia h where h.trabajador=w.id and h.fecha=f)
          and case when w.horario ? _dia(f) and jsonb_typeof(w.horario->_dia(f))='array'
                   then jsonb_array_length(w.horario->_dia(f))>0
                   else (case when extract(isodow from f)>=6 then 'Finde' else 'Semana' end) = any(w.equipos) end)) $function$;

-- el aviso de las 19 h al jefe no cuenta los que no se hacen
create or replace function public._recordatorios(p_forzar boolean default false)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare ahora time := (now() at time zone 'Europe/Madrid')::time; h int := extract(hour from ahora); dn text := _dia(_hoy()); m jsonb := '[]'::jsonb; r record; n int; fin text;
begin
  perform _generar(_hoy());
  for r in select t.id, t.horario->dn tramos, (select array_agg(o.titulo order by o.titulo) from ots o where o.fecha=_hoy() and not o.borrado and o.estado in ('pendiente','en_curso') and _ve(t,o)) ts
           from trabajadores t where t.activo and t.rol<>'admin' and exists(select 1 from push_subs s where s.trabajador=t.id and s.activo)
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
    select count(*) into n from ots o where o.fecha=_hoy() and not o.borrado and o.estado in ('pendiente','en_curso') and _no_se_hace(o) is null;
    if n>0 then m := m || jsonb_build_object('trabajadores',_admins(),'tag','resumen','titulo','Quedan '||n||' trabajos sin terminar hoy','texto','Toca para verlos.'); end if;
  end if;
  if extract(isodow from _hoy())=1 and h=9 and not p_forzar then
    m := m || jsonb_build_object('trabajadores',_admins(),'tag','informe','url','limpieza.html?ir=resumen','titulo','Informe de la semana pasada','texto','Ya puedes sacar el PDF y el Excel para el jefe. Toca para abrirlo.');
  end if;
  if jsonb_array_length(m)>0 then perform _avisar(jsonb_build_object('mensajes',m)); end if;
  return jsonb_build_object('hora',h,'mensajes',jsonb_array_length(m));
end $function$;

-- sustituciones de unas fechas (para las horas de sustitución)
create or replace function public.sust_rango(p_tok uuid, p_desde date, p_hasta date)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
begin perform _admin(p_tok);
  return (select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'ausente',s.ausente,'ausente_n',a.nombre,'sustituto',s.sustituto,'sustituto_n',b.nombre,
             'desde',s.desde,'hasta',s.hasta,'motivo',s.motivo) order by s.desde),'[]'::jsonb)
    from sustituciones s join trabajadores a on a.id=s.ausente left join trabajadores b on b.id=s.sustituto
    where not s.borrado and s.hasta>=p_desde and s.desde<=p_hasta);
end $function$;
grant execute on function public.sust_rango(uuid, date, date) to anon, authenticated;

commit;

-- Comprobación: tiene que salir «todo bien = true»
select (select count(*) from pg_proc where proname in ('_sustituye','_no_se_hace','sust_rango') and pronamespace='public'::regnamespace) = 3
   and (select prosrc like '%_no_se_hace%' from pg_proc where proname='_ve' and pronamespace='public'::regnamespace)
   and (select prosrc like '%no_se_hace%' from pg_proc where proname='_otjson' and pronamespace='public'::regnamespace) as "todo bien";
