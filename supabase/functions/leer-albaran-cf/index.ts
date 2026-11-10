// Almacén: lee la foto de un albarán (compra o recuperación de pistones) con la IA GRATUITA de Cloudflare Workers AI
// (la misma que lee los contadores) y devuelve las líneas para revisar. Mismo formato que leer-albaran-almacen (Claude).
// Secretos: CF_ACCOUNT_ID y CF_AI_TOKEN. Modelo cambiable con CF_MODELO_ALBARAN. Coladas no usa esta función.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

type Art = { id: string; t: string };
const PROMPT = (provs: string[], arts: Art[], hoy: string, pistas: string[] = []) => `Eres un asistente que lee albaranes de entrada del almacén de consumibles de la fundición MAPRI (Inyectametal, Abadiano): pistones, barras expulsoras, tornillos, recambios de horno, tolvas, aceites, taladrinas, jabones, desmoldeantes y consumibles.
Lee la foto y devuelve SOLO un JSON (sin texto alrededor) con este formato:
{
 "proveedor": string|null,      // el que emite el albarán; si coincide con uno de estos, escríbelo igual: ${provs.join(", ")}
 "albaran": string|null,        // número de albarán del proveedor
 "fecha": "AAAA-MM-DD"|null,    // fecha del albarán (o la de recepción escrita a mano si la hay)
 "tipo": "compra"|"recuperacion", // "recuperacion" si las líneas son recuperaciones de pistones (p. ej. 'RECUP. PISTONES DE Ø80 A Ø70')
 "lineas": [{
   "texto": string,             // la denominación tal cual
   "cantidad": number|null,
   "unidad": string|null,       // ud, kg, l, m…
   "art": string|null,          // id del artículo del catálogo que corresponde (de la lista de abajo) o null si no estás seguro
   "desde": string|null,        // solo recuperaciones: diámetro de origen, solo el número ("80")
   "hasta": string|null,        // solo recuperaciones: diámetro al que vuelve ("70")
   "especial": boolean          // solo recuperaciones: true si pone ESPECIAL/ESPECIALES
 }],
 "notas": string|null,
 "confianza": "alta"|"media"|"baja"
}
Catálogo (id = descripción):
${arts.map(a => a.id + " = " + a.t).join("\n")}
${pistas.length ? "Lo que ya sabemos de los albaranes de cada proveedor (úsalo para encontrar el nº de albarán, la fecha y la cantidad, y para elegir el artículo):\n" + pistas.map(p => "- " + p).join("\n") + "\n" : ""}Devuelve la cantidad en la unidad del artículo del catálogo (la que pone «en …»): si el albarán viene en otra (p. ej. litros y el artículo en bidones), conviértela y dilo en notas.\nLos números en España usan punto para miles y coma para decimales: '1.250,00' = 1250; '7,00' = 7. Hoy es ${hoy}. Si algo no se lee, pon null; no inventes.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const ok = await sb.rpc("puede_editar", { p_col: "alm_mov" });
    if (ok.error || ok.data !== true) return json({ error: "Sin acceso" }, 403);
    const cuenta = (Deno.env.get("CF_ACCOUNT_ID") || "").trim(), token = (Deno.env.get("CF_AI_TOKEN") || "").trim();
    if (!cuenta || !token) return json({ error: "Faltan los secretos CF_ACCOUNT_ID o CF_AI_TOKEN en Supabase." });
    const { image, mime, proveedores, articulos, hoy, pistas } = await req.json();
    const pis: string[] = (Array.isArray(pistas) ? pistas : []).slice(0, 60).map((x: unknown) => String(x).slice(0, 700));
    if (!image) return json({ error: "Falta la foto" });
    const arts: Art[] = (Array.isArray(articulos) ? articulos : []).slice(0, 600).map((a: Art) => ({ id: String(a.id).slice(0, 60), t: String(a.t).slice(0, 200) }));
    const url = String(image).startsWith("data:") ? String(image) : "data:" + (mime || "image/jpeg") + ";base64," + image;
    const modelo = Deno.env.get("CF_MODELO_ALBARAN") || "@cf/mistralai/mistral-small-3.1-24b-instruct";
    let r: Response;
    try {
      r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cuenta}/ai/v1/chat/completions`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelo, max_tokens: 2500, temperature: 0,
          messages: [{ role: "user", content: [
            { type: "text", text: PROMPT((proveedores || []).slice(0, 100), arts, hoy || new Date().toISOString().slice(0, 10), pis) },
            { type: "image_url", image_url: { url } },
          ] }] }),
      });
    } catch (_e) { return json({ error: "No se pudo llamar a la IA de Cloudflare" }); }
    const txt0 = await r.text();
    if (!r.ok) return json({ error: r.status === 429 ? "Se ha gastado el cupo gratis de hoy de la IA" : "La IA de Cloudflare ha dado un error (" + r.status + ")" });
    let txt = ""; try { txt = JSON.parse(txt0).choices?.[0]?.message?.content || ""; } catch { txt = txt0; }
    const m = String(txt).match(/\{[\s\S]*\}/);
    if (!m) return json({ error: "No se pudo leer el albarán" });
    let datos: unknown;
    try { datos = JSON.parse(m[0]); } catch {
      try { datos = JSON.parse(m[0].replace(/\/\/[^\n"]*$/gm, "").replace(/,\s*([}\]])/g, "$1")); } catch { return json({ error: "No se pudo leer el albarán" }); } }
    return json({ datos, modelo });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) });
  }
});
