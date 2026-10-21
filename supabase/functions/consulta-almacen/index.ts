// Almacén · Análisis: el usuario pregunta con sus palabras.
// modo "plan": Claude convierte la pregunta en pasos para el motor de consultas de la app (la app calcula con sus datos reales).
// modo "respuesta": Claude lee los resultados ya calculados y redacta una conclusión corta.
// Usa el secreto ANTHROPIC_API_KEY. Modelo: MODELO_CONSULTA (por defecto claude-haiku-4-5, el más barato).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const PLAN = (hoy: string, ctx: unknown) => `Eres el analista de datos del almacén de la fundición MAPRI (inyectoras de aluminio, Nave 1A, Nave 1B y Nave 2). Hoy es ${hoy}.
El usuario hace una pregunta. NO calcules nada: convierte la pregunta en 1 a 5 PASOS que la app ejecutará sobre sus datos reales. Responde SOLO con JSON:
{"entendido":"cómo has entendido la pregunta, en una frase","aviso":"opcional: si falta algún dato para responder bien (p. ej. sin precios)","pasos":[PASO,...]}

PASO = {"titulo":"texto corto","que":"pist|rep|mat|gasto|stock|taller","desde":"YYYY-MM-DD o null","hasta":"YYYY-MM-DD o null","maq":["F25",...],"zonas":["Nave 1A",...],"motivo":["rotura",...],"buscar":"texto o null","agrupar":[hasta 2 de: maq, zona, mes, motivo, modelo, eje, diam, art, resp, tipo],"medida":"n|cant|eur","orden":"desc|asc|clave","top":número,"condicion":{"medida":"n|cant|eur","op":">|>=|<|<=|=","valor":número} o null,"familia":"piston|horno|consumible|barra|tornillo (solo para stock)"}

QUÉ HAY EN CADA "que":
- pist: cambios de pistón (fecha, máquina, zona, diámetro, motivo, responsable, cantidad, gasto si hay precio).
- rep: reparaciones de ejes de inyección (fecha de envío al taller, eje, modelo, máquina, motivo = desperfecto, coste). Algunas reparaciones antiguas tienen máquina "F27/F56" (modelo compartido).
- mat: consumo de material del almacén que NO es cambio de pistón (artículo, máquina o nave, cantidad, gasto).
- gasto: los tres anteriores juntos (agrupa por "tipo" para separarlos).
- stock: stock actual de cada artículo, gasto al mes, días que dura y fecha en que se acaba (usa "buscar" o "familia"; sin fechas).
- taller: ejes que están ahora preparados o en el taller y cuántos días llevan.

REGLAS
- "n" = número de registros (veces), "cant" = unidades, "eur" = euros.
- «más de 3 veces en un mes» → agrupar ["maq","mes"], medida "n", condicion {"medida":"n","op":">","valor":3}.
- Para comparar (máquinas, naves, periodos) usa varios pasos o agrupar por ese campo.
- Para explicar un «por qué», añade un paso que desglose por motivo o por diámetro/eje.
- Sin fechas en la pregunta: últimos 12 meses (desde = hoy − 365 días). «Este año» = desde 1 de enero.
- Usa los códigos exactos de máquinas, zonas y motivos del contexto. Los motivos se comparan por texto parecido (p. ej. "rotura", "agarrot", "cambio ref").
- top por defecto 20.

CONTEXTO DE LA FÁBRICA:
${JSON.stringify(ctx)}`;

const RESP = `Eres el analista de datos del almacén de la fundición MAPRI. Te paso la pregunta del encargado y los resultados que ha calculado la app con datos reales.
Responde en español, claro y directo, en 3 a 8 líneas de texto normal (sin markdown, sin tablas, sin asteriscos): primero la respuesta con las cifras clave, luego lo que destaca o conviene revisar.
Usa SOLO las cifras de los resultados; no inventes datos. Si faltan precios, di que el gasto en euros no es completo. Si los resultados no bastan para responder, dilo.`;

async function claude(key: string, system: string, user: string, max: number) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key.trim(), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: Deno.env.get("MODELO_CONSULTA") || "claude-haiku-4-5-20251001", max_tokens: max, system, messages: [{ role: "user", content: user }] }),
  });
  const out = await r.json();
  if (!r.ok) throw new Error("Claude: " + (out?.error?.message || r.status));
  return (out.content || []).map((c: { text?: string }) => c.text || "").join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const ok = await sb.rpc("es_usuario");
    if (ok.error || ok.data !== true) return json({ error: "Sin acceso" }, 403);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "Falta la clave ANTHROPIC_API_KEY en Supabase (Edge Functions → Secrets)." }, 500);
    const b = await req.json();
    const pregunta = String(b.pregunta || "").trim().slice(0, 1500);
    if (!pregunta) return json({ error: "No has escrito nada" }, 400);
    const hoy = String(b.hoy || new Date().toISOString().slice(0, 10));
    if (b.modo === "respuesta") {
      const datos = JSON.stringify({ pregunta, entendido: b.entendido || "", precios: b.precios || {}, resultados: b.resultados || [] }).slice(0, 60000);
      const t = await claude(key, RESP, datos, 700);
      return json({ respuesta: t.trim() });
    }
    const t = await claude(key, PLAN(hoy, b.contexto || {}), pregunta, 1500);
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) return json({ error: "No he entendido la pregunta. Prueba a decirla de otra forma." }, 422);
    return json(JSON.parse(m[0]));
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
