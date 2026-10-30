-- Hornos: «Cambio de juntas» como tipo propio (solo juntas, sin cono ni tolva).
-- Las juntas que se gastan se eligen de las del horno (juntas del cono y junta del tubo) y se descuentan
-- automáticamente en el Almacén, igual que el resto de cambios. Idempotente.

-- 1) Qué piezas descuenta cada cambio: el cambio de juntas descuenta las juntas elegidas
create or replace function public._horno_items(p_rec jsonb, p_acc text, p_tolva text, p_juntas jsonb)
returns jsonb
language plpgsql
immutable
set search_path to ''
as $function$
declare items jsonb := public._horno_items(p_rec, p_acc, p_tolva); k text := public._pieza_de(p_acc);
begin
  if p_acc = 'cambio_tolva' and p_juntas is not null and jsonb_typeof(p_juntas) = 'array' then
    items := items || coalesce((select jsonb_agg(j || jsonb_build_object('que','junta_tolva')) from jsonb_array_elements(p_juntas) j), '[]'::jsonb);
  end if;
  if k is not null and p_rec is not null and p_rec ? k then
    items := items || jsonb_build_array(jsonb_build_object('art', p_rec->>k, 'que', k, 'cant',
      coalesce(case when p_juntas is not null and jsonb_typeof(p_juntas) = 'array' and jsonb_array_length(p_juntas) > 0 then (p_juntas->0->>'cant')::numeric end, 1)));
  end if;
  if p_acc = 'cambio_otra' and p_juntas is not null and jsonb_typeof(p_juntas) = 'array' then
    items := items || coalesce((select jsonb_agg(jsonb_build_object('art', j->>'art', 'cant', (j->>'cant')::numeric, 'que', 'otra')) from jsonb_array_elements(p_juntas) j), '[]'::jsonb);
  end if;
  if p_acc = 'cambio_juntas' and p_juntas is not null and jsonb_typeof(p_juntas) = 'array' then
    items := items || coalesce((select jsonb_agg(jsonb_build_object('art', j->>'art', 'cant', (j->>'cant')::numeric, 'que', 'junta')) from jsonb_array_elements(p_juntas) j), '[]'::jsonb);
  end if;
  return items;
end $function$;

-- 2) Validar las juntas: solo las del horno (juntas del cono y junta del tubo), 1 a 20 de cada
create or replace function public._juntas_todas(p_rec jsonb, p_j jsonb)
returns jsonb
language plpgsql
immutable
set search_path to 'public'
as $function$
declare r jsonb := '[]'::jsonb; j jsonb; ok text[];
begin
  if p_j is null or jsonb_typeof(p_j) <> 'array' or jsonb_array_length(p_j) = 0 then raise exception 'FALTAN_JUNTAS'; end if;
  select coalesce(array_agg(x), '{}') into ok from (
    select x->>'art' as x from jsonb_array_elements(coalesce(p_rec->'juntas_cono', '[]'::jsonb)) x
    union all
    select p_rec->>'junta_tubo' where p_rec ? 'junta_tubo') s;
  for j in select * from jsonb_array_elements(p_j) loop
    if not (j->>'art' = any(ok)) then raise exception 'JUNTA_MAL'; end if;
    if coalesce((j->>'cant')::numeric, 0) <= 0 or (j->>'cant')::numeric > 20 then raise exception 'JUNTA_CANT_MAL'; end if;
    r := r || jsonb_build_array(jsonb_build_object('art', j->>'art', 'cant', (j->>'cant')::numeric));
  end loop;
  return r;
end $function$;

