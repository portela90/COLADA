-- Incidencias del encargado: conversación (mensajes con foto opcional) entre el encargado y el jefe.
-- Lo ven y escriben los dos (_gestor). Cada mensaje avisa al otro al móvil.
-- Idempotente.

create table if not exists public.enc_incidencia_msg (
  id uuid primary key default gen_random_uuid(),
  incidencia uuid not null references public.enc_incidencia(id) on delete cascade,
  quien uuid not null references public.trabajadores(id),
  texto text,
  foto text,
  creado timestamptz not null default now()
);
create index if not exists enc_incidencia_msg_inc on public.enc_incidencia_msg(incidencia, creado);
alter table public.enc_incidencia_msg enable row level security;   -- sin políticas: solo se accede por las funciones

create or replace function public.enc_incidencia_msgs(p_tok uuid, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin perform _gestor(p_tok);
  return coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'quien',m.quien,'quien_n',w.nombre,'texto',m.texto,
                 'tiene_foto',m.foto is not null,'creado',m.creado) order by m.creado)
    from enc_incidencia_msg m join trabajadores w on w.id=m.quien where m.incidencia=p_id),'[]');
end $function$;

create or replace function public.enc_incidencia_msg_foto(p_tok uuid, p_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
begin perform _gestor(p_tok);
  return (select foto from enc_incidencia_msg where id=p_id);
end $function$;

create or replace function public.enc_incidencia_responder(p_tok uuid, p_id uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare t trabajadores; x enc_incidencia; m enc_incidencia_msg; dest uuid[];
begin t := _gestor(p_tok);
  select * into x from enc_incidencia where id=p_id and not borrado;
  if not found then raise exception 'NO_EXISTE'; end if;
  if nullif(trim(p->>'texto'),'') is null and nullif(p->>'foto','') is null then raise exception 'MENSAJE_VACIO'; end if;
  if p->>'foto' is not null and (p->>'foto' !~ '^data:image/(png|jpeg);base64,' or length(p->>'foto')>1500000) then raise exception 'ARCHIVO_TIPO'; end if;
  insert into enc_incidencia_msg(incidencia,quien,texto,foto) values (p_id,t.id,nullif(trim(p->>'texto'),''),p->>'foto') returning * into m;
  dest := array(select distinct u from unnest(_admins()||_encargados()) u where u<>t.id);
  if cardinality(dest)>0 then
    perform _avisar(jsonb_build_object('mensajes',jsonb_build_array(jsonb_build_object('trabajadores',dest,'tag','incm-'||m.id,
      'titulo','Incidencia '||x.tipo||' · '||split_part(t.nombre,' ',1),
      'texto',coalesce(left(m.texto,120),'Ha enviado una foto'),'url','encargado.html?i='||x.id))));
  end if;
  return jsonb_build_object('ok',true,'id',m.id);
end $function$;
