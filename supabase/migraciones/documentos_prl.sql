-- =====================================================================
-- DOCUMENTOS PRL (proyecto limpieza-cie)
--  epi      SH-CORP-SP-FO-014  Entrega de EPI
--  epi_col  SH-CORP-SP-FO-072  Entrega temporal EPI uso colectivo (altura)
--  info     SH-CORP-SP-FP-022  Entrega de información a los trabajadores
--  botiquin SH-CORP-SP-FO-018  Revisión del botiquín
-- =====================================================================

-- Datos del trabajador que piden los documentos (aparte para no tocar la tabla de la app de limpieza)
create table if not exists public.prl_trab (
  trabajador uuid primary key references public.trabajadores(id),
  dni text, puesto text, actualizado timestamptz not null default now());
alter table public.prl_trab enable row level security;

create table if not exists public.prl_doc (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('epi','epi_col','info','botiquin')),
  trabajador uuid references public.trabajadores(id),
  nombre text,
  fecha date not null,
  datos jsonb not null default '{}',
  firma text, firmado_en timestamptz, firmado_por uuid references public.trabajadores(id),
  firma2 text, firma2_en timestamptz,          -- botiquín: supervisado por
  enviada_en timestamptz,
  creado timestamptz not null default now(), creado_por uuid references public.trabajadores(id),
  borrado boolean not null default false);
create index if not exists prl_doc_fecha on public.prl_doc(tipo, fecha) where not borrado;
alter table public.prl_doc enable row level security;

insert into public.prl_config(k,v) values ('sello',null),('empresa','ISS Facility Services S.A.'),('lugar',null) on conflict do nothing;

create or replace function public._prl_djson(d public.prl_doc, con_firma boolean) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('id',d.id,'tipo',d.tipo,'trabajador',d.trabajador,'nombre',d.nombre,'fecha',d.fecha,'datos',d.datos,
    'firmado_en',d.firmado_en,'enviada_en',d.enviada_en,'tiene_firma',d.firma is not null,'tiene_firma2',d.firma2 is not null,
    'firma',case when con_firma then d.firma end,'firma2',case when con_firma then d.firma2 end,'firma2_en',d.firma2_en,'creado',d.creado,
    'dni',(select dni from prl_trab where trabajador=d.trabajador),'puesto',(select coalesce(t.puesto,w.categoria) from trabajadores w left join prl_trab t on t.trabajador=w.id where w.id=d.trabajador)) $$;
revoke all on function public._prl_djson(public.prl_doc, boolean) from public, anon, authenticated;

create or replace function public.prl_doc_lista(p_tok uuid, p_anio int) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  return coalesce((select jsonb_agg(_prl_djson(d,false) order by d.fecha desc, d.nombre)
    from prl_doc d where not d.borrado and extract(year from d.fecha)=p_anio),'[]');
end $$;