-- 3) Registrar un horno: acepta «cambio_juntas»
create or replace function public.horno_registrar(p_tok uuid, p_el uuid, p_accion text, p_fecha date, p_motivo text, p_nota text, p_minutos integer, p_tolva text, p_juntas jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare t trabajadores; e elementos; o ots; f timestamptz; etiq text; tv text := nullif(trim(p_tolva),''); jn jsonb;
begin
  t := _yo(p_tok);
  select * into e from elementos where id=p_el and not borrado; if not found then raise exception 'NO_EXISTE_EL'; end if;
  if p_accion not in ('vaciado','cambio_tolva','cambio_cono','cambio_dosificador','cambio_tolva_cono','cambio_resistencia','cambio_centrador','cambio_con_estrella','cambio_con_fase','cambio_otra','cambio_juntas') then raise exception 'ACCION_MAL'; end if;
  if p_accion like 'cambio%' and coalesce(trim(p_motivo),'')='' then raise exception 'FALTA_MOTIVO'; end if;
  if tv is not null and tv not in ('hierro','refractario') then raise exception 'TOLVA_MAL'; end if;
  if p_accion in ('cambio_tolva','cambio_tolva_cono') and tv is null and coalesce(e.recambios,'{}'::jsonb) <> '{}'::jsonb then raise exception 'FALTA_TOLVA'; end if;
  if p_accion = 'cambio_tolva' then jn := _juntas_ok(e.recambios, p_juntas); end if;
  if p_accion = 'cambio_juntas' then jn := _juntas_todas(e.recambios, p_juntas); end if;
  if _pieza_de(p_accion) is not null then jn := _piezas_ok(e.recambios, p_accion, p_juntas); end if;
  if p_accion = 'cambio_otra' then jn := _otras_ok(e.recambios, p_juntas); end if;
  if p_minutos is not null and (p_minutos<1 or p_minutos>720) then raise exception 'TIEMPO_MAL'; end if;
  f := case when p_fecha is null or p_fecha=_hoy() then now() else (p_fecha + time '12:00') at time zone 'Europe/Madrid' end;
  etiq := case p_accion when 'vaciado' then 'Vaciado' when 'cambio_tolva' then 'Cambio de tolva' when 'cambio_cono' then 'Cambio de cono' when 'cambio_dosificador' then 'Cambio de tubo dosificador'
    when 'cambio_resistencia' then 'Cambio de resistencia' when 'cambio_centrador' then 'Cambio de centrador' when 'cambio_con_estrella' then 'Cambio de conexión estrella' when 'cambio_con_fase' then 'Cambio de conexión fase' when 'cambio_otra' then 'Cambio de piezas' when 'cambio_juntas' then 'Cambio de juntas'
    else 'Cambio de tolva y cono' end;
  insert into ots(fecha,titulo,descripcion,lugar,tipo,equipo,asignados,origen,creado_por,prioridad,elemento_id,estado,inicio,fin,hecho_por,tiempo_auto,tiempo_decl,nota,accion_horno,motivo,minutos_est,tolva_tipo,juntas)
  values ((f at time zone 'Europe/Madrid')::date, etiq||' · '||e.nombre, null, e.lugar, 'Mantenimiento '||e.tipo, case when extract(isodow from _hoy())>=6 and 'Finde'=any(t.equipos) then 'Finde' else t.equipos[1] end,
    array[t.id],'rapida',t.id,'normal',e.id,'hecha', case when p_minutos is not null then f - make_interval(mins=>p_minutos) else null end, f, t.id, false, p_minutos is not null, nullif(trim(p_nota),''), p_accion, nullif(trim(p_motivo),''), p_minutos,
    case when p_accion in ('cambio_tolva','cambio_tolva_cono') then tv end, jn) returning * into o;
  return _otjson(o);
end $function$;

-- 4) La corrección de registros acepta también «cambio_juntas»
create or replace function public.horno_registro_editar(p_tok uuid, p_ot uuid, p_quien uuid, p_accion text, p_piezas jsonb, p_anular boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare t trabajadores; o ots; w trabajadores;
begin
  t := _yo(p_tok);
  if t.rol <> 'admin' then raise exception 'NO_ADMIN'; end if;
  select * into o from ots where id = p_ot and not borrado and elemento_id is not null;
  if not found then raise exception 'NO_EXISTE'; end if;
  if o.estado <> 'hecha' then raise exception 'NO_HECHA'; end if;

  if coalesce(p_anular, false) then
    if coalesce(o.accion_horno, '') like 'cambio%' then
      perform horno_corregir_material(p_tok, p_ot, '[]'::jsonb);
    end if;
    update ots set borrado = true where id = p_ot;
    insert into ot_log(ot, quien, accion, detalle)
    values (p_ot, t.id, 'editado', 'registro anulado: ' || coalesce(o.accion_horno, 'limpieza') || ' no se hizo');
    return jsonb_build_object('anulado', true);
  end if;

  if p_quien is not null and p_quien is distinct from o.hecho_por then
    select * into w from trabajadores where id = p_quien and activo;
    if not found then raise exception 'NO_EXISTE'; end if;
    update ots set hecho_por = w.id where id = p_ot;
    insert into ot_log(ot, quien, accion, detalle) values (p_ot, t.id, 'editado', 'quien lo hizo: ' || w.nombre);
  end if;

  if p_piezas is not null then
    if coalesce(o.accion_horno, '') not like 'cambio%' then raise exception 'NO_CAMBIO'; end if;
    perform horno_corregir_material(p_tok, p_ot, p_piezas);
    insert into ot_log(ot, quien, accion, detalle) values (p_ot, t.id, 'editado', 'piezas corregidas');
  end if;

  if p_accion is not null and p_accion <> coalesce(o.accion_horno, 'limpieza') then
    if p_accion not in ('limpieza','vaciado','cambio_tolva','cambio_cono','cambio_dosificador','cambio_resistencia',
                        'cambio_centrador','cambio_con_estrella','cambio_con_fase','cambio_otra','cambio_juntas') then
      raise exception 'ACCION_MAL';
    end if;
    if p_accion not like 'cambio%' and exists (select 1 from consumos_horno where ot_id = p_ot and envio <> 'anulado') then
      raise exception 'PIEZAS_PENDIENTES';
    end if;
    update ots set accion_horno = p_accion where id = p_ot;
    insert into ot_log(ot, quien, accion, detalle)
    values (p_ot, t.id, 'editado', 'tipo: ' || coalesce(o.accion_horno, 'limpieza') || ' → ' || p_accion);
  end if;

  select * into o from ots where id = p_ot;
  return _otjson(o);
end
$function$;
