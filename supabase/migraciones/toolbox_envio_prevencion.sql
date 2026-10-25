-- Toolbox: envío a prevención al cerrar el mes (aplicada en limpieza-cie el 25/10/2026)
alter table prl_sesion add column if not exists prev_enviado_en timestamptz, add column if not exists prev_destino text, add column if not exists prev_error text;
-- prl_config_guardar acepta correo_prl (hasta 3 correos separados por coma; CORREO_MAL si no es válido) y correo_prl_nombre.
-- prl_envio_prep(p_tok, p_anio, p_mes): solo el responsable; devuelve destino, nombre, empresa, centro y quién envía. Solo service_role.
-- prl_envio_marcar(p_anio, p_mes, p_destino, p_error): deja la fecha del envío o el error en prl_sesion. Solo service_role.
-- Las usa la función supabase/functions-limpieza/envio-prevencion.
-- prl_envio_manual(p_tok, p_anio, p_mes, p_destino): «Ya lo he enviado» tras enviarlo uno mismo desde Outlook; apunta la fecha igual.
