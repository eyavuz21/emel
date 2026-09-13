// Spoken lesson notes → text, for browsers without built-in dictation. POST {audio (base64), mime} → {text}. Teacher only.
import { whoAmI, readJson } from "./_auth.js";
export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  const xi = process.env.ELEVENLABS_API_KEY;
  if (!xi) return res.status(503).json({ error: "not_configured", message: "ELEVENLABS_API_KEY is not set on this deployment." });
  const who = await whoAmI(req);
  if (!who || !who.me || who.me.role !== "teacher") return res.status(401).json({ error: "unauthorised", message: "Only a signed-in teacher can do this." });
  const { audio, mime = "audio/webm" } = readJson(req);
  if (!audio) return res.status(400).json({ error: "bad_request", message: "No audio." });
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("language_code", "eng");
  form.append("file", new Blob([Buffer.from(audio, "base64")], { type: mime }), "note.webm");
  const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": xi }, body: form });
  if (!r.ok) { const t = await r.text().catch(() => ""); return res.status(502).json({ error: "upstream", message: `ElevenLabs ${r.status}: ${t.slice(0, 200)}` }); }
  const j = await r.json();
  return res.status(200).json({ text: j.text || "" });
}
