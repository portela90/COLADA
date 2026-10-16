-- =====================================================================
-- ENCARGADO (segundo del jefe) — limpieza-cie
-- Puede: ver los trabajos de todos, crear/asignar trabajos, poner faltas y sustitutos,
--        leer las instrucciones del jefe, hacer el checklist del fin de semana y avisar de incidencias.
-- No puede: borrar trabajos, ver datos personales ni horas, resolver incidencias.
-- =====================================================================
create table if not exists public.limp_encargados (trabajador uuid primary key references public.trabajadores(id), creado timestamptz not null default now());
alter table public.limp_encargados enable row level security;

create or replace function public._es_enc(t public.trabajadores) returns boolean
language sql stable security definer set search_path to 'public' as $$ select exists(select 1 from limp_encargados e where e.trabajador=t.id) $$;
create or replace function public._gestor(p_tok uuid) returns public.trabajadores
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; begin t:=_yo(p_tok); if t.rol<>'admin' and not _es_enc(t) then raise exception 'NO_ADMIN'; end if; return t; end $$;
revoke all on function public._es_enc(public.trabajadores) from public, anon, authenticated;
revoke all on function public._gestor(uuid) from public, anon, authenticated;

-- El encargado ve todos los trabajos
create or replace function public._ve(t trabajadores, o ots) returns boolean
language sql stable security definer set search_path to 'public' as $function$
  select t.rol='admin' or _es_enc(t) or t.id=any(o.asignados) or o.creado_por=t.id
    or (o.todo_equipo and (o.equipo=any(t.equipos) or exists(select 1 from extras e where e.fecha=o.fecha and e.trabajador=t.id and e.equipo=o.equipo and not e.borrado)))
    or exists(select 1 from sustituciones s where s.sustituto=t.id and s.ausente=any(o.asignados) and o.fecha between s.desde and s.hasta and not s.borrado)
    or (o.todo_equipo and exists(select 1 from sustituciones s join trabajadores a on a.id=s.ausente
          where s.sustituto=t.id and o.equipo=any(a.equipos) and o.fecha between s.desde and s.hasta and not s.borrado))
$function$;

-- yo / entrar devuelven si es encargado
create or replace function public.yo(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare t trabajadores; begin t:=_yo(p_tok);
  return jsonb_build_object('id',t.id,'nombre',t.nombre,'rol',t.rol,'equipos',t.equipos,'turno_semana',t.turno_semana,'turno_finde',t.turno_finde,
    'extra_hoy',(select equipo from extras where fecha=_hoy() and trabajador=t.id),'encargado',_es_enc(t)); end $function$;

create or replace function public.entrar(p_id uuid, p_pin text) returns jsonb
language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare t trabajadores; tok uuid;
begin
  select * into t from trabajadores where id=p_id and activo;
  if not found then return jsonb_build_object('error','NO_EXISTE'); end if;
  if t.bloqueo_hasta is not null and t.bloqueo_hasta>now() then return jsonb_build_object('error','BLOQUEADO'); end if;
  if p_pin !~ '^[0-9]{4,8}$' then return jsonb_build_object('error','PIN_FORMATO'); end if;
  if t.pin is null then
    update trabajadores set pin=crypt(p_pin,gen_salt('bf')),fallos=0,bloqueo_hasta=null where id=t.id;
  elsif t.pin <> crypt(p_pin,t.pin) then
    update trabajadores set fallos=fallos+1, bloqueo_hasta=case when fallos+1>=5 then now()+interval '10 minutes' else null end where id=t.id;
    return jsonb_build_object('error','PIN_MAL');
  else
    update trabajadores set fallos=0,bloqueo_hasta=null where id=t.id;
  end if;
  insert into sesiones(trabajador) values (t.id) returning token into tok;
  return jsonb_build_object('token',tok,'yo',jsonb_build_object('id',t.id,'nombre',t.nombre,'rol',t.rol,'equipos',t.equipos,'encargado',_es_enc(t)));
end $function$;

-- Crear / asignar trabajos y poner faltas: jefe o encargado
create or replace function public.ot_guardar(p_tok uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare t trabajadores; o ots; asg uuid[]; me int := nullif(p->>'minutos_est','')::int;
begin t:=_gestor(p_tok);
  asg := coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(p->'asignados','[]'::jsonb)) x),'{}');
  if coalesce(trim(p->>'titulo'),'')='' then raise exception 'FALTA_TITULO'; end if;
  if me is not null and (me<1 or me>1440) then raise exception 'TIEMPO_MAL'; end if;
  if p ? 'id' and p->>'id' is not null then
    update ots set titulo=p->>'titulo',descripcion=nullif(p->>'descripcion',''),lugar=nullif(p->>'lugar',''),tipo=nullif(p->>'tipo',''),fecha=(p->>'fecha')::date,equipo=nullif(p->>'equipo',''),turno=nullif(p->>'turno',''),
      asignados=asg,todo_equipo=coalesce((p->>'todo_equipo')::boolean,false),prioridad=coalesce(p->>'prioridad','normal'),minutos_est=me,habitual_id=coalesce(nullif(p->>'habitual_id','')::uuid,habitual_id) where id=(p->>'id')::uuid returning * into o;
  else
    insert into ots(fecha,titulo,descripcion,lugar,tipo,equipo,turno,asignados,todo_equipo,prioridad,origen,creado_por,minutos_est,habitual_id)
    values ((p->>'fecha')::date,p->>'titulo',nullif(p->>'descripcion',''),nullif(p->>'lugar',''),nullif(p->>'tipo',''),nullif(p->>'equipo',''),nullif(p->>'turno',''),asg,coalesce((p->>'todo_equipo')::boolean,false),coalesce(p->>'prioridad','normal'),coalesce(p->>'origen','manual'),t.id,me,nullif(p->>'habitual_id','')::uuid) returning * into o;
  end if;
  return _otjson(o); end $function$;

