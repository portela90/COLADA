// Almacén: lee la foto de un contador (aceite, glicol o agua) con la IA gratuita de Cloudflare Workers AI
// (cupo diario gratis; modelo de visión con licencia libre) y devuelve el número para que el usuario lo confirme.
// Secretos: CF_ACCOUNT_ID y CF_AI_TOKEN (token con permiso Workers AI). Modelo cambiable con CF_MODELO_CONTADOR.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const PISTA: Record<string, string> = {
  aceite: "Es un contador mecánico de aceite (marca Chierici Tito) con dos filas de números. Lee SOLO la fila pequeña de abajo, la que pone «TOTALE» (unas 6 cifras en rueditas). NO leas los números grandes de arriba («LITRI»). Si una ruedita está a medio girar entre dos cifras, pon la cifra menor (la que está saliendo por arriba), salvo entre 9 y 0, que es 9.",
  glicol: "Es un contador digital con pantalla LCD de números de segmentos. Lee SOLO el número grande de la línea «TOTAL» (litros), incluido su decimal si tiene punto. Ignora la línea pequeña «RATE» y «L/MIN».",
  agua: "Es un contador de agua mecánico (Itron) que marca metros cúbicos (m³). Lee SOLO los números negros de la fila del contador, de izquierda a derecha. Ignora los números rojos o de las esferas pequeñas, y los números de serie o códigos de barras de las etiquetas.",
};
const fmtN = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 });
const prompt = (tipo: string, prev: number | null) => `${PISTA[tipo] || "Es un contador. Lee el número total que marca."}
${prev != null ? `La última lectura de este mismo contador fue ${fmtN(prev)}${tipo === "agua" ? " m³" : " litros"}. El número de ahora tiene que ser igual o algo mayor que ese, con las mismas cifras delante: úsalo para saber cuántas cifras tiene, dónde va la coma y para decidir las cifras que no se vean claras, pero escribe lo que marca el contador, no te lo inventes.\n` : ""}Responde SOLO con un JSON, sin texto alrededor: {"lectura": "<las cifras tal como las ves, con punto decimal si lo hay; sin espacios ni separadores de miles>", "dudosas": <número de cifras que no se ven claras>, "seguro": <true si estás seguro de todas las cifras>}.
Si no ves el contador o no se puede leer, responde {"lectura": null, "dudosas": 0, "seguro": false}.`;

