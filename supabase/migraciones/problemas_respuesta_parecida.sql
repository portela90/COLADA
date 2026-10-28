-- 27/10/2026 · Al abrir una OT de problema (aceite, taladrina, derrame, fuga, agua, rotura) o urgente,
-- si hubo otra parecida en el mismo sitio en los últimos 6 días (mismo tema o palabras del título), se pregunta
-- «¿Es la misma fuga o es otra cosa?» con las fotos de la anterior. Las fotos son obligatorias en ese caso.
-- Aplicado en limpieza-cie (uddejncrjcyyaxjocbpj).
--   · ots.repite_resp ('misma' | 'otra') y ots.repite_de (id de la OT anterior).
--   · ot_abrir guarda repite_resp / repite_de (p.repite_resp, p.repite_de).
--   · _problema_rep: una OT «otra» no se agrupa en un problema repetido (ni avisa), y no cuenta para los demás.
--   · ot_parecidas(p_tok, p_lugar, p_titulo, p_descripcion): hasta 3 OT parecidas de los últimos 6 días.
--   · ot_repite_cambiar(p_tok, p_ot, p_resp): solo admin o encargado; si pasa a «otra» la quita del problema repetido.

alter table public.ots add column if not exists repite_resp text check (repite_resp in ('misma','otra'));
alter table public.ots add column if not exists repite_de uuid;

do $m$
declare d text;
begin
  select pg_get_functiondef('public.ot_abrir(uuid,jsonb)'::regprocedure) into d;
  if position('repite_resp' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, 'tolva_tipo,juntas)', ''))/length('tolva_tipo,juntas)') <> 1 then raise exception 'ancla columnas ot_abrir'; end if;
  if (length(d) - length(replace(d, 'then tv end, jn) returning', '')))/length('then tv end, jn) returning') <> 1 then raise exception 'ancla values ot_abrir'; end if;
  d := replace(d, 'tolva_tipo,juntas)', 'tolva_tipo,juntas,repite_resp,repite_de)');
  d := replace(d, 'then tv end, jn) returning', 'then tv end, jn, case when p->>''repite_resp'' in (''misma'',''otra'') then p->>''repite_resp'' end, nullif(p->>''repite_de'','''')::uuid) returning');
  EXECUTE d;
end $m$;

do $m$
declare d text;
begin
  select pg_get_functiondef('public._problema_rep()'::regprocedure) into d;
  if position('new.repite_resp' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, 'if not _es_ot_problema(new) then return new; end if;', '')))/length('if not _es_ot_problema(new) then return new; end if;') <> 1 then raise exception 'ancla trigger 1'; end if;
  if (length(d) - length(replace(d, 'where _es_ot_problema(o) and _lugar_key(o.lugar)=v_k', '')))/length('where _es_ot_problema(o) and _lugar_key(o.lugar)=v_k') <> 1 then raise exception 'ancla trigger 2'; end if;
  d := replace(d, 'if not _es_ot_problema(new) then return new; end if;', 'if not _es_ot_problema(new) or new.repite_resp = ''otra'' then return new; end if;');
  d := replace(d, 'where _es_ot_problema(o) and _lugar_key(o.lugar)=v_k', 'where _es_ot_problema(o) and o.repite_resp is distinct from ''otra'' and _lugar_key(o.lugar)=v_k');
  EXECUTE d;
end $m$;

create or replace function public.ot_parecidas(p_tok uuid, p_lugar text, p_titulo text, p_descripcion text)
returns jsonb language plpgsql security definer set search_path to 'public'
as $f$
declare t trabajadores; v_tema text; v_k text; v_pal text[]; r jsonb;
begin
  t := _yo(p_tok);
  v_tema := _tema_problema(p_titulo, p_descripcion);
  v_k := _lugar_key(p_lugar);
  if v_k is null then return '[]'::jsonb; end if;
  v_pal := array(select w from regexp_split_to_table(translate(lower(coalesce(p_titulo,'')),'áéíóúüàèìòù','aeiouuaeiou'), '[^a-z]+') w where length(w) >= 5);
  select coalesce(jsonb_agg(x order by x->>'fecha' desc), '[]'::jsonb) into r from (
    select jsonb_build_object('id', o.id, 'fecha', o.fecha, 'titulo', o.titulo, 'lugar', o.lugar, 'repite_resp', o.repite_resp) x
      from ots o
     where not o.borrado and o.origen = 'rapida' and o.fecha between _hoy() - 6 and _hoy()
       and _lugar_key(o.lugar) = v_k and o.repite_resp is distinct from 'otra'
       and (coalesce(_tema_problema(o.titulo, o.descripcion), '~') = coalesce(v_tema, '~')
            and v_tema is not null
            or exists (select 1 from unnest(v_pal) w where translate(lower(o.titulo),'áéíóúüàèìòù','aeiouuaeiou') like '%' || w || '%'))
     order by o.fecha desc limit 3) s;
  return r;
end $f$;

create or replace function public.ot_repite_cambiar(p_tok uuid, p_ot uuid, p_resp text)
returns jsonb language plpgsql security definer set search_path to 'public'
as $f$
declare t trabajadores; o ots; p problemas_rep;
begin
  t := _yo(p_tok);
  if t.rol <> 'admin' and not _es_enc(t) then raise exception 'NO_ADMIN'; end if;
  select * into o from ots where id = p_ot and not borrado;
  if not found then raise exception 'NO_EXISTE'; end if;
  if p_resp not in ('misma','otra') then raise exception 'RESP_MAL'; end if;
  update ots set repite_resp = p_resp where id = p_ot;
  if p_resp = 'otra' then
    for p in select * from problemas_rep r where p_ot = any(r.ots) loop
      update problemas_rep set ots = array_remove(ots, p_ot), descartadas = array_append(descartadas, p_ot), actualizado = now(),
        historial = historial || jsonb_build_array(jsonb_build_object('f', now(), 'estado', 'quitado',
          'nota', 'Respuesta cambiada: es otra cosa ('||coalesce(o.titulo,'')||')', 'quien', t.nombre))
        where id = p.id;
      if cardinality((select r.ots from problemas_rep r where r.id = p.id)) < 2 then
        update problemas_rep set descartado = true,
          historial = historial || jsonb_build_array(jsonb_build_object('f', now(), 'estado', 'descartado', 'nota', 'Ya no se repite (queda un solo aviso)', 'quien', t.nombre))
          where id = p.id;
      end if;
    end loop;
  else
    update problemas_rep set ots = ots || p_ot, ultima = greatest(ultima, o.fecha), actualizado = now(),
      historial = historial || jsonb_build_array(jsonb_build_object('f', now(), 'estado', 'quitado', 'nota', 'Respuesta cambiada: es la misma', 'quien', t.nombre))
      where tema = _tema_problema(o.titulo, o.descripcion) and lugar_key = _lugar_key(o.lugar)
        and not descartado and estado <> 'solucionado' and not (p_ot = any(ots));
  end if;
  return jsonb_build_object('ot', p_ot, 'repite_resp', p_resp);
end $f$;

-- 28/10/2026 · ot_parecidas ignora las tareas habituales (cambio de bidón, GRG…) y las de horno: no son problemas.
-- (aplicada como ot_parecidas_sin_habituales en limpieza-cie)
