-- =====================================================================
-- REPARTO AUTOMÁTICO (bloque 1: que nada se quede sin hacer) — limpieza-cie
-- Si todas las personas de un trabajo pendiente libran, faltan (sin sustituto) o están de vacaciones,
-- la app se lo pasa a alguien del mismo equipo que trabaje ese día y tenga menos carga.
-- Los trabajos de hornos solo van a quien tenga permiso de hornos.
-- Si la persona original vuelve a estar disponible y el trabajo sigue pendiente, se le devuelve.
-- =====================================================================
create table if not exists public.limp_habilidad (
  trabajador uuid not null references public.trabajadores(id), habilidad text not null, activo boolean not null default true,
  primary key (trabajador, habilidad));
alter table public.limp_habilidad enable row level security;
-- De inicio: quien hoy tiene asignadas las tareas fijas de hornos
insert into public.limp_habilidad(trabajador,habilidad)
select distinct unnest(asignados),'hornos' from public.tareas_fijas where activo and not borrado and titulo ~* 'horno|escoria'
on conflict do nothing;

alter table public.ots add column if not exists asignados_orig uuid[];
alter table public.ots add column if not exists auto_motivo text;

create or replace function public._es_horno(o public.ots) returns boolean language sql immutable as $$
  select coalesce(o.titulo,'') ~* 'horno|escoria' or o.elemento_id is not null or o.accion_horno is not null $$;

-- ¿Trabaja esa persona ese día y no falta?
create or replace function public._disponible(w public.trabajadores, f date) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select w.activo and w.rol<>'admin'
    and case when w.horario ? _dia(f) and jsonb_typeof(w.horario->_dia(f))='array'
             then jsonb_array_length(w.horario->_dia(f))>0
             else (case when extract(isodow from f)>=6 then 'Finde' else 'Semana' end) = any(w.equipos) end
    and not exists(select 1 from sustituciones s where s.ausente=w.id and f between s.desde and s.hasta and not s.borrado and coalesce(s.motivo,'')<>'Horas extra')
    and not exists(select 1 from cal_vac v where v.trabajador=w.id and f between v.desde and v.hasta and not v.borrado) $$;

create or replace function public._carga(p_w uuid, f date) returns int
language sql stable security definer set search_path to 'public' as $$
  select coalesce(sum(coalesce(o.minutos_est,30)),0)::int from ots o
  where o.fecha=f and not o.borrado and o.estado in ('pendiente','en_curso') and p_w=any(o.asignados) and not o.todo_equipo $$;

