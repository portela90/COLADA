-- =====================================================================
-- PEDIR PERMISO PARA QUEDARSE MÁS TIEMPO — limpieza-cie
--   1. El trabajador pulsa «⏱ Necesito quedarme» en un trabajo: dice cuánto
--      tiempo, por qué, y hace una FOTO obligatoria de cómo está. Le llega un
--      aviso al jefe con el trabajo, si es urgente o no, el motivo y la foto.
--   2. El jefe responde «Sí» o «No, mañana». Al trabajador le llega la
--      respuesta al móvil. Sin el sí, no se queda.
--   3. Si es sí, se apunta solo como hora extra del día (tabla extras),
--      con el trabajo y el motivo.
--
-- CÓMO USARLO: Supabase → limpieza-cie → SQL Editor → New query → pega todo → Run.
-- Se puede ejecutar más de una vez.
-- =====================================================================

create table if not exists public.pet_extra (
  id uuid primary key default gen_random_uuid(),
  ot_id uuid not null references public.ots(id),
  trabajador uuid not null references public.trabajadores(id),
  fecha date not null default (now() at time zone 'Europe/Madrid')::date,
  minutos int not null check (minutos between 10 and 480),
  motivo text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','si','no','anulada')),
  respuesta text,
  respondido timestamptz,
  respondido_por uuid references public.trabajadores(id),
  extra_id uuid,
  foto uuid references public.fotos(id),
  creado timestamptz not null default now()
);
alter table public.pet_extra add column if not exists foto uuid references public.fotos(id);
alter table public.pet_extra enable row level security;
create index if not exists pet_extra_fecha on public.pet_extra(fecha);

create or replace function public._pet_json(p pet_extra) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select to_jsonb(p) || jsonb_build_object(
    'nombre', (select nombre from trabajadores where id = p.trabajador),
    'titulo', o.titulo, 'lugar', o.lugar, 'urgente', o.prioridad = 'alta', 'estado_ot', o.estado,
    'respondido_por_n', (select nombre from trabajadores where id = p.respondido_por),
    'foto_url', (select _foto_src(f) from fotos f where f.id = p.foto))
  from ots o where o.id = p.ot_id;
$$;
revoke execute on function public._pet_json(pet_extra) from public, anon, authenticated;

