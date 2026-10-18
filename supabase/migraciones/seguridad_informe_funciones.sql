-- =====================================================================
-- SEGURIDAD: informe semanal con clave secreta + cerrar funciones auxiliares
--   1. El informe semanal solo se lanza con una clave secreta que se genera
--      aquí, se guarda en la base de datos (tabla cerrada) y la mandan las dos
--      tareas programadas de los lunes. Con la clave pública ya no se puede lanzar.
--   2. Las funciones auxiliares (cálculos internos) dejan de poder llamarse
--      desde fuera; las siguen usando por dentro las funciones de la app.
--
-- ORDEN: ejecutar este script y, después, desplegar el código nuevo de
--        informe-semanal (archivo informe-semanal-index.ts). Antes del lunes 8:00.
-- =====================================================================

-- 1. Clave secreta del informe (solo se crea si no existe)
insert into public.app_config(k, v)
select 'informe_secret', encode(extensions.gen_random_bytes(32), 'hex')
where not exists (select 1 from public.app_config where k = 'informe_secret');

-- Las dos tareas de los lunes mandan la clave en la cabecera x-informe-token
select cron.alter_job(jobid, command := $c$select net.http_post(url := 'https://uddejncrjcyyaxjocbpj.supabase.co/functions/v1/informe-semanal', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZGVqbmNyamN5eWF4am9jYnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMTUxNjMsImV4cCI6MjEwNjc5MTE2M30.zIkZGk0FDmf0HHVZX9gAHIVPjsktFkDhxK1v1nrVngo','x-informe-token',(select v from public.app_config where k = 'informe_secret')), body := '{"limiteMB":8}'::jsonb, timeout_milliseconds := 120000)$c$)
from cron.job where jobname in ('informe-semanal-6utc', 'informe-semanal-7utc');

-- 2. Funciones auxiliares: fuera del alcance de la clave pública
revoke execute on function public._accion_horno_de(text)            from public, anon, authenticated;
revoke execute on function public._carga(uuid, date)                from public, anon, authenticated;
revoke execute on function public._check_casa(jsonb, ots)           from public, anon, authenticated;
revoke execute on function public._disponible(trabajadores, date)   from public, anon, authenticated;
revoke execute on function public._es_horno(ots)                    from public, anon, authenticated;
revoke execute on function public._horario_ok(jsonb)                from public, anon, authenticated;
revoke execute on function public._horno_de(text, text)             from public, anon, authenticated;
revoke execute on function public._nave_de(text, text)              from public, anon, authenticated;
revoke execute on function public._titulo_horno(text)               from public, anon, authenticated;
revoke execute on function public._tramos_dia(jsonb, text)          from public, anon, authenticated;
revoke execute on function public._ult_vaciado(elementos)           from public, anon, authenticated;
