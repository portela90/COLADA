-- =====================================================================
-- FOTOS PRIVADAS — limpieza-cie
--   El almacén de fotos deja de ser público. Para ver una foto, la app pide
--   a la base de datos la lista de fotos de un trabajo (solo si puedes verlo),
--   y con eso obtiene un enlace firmado que CADUCA en 1 hora.
--   Un enlace copiado o reenviado deja de funcionar al rato.
--
--   Cómo funciona por dentro:
--     · fotos_ot / fotos_datos / extra_lista / extra_ver devuelven la ruta de
--       cada foto y dejan un «permiso de firma» de 10 minutos (foto_permiso).
--     · Storage solo deja firmar una ruta con permiso vigente.
--     · El informe semanal lee las fotos con la clave de servicio.
--
-- ORDEN: 1) aceptar el PR de la app; 2) ejecutar este script en el SQL Editor;
--        3) actualizar el informe semanal (una línea).
-- =====================================================================

create table if not exists public.foto_permiso (
  ruta text not null,
  hasta timestamptz not null default now() + interval '10 minutes'
);
create index if not exists foto_permiso_ruta on public.foto_permiso(ruta);
alter table public.foto_permiso enable row level security;

create or replace function public._fotos_permitir(p_rutas text[]) returns void
language sql security definer set search_path to 'public' as $$
  delete from foto_permiso where hasta < now() - interval '1 hour';
  insert into foto_permiso(ruta) select r from unnest(p_rutas) r where r is not null;
$$;
revoke execute on function public._fotos_permitir(text[]) from public, anon, authenticated;

create or replace function public._foto_visible(p_name text) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists(select 1 from foto_permiso where ruta = p_name and hasta > now());
$$;
grant execute on function public._foto_visible(text) to anon, authenticated;

drop policy if exists "fotos: leer con permiso" on storage.objects;
create policy "fotos: leer con permiso" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'fotos' and public._foto_visible(name));

-- Dirección para el informe semanal (se lee con la clave de servicio)
create or replace function public._foto_src(f fotos) returns text
language sql stable set search_path to 'public' as $$
  select case when f.data is not null then f.data
              when f.subida and f.ruta is not null then 'https://uddejncrjcyyaxjocbpj.supabase.co/storage/v1/object/authenticated/fotos/' || f.ruta end;
$$;
revoke execute on function public._foto_src(fotos) from public, anon, authenticated;

-- Fotos de un trabajo: base64 (antiguas) o ruta (almacén) + permiso de firma
create or replace function public.fotos_ot(p_tok uuid, p_ot uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; o ots;
begin t := _yo(p_tok); select * into o from ots where id = p_ot; if not found or not _ve(t, o) then raise exception 'NO_PERMISO'; end if;
  perform _fotos_permitir(array(select ruta from fotos where ot_id = p_ot and subida and ruta is not null and data is null));
  return (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'data', f.data, 'ruta', case when f.data is null then f.ruta end,
            'creado', f.creado, 'liberada', f.liberada, 'por', (select nombre from trabajadores where id = f.por)) order by f.creado), '[]'::jsonb)
          from fotos f where f.ot_id = p_ot and (f.subida or f.data is not null));
end $$;

create or replace function public.fotos_datos(p_tok uuid, p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  if coalesce(array_length(p_ids, 1), 0) > 20 then raise exception 'DEMASIADAS'; end if;
  perform _fotos_permitir(array(select ruta from fotos where id = any(p_ids) and subida and ruta is not null and data is null));
  return (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'data', f.data, 'ruta', case when f.data is null then f.ruta end)), '[]'::jsonb)
          from fotos f where f.id = any(p_ids) and (f.data is not null or (f.subida and f.ruta is not null)));
end $$;

-- Peticiones para quedarse: la foto va como ruta
create or replace function public._pet_json(p pet_extra) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select to_jsonb(p) || jsonb_build_object(
    'nombre', (select nombre from trabajadores where id = p.trabajador),
    'titulo', o.titulo, 'lugar', o.lugar, 'urgente', o.prioridad = 'alta', 'estado_ot', o.estado,
    'respondido_por_n', (select nombre from trabajadores where id = p.respondido_por),
    'foto_url', (select f.data from fotos f where f.id = p.foto),
    'foto_ruta', (select f.ruta from fotos f where f.id = p.foto and f.data is null and f.subida))
  from ots o where o.id = p.ot_id;
$$;
revoke execute on function public._pet_json(pet_extra) from public, anon, authenticated;

create or replace function public.extra_lista(p_tok uuid, p_fecha date) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores;
begin t := _yo(p_tok);
  perform _fotos_permitir(array(select f.ruta from pet_extra p join fotos f on f.id = p.foto
    where p.fecha = coalesce(p_fecha, _hoy()) and p.estado <> 'anulada' and (t.rol = 'admin' or p.trabajador = t.id)));
  return coalesce((select jsonb_agg(_pet_json(p) order by (p.estado = 'pendiente') desc, p.creado desc)
    from pet_extra p where p.fecha = coalesce(p_fecha, _hoy()) and p.estado <> 'anulada'
      and (t.rol = 'admin' or p.trabajador = t.id)), '[]'::jsonb);
end $$;

create or replace function public.extra_ver(p_tok uuid, p_id uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; p pet_extra;
begin t := _yo(p_tok);
  select * into p from pet_extra where id = p_id; if not found then raise exception 'NO_EXISTE'; end if;
  if t.rol <> 'admin' and p.trabajador <> t.id then raise exception 'NO_PERMISO'; end if;
  perform _fotos_permitir(array(select ruta from fotos where id = p.foto));
  return _pet_json(p);
end $$;

-- Por último: el almacén deja de ser público
update storage.buckets set public = false where id = 'fotos';