-- El trabajador pide quedarse (con foto obligatoria del trabajo, ya subida con foto_reservar)
drop function if exists public.extra_pedir(uuid, uuid, int, text);
create or replace function public.extra_pedir(p_tok uuid, p_ot uuid, p_minutos int, p_motivo text, p_foto uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; o ots; p pet_extra; h text;
begin t := _yo(p_tok);
  select * into o from ots where id = p_ot and not borrado; if not found or not _ve(t, o) then raise exception 'NO_PERMISO'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'FALTA_MOTIVO'; end if;
  if p_minutos is null or p_minutos < 10 or p_minutos > 480 then raise exception 'TIEMPO_MAL'; end if;
  if exists(select 1 from pet_extra where ot_id = p_ot and trabajador = t.id and estado = 'pendiente') then raise exception 'YA_PEDIDO'; end if;
  if p_foto is null or not exists(select 1 from fotos where id = p_foto and ot_id = p_ot and (subida or data is not null)) then raise exception 'FALTA_FOTO'; end if;
  insert into pet_extra(ot_id, trabajador, minutos, motivo, foto) values (p_ot, t.id, p_minutos, trim(p_motivo), p_foto) returning * into p;
  h := case when p_minutos < 60 then p_minutos || ' min' else trim(to_char(p_minutos / 60.0, 'FM990.0')) || ' h' end;
  if cardinality(_admins()) > 0 then
    perform _avisar(jsonb_build_object('mensajes', jsonb_build_array(jsonb_build_object(
      'trabajadores', _admins(), 'urgente', true, 'tag', 'pet-' || p.id,
      'titulo', '⏱ ' || split_part(t.nombre, ' ', 1) || ' pide quedarse +' || h,
      'texto', o.titulo || case when o.prioridad = 'alta' then ' · URGENTE' else ' · no urgente' end || ' — ' || p.motivo || ' 📷 Toca para ver la foto',
      'url', 'limpieza.html?pet=' || p.id))));
  end if;
  return _pet_json(p);
end $$;

-- El trabajador anula su petición (por ejemplo, si al final le dio tiempo)
create or replace function public.extra_anular(p_tok uuid, p_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores;
begin t := _yo(p_tok);
  update pet_extra set estado = 'anulada' where id = p_id and trabajador = t.id and estado = 'pendiente';
end $$;

-- El jefe responde
create or replace function public.extra_responder(p_tok uuid, p_id uuid, p_si boolean, p_nota text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; p pet_extra; o ots; w trabajadores; eid uuid; h text;
begin t := _admin(p_tok);
  select * into p from pet_extra where id = p_id; if not found then raise exception 'NO_EXISTE'; end if;
  if p.estado <> 'pendiente' then raise exception 'YA_RESPONDIDA'; end if;
  select * into o from ots where id = p.ot_id; select * into w from trabajadores where id = p.trabajador;
  if p_si then
    insert into extras(fecha, trabajador, equipo, horas, nota)
    values (p.fecha, p.trabajador, coalesce(o.equipo, w.equipos[1]), round(p.minutos / 60.0, 2), 'Aprobado: ' || o.titulo || ' — ' || p.motivo)
    returning id into eid;
  end if;
  update pet_extra set estado = case when p_si then 'si' else 'no' end, respuesta = nullif(trim(p_nota), ''),
    respondido = now(), respondido_por = t.id, extra_id = eid where id = p_id returning * into p;
  h := case when p.minutos < 60 then p.minutos || ' min' else trim(to_char(p.minutos / 60.0, 'FM990.0')) || ' h' end;
  perform _avisar(jsonb_build_object('mensajes', jsonb_build_array(jsonb_build_object(
    'trabajadores', array[p.trabajador], 'urgente', true, 'tag', 'pet-' || p.id,
    'titulo', case when p_si then '✔ Puedes quedarte ' || h else '✖ No hace falta quedarse' end,
    'texto', o.titulo || case when p_si then '' else ' · Déjalo para mañana' end || coalesce(' — ' || p.respuesta, ''),
    'url', 'limpieza.html'))));
  return _pet_json(p);
end $$;

-- Lista: el jefe ve las de hoy (pendientes primero); cada trabajador, las suyas de hoy
create or replace function public.extra_lista(p_tok uuid, p_fecha date) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores;
begin t := _yo(p_tok);
  return coalesce((select jsonb_agg(_pet_json(p) order by (p.estado = 'pendiente') desc, p.creado desc)
    from pet_extra p where p.fecha = coalesce(p_fecha, _hoy()) and p.estado <> 'anulada'
      and (t.rol = 'admin' or p.trabajador = t.id)), '[]'::jsonb);
end $$;

-- Una petición concreta (para abrirla desde el aviso)
create or replace function public.extra_ver(p_tok uuid, p_id uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; p pet_extra;
begin t := _yo(p_tok);
  select * into p from pet_extra where id = p_id; if not found then raise exception 'NO_EXISTE'; end if;
  if t.rol <> 'admin' and p.trabajador <> t.id then raise exception 'NO_PERMISO'; end if;
  return _pet_json(p);
end $$;

grant execute on function public.extra_pedir(uuid, uuid, int, text, uuid) to anon, authenticated;
grant execute on function public.extra_anular(uuid, uuid) to anon, authenticated;
grant execute on function public.extra_responder(uuid, uuid, boolean, text) to anon, authenticated;
grant execute on function public.extra_lista(uuid, date) to anon, authenticated;
grant execute on function public.extra_ver(uuid, uuid) to anon, authenticated;