create or replace function public._auto_cubrir(f date) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare o ots; w trabajadores; nuevo uuid; nom_n text; nom_a text; cambios jsonb := '[]'; sin jsonb := '[]'; msgs jsonb := '[]';
begin
  if f < _hoy() then return '{}'; end if;
  -- 1) devolver a la persona original si ya puede
  for o in select * from ots where fecha=f and not borrado and estado='pendiente' and asignados_orig is not null loop
    if exists(select 1 from trabajadores x where x.id=any(o.asignados_orig) and _disponible(x,f)) then
      update ots set asignados=asignados_orig, asignados_orig=null, auto_motivo=null where id=o.id;
      insert into ot_log(ot,quien,accion,detalle) values (o.id,null,'reasignada','Automático: vuelve a '||(select string_agg(nombre,', ') from trabajadores where id=any(o.asignados_orig)));
    end if;
  end loop;
  -- 2) pasar los trabajos de quien no está
  for o in select * from ots x where x.fecha=f and not x.borrado and x.estado='pendiente' and not x.todo_equipo and cardinality(x.asignados)>0
             and not exists(select 1 from trabajadores a where a.id=any(x.asignados) and _disponible(a,f))
             and not exists(select 1 from sustituciones s join trabajadores b on b.id=s.sustituto where s.ausente=any(x.asignados) and f between s.desde and s.hasta and not s.borrado and _disponible(b,f))
           order by _es_horno(x) desc, coalesce(x.minutos_est,30) desc loop
    select c.id into nuevo from trabajadores c
      where _disponible(c,f) and (o.equipo is null or o.equipo=any(c.equipos))
        and (not _es_horno(o) or exists(select 1 from limp_habilidad h where h.trabajador=c.id and h.habilidad='hornos' and h.activo))
      order by _carga(c.id,f), c.nombre limit 1;
    nom_a := (select string_agg(split_part(nombre,' ',1),', ') from trabajadores where id=any(o.asignados));
    if nuevo is null then
      if o.auto_motivo is distinct from 'sin_nadie' then
        update ots set auto_motivo='sin_nadie' where id=o.id;
        sin := sin || to_jsonb(o.titulo);
      end if;
      continue;
    end if;
    nom_n := (select nombre from trabajadores where id=nuevo);
    update ots set asignados_orig=coalesce(asignados_orig,asignados), asignados=array[nuevo], auto_motivo='reasignada' where id=o.id;
    insert into ot_log(ot,quien,accion,detalle) values (o.id,null,'reasignada','Automático: '||nom_n||' (no está '||nom_a||')');
    cambios := cambios || jsonb_build_object('t',o.titulo,'a',nom_a,'n',split_part(nom_n,' ',1));
    if f=_hoy() then
      msgs := msgs || jsonb_build_object('trabajadores',array[nuevo],'tag','auto-'||o.id,'titulo','Te han pasado un trabajo','texto',o.titulo||' (hoy no está '||nom_a||')');
    end if;
  end loop;
  -- 3) avisar al jefe solo si ha pasado algo
  if jsonb_array_length(cambios)>0 then
    msgs := msgs || jsonb_build_object('trabajadores',_admins(),'tag','auto-'||f,'url','limpieza.html',
      'titulo','He repartido '||jsonb_array_length(cambios)||' trabajo'||case when jsonb_array_length(cambios)>1 then 's' else '' end||case when f=_hoy() then ' de hoy' else ' de mañana' end,
      'texto',(select string_agg((c->>'t')||' → '||(c->>'n'),' · ') from jsonb_array_elements(cambios) c));
  end if;
  if jsonb_array_length(sin)>0 then
    msgs := msgs || jsonb_build_object('trabajadores',_admins(),'tag','auto-sin-'||f,'url','limpieza.html','urgente',true,
      'titulo','⚠ No tengo a quién darle '||jsonb_array_length(sin)||' trabajo'||case when jsonb_array_length(sin)>1 then 's' else '' end,
      'texto',(select string_agg(x #>> '{}',', ') from jsonb_array_elements(sin) x)||'. Nadie disponible'||case when f=_hoy() then ' hoy' else ' mañana' end||' que pueda hacerlo.');
  end if;
  if jsonb_array_length(msgs)>0 then perform _avisar(jsonb_build_object('mensajes',msgs)); end if;
  return jsonb_build_object('fecha',f,'cambios',cambios,'sin_nadie',sin);
end $$;
revoke all on function public._auto_cubrir(date) from public, anon, authenticated;

-- Cada 15 minutos: genera los trabajos fijos de hoy y mañana y reparte
create or replace function public._auto_tick() returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare r1 jsonb; r2 jsonb;
begin
  perform _generar(_hoy()); perform _generar(_hoy()+1);
  r1 := _auto_cubrir(_hoy()); r2 := _auto_cubrir(_hoy()+1);
  return jsonb_build_object('hoy',r1,'manana',r2);
end $$;
revoke all on function public._auto_tick() from public, anon, authenticated;
select cron.schedule('limpieza-reparto-auto','*/15 * * * *','select public._auto_tick()');

-- El historial muestra de quién era el trabajo
create or replace function public._otjson(o ots) returns jsonb
language sql stable security definer set search_path to 'public' as $function$
  select to_jsonb(o) || jsonb_build_object(
    'nombres',(select coalesce(jsonb_agg(w.nombre order by w.nombre),'[]'::jsonb) from trabajadores w where w.id=any(o.asignados)),
    'orig_n',(select jsonb_agg(w.nombre order by w.nombre) from trabajadores w where w.id=any(o.asignados_orig)),
    'hecho_por_n',(select nombre from trabajadores where id=o.hecho_por),
    'creado_por_n',(select nombre from trabajadores where id=o.creado_por),
    'nfotos',(select count(*) from fotos f where f.ot_id=o.id),
    'minutos',case when o.inicio is not null and o.fin is not null then round(extract(epoch from (o.fin-o.inicio))/60 - coalesce(o.pausado_min,0)) end,
    'cubre',(select coalesce(jsonb_agg(jsonb_build_object('ausente',a.nombre,'sustituto',b.nombre,'motivo',s.motivo)),'[]'::jsonb)
             from sustituciones s join trabajadores a on a.id=s.ausente left join trabajadores b on b.id=s.sustituto
             where s.ausente=any(o.asignados) and o.fecha between s.desde and s.hasta and not s.borrado)) $function$;

-- Ajustes del reparto (jefe)
create or replace function public.auto_estado(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  return jsonb_build_object(
    'hornos',coalesce((select jsonb_agg(trabajador) from limp_habilidad where habilidad='hornos' and activo),'[]'),
    'ultimos',coalesce((select jsonb_agg(x order by x->>'cuando' desc) from (select jsonb_build_object('cuando',l.cuando,'titulo',o.titulo,'fecha',o.fecha,'detalle',l.detalle) x
        from ot_log l join ots o on o.id=l.ot where l.quien is null and l.detalle like 'Automático:%' and l.cuando>now()-interval '7 days' order by l.cuando desc limit 30) z),'[]'),
    'sin_nadie',coalesce((select jsonb_agg(jsonb_build_object('id',id,'titulo',titulo,'fecha',fecha)) from ots where auto_motivo='sin_nadie' and estado='pendiente' and not borrado and fecha>=_hoy()),'[]'));
end $$;
create or replace function public.auto_habilidad(p_tok uuid, p_trab uuid, p_hab text, p_si boolean) returns void
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  insert into limp_habilidad(trabajador,habilidad,activo) values (p_trab,p_hab,p_si) on conflict (trabajador,habilidad) do update set activo=excluded.activo;
  perform _auto_cubrir(_hoy()); perform _auto_cubrir(_hoy()+1);
end $$;

-- Al poner o quitar una falta o unas vacaciones, se reparte en el momento
create or replace function public._auto_ahora() returns void language plpgsql security definer set search_path to 'public' as $$
begin perform _generar(_hoy()); perform _generar(_hoy()+1); perform _auto_cubrir(_hoy()); perform _auto_cubrir(_hoy()+1); end $$;
revoke all on function public._auto_ahora() from public, anon, authenticated;
create or replace function public._trg_auto() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin perform _auto_ahora(); return null; end $$;
create or replace trigger auto_sust after insert or update on public.sustituciones for each statement execute function public._trg_auto();
create or replace trigger auto_vac after insert or update on public.cal_vac for each statement execute function public._trg_auto();
