// Turn one caption into audio in the studio's voice and store it. POST {text, path} → {url}.
// Teacher only. The file goes into the public sostenuto-audio bucket under the studio's folder, using the
// teacher's own Supabase session, so storage policies apply exactly as they would from the browser.
import { whoAmI, readJson } from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  const xi = process.env.ELEVENLABS_API_KEY;
  if (!xi) return res.status(503).json({ error: "not_configured", message: "ELEVENLABS_API_KEY is not set on this deployment." });
  const who = await whoAmI(req);
  if (!who || !who.me || who.me.role !== "teacher" || !who.me.voice_id) return res.status(401).json({ error: "unauthorised", message: "Only a teacher with a recorded voice can do this." });

  const { text, path } = readJson(req);
  const clean = String(text || "").trim().slice(0, 600);
  if (!clean) return res.status(400).json({ error: "bad_request", message: "Nothing to say." });
  const safePath = String(path || "").replace(/[^a-zA-Z0-9_\-\/\.]/g, "").replace(/\.\./g, "");
  if (!safePath.startsWith(`${who.me.studio_id}/`) || !safePath.endsWith(".mp3")) return res.status(400).json({ error: "bad_request", message: "Bad path." });

  const tts = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(who.me.voice_id)}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": xi, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: clean, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15 } }),
  });
  if (!tts.ok) { const t = await tts.text().catch(() => ""); return res.status(502).json({ error: "upstream", message: `ElevenLabs ${tts.status}: ${t.slice(0, 200)}` }); }
  const mp3 = Buffer.from(await tts.arrayBuffer());

  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  const up = await fetch(`${url}/storage/v1/object/sostenuto-audio/${safePath}`, {
    method: "POST", headers: { apikey: key, authorization: `Bearer ${who.token}`, "content-type": "audio/mpeg", "x-upsert": "true" }, body: mp3,
  });
  if (!up.ok) { const t = await up.text().catch(() => ""); return res.status(502).json({ error: "storage", message: `Storage ${up.status}: ${t.slice(0, 200)}` }); }
  return res.status(200).json({ url: `${url}/storage/v1/object/public/sostenuto-audio/${safePath}`, chars: clean.length });
}
