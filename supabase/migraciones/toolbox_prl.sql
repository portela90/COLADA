-- =====================================================================
-- TOOLBOX / PRL — Estructura (proyecto Supabase: limpieza-cie)
-- Solo AÑADE tablas y funciones nuevas con prefijo prl_. No modifica nada existente.
-- Reutiliza trabajadores, PIN y sesiones de la app de limpieza.
-- =====================================================================

create table if not exists public.prl_toolbox (
  anio int not null, mes int not null check (mes between 1 and 12),
  compromiso text not null, cuerpo text, puntos jsonb not null default '[]',
  tema text, tema_intro text, tema_puntos jsonb not null default '[]',
  imagen text, codigo text default 'SH-CORP-FO-IB-031',
  actualizado timestamptz not null default now(),
  primary key (anio, mes));

create table if not exists public.prl_sesion (
  id uuid primary key default gen_random_uuid(),
  anio int not null, mes int not null,
  denominacion text, fecha date, centro text, duracion int, formador text,
  observaciones text, previstos uuid[] not null default '{}',
  enviada_en timestamptz,
  estado text not null default 'abierta' check (estado in ('abierta','cerrada')),
  cerrada_en timestamptz, creado timestamptz not null default now(),
  unique (anio, mes));

create table if not exists public.prl_firma (
  id uuid primary key default gen_random_uuid(),
  sesion uuid not null references public.prl_sesion(id) on delete cascade,
  trabajador uuid not null references public.trabajadores(id),
  nombre text not null, puesto text, firma text not null,
  por uuid references public.trabajadores(id),
  firmado_en timestamptz not null default now(),
  unique (sesion, trabajador));

create table if not exists public.prl_config (k text primary key, v text);

alter table public.prl_toolbox enable row level security;
alter table public.prl_sesion  enable row level security;
alter table public.prl_firma   enable row level security;
alter table public.prl_config  enable row level security;

insert into public.prl_config(k,v) values
 ('centro','CIE Inyectametal'),('duracion','15'),('formador',null),('firma_formador',null)
on conflict do nothing;

-- Crea la sesión del mes si no existe (uso interno)
create or replace function public._prl_sesion(p_anio int, p_mes int) returns public.prl_sesion
language plpgsql security definer set search_path to 'public' as $$
declare s prl_sesion; nm text[] := array['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
begin
  select * into s from prl_sesion where anio=p_anio and mes=p_mes;
  if found then return s; end if;
  insert into prl_sesion(anio,mes,denominacion,fecha,centro,duracion,formador,previstos)
  values (p_anio,p_mes,
    'Toolbox Talk HSE ' || nm[p_mes] || ' ' || right(p_anio::text,2),
    case when date_trunc('month',_hoy())=make_date(p_anio,p_mes,1) then _hoy() else null end,
    (select v from prl_config where k='centro'),
    nullif((select v from prl_config where k='duracion'),'')::int,
    (select v from prl_config where k='formador'),
    coalesce((select array_agg(id order by nombre) from trabajadores where activo and rol='operario'),'{}'))
  on conflict (anio,mes) do nothing;
  select * into s from prl_sesion where anio=p_anio and mes=p_mes;
  return s;
end $$;

-- Resumen de los 12 meses de un año
create or replace function public.prl_meses(p_tok uuid, p_anio int) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores;
begin t:=_yo(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object(
     'mes',m, 'hay_tema', tb.mes is not null,
     'compromiso',tb.compromiso,'tema',tb.tema,
     'estado',s.estado,'fecha',s.fecha,'enviada_en',s.enviada_en,
     'previstos',coalesce(array_length(s.previstos,1),0),
     'firmas',(select count(*) from prl_firma f where f.sesion=s.id),
     'me_toca', coalesce(s.enviada_en is not null and s.estado='abierta' and t.id = any(s.previstos),false),
     'firmado_yo',exists(select 1 from prl_firma f where f.sesion=s.id and f.trabajador=t.id)
   ) order by m)
   from generate_series(1,12) m
   left join prl_toolbox tb on tb.anio=p_anio and tb.mes=m
   left join prl_sesion s on s.anio=p_anio and s.mes=m),'[]');
end $$;

-- Toolbox enviados que el trabajador aún no ha firmado
create or replace function public.prl_pendientes(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores;
begin t:=_yo(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('anio',s.anio,'mes',s.mes,'compromiso',tb.compromiso,'tema',tb.tema,'enviada_en',s.enviada_en) order by s.anio,s.mes)
    from prl_sesion s join prl_toolbox tb on tb.anio=s.anio and tb.mes=s.mes
    where s.enviada_en is not null and s.estado='abierta' and t.id = any(s.previstos)
      and not exists(select 1 from prl_firma f where f.sesion=s.id and f.trabajador=t.id)),'[]');
