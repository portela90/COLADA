-- =====================================================================
-- CALENDARIO LABORAL ANUAL — limpieza-cie
-- Un calendario por equipo (Semana / Finde) y año: festivos, cierres de fábrica, jornada intensiva y horarios especiales.
-- Vacaciones de cada trabajador. Se envía a cada uno para que firme «recibido y conforme».
-- =====================================================================
create table if not exists public.cal_dia (
  equipo text not null check (equipo in ('Semana','Finde')),
  fecha date not null,
  tipo text not null check (tipo in ('festivo','cierre','intensiva','especial')),
  nombre text, horario text, borrado boolean not null default false,
  primary key (equipo, fecha));
alter table public.cal_dia enable row level security;

create table if not exists public.cal_vac (
  id uuid primary key default gen_random_uuid(),
  trabajador uuid not null references public.trabajadores(id),
  desde date not null, hasta date not null, nota text,
  creado timestamptz not null default now(), borrado boolean not null default false);
create index if not exists cal_vac_trab on public.cal_vac(trabajador) where not borrado;
alter table public.cal_vac enable row level security;

create table if not exists public.cal_firma (
  id uuid primary key default gen_random_uuid(),
  anio int not null, equipo text not null, trabajador uuid not null references public.trabajadores(id),
  datos jsonb not null,                 -- foto del calendario en el momento de enviarlo
  enviado timestamptz not null default now(), enviado_por uuid references public.trabajadores(id),
  firmado_en timestamptz, firma text, conforme boolean, comentario text,
  borrado boolean not null default false);
create index if not exists cal_firma_trab on public.cal_firma(trabajador) where not borrado;
alter table public.cal_firma enable row level security;

-- Calendario de un equipo y año (jefe)
create or replace function public.cal_admin_ver(p_tok uuid, p_anio int, p_equipo text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare d0 date := make_date(p_anio,1,1); d1 date := make_date(p_anio,12,31);
begin perform _admin(p_tok);
  return jsonb_build_object(
    'dias',coalesce((select jsonb_agg(jsonb_build_object('fecha',fecha,'tipo',tipo,'nombre',nombre,'horario',horario) order by fecha) from cal_dia where equipo=p_equipo and fecha between d0 and d1 and not borrado),'[]'),
    'otro',(select count(*) from cal_dia where equipo<>p_equipo and fecha between d0 and d1 and not borrado),
    'trabajadores',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'nombre',w.nombre,'horario',w.horario) order by w.nombre) from trabajadores w where w.activo and w.rol<>'admin' and p_equipo=any(w.equipos)),'[]'),
    'vac',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'trabajador',v.trabajador,'nombre',w.nombre,'desde',v.desde,'hasta',v.hasta,'nota',v.nota) order by v.desde)
        from cal_vac v join trabajadores w on w.id=v.trabajador where not v.borrado and v.hasta>=d0 and v.desde<=d1 and p_equipo=any(w.equipos)),'[]'),
    'firmas',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'trabajador',f.trabajador,'nombre',w.nombre,'enviado',f.enviado,'firmado_en',f.firmado_en,'conforme',f.conforme,'comentario',f.comentario) order by w.nombre, f.enviado desc)
        from cal_firma f join trabajadores w on w.id=f.trabajador where not f.borrado and f.anio=p_anio and f.equipo=p_equipo),'[]'));
end $$;

-- Marcar uno o varios días (tipo vacío = quitar la marca)
create or replace function public.cal_dia_guardar(p_tok uuid, p_equipo text, p_fechas date[], p_tipo text, p_nombre text, p_horario text, p_ambos boolean) returns void
language plpgsql security definer set search_path to 'public' as $$
declare eqs text[] := case when coalesce(p_ambos,false) then array['Semana','Finde'] else array[p_equipo] end;
begin perform _admin(p_tok);
  if cardinality(p_fechas) > 400 then raise exception 'DEMASIADAS'; end if;
  if coalesce(p_tipo,'')='' then
    update cal_dia set borrado=true where equipo=any(eqs) and fecha=any(p_fechas);
  else
    insert into cal_dia(equipo,fecha,tipo,nombre,horario,borrado)
    select e, f, p_tipo, nullif(trim(p_nombre),''), nullif(trim(p_horario),''), false from unnest(eqs) e, unnest(p_fechas) f
    on conflict (equipo,fecha) do update set tipo=excluded.tipo, nombre=excluded.nombre, horario=excluded.horario, borrado=false;
  end if;
end $$;

