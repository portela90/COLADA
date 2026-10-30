// Montaje de las apps: junta las piezas de src/ y genera las páginas que se publican (index.html, almacen.html…).
//
//   node build.mjs              → genera las páginas comprimidas en la raíz (lo que se publica)
//   node build.mjs --exacto DIR → genera en DIR las páginas sin comprimir y con todo en línea,
//                                 tal cual eran antes de separar el código (sirve para comprobar que no se pierde nada)
//
// Cada página sale de src/<app>/pagina.html. Dentro, unas marcas dicen qué piezas van en cada sitio:
//   <!--@estilo a.css b.css-->                   → <style> con esos archivos, uno detrás de otro
//   <!--@guion js/01.js js/02.js-->              → <script> en línea con esas piezas
//   <!--@guion externo NOMBRE js/01.js js/02.js--> → archivo js/NOMBRE.<huella>.js aparte (se guarda en caché del móvil)
// Las piezas de JS de una app son trozos seguidos de un mismo programa: juntas, en orden, forman el código completo.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { transform } from "esbuild";

const RAIZ = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(RAIZ, "src");
const PAGINAS = { "index.html": "coladas", "almacen.html": "almacen", "inicio.html": "inicio", "limpieza.html": "limpieza",
  "encargado.html": "encargado", "calendario.html": "calendario", "toolbox.html": "toolbox", "hornos.html": "hornos" };
const COMUNES = ["errlog.js", "offline.js", "graficos.js", "escaner.js"];

const args = process.argv.slice(2);
const exacto = args[0] === "--exacto";
const SALIDA = exacto ? path.resolve(args[1] || "salida-exacta") : RAIZ;
const huella = t => crypto.createHash("sha256").update(t).digest("hex").slice(0, 10);
const lee = (app, f) => fs.readFileSync(path.join(SRC, app, f), "utf8");
const junta = (app, lista) => lista.split(/\s+/).filter(Boolean).map(f => lee(app, f)).join("");
const comprime = async (code, loader) => (await transform(code, { loader, minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false, legalComments: "none", charset: "utf8" })).code.trim();

async function pagina(fichero, app) {
  let html = lee(app, "pagina.html");
  const trozos = [], marca = /<!--@(estilo|guion)( externo (\S+))? ([^>]*?)-->/g;
  let m, ultimo = 0, out = "";
  while ((m = marca.exec(html))) {
    out += html.slice(ultimo, m.index); ultimo = marca.lastIndex;
    const [, tipo, ext, nombre, lista] = m, codigo = junta(app, lista);
    if (exacto) { out += tipo === "estilo" ? "<style>" + codigo + "</style>" : "<script>" + codigo + "</script>"; continue; }
    if (tipo === "estilo") { out += "<style>" + await comprime(codigo, "css") + "</style>"; continue; }
    const min = await comprime(codigo, "js");
    if (!ext) { out += "<script>" + min + "</script>"; continue; }
    const f = "js/" + nombre + "." + huella(min) + ".js";
    trozos.push([f, "/* " + nombre + " · generado con build.mjs desde src/ — no editar aquí */\n" + min + "\n"]);
    out += '<script src="' + f + '"></script>';
  }
  out += html.slice(ultimo);
  if (!exacto) {
    /* versión de la página = huella de su contenido (la usa el aviso de versión nueva) */
    out = out.replace(/<meta name="build" content="[^"]*">/, '<meta name="build" content="' + huella(out.replace(/<meta name="build" content="[^"]*">/, "")) + '">');
    out = out.replace(/^<!doctype html>/i, s => s + "<!-- Generado con build.mjs a partir de src/" + app + "/ — no edites este archivo, edita src/ -->");
  }
  fs.writeFileSync(path.join(SALIDA, fichero), out);
  for (const [f, t] of trozos) fs.writeFileSync(path.join(SALIDA, f), t);
  return { fichero, bytes: out.length + trozos.reduce((s, [, t]) => s + t.length, 0) };
}

fs.mkdirSync(SALIDA, { recursive: true });
fs.rmSync(path.join(SALIDA, "js"), { recursive: true, force: true });
fs.mkdirSync(path.join(SALIDA, "js"), { recursive: true });
const res = [];
for (const [f, app] of Object.entries(PAGINAS)) res.push(await pagina(f, app));
for (const f of COMUNES) {
  const t = fs.readFileSync(path.join(SRC, "comun", f), "utf8");
  fs.writeFileSync(path.join(SALIDA, f), exacto ? t : "/* " + f + " · generado con build.mjs desde src/comun/ — no editar aquí */\n" + await comprime(t, "js") + "\n");
}
for (const r of res) console.log((r.bytes / 1024).toFixed(0).padStart(6) + " KB  " + r.fichero);
