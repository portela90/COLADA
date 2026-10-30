-- Limpiezas de inyectoras/hornos (proyecto limpieza-cie):
--  1) limpieza_fecha_corregir: corregir la fecha y hora en que se hizo una limpieza ya apuntada
--     (la hace el admin o quien la apuntó). Mantiene la duración, no cambia el estado ni dispara avisos
--     (los avisos de ots_push solo salen si cambian los asignados o el estado) y deja rastro en ot_log.
--  2) limpieza_detalle: checklist, resultado y nota de una limpieza, para verla en la ficha del elemento.
-- Idempotente: se puede ejecutar varias veces.

create or replace function public.limpieza_fecha_corregir(p_tok uuid, p_ot uuid, p_fin timestamptz)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare t trabajadores; o ots; antes timestamptz; dur interval;
begin
  t := _yo(p_tok);
  select * into o from ots where id = p_ot and not borrado and elemento_id is not null;
  if not found then raise exception 'NO_EXISTE'; end if;
  if not (t.rol = 'admin' or o.hecho_por = t.id) then raise exception 'NO_PERMISO'; end if;
  if o.estado <> 'hecha' then raise exception 'NO_HECHA'; end if;
  if p_fin is null or p_fin > now() + interval '5 minutes' then raise exception 'FECHA_MAL'; end if;
  antes := o.fin;
  dur := case when o.inicio is not null and o.fin is not null then o.fin - o.inicio end;
  update ots
     set fin = p_fin,
         fecha = (p_fin at time zone 'Europe/Madrid')::date,
         inicio = case when dur is not null then p_fin - dur else null end
   where id = p_ot
   returning * into o;
  insert into ot_log(ot, quien, accion, detalle)
  values (o.id, t.id, 'fecha',
          'fecha corregida de ' || coalesce(to_char(antes at time zone 'Europe/Madrid', 'DD/MM/YYYY HH24:MI'), '-')
          || ' a ' || to_char(p_fin at time zone 'Europe/Madrid', 'DD/MM/YYYY HH24:MI'));
  return _otjson(o);
end
$function$;

create or replace function public.limpieza_detalle(p_tok uuid, p_ot uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare t trabajadores; o ots;
begin
  t := _yo(p_tok);
  select * into o from ots where id = p_ot and not borrado and elemento_id is not null;
  if not found then raise exception 'NO_EXISTE'; end if;
  return jsonb_build_object(
    'id', o.id,
    'fin', o.fin,
    'inicio', o.inicio,
    'quien', (select nombre from trabajadores where id = o.hecho_por),
    'resultado', o.resultado,
    'nota', o.nota,
    'checklist', coalesce(o.checklist, '{}'::jsonb),
    'puede_corregir', (t.rol = 'admin' or o.hecho_por = t.id),
    'cambios', coalesce((select jsonb_agg(jsonb_build_object('cuando', l.cuando, 'quien', w.nombre, 'detalle', l.detalle) order by l.cuando desc)
                           from ot_log l left join trabajadores w on w.id = l.quien
                          where l.ot = o.id and l.accion = 'fecha'), '[]'::jsonb));
end
$function$;

-- Corrección de un registro (solo admin): quién lo hizo, qué se hizo (tipo), qué piezas se cambiaron o anular del todo.
-- Las piezas se corrigen con horno_corregir_material (el Almacén anula lo quitado). Anular = quitar todos los descuentos
-- y ocultar el registro (ot_log guarda el rastro). No cambia el estado, así que no dispara avisos ni consumos nuevos.
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
                        'cambio_centrador','cambio_con_estrella','cambio_con_fase','cambio_otra') then
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

-- Detalle ampliado: tipo, quién lo hizo y si el admin puede editarlo
create or replace function public.limpieza_detalle(p_tok uuid, p_ot uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare t trabajadores; o ots;
begin
  t := _yo(p_tok);
  select * into o from ots where id = p_ot and not borrado and elemento_id is not null;
  if not found then raise exception 'NO_EXISTE'; end if;
  return jsonb_build_object(
    'id', o.id,
    'fin', o.fin,
    'inicio', o.inicio,
    'accion', coalesce(o.accion_horno, 'limpieza'),
    'hecho_por', o.hecho_por,
    'quien', (select nombre from trabajadores where id = o.hecho_por),
    'resultado', o.resultado,
    'nota', o.nota,
    'checklist', coalesce(o.checklist, '{}'::jsonb),
    'puede_corregir', (t.rol = 'admin' or o.hecho_por = t.id),
    'puede_editar', (t.rol = 'admin'),
    'cambios', coalesce((select jsonb_agg(jsonb_build_object('cuando', l.cuando, 'quien', w.nombre, 'detalle', l.detalle) order by l.cuando desc)
                           from ot_log l left join trabajadores w on w.id = l.quien
                          where l.ot = o.id and l.accion in ('fecha', 'editado')), '[]'::jsonb));
end
$function$;
