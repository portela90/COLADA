-- =====================================================================
-- VACIADO PREVENTIVO DE HORNOS MANTENEDORES — limpieza-cie
-- Cada horno debe vaciarse como mínimo una vez al año para que no se formen residuos
-- que tapen el cono y la tolva (y haya que cambiarlos, que es lo que se quiere evitar).
-- Un cambio de tolva o de cono también cuenta como vaciado (el horno se vacía para hacerlo).
-- =====================================================================
alter table public.elementos add column if not exists vaciado_dias int;
alter table public.elementos add column if not exists vaciado_ref date;        -- último vaciado conocido de antes de la app
alter table public.elementos add column if not exists vaciado_excepcion boolean not null default false;
alter table public.elementos add column if not exists vaciado_nota text;
update public.elementos set vaciado_dias=365 where tipo='horno' and vaciado_dias is null;

create or replace function public._ult_vaciado(e elementos) returns date
language sql stable security definer set search_path to 'public' as $$
  select nullif(greatest(coalesce(e.vaciado_ref,'1900-01-01'::date),
    coalesce((select max(((o.fin at time zone 'Europe/Madrid'))::date) from ots o where o.elemento_id=e.id and o.estado='hecha' and not o.borrado
       and o.accion_horno in ('vaciado','cambio_tolva','cambio_cono','cambio_tolva_cono')),'1900-01-01'::date)),'1900-01-01'::date) $$;

create or replace function public._eljson(e elementos) returns jsonb
language sql stable security definer set search_path to 'public' as $function$
  select to_jsonb(e) || coalesce((select jsonb_build_object('ultima',o.fin,'ultima_por',w.nombre,'ultima_min',round(extract(epoch from (o.fin-o.inicio))/60))
     from ots o left join trabajadores w on w.id=o.hecho_por where o.elemento_id=e.id and o.estado='hecha' and not o.borrado and coalesce(o.accion_horno,'limpieza')='limpieza' order by o.fin desc nulls last limit 1),'{}'::jsonb)
   || coalesce((select jsonb_build_object('ult_otra',o.fin,'ult_otra_accion',o.accion_horno,'ult_otra_por',w.nombre)
     from ots o left join trabajadores w on w.id=o.hecho_por where o.elemento_id=e.id and o.estado='hecha' and not o.borrado and coalesce(o.accion_horno,'limpieza')<>'limpieza' order by o.fin desc nulls last limit 1),'{}'::jsonb)
   || jsonb_build_object('n90',(select count(*) from ots o where o.elemento_id=e.id and o.estado='hecha' and not o.borrado and coalesce(o.accion_horno,'limpieza')='limpieza' and o.fecha>_hoy()-90),
        'ult_vaciado',_ult_vaciado(e),
        'cambios_365',(select count(*) from ots o where o.elemento_id=e.id and o.estado='hecha' and not o.borrado and o.accion_horno like 'cambio%' and o.fecha>_hoy()-365),
        'vaciado_abierto',exists(select 1 from ots o where o.elemento_id=e.id and not o.borrado and o.estado in ('pendiente','en_curso') and o.accion_horno='vaciado'));
$function$;

