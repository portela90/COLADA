// Copia de seguridad nocturna de la app de Limpieza (proyecto limpieza-cie).
// Devuelve todas las tablas (menos sesiones, avisos del móvil y claves internas) y enlaces temporales a las fotos.
// La llama cada noche el script de Google (supabase/copia-google-drive.gs), que lo guarda en Google Drive.
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
    const { data, error } = await sb.rpc("copia_limpieza");
    if (error) throw error;
    const nombres: string[] = (data && data.fotos) || [];
    const fotos_urls: Record<string, string> = {};
    for (let i = 0; i < nombres.length; i += 100) {
      const { data: su, error: e2 } = await sb.storage.from("fotos").createSignedUrls(nombres.slice(i, i + 100), 7200);
      if (e2) throw e2;
      for (const s of su) if (s.signedUrl && s.path) fotos_urls[s.path] = s.signedUrl;
    }
    return json({ app: "limpieza", version: 1, fecha: new Date().toISOString(), tablas: data.tablas, fotos_urls });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
