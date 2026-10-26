-- =====================================================================
-- TAREA HABITUAL con material del almacén en cantidad variable (Reponer Pistonwax dúo 15) — limpieza-cie
-- alm_cant vacío = la cantidad la pone el operario al terminar (kilos) y la nave.
-- =====================================================================
insert into public.tareas_habituales (titulo, minutos_est, grupo, activo, alm_art, alm_cant, lugar, borrado)
select 'Reponer Pistonwax dúo 15', 15, 'limpieza', true, 'murbko6upl68d', null, null, false
where not exists (select 1 from public.tareas_habituales where titulo = 'Reponer Pistonwax dúo 15' and not borrado);

create or replace function public._otjson(o ots) returns jsonb
language sql stable security definer set search_path to 'public' as $function$
  select to_jsonb(o) || jsonb_build_object(
    'nombres',(select coalesce(jsonb_agg(w.nombre order by w.nombre),'[]'::jsonb) from trabajadores w where w.id=any(o.asignados)),
    'orig_n',(select jsonb_agg(w.nombre order by w.nombre) from trabajadores w where w.id=any(o.asignados_orig)),
    'hecho_por_n',(select nombre from trabajadores where id=o.hecho_por),
    'creado_por_n',(select nombre from trabajadores where id=o.creado_por),
    'nfotos',(select count(*) from fotos f where f.ot_id=o.id),
    'minutos',case when o.inicio is not null and o.fin is not null then round(extract(epoch from (o.fin-o.inicio))/60 - coalesce(o.pausado_min,0)) end,
    'pide_alm',(exists(select 1 from tareas_fijas f where f.id=o.tarea_id and f.alm_art is not null)
                or exists(select 1 from tareas_habituales h where h.id=o.habitual_id and h.alm_art is not null and h.alm_cant is null)),
    'cubre',(select coalesce(jsonb_agg(jsonb_build_object('ausente',a.nombre,'sustituto',b.nombre)),'[]'::jsonb)
             from sustituciones s join trabajadores a on a.id=s.ausente left join trabajadores b on b.id=s.sustituto
             where s.ausente=any(o.asignados) and o.fecha between s.desde and s.hasta and not s.borrado)) $function$;

create or replace function public.ot_consumo_fijar(p_tok uuid, p_ot uuid, p_nave text, p_cant numeric) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; o ots;
begin t := _yo(p_tok);
  select * into o from ots where id = p_ot and not borrado;
  if not found or not _ve(t, o) then raise exception 'NO_EXISTE'; end if;
  if o.estado = 'hecha' then raise exception 'YA_HECHA'; end if;
  if not (exists (select 1 from tareas_fijas f where f.id = o.tarea_id and f.alm_art is not null)
          or exists (select 1 from tareas_habituales h where h.id = o.habitual_id and h.alm_art is not null and h.alm_cant is null)) then
    raise exception 'SIN_ALMACEN';
  end if;
  if p_nave not in ('Nave 1','Nave 2') then raise exception 'NAVE_MAL'; end if;
  if p_cant is null or p_cant <= 0 or p_cant > 5000 then raise exception 'CANT_MAL'; end if;
  update ots set nave = p_nave, alm_cant_real = p_cant where id = p_ot;
  return jsonb_build_object('nave', p_nave, 'cant', p_cant);
end $$;
