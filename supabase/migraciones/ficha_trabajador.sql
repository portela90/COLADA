-- Ficha por trabajador: todo lo firmado/entregado (jefe)
create or replace function public.prl_ficha(p_tok uuid, p_trab uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare w trabajadores;
begin perform _admin(p_tok);
  select * into w from trabajadores where id=p_trab;
  if not found then raise exception 'NO_EXISTE'; end if;
  return jsonb_build_object(
    'trabajador', jsonb_build_object('id',w.id,'nombre',w.nombre,'activo',w.activo,'categoria',w.categoria,
        'dni',(select dni from prl_trab where trabajador=w.id),'puesto',coalesce((select puesto from prl_trab where trabajador=w.id),w.categoria)),
    'docs', coalesce((select jsonb_agg(_prl_djson(d,false) order by d.fecha desc, d.creado desc) from prl_doc d where d.trabajador=w.id and not d.borrado),'[]'),
    'formaciones', coalesce((select jsonb_agg(_prl_fjson(f,false) order by f.fecha desc) from prl_formacion f where f.trabajador=w.id and not f.borrado),'[]'),
    'toolbox', coalesce((select jsonb_agg(jsonb_build_object('anio',s.anio,'mes',s.mes,'tema',tb.tema,'compromiso',tb.compromiso,'firmado_en',fi.firmado_en) order by s.anio desc, s.mes desc)
        from prl_firma fi join prl_sesion s on s.id=fi.sesion left join prl_toolbox tb on tb.anio=s.anio and tb.mes=s.mes where fi.trabajador=w.id),'[]'));
end $$;

-- Resumen para la lista de fichas
create or replace function public.prl_fichas(p_tok uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin perform _admin(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'nombre',w.nombre,'activo',w.activo,'rol',w.rol,
      'dni',(select dni from prl_trab where trabajador=w.id),
      'epis',(select count(*) from prl_doc d where d.trabajador=w.id and not d.borrado and d.tipo in ('epi','epi_col')),
      'ult_epi',(select max(fecha) from prl_doc d where d.trabajador=w.id and not d.borrado and d.tipo in ('epi','epi_col')),
      'sin_firmar',(select count(*) from prl_doc d where d.trabajador=w.id and not d.borrado and d.firma is null)
                   +(select count(*) from prl_formacion f where f.trabajador=w.id and not f.borrado and f.firma is null),
      'info',exists(select 1 from prl_doc d where d.trabajador=w.id and not d.borrado and d.tipo='info' and d.firma is not null),
      'formacion',exists(select 1 from prl_formacion f where f.trabajador=w.id and not f.borrado and f.firma is not null))
    order by w.activo desc, w.nombre)
    from trabajadores w where w.rol='operario' and (w.activo or exists(select 1 from prl_doc d where d.trabajador=w.id) or exists(select 1 from prl_formacion f where f.trabajador=w.id))),'[]');
end $$;
