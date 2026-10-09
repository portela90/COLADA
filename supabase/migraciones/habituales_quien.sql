-- Tareas habituales solo para algunas personas (solo_para vacío = todos). Ejecutado en limpieza-cie.
alter table tareas_habituales add column if not exists solo_para uuid[] not null default '{}';
-- habituales(): filtra por solo_para (el admin lo ve todo)
-- habitual_guardar(): guarda solo_para si viene en el JSON
