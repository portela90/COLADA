-- =====================================================================
-- Última vez que se confirmaron las tallas (toolbox, limpieza-cie).
-- Cuenta cuando: el trabajador envía tallas, el admin acepta/rechaza una propuesta,
-- o el admin cambia las tallas en la ficha. Sirve para avisar a quien no lo ha revisado en X días.
-- Idempotente.
-- =====================================================================
alter table public.prl_trab add column if not exists tallas_rev_en timestamptz;

create or replace function public._prl_tjson(w trabajadores)
returns jsonb
language sql stable security definer set search_path to 'public' as $function$
  select jsonb_build_object('id',w.id,'nombre',w.nombre,'activo',w.activo,'categoria',w.categoria,
    'dni',t.dni,'puesto',coalesce(t.puesto,w.categoria),'puesto_propio',t.puesto,
    'fecha_alta',t.fecha_alta,'fecha_baja',t.fecha_baja,'motivo_baja',t.motivo_baja,'telefono',coalesce(t.telefono,w.telefono),'emerg_nombre',t.emerg_nombre,'emerg_tel',t.emerg_tel,
    'idioma',t.idioma,'tallas',coalesce(t.tallas,'{}'),'tallas_pend',t.tallas_pend,'tallas_pend_en',t.tallas_pend_en,'tallas_rev_en',t.tallas_rev_en,
    'rm_fecha',t.rm_fecha,'rm_resultado',t.rm_resultado,'rm_limitacion',t.rm_limitacion,'rm_proximo',t.rm_proximo)
  from (select 1) x left join prl_trab t on t.trabajador=w.id
$function$;

create or replace function public.prl_trab_datos_guardar(p_tok uuid, p_id uuid, p jsonb)
returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare w trabajadores; t trabajadores; antes jsonb; despues jsonb;
begin t := _admin(p_tok);
  select * into w from trabajadores where id=p_id; if not found then raise exception 'NO_EXISTE'; end if;
  insert into prl_trab(trabajador) values (p_id) on conflict do nothing;
  select coalesce(tallas,'{}') into antes from prl_trab where trabajador=p_id;
  update prl_trab set
    dni=case when p ? 'dni' then nullif(upper(trim(p->>'dni')),'') else dni end,
    puesto=case when p ? 'puesto' then nullif(trim(p->>'puesto'),'') else puesto end,
    fecha_alta=case when p ? 'fecha_alta' then nullif(p->>'fecha_alta','')::date else fecha_alta end,
    fecha_baja=case when p ? 'fecha_baja' then nullif(p->>'fecha_baja','')::date else fecha_baja end,
    motivo_baja=case when p ? 'motivo_baja' then nullif(trim(p->>'motivo_baja'),'') else motivo_baja end,
    telefono=case when p ? 'telefono' then nullif(trim(p->>'telefono'),'') else telefono end,
    emerg_nombre=case when p ? 'emerg_nombre' then nullif(trim(p->>'emerg_nombre'),'') else emerg_nombre end,
    emerg_tel=case when p ? 'emerg_tel' then nullif(trim(p->>'emerg_tel'),'') else emerg_tel end,
    idioma=case when p ? 'idioma' then nullif(trim(p->>'idioma'),'') else idioma end,
    tallas=case when p ? 'tallas' then _tallas_limpia(p->'tallas') else tallas end,
    rm_fecha=case when p ? 'rm_fecha' then nullif(p->>'rm_fecha','')::date else rm_fecha end,
    rm_resultado=case when p ? 'rm_resultado' then nullif(p->>'rm_resultado','') else rm_resultado end,
    rm_limitacion=case when p ? 'rm_limitacion' then nullif(trim(p->>'rm_limitacion'),'') else rm_limitacion end,
    rm_proximo=case when p ? 'rm_proximo' then nullif(p->>'rm_proximo','')::date else rm_proximo end,
    actualizado=now()
  where trabajador=p_id;
  select coalesce(tallas,'{}') into despues from prl_trab where trabajador=p_id;
  if despues is distinct from antes then
    insert into prl_tallas_log(trabajador, quien, origen, tallas) values (p_id, t.id, 'admin', despues);
    update prl_trab set tallas_rev_en = now() where trabajador = p_id;
  end if;
  return _prl_tjson(w);
end $function$;

create or replace function public.prl_tallas_pedir(p_tok uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare t trabajadores; cur jsonb; nuevo jsonb;
begin t := _yo(p_tok);
  insert into prl_trab(trabajador) values (t.id) on conflict do nothing;
  select coalesce(tallas,'{}') into cur from prl_trab where trabajador=t.id;
  nuevo := cur || _tallas_limpia(p);
  if nuevo = cur then raise exception 'SIN_CAMBIOS'; end if;
  update prl_trab set tallas_pend = nuevo, tallas_pend_en = now(), tallas_rev_en = now() where trabajador=t.id;
  perform _avisar(jsonb_build_object('mensajes', jsonb_build_array(jsonb_build_object(
    'trabajadores', to_jsonb(_admins()), 'tag', 'tallas-' || t.id, 'titulo', 'Cambio de tallas',
    'texto', t.nombre || ' ha cambiado sus tallas. Tócalo para revisarlo.', 'url', 'toolbox.html?ficha=' || t.id))));
  return jsonb_build_object('ok', true);
end $function$;

create or replace function public.prl_tallas_resolver(p_tok uuid, p_trab uuid, p_aceptar boolean) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare t trabajadores; r prl_trab;
begin t := _admin(p_tok);
  select * into r from prl_trab where trabajador=p_trab;
  if not found or r.tallas_pend is null then raise exception 'NO_EXISTE'; end if;
  if p_aceptar then
    update prl_trab set tallas = r.tallas_pend, tallas_pend = null, tallas_pend_en = null, tallas_rev_en = now(), actualizado = now() where trabajador=p_trab;
    insert into prl_tallas_log(trabajador, quien, origen, tallas) values (p_trab, t.id, 'aceptada', r.tallas_pend);
  else
    update prl_trab set tallas_pend = null, tallas_pend_en = null, tallas_rev_en = now() where trabajador=p_trab;
    insert into prl_tallas_log(trabajador, quien, origen, tallas) values (p_trab, t.id, 'rechazada', r.tallas_pend);
  end if;
  return jsonb_build_object('ok', true);
end $function$;

-- Aviso para revisar tallas. Sin p_dias: a todos los activos. Con p_dias: solo a quien no lo confirmó en esos días.
drop function if exists public.prl_tallas_avisar(uuid);
create or replace function public.prl_tallas_avisar(p_tok uuid, p_dias int default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare a uuid[];
begin perform _admin(p_tok);
  select coalesce(array_agg(w.id), '{}') into a
    from trabajadores w left join prl_trab t on t.trabajador = w.id
   where w.activo and w.rol <> 'admin'
     and (p_dias is null or t.tallas_rev_en is null or t.tallas_rev_en < now() - make_interval(days => p_dias));
  if cardinality(a) > 0 then
    perform _avisar(jsonb_build_object('mensajes', jsonb_build_array(jsonb_build_object(
      'trabajadores', to_jsonb(a), 'tag', 'tallas-aviso', 'titulo', 'Revisa tus tallas',
      'texto', 'Toca para revisar o cambiar las tallas de tu ropa y botas.', 'url', 'toolbox.html?tallas=1'))));
  end if;
  return jsonb_build_object('avisados', coalesce(cardinality(a), 0));
end $function$;
