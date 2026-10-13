-- Registro diario de consumos de aceites, taladrinas y jabones (base limpieza-cie).
--
-- Cada vez que una OT habitual con artículo de almacén (tareas_habituales.alm_art / alm_cant)
-- pasa a 'hecha', el disparador ots_consumo_almacen:
--   1) envía el consumo al Almacén (como antes, por pg_net, con el secreto de config_int), y
--   2) guarda una línea en consumos_registro, AUNQUE el envío falle (estado en envio).
-- Una línea por OT (ot_id único): volver a marcar la OT no duplica nada.
-- El informe del día (pantalla Día del jefe) solo lee el registro: no toca el stock.
--
-- Estados de envio: pendiente (llamada lanzada, sin respuesta aún) · enviado (el Almacén
-- respondió bien) · fallo (error o sin respuesta) · sin_enviar (no se llegó a lanzar).

create table if not exists public.articulos_alm (
  alm_art    text primary key,
  nombre     text not null,
  ud         text not null default 'kg',
  en_informe boolean not null default true
);
alter table public.articulos_alm enable row level security;

insert into public.articulos_alm (alm_art, nombre, ud, en_informe) values
  ('68dfcbac40e836','ACEITE CHEM-TREND SU-124','kg',true),
  ('f0f770138dfe41','JABÓN CIMCLEAN PC240','kg',true),
  ('1aad128f4c9038','TALADRINA SERVOL 353 (BRUGAROLAS)','kg',true),
  ('murbntzamwawf','TALADRINA ECOCOOL MS 831 BFF (FUCHS)','kg',true),
  ('5585ca56f03c26','ACEITE DE ENGRASE AVILUB GEAR MIN EP ISO 220 (AVIA)','kg',true),
  ('16f8b603ea4df1','ACEITE AVILUB HLP-M 46 «OSO 46» (AVIA)','kg',true),
  ('8ab114d9c357dc','ACEITE TÉRMICO BESTERM HT (BRUGAROLAS)','kg',true),
  ('c2cb2372d73946','ACEITE DE PRENSA VOLÁTIL METALFORM V 106 (METAL FLOW)','kg',true),
  ('da5cf6517cd2e1','JABÓN BONDERITE C-AK 5129-28 CT1000 (HENKEL)','kg',true),
  ('mul82yttwgv3q','SACAS BLANCAS','ud',false)
on conflict (alm_art) do update set nombre=excluded.nombre, ud=excluded.ud, en_informe=excluded.en_informe;

create table if not exists public.consumos_registro (
  id          bigint generated always as identity primary key,
  ot_id       uuid not null unique,
  fecha       date not null,
  cuando      timestamptz not null default now(),
  ot_titulo   text,
  habitual_id uuid,
  tarea       text,
  alm_art     text not null,
  cant        numeric,
  hecho_por   uuid,
  hecho_por_n text,
  envio       text not null default 'sin_enviar' check (envio in ('pendiente','enviado','fallo','sin_enviar')),
  req_id      bigint,
  envio_info  text
);
create index if not exists consumos_registro_fecha on public.consumos_registro (fecha);
alter table public.consumos_registro enable row level security;

-- Disparador: mismo envío que antes + línea en el registro. Nunca bloquea el cierre de la OT.
create or replace function public.ots_consumo_almacen()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  h record;
  s text;
  rid bigint;
  v_env text := 'sin_enviar';
  v_info text;
  v_cant numeric;
  v_quien uuid;
