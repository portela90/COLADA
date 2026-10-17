-- =====================================================================
-- FOTOS EN SUPABASE STORAGE — limpieza-cie
--   Antes: cada foto se guardaba como texto (base64) dentro de la tabla
--   «fotos», y llenaba la base de datos (500 MB en el plan gratis).
--   Ahora: la foto va al almacén de archivos (bucket «fotos», 1 GB gratis
--   aparte) y en la tabla solo queda su ruta.
--
--   Cómo se sube una foto sin dar permisos de escritura a cualquiera:
--     1. La app pide permiso con foto_reservar(token, trabajo). Si puedes ver
--        ese trabajo, crea la fila con una ruta al azar (uuid.jpg) y subida=false.
--     2. La app sube el archivo a esa ruta. Storage solo lo acepta si esa ruta
--        está reservada y sin subir desde hace menos de 30 minutos.
--     3. La app confirma con foto_confirmar(token, id).
--   El bucket es público para LEER, pero las rutas son uuid al azar y solo
--   las dan las funciones que comprueban permisos: no se pueden adivinar ni listar.
--
--   Las fotos antiguas (base64) siguen funcionando. El jefe las pasa al
--   almacén con el botón «Mover fotos al almacén» (Más → Resumen → Copia).
--
-- CÓMO USARLO: Supabase → limpieza-cie → SQL Editor → New query → pega todo → Run.
-- Se puede ejecutar más de una vez.
-- =====================================================================

-- 1. Columnas nuevas
alter table public.fotos add column if not exists ruta text;
alter table public.fotos add column if not exists subida boolean not null default true;
create unique index if not exists fotos_ruta_uk on public.fotos(ruta) where ruta is not null;

-- 2. Bucket (público para leer, solo imágenes de hasta 1 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 1048576, array['image/jpeg','image/png'])
on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg','image/png'];

-- 3. ¿Esta ruta está reservada y pendiente de subir?
--    Fotos nuevas: reserva de menos de 30 minutos. Fotos antiguas que el jefe
--    está pasando al almacén: llevan aún su base64 (data), y valen sin límite.
create or replace function public._foto_reservada(p_name text) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists(select 1 from fotos where ruta = p_name and not subida
                and (creado > now() - interval '30 minutes' or data is not null));
$$;
grant execute on function public._foto_reservada(text) to anon, authenticated;

drop policy if exists "fotos: subir solo rutas reservadas" on storage.objects;
create policy "fotos: subir solo rutas reservadas" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'fotos' and public._foto_reservada(name));

-- 4. Dirección pública de una foto (o su base64 si es antigua)
create or replace function public._foto_src(f fotos) returns text
language sql stable set search_path to 'public' as $$
  select case when f.data is not null then f.data
              when f.subida and f.ruta is not null then 'https://uddejncrjcyyaxjocbpj.supabase.co/storage/v1/object/public/fotos/' || f.ruta end;
$$;
revoke execute on function public._foto_src(fotos) from public, anon, authenticated;

-- 5. Subida nueva: reservar y confirmar
create or replace function public.foto_reservar(p_tok uuid, p_ot uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; o ots; r text; nid uuid;
begin t := _yo(p_tok); select * into o from ots where id = p_ot; if not found or not _ve(t, o) then raise exception 'NO_PERMISO'; end if;
  r := gen_random_uuid()::text || '.jpg';
  insert into fotos(ot_id, data, por, ruta, subida) values (p_ot, null, t.id, r, false) returning id into nid;
  return jsonb_build_object('id', nid, 'ruta', r);
end $$;

create or replace function public.foto_confirmar(p_tok uuid, p_id uuid) returns integer
language plpgsql security definer set search_path to 'public', 'storage' as $$
declare t trabajadores; f fotos;
begin t := _yo(p_tok);
  select * into f from fotos where id = p_id and por = t.id and ruta is not null and not subida;
  if not found then raise exception 'NO_PERMISO'; end if;
  if not exists(select 1 from storage.objects where bucket_id = 'fotos' and name = f.ruta) then raise exception 'FOTO_NO_SUBIDA'; end if;
  update fotos set subida = true where id = p_id;
  return (select count(*) from fotos where ot_id = f.ot_id and (subida or data is not null));
end $$;

-- 6. Pasar las fotos antiguas al almacén (solo jefe)
create or replace function public.fotos_por_mover(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  return (select coalesce(jsonb_agg(id order by creado), '[]'::jsonb) from fotos where data is not null and (ruta is null or not subida));
end $$;

create or replace function public.foto_mover_reservar(p_tok uuid, p_id uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare f fotos; r text;
begin perform _admin(p_tok);
  select * into f from fotos where id = p_id and data is not null;
  if not found then raise exception 'NO_EXISTE'; end if;
  r := gen_random_uuid()::text || case when f.data like 'data:image/png%' then '.png' else '.jpg' end;
  update fotos set ruta = r, subida = false where id = p_id;
  return jsonb_build_object('ruta', r, 'data', f.data);
end $$;

create or replace function public.foto_mover_ok(p_tok uuid, p_id uuid) returns integer
language plpgsql security definer set search_path to 'public', 'storage' as $$
declare f fotos;
begin perform _admin(p_tok);
  select * into f from fotos where id = p_id and ruta is not null and not subida;
  if not found then return 0; end if;
  if not exists(select 1 from storage.objects where bucket_id = 'fotos' and name = f.ruta) then raise exception 'FOTO_NO_SUBIDA'; end if;
  update fotos set subida = true, data = null where id = p_id;
  return 1;
end $$;

-- 7. Lecturas: devuelven la dirección del almacén cuando la foto está allí
create or replace function public.fotos_ot(p_tok uuid, p_ot uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; o ots;
begin t := _yo(p_tok); select * into o from ots where id = p_ot; if not found or not _ve(t, o) then raise exception 'NO_PERMISO'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'data', _foto_src(f), 'creado', f.creado, 'liberada', f.liberada,
            'por', (select nombre from trabajadores where id = f.por)) order by f.creado), '[]'::jsonb)
          from fotos f where f.ot_id = p_ot and (f.subida or f.data is not null));
