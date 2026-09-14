<p align="center"><img src="logo.svg" alt="Mosso: a musical note running towards a finish line. Moving towards your goal." width="560"></p>

# Mosso

**Moving towards your goal.** Couch to 5K for practising an instrument, on your own with a teacher or as part of a choir or orchestra. Your teacher sets the week in thirty seconds; Mosso gets you to Thursday.

**Live:** https://mossoapp.vercel.app (the old sostenutoapp.vercel.app address still works)

## The idea

Every practice app is one of two things: it listens to you play and scores the notes (Yousician, Simply Piano, Trala), or it's a diary where you log your minutes (Tonara, Modacity). Both leave you alone on the part that matters, which is turning up three times a week when nobody is making you. Couch to 5K never measured anyone's running; it had a calm voice, a structure, and a reason to go out on Thursday. Nobody had done that for practising an instrument.

Mosso has two sides. The **teacher** writes a thirty-second note after each lesson (what we worked on, what to prepare, one line for the week); Mosso turns it into that pupil's week: three guided sessions with step-by-step captions in the teacher's voice, a checklist for the next lesson, and a journey to get there. The **pupil** runs the sessions with a timer, flags questions and breakthroughs while they're fresh, ticks the checklist, and keeps a streak that forgives a missed day. Both set a goal date, an exam or a performance, and the road re-plans to it. A **conductor** does the same for a whole choir or orchestra: one rehearsal note becomes a week for every member, each for their own part.

## What's in v0.3 (14 September 2026)

- **Group mode for choirs and orchestras:** a studio can be an ensemble. Members set their part (alto, second violin); the conductor opens the Group tab, picks everyone or particular parts, writes one rehearsal note, reviews one preview, and publishes a week to every member. The sessions are written for "your part": notes and rhythms slowly, entries counted, words from memory, listening with the score. The conductor's cloned voice is synthesised once and shared. Add a task to everyone, and book a rehearsal for everyone, from the same screen
- **Tasks during the week:** a teacher who thinks of something on Wednesday adds it to a pupil's week without rewriting it. It appears on the pupil's Today screen under "New from [teacher]" and in their Journey checklist; the pupil ticks it off
- **Lessons, booked and moved in the app:** a Lessons tab for the pupil (what's coming up, "Can't make it" with a reason, ask for a lesson at a time of their choosing) and a Lessons card for the teacher on each pupil (book one, book weekly for six weeks, confirm or decline requests, see cancellations with the reason). Requests and cancellations surface at the top of the teacher's pupils list under "Needs you". The next booked lesson becomes the default date for the next week's plan
- New name, new mark: Mosso, with a note running towards a finish line

## What was in v0.2

- Email sign-in (no password); teachers create a studio and get a six-character code; pupils join with it
- **Teacher:** pupils list with this week's progress and flags; per-pupil profile (instrument, level, goal, sessions a week, minutes); lesson note → generated week → preview → publish
- **Pupil:** Today (next session, streak, week dots), a session runner with a progress ring, captions, optional read-aloud (browser speech), pause/skip/stop, and "how did it feel"; Journey (path from lesson to lesson, checklist, flags, tokens); Goal (date, weeks to go, road phases)
- Tokens: one per session, two more for a full week; six is a small reward the teacher marks as given
- **See how it works:** a demo with three pupils and a week already set, switchable between the pupil's side, the teacher's side and the parent's view, no sign-in
- **The teacher's voice:** on first use the teacher reads a thirty-second passage with a consent box ticked; Mosso clones the voice (ElevenLabs) and every caption in every published week is spoken in it. Only text the teacher has previewed and published is ever spoken; the teacher can re-record or delete the clone at any time, and deleting it removes it from ElevenLabs too. Pupils are told it's generated
- **Dictated notes:** every note field has a Dictate button. Browser speech recognition where it exists (Chrome, Safari), server transcription as the fallback
- **Share card:** the pupil turns their week into an image (sessions, minutes, streak, checklist, the teacher's line) and shares it with a parent or anyone they choose, from their own phone. Nothing is shared unless the pupil sends it; nothing else about them is in it
- Works on this device with no account, so anyone can try the whole loop alone (you play both sides)

Nothing listens to you play. That's the argument, not an omission.

## Accounts, children and consent

Two kinds of account: teacher and pupil. There is no parent login. A young pupil's account is set up and held by a parent with the parent's own email (the onboarding says so, for under-13s), so the adult controls it, and the pupil decides what to share by sending the card. No third role means no extra personal data, no account linking, and nothing a stranger could reach: pupils are visible only to the teacher whose code they joined with. A pupil's document holds a name, an instrument, a level, a goal, the weeks, the flags and the feelings, and nothing else.

## Stack

- `index.html`: the whole app, no build step, two Google Fonts
- `api/plan.js`: a Vercel function. Takes the teacher's note and the pupil's profile (or a conductor's rehearsal note and the parts it is for), calls Claude (`claude-opus-5`, structured JSON output, effort `medium`, server-side refusal fallbacks) and returns the week: sessions with steps, minutes and captions, a checklist, one line of encouragement
- `api/voice.js`: creates the teacher's cloned voice from the recorded sample (ElevenLabs), or deletes it. Teacher only, verified server-side against Supabase
- `api/speak.js`: turns one caption into audio in the studio's voice and stores it in the `sostenuto-audio` bucket under the studio's folder, using the teacher's own session so storage policies apply
- `api/transcribe.js`: spoken notes to text (ElevenLabs Scribe) for browsers without built-in dictation
- `api/config.js`: public Supabase config for the page, plus which features are configured
- `supabase/schema.sql`: studios, members, one JSON document per pupil that the pupil and their teacher can both read and write, row-level security, five RPCs. Every database object keeps the `sostenuto_` prefix from the previous name (renaming live tables gains nothing and risks the pilot's data); the prefix is never shown to a user
- `logo.svg`, `mark.svg`, `icon-tile.svg`: the mark and wordmark

## Deploying

Vercel serves `index.html` as static and `api/*` as Node functions. Environment variables:

| Name | Required | What |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Writes the weeks |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | for accounts | Project Settings → API. The anon key is public by design |
| `ELEVENLABS_API_KEY` | for the voice | Voice cloning, spoken captions, and transcription fallback |

Supabase: run `supabase/schema.sql` in the SQL editor once (or `supabase/migrate-2026-09-13-rename.sql` if you had the earlier `rosin_` objects); under Authentication → URL Configuration add the live URL to Redirect URLs. The built-in email sender is rate-limited, so add custom SMTP (Resend) before a real cohort.

## Running locally

Open `index.html` in a browser and choose "Try it on this device". Accounts and the generated weeks need the deployed functions; the file version writes a plain placeholder week so the loop can still be walked through.

## Roadmap

1. Pilot with twenty pupils and one ensemble; measure who is still practising in week four
2. Record a clip at the end of a session and send it to the teacher, unscored
3. Custom SMTP for sign-in emails; a daily cap on generation per studio; calendar export for booked lessons
4. Piano and singing programmes; returning-adult track; sectionals (one note per part) for larger ensembles
5. Studio and ensemble licences for schools, youth orchestras, choirs and music hubs

## The name

*Mosso*: with movement. The marking on the page that tells you to keep moving (*più mosso*, more movement), which is the whole product: a week that carries you from one lesson to the next. The mark is a note running towards a finish line. Previously Sostenuto, and before that Rosin.

## Founders

Melisande Yavuz (Royal Academy of Music Fellow, violinist and teacher) and Emre Yavuz (PhD computational neuroscience, UCL). September 2026.