create or replace function public.cal_copiar(p_tok uuid, p_anio int, p_de text, p_a text) returns int
language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin perform _admin(p_tok);
  update cal_dia set borrado=true where equipo=p_a and extract(year from fecha)=p_anio;
  insert into cal_dia(equipo,fecha,tipo,nombre,horario,borrado) select p_a,fecha,tipo,nombre,horario,false from cal_dia where equipo=p_de and extract(year from fecha)=p_anio and not borrado
  on conflict (equipo,fecha) do update set tipo=excluded.tipo, nombre=excluded.nombre, horario=excluded.horario, borrado=false;
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.cal_vac_guardar(p_tok uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare v cal_vac;
begin perform _admin(p_tok);
  if (p->>'hasta')::date < (p->>'desde')::date then raise exception 'FECHAS_MAL'; end if;
  if nullif(p->>'id','') is not null then
    update cal_vac set desde=(p->>'desde')::date, hasta=(p->>'hasta')::date, nota=nullif(trim(p->>'nota'),'') where id=(p->>'id')::uuid returning * into v;
  else
    insert into cal_vac(trabajador,desde,hasta,nota) values ((p->>'trabajador')::uuid,(p->>'desde')::date,(p->>'hasta')::date,nullif(trim(p->>'nota'),'')) returning * into v;
  end if;
  return to_jsonb(v);
end $$;
create or replace function public.cal_vac_borrar(p_tok uuid, p_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $$ begin perform _admin(p_tok); update cal_vac set borrado=true where id=p_id; end $$;

-- Enviar a firmar: guarda una foto del calendario para cada trabajador
create or replace function public.cal_enviar(p_tok uuid, p_anio int, p_equipo text, p_trab uuid[]) returns int
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; w trabajadores; n int := 0; d0 date := make_date(p_anio,1,1); d1 date := make_date(p_anio,12,31); dias jsonb; nid uuid;
begin t:=_admin(p_tok);
  dias := coalesce((select jsonb_agg(jsonb_build_object('fecha',fecha,'tipo',tipo,'nombre',nombre,'horario',horario) order by fecha) from cal_dia where equipo=p_equipo and fecha between d0 and d1 and not borrado),'[]');
  for w in select * from trabajadores where id=any(p_trab) and activo loop
    -- los envíos anteriores sin firmar de ese año y equipo se sustituyen por este
    update cal_firma set borrado=true where trabajador=w.id and anio=p_anio and equipo=p_equipo and firmado_en is null and not borrado;
    insert into cal_firma(anio,equipo,trabajador,enviado_por,datos) values (p_anio,p_equipo,w.id,t.id,jsonb_build_object(
      'anio',p_anio,'equipo',p_equipo,'nombre',w.nombre,'horario',w.horario,'dias',dias,
      'empresa',(select v from prl_config where k='empresa'),'centro',(select v from prl_config where k='centro'),
      'vac',coalesce((select jsonb_agg(jsonb_build_object('desde',greatest(desde,d0),'hasta',least(hasta,d1),'nota',nota) order by desde) from cal_vac where trabajador=w.id and not borrado and hasta>=d0 and desde<=d1),'[]')))
    returning id into nid;
    perform _avisar(jsonb_build_object('mensajes',jsonb_build_array(jsonb_build_object('trabajadores',array[w.id],'tag','cal-'||p_anio,
      'titulo','Calendario laboral '||p_anio,'texto','Revísalo y fírmalo en la app.','url','calendario.html?f='||nid))));
    n := n+1;
  end loop;
  return n;
end $$;
create or replace function public.cal_firma_borrar(p_tok uuid, p_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $$ begin perform _admin(p_tok); update cal_firma set borrado=true where id=p_id; end $$;

-- Trabajador: sus calendarios
create or replace function public.cal_mios(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores;
begin t:=_yo(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'anio',anio,'equipo',equipo,'enviado',enviado,'firmado_en',firmado_en,'conforme',conforme) order by firmado_en is not null, anio desc, enviado desc)
    from cal_firma where trabajador=t.id and not borrado),'[]');
end $$;
create or replace function public.cal_ver(p_tok uuid, p_id uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; f cal_firma;
begin t:=_yo(p_tok);
  select * into f from cal_firma where id=p_id and not borrado;
  if not found then raise exception 'NO_EXISTE'; end if;
  if f.trabajador<>t.id and t.rol<>'admin' then raise exception 'NO_PERMISO'; end if;
  return jsonb_build_object('id',f.id,'anio',f.anio,'equipo',f.equipo,'datos',f.datos,'enviado',f.enviado,'firmado_en',f.firmado_en,'firma',f.firma,'conforme',f.conforme,'comentario',f.comentario,'mio',f.trabajador=t.id);
end $$;
create or replace function public.cal_firmar(p_tok uuid, p_id uuid, p_conforme boolean, p_comentario text, p_firma text) returns void
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; f cal_firma;
begin t:=_yo(p_tok);
  select * into f from cal_firma where id=p_id and not borrado;
  if not found or f.trabajador<>t.id then raise exception 'NO_PERMISO'; end if;
  if f.firmado_en is not null then raise exception 'YA_FIRMADO'; end if;
  if p_firma !~ '^data:image/png;base64,' or length(p_firma) > 400000 then raise exception 'FIRMA_MAL'; end if;
  if not coalesce(p_conforme,true) and coalesce(trim(p_comentario),'')='' then raise exception 'FALTA_COMENTARIO'; end if;
  update cal_firma set firmado_en=now(), firma=p_firma, conforme=coalesce(p_conforme,true), comentario=nullif(trim(p_comentario),'') where id=p_id;
  perform _avisar(jsonb_build_object('mensajes',jsonb_build_array(jsonb_build_object('trabajadores',_admins(),'tag','calf-'||f.anio||'-'||t.id,
    'titulo','Calendario '||f.anio||' firmado','texto',split_part(t.nombre,' ',1)||case when coalesce(p_conforme,true) then ': recibido y conforme' else ': con observaciones' end,'url','calendario.html?a='||f.anio||'&e='||f.equipo))));
end $$;
create or replace function public.cal_pendientes(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores;
begin t:=_yo(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'anio',anio) order by anio) from cal_firma where trabajador=t.id and not borrado and firmado_en is null),'[]');
end $$;
-- Para sacar los PDF de todos (jefe)
create or replace function public.cal_firmas_datos(p_tok uuid, p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'anio',anio,'equipo',equipo,'datos',datos,'enviado',enviado,'firmado_en',firmado_en,'firma',firma,'conforme',conforme,'comentario',comentario)) from cal_firma where id=any(p_ids) and not borrado),'[]');
end $$;
