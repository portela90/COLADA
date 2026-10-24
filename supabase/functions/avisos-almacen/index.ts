// Envía avisos (Web Push) a los móviles de la app de Almacén.
// Lo llama solo la base de datos (_alm_avisos_enviar, con pg_net) con un secreto guardado en secretos_int.
// Acción "init": crea las claves VAPID si no existen.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
async function sec(k: string): Promise<string | undefined> {
  const { data } = await sb.from("secretos_int").select("v").eq("k", k).maybeSingle();
  return data?.v;
}

Deno.serve(async (req) => {
  try {
    const b = await req.json();
    const s = await sec("push_secret");
    if (!s || b.secret !== s) return json({ error: "no autorizado" }, 401);
    let pub = await sec("vapid_public"), priv = await sec("vapid_private");
    if (!pub || !priv) {
      const k = webpush.generateVAPIDKeys();
      const { error } = await sb.from("secretos_int").upsert([{ k: "vapid_public", v: k.publicKey }, { k: "vapid_private", v: k.privateKey }]);
      if (error) return json({ error: error.message }, 500);
      pub = k.publicKey; priv = k.privateKey;
    }
    if (b.accion === "init") return json({ ok: true });
    webpush.setVapidDetails("https://portela90.github.io/COLADA/almacen.html", pub, priv);
    const { data: subs } = await sb.from("alm_push_subs").select("*").eq("activo", true);
    let env = 0, err = 0;
    for (const m of b.mensajes || []) {
      for (const x of subs || []) {
        try {
          await webpush.sendNotification({ endpoint: x.endpoint, keys: { p256dh: x.p256dh, auth: x.auth } },
            JSON.stringify({ titulo: m.titulo, texto: m.texto, url: m.url || "almacen.html", tag: m.tag || null }), { TTL: 12 * 3600 });
          env++;
          if (x.fallos) await sb.from("alm_push_subs").update({ fallos: 0 }).eq("id", x.id);
        } catch (e) {
          err++;
          const code = (e as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410 || (x.fallos || 0) >= 9) await sb.from("alm_push_subs").update({ activo: false }).eq("id", x.id);
          else await sb.from("alm_push_subs").update({ fallos: (x.fallos || 0) + 1 }).eq("id", x.id);
        }
      }
    }
    return json({ ok: true, env, err });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
