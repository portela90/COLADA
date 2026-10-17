-- =====================================================================
-- DÍAS SIN HORARIO = LIBRA — limpieza-cie
--   Si un trabajador tiene horario puesto algún día de la semana, los días
--   que tiene vacíos cuentan como «libra» (antes salían como «Sin horario
--   puesto»). Solo sale «Sin horario puesto» quien no tiene ningún día puesto.
--   Cambia la pantalla Día («Quién trabaja» y «Hoy libras» del operario).
--
-- CÓMO USARLO: Supabase → limpieza-cie → SQL Editor → New query → pega todo → Run.
-- =====================================================================
create or replace function public._tramos_dia(h jsonb, dn text) returns jsonb
language sql immutable as $$
  select case when h ? dn then h -> dn
              when h is not null and h <> '{}'::jsonb and jsonb_typeof(h) = 'object' then '[]'::jsonb
              else null end;
$$;

create or replace function public.ots_dia(p_tok uuid, p_fecha date)
 returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare t trabajadores; dn text := _dia(p_fecha); g boolean;
begin t:=_yo(p_tok); g := t.rol='admin' or _es_enc(t); perform _generar(p_fecha);
  return jsonb_build_object(
    'dia',(select coalesce(jsonb_agg(_otjson(o) order by o.estado='hecha', o.turno nulls last, o.titulo),'[]'::jsonb) from ots o where o.fecha=p_fecha and not o.borrado and _ve(t,o)),
    'atrasadas',(select coalesce(jsonb_agg(_otjson(o) order by o.fecha),'[]'::jsonb) from ots o where o.fecha<p_fecha and o.fecha>=p_fecha-14 and not o.borrado and o.estado in ('pendiente','en_curso') and _ve(t,o) and p_fecha=_hoy()),
    'extras',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'trabajador',e.trabajador,'nombre',w.nombre,'equipo',e.equipo,'horas',e.horas,'nota',e.nota) order by w.nombre),'[]'::jsonb)
              from extras e join trabajadores w on w.id=e.trabajador where e.fecha=p_fecha and not e.borrado and (t.rol='admin' or e.trabajador=t.id)),
    'ausencias',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'ausente',s.ausente,'ausente_n',a.nombre,'sustituto',s.sustituto,'sustituto_n',b.nombre,'motivo',s.motivo,'desde',s.desde,'hasta',s.hasta) order by a.nombre),'[]'::jsonb)
              from sustituciones s join trabajadores a on a.id=s.ausente left join trabajadores b on b.id=s.sustituto
              where p_fecha between s.desde and s.hasta and not s.borrado and (g or s.sustituto=t.id or s.ausente=t.id)),
    'mi_horario', _tramos_dia(t.horario, dn),
    'plantilla',case when g then (select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'nombre',w.nombre,'tramos',_tramos_dia(w.horario, dn)) order by (_tramos_dia(w.horario, dn)->0->>0) nulls last, w.nombre),'[]'::jsonb)
              from trabajadores w where w.activo and w.rol<>'admin') end,
    'espacio',case when t.rol='admin' then round(pg_database_size(current_database())*100.0/(500*1024*1024)) end);
end $function$;
