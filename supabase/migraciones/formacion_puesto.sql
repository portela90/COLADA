-- =====================================================================
-- FORMACIÓN PRÁCTICA EN EL PUESTO (F40R304) — proyecto limpieza-cie
-- Añade la tabla prl_formacion y sus funciones. Amplía prl_pendientes.
-- =====================================================================

create table if not exists public.prl_formacion (
  id uuid primary key default gen_random_uuid(),
  trabajador uuid not null references public.trabajadores(id),
  nombre text not null,
  fecha date not null,
  duracion text,
  direccion text,
  impartida text,
  items int[] not null default '{}',
  otros1 text,            -- "Otros:" del punto 1
  otros6 text,            -- texto del punto 6. OTROS
  firma text,             -- firma del trabajador (PNG dataURL)
  firmado_en timestamptz,
  firmado_por uuid references public.trabajadores(id),
  enviada_en timestamptz,
  eval_fecha date,
  eval_eficaz boolean,
  nueva_fecha date,
  creado timestamptz not null default now(),
  creado_por uuid references public.trabajadores(id),
  borrado boolean not null default false);
create index if not exists prl_formacion_fecha on public.prl_formacion(fecha) where not borrado;
alter table public.prl_formacion enable row level security;

insert into public.prl_config(k,v) values ('direccion',null),('firma_resp',null),('resp_nombre',null) on conflict do nothing;

create or replace function public._prl_fjson(f public.prl_formacion, con_firma boolean) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('id',f.id,'trabajador',f.trabajador,'nombre',f.nombre,'fecha',f.fecha,'duracion',f.duracion,
    'direccion',f.direccion,'impartida',f.impartida,'items',to_jsonb(f.items),'otros1',f.otros1,'otros6',f.otros6,
    'firmado_en',f.firmado_en,'enviada_en',f.enviada_en,'eval_fecha',f.eval_fecha,'eval_eficaz',f.eval_eficaz,'nueva_fecha',f.nueva_fecha,
    'firma',case when con_firma then f.firma end,'tiene_firma',f.firma is not null,'creado',f.creado) $$;
revoke all on function public._prl_fjson(public.prl_formacion, boolean) from public, anon, authenticated;

-- Lista del año (jefe)
create or replace function public.prl_form_lista(p_tok uuid, p_anio int) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  return coalesce((select jsonb_agg(_prl_fjson(f,false) order by f.fecha desc, f.nombre)
    from prl_formacion f where not f.borrado and extract(year from f.fecha)=p_anio),'[]');
end $$;

