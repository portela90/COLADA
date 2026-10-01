# Colada · MAPRI

Control de coladas de aluminio (Nave 1 y Nave 2): entradas, consumos por relevo, almacén externo, granalla de cobre, máquinas, precios, plan de cargas y cierre de mes.

- Web estática (un solo `index.html`) publicada con GitHub Pages.
- Datos en Supabase (proyecto `colada-mapri`): tabla `docs` (colección/id → JSON), historial `docs_hist`, usuarios aprobados en `usuarios`, fotos de albaranes en el bucket privado `albaranes`.
- Se instala en el iPad/móvil como app («Añadir a pantalla de inicio»).
