-- =====================================================================
-- IMPORTAR TRABAJOS DESDE EXCEL (fin de semana) — limpieza-cie
-- El jefe o el encargado sube el Excel en encargado.html; aquí se crean las OT.
-- p_items: [{titulo, lugar, descripcion, fecha, asignados:[uuid], minutos_est, urgente}]
-- p_reparto: 'auto'  → los que no traen persona se reparten entre los del equipo de finde que trabajan ese día (por carga)
--            'equipo'→ los ve todo el equipo de finde
--            'sin'   → quedan sin asignar (el encargado los asigna)
-- =====================================================================
create or replace function public.ots_importar(p_tok uuid, p_items jsonb, p_reparto text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; i jsonb; f date; asg uuid[]; nuevo uuid; o ots; n int := 0; dup int := 0; quien jsonb := '{}'; k text; eq text;
begin t:=_gestor(p_tok);
  if jsonb_array_length(coalesce(p_items,'[]'))>300 then raise exception 'DEMASIADAS'; end if;
  for i in select * from jsonb_array_elements(coalesce(p_items,'[]')) loop
    if coalesce(trim(i->>'titulo'),'')='' then continue; end if;
    f := (i->>'fecha')::date;
    if f < _hoy() then continue; end if;
    eq := case when extract(isodow from f)>=6 then 'Finde' else 'Semana' end;
    -- no repetir el mismo trabajo el mismo día
    if exists(select 1 from ots where fecha=f and not borrado and lower(trim(titulo))=lower(trim(i->>'titulo')) and coalesce(lower(lugar),'')=coalesce(lower(nullif(trim(i->>'lugar'),'')),'')) then dup := dup+1; continue; end if;
    asg := coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(i->'asignados','[]')) x),'{}');
    if cardinality(asg)=0 and p_reparto='auto' then
      select c.id into nuevo from trabajadores c where _disponible(c,f) and eq=any(c.equipos)
        and (not (coalesce(i->>'titulo','') ~* 'horno|escoria') or exists(select 1 from limp_habilidad h where h.trabajador=c.id and h.habilidad='hornos' and h.activo))
        order by _carga(c.id,f), c.nombre limit 1;
      if nuevo is not null then asg := array[nuevo]; end if;
    end if;
    insert into ots(fecha,titulo,descripcion,lugar,equipo,asignados,todo_equipo,prioridad,origen,creado_por,minutos_est)
    values (f, trim(i->>'titulo'), nullif(trim(i->>'descripcion'),''), nullif(trim(i->>'lugar'),''), eq, asg,
      p_reparto='equipo' and cardinality(asg)=0, case when coalesce((i->>'urgente')::boolean,false) then 'alta' else 'normal' end, 'excel', t.id,
      case when nullif(i->>'minutos_est','')::int between 1 and 1440 then (i->>'minutos_est')::int end)
    returning * into o;
    insert into ot_log(ot,quien,accion,detalle) values (o.id,t.id,'creada','Importada del Excel');
    n := n+1;
    foreach nuevo in array o.asignados loop k := nuevo::text; quien := jsonb_set(quien, array[k], to_jsonb(coalesce((quien->>k)::int,0)+1)); end loop;
  end loop;
  -- un aviso por persona con cuántos trabajos le han tocado
  if quien <> '{}'::jsonb then
    perform _avisar(jsonb_build_object('mensajes',(select jsonb_agg(jsonb_build_object('trabajadores',array[key::uuid],'tag','excel-'||_hoy(),
      'titulo','Trabajos del fin de semana','texto','Te han puesto '||value||' trabajo'||case when value::int>1 then 's' else '' end||'. Míralos en la app.')) from jsonb_each_text(quien))));
  end if;
  return jsonb_build_object('creadas',n,'repetidas',dup);
end $$;

-- Para que la vista previa marque los que ya existen
create or replace function public.ots_existentes(p_tok uuid, p_desde date, p_hasta date) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _gestor(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('fecha',fecha,'titulo',lower(trim(titulo)),'lugar',coalesce(lower(lugar),''))) from ots where fecha between p_desde and p_hasta and not borrado),'[]');
end $$;