-- Una formación (jefe: cualquiera; operario: solo la suya)
create or replace function public.prl_form_ver(p_tok uuid, p_id uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; f prl_formacion;
begin t:=_yo(p_tok);
  select * into f from prl_formacion where id=p_id and not borrado;
  if not found then raise exception 'NO_EXISTE'; end if;
  if t.rol<>'admin' and f.trabajador<>t.id then raise exception 'NO_ADMIN'; end if;
  return _prl_fjson(f,true);
end $$;

-- Crear (uno o varios trabajadores a la vez) o editar
create or replace function public.prl_form_guardar(p_tok uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; w trabajadores; ids uuid[] := '{}'; nid uuid; its int[];
begin t:=_admin(p_tok);
  if nullif(p->>'fecha','') is null then raise exception 'FALTA_FECHA'; end if;
  its := coalesce((select array_agg(distinct x::int order by x::int) from jsonb_array_elements_text(coalesce(p->'items','[]')) x where x ~ '^[1-6]$'),'{}');
  if p ? 'id' and nullif(p->>'id','') is not null then
    update prl_formacion set fecha=(p->>'fecha')::date, duracion=nullif(trim(p->>'duracion'),''), direccion=nullif(trim(p->>'direccion'),''),
      impartida=nullif(trim(p->>'impartida'),''), items=its, otros1=nullif(trim(p->>'otros1'),''), otros6=nullif(trim(p->>'otros6'),'')
    where id=(p->>'id')::uuid and not borrado returning id into nid;
    if nid is null then raise exception 'NO_EXISTE'; end if;
    return jsonb_build_object('ids',jsonb_build_array(nid));
  end if;
  for w in select * from trabajadores where activo and id in (select x::uuid from jsonb_array_elements_text(coalesce(p->'trabajadores','[]')) x) loop
    insert into prl_formacion(trabajador,nombre,fecha,duracion,direccion,impartida,items,otros1,otros6,creado_por)
    values (w.id,w.nombre,(p->>'fecha')::date,nullif(trim(p->>'duracion'),''),nullif(trim(p->>'direccion'),''),nullif(trim(p->>'impartida'),''),
      its,nullif(trim(p->>'otros1'),''),nullif(trim(p->>'otros6'),''),t.id) returning id into nid;
    ids := ids || nid;
  end loop;
  if array_length(ids,1) is null then raise exception 'FALTA_TRABAJADOR'; end if;
  return jsonb_build_object('ids',to_jsonb(ids));
end $$;

-- Enviar / recordar a los que no han firmado
create or replace function public.prl_form_enviar(p_tok uuid, p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare r record; n int := 0; msgs jsonb := '[]';
begin perform _admin(p_tok);
  for r in update prl_formacion set enviada_en=coalesce(enviada_en,now())
           where id = any(p_ids) and not borrado and firma is null returning id, trabajador loop
    msgs := msgs || jsonb_build_object('trabajadores',jsonb_build_array(r.trabajador),'tag','formacion-'||r.id,
      'titulo','Formación en el puesto para firmar','texto','Toca para leerla y firmar.','url','toolbox.html?f='||r.id);
    n := n+1;
  end loop;
  if n>0 then perform _avisar(jsonb_build_object('mensajes',msgs)); end if;
  return jsonb_build_object('avisados',n);
end $$;

-- Firmar (el trabajador la suya; el jefe puede recogerla en su móvil)
create or replace function public.prl_form_firmar(p_tok uuid, p_id uuid, p_firma text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; f prl_formacion;
begin t:=_yo(p_tok);
  if p_firma is null or p_firma !~ '^data:image/(png|jpeg);base64,' or length(p_firma) > 400000 then raise exception 'FIRMA_INVALIDA'; end if;
  select * into f from prl_formacion where id=p_id and not borrado;
  if not found then raise exception 'NO_EXISTE'; end if;
  if t.rol<>'admin' and (f.trabajador<>t.id or f.enviada_en is null) then raise exception 'NO_ENVIADO'; end if;
  update prl_formacion set firma=p_firma, firmado_en=now(), firmado_por=t.id where id=p_id;
  return jsonb_build_object('ok',true);
end $$;

-- Quitar la firma (por si hay que repetirla)
create or replace function public.prl_form_quitar_firma(p_tok uuid, p_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  update prl_formacion set firma=null, firmado_en=null, firmado_por=null where id=p_id;
end $$;

-- Evaluación de la eficacia
create or replace function public.prl_form_evaluar(p_tok uuid, p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare f prl_formacion;
begin perform _admin(p_tok);
  update prl_formacion set eval_fecha=nullif(p->>'eval_fecha','')::date,
    eval_eficaz=case when p->>'eval_eficaz' in ('true','false') then (p->>'eval_eficaz')::boolean else null end,
    nueva_fecha=nullif(p->>'nueva_fecha','')::date
  where id=p_id and not borrado returning * into f;
  if f.id is null then raise exception 'NO_EXISTE'; end if;
  return _prl_fjson(f,false);
end $$;

create or replace function public.prl_form_borrar(p_tok uuid, p_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok); update prl_formacion set borrado=true where id=p_id; end $$;

-- Firmas de varias formaciones (para el PDF de todo un mes)
create or replace function public.prl_form_firmas(p_tok uuid, p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  return coalesce((select jsonb_agg(_prl_fjson(f,true) order by f.fecha, f.nombre) from prl_formacion f where f.id = any(p_ids) and not f.borrado),'[]');
end $$;

-- Pendientes del trabajador: Toolbox + formaciones
create or replace function public.prl_pendientes(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores;
begin t:=_yo(p_tok);
  return coalesce((select jsonb_agg(x order by x->>'orden') from (
    select jsonb_build_object('tipo','toolbox','anio',s.anio,'mes',s.mes,'compromiso',tb.compromiso,'tema',tb.tema,'enviada_en',s.enviada_en,
             'orden','1'||lpad(s.anio::text,4,'0')||lpad(s.mes::text,2,'0')) x
      from prl_sesion s join prl_toolbox tb on tb.anio=s.anio and tb.mes=s.mes
      where s.enviada_en is not null and s.estado='abierta' and t.id = any(s.previstos)
        and not exists(select 1 from prl_firma f where f.sesion=s.id and f.trabajador=t.id)
    union all
    select jsonb_build_object('tipo','formacion','id',f.id,'fecha',f.fecha,'enviada_en',f.enviada_en,'orden','2'||f.fecha::text)
      from prl_formacion f where f.trabajador=t.id and not f.borrado and f.enviada_en is not null and f.firma is null
  ) q),'[]');
end $$;

-- Formaciones ya firmadas por el trabajador (para su historial)
create or replace function public.prl_form_mias(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores;
begin t:=_yo(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'fecha',fecha,'firmado_en',firmado_en) order by fecha desc)
    from prl_formacion where trabajador=t.id and not borrado and firma is not null),'[]');
end $$;

create or replace function public.prl_config_guardar(p_tok uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare kk text;
begin perform _admin(p_tok);
  foreach kk in array array['centro','duracion','formador','firma_formador','direccion','firma_resp','resp_nombre'] loop
    if p ? kk then
      if kk in ('firma_formador','firma_resp') and p->>kk is not null and (p->>kk !~ '^data:image/(png|jpeg);base64,' or length(p->>kk)>400000) then raise exception 'FIRMA_INVALIDA'; end if;
      insert into prl_config as c (k,v) values (kk, nullif(p->>kk,'')) on conflict on constraint prl_config_pkey do update set v=excluded.v;
    end if;
  end loop;
  return coalesce((select jsonb_object_agg(c.k,c.v) from prl_config c),'{}');
end $$;
