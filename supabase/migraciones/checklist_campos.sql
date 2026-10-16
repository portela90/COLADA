-- =====================================================================
-- CHECKLIST DEL ENCARGADO: tipos de respuesta por punto — limpieza-cie
--   tipo 'ok'  → Bien / Mal / No aplica
--   tipo 'num' → un número (p. ej. cajas de guantes que quedan); si baja del mínimo cuenta como problema
--   tipo 'txt' → texto libre
-- =====================================================================
alter table public.enc_check_punto add column if not exists tipo text not null default 'ok';
alter table public.enc_check_punto add column if not exists ayuda text;
alter table public.enc_check_punto add column if not exists minimo numeric;
alter table public.enc_check_punto add column if not exists foto_si_mal boolean not null default false;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='enc_check_punto_tipo_chk') then
    alter table public.enc_check_punto add constraint enc_check_punto_tipo_chk check (tipo in ('ok','num','txt'));
  end if; end $$;

create or replace function public.enc_puntos_guardar(p_tok uuid, p_items jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare i jsonb; n int := 0; ids uuid[] := '{}'; nid uuid; tp text;
begin perform _admin(p_tok);
  for i in select * from jsonb_array_elements(coalesce(p_items,'[]')) loop
    n := n+1;
    if coalesce(trim(i->>'texto'),'')='' then continue; end if;
    tp := coalesce(nullif(i->>'tipo',''),'ok'); if tp not in ('ok','num','txt') then tp:='ok'; end if;
    if nullif(i->>'id','') is not null and exists(select 1 from enc_check_punto where id=(i->>'id')::uuid) then
      update enc_check_punto set grupo=coalesce(nullif(trim(i->>'grupo'),''),'General'), texto=trim(i->>'texto'), orden=n, activo=true,
        tipo=tp, ayuda=nullif(trim(i->>'ayuda'),''), minimo=case when tp='num' then nullif(i->>'minimo','')::numeric end, foto_si_mal=coalesce((i->>'foto_si_mal')::boolean,false)
      where id=(i->>'id')::uuid returning id into nid;
    else
      insert into enc_check_punto(grupo,texto,orden,tipo,ayuda,minimo,foto_si_mal)
      values (coalesce(nullif(trim(i->>'grupo'),''),'General'), trim(i->>'texto'), n, tp, nullif(trim(i->>'ayuda'),''),
        case when tp='num' then nullif(i->>'minimo','')::numeric end, coalesce((i->>'foto_si_mal')::boolean,false)) returning id into nid;
    end if;
    ids := ids || nid;
  end loop;
  update enc_check_punto set activo=false where not (id = any(ids));
  return enc_puntos(p_tok);
end $$;

create or replace function public.enc_check_ver(p_tok uuid, p_fecha date) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare c enc_check;
begin perform _gestor(p_tok);
  select * into c from enc_check where fecha=p_fecha;
  return jsonb_build_object('fecha',p_fecha,
    'puntos',coalesce((select jsonb_agg(jsonb_build_object('id',id,'grupo',grupo,'texto',texto,'tipo',tipo,'ayuda',ayuda,'minimo',minimo,'foto_si_mal',foto_si_mal) order by orden) from enc_check_punto where activo),'[]'),
    'check',case when c.id is null then null else to_jsonb(c)||jsonb_build_object('hecho_por_n',(select nombre from trabajadores where id=c.hecho_por)) end);
end $$;

-- Propuesta adaptada a CIE (solo si la lista inicial no se ha tocado y no hay checklists hechos)
do $$ begin
if (select count(*) from enc_check)=0 and (select count(*) from enc_check_punto)=17
   and exists(select 1 from enc_check_punto where texto='Hay guantes, gafas, mascarillas y tapones suficientes') then
  delete from enc_check_punto;
  insert into enc_check_punto(grupo,texto,orden,tipo,ayuda,minimo,foto_si_mal) values
   ('Seguridad y EPIs','Cajas de guantes que quedan en el almacén',1,'num','Cuenta las cajas sin abrir',3,false),
   ('Seguridad y EPIs','Gafas, mascarillas y tapones suficientes',2,'ok',null,null,false),
   ('Seguridad y EPIs','Botiquín completo y accesible',3,'ok',null,null,false),
   ('Seguridad y EPIs','Extintores, salidas de emergencia y lavaojos sin obstruir',4,'ok',null,null,true),
   ('Seguridad y EPIs','Pasillos Nave 1 y Nave 2 sin derrames de aceite o taladrina',5,'ok','Si hay derrame: absorbente y avisa con incidencia',null,true),
   ('Inyectoras y zonas','Canaletas y alrededor de las inyectoras limpias',6,'ok','Si alguna queda mal, pon cuál en la nota (p. ej. F28)',null,true),
   ('Inyectoras y zonas','Canaleta del contenedor de viruta limpia',7,'ok',null,null,false),
   ('Inyectoras y zonas','Bandejas de escoria vaciadas',8,'ok',null,null,false),
   ('Inyectoras y zonas','Retenedores de aceites y taladrinas vaciados (Nave 1 y 2)',9,'ok',null,null,false),
   ('Inyectoras y zonas','Zona MORIZ y BROTHER limpia',10,'ok',null,null,false),
   ('Inyectoras y zonas','Alrededor de los hornos de fusión Nave 1 y Nave 2 sin escoria en el suelo',11,'ok',null,null,true),
   ('Productos y bidones','Taladrinas con nivel suficiente (Servol 353 y Ecocool MS 831)',12,'ok','Si alguno está casi vacío, ponlo en la nota',null,false),
   ('Productos y bidones','GRG de aceite de la zona centralizada Nave 2 con nivel suficiente',13,'ok','Metalform V 106, Avilub HLP-M 46, Besterm HT, Avilub Gear EP 220',null,false),
   ('Productos y bidones','Jabón y desmoldeante con nivel suficiente (Cimclean PC240, Bonderite, Chem-Trend SU-124)',14,'ok',null,null,false),
   ('Productos y bidones','Sacas blancas que quedan',15,'num',null,5,false),
   ('Productos y bidones','Material absorbente para derrames disponible',16,'ok',null,null,false),
   ('Productos y bidones','Productos químicos cerrados, etiquetados y en su sitio',17,'ok',null,null,false),
   ('Máquinas y herramientas','Fregadora: batería cargando, depósitos vaciados y limpios',18,'ok',null,null,true),
   ('Máquinas y herramientas','Aspiradora e hidrolimpiadora funcionando y recogidas',19,'ok',null,null,true),
   ('Máquinas y herramientas','Herramientas recogidas (espátulas, palas, martillo, cincel)',20,'ok',null,null,false),
   ('Máquinas y herramientas','Ninguna máquina averiada sin avisar',21,'ok','Si hay alguna, crea una incidencia',null,false),
   ('Basuras','Basuras de Nave 1 y Nave 2 vaciadas',22,'ok',null,null,false),
   ('Basuras','Cartón, plástico y madera retirados a su contenedor',23,'ok',null,null,false),
   ('Cierre','Cuarto de limpieza ordenado y cerrado con llave',24,'ok',null,null,false),
   ('Cierre','Luces, grifos y cargadores revisados al salir',25,'ok',null,null,false);
end if; end $$;
