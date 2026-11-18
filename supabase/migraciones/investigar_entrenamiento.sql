-- Limpieza (limpieza-cie) · Investigar: lo que Cristian le enseña al buscador «Pregúntale».
--
-- Qué crea:
--  1. inv_dic: el diccionario de la app. Cada fila dice «cuando escriba X, quiero decir Y»:
--       persona  → «cristian» es «Cristian Briceño»
--       lugar    → el lugar apuntado «punto de consumo junto a m3» se llama «Punto de consumo M3»
--       problema → «pringue» es aceite (aceite, taladrina, agua, desborde, resbala, rotura)
--       frase    → cambia unas palabras por otras antes de entender la pregunta
--       favorita → una pregunta guardada como botón
--  2. inv_preg: las preguntas hechas y si sirvieron («No es lo que quería» + qué quería saber), para revisarlas y
--     enseñarle a la app lo que no entiende.
--  3. Funciones para leerlas y guardarlas (solo el jefe). Nadie más puede leer ni tocar estas tablas.
--  4. Lo enseñado en la ronda 1 (18/11/2026).
-- No cambia nada de lo que ya hay. Se puede pegar dos veces.
--
-- Pegar ENTERO en el SQL Editor de limpieza-cie (uddejncrjcyyaxjocbpj) y pulsar Run.

begin;

do $$ begin
  if to_regclass('public.ots') is null or to_regprocedure('public._admin(uuid)') is null then
    raise exception 'Esto va en el proyecto limpieza-cie (uddejncrjcyyaxjocbpj). No se ha cambiado nada.';
  end if;
end $$;

create table if not exists public.inv_dic (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('persona','lugar','problema','frase','favorita')),
  palabra text not null,
  valor text,
  nota text,
  creado timestamptz not null default now(),
  unique (tipo, palabra)
);
create table if not exists public.inv_preg (
  id uuid primary key default gen_random_uuid(),
  q text not null,
  entendido jsonb,
  respuesta text,
  ok boolean,
  queria text,
  revisada boolean not null default false,
  creado timestamptz not null default now()
);
alter table public.inv_dic enable row level security;
alter table public.inv_preg enable row level security;
revoke all on public.inv_dic, public.inv_preg from anon, authenticated;

create or replace function public.inv_dic_listar(p_tok uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
begin perform _admin(p_tok);
  return (select coalesce(jsonb_agg(to_jsonb(d) order by d.tipo, d.palabra), '[]'::jsonb) from inv_dic d);
end $function$;

create or replace function public.inv_dic_guardar(p_tok uuid, p jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare r inv_dic; v_pal text := lower(trim(coalesce(p->>'palabra','')));
begin perform _admin(p_tok);
  if v_pal = '' then raise exception 'FALTA_PALABRA'; end if;
  if (p->>'tipo') not in ('persona','lugar','problema','frase','favorita') then raise exception 'TIPO_MAL'; end if;
  if (p->>'tipo') <> 'favorita' and coalesce(trim(p->>'valor'),'') = '' then raise exception 'FALTA_VALOR'; end if;
  insert into inv_dic (tipo, palabra, valor, nota) values (p->>'tipo', v_pal, nullif(trim(p->>'valor'),''), nullif(trim(p->>'nota'),''))
  on conflict (tipo, palabra) do update set valor = excluded.valor, nota = excluded.nota
  returning * into r;
  return to_jsonb(r);
end $function$;

create or replace function public.inv_dic_borrar(p_tok uuid, p_id uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin perform _admin(p_tok); delete from inv_dic where id = p_id; end $function$;

create or replace function public.inv_preg_guardar(p_tok uuid, p jsonb)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare v_id uuid;
begin perform _admin(p_tok);
  if p ? 'id' and p->>'id' is not null then
    update inv_preg set ok = (p->>'ok')::boolean, queria = coalesce(nullif(trim(p->>'queria'),''), queria) where id = (p->>'id')::uuid returning id into v_id;
    return v_id;
  end if;
  insert into inv_preg (q, entendido, respuesta, ok) values (left(p->>'q', 500), p->'entendido', left(p->>'respuesta', 1000), (p->>'ok')::boolean) returning id into v_id;
  return v_id;
end $function$;

create or replace function public.inv_preg_listar(p_tok uuid, p_solo_mal boolean default true)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
begin perform _admin(p_tok);
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.creado desc), '[]'::jsonb)
            from (select * from inv_preg where not p_solo_mal or ok is false order by creado desc limit 200) x);
end $function$;

revoke all on function public.inv_dic_listar(uuid), public.inv_dic_guardar(uuid, jsonb), public.inv_dic_borrar(uuid, uuid),
  public.inv_preg_guardar(uuid, jsonb), public.inv_preg_listar(uuid, boolean) from public;
grant execute on function public.inv_dic_listar(uuid), public.inv_dic_guardar(uuid, jsonb), public.inv_dic_borrar(uuid, uuid),
  public.inv_preg_guardar(uuid, jsonb), public.inv_preg_listar(uuid, boolean) to anon, authenticated;

-- Ronda 1 de entrenamiento (18/11/2026)
insert into public.inv_dic (tipo, palabra, valor, nota) values
  ('persona', 'cristian', 'Cristian Briceño', 'Ronda 1: «Cristian» sin apellido es el operario'),
  ('lugar', 'punto de consumo junto a m3', 'Punto de consumo M3', 'Ronda 1: sitio propio, aparte de la M3'),
  ('lugar', 'punto de consumo junto a m10', 'Punto de consumo M10', 'Ronda 1: sitio propio, aparte de la M10')
on conflict (tipo, palabra) do nothing;

commit;

-- Comprobación: tienen que salir las 3 cosas enseñadas en la ronda 1
select tipo, palabra, valor from public.inv_dic order by tipo, palabra;