create or replace function public.sust_guardar(p_tok uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare x sustituciones;
begin perform _gestor(p_tok);
  if p->>'ausente' is null or p->>'desde' is null then raise exception 'FALTAN_DATOS'; end if;
  if (p->>'ausente')=(p->>'sustituto') then raise exception 'MISMA_PERSONA'; end if;
  if p ? 'id' and p->>'id' is not null then
    update sustituciones set ausente=(p->>'ausente')::uuid, sustituto=nullif(p->>'sustituto','')::uuid, desde=(p->>'desde')::date, hasta=coalesce(nullif(p->>'hasta','')::date,(p->>'desde')::date), motivo=nullif(p->>'motivo',''), nota=nullif(p->>'nota','')
      where id=(p->>'id')::uuid returning * into x;
  else
    insert into sustituciones(ausente,sustituto,desde,hasta,motivo,nota) values ((p->>'ausente')::uuid, nullif(p->>'sustituto','')::uuid, (p->>'desde')::date, coalesce(nullif(p->>'hasta','')::date,(p->>'desde')::date), nullif(p->>'motivo',''), nullif(p->>'nota',''))
      returning * into x;
  end if;
  if x.hasta < x.desde then raise exception 'FECHAS_MAL'; end if;
  return to_jsonb(x); end $function$;

create or replace function public.sust_borrar(p_tok uuid, p_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $function$
begin perform _gestor(p_tok); update sustituciones set borrado=true where id=p_id; end $function$;

create or replace function public.sust_lista(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
begin perform _gestor(p_tok);
  return (select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('ausente_n',a.nombre,'sustituto_n',b.nombre) order by s.desde desc),'[]'::jsonb)
    from sustituciones s join trabajadores a on a.id=s.ausente left join trabajadores b on b.id=s.sustituto where not s.borrado and s.hasta>=_hoy()-60); end $function$;

-- Lista de trabajadores para el encargado (sin datos personales)
create or replace function public.trabajadores_gestor(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
begin perform _gestor(p_tok);
  return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'nombre',nombre,'equipos',equipos,'naves',naves,'turno_semana',turno_semana,'turno_finde',turno_finde,'rol',rol,'activo',activo,'horario',horario) order by activo desc,nombre),'[]'::jsonb)
    from trabajadores w where activo); end $function$;

