-- =====================================================================
-- MOTIVO DE BAJA del trabajador (toolbox / PRL) — limpieza-cie
-- Los trabajadores de baja no se borran (su historial de EPI y formación hay que conservarlo),
-- pero dejan de salir en la lista salvo que se pida verlos.
-- =====================================================================
alter table public.prl_trab add column if not exists motivo_baja text;

create or replace function public._prl_tjson(w public.trabajadores) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('id',w.id,'nombre',w.nombre,'activo',w.activo,'categoria',w.categoria,
    'dni',t.dni,'puesto',coalesce(t.puesto,w.categoria),'puesto_propio',t.puesto,
    'fecha_alta',t.fecha_alta,'fecha_baja',t.fecha_baja,'motivo_baja',t.motivo_baja,'telefono',coalesce(t.telefono,w.telefono),'emerg_nombre',t.emerg_nombre,'emerg_tel',t.emerg_tel,
    'idioma',t.idioma,'tallas',coalesce(t.tallas,'{}'),'rm_fecha',t.rm_fecha,'rm_resultado',t.rm_resultado,'rm_limitacion',t.rm_limitacion,'rm_proximo',t.rm_proximo)
  from (select 1) x left join prl_trab t on t.trabajador=w.id $$;
revoke all on function public._prl_tjson(public.trabajadores) from public, anon, authenticated;

-- Parche de prl_trab_datos_guardar: añade solo el campo nuevo
do $m$
declare d text; antes text := 'fecha_baja=case when p ? ''fecha_baja'' then nullif(p->>''fecha_baja'','''')::date else fecha_baja end,';
begin
  select pg_get_functiondef('public.prl_trab_datos_guardar(uuid,uuid,jsonb)'::regprocedure) into d;
  if position('motivo_baja' in d)>0 then return; end if;
  if position(antes in d)=0 then raise exception 'No se encontró el punto de cambio en prl_trab_datos_guardar'; end if;
  d := replace(d, antes, antes || E'\n    motivo_baja=case when p ? ''motivo_baja'' then nullif(trim(p->>''motivo_baja''),'''') else motivo_baja end,');
  EXECUTE d;
end $m$;

-- Parche de prl_fichas: devuelve la baja y su motivo
do $m$
declare d text; antes text := '''rm_proximo'',t.rm_proximo,';
begin
  select pg_get_functiondef('public.prl_fichas(uuid)'::regprocedure) into d;
  if position('motivo_baja' in d)>0 then return; end if;
  if position(antes in d)=0 then raise exception 'No se encontró el punto de cambio en prl_fichas'; end if;
  d := replace(d, antes, antes || '''fecha_baja'',t.fecha_baja,''motivo_baja'',t.motivo_baja,');
  EXECUTE d;
end $m$;
