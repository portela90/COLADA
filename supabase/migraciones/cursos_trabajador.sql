-- =====================================================================
-- CURSOS Y CERTIFICADOS POR TRABAJADOR (grúa, PEMP, carretilla...) — limpieza-cie
-- Los archivos (foto o PDF) se guardan en la base de datos, aparte, para que las listas vayan rápidas.
-- =====================================================================
create table if not exists public.prl_cert (
  id uuid primary key default gen_random_uuid(),
  trabajador uuid not null references public.trabajadores(id),
  tipo text not null, titulo text, entidad text, horas numeric,
  fecha date, caduca date, notas text,
  creado timestamptz not null default now(), creado_por uuid references public.trabajadores(id),
  borrado boolean not null default false);
create index if not exists prl_cert_trab on public.prl_cert(trabajador) where not borrado;
alter table public.prl_cert enable row level security;

create table if not exists public.prl_cert_arch (
  id uuid primary key default gen_random_uuid(),
  cert uuid not null references public.prl_cert(id) on delete cascade,
  nombre text, mime text not null, tam int, data text not null,
  creado timestamptz not null default now());
create index if not exists prl_cert_arch_cert on public.prl_cert_arch(cert);
alter table public.prl_cert_arch enable row level security;

create or replace function public._prl_cjson(c public.prl_cert) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('id',c.id,'trabajador',c.trabajador,'tipo',c.tipo,'titulo',c.titulo,'entidad',c.entidad,'horas',c.horas,
    'fecha',c.fecha,'caduca',c.caduca,'notas',c.notas,'creado',c.creado,
    'archivos',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'nombre',a.nombre,'mime',a.mime,'tam',a.tam) order by a.creado) from prl_cert_arch a where a.cert=c.id),'[]')) $$;
revoke all on function public._prl_cjson(public.prl_cert) from public, anon, authenticated;

create or replace function public.prl_cert_guardar(p_tok uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; c prl_cert;
begin t:=_admin(p_tok);
  if coalesce(trim(p->>'tipo'),'')='' then raise exception 'FALTA_TIPO'; end if;
  if p ? 'id' and nullif(p->>'id','') is not null then
    update prl_cert set tipo=trim(p->>'tipo'), titulo=nullif(trim(p->>'titulo'),''), entidad=nullif(trim(p->>'entidad'),''),
      horas=nullif(p->>'horas','')::numeric, fecha=nullif(p->>'fecha','')::date, caduca=nullif(p->>'caduca','')::date, notas=nullif(trim(p->>'notas'),'')
    where id=(p->>'id')::uuid and not borrado returning * into c;
    if c.id is null then raise exception 'NO_EXISTE'; end if;
  else
    insert into prl_cert(trabajador,tipo,titulo,entidad,horas,fecha,caduca,notas,creado_por)
    values ((p->>'trabajador')::uuid, trim(p->>'tipo'), nullif(trim(p->>'titulo'),''), nullif(trim(p->>'entidad'),''), nullif(p->>'horas','')::numeric,
      nullif(p->>'fecha','')::date, nullif(p->>'caduca','')::date, nullif(trim(p->>'notas'),''), t.id) returning * into c;
  end if;
  return _prl_cjson(c);
end $$;

create or replace function public.prl_cert_borrar(p_tok uuid, p_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok); update prl_cert set borrado=true where id=p_id; end $$;

-- Adjuntar archivo (máx. ~6 MB en base64)
create or replace function public.prl_cert_arch_add(p_tok uuid, p_cert uuid, p_nombre text, p_data text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare m text; nid uuid;
begin perform _admin(p_tok);
  m := substring(p_data from '^data:([a-z]+/[a-z0-9.+-]+);base64,');
  if m is null or m not in ('image/jpeg','image/png','application/pdf') then raise exception 'ARCHIVO_TIPO'; end if;
  if length(p_data) > 8000000 then raise exception 'ARCHIVO_GRANDE'; end if;
  if not exists(select 1 from prl_cert where id=p_cert and not borrado) then raise exception 'NO_EXISTE'; end if;
  insert into prl_cert_arch(cert,nombre,mime,tam,data) values (p_cert, left(p_nombre,120), m, (length(p_data)*3/4)::int, p_data) returning id into nid;
  return jsonb_build_object('id',nid);
end $$;

create or replace function public.prl_cert_arch_borrar(p_tok uuid, p_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok); delete from prl_cert_arch where id=p_id; end $$;

create or replace function public.prl_cert_arch_datos(p_tok uuid, p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'cert',cert,'nombre',nombre,'mime',mime,'data',data) order by creado) from prl_cert_arch where id = any(p_ids)),'[]');
end $$;

