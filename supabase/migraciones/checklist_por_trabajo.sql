-- =====================================================================
-- CHECKLISTS POR TRABAJO — limpieza-cie
--   Cada grupo de puntos (enc_check_punto.grupo) puede salir:
--     donde='encargado' → en la checklist de fin de semana del encargado (como hasta ahora)
--     donde='trabajos'  → al terminar los trabajos que cumplan «aplica»
--   aplica = {"habituales":[uuid…], "codigos":"F*, M3-M11, robot", "excluir":"horno, derrame"}
--     habituales: tareas habituales a las que se adjunta
--     codigos: F* = cualquier F con número · M3-M11 = de la M3 a la M11 · F28 = solo esa ·
--              cualquier otra palabra = el nombre del trabajo la contiene
--     excluir: si el nombre del trabajo contiene alguna de estas palabras, no sale
--   Se guarda en cada punto (todos los del grupo llevan lo mismo) para que
--   cambiar el nombre del grupo no pierda la configuración.
-- =====================================================================
alter table public.enc_check_punto add column if not exists donde text not null default 'encargado';
alter table public.enc_check_punto add column if not exists aplica jsonb not null default '{}'::jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='enc_check_punto_donde_chk') then
    alter table public.enc_check_punto add constraint enc_check_punto_donde_chk check (donde in ('encargado','trabajos'));
  end if; end $$;

-- ¿Este trabajo cumple las reglas «aplica»? Mira solo el nombre (título) del trabajo.
create or replace function public._check_casa(a jsonb, o ots) returns boolean
language plpgsql stable set search_path to 'public' as $$
declare t text := lower(coalesce(o.titulo,'')); tok text; m text[]; lo int; hi int; n text;
begin
  if a is null or a='{}'::jsonb then return false; end if;
  foreach tok in array regexp_split_to_array(coalesce(a->>'excluir',''),'\s*,\s*') loop
    tok := lower(trim(tok)); if tok<>'' and position(tok in t)>0 then return false; end if;
  end loop;
  if o.habitual_id is not null and jsonb_typeof(a->'habituales')='array' and (a->'habituales') @> to_jsonb(o.habitual_id::text) then return true; end if;
  foreach tok in array regexp_split_to_array(coalesce(a->>'codigos',''),'\s*,\s*') loop
    tok := lower(trim(tok)); continue when tok='';
    m := regexp_match(tok,'^([a-zñ]+)-?\*$');                                   -- F*
    if m is not null then
      if t ~ ('(^|[^a-z0-9ñ])'||m[1]||'-?\d+([^0-9]|$)') then return true; end if; continue; end if;
    m := regexp_match(tok,'^([a-zñ]+)-?(\d+)\s*-\s*(?:[a-zñ]+)?-?(\d+)$');        -- M3-M11
    if m is not null then
      lo := least(m[2]::int,m[3]::int); hi := greatest(m[2]::int,m[3]::int);
      for n in select (regexp_matches(t,'(?:^|[^a-z0-9ñ])'||m[1]||'-?(\d+)(?=[^0-9]|$)','g'))[1] loop
        if n::int between lo and hi then return true; end if;
      end loop; continue; end if;
    m := regexp_match(tok,'^([a-zñ]+)-?(\d+)$');                                 -- F28
    if m is not null then
      for n in select (regexp_matches(t,'(?:^|[^a-z0-9ñ])'||m[1]||'-?(\d+)(?=[^0-9]|$)','g'))[1] loop
        if n::int = m[2]::int then return true; end if;
      end loop; continue; end if;
    if position(tok in t)>0 then return true; end if;                             -- palabra
  end loop;
  return false;
end $$;

-- Puntos que tocan al terminar un trabajo
create or replace function public.check_ot_puntos(p_tok uuid, p_ot uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; o ots;
begin t:=_yo(p_tok); select * into o from ots where id=p_ot; if not found or not _ve(t,o) then raise exception 'NO_PERMISO'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('grupo',grupo,'texto',texto,'tipo',tipo,'ayuda',ayuda,'minimo',minimo,'foto_si_mal',foto_si_mal) order by orden)
    from enc_check_punto where activo and donde='trabajos' and _check_casa(aplica,o)),'[]');
