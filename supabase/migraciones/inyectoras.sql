-- =====================================================================
-- CONTROL DE LIMPIEZA DE INYECTORAS — limpieza-cie
--   · Nuevo tipo de elemento 'inyectora' (como los hornos mantenedores).
--   · Alta de las inyectoras de Nave 1 y Nave 2 (código = F4, F52…; sin frecuencia).
--   · Los trabajos «Limpieza F52», «Limpiar F62…» (del Excel del finde o a mano)
--     se enlazan solos con su inyectora, así cuentan como limpieza en su ficha.
--   · La ficha (al escanear el QR) ofrece terminar el trabajo pendiente de hoy
--     en vez de abrir otro.
-- =====================================================================
alter table public.elementos drop constraint if exists elementos_tipo_check;
alter table public.elementos add constraint elementos_tipo_check check (tipo = any (array['molde','horno','contenedor','inyectora','otro']));

insert into public.elementos(tipo,codigo,nombre,lugar,frecuencia_dias,minutos_est,activo,puntos)
select 'inyectora', c, c, n, null, null, true, '[]'::jsonb
from (values ('F4','Nave 1'),('F10','Nave 1'),('F15','Nave 1'),('F16','Nave 1'),('F19','Nave 1'),('F20','Nave 1'),('F21','Nave 1'),('F22','Nave 1'),
             ('F25','Nave 1'),('F27','Nave 1'),('F28','Nave 1'),('F29','Nave 1'),('F30','Nave 1'),('F31','Nave 1'),('F32','Nave 1'),('F33','Nave 1'),('F34','Nave 1'),
             ('F51','Nave 2'),('F52','Nave 2'),('F53','Nave 2'),('F54','Nave 2'),('F55','Nave 2'),('F56','Nave 2'),('F61','Nave 2'),('F62','Nave 2'),
             ('F63','Nave 2'),('F64','Nave 2'),('F65','Nave 2'),('F66','Nave 2'),('F67','Nave 2')) v(c,n)
where not exists (select 1 from public.elementos e where e.tipo='inyectora' and upper(e.codigo)=v.c and not e.borrado);

-- Enlace automático trabajo → inyectora
create or replace function public._ot_enlaza_inyectora() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare n text; eid uuid;
begin
  if new.elemento_id is null and lower(coalesce(new.titulo,'')) ~ '^\s*limpi'
     and lower(new.titulo) !~ '(horno|mantenedor|tolva|cono|derrame|fuga|lubrific)' then
    n := (regexp_match(lower(new.titulo),'(?:^|[^a-z0-9])f-?0*(\d+)(?=[^0-9]|$)'))[1];
    if n is not null then
      select id into eid from elementos where tipo='inyectora' and not borrado and upper(codigo)='F'||n limit 1;
      new.elemento_id := eid;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists ot_enlaza_inyectora on public.ots;
create trigger ot_enlaza_inyectora before insert or update of titulo on public.ots
  for each row execute function public._ot_enlaza_inyectora();
-- los trabajos que ya había
update public.ots set titulo=titulo where elemento_id is null and lower(titulo) ~ '^\s*limpi' and lower(titulo) ~ '(^|[^a-z0-9])f-?\d';

-- Ficha: también ofrece terminar el trabajo pendiente de hoy (o atrasado) que pueda ver
create or replace function public.elemento_ficha(p_tok uuid, p_cod text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare t trabajadores; e elementos;
begin t:=_yo(p_tok);
  select * into e from elementos where not borrado and (upper(codigo)=upper(trim(p_cod)) or id::text=p_cod) limit 1;
  if not found then raise exception 'NO_EXISTE_EL'; end if;
  return _eljson(e) || jsonb_build_object(
    'abierta',(select _otjson(o) from ots o where o.elemento_id=e.id and not o.borrado
                 and (o.estado='en_curso' and t.id=any(o.asignados)
                      or e.tipo='inyectora' and o.estado='pendiente' and o.fecha<=_hoy() and coalesce(o.accion_horno,'limpieza')='limpieza' and _ve(t,o))
                 order by (o.estado='en_curso') desc, o.fecha desc, o.creado desc limit 1),
    'historial',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'fin',o.fin,'quien',w.nombre,'accion',coalesce(o.accion_horno,'limpieza'),'motivo',o.motivo,'min',case when o.inicio is not null then round(extract(epoch from (o.fin-o.inicio))/60) end,'nota',o.nota,'nfotos',(select count(*) from fotos f where f.ot_id=o.id),'resultado',o.resultado) order by o.fin desc),'[]'::jsonb)
       from (select * from ots o where o.elemento_id=e.id and o.estado='hecha' and not o.borrado order by o.fin desc limit 30) o left join trabajadores w on w.id=o.hecho_por),
    'ult',(select coalesce(jsonb_object_agg(s.a,s.j),'{}'::jsonb) from (select distinct on (coalesce(o.accion_horno,'limpieza')) coalesce(o.accion_horno,'limpieza') a, jsonb_build_object('fin',o.fin,'quien',w.nombre,'motivo',o.motivo,'nota',o.nota) j from ots o left join trabajadores w on w.id=o.hecho_por where o.elemento_id=e.id and o.estado='hecha' and not o.borrado order by coalesce(o.accion_horno,'limpieza'), o.fin desc nulls last) s));
end $$;

-- Puntos de checklist (grupos «al terminar trabajos») para «Ya está limpio» desde la ficha
create or replace function public.check_el_puntos(p_tok uuid, p_el uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare e elementos; o ots;
begin perform _yo(p_tok); select * into e from elementos where id=p_el and not borrado; if not found then raise exception 'NO_EXISTE_EL'; end if;
  o.titulo := 'Limpieza '||case when e.tipo='otro' or lower(e.nombre) like e.tipo||'%' then '' else e.tipo||' ' end||e.nombre;
  return coalesce((select jsonb_agg(jsonb_build_object('grupo',grupo,'texto',texto,'tipo',tipo,'ayuda',ayuda,'minimo',minimo,'foto_si_mal',foto_si_mal) order by orden)
    from enc_check_punto where activo and donde='trabajos' and _check_casa(aplica,o)),'[]');
end $$;
grant execute on function public.check_el_puntos(uuid, uuid) to anon, authenticated;
