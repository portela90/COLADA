-- colada-mapri (31/10/2026): acceso por app. Cada usuario tiene «coladas» (sí/no) además de activo/consulta/admin.
--   Todo:                 activo, no consulta, coladas      → ve y cambia Coladas y Almacén
--   Solo Almacén:         activo, no consulta, coladas=false → ve y apunta en el Almacén; Coladas no lo ve ni lo cambia
--   Solo consulta:        activo, consulta                   → ve el Almacén sin cambiar nada
alter table public.usuarios add column if not exists coladas boolean not null default true;
create or replace function public.puede_ver(p_col text) returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.usuarios u where u.user_id = auth.uid() and u.activo
    and (p_col like 'alm\_%' or (not u.consulta and u.coladas))) $$;
create or replace function public.puede_editar(p_col text) returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.usuarios u where u.user_id = auth.uid() and u.activo and not u.consulta
    and (p_col like 'alm\_%' or u.coladas)) $$;
alter policy docs_insert_auth on public.docs with check (public.puede_editar(col));
alter policy docs_update_auth on public.docs using (public.puede_editar(col)) with check (public.puede_editar(col));
alter policy docs_delete_auth on public.docs using (public.puede_editar(col));
-- Bea (barrizabalaga@…) pasa a «Solo Almacén» (coladas=false).
