-- =====================================================================
-- DATOS DEL TRABAJADOR (alta, contacto de emergencia, idioma, tallas, reconocimiento médico)
-- y AUTORIZACIÓN DE USO DE MAQUINARIA — limpieza-cie
-- Del reconocimiento médico solo se guarda la APTITUD y las fechas (nunca diagnósticos).
-- =====================================================================
alter table public.prl_trab add column if not exists fecha_alta date;
alter table public.prl_trab add column if not exists fecha_baja date;
alter table public.prl_trab add column if not exists telefono text;
alter table public.prl_trab add column if not exists emerg_nombre text;
alter table public.prl_trab add column if not exists emerg_tel text;
alter table public.prl_trab add column if not exists idioma text;
alter table public.prl_trab add column if not exists tallas jsonb not null default '{}';
alter table public.prl_trab add column if not exists rm_fecha date;
alter table public.prl_trab add column if not exists rm_resultado text check (rm_resultado in ('apto','apto_restr','no_apto','renuncia'));
alter table public.prl_trab add column if not exists rm_limitacion text;   -- solo la limitación laboral, nunca el motivo
alter table public.prl_trab add column if not exists rm_proximo date;

-- Nuevo tipo de documento: autorización de uso de maquinaria
alter table public.prl_doc drop constraint if exists prl_doc_tipo_check;
alter table public.prl_doc add constraint prl_doc_tipo_check check (tipo in ('epi','epi_col','info','botiquin','autoriz'));

create or replace function public._prl_tjson(w public.trabajadores) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('id',w.id,'nombre',w.nombre,'activo',w.activo,'categoria',w.categoria,
    'dni',t.dni,'puesto',coalesce(t.puesto,w.categoria),'puesto_propio',t.puesto,
    'fecha_alta',t.fecha_alta,'fecha_baja',t.fecha_baja,'telefono',coalesce(t.telefono,w.telefono),'emerg_nombre',t.emerg_nombre,'emerg_tel',t.emerg_tel,
    'idioma',t.idioma,'tallas',coalesce(t.tallas,'{}'),'rm_fecha',t.rm_fecha,'rm_resultado',t.rm_resultado,'rm_limitacion',t.rm_limitacion,'rm_proximo',t.rm_proximo)
  from (select 1) x left join prl_trab t on t.trabajador=w.id $$;
revoke all on function public._prl_tjson(public.trabajadores) from public, anon, authenticated;

create or replace function public.prl_trab_datos_guardar(p_tok uuid, p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare w trabajadores;
begin perform _admin(p_tok);
  select * into w from trabajadores where id=p_id; if not found then raise exception 'NO_EXISTE'; end if;
  insert into prl_trab(trabajador) values (p_id) on conflict do nothing;
  update prl_trab set
    dni=case when p ? 'dni' then nullif(upper(trim(p->>'dni')),'') else dni end,
    puesto=case when p ? 'puesto' then nullif(trim(p->>'puesto'),'') else puesto end,
    fecha_alta=case when p ? 'fecha_alta' then nullif(p->>'fecha_alta','')::date else fecha_alta end,
    fecha_baja=case when p ? 'fecha_baja' then nullif(p->>'fecha_baja','')::date else fecha_baja end,
    telefono=case when p ? 'telefono' then nullif(trim(p->>'telefono'),'') else telefono end,
    emerg_nombre=case when p ? 'emerg_nombre' then nullif(trim(p->>'emerg_nombre'),'') else emerg_nombre end,
    emerg_tel=case when p ? 'emerg_tel' then nullif(trim(p->>'emerg_tel'),'') else emerg_tel end,
    idioma=case when p ? 'idioma' then nullif(trim(p->>'idioma'),'') else idioma end,
    tallas=case when p ? 'tallas' then coalesce(p->'tallas','{}') else tallas end,
    rm_fecha=case when p ? 'rm_fecha' then nullif(p->>'rm_fecha','')::date else rm_fecha end,
    rm_resultado=case when p ? 'rm_resultado' then nullif(p->>'rm_resultado','') else rm_resultado end,
    rm_limitacion=case when p ? 'rm_limitacion' then nullif(trim(p->>'rm_limitacion'),'') else rm_limitacion end,
    rm_proximo=case when p ? 'rm_proximo' then nullif(p->>'rm_proximo','')::date else rm_proximo end,
    actualizado=now()
  where trabajador=p_id;
  return _prl_tjson(w);
end $$;

-- Documentos: admite el tipo "autoriz"
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
  if tp not in ('epi','epi_col','info','botiquin','autoriz') then raise exception 'TIPO'; end if;
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
  nom jsonb := '{"epi":"Entrega de EPI","epi_col":"Entrega de EPI de uso colectivo","info":"Entrega de información","autoriz":"Autorización de uso de maquinaria"}';
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

-- Ficha y lista con los datos nuevos
create or replace function public.prl_ficha(p_tok uuid, p_trab uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare w trabajadores;
begin perform _admin(p_tok);
  select * into w from trabajadores where id=p_trab;
  if not found then raise exception 'NO_EXISTE'; end if;
  return jsonb_build_object(
    'trabajador', _prl_tjson(w),
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
      'dni',t.dni,'fecha_alta',t.fecha_alta,'rm_resultado',t.rm_resultado,'rm_proximo',t.rm_proximo,
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
    from trabajadores w left join prl_trab t on t.trabajador=w.id
    where w.rol='operario' and (w.activo or exists(select 1 from prl_doc d where d.trabajador=w.id) or exists(select 1 from prl_formacion f where f.trabajador=w.id))),'[]');
end $$;
