// Envía por correo al responsable de prevención el Toolbox del mes y las formaciones en el puesto (F40R304),
// cuando el responsable cierra el mes en la app Toolbox (o pulsa «Enviar a prevención»).
// Los PDF los hace la app (los mismos que se descargan) y llegan aquí en base64.
// Quién envía: se comprueba con su sesión de la app (prl_envio_prep → solo el responsable).
// A quién: solo al correo guardado en Ajustes (correo_prl); la app no puede elegir otro destino.
// Por dónde: la misma cuenta de Gmail que el informe semanal (INFORME_FROM + GMAIL_APP_PASSWORD).
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MAX = 20 * 1024 * 1024; // base64 total (Gmail admite 25 MB)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let b: any;
  try { b = await req.json(); } catch (_) { return json({ error: "Petición no válida" }, 400); }
  const anio = Number(b.anio), mes = Number(b.mes);
  if (!b.tok || !(anio > 2000) || !(mes >= 1 && mes <= 12)) return json({ error: "Faltan datos" }, 400);
  const { data: p, error: e1 } = await sb.rpc("prl_envio_prep", { p_tok: b.tok, p_anio: anio, p_mes: mes });
  if (e1) return json({ error: e1.message }, e1.message === "SESION" || e1.message === "NO_ADMIN" ? 403 : 500);
  const destino = String(p.destino || "").trim();
  if (!destino) return json({ error: "SIN_CORREO" }, 400);
  const arch: any[] = Array.isArray(b.archivos) ? b.archivos : [];
  if (!arch.length || arch.length > 4) return json({ error: "Sin documentos" }, 400);
  let total = 0;
  for (const a of arch) {
    if (typeof a.nombre !== "string" || !/\.pdf$/i.test(a.nombre) || typeof a.b64 !== "string" || !a.b64.startsWith("JVBER")) return json({ error: "Documento no válido" }, 400);
    total += a.b64.length;
  }
  if (total > MAX) return json({ error: "Los documentos pesan demasiado para un correo" }, 413);
  const from = (Deno.env.get("INFORME_FROM") || "").trim();
  const pass = (Deno.env.get("GMAIL_APP_PASSWORD") || "").replace(/\s+/g, "");
  const mesTxt = MESES[mes - 1] + " " + anio;
  try {
    if (!from || !pass) throw new Error("Falta configurar el correo de envío");
    const r = b.resumen || {};
    const lin: string[] = [];
    lin.push("Hola" + (p.destino_nombre ? " " + p.destino_nombre : "") + ",", "");
    lin.push("Te adjunto la documentación de prevención de " + mesTxt + (p.centro ? " (" + p.centro + ")" : "") + ":", "");
    if (r.toolbox) lin.push("- Toolbox del mes" + (r.tema ? ": " + r.tema : "") + ". Han firmado " + (r.firmados ?? "?") + " de " + (r.previstos ?? "?") + "." + (r.faltan && r.faltan.length ? " Faltan: " + r.faltan.join(", ") + "." : ""));
    if (r.formaciones) lin.push("- Formación práctica en el puesto de trabajo (F40R304): " + r.formaciones + " firmada" + (r.formaciones > 1 ? "s" : "") + "." + (r.formSinFirmar ? " Hay " + r.formSinFirmar + " sin firmar todavía, que no van en el PDF." : ""));
    else lin.push("- Formación práctica en el puesto de trabajo: este mes no hay ninguna firmada." + (r.formSinFirmar ? " Hay " + r.formSinFirmar + " pendiente" + (r.formSinFirmar > 1 ? "s" : "") + " de firmar." : ""));
    lin.push("", "Un saludo,", p.quien || "", "", "Enviado automáticamente al cerrar el mes en la app Toolbox HSE.");
    const tr = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: from, pass } });
    await tr.sendMail({
      from, to: destino, cc: from, replyTo: from,
      subject: "Documentación PRL " + mesTxt + " · Toolbox y formación en el puesto" + (p.empresa ? " · " + p.empresa : ""),
      text: lin.join("\n"),
      attachments: arch.map(a => ({ filename: a.nombre, content: a.b64, encoding: "base64", contentType: "application/pdf" })),
    });
    await sb.rpc("prl_envio_marcar", { p_anio: anio, p_mes: mes, p_destino: destino, p_error: null });
    return json({ ok: true, destino });
  } catch (e) {
    const msg = String((e as any)?.message || e);
    try { await sb.rpc("prl_envio_marcar", { p_anio: anio, p_mes: mes, p_destino: destino, p_error: msg }); } catch (_) { /* nada */ }
    return json({ error: "No se pudo enviar el correo: " + msg }, 500);
  }
});
