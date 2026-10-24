# Apps MAPRI / CIE (Coladas, Almacén, Inicio, Limpieza)

- El código está en `src/` (ver `src/README.md`). Las páginas de la raíz (`*.html`) y `js/` se generan con `node build.mjs`: no editarlas a mano.
- Tras cambiar algo en `src/`: `node build.mjs`, luego `cd tests && npx playwright test`.
- Publicar: subir a la rama `dev` (`git push origin HEAD:dev`). GitHub Actions vuelve a montar, comprueba que coincide, pasa las pruebas y, si todo va bien, pasa a `main` (GitHub Pages).
- `node build.mjs --exacto DIR` genera las páginas sin comprimir y en línea (para comparar con versiones antiguas).
- Supabase: colada-mapri (`whemhkcrgwyjucpaswrm`, Coladas/Almacén/Inicio, colecciones `docs` con prefijo `alm_` para Almacén) y limpieza-cie (`uddejncrjcyyaxjocbpj`, Limpieza, funciones rpc con token).
- Errores de los usuarios: tabla `app_errores` en los dos proyectos.
