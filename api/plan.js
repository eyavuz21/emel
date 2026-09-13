// Turns a teacher's thirty-second lesson note into the student's week: three guided sessions
// (steps, minutes, what the teacher's voice says) and a checklist for the next lesson.
import Anthropic from "@anthropic-ai/sdk";

const SCHEMA = {
  type: "object",
  properties: {
    sessions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          intro: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" }, minutes: { type: "number" }, caption: { type: "string" } },
              required: ["name", "minutes", "caption"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "intro", "steps"],
        additionalProperties: false,
      },
    },
    checklist: { type: "array", items: { type: "string" } },
    encouragement: { type: "string" },
  },
  required: ["sessions", "checklist", "encouragement"],
  additionalProperties: false,
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return res.status(200).json({ ok: true, configured: Boolean(process.env.ANTHROPIC_API_KEY) });
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "not_configured", message: "ANTHROPIC_API_KEY is not set on this deployment." });

  const { profile = {}, note = {}, teacherName = "your teacher", weeksToGoal = null } = req.body || {};
  const sessions = Math.min(5, Math.max(2, Number(profile.sessionsPerWeek) || 3));
  const minutes = Math.min(45, Math.max(10, Number(profile.minutes) || 18));
  const workedOn = String(note.workedOn || "").slice(0, 2000);
  const forNext = Array.isArray(note.forNext) ? note.forNext.map(String).slice(0, 10) : [];
  const line = String(note.line || "").slice(0, 400);
  if (!workedOn && !forNext.length) return res.status(400).json({ error: "bad_request", message: "Add what you worked on or what to prepare." });

  const prompt = `You write practice sessions for a music teacher's pupil, in the teacher's voice. British English. Warm, specific, unhurried, never gushing.

Pupil: ${profile.name || "the pupil"}. Instrument: ${profile.instrument || "violin"}. Level: ${profile.level || "beginner"}.${profile.goalLabel ? ` Goal: ${profile.goalLabel}${weeksToGoal !== null ? `, about ${weeksToGoal} weeks away` : ""}.` : ""}
Teacher: ${teacherName}.

The teacher's note after this week's lesson:
What we worked on: ${workedOn || "(not given)"}
For next lesson: ${forNext.length ? forNext.map((x) => "- " + x).join("\n") : "(not given)"}
One line for the week: ${line || "(none)"}

Write exactly ${sessions} sessions for the week, each about ${minutes} minutes in total (the step minutes must add up to between ${minutes - 2} and ${minutes + 2}). Each session has 4 to 6 steps. Structure every session: a short warm-up, then technique from the note, then the piece or passage from the note, then a return to the technique in a new way (interleave), then a one-minute wind-down that ends by telling the pupil to stop. Steps get shorter and more focused as the week goes on; session ${sessions} should feel like preparation for the lesson.

Each step's caption is what the teacher says at the start of that step, one or two sentences, concrete and physical (what to do with the bow, fingers, ears), and it must refer to the note where possible. Never say "great job" style filler. A "stop before it gets messy" instruction belongs somewhere in each session. Vary the sessions; do not repeat captions.

Also write a checklist of 3 to 5 short items the pupil should be able to show at the next lesson, drawn from "For next lesson", and one sentence of encouragement for the week that a real teacher would say.

Respond with JSON only.`;

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 4096,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") return res.status(502).json({ error: "refusal", message: "The model declined this request." });
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    let parsed;
    try { parsed = JSON.parse(text); } catch { return res.status(502).json({ error: "bad_json", message: "The model returned something that was not JSON." }); }
    const plain = (t) => String(t || "").replace(/\s*[\u2014\u2013]\s*/g, ", ").replace(/,\s*,/g, ",");
    parsed.sessions = (parsed.sessions || []).slice(0, sessions).map((s) => ({ ...s, title: plain(s.title), intro: plain(s.intro), steps: (s.steps || []).map((x) => ({ ...x, name: plain(x.name), caption: plain(x.caption) })) }));
    parsed.checklist = (parsed.checklist || []).map(plain);
    parsed.encouragement = plain(parsed.encouragement);
    return res.status(200).json(parsed);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "rate_limited", message: "Too many requests just now. Try again in a minute." });
    if (err instanceof Anthropic.AuthenticationError) return res.status(500).json({ error: "auth", message: "The API key on this deployment was rejected." });
    if (err instanceof Anthropic.APIConnectionError) return res.status(502).json({ error: "connection", message: "Could not reach the model." });
    if (err instanceof Anthropic.APIError) return res.status(502).json({ error: "upstream", message: `Upstream error ${err.status}.` });
    return res.status(500).json({ error: "unknown", message: "Something went wrong." });
  }
}