end $$;

create or replace function public.fotos_datos(p_tok uuid, p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  if coalesce(array_length(p_ids, 1), 0) > 20 then raise exception 'DEMASIADAS'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'data', _foto_src(f))), '[]'::jsonb)
          from fotos f where f.id = any(p_ids) and _foto_src(f) is not null);
end $$;

create or replace function public.fotos_lista(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  return (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'ot', f.ot_id, 'fecha', o.fecha, 'titulo', o.titulo, 'por', w.nombre,
            'creado', f.creado, 'bytes', length(f.data), 'almacen', f.data is null) order by o.fecha, f.creado), '[]'::jsonb)
          from fotos f join ots o on o.id = f.ot_id left join trabajadores w on w.id = f.por
          where f.data is not null or (f.ruta is not null and f.subida));
end $$;

create or replace function public.espacio(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public', 'storage' as $$
begin perform _admin(p_tok);
  return jsonb_build_object('total', pg_database_size(current_database()), 'limite', 500*1024*1024,
    'fotos', (select count(*) from fotos where data is not null),
    'fotos_bytes', (select coalesce(sum(length(data)), 0) from fotos where data is not null),
    'liberadas', (select count(*) from fotos where data is null and ruta is null),
    'almacen', (select count(*) from storage.objects where bucket_id = 'fotos'),
    'almacen_bytes', (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects where bucket_id = 'fotos'),
    'almacen_limite', 1024*1024*1024,
    'ots', (select count(*) from ots where not borrado));
end $$;

-- 8. Informe semanal: las fotos del almacén van aparte, en «fotos_url»
--    (la versión anterior de la función del informe las ignora sin fallar)
create or replace function public.informe_datos(p_desde date, p_hasta date) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin
  return jsonb_build_object(
    'ots', (select coalesce(jsonb_agg(_otjson(o) order by o.fecha, o.titulo), '[]'::jsonb)
            from ots o where o.fecha between p_desde and p_hasta and not o.borrado),
    'fotos', (select coalesce(jsonb_object_agg(g.ot_id::text, g.x), '{}'::jsonb) from (
              select f.ot_id, jsonb_agg(jsonb_build_object('data', f.data) order by f.creado) as x
              from fotos f join ots o on o.id = f.ot_id
              where o.fecha between p_desde and p_hasta and not o.borrado and f.data is not null
              group by f.ot_id) g),
    'fotos_url', (select coalesce(jsonb_object_agg(g.ot_id::text, g.x), '{}'::jsonb) from (
              select f.ot_id, jsonb_agg(jsonb_build_object('url', _foto_src(f)) order by f.creado) as x
              from fotos f join ots o on o.id = f.ot_id
              where o.fecha between p_desde and p_hasta and not o.borrado and f.data is null and f.ruta is not null and f.subida
              group by f.ot_id) g),
    'festivos', (select coalesce(jsonb_agg(fecha order by fecha), '[]'::jsonb) from festivos where activo),
    'trabajadores', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nombre', nombre, 'rol', rol, 'activo', activo,
                       'jornada', jornada, 'horas_contrato', horas_contrato, 'horario', horario)), '[]'::jsonb) from trabajadores),
    'horas', (select coalesce(jsonb_agg(jsonb_build_object('fecha', fecha, 'trabajador', trabajador, 'trabajadas', trabajadas,
                       'fuera', fuera, 'falta', falta, 'nota', nota, 'extra_mano', extra_mano)), '[]'::jsonb)
              from horas_dia where fecha between p_desde and p_hasta)
  );
end $$;

grant execute on function public.foto_reservar(uuid, uuid) to anon, authenticated;
grant execute on function public.foto_confirmar(uuid, uuid) to anon, authenticated;
grant execute on function public.fotos_por_mover(uuid) to anon, authenticated;
grant execute on function public.foto_mover_reservar(uuid, uuid) to anon, authenticated;
grant execute on function public.foto_mover_ok(uuid, uuid) to anon, authenticated;
