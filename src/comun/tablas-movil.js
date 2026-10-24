/* Tablas en el móvil: si una tabla no cabe a lo ancho, cada fila pasa a verse como una ficha
   (el primer dato arriba y el resto debajo, cada uno con el nombre de su columna).
   En la tablet y el ordenador no cambia nada. Funciona solo, también con las tablas que se añadan más adelante. */
(function () {
  if (window.TABLAS_MOVIL) return;
  var MQ = window.matchMedia ? matchMedia("(max-width:600px)") : null;
  function etiquetas(t) {
    var th = t.tHead && t.tHead.rows.length ? t.tHead.rows[t.tHead.rows.length - 1].cells : null, L = [];
    if (!th) return null;
    for (var i = 0; i < th.length; i++) { var n = th[i].colSpan || 1; for (var k = 0; k < n; k++) L.push((th[i].textContent || "").trim()); }
    return L;
  }
  function pon(t) {
    var L = etiquetas(t); if (!L) return;
    for (var b = 0; b < t.tBodies.length; b++) for (var r = 0; r < t.tBodies[b].rows.length; r++) {
      var c = t.tBodies[b].rows[r].cells, col = 0;
      for (var j = 0; j < c.length; j++) {
        if ((c[j].colSpan || 1) > 1) c[j].classList.add("tm-ancha"); else if (L[col]) c[j].setAttribute("data-l", L[col]);
        col += c[j].colSpan || 1;
      }
    }
    t.classList.add("tm");
  }
  function revisa() {
    var movil = MQ ? MQ.matches : window.innerWidth <= 600;
    var T = document.querySelectorAll(".tw > table");
    for (var i = 0; i < T.length; i++) {
      var t = T[i], w = t.parentElement;
      if (!movil) { t.classList.remove("tm"); continue; }
      if (t.classList.contains("tm")) { pon(t); continue; } /* filas nuevas en una tabla que ya es ficha */
      if (t.hasAttribute("data-sin-fichas") || t.classList.contains("plan-ent")) continue; /* ya tienen su forma propia en el móvil */
      if (w.clientWidth && w.scrollWidth > w.clientWidth + 2) pon(t);
    }
  }
  var pend = false;
  function luego() { if (pend) return; pend = true; requestAnimationFrame(function () { pend = false; try { revisa(); } catch (e) {} }); }
  function arranca() {
    luego();
    try { new MutationObserver(luego).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
    window.addEventListener("resize", function () { var T = document.querySelectorAll("table.tm"); for (var i = 0; i < T.length; i++) T[i].classList.remove("tm"); luego(); });
  }
  if (document.body) arranca(); else document.addEventListener("DOMContentLoaded", arranca);
  window.TABLAS_MOVIL = { revisa: revisa };
})();
