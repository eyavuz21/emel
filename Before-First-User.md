# Emel: before the first real user

14 September 2026. What has to be true before a pupil who is not us opens the app. Owner in brackets.

## Must (blocks the first pupil)
- **Supabase → Auth → Redirect URLs: add `https://emelmusic.vercel.app`.** Until then the sign-in email link lands on the old address. (Emre)
- **ElevenLabs key: Voices = Write, Text to Speech and Speech to Text on.** Then Melisande records her thirty seconds once, in the app, and checks "Your voice is set". (Emre sets, Melisande records)
- **Custom SMTP (Resend) for sign-in emails.** Supabase's built-in sender is rate-limited to a handful an hour; twenty pupils signing up on one evening will hit it. (Emre)
- **A daily cap on plan generation per studio**, so a bug or a curious pupil cannot run up the Anthropic bill. (Emre)
- **One full dry run as a pupil and as the teacher on a phone**, not the demo: sign in, join with the code, receive a published week, run a session with voice on, flag a question, book and cancel a lesson. Fix whatever breaks. (Both, one evening)
- **Melisande's first real lesson note → generated week → she reads it and says "I would send this".** If she would not, the prompt changes before anyone else sees it. (Melisande)

## Should (before the cohort of twenty, by 15 Oct)
- **Which twenty**: names, instruments, ages, which are under 13 (parent holds the account). (Melisande)
- **The WhatsApp run first**: five learners, voice notes and a Sunday check-in, one week, before the app. It surfaces the wording problems for free. (Melisande)
- **Consent and data in plain words**: one paragraph for parents on what is stored (name, instrument, the weeks, the flags), where (Supabase, EU region to confirm), that the voice is the teacher's own clone and can be deleted, and that nothing is shared unless the pupil sends the card. (Emre drafts, Melisande sends)
- **A way to measure week four**: log session completions per pupil and whether Voice was left on. The stop rule depends on this number existing. (Emre)
- **Pupil-side copy read aloud by Melisande**: every label and caption, renamed where a pupil or parent would say it differently. (Melisande)
- **A "something's wrong" route**: a WhatsApp number or email in the app footer, checked daily during the pilot. (Emre)

## Could (nice, not needed)
- Push notifications ("Thursday. Eighteen minutes."), which need the phone app, after the pilot proves people come back.
- Calendar export for booked lessons.
- Group mode with SLYO as a second cohort once the one-to-one loop holds.

## Do not do before the first user
- Rename anything, redesign anything, or add a feature not on this page. The pilot tests the loop that exists.
