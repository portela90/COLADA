-- Pausar una OT en curso (urgencias). Ejecutado en limpieza-cie.
alter table ots add column if not exists pausa_desde timestamptz, add column if not exists pausado_min integer not null default 0;
-- _otjson: minutos = (fin - inicio) menos el tiempo pausado
-- estado_ot: al volver a pendiente borra pausas; al terminar/no hacer suma la pausa en curso
-- terminar_ot: pone pausado_min=0 y pausa_desde=null (el tiempo lo indica el trabajador)
-- ot_pausa(p_tok, p_ot, p_pausar): pausa o reanuda (solo si está en curso)
