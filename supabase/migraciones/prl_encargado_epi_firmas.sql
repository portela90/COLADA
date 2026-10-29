-- Toolbox HSE (proyecto limpieza-cie): el encargado puede gestionar los EPI
-- (entregas y firmas) pero NO ve las fichas de los trabajadores.
--
-- Regla: _admin_o_enc(p_tok) deja pasar al admin y al encargado.
-- Documentos a los que accede el encargado: solo tipo 'epi' y 'epi_col'.
-- Fichas (prl_ficha, prl_fichas), reconocimiento médico, certificados y
-- prl_config_leer siguen siendo solo de admin.
--
-- Este fichero es idempotente: se puede volver a ejecutar sin efectos extra.

-- 1) Guarda de admin o encargado
create or replace function public._admin_o_enc(p_tok uuid)
returns trabajadores
language plpgsql
security definer
set search_path to 'public'
as $function$
declare t trabajadores;
begin
  t := _yo(p_tok);
  if t.rol <> 'admin' and not _es_enc(t) then raise exception 'NO_ADMIN'; end if;
  return t;
end $function$;

-- 2) Funciones de lista/envío que pasaban a ser solo admin: ahora admin o encargado
do $m$
declare r record; d text;
begin
  for r in select oid from pg_proc
           where pronamespace = 'public'::regnamespace
             and proname in ('prl_doc_lista','prl_doc_enviar','prl_doc_varios','prl_trab_lista','prl_trabajadores')
  loop
    d := pg_get_functiondef(r.oid);
    if position('_admin(p_tok)' in d) > 0 then
      d := replace(d, '_admin(p_tok)', '_admin_o_enc(p_tok)');
      execute d;
    end if;
  end loop;
end $m$;

-- 3) Guardar documentos: el encargado solo crea/edita EPI y EPI colectivo
create or replace function public.prl_doc_guardar(p_tok uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare t trabajadores; w trabajadores; ids uuid[] := '{}'; nid uuid; tp text := p->>'tipo';
begin t:=_admin_o_enc(p_tok);
  if nullif(p->>'fecha','') is null then raise exception 'FALTA_FECHA'; end if;
  if p ? 'id' and nullif(p->>'id','') is not null then
    if t.rol <> 'admin' and not exists(select 1 from prl_doc where id=(p->>'id')::uuid and tipo in ('epi','epi_col')) then raise exception 'NO_ADMIN'; end if;
    update prl_doc set fecha=(p->>'fecha')::date, datos=coalesce(p->'datos','{}') where id=(p->>'id')::uuid and not borrado returning id into nid;
    if nid is null then raise exception 'NO_EXISTE'; end if;
    return jsonb_build_object('ids',jsonb_build_array(nid));
  end if;
  if tp not in ('epi','epi_col','info','botiquin','autoriz') then raise exception 'TIPO'; end if;
  if t.rol <> 'admin' and tp not in ('epi','epi_col') then raise exception 'NO_ADMIN'; end if;
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
end $function$;

-- 4) Firma en persona: el encargado recoge la firma del trabajador en su móvil
create or replace function public.prl_doc_firmar_enc(p_tok uuid, p_id uuid, p_firma text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare t trabajadores; d prl_doc;
begin
  t := _admin_o_enc(p_tok);
  if p_firma is null or p_firma !~ '^data:image/(png|jpeg);base64,' or length(p_firma) > 400000 then raise exception 'FIRMA_INVALIDA'; end if;
  select * into d from prl_doc where id = p_id and not borrado;
  if not found then raise exception 'NO_EXISTE'; end if;
  if t.rol <> 'admin' and d.tipo not in ('epi','epi_col') then raise exception 'NO_ADMIN'; end if;
  if d.trabajador is null then raise exception 'SIN_TRABAJADOR'; end if;
  update prl_doc set firma = p_firma, firmado_en = now(), firmado_por = t.id where id = p_id;
  return jsonb_build_object('ok', true, 'firmo', d.trabajador);
end $function$;

-- 5) Ver un documento: el encargado puede abrir los EPI de cualquier trabajador
create or replace function public.prl_doc_ver(p_tok uuid, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare t trabajadores; d prl_doc;
begin t:=_yo(p_tok);
  select * into d from prl_doc where id=p_id and not borrado;
  if not found then raise exception 'NO_EXISTE'; end if;
  if t.rol<>'admin' and (d.trabajador is distinct from t.id)
     and not (d.tipo in ('epi','epi_col') and _es_enc(t)) then raise exception 'NO_ADMIN'; end if;
  return _prl_djson(d,true);
end $function$;

-- 6) Lista de documentos: el encargado solo recibe los EPI y EPI colectivo
create or replace function public.prl_doc_lista(p_tok uuid, p_anio integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare t trabajadores;
begin t := _admin_o_enc(p_tok);
  return coalesce((select jsonb_agg(_prl_djson(d,false) order by d.fecha desc, d.nombre)
    from prl_doc d where not d.borrado and extract(year from d.fecha)=p_anio
    and (t.rol='admin' or d.tipo in ('epi','epi_col'))),'[]');
end $function$;
