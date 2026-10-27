-- 27/10/2026 · Almacén general (colada-mapri): quitar un movimiento de consumo de limpieza/horno
-- (cuando la OT se corrige y ya no se gastó ese material). Aplicado en colada-mapri (whemhkcrgwyjucpaswrm).
-- alm_consumo_quitar(p_secreto, p_id): borra el ítem con ese id de alm_mov y devuelve cuántos quitó.
create or replace function public.alm_consumo_quitar(p_secreto text, p_id text)
returns integer language plpgsql security definer set search_path to ''
as $f$
declare n integer := 0;
begin
  if not exists (select 1 from public.secretos_int where k = 'consumo_limpieza' and v = p_secreto) then
    raise exception 'no autorizado';
  end if;
  update public.docs d
     set data = jsonb_set(d.data, '{items}', (select coalesce(jsonb_agg(x), '[]'::jsonb)
                                              from jsonb_array_elements(d.data->'items') x
                                              where x->>'id' <> p_id))
   where d.col = 'alm_mov'
     and exists (select 1 from jsonb_array_elements(coalesce(d.data->'items', '[]'::jsonb)) x where x->>'id' = p_id);
  get diagnostics n = row_count;
  return n;
end $f$;
