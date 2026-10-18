import { createClient } from "npm:@supabase/supabase-js@2";
import { jsPDF } from "npm:jspdf@2.5.2";
import * as XLSX from "npm:xlsx@0.18.5";
import nodemailer from "npm:nodemailer@6.9.16";

const BOLSA_DESDE = "2026-10-01";
const BOLSA_INICIO = "2026-10-05";
const EST: Record<string, string> = { pendiente: "Pendiente", en_curso: "En curso", hecha: "Hecha", no_hecha: "No hecha" };
const TEMAS: [string, RegExp][] = [
  ["Aceite", /(aceite|hidraulic|taladrin)/], ["Derrames", /derram/], ["Fugas", /(fuga|pierde|perdida|gotea|goteo)/],
  ["Agua / filtraciones", /(filtrac|lluvia|gotera|charco|inund|humedad)/],
  ["Roturas / averias", /(roto|rota|rotura|averia|averiad|estropead|no funciona)/],
];

const sinAcento = (t: string) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const temasDe = (o: any) => { const t = sinAcento((o.titulo || "") + " " + (o.descripcion || "")); return TEMAS.filter(([, re]) => re.test(t)).map(([n]) => n); };
const sumaD = (f: string, n: number) => { const d = new Date(f + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const lunesDe = (f: string) => { const wd = (new Date(f + "T12:00:00Z").getUTCDay() + 6) % 7; return sumaD(f, -wd); };
const diaClave = (f: string) => ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"][new Date(f + "T12:00:00Z").getUTCDay()];
const fCorta = (f: string) => { const d = new Date(f + "T12:00:00Z"); return ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][d.getUTCDay()] + " " + d.getUTCDate() + "/" + (d.getUTCMonth() + 1); };
const fDMA = (f: string) => f.split("-").reverse().join("/");
const hora = (ts: string) => ts ? new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) : "";
const durTxt = (m: any) => { if (m == null || m === "") return ""; m = Math.max(0, Math.round(+m)); if (m < 60) return m + " min"; const r = m % 60; return Math.floor(m / 60) + " h" + (r ? " " + String(r).padStart(2, "0") + " min" : ""); };
const dec = (n: number) => (Math.round(n * 100) / 100).toString().replace(".", ",");
const HM = (t: string) => { const p = String(t).split(":"); return +p[0] * 60 + +(p[1] || 0); };
const horasTramos = (tr: any[]) => (tr || []).reduce((t: number, r: any) => t + (HM(r[1]) - HM(r[0])) / 60, 0);
const pdfTxt = (t: any) => String(t == null ? "" : t).replace(/[^\x20-\x7E -ÿ–—‘’“”•€]/g, "").trim();
const numSemana = (f: string) => { const d = new Date(f + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)); const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 4)); return 1 + Math.round(((d.getTime() - y.getTime()) / 864e5 - 3 + ((y.getUTCDay() + 6) % 7)) / 7); };

function quienDe(o: any): string[] {
  if ((o.estado === "hecha" || o.estado === "no_hecha") && o.hecho_por_n) return [o.hecho_por_n];
  if (o.todo_equipo) return ["Equipo " + (o.equipo || "")];
  return o.nombres && o.nombres.length ? o.nombres.map((n: string) => { const c = (o.cubre || []).find((x: any) => x.ausente === n && x.sustituto); return c ? c.sustituto : n; }) : ["Sin asignar"];
}

