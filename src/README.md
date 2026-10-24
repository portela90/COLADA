# Código de las apps

Aquí está el código de verdad. Las páginas de la raíz (`index.html`, `almacen.html`, `limpieza.html`…) y la carpeta `js/`
**se generan** a partir de esta carpeta con `node build.mjs`. No se editan a mano: cualquier cambio en ellas se pierde
la próxima vez que se monte.

## Carpetas

| Carpeta | App | Página que genera |
|---|---|---|
| `coladas/` | Coladas (aluminio) | `index.html` |
| `almacen/` | Almacén (consumibles, pistones, ejes, inyectoras) | `almacen.html` |
| `inicio/` | Inicio (mosaicos) | `inicio.html` |
| `limpieza/` | Limpieza CIE | `limpieza.html` |
| `encargado/`, `calendario/`, `toolbox/` | Partes de Limpieza | `encargado.html`, `calendario.html`, `toolbox.html` |
| `comun/` | Lo que comparten varias apps | — |

En cada app:

- `pagina.html` — el esqueleto de la página. Unas marcas `<!--@estilo …-->` y `<!--@guion …-->` dicen dónde va cada pieza.
- `estilos.css`, `tema-sap.css`, `acceso.css` — los estilos.
- `js/00-principio.js`, `js/01-….js`… — el programa, en piezas por tema. **Son trozos seguidos de un mismo programa**:
  juntas en orden forman el código completo (por eso la primera abre `(function(){` y la última la cierra).

En `comun/`:

- `supabase-web.js` — la conexión con Supabase, el acceso, el historial y deshacer, los avisos al móvil. La usan Coladas, Almacén e Inicio.
- `offline.js` — el modo sin conexión (guardar en el móvil y enviar al volver la red).
- `errlog.js` — el registro de errores.
- `graficos.js` — los gráficos (ECharts).
- `escaner.js` — el escáner de QR y códigos de barras.
- `aviso-version.js` — el aviso de «hay una versión nueva».
- `base.css` — lo mínimo para que la página no parpadee al cargar.

## Montar

```
npm install          # la primera vez
node build.mjs       # genera las páginas comprimidas en la raíz
node build.mjs --exacto salida-exacta   # las genera sin comprimir y con todo en línea (para comparar)
```

GitHub comprueba en cada cambio que lo publicado sale de `src/` (vuelve a montar y mira que no cambie nada) y pasa las
pruebas de `tests/` sobre las páginas montadas. Si algo falla, no se publica.
