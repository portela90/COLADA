-- Limpieza: problemas que se repiten (aplicada en limpieza-cie el 25/10/2026)
-- Cuando un trabajador abre una OT (origen 'rapida') de aceite, taladrina, agua, derrame/fuga o rotura con sitio,
-- y en ese mismo sitio ya hubo otra del mismo tipo en los últimos 7 días, se crea un «problema repetido»
-- y se avisa al móvil al jefe y al encargado (limpieza.html?prob=ID). Sigue abierto hasta marcarlo solucionado;
-- si vuelve a pasar en los 60 días siguientes a solucionarlo, se reabre («Ha vuelto a pasar»).
create table if not exists public.problemas_rep(
  id uuid primary key default gen_random_uuid(),
  tema text not null, lugar text not null, lugar_key text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','en_marcha','solucionado')),
  ots uuid[] not null default '{}', primera date, ultima date,
  reabierto int not null default 0, solucionado_en timestamptz,
  historial jsonb not null default '[]',
  creado timestamptz not null default now(), actualizado timestamptz not null default now(),
  unique(tema, lugar_key));
alter table public.problemas_rep enable row level security;   -- solo por las funciones rpc
create trigger ots_problema_rep after insert or update of lugar, titulo, descripcion on public.ots for each row execute function _problema_rep();
-- Funciones (ver la base de datos para el código completo):
--   _tema_problema(titulo, descripcion): Taladrina > Aceite > Agua > Derrames / fugas > Roturas / averías (o null)
--   _lugar_key(lugar): la máquina si la nombra (F19, M3…; «Nave F28» = F28), si no el texto sin espacios
--   _es_ot_problema(ots), _problema_rep() (disparador; nunca impide guardar la OT)
--   problemas_lista(p_tok, p_solucionados) y problema_estado(p_tok, p_id, p_estado, p_nota): jefe o encargado;
--     'en_marcha' y 'solucionado' piden nota (FALTA_NOTA) y avisan al otro.
