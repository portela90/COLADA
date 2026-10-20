-- Responsable de hornos (limpieza-cie): solo ve los trabajos de su operario (Juan José Guerrero)
-- y puede abrir OT de hornos asignándoselas a él. Aplicado a mano en el SQL editor.
create table if not exists public.limp_resp_hornos (trabajador uuid primary key references public.trabajadores(id), ve uuid not null references public.trabajadores(id), creado timestamptz not null default now());
alter table public.limp_resp_hornos enable row level security;
create or replace function public._es_resp_hornos(t public.trabajadores) returns boolean language sql stable security definer set search_path to 'public' as $$ select exists(select 1 from limp_resp_hornos r where r.trabajador=t.id) $$;
revoke all on function public._es_resp_hornos(public.trabajadores) from public, anon, authenticated;
insert into public.limp_resp_hornos(trabajador, ve) values ('b169322b-fee1-4475-b2cb-cee2581b6961','6661e57e-a053-41c2-8c3c-65bc712c6c4d') on conflict do nothing;
create or replace function public.resp_hornos_yo(p_tok uuid) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; begin t:=_yo(p_tok);
  return coalesce((select jsonb_build_object('ve_id',r.ve,'ve_nombre',w.nombre) from limp_resp_hornos r join trabajadores w on w.id=r.ve where r.trabajador=t.id),'null'::jsonb); end $$;
grant execute on function public.resp_hornos_yo(uuid) to anon, authenticated;
-- _ve: un responsable de hornos no ve por ser encargado; solo las OT asignadas a su operario
-- _ve: (cambio aplicado con replace sobre la definición existente)
--   t.rol='admin' or _es_enc(t) or  ->  t.rol='admin' or (_es_enc(t) and not _es_resp_hornos(t)) or
--   (_es_resp_hornos(t) and exists(select 1 from limp_resp_hornos r where r.trabajador=t.id and r.ve=any(o.asignados))) or
-- ot_abrir: el responsable de hornos puede asignar solo en OT de hornos y solo a su operario.
--   elsif t.rol='admin' and not hecha ... -> elsif (t.rol='admin' or (el.id is not null and _es_resp_hornos(t))) and not hecha ...
--   from jsonb_array_elements_text(p->'asignados') x; -> ... x where t.rol='admin' or x::uuid=(select ve from limp_resp_hornos where trabajador=t.id);
-- Pendiente a mano: quitarlo de encargados para que no tenga permisos de encargado:
--   delete from limp_encargados where trabajador='b169322b-fee1-4475-b2cb-cee2581b6961';