function datosInforme(O: any[]) {
  const hechas = O.filter(o => o.estado === "hecha"), noh = O.filter(o => o.estado === "no_hecha"), sin = O.filter(o => o.estado === "pendiente" || o.estado === "en_curso");
  const P: any = {};
  O.forEach(o => quienDe(o).forEach(n => { const p = P[n] = P[n] || { t: 0, h: 0, no: 0, min: 0, nm: 0 }; p.t++; if (o.estado === "hecha") { p.h++; if (o.minutos != null) { p.min += o.minutos; if (!o.tiempo_auto) p.nm++; } } if (o.estado === "no_hecha") p.no++; }));
  const D: any = {};
  O.forEach(o => { const d = D[o.fecha] = D[o.fecha] || { t: 0, h: 0 }; d.t++; if (o.estado === "hecha") d.h++; });
  const T: any = {};
  O.filter(o => o.origen === "fija").forEach(o => { const t = T[o.titulo] = T[o.titulo] || { n: 0, h: 0, s: 0, nm: 0, est: null }; t.n++; if (o.estado === "hecha") { t.h++; if (o.minutos != null && !o.tiempo_auto) { t.s += o.minutos; t.nm++; } } if (o.minutos_est) t.est = o.minutos_est; });
  return { hechas, noh, sin, P, T, D, inc: O.filter(o => o.origen === "rapida"), min: hechas.reduce((t, o) => t + (o.minutos || 0), 0) };
}

function problemasRepetidos(O: any[], min = 2) {
  const G: any = {};
  O.filter(o => o.origen === "rapida" && !o.habitual_id && !o.elemento_id).forEach(o => temasDe(o).forEach(t => {
    const g = G[t] = G[t] || { tema: t, n: 0, lug: {}, ult: "", ots: [], quien: {} };
    g.n++; g.ots.push(o);
    const l = (o.lugar || "").trim(); if (l) g.lug[l] = (g.lug[l] || 0) + 1;
    if (o.fecha > g.ult) g.ult = o.fecha;
    if (o.creado_por_n) g.quien[o.creado_por_n] = 1;
  }));
  return (Object.values(G) as any[]).filter(g => g.n >= min)
    .map(g => Object.assign(g, { zmax: Math.max(0, ...(Object.values(g.lug) as number[])) }))
    .sort((a, b) => b.zmax - a.zmax || b.n - a.n || b.ult.localeCompare(a.ult));
}
const lugTxt = (g: any) => (Object.entries(g.lug) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([l, n]) => l + (n > 1 ? " x" + n : "")).join(", ");
const zonaRep = (g: any) => { const z = (Object.entries(g.lug) as [string, number][]).sort((a, b) => b[1] - a[1])[0]; return z && z[1] >= 2 ? z : null; };

/* Horas de la semana: misma regla que la app */
function horasSemana(desde: string, hasta: string, O: any[], data: any, hoy: string) {
  const FES = new Set<string>(data.festivos);
  const RH: any = {}; data.horas.forEach((x: any) => RH[x.trabajador + "|" + x.fecha] = x);
  const dias: string[] = [];
  for (let f = desde < BOLSA_DESDE ? BOLSA_DESDE : desde; f <= hasta; f = sumaD(f, 1)) dias.push(f);
  const cerrada = hasta <= hoy;
  const filas: any[] = [], fueraL: any[] = [];
  data.trabajadores.filter((w: any) => w.activo && w.rol !== "admin").sort((a: any, b: any) => a.nombre.localeCompare(b.nombre, "es")).forEach((w: any) => {
    const c = w.horas_contrato != null && w.horas_contrato !== "" ? +w.horas_contrato : 35;
    let Wt = 0, paid = 0, exc = 0, fu = 0;
    dias.forEach(f => {
      const x = RH[w.id + "|" + f]; const esF = FES.has(f); const esp = horasTramos((w.horario || {})[diaClave(f)] || []);
      const def = esF ? 0 : esp; const fa = x ? x.falta : null;
      const h = fa ? 0 : (x && x.trabajadas != null ? +x.trabajadas : def);
      const em = x && x.extra_mano != null ? Math.min(h, +x.extra_mano) : 0;
      const fz = x ? (+x.fuera || 0) : 0;
      if (fa === "baja" || fa === "vacaciones" || (esF && h === 0)) exc += esp;
      Wt += h; paid += em; fu += fz;
      if (fz > 0 || em > 0) {
        const tr = O.filter(o => o.fecha === f && o.estado === "hecha" && o.hecho_por_n === w.nombre).map(o => o.titulo + (o.minutos != null ? " (" + durTxt(o.minutos) + ")" : "")).join(" · ");
        fueraL.push([fCorta(f), w.nombre, dec(fz), dec(em), (x && x.nota) || "", tr || "-"]);
      }
    });
    const dl = (w.jornada === "completa" && cerrada && dias.length && desde >= BOLSA_INICIO) ? dec(Wt - paid - (c * dias.length / 7 - exc)) : "-";
    filas.push([w.nombre, w.jornada === "parcial" ? "Parcial" : w.jornada === "completa" ? "Completa" : "Sin poner", dec(Wt), dec(paid), dec(fu), dl]);
  });
  return { filas, fueraL };
}

