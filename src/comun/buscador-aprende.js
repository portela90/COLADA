/* El buscador aprende: guarda las preguntas (y si sirvieron), las palabras que se le enseñan
   y saca arriba las preguntas que más usa cada uno. Todo en Supabase (tablas consultas_log y sinonimos).
   Sin conexión o en las pruebas no hace nada y el buscador funciona igual. */
(function () {
  if (window.BuscaAprende) return;
  const nz = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ø/g, "").replace(/[^a-z0-9ñ\s.-]/g, " ").replace(/\s+/g, " ").trim();
  const h = (t, a, k) => { const n = document.createElement(t); if (a) for (const p in a) { if (p === "class") n.className = a[p]; else if (p === "text") n.textContent = a[p]; else if (p.slice(0, 2) === "on") n.addEventListener(p.slice(2), a[p]); else if (a[p] != null) n.setAttribute(p, a[p]); } (k || []).forEach(c => c && n.appendChild(c)); return n; };
  const sb = () => window.sbColada && window.sbColada.from ? window.sbColada : null;
  const S = { sin: {}, top: [], cargado: {}, ultimo: null, tim: null, pend: null };
  async function cargar(app) {
    const c = sb(); if (!c || S.cargado[app]) return; S.cargado[app] = true;
    try { const r = await c.from("sinonimos").select("palabra,significa").eq("app", app); if (!r.error) (r.data || []).forEach(x => { S.sin[app + "|" + nz(x.palabra)] = nz(x.significa); }); } catch (e) {}
    try { const r = await c.from("consultas_log").select("q,util,entendida").eq("app", app).order("creado", { ascending: false }).limit(400);
      if (!r.error) { const n = {}, orig = {}; (r.data || []).forEach(x => { if (x.util === -1 || !x.entendida) return; const k = nz(x.q); if (k.length < 6) return; n[k] = (n[k] || 0) + 1; if (!orig[k]) orig[k] = x.q; });
        S.top = Object.entries(n).filter(x => x[1] >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => orig[x[0]]); } } catch (e) {}
  }
  /* cambia las palabras enseñadas por lo que significan (frases enteras, de más larga a más corta) */
  function aplicar(app, q) {
    let t = " " + nz(q) + " ";
    Object.keys(S.sin).filter(k => k.startsWith(app + "|")).map(k => k.slice(app.length + 1)).sort((a, b) => b.length - a.length)
      .forEach(p => { const re = new RegExp("(^|\\s)" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=\\s|$)", "g"); t = t.replace(re, "$1" + S.sin[app + "|" + p]); });
    return t.trim();
  }
  /* se guarda la pregunta cuando se deja de escribir (no cada letra) */
  function registrar(app, q, modo, ignoradas) {
    const c = sb(); if (!c) return; clearTimeout(S.tim); S.ultimo = null;
    const qq = String(q || "").trim().slice(0, 300); if (nz(qq).length < 4) return;
    S.tim = setTimeout(async () => { try { const r = await c.from("consultas_log").insert({ app, q: qq, modo: modo || null, entendida: !(ignoradas && ignoradas.length) && modo !== "nada", ignoradas: (ignoradas || []).slice(0, 10) }).select("id").single(); if (!r.error && r.data) S.ultimo = r.data.id; } catch (e) {} }, 2500);
  }
  async function votar(v, btn) {
    const c = sb(); if (!c) return;
    for (let i = 0; i < 10 && !S.ultimo; i++) await new Promise(r => setTimeout(r, 400));
    if (!S.ultimo) return;
    try { await c.from("consultas_log").update({ util: v }).eq("id", S.ultimo); if (btn) { btn.parentNode.textContent = v > 0 ? "Gracias. Lo tendré en cuenta." : "Apuntado: lo revisaré para que la próxima vez conteste mejor."; } } catch (e) {}
  }
  /* «¿Te ha servido?» debajo de cada respuesta */
  function votoUI() {
    if (!sb()) return null;
    const box = h("div", { class: "ba-voto" }, [h("span", { class: "sub", text: "¿Te ha servido?" })]);
    box.appendChild(h("button", { type: "button", class: "ba-b", text: "👍 Sí", onclick: e => votar(1, e.currentTarget) }));
    box.appendChild(h("button", { type: "button", class: "ba-b", text: "👎 No es lo que quería", onclick: e => votar(-1, e.currentTarget) }));
    return box;
  }
  /* enseñar una palabra que no ha entendido */
  function ensenarUI(app, palabras, ideas, alGuardar) {
    if (!sb() || !palabras || !palabras.length) return null;
    const p0 = palabras[0], box = h("div", { class: "ba-ens" });
    const inp = h("input", { type: "text", class: "ba-in", placeholder: "Qué quiere decir…", "aria-label": "Qué quiere decir «" + p0 + "»", autocomplete: "off" });
    const guarda = async v => { v = String(v || "").trim(); if (!v) return; const c = sb();
      try { const r = await c.from("sinonimos").upsert({ app, palabra: nz(p0), significa: v }); if (r.error) throw r.error; S.sin[app + "|" + nz(p0)] = nz(v); box.textContent = "Aprendido: «" + p0 + "» = «" + v + "»."; if (alGuardar) alGuardar(); }
      catch (e) { box.textContent = "No se ha podido guardar (solo pueden enseñar palabras los usuarios con acceso completo)."; } };
    box.appendChild(h("div", { class: "ba-t", text: "Enséñame: ¿qué quiere decir «" + p0 + "»?" }));
    if (ideas && ideas.length) box.appendChild(h("div", { class: "ba-ideas" }, ideas.slice(0, 10).map(t => h("button", { type: "button", class: "ba-b", text: t, onclick: () => guarda(t) }))));
    box.appendChild(h("div", { class: "ba-fila" }, [inp, h("button", { type: "button", class: "ba-b ba-ok", text: "Guardar", onclick: () => guarda(inp.value) })]));
    inp.addEventListener("keydown", e => { if (e.key === "Enter") guarda(inp.value); });
    return box;
  }
  /* las preguntas que más hace cada uno */
  /* una sola fila de botones pequeños que se desliza de lado: no ocupa más que una línea */
  function topUI(alElegir) {
    if (!S.top.length) return null;
    const cap = t => { t = String(t || "").trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
    return h("div", { class: "ba-top", role: "group", "aria-label": "Tus preguntas habituales" }, [h("span", { class: "ba-top-t", text: "Habituales" })].concat(S.top.slice(0, 5).map(q => h("button", { type: "button", class: "ba-top-q", title: cap(q), text: cap(q), onclick: () => alElegir(q) }))));
  }
  /* después de pintar una respuesta: ofrece enseñar lo que no entendió, la guarda y pone «¿Te ha servido?» */
  function tras(app, res, q, ideas, repintar) {
    if (!nz(q) || !res) return;
    const hint = [...res.querySelectorAll("p,div")].find(n => !n.children.length && /No (he encontrado|encuentro) «/.test(n.textContent));
    const pal = hint ? [...hint.textContent.matchAll(/«([^»]+)»/g)].map(m => m[1]).filter(w => w.length > 1 && !/\s/.test(w)) : [];
    if (pal.length) { const u = ensenarUI(app, pal, ideas, repintar); if (u) hint.after(u); }
    const vacio = /No hay (ninguno|nada) que cumpla/.test(res.textContent);
    const b = res.querySelector("b"); registrar(app, q, vacio ? "nada" : (b ? b.textContent.slice(0, 60) : null), pal);
    const v = votoUI(); if (v) res.appendChild(v);
  }
  window.BuscaAprende = { tras, cargar, aplicar, registrar, votoUI, ensenarUI, topUI, nz, estado: S };
  const css = document.createElement("style");
  css.textContent = ".ba-voto{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:12px 0 4px;font-size:14px}.ba-b{appearance:none;font:inherit;font-size:14px;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:var(--surf2);color:var(--ink);cursor:pointer}" +
    ".ba-ens{border:1px dashed var(--acc);border-radius:10px;padding:10px 12px;margin:8px 0;display:grid;gap:8px;font-size:14px}.ba-t{font-weight:600}.ba-ideas{display:flex;flex-wrap:wrap;gap:6px}.ba-fila{display:flex;gap:6px}.ba-in{flex:1;min-width:0;font:inherit;font-size:16px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surf);color:var(--ink)}.ba-ok{background:var(--acc);color:var(--acc-ink);border-color:var(--acc)}" +
    ".ba-top{display:flex;flex:1 1 100%;min-width:0;max-width:100%;box-sizing:border-box;gap:6px;align-items:center;overflow-x:auto;overflow-y:hidden;white-space:nowrap;margin:2px 0 6px;padding:2px 0 4px;scrollbar-width:none;-webkit-overflow-scrolling:touch;width:100%}.ba-top::-webkit-scrollbar{display:none}" +
    ".bd-ej,.bq-ej{display:block!important;overflow:visible!important;-webkit-mask-image:none!important;mask-image:none!important;padding-right:0!important;min-width:0;max-width:100%}" +
    ".ba-top-t{flex:none;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--mut)}" +
    ".ba-top-q{flex:none;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;appearance:none;font:inherit;font-size:13px;padding:5px 11px;border-radius:999px;border:1px solid var(--line);background:var(--surf2);color:var(--ink);cursor:pointer}";
  document.head.appendChild(css);
})();
