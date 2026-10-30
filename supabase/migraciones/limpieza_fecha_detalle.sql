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