function buildPdf(desde: string, hasta: string, O: any[], X: any, H: any, fotos: any, hoy: string, limite: number) {
  const doc: any = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 14; let y = 0; const AZ: [number, number, number] = [31, 78, 121], GR: [number, number, number] = [92, 107, 122];
  const cab = () => {
    doc.setFillColor(...AZ); doc.rect(0, 0, W, 24, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text("Informe semanal de limpieza", M, 11);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(pdfTxt("CIE Inyectametal  ·  Semana " + numSemana(desde) + "  ·  del " + fDMA(desde) + " al " + fDMA(hasta)), M, 18);
    doc.setTextColor(0); y = 32;
  };
  const titulo = (t: string) => { if (y > 262) { doc.addPage(); y = 18; } doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...AZ); doc.text(pdfTxt(t), M, y); doc.setDrawColor(...AZ); doc.line(M, y + 1.5, W - M, y + 1.5); doc.setTextColor(0); y += 6; };
  const tabla = (head: string[], body: any[][], opt?: any) => {
    const avail = W - 2 * M; const cs: any = (opt && opt.columnStyles) || {};
    const n = head.length; const cw: number[] = head.map((_, i) => cs[i] && cs[i].cellWidth ? cs[i].cellWidth : 0);
    const fijo = cw.reduce((t, v) => t + v, 0); const libres = cw.filter(v => !v).length;
    const resto = libres ? (avail - fijo) / libres : 0; for (let i = 0; i < n; i++) if (!cw[i]) cw[i] = resto;
    const suma = cw.reduce((t, v) => t + v, 0); for (let i = 0; i < n; i++) cw[i] = cw[i] * avail / suma;
    const fila = (cells: string[], cab: boolean) => {
      doc.setFontSize(8.5); doc.setFont("helvetica", cab ? "bold" : "normal");
      const lines = cells.map((c, i) => doc.splitTextToSize(c, cw[i] - 3));
      const h = Math.max(...lines.map((l: any[]) => l.length)) * 3.8 + 3;
      if (y + h > 282) { doc.addPage(); y = 18; }
      let x = M;
      cells.forEach((_, i) => {
        if (cab) { doc.setFillColor(...AZ); doc.rect(x, y, cw[i], h, "F"); doc.setTextColor(255); }
        else { doc.setDrawColor(220, 226, 232); doc.rect(x, y, cw[i], h); doc.setTextColor(0); }
        doc.text(lines[i], x + 1.5, y + 4);
        x += cw[i];
      });
      doc.setTextColor(0); y += h;
    };
    fila(head, true);
    body.forEach(r => fila(r.map(pdfTxt), false));
    y += 8;
  };
  cab();
  const tot = O.length, pc = tot ? Math.round(X.hechas.length * 100 / tot) : 0;
  const kp: [string, string][] = [["Trabajos", String(tot)], ["Hechos", String(X.hechas.length)], ["Cumplimiento", pc + " %"], ["No se pudieron", String(X.noh.length)], ["Sin hacer", String(X.sin.length)], ["Tiempo trabajado", durTxt(X.min) || "0 min"], ["Incidencias", String(X.inc.length)]];
  const bw = (W - 2 * M - 3 * 4) / 4;
  kp.forEach((k, i) => { const cx = M + (i % 4) * (bw + 4), cy = y + Math.floor(i / 4) * 20; doc.setFillColor(238, 242, 246); doc.roundedRect(cx, cy, bw, 17, 2, 2, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(14); const alerta = (k[0] === "No se pudieron" && X.noh.length) || (k[0] === "Sin hacer" && X.sin.length); doc.setTextColor(...(alerta ? [179, 38, 30] as [number, number, number] : [22, 33, 44] as [number, number, number])); doc.text(pdfTxt(k[1]), cx + bw / 2, cy + 8, { align: "center" }); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GR); doc.text(k[0], cx + bw / 2, cy + 13.5, { align: "center" }); });
  doc.setTextColor(0); y += 44;
  titulo("Por persona");
  tabla(["Persona", "Trabajos", "Hechos", "No se pudo", "Tiempo total", "Tiempo medio"], Object.keys(X.P).sort().map(n => { const p = X.P[n]; return [n, p.t, p.h, p.no, durTxt(p.min) || "-", p.nm ? durTxt(p.min / p.nm) : "-"]; }));
  if (H) {
    titulo("Horas de la semana");
    tabla(["Persona", "Jornada", "Horas trabajadas", "Extra a mano", "Fuera de presupuesto", "Bolsa de la semana (h)"], H.filas);
    if (H.fueraL.length) { titulo("Horas fuera de presupuesto y extra, con motivo y trabajos"); tabla(["Día", "Persona", "Fuera (h)", "Extra a mano (h)", "Motivo", "Trabajos hechos ese día"], H.fueraL); }
    else { doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text("Esta semana no hay horas fuera de presupuesto ni extra a mano.", M, y); y += 8; }
  }
  titulo("Por día");
  tabla(["Día", "Trabajos", "Hechos", "Cumplimiento"], Object.keys(X.D).sort().map(f => { const d = X.D[f]; return [fCorta(f), d.t, d.h, (d.t ? Math.round(d.h * 100 / d.t) : 0) + " %"]; }));
  if (Object.keys(X.T).length) { titulo("Tareas fijas"); tabla(["Tarea", "Veces", "Hechas", "Tiempo estimado", "Tiempo medio real"], Object.keys(X.T).sort().map(k => { const t = X.T[k]; return [k, t.n, t.h, t.est ? durTxt(t.est) : "-", t.nm ? durTxt(t.s / t.nm) : "-"]; })); }
  if (X.noh.length || X.sin.length) { titulo("No se pudieron hacer / quedaron sin hacer"); tabla(["Día", "Trabajo", "Quien", "Estado", "Motivo / nota"], X.noh.concat(X.sin).sort((a: any, b: any) => a.fecha.localeCompare(b.fecha)).map((o: any) => [fCorta(o.fecha), o.titulo, quienDe(o).join(", "), EST[o.estado] || o.estado, o.nota || ""]), { columnStyles: { 4: { cellWidth: 60 } } }); }
  const RP = problemasRepetidos(O);
  if (RP.length) { titulo("Problemas que se repiten"); tabla(["Problema", "Veces", "Donde", "Ultima vez", "Avisado por"], RP.map((g: any) => [g.tema, g.n, (zonaRep(g) ? "MISMO SITIO: " : "") + (lugTxt(g) || "-"), fCorta(g.ult), Object.keys(g.quien).join(", ")]), { columnStyles: { 2: { cellWidth: 50 } } }); }
  titulo("Incidencias abiertas por los trabajadores (" + X.inc.length + ")");
  if (!X.inc.length) { doc.setFontSize(9); doc.setTextColor(...GR); doc.text("No se abrio ninguna esta semana.", M, y); doc.setTextColor(0); y += 8; }
  let usado = 0;
  for (const o of X.inc.slice().sort((a: any, b: any) => (a.creado || a.fecha).localeCompare(b.creado || b.fecha))) {
    // fotos dentro del límite de tamaño; el resto se indica en el PDF
    const lista: any[] = [];
    for (const f of (fotos[String(o.id)] || [])) { if (usado + f.data.length > limite) break; usado += f.data.length; lista.push(f); }
    if (y > (lista.length ? 195 : 250)) { doc.addPage(); y = 18; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); const tl = doc.splitTextToSize(pdfTxt((o.prioridad === "alta" ? "[URGENTE] " : "") + o.titulo), W - 2 * M); doc.text(tl, M, y); y += tl.length * 4.6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...GR);
    const info = [fCorta(o.fecha) + (o.creado ? " " + hora(o.creado) : ""), o.lugar ? "Donde: " + o.lugar : null, "Abierta por: " + (o.creado_por_n || "-"), "Estado: " + (EST[o.estado] || o.estado) + (o.hecho_por_n && o.estado !== "pendiente" ? " (" + o.hecho_por_n + (o.minutos != null ? ", " + durTxt(o.minutos) : "") + ")" : "")].filter(Boolean).join("   ·   ");
    const il = doc.splitTextToSize(pdfTxt(info), W - 2 * M); doc.text(il, M, y); y += il.length * 4;
    if (o.descripcion || o.nota) { const dl = doc.splitTextToSize(pdfTxt([o.descripcion, o.nota ? "Nota: " + o.nota : null].filter(Boolean).join("  —  ")), W - 2 * M); doc.setTextColor(40); doc.text(dl, M, y); y += dl.length * 4; }
    doc.setTextColor(0); y += 1.5;
    if (lista.length) {
      const fw = (W - 2 * M - 6) / 2; let col = 0, rowH = 0;
      for (const f of lista) {
        const fmt = f.data.startsWith("data:image/png") ? "PNG" : "JPEG";
        const props = doc.getImageProperties(f.data); let w = fw, h = w * props.height / props.width;
        if (h > 70) { h = 70; w = h * props.width / props.height; }
        if (col === 0 && y + h > 285) { doc.addPage(); y = 18; }
        doc.addImage(f.data, fmt, M + col * (fw + 6) + (fw - w) / 2, y, w, h); rowH = Math.max(rowH, h); col++;
        if (col === 2) { col = 0; y += rowH + 4; rowH = 0; }
      }
      if (col) y += rowH + 4;
    }
    const noIncl = (o.nfotos || 0) - lista.length;
    if (noIncl > 0) { doc.setFontSize(8); doc.setTextColor(...GR); doc.text(noIncl + " foto(s) no incluidas en este PDF (liberadas de la app o por el tamaño del informe).", M, y); doc.setTextColor(0); y += 5; }
    doc.setDrawColor(214, 222, 230); doc.line(M, y, W - M, y); y += 6;
  }
  doc.addPage(); y = 18; titulo("Detalle de todos los trabajos");
  tabla(["Día", "Trabajo", "Quien", "Estado", "Empezó", "Terminó", "Tiempo"], O.slice().sort((a, b) => a.fecha.localeCompare(b.fecha) || a.titulo.localeCompare(b.titulo)).map(o => [fCorta(o.fecha), o.titulo + (o.lugar ? " (" + o.lugar + ")" : ""), quienDe(o).join(", "), EST[o.estado] || o.estado, o.inicio ? hora(o.inicio) : "", o.fin ? hora(o.fin) : "", durTxt(o.minutos)]), { columnStyles: { 1: { cellWidth: 55 } } });
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(...GR); doc.text(pdfTxt("Generado el " + fDMA(hoy) + " automaticamente · App Limpieza CIE"), M, 292); doc.text("Pagina " + i + " de " + n, W - M, 292, { align: "right" }); }
  return doc.output("arraybuffer");
}

