-- colada-mapri: el buscador aprende (aplicada el 29/10/2026)
create table if not exists public.consultas_log(
  id bigint generated always as identity primary key,
  app text not null check (app in ('coladas','almacen')),
  q text not null check (length(q) between 1 and 300),
  modo text, entendida boolean not null default true, ignoradas text[] not null default '{}',
  util smallint check (util in (-1,1)), usuario uuid not null default auth.uid(), creado timestamptz not null default now());
alter table public.consultas_log enable row level security;
create policy consultas_log_ins on public.consultas_log for insert to authenticated with check (usuario=auth.uid() and public.puede_ver(case when app='almacen' then 'alm_x' else 'x' end));
create policy consultas_log_sel on public.consultas_log for select to authenticated using (usuario=auth.uid() or public.es_admin());
create policy consultas_log_upd on public.consultas_log for update to authenticated using (usuario=auth.uid()) with check (usuario=auth.uid());
create index if not exists consultas_log_u on public.consultas_log(usuario, creado desc);
create table if not exists public.sinonimos(
  app text not null check (app in ('coladas','almacen')), palabra text not null check (length(palabra) between 1 and 40),
  significa text not null check (length(significa) between 1 and 80), por uuid default auth.uid(), creado timestamptz not null default now(),
  primary key (app, palabra));
alter table public.sinonimos enable row level security;
create policy sinonimos_sel on public.sinonimos for select to authenticated using (public.puede_ver(case when app='almacen' then 'alm_x' else 'x' end));
create policy sinonimos_ins on public.sinonimos for insert to authenticated with check (public.es_editor());
create policy sinonimos_upd on public.sinonimos for update to authenticated using (public.es_editor()) with check (public.es_editor());
create policy sinonimos_del on public.sinonimos for delete to authenticated using (public.es_editor());
grant select, insert, update on public.consultas_log to authenticated;
grant select, insert, update, delete on public.sinonimos to authenticated;
