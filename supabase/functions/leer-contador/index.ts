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
const prompt = (tipo: string) => `${PISTA[tipo] || "Es un contador. Lee el número total que marca."}
Responde SOLO con un JSON, sin texto alrededor: {"lectura": "<las cifras tal como las ves, con punto decimal si lo hay; sin espacios ni separadores de miles>", "dudosas": <número de cifras que no se ven claras>, "seguro": <true si estás seguro de todas las cifras>}.
Si no ves el contador o no se puede leer, responde {"lectura": null, "dudosas": 0, "seguro": false}.`;

async function leer(img: string, tipo: string) {
  const cuenta = (Deno.env.get("CF_ACCOUNT_ID") || "").trim(), token = (Deno.env.get("CF_AI_TOKEN") || "").trim();
  if (!cuenta || !token) return { error: "Faltan los secretos CF_ACCOUNT_ID o CF_AI_TOKEN en Supabase (Edge Functions → Secrets)." };
  const modelo = Deno.env.get("CF_MODELO_CONTADOR") || "@cf/mistralai/mistral-small-3.1-24b-instruct";
  const url = img.startsWith("data:") ? img : "data:image/jpeg;base64," + img;
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cuenta}/ai/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ model: modelo, max_tokens: 120, temperature: 0,
      messages: [{ role: "user", content: [{ type: "text", text: prompt(tipo) }, { type: "image_url", image_url: { url } }] }] }),
  });
  const txt = await r.text();
  if (!r.ok) return { error: "Cloudflare " + r.status + ": " + txt.slice(0, 400) };
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
    const res = await leer(String(body.image), tipo);
    return json(res, "error" in res ? 502 : 200);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