create or replace function public.prl_doc_ver(p_tok uuid, p_id uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; d prl_doc;
begin t:=_yo(p_tok);
  select * into d from prl_doc where id=p_id and not borrado;
  if not found then raise exception 'NO_EXISTE'; end if;
  if t.rol<>'admin' and (d.trabajador is distinct from t.id) then raise exception 'NO_ADMIN'; end if;
  return _prl_djson(d,true);
end $$;

-- Varias a la vez (jefe): para el PDF
create or replace function public.prl_doc_varios(p_tok uuid, p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  return coalesce((select jsonb_agg(_prl_djson(d,true) order by d.fecha, d.creado) from prl_doc d where d.id = any(p_ids) and not d.borrado),'[]');
end $$;

-- Crear (uno por trabajador) o editar
create or replace function public.prl_doc_guardar(p_tok uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; w trabajadores; ids uuid[] := '{}'; nid uuid; tp text := p->>'tipo';
begin t:=_admin(p_tok);
  if nullif(p->>'fecha','') is null then raise exception 'FALTA_FECHA'; end if;
  if p ? 'id' and nullif(p->>'id','') is not null then
    update prl_doc set fecha=(p->>'fecha')::date, datos=coalesce(p->'datos','{}') where id=(p->>'id')::uuid and not borrado returning id into nid;
    if nid is null then raise exception 'NO_EXISTE'; end if;
    return jsonb_build_object('ids',jsonb_build_array(nid));
  end if;
  if tp not in ('epi','epi_col','info','botiquin') then raise exception 'TIPO'; end if;
  if tp='botiquin' then
    insert into prl_doc(tipo,fecha,datos,creado_por) values (tp,(p->>'fecha')::date,coalesce(p->'datos','{}'),t.id) returning id into nid;
    return jsonb_build_object('ids',jsonb_build_array(nid));
  end if;
  for w in select * from trabajadores where activo and id in (select x::uuid from jsonb_array_elements_text(coalesce(p->'trabajadores','[]')) x) loop
    insert into prl_doc(tipo,trabajador,nombre,fecha,datos,creado_por) values (tp,w.id,w.nombre,(p->>'fecha')::date,coalesce(p->'datos','{}'),t.id) returning id into nid;
    ids := ids || nid;
  end loop;
  if array_length(ids,1) is null then raise exception 'FALTA_TRABAJADOR'; end if;
  return jsonb_build_object('ids',to_jsonb(ids));
end $$;

create or replace function public.prl_doc_enviar(p_tok uuid, p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare r record; n int := 0; msgs jsonb := '[]';
  nom jsonb := '{"epi":"Entrega de EPI","epi_col":"Entrega de EPI de uso colectivo","info":"Entrega de información"}';
begin perform _admin(p_tok);
  for r in update prl_doc set enviada_en=coalesce(enviada_en,now())
           where id = any(p_ids) and not borrado and firma is null and trabajador is not null and tipo<>'botiquin' returning id, trabajador, tipo loop
    msgs := msgs || jsonb_build_object('trabajadores',jsonb_build_array(r.trabajador),'tag','doc-'||r.id,
      'titulo',(nom->>r.tipo)||' para firmar','texto','Toca para leerlo y firmar.','url','toolbox.html?d='||r.id);
    n := n+1;
  end loop;
  if n>0 then perform _avisar(jsonb_build_object('mensajes',msgs)); end if;
  return jsonb_build_object('avisados',n);
end $$;

-- p_cual: 1 = firma principal (trabajador / quien realiza el control), 2 = supervisado por (botiquín)
create or replace function public.prl_doc_firmar(p_tok uuid, p_id uuid, p_firma text, p_cual int default 1) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; d prl_doc;
begin t:=_yo(p_tok);
  if p_firma is null or p_firma !~ '^data:image/(png|jpeg);base64,' or length(p_firma) > 400000 then raise exception 'FIRMA_INVALIDA'; end if;
  select * into d from prl_doc where id=p_id and not borrado;
  if not found then raise exception 'NO_EXISTE'; end if;
  if t.rol<>'admin' and (d.trabajador is distinct from t.id or d.enviada_en is null or p_cual<>1) then raise exception 'NO_ENVIADO'; end if;
  if p_cual=2 then update prl_doc set firma2=p_firma, firma2_en=now() where id=p_id;
  else update prl_doc set firma=p_firma, firmado_en=now(), firmado_por=t.id where id=p_id; end if;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.prl_doc_quitar_firma(p_tok uuid, p_id uuid, p_cual int default 1) returns void
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  if p_cual=2 then update prl_doc set firma2=null, firma2_en=null where id=p_id;
  else update prl_doc set firma=null, firmado_en=null, firmado_por=null where id=p_id; end if;
end $$;

create or replace function public.prl_doc_borrar(p_tok uuid, p_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok); update prl_doc set borrado=true where id=p_id; end $$;

-- DNI y puesto de los trabajadores (solo el jefe)
create or replace function public.prl_trab_lista(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'nombre',w.nombre,'categoria',w.categoria,'rol',w.rol,'dni',t.dni,'puesto',t.puesto) order by w.rol desc, w.nombre)
    from trabajadores w left join prl_trab t on t.trabajador=w.id where w.activo),'[]');
end $$;
create or replace function public.prl_trab_guardar(p_tok uuid, p_id uuid, p_dni text, p_puesto text) returns void
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  insert into prl_trab(trabajador,dni,puesto) values (p_id,nullif(upper(trim(p_dni)),''),nullif(trim(p_puesto),''))
  on conflict (trabajador) do update set dni=excluded.dni, puesto=excluded.puesto, actualizado=now();
end $$;

-- Pendientes del trabajador: Toolbox + formaciones + documentos
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
    union all
    select jsonb_build_object('tipo','doc','doc',d.tipo,'id',d.id,'fecha',d.fecha,'enviada_en',d.enviada_en,'orden','3'||d.fecha::text)
      from prl_doc d where d.trabajador=t.id and not d.borrado and d.enviada_en is not null and d.firma is null
  ) q),'[]');
end $$;

-- Documentos ya firmados por el trabajador
create or replace function public.prl_doc_mios(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores;
begin t:=_yo(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'tipo',tipo,'fecha',fecha,'firmado_en',firmado_en) order by fecha desc)
    from prl_doc where trabajador=t.id and not borrado and firma is not null),'[]');
end $$;

create or replace function public.prl_config_guardar(p_tok uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare kk text;
begin perform _admin(p_tok);
  foreach kk in array array['centro','duracion','formador','firma_formador','direccion','firma_resp','resp_nombre','sello','empresa','lugar'] loop
    if p ? kk then
      if kk in ('firma_formador','firma_resp','sello') and p->>kk is not null and p->>kk<>'' and (p->>kk !~ '^data:image/(png|jpeg);base64,' or length(p->>kk)>400000) then raise exception 'FIRMA_INVALIDA'; end if;
      insert into prl_config as c (k,v) values (kk, nullif(p->>kk,'')) on conflict on constraint prl_config_pkey do update set v=excluded.v;
    end if;
  end loop;
  return coalesce((select jsonb_object_agg(c.k,c.v) from prl_config c),'{}');
end $$;