begin
  if NEW.habitual_id is null or NEW.estado is distinct from 'hecha' then
    return NEW;
  end if;
  if TG_OP = 'UPDATE' and OLD.estado = 'hecha' then
    return NEW;
  end if;
  select alm_art, alm_cant, titulo into h from public.tareas_habituales where id = NEW.habitual_id;
  if h.alm_art is null then
    return NEW;
  end if;

  if coalesce(NEW.consumo_enviado, false) then
    v_env := 'enviado';  -- ya se envió en un cierre anterior de esta misma OT
  else
    select v into s from public.config_int where k = 'consumo_limpieza';
    if s is null then
      v_info := 'falta la clave interna';
    else
      begin
        rid := net.http_post(
          url := 'https://whemhkcrgwyjucpaswrm.supabase.co/rest/v1/rpc/alm_consumo_limpieza',
          headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'sb_publishable_hcFf66q2-0X6pR1gq5YKpw_u4G6HriG'),
          body := jsonb_build_object('p_secreto', s, 'p_art', h.alm_art, 'p_cant', h.alm_cant, 'p_nota', 'Limpieza: ' || h.titulo, 'p_id', 'lim_' || NEW.id::text)
        );
        NEW.consumo_enviado := true;
        v_env := 'pendiente';
      exception when others then
        v_env := 'fallo';
        v_info := left(sqlerrm, 200);
      end;
    end if;
  end if;

  begin
    begin v_cant := nullif(trim(h.alm_cant::text), '')::numeric; exception when others then v_cant := null; end;
    v_quien := coalesce(NEW.hecho_por, NEW.creado_por);
    insert into public.consumos_registro
      (ot_id, fecha, cuando, ot_titulo, habitual_id, tarea, alm_art, cant, hecho_por, hecho_por_n, envio, req_id, envio_info)
    values
      (NEW.id, (now() at time zone 'Europe/Madrid')::date, now(), NEW.titulo, NEW.habitual_id, h.titulo, h.alm_art, v_cant,
       v_quien, (select nombre from public.trabajadores where id = v_quien), v_env, rid, v_info)
    on conflict (ot_id) do update
      set envio = excluded.envio, req_id = excluded.req_id, envio_info = excluded.envio_info
      where public.consumos_registro.envio in ('fallo', 'sin_enviar') and excluded.envio = 'pendiente';
  exception when others then
    null;  -- el registro nunca impide cerrar la OT
  end;
  return NEW;
end;
$function$;

-- Pasa las líneas 'pendiente' a enviado/fallo mirando la respuesta de pg_net.
create or replace function public._consumos_refresca()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  update consumos_registro r
     set envio = case when x.status_code between 200 and 299 then 'enviado' else 'fallo' end,
         envio_info = case when x.status_code between 200 and 299 then null
                           else left(coalesce(x.error_msg, x.content::text, 'error ' || x.status_code), 200) end
    from net._http_response x
   where r.envio = 'pendiente' and x.id = r.req_id;
  update consumos_registro
     set envio = 'fallo', envio_info = 'sin respuesta del Almacén'
   where envio = 'pendiente' and cuando < now() - interval '30 minutes';
end $function$;

-- Destinatario del informe (por defecto Beatriz, el mismo que el informe de pistones).
insert into public.app_config (k, v) values
  ('informe_consumos_dest', '{"nom":"Beatriz Arrizabalaga","email":"barrizabalaga@cieautomotive.com","tel":"686 57 74 64"}')
on conflict do nothing;