create or replace function public.elemento_guardar(p_tok uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare x elementos;
begin perform _admin(p_tok);
  if coalesce(trim(p->>'nombre'),'')='' or coalesce(trim(p->>'codigo'),'')='' then raise exception 'FALTAN_DATOS'; end if;
  if exists(select 1 from elementos where not borrado and upper(codigo)=upper(trim(p->>'codigo')) and id::text is distinct from p->>'id') then raise exception 'CODIGO_REPETIDO'; end if;
  if p ? 'id' and p->>'id' is not null then
    update elementos set tipo=coalesce(p->>'tipo','molde'),codigo=upper(trim(p->>'codigo')),nombre=trim(p->>'nombre'),lugar=nullif(trim(p->>'lugar'),''),
      frecuencia_dias=nullif(p->>'frecuencia_dias','')::int,minutos_est=nullif(p->>'minutos_est','')::int,activo=coalesce((p->>'activo')::boolean,true),
      puntos=case when p ? 'puntos' and jsonb_typeof(p->'puntos')='array' then p->'puntos' else puntos end,
      vaciado_dias=case when p ? 'vaciado_dias' then nullif(p->>'vaciado_dias','')::int else vaciado_dias end,
      vaciado_ref=case when p ? 'vaciado_ref' then nullif(p->>'vaciado_ref','')::date else vaciado_ref end,
      vaciado_excepcion=case when p ? 'vaciado_excepcion' then coalesce((p->>'vaciado_excepcion')::boolean,false) else vaciado_excepcion end,
      vaciado_nota=case when p ? 'vaciado_nota' then nullif(trim(p->>'vaciado_nota'),'') else vaciado_nota end
    where id=(p->>'id')::uuid returning * into x;
  else
    insert into elementos(tipo,codigo,nombre,lugar,frecuencia_dias,minutos_est,activo,puntos,vaciado_dias,vaciado_ref,vaciado_excepcion,vaciado_nota)
    values (coalesce(p->>'tipo','molde'),upper(trim(p->>'codigo')),trim(p->>'nombre'),nullif(trim(p->>'lugar'),''),
      nullif(p->>'frecuencia_dias','')::int,nullif(p->>'minutos_est','')::int,coalesce((p->>'activo')::boolean,true),coalesce(p->'puntos','[]'::jsonb),
      coalesce(nullif(p->>'vaciado_dias','')::int, case when coalesce(p->>'tipo','molde')='horno' then 365 end), nullif(p->>'vaciado_ref','')::date,
      coalesce((p->>'vaciado_excepcion')::boolean,false), nullif(trim(p->>'vaciado_nota'),'')) returning * into x;
  end if;
  return _eljson(x); end $function$;

-- Aviso semanal (lunes por la mañana) al jefe: hornos con el vaciado atrasado o que tocan en los próximos 30 días
create or replace function public._aviso_vaciados() returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare atr text[]; prox text[]; sinf int;
begin
  select array_agg(replace(e.codigo,'H-','') order by _ult_vaciado(e)) filter (where _ult_vaciado(e) is not null and _ult_vaciado(e)+e.vaciado_dias < _hoy()),
         array_agg(replace(e.codigo,'H-','') order by _ult_vaciado(e)) filter (where _ult_vaciado(e) is not null and _ult_vaciado(e)+e.vaciado_dias between _hoy() and _hoy()+30),
         count(*) filter (where _ult_vaciado(e) is null)
    into atr, prox, sinf
  from elementos e where e.tipo='horno' and e.activo and not e.borrado and not e.vaciado_excepcion and e.vaciado_dias is not null
    and not exists(select 1 from ots o where o.elemento_id=e.id and not o.borrado and o.estado in ('pendiente','en_curso') and o.accion_horno='vaciado');
  if coalesce(cardinality(atr),0)+coalesce(cardinality(prox),0)=0 then return jsonb_build_object('atrasados',0,'proximos',0,'sin_fecha',sinf); end if;
  perform _avisar(jsonb_build_object('mensajes',jsonb_build_array(jsonb_build_object('trabajadores',_admins(),'tag','vaciados','url','limpieza.html?el=vaciados',
    'urgente',coalesce(cardinality(atr),0)>0,
    'titulo',case when coalesce(cardinality(atr),0)>0 then '🫗 '||cardinality(atr)||' horno'||case when cardinality(atr)>1 then 's' else '' end||' sin vaciar hace más de un año' else '🫗 Vaciados de hornos este mes' end,
    'texto',concat_ws(' · ', case when cardinality(atr)>0 then 'Atrasados: '||array_to_string(atr[1:8],', ') end,
                              case when cardinality(prox)>0 then 'Tocan antes de 30 días: '||array_to_string(prox[1:8],', ') end)))));
  return jsonb_build_object('atrasados',coalesce(cardinality(atr),0),'proximos',coalesce(cardinality(prox),0),'sin_fecha',sinf);
end $$;
revoke all on function public._aviso_vaciados() from public, anon, authenticated;
select cron.schedule('limpieza-aviso-vaciados','5 7 * * 1','select public._aviso_vaciados()');