-- Día: el encargado ve faltas y quién trabaja
create or replace function public.ots_dia(p_tok uuid, p_fecha date) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare t trabajadores; dn text := _dia(p_fecha); g boolean;
begin t:=_yo(p_tok); g := t.rol='admin' or _es_enc(t); perform _generar(p_fecha);
  return jsonb_build_object(
    'dia',(select coalesce(jsonb_agg(_otjson(o) order by o.estado='hecha', o.turno nulls last, o.titulo),'[]'::jsonb) from ots o where o.fecha=p_fecha and not o.borrado and _ve(t,o)),
    'atrasadas',(select coalesce(jsonb_agg(_otjson(o) order by o.fecha),'[]'::jsonb) from ots o where o.fecha<p_fecha and o.fecha>=p_fecha-14 and not o.borrado and o.estado in ('pendiente','en_curso') and _ve(t,o) and p_fecha=_hoy()),
    'extras',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'trabajador',e.trabajador,'nombre',w.nombre,'equipo',e.equipo,'horas',e.horas,'nota',e.nota) order by w.nombre),'[]'::jsonb)
              from extras e join trabajadores w on w.id=e.trabajador where e.fecha=p_fecha and not e.borrado and (t.rol='admin' or e.trabajador=t.id)),
    'ausencias',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'ausente',s.ausente,'ausente_n',a.nombre,'sustituto',s.sustituto,'sustituto_n',b.nombre,'motivo',s.motivo,'desde',s.desde,'hasta',s.hasta) order by a.nombre),'[]'::jsonb)
              from sustituciones s join trabajadores a on a.id=s.ausente left join trabajadores b on b.id=s.sustituto
              where p_fecha between s.desde and s.hasta and not s.borrado and (g or s.sustituto=t.id or s.ausente=t.id)),
    'mi_horario', t.horario->dn,
    'plantilla',case when g then (select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'nombre',w.nombre,'tramos',w.horario->dn) order by (w.horario->dn->0->>0) nulls last, w.nombre),'[]'::jsonb)
              from trabajadores w where w.activo and w.rol<>'admin') end,
    'espacio',case when t.rol='admin' then round(pg_database_size(current_database())*100.0/(500*1024*1024)) end);
end $function$;

-- ---------- Instrucciones del jefe al encargado ----------
create table if not exists public.enc_traspaso (
  id uuid primary key default gen_random_uuid(), desde date not null, hasta date not null, titulo text not null, texto text,
  creado timestamptz not null default now(), creado_por uuid references public.trabajadores(id), leido_en timestamptz, leido_por uuid references public.trabajadores(id),
  borrado boolean not null default false);
alter table public.enc_traspaso enable row level security;

-- ---------- Checklist del fin de semana ----------
create table if not exists public.enc_check_punto (
  id uuid primary key default gen_random_uuid(), grupo text not null, texto text not null, orden int not null default 0, activo boolean not null default true);
alter table public.enc_check_punto enable row level security;
create table if not exists public.enc_check (
  id uuid primary key default gen_random_uuid(), fecha date not null unique, items jsonb not null default '[]', nota text,
  hecho_por uuid references public.trabajadores(id), actualizado timestamptz not null default now(), cerrado boolean not null default false);
alter table public.enc_check enable row level security;

-- ---------- Incidencias ----------
create table if not exists public.enc_incidencia (
  id uuid primary key default gen_random_uuid(), tipo text not null, lugar text, texto text, urgente boolean not null default false, foto text,
  estado text not null default 'abierta' check (estado in ('abierta','en_proceso','resuelta')),
  creado timestamptz not null default now(), creado_por uuid references public.trabajadores(id),
  nota_res text, resuelta_en timestamptz, resuelta_por uuid references public.trabajadores(id), borrado boolean not null default false);
alter table public.enc_incidencia enable row level security;

create or replace function public._encargados() returns uuid[] language sql stable security definer set search_path to 'public' as $$
  select coalesce(array_agg(e.trabajador),'{}') from limp_encargados e join trabajadores w on w.id=e.trabajador where w.activo $$;
revoke all on function public._encargados() from public, anon, authenticated;

