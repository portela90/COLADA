-- Hornos (limpieza-cie): una pieza corregida no sale como «no ha llegado al Almacén» si sí ha llegado.
--
-- Por qué (17/11/2026, H-F66): al usar «Corregir», la pieza que se queda se vuelve a mandar al Almacén con la fecha del
-- cambio (12/11). La comprobación de envíos daba por perdido todo lo que llevaba más de 30 minutos «enviando…» contando
-- desde esa fecha, así que lo marcaba como fallo antes de mirar la respuesta, aunque el Almacén lo había recibido bien.
-- Ahora: si la respuesta del Almacén llega (o ya estaba), se marca como enviado aunque antes se hubiera dado por fallo.
--
-- Pegar ENTERO en el SQL Editor de limpieza-cie (uddejncrjcyyaxjocbpj) y pulsar Run.

begin;

do $$ begin
  if to_regclass('public.consumos_horno') is null then
    raise exception 'Esto va en el proyecto limpieza-cie (uddejncrjcyyaxjocbpj). No se ha cambiado nada.';
  end if;
end $$;

create or replace function public._consumos_horno_refresca()
 returns void language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
begin
  -- lo que tiene respuesta del Almacén: enviado o fallo según la respuesta (también lo dado por perdido sin respuesta)
  update consumos_horno r
     set envio = case when x.status_code between 200 and 299 then 'enviado' else 'fallo' end,
         envio_info = case when x.status_code between 200 and 299 then null else left(coalesce(x.error_msg, x.content::text, 'error ' || x.status_code), 200) end
    from net._http_response x
   where x.id = r.req_id
     and (r.envio = 'pendiente' or (r.envio = 'fallo' and r.envio_info = 'sin respuesta del Almacén'));
  update consumos_horno set envio = 'fallo', envio_info = 'sin respuesta del Almacén'
   where envio = 'pendiente' and cuando < now() - interval '30 minutes';
end $function$;

select public._consumos_horno_refresca();

commit;

-- Comprobación: el cono del H-F66 corregido tiene que salir «enviado»
select horno, accion, alm_art, cant, envio from consumos_horno where horno = 'H-F66' and fecha = '2026-11-12' and envio <> 'anulado' order by id;