-- Registro del día para el jefe: líneas, resumen por artículo y destinatario.
create or replace function public.consumos_dia(p_tok uuid, p_fecha date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare f date := coalesce(p_fecha, (now() at time zone 'Europe/Madrid')::date); L jsonb; R jsonb; d jsonb;
begin
  perform _admin(p_tok);
  perform _consumos_refresca();
  select coalesce(jsonb_agg(jsonb_build_object(
           'ot_id', r.ot_id, 'cuando', r.cuando, 'ot', r.ot_titulo, 'tarea', r.tarea, 'alm_art', r.alm_art,
           'articulo', coalesce(a.nombre, r.tarea), 'ud', coalesce(a.ud, 'kg'), 'cant', r.cant,
           'quien', r.hecho_por_n, 'envio', r.envio, 'envio_info', r.envio_info) order by r.cuando), '[]'::jsonb)
    into L
    from consumos_registro r left join articulos_alm a on a.alm_art = r.alm_art
   where r.fecha = f and coalesce(a.en_informe, true)
     and not exists (select 1 from ots o where o.id = r.ot_id and o.borrado);  -- las OTs quitadas no cuentan
  select coalesce(jsonb_agg(x order by x->>'articulo'), '[]'::jsonb) into R from (
    select jsonb_build_object('alm_art', r.alm_art, 'articulo', coalesce(a.nombre, min(r.tarea)), 'ud', coalesce(a.ud, 'kg'),
             'total', sum(coalesce(r.cant, 0)), 'tareas', count(*),
             'sin_enviar', count(*) filter (where r.envio in ('fallo', 'sin_enviar'))) x
      from consumos_registro r left join articulos_alm a on a.alm_art = r.alm_art
     where r.fecha = f and coalesce(a.en_informe, true)
       and not exists (select 1 from ots o where o.id = r.ot_id and o.borrado)
     group by r.alm_art, a.nombre, a.ud) q;
  select v::jsonb into d from app_config where k = 'informe_consumos_dest';
  return jsonb_build_object('fecha', f, 'lineas', L, 'resumen', R, 'dest', coalesce(d, '{}'::jsonb));
end $function$;

-- Reintenta el envío al Almacén de las líneas de HOY que fallaron (el Almacén no duplica: id lim_<OT>).
create or replace function public.consumos_reenviar(p_tok uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare r record; s text; rid bigint; n int := 0;
begin
  perform _admin(p_tok);
  perform _consumos_refresca();
  select v into s from config_int where k = 'consumo_limpieza';
  if s is null then raise exception 'FALTA_CLAVE'; end if;
  for r in select c.*, h.titulo as htit from consumos_registro c left join tareas_habituales h on h.id = c.habitual_id
            where c.fecha = (now() at time zone 'Europe/Madrid')::date and c.envio in ('fallo', 'sin_enviar') and c.cant > 0 loop
    rid := net.http_post(
      url := 'https://whemhkcrgwyjucpaswrm.supabase.co/rest/v1/rpc/alm_consumo_limpieza',
      headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'sb_publishable_hcFf66q2-0X6pR1gq5YKpw_u4G6HriG'),
      body := jsonb_build_object('p_secreto', s, 'p_art', r.alm_art, 'p_cant', r.cant, 'p_nota', 'Limpieza: ' || coalesce(r.htit, r.tarea), 'p_id', 'lim_' || r.ot_id::text));
    update consumos_registro set envio = 'pendiente', req_id = rid, envio_info = null where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $function$;

-- Cambiar a quién va el informe.
create or replace function public.consumos_dest_guardar(p_tok uuid, p jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare d jsonb := jsonb_build_object('nom', trim(coalesce(p->>'nom','')), 'email', trim(coalesce(p->>'email','')), 'tel', trim(coalesce(p->>'tel','')));
begin
  perform _admin(p_tok);
  insert into app_config (k, v) values ('informe_consumos_dest', d::text)
  on conflict (k) do update set v = excluded.v;
  return d;
end $function$;

revoke all on function public.consumos_dia(uuid, date) from public;
revoke all on function public.consumos_reenviar(uuid) from public;
revoke all on function public.consumos_dest_guardar(uuid, jsonb) from public;
revoke all on function public._consumos_refresca() from public, anon, authenticated;
grant execute on function public.consumos_dia(uuid, date) to anon, authenticated;
grant execute on function public.consumos_reenviar(uuid) to anon, authenticated;
grant execute on function public.consumos_dest_guardar(uuid, jsonb) to anon, authenticated;

-- Histórico: las OTs ya cerradas con artículo de almacén entran en el registro con su fecha de cierre.
insert into public.consumos_registro (ot_id, fecha, cuando, ot_titulo, habitual_id, tarea, alm_art, cant, hecho_por, hecho_por_n, envio, envio_info)
select o.id, (coalesce(o.fin, o.creado) at time zone 'Europe/Madrid')::date, coalesce(o.fin, o.creado), o.titulo, o.habitual_id, h.titulo, h.alm_art,
       case when trim(h.alm_cant::text) ~ '^[0-9]+([.,][0-9]+)?$' then replace(trim(h.alm_cant::text), ',', '.')::numeric end,
       coalesce(o.hecho_por, o.creado_por), w.nombre,
       case when o.consumo_enviado then 'enviado' else 'sin_enviar' end,
       case when o.consumo_enviado then null else 'cerrada antes del envío automático' end
  from public.ots o
  join public.tareas_habituales h on h.id = o.habitual_id
  left join public.trabajadores w on w.id = coalesce(o.hecho_por, o.creado_por)
 where o.estado = 'hecha' and not o.borrado and h.alm_art is not null
on conflict (ot_id) do nothing;