-- Ficha: añade los cursos
create or replace function public.prl_ficha(p_tok uuid, p_trab uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare w trabajadores;
begin perform _admin(p_tok);
  select * into w from trabajadores where id=p_trab;
  if not found then raise exception 'NO_EXISTE'; end if;
  return jsonb_build_object(
    'trabajador', jsonb_build_object('id',w.id,'nombre',w.nombre,'activo',w.activo,'categoria',w.categoria,
        'dni',(select dni from prl_trab where trabajador=w.id),'puesto',coalesce((select puesto from prl_trab where trabajador=w.id),w.categoria)),
    'docs', coalesce((select jsonb_agg(_prl_djson(d,false) order by d.fecha desc, d.creado desc) from prl_doc d where d.trabajador=w.id and not d.borrado),'[]'),
    'formaciones', coalesce((select jsonb_agg(_prl_fjson(f,false) order by f.fecha desc) from prl_formacion f where f.trabajador=w.id and not f.borrado),'[]'),
    'certs', coalesce((select jsonb_agg(_prl_cjson(c) order by c.fecha desc nulls last, c.creado desc) from prl_cert c where c.trabajador=w.id and not c.borrado),'[]'),
    'toolbox', coalesce((select jsonb_agg(jsonb_build_object('anio',s.anio,'mes',s.mes,'tema',tb.tema,'compromiso',tb.compromiso,'firmado_en',fi.firmado_en) order by s.anio desc, s.mes desc)
        from prl_firma fi join prl_sesion s on s.id=fi.sesion left join prl_toolbox tb on tb.anio=s.anio and tb.mes=s.mes where fi.trabajador=w.id),'[]'));
end $$;

create or replace function public.prl_fichas(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'nombre',w.nombre,'activo',w.activo,'rol',w.rol,
      'dni',(select dni from prl_trab where trabajador=w.id),
      'epis',(select count(*) from prl_doc d where d.trabajador=w.id and not d.borrado and d.tipo in ('epi','epi_col')),
      'ult_epi',(select max(fecha) from prl_doc d where d.trabajador=w.id and not d.borrado and d.tipo in ('epi','epi_col')),
      'sin_firmar',(select count(*) from prl_doc d where d.trabajador=w.id and not d.borrado and d.firma is null)
                   +(select count(*) from prl_formacion f where f.trabajador=w.id and not f.borrado and f.firma is null),
      'info',exists(select 1 from prl_doc d where d.trabajador=w.id and not d.borrado and d.tipo='info' and d.firma is not null),
      'formacion',exists(select 1 from prl_formacion f where f.trabajador=w.id and not f.borrado and f.firma is not null),
      'cursos',(select count(*) from prl_cert c where c.trabajador=w.id and not c.borrado),
      'caducados',(select count(*) from prl_cert c where c.trabajador=w.id and not c.borrado and c.caduca < current_date),
      'por_caducar',(select count(*) from prl_cert c where c.trabajador=w.id and not c.borrado and c.caduca between current_date and current_date + 60))
    order by w.activo desc, w.nombre)
    from trabajadores w where w.rol='operario' and (w.activo or exists(select 1 from prl_doc d where d.trabajador=w.id) or exists(select 1 from prl_formacion f where f.trabajador=w.id))),'[]');
end $$;
