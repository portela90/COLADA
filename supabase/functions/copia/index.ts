// Copia de seguridad nocturna: devuelve todos los datos de la Colada (mismo formato que
// «Descargar copia completa») y enlaces temporales a las fotos de los albaranes.
// La llama cada noche un script de Google (Apps Script) que lo guarda en Google Drive.
// Protegida con el secreto COPIA_TOKEN (cabecera x-copia-token).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) => {
  if (s >= 400) console.error("copia", s, JSON.stringify(b));
  return new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
};

function igual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  try {
    const esperado = (Deno.env.get("COPIA_TOKEN") || "").trim();
    if (esperado.length < 32) return json({ error: "Falta el secreto COPIA_TOKEN en Supabase (Edge Functions → Secrets)." }, 500);
    const llega = (req.headers.get("x-copia-token") || "").trim();
    if (!igual(llega, esperado)) return json({ error: "Clave incorrecta" }, 401);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // datos
    const docs: Record<string, Record<string, unknown>> = {};
    for (let desde = 0; ; desde += 1000) {
      const { data, error } = await sb.from("docs").select("col,id,data").order("col").order("id").range(desde, desde + 999);
      if (error) throw error;
      for (const r of data) {
        if (r.col === "zz") continue;
        (docs[r.col] ??= {})[r.id] = r.data;
      }
      if (data.length < 1000) break;
    }

    // fotos de albaranes: enlaces válidos 2 horas
    const nombres: string[] = [];
    for (let off = 0; ; off += 1000) {
      const { data, error } = await sb.storage.from("albaranes").list("", { limit: 1000, offset: off });
      if (error) throw error;
      for (const f of data) if (f.id) nombres.push(f.name);
      if (data.length < 1000) break;
    }
    const fotos_urls: Record<string, string> = {};
    for (let i = 0; i < nombres.length; i += 100) {
      const { data, error } = await sb.storage.from("albaranes").createSignedUrls(nombres.slice(i, i + 100), 7200);
      if (error) throw error;
      for (const s of data) if (s.signedUrl && s.path) fotos_urls[s.path] = s.signedUrl;
    }

    return json({ app: "colada", version: 1, fecha: new Date().toISOString(), docs, fotos_urls });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
