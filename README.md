# Colada · MAPRI

Control de coladas de aluminio (Nave 1 y Nave 2): entradas, consumos por relevo, almacén externo, granalla de cobre, máquinas, precios, plan de cargas y cierre de mes.

- Web estática (un solo `index.html`) publicada con GitHub Pages.
- Datos en Supabase (proyecto `colada-mapri`): tabla `docs` (colección/id → JSON), historial `docs_hist`, usuarios aprobados en `usuarios`, fotos de albaranes en el bucket privado `albaranes`.
- Se instala en el iPad/móvil como app («Añadir a pantalla de inicio»).

## Almacén

`almacen.html`: almacén de consumibles, pistones y ejes (antes artefacto «Almacén MAPRI»). Mismo inicio de sesión que la Colada; sus datos van en la tabla `docs` con el prefijo `alm_`. La pestaña «Apuntar» permite escribir o dictar lo que ha pasado y la IA lo rellena.

## Toolbox HSE

`toolbox.html`: Toolbox Talk mensuales (SH-CORP-FO-IB-031) firmados en el móvil. Usa la misma sesión que `limpieza.html` (proyecto Supabase `limpieza-cie`, tablas `prl_*`, script en `supabase/migraciones/toolbox_prl.sql`). El jefe envía el Toolbox del mes, a cada operario le llega un aviso y firma con el dedo; el jefe descarga el PDF con el formato oficial para prevención. Fotos de cada mes en `img/toolbox/`.
