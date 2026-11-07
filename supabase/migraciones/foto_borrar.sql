-- =====================================================================
-- Borrar una foto subida por error (limpieza, proyecto limpieza-cie).
-- Solo admin y encargado. Se quita del trabajo y queda en el historial (ot_log).
-- El archivo en Storage no se puede borrar desde SQL (trigger protect_objects_delete):
-- se queda en el bucket sin que ninguna pantalla lo muestre.
-- Idempotente.
-- =====================================================================
create or replace function public.foto_borrar(p_tok uuid, p_id uuid) returns integer
language plpgsql security definer set search_path to 'public' as $function$
declare t trabajadores; f fotos; quien text;
begin t := _yo(p_tok);
  if not (t.rol = 'admin' or _es_enc(t)) then raise exception 'NO_PERMISO'; end if;
  select * into f from fotos where id = p_id;
  if not found then raise exception 'NO_EXISTE'; end if;
  select nombre into quien from trabajadores where id = f.por;
  delete from fotos where id = p_id;
  insert into ot_log(ot, quien, accion, detalle)
    values (f.ot_id, t.id, 'foto', 'foto borrada' || coalesce(' (subida por ' || quien || ')', ''));
  return (select count(*) from fotos where ot_id = f.ot_id and (subida or data is not null));
end $function$;