end $$;

-- Detalle de un mes (contenido + sesión + firmas)
create or replace function public.prl_mes(p_tok uuid, p_anio int, p_mes int) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; s prl_sesion; tb prl_toolbox; adm boolean;
begin t:=_yo(p_tok); adm := t.rol='admin';
  select * into tb from prl_toolbox where anio=p_anio and mes=p_mes;
  if not found then raise exception 'SIN_TOOLBOX'; end if;
  select * into s from prl_sesion where anio=p_anio and mes=p_mes;
  return jsonb_build_object(
    'toolbox', to_jsonb(tb),
    'sesion', case when s.id is null then null else to_jsonb(s) end,
    'firmas', coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'trabajador',f.trabajador,'nombre',f.nombre,'puesto',f.puesto,
                 'firmado_en',f.firmado_en,'firma',f.firma) order by f.firmado_en)
               from prl_firma f where f.sesion=s.id and (adm or f.trabajador=t.id)),'[]'),
    'yo', jsonb_build_object('id',t.id,'nombre',t.nombre,'rol',t.rol,'categoria',t.categoria));
end $$;

create or replace function public.prl_trabajadores(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'nombre',nombre,'categoria',categoria,'equipos',equipos,'rol',rol) order by rol desc, nombre)
    from trabajadores where activo),'[]');
end $$;

create or replace function public.prl_sesion_guardar(p_tok uuid, p_anio int, p_mes int, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare s prl_sesion;
begin perform _admin(p_tok);
  if not exists(select 1 from prl_toolbox where anio=p_anio and mes=p_mes) then raise exception 'SIN_TOOLBOX'; end if;
  s := _prl_sesion(p_anio,p_mes);
  if s.estado='cerrada' then raise exception 'CERRADA'; end if;
  update prl_sesion set
    denominacion = case when p ? 'denominacion' then nullif(trim(p->>'denominacion'),'') else denominacion end,
    fecha = case when p ? 'fecha' then nullif(p->>'fecha','')::date else fecha end,
    centro = case when p ? 'centro' then nullif(trim(p->>'centro'),'') else centro end,
    duracion = case when p ? 'duracion' then nullif(p->>'duracion','')::int else duracion end,
    formador = case when p ? 'formador' then nullif(trim(p->>'formador'),'') else formador end,
    observaciones = case when p ? 'observaciones' then nullif(trim(p->>'observaciones'),'') else observaciones end,
    previstos = case when p ? 'previstos' then coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(p->'previstos') x),'{}') else previstos end
  where id=s.id returning * into s;
  return to_jsonb(s);
end $$;

-- Envía (o recuerda) el Toolbox a los que faltan por firmar, con aviso push
create or replace function public.prl_enviar(p_tok uuid, p_anio int, p_mes int) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare s prl_sesion; tb prl_toolbox; pend uuid[]; nm text[] := array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
begin perform _admin(p_tok);
  select * into tb from prl_toolbox where anio=p_anio and mes=p_mes;
  if not found then raise exception 'SIN_TOOLBOX'; end if;
  s := _prl_sesion(p_anio,p_mes);
  if s.estado='cerrada' then raise exception 'CERRADA'; end if;
  select coalesce(array_agg(x),'{}') into pend from unnest(s.previstos) x
   where not exists(select 1 from prl_firma f where f.sesion=s.id and f.trabajador=x);
  update prl_sesion set enviada_en=coalesce(enviada_en,now()) where id=s.id returning * into s;
  if coalesce(array_length(pend,1),0) > 0 then
    perform _avisar(jsonb_build_object('mensajes',jsonb_build_array(jsonb_build_object('trabajadores',pend,'tag','toolbox-'||p_anio||'-'||p_mes,
      'titulo','Toolbox de '||nm[p_mes]||' para firmar',
      'texto','Toca para leerlo y firmar.','url','toolbox.html?a='||p_anio||'&m='||p_mes))));
  end if;
  return jsonb_build_object('sesion',to_jsonb(s),'avisados',coalesce(array_length(pend,1),0));
end $$;