-- Resumen para los avisos de la app de limpieza
create or replace function public.enc_resumen(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores;
begin t:=_yo(p_tok);
  if t.rol<>'admin' and not _es_enc(t) then return jsonb_build_object('rol','no'); end if;
  return jsonb_build_object('rol',case when t.rol='admin' then 'admin' else 'encargado' end,
    'traspasos_sin_leer',(select count(*) from enc_traspaso where not borrado and leido_en is null and hasta>=_hoy()),
    'traspasos_activos',(select count(*) from enc_traspaso where not borrado and _hoy() between desde and hasta),
    'inc_abiertas',(select count(*) from enc_incidencia where not borrado and estado<>'resuelta'),
    'inc_urgentes',(select count(*) from enc_incidencia where not borrado and estado<>'resuelta' and urgente),
    'check_hoy',(select jsonb_build_object('fecha',fecha,'cerrado',cerrado) from enc_check where fecha=_hoy()),
    'ult_check',(select jsonb_build_object('fecha',fecha,'cerrado',cerrado,'mal',(select count(*) from jsonb_array_elements(items) i where i->>'estado'='mal')) from enc_check order by fecha desc limit 1));
end $$;

create or replace function public.enc_traspasos(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _gestor(p_tok);
  return coalesce((select jsonb_agg(to_jsonb(x)||jsonb_build_object('leido_por_n',(select nombre from trabajadores where id=x.leido_por)) order by x.desde desc, x.creado desc)
    from enc_traspaso x where not x.borrado and x.hasta>=_hoy()-60),'[]');
end $$;
create or replace function public.enc_traspaso_guardar(p_tok uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; x enc_traspaso;
begin t:=_admin(p_tok);
  if coalesce(trim(p->>'titulo'),'')='' then raise exception 'FALTA_TITULO'; end if;
  if p ? 'id' and nullif(p->>'id','') is not null then
    update enc_traspaso set desde=(p->>'desde')::date, hasta=coalesce(nullif(p->>'hasta','')::date,(p->>'desde')::date), titulo=trim(p->>'titulo'), texto=nullif(trim(p->>'texto'),''), leido_en=null, leido_por=null
      where id=(p->>'id')::uuid returning * into x;
  else
    insert into enc_traspaso(desde,hasta,titulo,texto,creado_por) values ((p->>'desde')::date, coalesce(nullif(p->>'hasta','')::date,(p->>'desde')::date), trim(p->>'titulo'), nullif(trim(p->>'texto'),''), t.id) returning * into x;
  end if;
  if x.hasta < x.desde then raise exception 'FECHAS_MAL'; end if;
  if cardinality(_encargados())>0 then
    perform _avisar(jsonb_build_object('mensajes',jsonb_build_array(jsonb_build_object('trabajadores',_encargados(),'tag','traspaso-'||x.id,
      'titulo','Instrucciones de '||split_part(t.nombre,' ',1),'texto',x.titulo,'url','encargado.html?t='||x.id))));
  end if;
  return to_jsonb(x);
end $$;
create or replace function public.enc_traspaso_borrar(p_tok uuid, p_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $$ begin perform _admin(p_tok); update enc_traspaso set borrado=true where id=p_id; end $$;
create or replace function public.enc_traspaso_leido(p_tok uuid, p_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; begin t:=_gestor(p_tok);
  if t.rol<>'admin' then update enc_traspaso set leido_en=coalesce(leido_en,now()), leido_por=coalesce(leido_por,t.id) where id=p_id; end if; end $$;

create or replace function public.enc_puntos(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _gestor(p_tok);
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.orden, x.grupo, x.texto) from enc_check_punto x),'[]');
end $$;
-- Sustituye la lista entera de puntos (jefe)
create or replace function public.enc_puntos_guardar(p_tok uuid, p_items jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare i jsonb; n int := 0; ids uuid[] := '{}'; nid uuid;
begin perform _admin(p_tok);
  for i in select * from jsonb_array_elements(coalesce(p_items,'[]')) loop
    n := n+1;
    if coalesce(trim(i->>'texto'),'')='' then continue; end if;
    if nullif(i->>'id','') is not null and exists(select 1 from enc_check_punto where id=(i->>'id')::uuid) then
      update enc_check_punto set grupo=coalesce(nullif(trim(i->>'grupo'),''),'General'), texto=trim(i->>'texto'), orden=n, activo=true where id=(i->>'id')::uuid returning id into nid;
    else
      insert into enc_check_punto(grupo,texto,orden) values (coalesce(nullif(trim(i->>'grupo'),''),'General'), trim(i->>'texto'), n) returning id into nid;
    end if;
    ids := ids || nid;
  end loop;
  update enc_check_punto set activo=false where not (id = any(ids));
  return enc_puntos(p_tok);
end $$;

create or replace function public.enc_check_ver(p_tok uuid, p_fecha date) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare c enc_check;
begin perform _gestor(p_tok);
  select * into c from enc_check where fecha=p_fecha;
  return jsonb_build_object('fecha',p_fecha,
    'puntos',coalesce((select jsonb_agg(jsonb_build_object('id',id,'grupo',grupo,'texto',texto) order by orden) from enc_check_punto where activo),'[]'),
    'check',case when c.id is null then null else to_jsonb(c)||jsonb_build_object('hecho_por_n',(select nombre from trabajadores where id=c.hecho_por)) end);
end $$;
create or replace function public.enc_check_guardar(p_tok uuid, p_fecha date, p_items jsonb, p_nota text, p_cerrar boolean) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; c enc_check; mal int;
begin t:=_gestor(p_tok);
  if length(p_items::text) > 3000000 then raise exception 'ARCHIVO_GRANDE'; end if;
  insert into enc_check(fecha,items,nota,hecho_por,cerrado) values (p_fecha,coalesce(p_items,'[]'),nullif(trim(p_nota),''),t.id,coalesce(p_cerrar,false))
  on conflict (fecha) do update set items=excluded.items, nota=excluded.nota, hecho_por=excluded.hecho_por, cerrado=excluded.cerrado, actualizado=now()
  returning * into c;
  if coalesce(p_cerrar,false) and t.rol<>'admin' then
    select count(*) into mal from jsonb_array_elements(c.items) i where i->>'estado'='mal';
    perform _avisar(jsonb_build_object('mensajes',jsonb_build_array(jsonb_build_object('trabajadores',_admins(),'tag','check-'||c.fecha,
      'titulo','Checklist del '||to_char(c.fecha,'DD/MM')||' terminado','texto',case when mal>0 then mal||' punto(s) con problema. Toca para verlo.' else 'Todo correcto.' end,'url','encargado.html?c='||c.fecha))));
  end if;
  return to_jsonb(c);
end $$;
create or replace function public.enc_checks(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _gestor(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('fecha',fecha,'cerrado',cerrado,'hecho_por_n',(select nombre from trabajadores where id=c.hecho_por),
     'total',jsonb_array_length(items),'mal',(select count(*) from jsonb_array_elements(items) i where i->>'estado'='mal'),
     'ok',(select count(*) from jsonb_array_elements(items) i where i->>'estado'='ok')) order by fecha desc) from enc_check c where fecha>=_hoy()-120),'[]');
end $$;

create or replace function public.enc_incidencias(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _gestor(p_tok);
  return coalesce((select jsonb_agg(to_jsonb(i)-'foto'||jsonb_build_object('tiene_foto',i.foto is not null,'creado_por_n',(select nombre from trabajadores where id=i.creado_por),
      'resuelta_por_n',(select nombre from trabajadores where id=i.resuelta_por)) order by i.estado='resuelta', i.urgente desc, i.creado desc)
    from enc_incidencia i where not i.borrado and (i.estado<>'resuelta' or i.resuelta_en>now()-interval '60 days')),'[]');
end $$;
create or replace function public.enc_incidencia_foto(p_tok uuid, p_id uuid) returns text
language plpgsql security definer set search_path to 'public' as $$ begin perform _gestor(p_tok); return (select foto from enc_incidencia where id=p_id); end $$;
-- Avisar: solo el encargado (y el jefe)
create or replace function public.enc_incidencia_nueva(p_tok uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; x enc_incidencia;
begin t:=_gestor(p_tok);
  if coalesce(trim(p->>'tipo'),'')='' then raise exception 'FALTA_TIPO'; end if;
  if p->>'foto' is not null and (p->>'foto' !~ '^data:image/(png|jpeg);base64,' or length(p->>'foto')>1500000) then raise exception 'ARCHIVO_TIPO'; end if;
  insert into enc_incidencia(tipo,lugar,texto,urgente,foto,creado_por) values (trim(p->>'tipo'),nullif(trim(p->>'lugar'),''),nullif(trim(p->>'texto'),''),coalesce((p->>'urgente')::boolean,false),p->>'foto',t.id) returning * into x;
  perform _avisar(jsonb_build_object('mensajes',jsonb_build_array(jsonb_build_object('trabajadores',array_remove(_admins(),t.id),'tag','inc-'||x.id,'urgente',x.urgente,
    'titulo',case when x.urgente then '⚠ Incidencia urgente: ' else 'Incidencia: ' end||x.tipo,'texto',coalesce(x.lugar||' · ','')||coalesce(x.texto,'')||' ('||split_part(t.nombre,' ',1)||')','url','encargado.html?i='||x.id))));
  return to_jsonb(x)-'foto';
end $$;
-- Resolver: solo el jefe
create or replace function public.enc_incidencia_estado(p_tok uuid, p_id uuid, p_estado text, p_nota text) returns void
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; x enc_incidencia;
begin t:=_admin(p_tok);
  if p_estado not in ('abierta','en_proceso','resuelta') then raise exception 'ESTADO'; end if;
  update enc_incidencia set estado=p_estado, nota_res=coalesce(nullif(trim(p_nota),''),nota_res),
    resuelta_en=case when p_estado='resuelta' then now() else null end, resuelta_por=case when p_estado='resuelta' then t.id else null end
  where id=p_id returning * into x;
  if x.id is not null and x.creado_por is distinct from t.id then
    perform _avisar(jsonb_build_object('mensajes',jsonb_build_array(jsonb_build_object('trabajadores',array[x.creado_por],'tag','inc-'||x.id,
      'titulo','Incidencia '||case p_estado when 'resuelta' then 'resuelta' when 'en_proceso' then 'en proceso' else 'reabierta' end,'texto',x.tipo||coalesce(' · '||nullif(trim(p_nota),''),''),'url','encargado.html?i='||x.id))));
  end if;
end $$;
create or replace function public.enc_incidencia_borrar(p_tok uuid, p_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $$ begin perform _admin(p_tok); update enc_incidencia set borrado=true where id=p_id; end $$;

-- Gestionar quién es encargado (jefe)
create or replace function public.enc_encargados(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok); return coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'nombre',w.nombre)) from limp_encargados e join trabajadores w on w.id=e.trabajador),'[]'); end $$;
create or replace function public.enc_encargado_poner(p_tok uuid, p_id uuid, p_si boolean) returns void
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  if p_si then insert into limp_encargados(trabajador) values (p_id) on conflict do nothing; else delete from limp_encargados where trabajador=p_id; end if; end $$;

-- ---------- Datos iniciales ----------
insert into public.limp_encargados(trabajador) select id from public.trabajadores where id='ff8ae0a0-c950-44e7-b748-e2029ae49de5' on conflict do nothing;
insert into public.enc_check_punto(grupo,texto,orden)
select g,t,o from (values
 ('Seguridad y EPIs','Hay guantes, gafas, mascarillas y tapones suficientes',1),
 ('Seguridad y EPIs','Botiquín completo y accesible',2),
 ('Seguridad y EPIs','Extintores, salidas de emergencia y duchas lavaojos sin obstruir',3),
 ('Seguridad y EPIs','Pasillos peatonales despejados y sin derrames de aceite o taladrina',4),
 ('Máquinas','Fregadoras y barredoras: batería cargando, cepillos y depósitos limpios',5),
 ('Máquinas','Aspiradores industriales funcionando y vaciados',6),
 ('Máquinas','Plataforma / carretilla: revisión previa hecha y aparcada en su sitio',7),
 ('Máquinas','Ninguna máquina averiada sin avisar (si hay, crear incidencia)',8),
 ('Productos y material','Productos químicos cerrados, etiquetados y guardados en su armario',9),
 ('Productos y material','Material absorbente para derrames disponible',10),
 ('Productos y material','Papel, jabón y bolsas repuestos en aseos y vestuarios',11),
 ('Limpieza hecha','Vestuarios y aseos limpios',12),
 ('Limpieza hecha','Comedor / office limpio',13),
 ('Limpieza hecha','Naves y zonas de producción según el plan del fin de semana',14),
 ('Limpieza hecha','Contenedores vaciados y residuos peligrosos separados',15),
 ('Cierre','Cuarto de limpieza ordenado y cerrado con llave',16),
 ('Cierre','Luces, grifos y cargadores revisados al salir',17)
) v(g,t,o) where not exists(select 1 from public.enc_check_punto);
