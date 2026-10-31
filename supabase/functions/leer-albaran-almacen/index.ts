// Almacén: lee la foto de un albarán (compra o recuperación de pistones) con Claude y devuelve las líneas para revisar.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

type Art = { id: string; t: string };
const PROMPT = (provs: string[], arts: Art[], hoy: string) => `Eres un asistente que lee albaranes de entrada del almacén de consumibles de la fundición MAPRI (Inyectametal, Abadiano): pistones, barras expulsoras, tornillos, recambios de horno, tolvas, aceites, taladrinas, jabones, desmoldeantes y consumibles.
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
Los números en España usan punto para miles y coma para decimales: '1.250,00' = 1250; '7,00' = 7. Hoy es ${hoy}. Si algo no se lee, pon null; no inventes.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const ok = await sb.rpc("puede_editar", { p_col: "alm_mov" });
    if (ok.error || ok.data !== true) return json({ error: "Sin acceso" }, 403);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "Falta la clave ANTHROPIC_API_KEY en Supabase (Edge Functions → Secrets)." }, 500);
    const { image, mime, proveedores, articulos, hoy } = await req.json();
    if (!image) return json({ error: "Falta la foto" }, 400);
    const arts: Art[] = (Array.isArray(articulos) ? articulos : []).slice(0, 600).map((a: Art) => ({ id: String(a.id).slice(0, 60), t: String(a.t).slice(0, 120) }));
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("MODELO_ALB_ALMACEN") || Deno.env.get("MODELO_ALBARAN") || "claude-sonnet-5",
        max_tokens: 2500,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mime || "image/jpeg", data: image } },
          { type: "text", text: PROMPT((proveedores || []).slice(0, 100), arts, hoy || new Date().toISOString().slice(0, 10)) },
        ] }],
      }),
    });
    const out = await r.json();
    if (!r.ok) return json({ error: "Claude: " + (out?.error?.message || r.status) }, 502);
    const txt = (out.content || []).map((c: { text?: string }) => c.text || "").join("");
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return json({ error: "No se pudo leer el albarán", raw: txt }, 422);
    return json({ datos: JSON.parse(m[0]) });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