-- Firma: el trabajador firma lo suyo; el admin puede recoger la firma de cualquiera en su dispositivo
create or replace function public.prl_firmar(p_tok uuid, p_anio int, p_mes int, p_trab uuid, p_puesto text, p_firma text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; w trabajadores; s prl_sesion;
begin t:=_yo(p_tok);
  if p_trab<>t.id and t.rol<>'admin' then raise exception 'NO_ADMIN'; end if;
  if p_firma is null or p_firma !~ '^data:image/(png|jpeg);base64,' or length(p_firma) > 400000 then raise exception 'FIRMA_INVALIDA'; end if;
  if not exists(select 1 from prl_toolbox where anio=p_anio and mes=p_mes) then raise exception 'SIN_TOOLBOX'; end if;
  select * into w from trabajadores where id=p_trab and activo;
  if not found then raise exception 'NO_EXISTE'; end if;
  if t.rol<>'admin' then
    select * into s from prl_sesion where anio=p_anio and mes=p_mes;
    if s.id is null or s.enviada_en is null or not (t.id = any(s.previstos)) then raise exception 'NO_ENVIADO'; end if;
  else
    s := _prl_sesion(p_anio,p_mes);
  end if;
  if s.estado='cerrada' then raise exception 'CERRADA'; end if;
  insert into prl_firma(sesion,trabajador,nombre,puesto,firma,por)
  values (s.id,w.id,w.nombre,coalesce(nullif(trim(p_puesto),''),w.categoria),p_firma,t.id)
  on conflict (sesion,trabajador) do update set puesto=excluded.puesto, firma=excluded.firma, por=excluded.por, firmado_en=now();
  if not (w.id = any(s.previstos)) then update prl_sesion set previstos=array_append(previstos,w.id) where id=s.id; end if;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.prl_firma_borrar(p_tok uuid, p_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  if exists(select 1 from prl_firma f join prl_sesion s on s.id=f.sesion where f.id=p_id and s.estado='cerrada') then raise exception 'CERRADA'; end if;
  delete from prl_firma where id=p_id;
end $$;

create or replace function public.prl_cerrar(p_tok uuid, p_anio int, p_mes int, p_cerrar boolean) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare s prl_sesion;
begin perform _admin(p_tok);
  s := _prl_sesion(p_anio,p_mes);
  update prl_sesion set estado=case when p_cerrar then 'cerrada' else 'abierta' end,
    cerrada_en=case when p_cerrar then now() else null end where id=s.id returning * into s;
  return to_jsonb(s);
end $$;

create or replace function public.prl_config_leer(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  return coalesce((select jsonb_object_agg(k,v) from prl_config),'{}');
end $$;

create or replace function public.prl_config_guardar(p_tok uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare kk text;
begin perform _admin(p_tok);
  foreach kk in array array['centro','duracion','formador','firma_formador'] loop
    if p ? kk then
      if kk='firma_formador' and p->>kk is not null and (p->>kk !~ '^data:image/(png|jpeg);base64,' or length(p->>kk)>400000) then raise exception 'FIRMA_INVALIDA'; end if;
      insert into prl_config as c (k,v) values (kk, nullif(p->>kk,'')) on conflict on constraint prl_config_pkey do update set v=excluded.v;
    end if;
  end loop;
  return coalesce((select jsonb_object_agg(c.k,c.v) from prl_config c),'{}');
end $$;

-- Alta/edición del contenido de un mes (para los Toolbox de 2027 en adelante)
create or replace function public.prl_toolbox_guardar(p_tok uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare r prl_toolbox;
begin perform _admin(p_tok);
  if coalesce(trim(p->>'compromiso'),'')='' then raise exception 'FALTA_COMPROMISO'; end if;
  insert into prl_toolbox(anio,mes,compromiso,cuerpo,puntos,tema,tema_intro,tema_puntos,imagen)
  values ((p->>'anio')::int,(p->>'mes')::int,trim(p->>'compromiso'),p->>'cuerpo',coalesce(p->'puntos','[]'),p->>'tema',p->>'tema_intro',coalesce(p->'tema_puntos','[]'),p->>'imagen')
  on conflict (anio,mes) do update set compromiso=excluded.compromiso,cuerpo=excluded.cuerpo,puntos=excluded.puntos,tema=excluded.tema,
    tema_intro=excluded.tema_intro,tema_puntos=excluded.tema_puntos,
    imagen=case when p ? 'imagen' then excluded.imagen else prl_toolbox.imagen end, actualizado=now()
  returning * into r;
  return to_jsonb(r);
end $$;

revoke all on function public._prl_sesion(int,int) from public, anon, authenticated;
