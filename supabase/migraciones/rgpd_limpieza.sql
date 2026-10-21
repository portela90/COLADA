-- Limpieza · mejoras de protección de datos (21/10/2026)
-- APLICADO: código de alta (con entrar_alta en lugar de cambiar entrar), motivo de ausencia oculto, sesiones 30 días.
-- PENDIENTE de aprobar: la limpieza diaria (bloque 4), lleva DELETE y pide confirmación.
-- Nota: en vez de cambiar la firma de entrar() se dejó entrar(p_id,p_pin) (devuelve FALTA_ALTA/PIDE_CODIGO si no hay PIN)
-- y se creó entrar_alta(p_id,p_alta,p_pin) para el primer acceso.
-- 1) Alta con código de un solo uso: quien no tiene PIN necesita el código que le da el jefe
alter table public.trabajadores add column if not exists alta_cod text, add column if not exists alta_hasta timestamptz;

create or replace function public.trabajador_codigo_alta(p_tok uuid, p_trab uuid) returns jsonb
language plpgsql security definer set search_path to 'public','extensions' as $$
declare a trabajadores; x trabajadores; cod text;
begin a:=_admin(p_tok);
  select * into x from trabajadores where id=p_trab and activo; if not found then raise exception 'NO_EXISTE'; end if;
  cod := lpad((floor(random()*1000000))::int::text,6,'0');
  update trabajadores set alta_cod=crypt(cod,gen_salt('bf')), alta_hasta=now()+interval '7 days', pin=null, fallos=0, bloqueo_hasta=null where id=x.id;
  update sesiones set expira=now() where trabajador=x.id and expira>now();
  return jsonb_build_object('codigo',cod,'hasta',now()+interval '7 days','nombre',x.nombre);
end $$;
revoke execute on function public.trabajador_codigo_alta(uuid,uuid) from public;
grant execute on function public.trabajador_codigo_alta(uuid,uuid) to anon, authenticated;

drop function if exists public.entrar(uuid,text);
create or replace function public.entrar(p_id uuid, p_pin text, p_alta text default null) returns jsonb
language plpgsql security definer set search_path to 'public','extensions' as $$
declare t trabajadores; tok uuid;
begin
  select * into t from trabajadores where id=p_id and activo;
  if not found then return jsonb_build_object('error','NO_EXISTE'); end if;
  if t.bloqueo_hasta is not null and t.bloqueo_hasta>now() then return jsonb_build_object('error','BLOQUEADO'); end if;
  if p_pin !~ '^[0-9]{4,8}$' then return jsonb_build_object('error','PIN_FORMATO'); end if;
  if t.pin is null then
    if t.alta_cod is null or t.alta_hasta is null or t.alta_hasta<now() then return jsonb_build_object('error','FALTA_ALTA'); end if;
    if coalesce(p_alta,'')='' then return jsonb_build_object('error','PIDE_CODIGO'); end if;
    if t.alta_cod <> crypt(p_alta,t.alta_cod) then
      update trabajadores set fallos=fallos+1, bloqueo_hasta=case when fallos+1>=5 then now()+interval '10 minutes' else null end where id=t.id;
      return jsonb_build_object('error','CODIGO_MAL');
    end if;
    update trabajadores set pin=crypt(p_pin,gen_salt('bf')),fallos=0,bloqueo_hasta=null,alta_cod=null,alta_hasta=null where id=t.id;
  elsif t.pin <> crypt(p_pin,t.pin) then
    update trabajadores set fallos=fallos+1, bloqueo_hasta=case when fallos+1>=5 then now()+interval '10 minutes' else null end where id=t.id;
    return jsonb_build_object('error','PIN_MAL');
  else
    update trabajadores set fallos=0,bloqueo_hasta=null where id=t.id;
  end if;
  insert into sesiones(trabajador) values (t.id) returning token into tok;
  return jsonb_build_object('token',tok,'yo',jsonb_build_object('id',t.id,'nombre',t.nombre,'rol',t.rol,'equipos',t.equipos,'encargado',_es_enc(t)));
end $$;
grant execute on function public.entrar(uuid,text,text) to anon, authenticated;

-- 2) El motivo de una ausencia (p. ej. «Baja») no sale en las OT que ven los compañeros
create or replace function public._otjson(o ots) returns jsonb language sql stable security definer set search_path to 'public','extensions' as $$
  select to_jsonb(o) || jsonb_build_object(
    'nombres',(select coalesce(jsonb_agg(w.nombre order by w.nombre),'[]'::jsonb) from trabajadores w where w.id=any(o.asignados)),
    'orig_n',(select jsonb_agg(w.nombre order by w.nombre) from trabajadores w where w.id=any(o.asignados_orig)),
    'hecho_por_n',(select nombre from trabajadores where id=o.hecho_por),
    'creado_por_n',(select nombre from trabajadores where id=o.creado_por),
    'nfotos',(select count(*) from fotos f where f.ot_id=o.id),
    'minutos',case when o.inicio is not null and o.fin is not null then round(extract(epoch from (o.fin-o.inicio))/60 - coalesce(o.pausado_min,0)) end,
    'cubre',(select coalesce(jsonb_agg(jsonb_build_object('ausente',a.nombre,'sustituto',b.nombre)),'[]'::jsonb)
             from sustituciones s join trabajadores a on a.id=s.ausente left join trabajadores b on b.id=s.sustituto
             where s.ausente=any(o.asignados) and o.fecha between s.desde and s.hasta and not s.borrado)) $$;
-- en ots_dia el sustituto solo ve «Ausencia» (el jefe, el encargado y el propio trabajador ven el motivo)
do $$ declare d text; begin
  d := pg_get_functiondef('public.ots_dia(uuid,date)'::regprocedure);
  if position('''motivo'',s.motivo' in d)=0 then raise exception 'ots_dia ha cambiado: revisar'; end if;
  d := replace(d, '''motivo'',s.motivo', '''motivo'',case when g or s.ausente=t.id or s.motivo=''Horas extra'' then s.motivo else ''Ausencia'' end');
  execute d;
end $$;

-- 3) Sesiones de 30 días (antes 90)
alter table public.sesiones alter column expira set default (now() + interval '30 days');
update public.sesiones set expira = now() + interval '30 days' where expira > now() + interval '30 days';

-- 4) Limpieza diaria de datos que ya no hacen falta
create or replace function public._limpieza_datos() returns void language plpgsql security definer set search_path to 'public','extensions' as $$
begin
  delete from sesiones where expira < now() - interval '7 days';
  delete from sesiones_ayudante where expira < now() - interval '7 days';
  delete from sesiones where trabajador in (select id from trabajadores where not activo);
  delete from push_subs where trabajador in (select id from trabajadores where not activo) or not activo;
  update trabajadores set alta_cod=null, alta_hasta=null where alta_hasta < now();
end $$;
revoke execute on function public._limpieza_datos() from public, anon, authenticated;
select cron.schedule('limpieza-datos-caducados','20 3 * * *','select public._limpieza_datos()');
