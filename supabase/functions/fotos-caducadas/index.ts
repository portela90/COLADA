// Limpieza (limpieza-cie): borra del Storage las fotos de más de 12 meses, salvo las de trabajos que quedaron NO-OK.
// El trabajo y sus datos se quedan; solo se quita la foto (la fila de «fotos» queda marcada como liberada).
// La llama cada mes pg_cron con la cabecera x-clave = config_int «fotos_limpia» (no hay claves en el código).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const c = await sb.from("config_int").select("v").eq("k", "fotos_limpia").maybeSingle();
    const esperada = (c.data?.v || "").trim();
    if (esperada.length < 32 || (req.headers.get("x-clave") || "").trim() !== esperada) return json({ error: "no autorizado" }, 401);
    const meses = 12;
    let total = 0;
    for (let vuelta = 0; vuelta < 20; vuelta++) {
      const r = await sb.rpc("fotos_caducadas", { p_meses: meses, p_lim: 100 });
      if (r.error) return json({ error: r.error.message, borradas: total }, 500);
      const L = (r.data || []) as { id: string; ruta: string }[];
      if (!L.length) break;
      const rm = await sb.storage.from("fotos").remove(L.map((x) => x.ruta));
      if (rm.error) return json({ error: rm.error.message, borradas: total }, 500);
      const mk = await sb.rpc("fotos_marcar_borradas", { p_ids: L.map((x) => x.id) });
      if (mk.error) return json({ error: mk.error.message, borradas: total }, 500);
      total += L.length;
    }
    return json({ borradas: total, meses });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