function buildXlsx(desde: string, hasta: string, O: any[], X: any) {
  const wb = XLSX.utils.book_new();
  const res: any[][] = [["Informe semanal de limpieza - CIE"], ["Semana " + numSemana(desde) + ", del " + fDMA(desde) + " al " + fDMA(hasta)], [], ["Trabajos", O.length], ["Hechos", X.hechas.length], ["Cumplimiento", O.length ? X.hechas.length / O.length : 0], ["No se pudieron", X.noh.length], ["Sin hacer", X.sin.length], ["Minutos trabajados", X.min], ["Incidencias abiertas por trabajadores", X.inc.length], [], ["Persona", "Trabajos", "Hechos", "No se pudo", "Minutos totales", "Minutos de media"]]
    .concat(Object.keys(X.P).sort().map(n => { const p = X.P[n]; return [n, p.t, p.h, p.no, p.min, p.nm ? Math.round(p.min / p.nm) : ""]; }));
  const ws1 = XLSX.utils.aoa_to_sheet(res); ws1["!cols"] = [{ wch: 34 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 16 }]; if (ws1.B6) ws1.B6.z = "0%";
  XLSX.utils.book_append_sheet(wb, ws1, "Resumen");
  const fila = (o: any) => ({ "Fecha": o.fecha, "Trabajo": o.titulo, "Donde": o.lugar || "", "Quien": quienDe(o).join(", "), "Estado": EST[o.estado] || o.estado, "Empezo": o.inicio ? hora(o.inicio) : "", "Termino": o.fin ? hora(o.fin) : "", "Minutos": o.minutos == null ? "" : o.minutos, "Minutos estimados": o.minutos_est || "", "Urgente": o.prioridad === "alta" ? "Si" : "", "Origen": ({ fija: "Tarea fija", manual: "Jefe", rapida: "Abierta por trabajador", excel: "Excel", ayuda: "Ayudante" } as any)[o.origen] || o.origen, "Abierta por": o.origen === "rapida" ? (o.creado_por_n || "") : "", "Fotos": o.nfotos || 0, "Nota": o.nota || "", "Descripcion": o.descripcion || "" });
  const add = (L: any[], nom: string) => { const ws = XLSX.utils.json_to_sheet(L.length ? L.map(fila) : [{ "Fecha": "", "Trabajo": "Ninguno" }]); ws["!cols"] = [12, 32, 16, 24, 11, 8, 8, 9, 10, 8, 20, 18, 6, 36, 36].map(w => ({ wch: w })); if (L.length) ws["!autofilter"] = { ref: ws["!ref"] }; XLSX.utils.book_append_sheet(wb, ws, nom); };
  const ord = (L: any[]) => L.slice().sort((a, b) => a.fecha.localeCompare(b.fecha) || a.titulo.localeCompare(b.titulo));
  add(ord(O), "Trabajos"); add(ord(X.inc), "Incidencias");
  const RP = problemasRepetidos(O);
  const wsR = XLSX.utils.json_to_sheet(RP.length ? RP.map((g: any) => ({ "Problema": g.tema, "Veces": g.n, "Donde": lugTxt(g), "Ultima vez": g.ult, "Avisado por": Object.keys(g.quien).join(", "), "Avisos": g.ots.map((o: any) => o.fecha + " " + o.titulo).join(" | ") })) : [{ "Problema": "Nada repetido" }]);
  wsR["!cols"] = [{ wch: 24 }, { wch: 7 }, { wch: 30 }, { wch: 12 }, { wch: 30 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsR, "Repetidos");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

function b64(buf: ArrayBuffer | Uint8Array): string {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

function madridNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false, weekday: "short" }).formatToParts(new Date());
  const g = (t: string) => parts.find(p => p.type === t)?.value || "";
  return { hoy: g("year") + "-" + g("month") + "-" + g("day"), hour: Number(g("hour")), wd: g("weekday") };
}