/* ¿tiene sentido frente a la última lectura? (igual o mayor, sin un salto enorme) */
const cuadra = (v: number | null, prev: number | null) => v != null && isFinite(v) && (prev == null || (v >= prev - 1 && v <= prev + Math.max(prev * 0.05, 3000)));
/* al glicol a veces se le escapa la coma: sale 10 veces más */
function ajusta(r: { lectura: string | null; valor: number | null }, tipo: string, prev: number | null) {
  if (tipo === "glicol" && r.valor != null && prev != null && !cuadra(r.valor, prev) && !/[.]/.test(r.lectura || "") && cuadra(r.valor / 10, prev)) r.valor = Math.round(r.valor) / 10;
  return r;
}
const MODELO2 = "@cf/meta/llama-4-scout-17b-16e-instruct";
async function leer(img: string, tipo: string, prev: number | null = null, modeloForzado = "") {
  const cuenta = (Deno.env.get("CF_ACCOUNT_ID") || "").trim(), token = (Deno.env.get("CF_AI_TOKEN") || "").trim();
  if (!cuenta || !token) return { error: "Faltan los secretos CF_ACCOUNT_ID o CF_AI_TOKEN en Supabase (Edge Functions → Secrets)." };
  if (!/^[A-Za-z0-9_\-]{20,200}$/.test(token) || !/^[a-f0-9]{32}$/.test(cuenta)) return { error: "Los secretos de Cloudflare no tienen el formato correcto (pega solo la clave y el ID de la cuenta)." };
  const modelo = modeloForzado || Deno.env.get("CF_MODELO_CONTADOR") || "@cf/mistralai/mistral-small-3.1-24b-instruct";
  const url = img.startsWith("data:") ? img : "data:image/jpeg;base64," + img;
  let r: Response;
  try {
    r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cuenta}/ai/v1/chat/completions`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelo, max_tokens: 120, temperature: 0,
        messages: [{ role: "user", content: [{ type: "text", text: prompt(tipo, prev) }, { type: "image_url", image_url: { url } }] }] }),
    });
  } catch (_e) { return { error: "No se pudo llamar a la IA de Cloudflare" }; }
  const txt = await r.text();
  if (!r.ok) return { error: r.status === 429 ? "Se ha gastado el cupo gratis de hoy de la IA: escribe el número a mano" : "La IA de Cloudflare ha dado un error (" + r.status + ")" };
  let out = ""; try { out = JSON.parse(txt).choices?.[0]?.message?.content || ""; } catch { out = txt; }
  const m = String(out).match(/\{[\s\S]*\}/);
  let d: { lectura?: string | null; dudosas?: number; seguro?: boolean } = {};
  try { d = m ? JSON.parse(m[0]) : {}; } catch { d = {}; }
  const lec = d.lectura == null ? null : String(d.lectura).replace(/[^\d.,]/g, "").replace(",", ".");
  return { lectura: lec || null, valor: lec ? parseFloat(lec) : null, dudosas: +(d.dudosas || 0), seguro: !!d.seguro, modelo, bruto: String(out).slice(0, 300) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json();
    const tipo = ["aceite", "glicol", "agua"].includes(body.tipo) ? body.tipo : "aceite";
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const ok = await sb.rpc("puede_editar", { p_col: "alm_cont" });
    if (ok.error || ok.data !== true) return json({ error: "Sin acceso" }, 403);
    if (!body.image) return json({ error: "Falta la foto" }, 400);
    const prev = typeof body.prev === "number" && isFinite(body.prev) ? body.prev : null;
    const img = String(body.image);
    // 1.º el modelo de siempre; si lo leído no cuadra con la última lectura, otro modelo gratuito
    const intentos: Record<string, unknown>[] = [];
    let res: any = await leer(img, tipo, prev);
    if (!res.error) ajusta(res, tipo, prev);
    intentos.push({ modelo: res.modelo, lectura: res.lectura ?? null, valor: res.valor ?? null, bruto: res.bruto ?? null, error: res.error ?? null });
    if (res.error && /cupo|secretos|formato/i.test(res.error)) return json(res);
    if (prev != null && !cuadra(res.valor ?? null, prev)) {
      const r2: any = await leer(img, tipo, prev, MODELO2);
      if (!r2.error) ajusta(r2, tipo, prev);
      intentos.push({ modelo: r2.modelo || MODELO2, lectura: r2.lectura ?? null, valor: r2.valor ?? null, bruto: r2.bruto ?? null, error: r2.error ?? null });
      if (!r2.error && cuadra(r2.valor, prev)) res = r2;
      else if (res.error && !r2.error) res = r2;
    }
    const fuera = !res.error && prev != null && !cuadra(res.valor ?? null, prev);
    const out = res.error ? res : { ...res, fuera, prev, intentos: intentos.length };
    // registro para revisar fallos (foto pequeña; se borra solo a los 15 días). Nunca impide responder.
    try {
      await sb.rpc("lect_foto_add", { p: { tipo, cont: String(body.cont || "").slice(0, 40), nave: String(body.nave || "").slice(0, 40), prev, lectura: res.lectura ?? null,
        valor: res.valor ?? null, modelo: res.modelo ?? null, fuera, intentos, mini: typeof body.mini === "string" ? body.mini : null } });
    } catch (_e) { /* sin registro */ }
    return json(out);
  } catch (_e) {
    return json({ error: "No se pudo leer la foto" }, 500);
  }
});
