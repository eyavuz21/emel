# Rosin

Couch to 5K for practising an instrument. Your teacher sets the week in thirty seconds; Rosin gets you to Thursday.

**Live:** https://rosin.vercel.app

## The idea

Every practice app is one of two things: it listens to you play and scores the notes (Yousician, Simply Piano, Trala), or it's a diary where you log your minutes (Tonara, Modacity). Both leave you alone on the part that matters, which is turning up three times a week when nobody is making you. Couch to 5K never measured anyone's running; it had a calm voice, a structure, and a reason to go out on Thursday. Nobody had done that for practising an instrument.

Rosin has two sides. The **teacher** writes a thirty-second note after each lesson (what we worked on, what to prepare, one line for the week); Rosin turns it into that pupil's week: three guided sessions with step-by-step captions in the teacher's voice, a checklist for the next lesson, and a journey to get there. The **pupil** runs the sessions with a timer, flags questions and breakthroughs while they're fresh, ticks the checklist, and keeps a streak that forgives a missed day. Both set a goal date, an exam or a performance, and the road re-plans to it.

## What's in v0.1

- Email sign-in (no password); teachers create a studio and get a six-character code; pupils join with it
- **Teacher:** pupils list with this week's progress and flags; per-pupil profile (instrument, level, goal, sessions a week, minutes); lesson note → generated week → preview → publish
- **Pupil:** Today (next session, streak, week dots), a session runner with a progress ring, captions, optional read-aloud (browser speech), pause/skip/stop, and "how did it feel"; Journey (path from lesson to lesson, checklist, flags, tokens); Goal (date, weeks to go, road phases)
- Tokens: one per session, two more for a full week; six is a small reward the teacher marks as given
- Works on this device with no account, so anyone can try the whole loop alone (you play both sides)

Nothing listens to you play. That's the argument, not an omission.

## Stack

- `index.html`: the whole app, no build step, two Google Fonts
- `api/plan.js`: one Vercel function. Takes the teacher's note and the pupil's profile, calls Claude (`claude-opus-5`, structured JSON output, effort `medium`, server-side refusal fallbacks) and returns the week: sessions with steps, minutes and captions, a checklist, one line of encouragement
- `api/config.js`: public Supabase config for the page
- `supabase/schema.sql`: studios, members, one JSON document per pupil that the pupil and their teacher can both read and write, row-level security, five RPCs. Every object is prefixed `rosin_` so it can share a project with other apps

## Deploying

Vercel serves `index.html` as static and `api/*` as Node functions. Environment variables:

| Name | Required | What |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Writes the weeks |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | for accounts | Project Settings → API. The anon key is public by design |

Supabase: run `supabase/schema.sql` in the SQL editor once; under Authentication → URL Configuration add the live URL to Redirect URLs. The built-in email sender is rate-limited, so add custom SMTP (Resend) before a real cohort.

## Running locally

Open `index.html` in a browser and choose "Try it on this device". Accounts and the generated weeks need the deployed functions; the file version writes a plain placeholder week so the loop can still be walked through.

## Roadmap

1. Melisande's recorded voice for the captions, replacing browser speech
2. Pilot with twenty pupils; measure who is still practising in week four
3. Parent view and "share your week with one person"
4. Cello, viola and piano programmes; returning-adult track
5. Studio licences for schools, youth orchestras and music hubs

## Founders

Melisande Yavuz (Royal Academy of Music Fellow, violinist and teacher) and Emre Yavuz (PhD computational neuroscience, UCL). September 2026.
