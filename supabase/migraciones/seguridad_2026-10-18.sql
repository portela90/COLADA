-- Revisión de seguridad 18/10/2026 (aplicado en Supabase)
-- colada-mapri: fotos de albaranes solo imágenes o PDF, máx. 20 MB
update storage.buckets set file_size_limit=20971520, allowed_mime_types=array['image/*','application/pdf'] where id='albaranes';
-- colada-mapri: la limpieza del historial es un disparador, no se llama desde fuera
revoke execute on function public.docs_hist_limpia() from public, anon, authenticated;
-- limpieza-cie: search_path fijo en funciones internas
-- alter function public._accion_horno_de(text) set search_path = public, extensions, pg_temp;
-- alter function public._dia(date) set search_path = public, extensions, pg_temp;
-- alter function public._es_horno(public.ots) set search_path = public, extensions, pg_temp;
-- alter function public._generar(date) set search_path = public, extensions, pg_temp;
-- alter function public._horario_ok(jsonb) set search_path = public, extensions, pg_temp;
-- alter function public._hoy() set search_path = public, extensions, pg_temp;
-- alter function public._titulo_horno(text) set search_path = public, extensions, pg_temp;
-- alter function public._tramos_dia(jsonb,text) set search_path = public, extensions, pg_temp;

-- 21/10/2026 · colada-mapri: borrar y modificar apuntes por id (sin leer y reescribir el documento entero)
-- docs_items_del_id(p_col,p_id,p_ids jsonb) y docs_items_patch_id(p_col,p_id,p_items jsonb): ver migración docs_items_por_id
