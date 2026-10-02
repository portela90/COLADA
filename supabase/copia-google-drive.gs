/**
 * Copia de seguridad nocturna de la Colada en Google Drive (gratis).
 * Se pega en https://script.google.com (Proyecto nuevo) y se usa así:
 *   1) Ejecuta  crearClave   → copia la clave que sale abajo y ponla en Supabase
 *      como secreto COPIA_TOKEN (Edge Functions → Secrets).
 *   2) Ejecuta  hacerCopia   → comprueba que aparece la carpeta «Colada - copias» en tu Drive.
 *   3) Ejecuta  activar      → a partir de ahí se hace sola cada noche.
 */
const URL_COPIA = "https://whemhkcrgwyjucpaswrm.supabase.co/functions/v1/copia";
const CARPETA = "Colada - copias";
const DIAS_GUARDADAS = 60;   // las copias más antiguas van a la papelera
const HORA = 3;              // hora aproximada de la copia (hora de Madrid)

function crearClave() {
  const k = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  PropertiesService.getScriptProperties().setProperty("CLAVE", k);
  Logger.log("Pon esta clave en Supabase como secreto COPIA_TOKEN:\n" + k);
}

function activar() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === "hacerCopia") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("hacerCopia").timeBased().everyDays(1).atHour(HORA).inTimezone("Europe/Madrid").create();
  Logger.log("Listo: la copia se hará cada noche hacia las " + HORA + ":00.");
}

function hacerCopia() {
  const clave = PropertiesService.getScriptProperties().getProperty("CLAVE");
  if (!clave) throw new Error("Primero ejecuta crearClave.");
  const r = UrlFetchApp.fetch(URL_COPIA, { method: "post", headers: { "x-copia-token": clave }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error("La app respondió " + r.getResponseCode() + ": " + r.getContentText().slice(0, 300));
  const J = JSON.parse(r.getContentText());
  const fotos = J.fotos_urls || {};
  delete J.fotos_urls;

  const raiz = carpeta_(DriveApp.getRootFolder(), CARPETA);
  const dirFotos = carpeta_(raiz, "fotos albaranes");

  // 1) los datos, un archivo por día (mismo formato que «Descargar copia completa»)
  const nombre = "colada-copia-" + Utilities.formatDate(new Date(), "Europe/Madrid", "yyyy-MM-dd") + ".json";
  const prev = raiz.getFilesByName(nombre);
  while (prev.hasNext()) prev.next().setTrashed(true);
  raiz.createFile(Utilities.newBlob(JSON.stringify(J), "application/json", nombre));

  // 2) las fotos de los albaranes: solo las nuevas
  const ya = {};
  const it = dirFotos.getFiles();
  while (it.hasNext()) ya[it.next().getName()] = 1;
  let nuevas = 0, fallos = 0;
  for (const id in fotos) {
    const nom = id + ".jpg";
    if (ya[nom]) continue;
    if (nuevas >= 300) break; // por si hay muchas: sigue la noche siguiente
    try {
      const f = UrlFetchApp.fetch(fotos[id], { muteHttpExceptions: true });
      if (f.getResponseCode() !== 200) { fallos++; continue; }
      guardar_(dirFotos, Utilities.newBlob(f.getContent(), "image/jpeg", nom));
      nuevas++;
    } catch (e) { fallos++; Logger.log("Foto " + id + ": " + e.message); }
  }

  // 3) borrar copias viejas
  const limite = Date.now() - DIAS_GUARDADAS * 864e5;
  const todas = raiz.getFiles();
  while (todas.hasNext()) {
    const f = todas.next();
    if (/^colada-copia-/.test(f.getName()) && f.getDateCreated().getTime() < limite) f.setTrashed(true);
  }
  Logger.log("Copia guardada: " + nombre + " · " + nuevas + " foto(s) nueva(s)" + (fallos ? " · " + fallos + " foto(s) se intentarán otra vez la próxima noche" : ""));
}

// Drive a veces falla un momento: se reintenta 3 veces
function guardar_(dir, blob) {
  for (let i = 1; ; i++) {
    try { return dir.createFile(blob); }
    catch (e) { if (i >= 3) throw e; Utilities.sleep(3000 * i); }
  }
}

function carpeta_(padre, nombre) {
  const it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}
