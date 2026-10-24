-- Usuarios de solo consulta (aplicado en colada-mapri el 24/10/2026).
-- Ven el Almacén (colecciones alm_*) pero no pueden cambiar nada, ni ver Coladas, el historial de Coladas o el registro de errores.
alter table public.usuarios add column if not exists consulta boolean not null default false;
create or replace function public.es_editor() returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.usuarios u where u.user_id = auth.uid() and u.activo and not u.consulta) $$;
create or replace function public.puede_ver(p_col text) returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.usuarios u where u.user_id = auth.uid() and u.activo and (not u.consulta or p_col like 'alm\_%')) $$;
alter policy docs_select_auth on public.docs using (public.puede_ver(col));
alter policy docs_insert_auth on public.docs with check (public.es_editor());
alter policy docs_update_auth on public.docs using (public.es_editor()) with check (public.es_editor());
alter policy docs_delete_auth on public.docs using (public.es_editor());
alter policy hist_select_auth on public.docs_hist using (public.puede_ver(col));
alter policy fotos_select_auth on public.fotos using (public.es_editor());
alter policy alb_write_auth on storage.objects with check (bucket_id = 'albaranes' and public.es_editor());
alter policy alb_update on storage.objects using (bucket_id = 'albaranes' and public.es_editor());
alter table public.usuarios add constraint usuarios_admin_no_consulta check (not (admin and consulta));
-- errores_listar y errores_visto: ahora piden es_editor() en lugar de es_usuario().
