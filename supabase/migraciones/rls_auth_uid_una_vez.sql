-- 2026-11-01 · colada-mapri: auth.uid() se calcula una vez por consulta, no por fila (aviso de rendimiento de Supabase).
alter policy usuarios_ver on public.usuarios using ((user_id = (select auth.uid())) or public.es_admin());
alter policy consultas_log_ins on public.consultas_log with check ((usuario = (select auth.uid())) and public.puede_ver(case when app = 'almacen' then 'alm_x' else 'x' end));
alter policy consultas_log_sel on public.consultas_log using ((usuario = (select auth.uid())) or public.es_admin());
alter policy consultas_log_upd on public.consultas_log using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));