end $$;

-- Vista previa en Ajustes: a qué trabajos de los últimos 60 días se adjuntaría
create or replace function public.check_prueba(p_tok uuid, p_aplica jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _gestor(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('titulo',titulo,'n',n) order by n desc, titulo) from (
    select o.titulo, count(*) n from ots o where not o.borrado and o.fecha > _hoy()-60 and _check_casa(p_aplica,o)
    group by o.titulo order by count(*) desc, o.titulo limit 40) x),'[]');
end $$;

-- La checklist del encargado solo lleva los grupos «encargado»
create or replace function public.enc_check_ver(p_tok uuid, p_fecha date) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare c enc_check;
begin perform _gestor(p_tok);
  select * into c from enc_check where fecha=p_fecha;
  return jsonb_build_object('fecha',p_fecha,
    'puntos',coalesce((select jsonb_agg(jsonb_build_object('id',id,'grupo',grupo,'texto',texto,'tipo',tipo,'ayuda',ayuda,'minimo',minimo,'foto_si_mal',foto_si_mal) order by orden) from enc_check_punto where activo and donde='encargado'),'[]'),
    'check',case when c.id is null then null else to_jsonb(c)||jsonb_build_object('hecho_por_n',(select nombre from trabajadores where id=c.hecho_por)) end);
end $$;

-- Guardar puntos: ahora también dónde sale el grupo y a qué trabajos
create or replace function public.enc_puntos_guardar(p_tok uuid, p_items jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare i jsonb; n int := 0; ids uuid[] := '{}'; nid uuid; tp text; dn text; ap jsonb;
begin perform _admin(p_tok);
  for i in select * from jsonb_array_elements(coalesce(p_items,'[]')) loop
    n := n+1;
    if coalesce(trim(i->>'texto'),'')='' then continue; end if;
    tp := coalesce(nullif(i->>'tipo',''),'ok'); if tp not in ('ok','num','txt') then tp:='ok'; end if;
    dn := coalesce(nullif(i->>'donde',''),'encargado'); if dn not in ('encargado','trabajos') then dn:='encargado'; end if;
    ap := case when jsonb_typeof(i->'aplica')='object' then i->'aplica' else '{}'::jsonb end;
    if nullif(i->>'id','') is not null and exists(select 1 from enc_check_punto where id=(i->>'id')::uuid) then
      update enc_check_punto set grupo=coalesce(nullif(trim(i->>'grupo'),''),'General'), texto=trim(i->>'texto'), orden=n, activo=true,
        tipo=tp, ayuda=nullif(trim(i->>'ayuda'),''), minimo=case when tp='num' then nullif(i->>'minimo','')::numeric end, foto_si_mal=coalesce((i->>'foto_si_mal')::boolean,false),
        donde=dn, aplica=ap
      where id=(i->>'id')::uuid returning id into nid;
    else
      insert into enc_check_punto(grupo,texto,orden,tipo,ayuda,minimo,foto_si_mal,donde,aplica)
      values (coalesce(nullif(trim(i->>'grupo'),''),'General'), trim(i->>'texto'), n, tp, nullif(trim(i->>'ayuda'),''),
        case when tp='num' then nullif(i->>'minimo','')::numeric end, coalesce((i->>'foto_si_mal')::boolean,false), dn, ap) returning id into nid;
    end if;
    ids := ids || nid;
  end loop;
  update enc_check_punto set activo=false where not (id = any(ids));
  return enc_puntos(p_tok);
end $$;

grant execute on function public.check_ot_puntos(uuid, uuid) to anon, authenticated;
grant execute on function public.check_prueba(uuid, jsonb) to anon, authenticated;

-- «Inyectoras y zonas» pasa a salir solo al terminar cada inyectora
update public.enc_check_punto set donde='trabajos',
  aplica='{"habituales":[],"codigos":"F*","excluir":"horno, derrame, fuga, lubrific"}'::jsonb
where lower(grupo)='inyectoras y zonas' and donde='encargado' and aplica='{}'::jsonb;

-- check_inyectoras queda sin uso (sustituida por check_ot_puntos); se puede borrar más adelante.
