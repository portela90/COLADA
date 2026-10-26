-- =====================================================================
-- TAREAS FIJAS con material del almacén (p. ej. «Reponer Pistonwax dúo 15») — limpieza-cie
-- Al terminar la OT de una tarea con almacén, el operario elige la nave y la cantidad (kg).
-- La cantidad sale del Almacén general (decisión del 26/10). Si no se pide, no se descuenta nada.
-- =====================================================================
alter table public.tareas_fijas add column if not exists alm_art text;   -- artículo del almacén (id) o null
alter table public.ots add column if not exists alm_cant_real numeric;  -- cantidad real que se ha repuesto

-- tarea_guardar: acepta el artículo del almacén
create or replace function public.tarea_guardar(p_tok uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare x tareas_fijas; asg uuid[]; ds text[]; me int := nullif(p->>'minutos_est','')::int;
begin perform _admin(p_tok);
  asg := coalesce((select array_agg(v::uuid) from jsonb_array_elements_text(coalesce(p->'asignados','[]'::jsonb)) v),'{}');
  ds := coalesce((select array_agg(v) from jsonb_array_elements_text(coalesce(p->'dias','["todos"]'::jsonb)) v),'{todos}');
  if coalesce(trim(p->>'titulo'),'')='' then raise exception 'FALTA_TITULO'; end if;
  if me is not null and (me<1 or me>1440) then raise exception 'TIEMPO_MAL'; end if;
  if p ? 'id' and p->>'id' is not null then
    update tareas_fijas set titulo=p->>'titulo',tipo=nullif(p->>'tipo',''),descripcion=nullif(p->>'descripcion',''),activo=coalesce((p->>'activo')::boolean,true),dias=ds,
      equipo=coalesce(p->>'equipo','Semana'),turno=nullif(p->>'turno',''),asignados=asg,todo_equipo=coalesce((p->>'todo_equipo')::boolean,false),minutos_est=me,
      alm_art=case when p ? 'alm_art' then nullif(p->>'alm_art','') else alm_art end
      where id=(p->>'id')::uuid returning * into x;
    update ots set titulo=x.titulo,descripcion=x.descripcion,tipo=x.tipo,turno=x.turno,asignados=x.asignados,todo_equipo=x.todo_equipo,minutos_est=x.minutos_est where tarea_id=x.id and fecha>=_hoy() and estado='pendiente';
    update ots set minutos_est=x.minutos_est where tarea_id=x.id and fecha>=_hoy() and estado<>'pendiente';
  else
    insert into tareas_fijas(titulo,tipo,descripcion,activo,dias,equipo,turno,asignados,todo_equipo,minutos_est,alm_art)
    values (p->>'titulo',nullif(p->>'tipo',''),nullif(p->>'descripcion',''),coalesce((p->>'activo')::boolean,true),ds,coalesce(p->>'equipo','Semana'),nullif(p->>'turno',''),asg,coalesce((p->>'todo_equipo')::boolean,false),me,nullif(p->>'alm_art',''))
    returning * into x;
  end if;
  return to_jsonb(x); end $function$;

-- OT: indica si su tarea repone material del almacén (la app pregunta nave y cantidad al terminar)
create or replace function public._otjson(o ots) returns jsonb
language sql stable security definer set search_path to 'public' as $function$
  select to_jsonb(o) || jsonb_build_object(
    'nombres',(select coalesce(jsonb_agg(w.nombre order by w.nombre),'[]'::jsonb) from trabajadores w where w.id=any(o.asignados)),
    'orig_n',(select jsonb_agg(w.nombre order by w.nombre) from trabajadores w where w.id=any(o.asignados_orig)),
    'hecho_por_n',(select nombre from trabajadores where id=o.hecho_por),
    'creado_por_n',(select nombre from trabajadores where id=o.creado_por),
    'nfotos',(select count(*) from fotos f where f.ot_id=o.id),
    'minutos',case when o.inicio is not null and o.fin is not null then round(extract(epoch from (o.fin-o.inicio))/60 - coalesce(o.pausado_min,0)) end,
    'pide_alm',exists(select 1 from tareas_fijas f where f.id=o.tarea_id and f.alm_art is not null),
    'cubre',(select coalesce(jsonb_agg(jsonb_build_object('ausente',a.nombre,'sustituto',b.nombre)),'[]'::jsonb)
             from sustituciones s join trabajadores a on a.id=s.ausente left join trabajadores b on b.id=s.sustituto
             where s.ausente=any(o.asignados) and o.fecha between s.desde and s.hasta and not s.borrado)) $function$;

-- Disparador de consumo: también para las tareas fijas con almacén, y con la cantidad real
do $m$
declare d text;
  a1 text := E'  select alm_art, alm_cant, titulo into h from public.tareas_habituales where id = NEW.habitual_id;\n  if h.alm_art is null then';
  a2 text := E'''p_cant'', h.alm_cant,';
  a3 text := 'begin v_cant := nullif(trim(h.alm_cant::text), '''')::numeric;';
  a4 text := E'  if NEW.habitual_id is null or NEW.estado is distinct from ''hecha'' then';
begin
  select pg_get_functiondef('public.ots_consumo_almacen()'::regprocedure) into d;
  if position('alm_cant_real' in d)>0 then return; end if;
  if position(a1 in d)=0 or position(a2 in d)=0 or position(a3 in d)=0 or position(a4 in d)=0 then raise exception 'No se encontró el punto de cambio en ots_consumo_almacen'; end if;
  d := replace(d, a1, E'  select alm_art, alm_cant, titulo into h from public.tareas_habituales where id = NEW.habitual_id;\n  if h.alm_art is null and NEW.tarea_id is not null then\n    select f.alm_art, null::numeric as alm_cant, f.titulo into h from public.tareas_fijas f where f.id = NEW.tarea_id and f.alm_art is not null;\n  end if;\n  if h.alm_art is null then');
  d := replace(d, a2, '''p_cant'', coalesce(NEW.alm_cant_real, h.alm_cant),');
  d := replace(d, a4, E'  if (NEW.habitual_id is null and NEW.tarea_id is null) or NEW.estado is distinct from ''hecha'' then');
  d := replace(d, a3, 'begin v_cant := coalesce(NEW.alm_cant_real, nullif(trim(h.alm_cant::text), '''')::numeric);');
  EXECUTE d;
end $m$;

-- La app fija la nave y la cantidad real antes de terminar la OT
create or replace function public.ot_consumo_fijar(p_tok uuid, p_ot uuid, p_nave text, p_cant numeric) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; o ots;
begin t := _yo(p_tok);
  select * into o from ots where id = p_ot and not borrado;
  if not found or not _ve(t, o) then raise exception 'NO_EXISTE'; end if;
  if o.estado = 'hecha' then raise exception 'YA_HECHA'; end if;
  if not exists (select 1 from tareas_fijas f where f.id = o.tarea_id and f.alm_art is not null) then raise exception 'SIN_ALMACEN'; end if;
  if p_nave not in ('Nave 1','Nave 2') then raise exception 'NAVE_MAL'; end if;
  if p_cant is null or p_cant <= 0 or p_cant > 5000 then raise exception 'CANT_MAL'; end if;
  update ots set nave = p_nave, alm_cant_real = p_cant where id = p_ot;
  return jsonb_build_object('nave', p_nave, 'cant', p_cant);
end $$;
