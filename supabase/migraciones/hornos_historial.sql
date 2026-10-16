-- =====================================================================
-- HORNOS MANTENEDORES: historial completo — limpieza-cie
-- 1) La lista también muestra el último vaciado (antes solo contaba limpiezas).
-- 2) Si alguien abre un trabajo normal de un horno (p. ej. «Limpieza horno mantenedor» en F65),
--    se une solo a su horno H-F65 para que cuente en su historial.
-- =====================================================================
create or replace function public._eljson(e elementos) returns jsonb
language sql stable security definer set search_path to 'public' as $function$
  select to_jsonb(e) || coalesce((select jsonb_build_object('ultima',o.fin,'ultima_por',w.nombre,'ultima_min',round(extract(epoch from (o.fin-o.inicio))/60))
     from ots o left join trabajadores w on w.id=o.hecho_por where o.elemento_id=e.id and o.estado='hecha' and not o.borrado and coalesce(o.accion_horno,'limpieza')='limpieza' order by o.fin desc nulls last limit 1),'{}'::jsonb)
   || coalesce((select jsonb_build_object('ult_otra',o.fin,'ult_otra_accion',o.accion_horno,'ult_otra_por',w.nombre)
     from ots o left join trabajadores w on w.id=o.hecho_por where o.elemento_id=e.id and o.estado='hecha' and not o.borrado and coalesce(o.accion_horno,'limpieza')<>'limpieza' order by o.fin desc nulls last limit 1),'{}'::jsonb)
   || jsonb_build_object('n90',(select count(*) from ots o where o.elemento_id=e.id and o.estado='hecha' and not o.borrado and coalesce(o.accion_horno,'limpieza')='limpieza' and o.fecha>_hoy()-90));
$function$;

-- Busca el horno mantenedor por el código de máquina que aparezca en el lugar o en el título (F65, f 65, F-65…)
create or replace function public._horno_de(p_titulo text, p_lugar text) returns uuid
language sql stable security definer set search_path to 'public' as $$
  select e.id from elementos e
  where not e.borrado and e.tipo='horno'
    and coalesce(p_titulo,'')||' '||coalesce(p_lugar,'') ~* 'horno|mantenedor'
    and coalesce(p_titulo,'')||' '||coalesce(p_lugar,'') !~* 'fusi[oó]n|desgasific'
    and upper(e.codigo) = 'H-F'||(regexp_match(coalesce(p_lugar,'')||' '||coalesce(p_titulo,''), '[Ff]\s*-?\s*([0-9]{1,3})'))[1]
  limit 1 $$;
create or replace function public._accion_horno_de(p_titulo text) returns text language sql immutable as $$
  select case when p_titulo ~* 'tolva' and p_titulo ~* 'cono' then 'cambio_tolva_cono'
              when p_titulo ~* 'tolva' then 'cambio_tolva' when p_titulo ~* 'cono' then 'cambio_cono'
              when p_titulo ~* 'limpi' then 'limpieza' when p_titulo ~* 'vaci' then 'vaciado' else 'limpieza' end $$;

create or replace function public._trg_ot_horno() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare h uuid;
begin
  if new.elemento_id is null then
    h := _horno_de(new.titulo, new.lugar);
    if h is not null then new.elemento_id := h; new.accion_horno := coalesce(new.accion_horno, _accion_horno_de(new.titulo)); end if;
  end if;
  return new;
end $$;
create or replace trigger ot_horno before insert or update of titulo, lugar on public.ots for each row execute function public._trg_ot_horno();

-- Unir los trabajos que ya se hicieron
update public.ots o set elemento_id=_horno_de(o.titulo,o.lugar), accion_horno=coalesce(o.accion_horno,_accion_horno_de(o.titulo))
where o.elemento_id is null and not o.borrado and _horno_de(o.titulo,o.lugar) is not null;
