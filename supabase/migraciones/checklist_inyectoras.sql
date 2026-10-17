-- =====================================================================
-- CHECKLIST AL TERMINAR LA LIMPIEZA DE UNA INYECTORA — limpieza-cie
--   Los puntos son los del apartado «Inyectoras y zonas» de la checklist
--   del encargado (enc_check_punto). Así, si el jefe cambia esos puntos,
--   cambian también al terminar cada inyectora.
--   Lo puede leer cualquier trabajador con sesión (no solo el encargado).
-- =====================================================================
create or replace function public.check_inyectoras(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _yo(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('texto',texto,'ayuda',ayuda) order by orden)
    from enc_check_punto where activo and tipo='ok' and lower(grupo)='inyectoras y zonas'),'[]');
end $$;
grant execute on function public.check_inyectoras(uuid) to anon, authenticated;