const json = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  // Solo se lanza con la clave secreta (la mandan las tareas programadas de los lunes)
  const sbc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: cfg } = await sbc.from("app_config").select("v").eq("k", "informe_secret").maybeSingle();
  const secreto = (cfg && cfg.v) || "";
  if (secreto.length < 32 || (req.headers.get("x-informe-token") || "") !== secreto) return json({ error: "no autorizado" }, 401);
  let body: any = {};
  try { body = await req.json(); } catch (_) { /* sin cuerpo */ }
  const now = madridNow();
  // Se llama a las 6 y a las 7 UTC: solo actúa cuando en Madrid son las 8:00 de un lunes
  if (!body.forzar && !(now.wd === "Mon" && now.hour === 8)) return json({ omitido: "no es lunes 8:00 en Madrid" });
  const hoy = now.hoy;
  const desde: string = body.desde || sumaD(lunesDe(hoy), -7);
  const hasta = sumaD(desde, 6);
  // límite de fotos en el PDF (bytes base64): por defecto 3 MB
  const limite = Math.round((Number(body.limiteMB) || 3) * 1024 * 1024);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Envío por Gmail (SMTP con contraseña de aplicación)
  const to = (Deno.env.get("INFORME_TO") || "").trim();
  const gmailUser = (Deno.env.get("INFORME_FROM") || "").trim();
  const gmailPass = (Deno.env.get("GMAIL_APP_PASSWORD") || "").replace(/\s+/g, "");
  const log = async (estado: string, detalle: string) => { await sb.from("informe_envios").insert({ semana_desde: desde, destino: to, estado, detalle }); };
  try {
    if (!to || !gmailUser || !gmailPass) throw new Error("Falta configurar INFORME_TO, INFORME_FROM o GMAIL_APP_PASSWORD");
    if (!body.forzar) {
      const { data: prev } = await sb.from("informe_envios").select("id").eq("semana_desde", desde).eq("estado", "enviado").limit(1);
      if (prev && prev.length) return json({ omitido: "ya enviado esta semana" });
    }
    const { data, error } = await sb.rpc("informe_datos", { p_desde: desde, p_hasta: hasta });
    if (error) throw new Error(error.message);
    const O: any[] = data.ots;
    if (!O.length) { await log("omitido", "sin trabajos esa semana"); return json({ omitido: "sin trabajos" }); }
    const X = datosInforme(O);
    const H = horasSemana(desde, hasta, O, data, hoy);
    const fotos: any = data.fotos || {};
    // fotos del almacén privado: se leen con la clave de servicio
    const clave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    for (const [ot, L] of Object.entries(data.fotos_url || {}) as [string, any[]][]) {
      for (const f of L) {
        try {
          const r = await fetch(f.url, { headers: { Authorization: "Bearer " + clave, apikey: clave } }); if (!r.ok) continue; const t = r.headers.get("content-type") || "image/jpeg";
          (fotos[ot] = fotos[ot] || []).push({ data: "data:" + t + ";base64," + b64(new Uint8Array(await r.arrayBuffer())) });
        } catch (_) { /* sin foto */ }
      }
    }
    const pdf = b64(buildPdf(desde, hasta, O, X, H, fotos, hoy, limite));
    const xlsx = b64(buildXlsx(desde, hasta, O, X));
    const base = "informe-limpieza-semana-" + numSemana(desde) + "-" + desde;
    const asunto = "Informe semanal de limpieza · semana " + numSemana(desde) + " (" + fDMA(desde) + " al " + fDMA(hasta) + ")";
    const texto = "Adjunto el informe semanal de limpieza (PDF y Excel).\n\nSe ha generado automaticamente.";
    const transporte = nodemailer.createTransport({
      host: "smtp.gmail.com", port: 465, secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });
    await transporte.sendMail({
      from: gmailUser, to, subject: asunto, text: texto,
      attachments: [
        { filename: base + ".pdf", content: pdf, encoding: "base64", contentType: "application/pdf" },
        { filename: base + ".xlsx", content: xlsx, encoding: "base64", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      ],
    });
    await log("enviado", "OTs: " + O.length);
    return json({ enviado: true, to, desde, hasta, ots: O.length });
  } catch (e) {
    const msg = String((e as any).message || e);
    try { await log("error", msg); } catch (_) { /* ignorar */ }
    return json({ error: msg }, 500);
  }
});
