-- Limpieza (limpieza-cie) → Almacén (colada-mapri): decir siempre que las funciones están en el esquema «public».
--
-- Por qué: el 12/11/2026 (hacia las 17:00) se añadió el esquema «nucleo» a «Exposed schemas» de colada-mapri para
-- la app nueva. Desde entonces el esquema por defecto de la API de colada-mapri es «graphql_public», y los envíos
-- que hace la base de datos de Limpieza (pg_net, sin decir esquema) dan 404:
--   «Searched for the function graphql_public.alm_consumo_limpieza …»
-- Afecta a: consumos de aceites y taladrinas, consumos de hornos, correcciones, borrados y la copia de precios.
-- Las apps (navegador) no fallan porque ya dicen el esquema en cada llamada.
--
-- Qué hace: añade la cabecera «Content-Profile: public» a todas las funciones de Limpieza que llaman a
-- colada-mapri. No cambia nada más (mismo código, mismos permisos y dueño). Se puede pegar dos veces sin problema.
-- Pegar en el SQL Editor de limpieza-cie (uddejncrjcyyaxjocbpj).

do $$
declare f record; d text; n int := 0;
begin
  for f in
    select p.oid, p.proname
      from pg_proc p join pg_namespace s on s.oid = p.pronamespace
     where s.nspname = 'public'
       and p.prosrc like '%whemhkcrgwyjucpaswrm.supabase.co/rest/v1/rpc/%'
       and p.prosrc not like '%Content-Profile%'
  loop
    d := pg_get_functiondef(f.oid);
    d := replace(d, $t$'Content-Type', 'application/json', 'apikey'$t$,
                    $t$'Content-Type', 'application/json', 'Content-Profile', 'public', 'apikey'$t$);
    if d not like '%Content-Profile%' then
      raise exception 'La función % no tiene la forma esperada: no se ha cambiado nada', f.proname;
    end if;
    execute d;
    n := n + 1;
  end loop;
  raise notice 'Funciones arregladas: %', n;
end $$;

-- Comprobación: todas deben salir con «arreglada = true» (son 8)
select p.proname as funcion, p.prosrc like '%Content-Profile%' as arreglada
  from pg_proc p join pg_namespace s on s.oid = p.pronamespace
 where s.nspname = 'public' and p.prosrc like '%whemhkcrgwyjucpaswrm.supabase.co/rest/v1/rpc/%'
 order by 1;
