-- Limpieza (limpieza-cie) · Investigar: ronda 3 de entrenamiento de «Pregúntale» (18/11/2026).
--
-- Qué hace:
--  1. El diccionario acepta un tipo nuevo, «grupo»: un nombre que junta trabajos por sus palabras.
--     «hornos» → los trabajos que tengan horno, escoria, bolones, desgasificadora o barreduras.
--  2. Lo enseñado en la ronda 3:
--     - Brother y Moriz es UNA zona (también cuando se escribe «Morriz» o «Brother 2»).
--     - Los hornos AlSi12 (fusión y mantenedor) se suman a la Nave 1.
--     - «Limpieza horno fusión Nave 1» va a su sitio, el Horno fusión Nave 1, que sigue aparte de la nave (ronda 2).
--     - Grupo «hornos»: escoria y limpieza de hornos juntos.
-- No borra nada. Se puede pegar dos veces.
--
-- Pegar ENTERO en el SQL Editor de limpieza-cie (uddejncrjcyyaxjocbpj) y pulsar Run.

begin;

do $$ begin
  if to_regclass('public.inv_dic') is null or to_regprocedure('public._admin(uuid)') is null then
    raise exception 'Esto va en el proyecto limpieza-cie (uddejncrjcyyaxjocbpj), después de investigar_entrenamiento.sql. No se ha cambiado nada.';
  end if;
end $$;

-- 1. el tipo «grupo» (se cambia la regla de los tipos permitidos)
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'public.inv_dic'::regclass and contype = 'c' loop
    execute format('alter table public.inv_dic drop constraint %I', c);
  end loop;
end $$;
alter table public.inv_dic add constraint inv_dic_tipo_check check (tipo in ('persona','lugar','problema','frase','favorita','grupo'));

create or replace function public.inv_dic_guardar(p_tok uuid, p jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare r inv_dic; v_pal text := lower(trim(coalesce(p->>'palabra','')));
begin perform _admin(p_tok);
  if v_pal = '' then raise exception 'FALTA_PALABRA'; end if;
  if (p->>'tipo') not in ('persona','lugar','problema','frase','favorita','grupo') then raise exception 'TIPO_MAL'; end if;
  if (p->>'tipo') <> 'favorita' and coalesce(trim(p->>'valor'),'') = '' then raise exception 'FALTA_VALOR'; end if;
  insert into inv_dic (tipo, palabra, valor, nota) values (p->>'tipo', v_pal, nullif(trim(p->>'valor'),''), nullif(trim(p->>'nota'),''))
  on conflict (tipo, palabra) do update set valor = excluded.valor, nota = excluded.nota
  returning * into r;
  return to_jsonb(r);
end $function$;

-- 2. ronda 3
insert into public.inv_dic (tipo, palabra, valor, nota) values
  ('lugar', 'brother y moriz', 'Brother y Moriz', 'Ronda 3: una sola zona'),
  ('lugar', 'moriz', 'Brother y Moriz', 'Ronda 3: una sola zona'),
  ('lugar', 'morriz', 'Brother y Moriz', 'Ronda 3: una sola zona (mal escrito)'),
  ('lugar', 'brother', 'Brother y Moriz', 'Ronda 3: una sola zona'),
  ('lugar', 'horno fusion alsi12', 'Horno fusión AlSi12 (Nave 1)', 'Ronda 3: se suma a la Nave 1'),
  ('lugar', 'horno mantenedor alsi12', 'Horno mantenedor AlSi12 (Nave 1)', 'Ronda 3: se suma a la Nave 1'),
  ('lugar', 'horno fusion nave 1', 'Horno fusión Nave 1', 'Ronda 2 y 3: sitio aparte de la Nave 1'),
  ('grupo', 'hornos', 'horno, escoria, bolon, desgasificadora, barredura', 'Ronda 3: escoria y limpieza de hornos juntos')
on conflict (tipo, palabra) do update set valor = excluded.valor, nota = excluded.nota;

commit;

-- Comprobación: tienen que salir 7 lugares y 1 grupo de la ronda 3
select tipo, palabra, valor from public.inv_dic where nota like 'Ronda%3%' order by tipo, palabra;
