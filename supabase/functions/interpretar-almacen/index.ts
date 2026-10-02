// Almacén: convierte lo que el usuario escribe o dicta («2 pistones Ø90 esp en la F66 por desgaste…»)
// en movimientos listos para revisar y guardar. Usa Claude (secreto ANTHROPIC_API_KEY).
// Modelo: MODELO_ALMACEN (por defecto claude-haiku-4-5, el más barato).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => {
  if (s >= 400) console.error("interpretar-almacen", s, JSON.stringify(b));
  return new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
};

type Ctx = {
  articulos: { id: string; desc: string; cod?: string; ud?: string; fam?: string; diam?: string }[];
  almacenes: { id: string; nom: string; nave?: string; tipo?: string }[];
  maquinas: { id: string; cod: string; nave?: string }[];
  proveedores: { id: string; nom: string }[];
  ejes?: string[];
  operarios: string[];
  diametros: string[];
  motivos: string[];
  destinos: string[];
};

function prompt(c: Ctx, hoy: string, dia: string) {
  const L = (xs: string[]) => xs.join("\n");
  return `Eres el asistente del almacén de la fundición MAPRI (inyectoras de aluminio, Nave 1 y Nave 2). El encargado escribe o dicta, deprisa y a veces con faltas, lo que ha pasado en el almacén. Conviértelo en una lista de acciones.

Hoy es ${dia} ${hoy}. «ayer» = día anterior; si dice «el viernes», «el lunes»… es el más reciente ya pasado (o hoy). Si no dice fecha, null (se usará hoy).

TIPOS DE ACCIÓN
- "piston": cambio de pistón en una inyectora. Datos: maquina, diametro, cantidad (por defecto 1), motivo, destino_piston (qué se ha hecho con el usado), responsable.
- "consumo": se ha gastado / sacado / puesto material del almacén (que NO sea un cambio de pistón). Datos: articulo, cantidad, almacen (de dónde sale, si lo dice), maquina (si lo dice).
- "entrada": ha llegado material. Datos: articulo, cantidad, almacen, proveedor, albaran.
- "traslado": se ha bajado / pasado material de un almacén a otro. Datos: articulo, cantidad, almacen (desde), destino (hasta).
- "conteo": ha contado lo que hay. Datos: articulo, cantidad (lo contado), almacen.
- "eje_prep": un eje de inyección tiene un desperfecto y se prepara para mandarlo a reparar. Datos: eje (código), desperfecto (en mayúsculas, p. ej. "POSTIZO ROTO", "PISTON 80 AGARROTADO").
- "eje_env": un eje se ha enviado al taller a reparar. Datos: eje.
- "eje_rec": un eje ha vuelto reparado del taller. Datos: eje, albaran.
Con varios ejes, una acción por eje.

INYECTORAS (id · código · nave). «la 66», «F-66», «máquina 66» = F66:
${L(c.maquinas.map((m) => `${m.id} · ${m.cod} · ${m.nave || ""}`))}

ARTÍCULOS (id · descripción · código · unidad · familia · Ø):
${L(c.articulos.map((a) => [a.id, a.desc, a.cod || "", a.ud || "", a.fam || "", a.diam || ""].join(" · ")))}

ALMACENES (id · nombre · nave · tipo). «N1A», «producción 1A» = Almacén producción N1A; «general», «central» = Almacén general; «consumibles» = Almacén de consumibles N1:
${L(c.almacenes.map((l) => [l.id, l.nom, l.nave || "", l.tipo || ""].join(" · ")))}

EJES (código y estado: planta, preparado, reparacion, devuelto). Los códigos se escriben como 2.3.C-3; si dicta «dos tres c tres» es 2.3.C-3:
${(c.ejes || []).join(", ")}

PROVEEDORES (id · nombre):
${L(c.proveedores.map((p) => p.id + " · " + p.nom))}

DIÁMETROS DE PISTÓN válidos (escribe el valor exacto): ${c.diametros.join(" | ")}. «del 90 especial», «90 esp», «noventa especial» = "Ø 90 esp"; «del 80» = "Ø 80".
MOTIVOS válidos (valor exacto): ${c.motivos.join(" | ")}. «gastado», «desgastado» = DESGASTE; «roto» = ROTURA; «pierde agua» = FUGA DE AGUA; «agarrotado», «clavado» = PISTÓN AGARROTADO; «preventivo» = CAMBIO PREVENTIVO.
DESTINO DEL PISTÓN USADO (valor exacto): ${c.destinos.join(" | ")}. «a usados», «a la zona» = ZONA DE PISTONES USADOS; «se queda en el eje», «agarrotado en el eje» = QUEDA PUESTO EN EL EJE (AGARROTADO); «a la basura», «tirado» = DESECHADO.
RESPONSABLES conocidos (número de operario y/o nombre): ${c.operarios.join(", ")}. Si dice «el 211» o «responsable 211», pon "211".

Responde SOLO con un JSON, sin texto alrededor:
{"acciones":[{"tipo":"piston|consumo|entrada|traslado|conteo|eje_prep|eje_env|eje_rec","fecha":"AAAA-MM-DD"|null,"articulo":id|null,"cantidad":number|null,"almacen":id|null,"destino":id|null,"maquina":id|null,"diametro":string|null,"motivo":string|null,"destino_piston":string|null,"responsable":string|null,"proveedor":id|null,"albaran":string|null,"eje":string|null,"desperfecto":string|null,"nota":string|null,"texto":"trozo del mensaje al que corresponde"}],
 "dudas":["lo que no has entendido o has tenido que suponer, en frases cortas"]}
Reglas: usa SOLO ids de las listas. Una acción por cada artículo / inyectora (si cambia pistones en dos inyectoras, dos acciones). Si algo no está claro, pon null y explícalo en dudas; no inventes. Los números en España usan coma decimal.`;
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
    const { texto, hoy, dia, contexto } = await req.json();
    if (!texto || !String(texto).trim()) return json({ error: "No has escrito nada" }, 400);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key.trim(), "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("MODELO_ALMACEN") || "claude-haiku-4-5-20251001",
        max_tokens: 6000,
        system: prompt(contexto as Ctx, hoy || new Date().toISOString().slice(0, 10), dia || ""),
        messages: [{ role: "user", content: String(texto).slice(0, 12000) }],
      }),
    });
    const out = await r.json();
    if (!r.ok) return json({ error: "Claude: " + (out?.error?.message || r.status) }, 502);
    const txt = (out.content || []).map((c: { text?: string }) => c.text || "").join("");
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return json({ error: "No lo he entendido. Prueba a escribirlo de otra forma.", raw: txt }, 422);
    return json(JSON.parse(m[0]));
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
