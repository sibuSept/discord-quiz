# Context handoff: building the next quiz

Paste this into a new chat to build quiz 3 without re-deriving any of the
decisions from the first two.

---

## What already exists and works

Two multiple-choice knowledge checks for a Discord community of about 100
people, taken **before** they consume the content, so each reads as a
starting point rather than an exam.

- **Repo:** `sibuSept/discord-quiz`
- **Branch with both quizzes:** `claude/nifty-brown-f6q3zv`
- **Quiz 1:** running and monetising social media theme pages, 15 questions.
  Live on Netlify and recording.
- **Quiz 2:** choosing a niche, 15 questions. Built and verified, may or may
  not be on Netlify yet.
- **Storage:** Google Sheet via a Google Apps Script web app.
- `main` has neither. Both live on feature branches and no pull request has
  been opened.

```
index.html              quiz 1, the older intro style
niche-quiz/index.html   quiz 2, copy THIS one for quiz 3
apps-script/Code.gs     the Apps Script that writes submissions to the Sheet
SETUP.md                step by step: the Sheet endpoint, then hosting
README.md               how it works and how to edit questions
NEW-QUIZ-BRIEF.md       this file
```

---

## Hard constraints, carried over

These are not preferences. They define the project.

- **No AI, no API calls.** Scoring is plain arithmetic: count the correct
  answers. Nothing calls out to any model or paid service, at build time or
  at run time.
- **Everything free.** Static hosting, free storage. No credit card, no API
  key, no monthly cost anywhere in the stack.
- **Single self-contained HTML file.** HTML, CSS and JS inline. No build
  step, no framework, no always-on server, no backend process.
- **No external requests except the one submission POST.** No web fonts, no
  CDN libraries, no analytics. The page must work as a local file.

---

## How the existing ones work

**Flow:** handle entry, then one question at a time with four options each,
then a results screen.

- Advancing without choosing an option shows an inline error.
- A Back button returns to the previous question with the answer still
  selected.
- Keyboard: 1 to 4 or A to D selects, Enter advances.
- Score is the count of correct answers. A band lookup turns it into a line
  of feedback.
- **The results screen never reveals the answers.** Score, band and attempt
  history only. Someone who wants a better score goes back through the
  content and retakes it. This is deliberate and is stated on the intro
  screen so nobody finishes expecting an answer key.
- On finish the browser POSTs
  `{ handle, score, total, timestamp, quiz }` to the Apps Script endpoint.
  One row per attempt, so filtering the sheet by handle gives that person's
  history, and filtering by quiz separates the quizzes.
- Attempts are also written to `localStorage`, which drives an "Attempt 2,
  up from 9" line and a per-device history list. Device local only, so it is
  a bonus on top of the sheet and never the record. **The keys are
  namespaced per quiz**, e.g. `dq.niche.history.v1`. Give quiz 3 its own.
- A submission that fails to send is queued in `localStorage` and retried
  the next time that person opens the page.

**Why the POST looks odd:** Apps Script web apps do not return usable CORS
headers on POST, so the request goes out as a no-cors simple request
(`text/plain` body, no preflight). The response is opaque, so a resolved
fetch means the browser handed the request off, not that a row was written.
The sheet is the only real confirmation. Do not "fix" this by adding CORS
headers or changing the content type. It will break the submission.

---

## Code shape

Everything editable lives in one `CONFIG` block plus two arrays at the top
of the `<script>` section.

```js
const CONFIG = {
  endpoint: "https://script.google.com/macros/s/.../exec",
  quizId:   "niche",          // goes in the sheet's Quiz column
  title:    "Niche Knowledge Check",
  note:     "Your score at the end, but not the answers.",
  blurb:    "",               // blank lines are hidden, not left as a gap
  localHistory: true
};

const QUESTIONS = [
  { q: "Question text?",
    options: ["First", "Second", "Third", "Fourth"],
    answer: 2 },     // 0-based index of the correct option
];

const BANDS = [      // minPct is a percentage, not a raw score, so these
  { minPct: 100, label: "Full marks",     text: "..." },   // stay correct if
  { minPct: 80,  label: "Strong footing", text: "..." },   // the question
  { minPct: 60,  label: "Solid start",    text: "..." },   // count changes.
  { minPct: 40,  label: "Plenty to gain", text: "..." },   // Descending.
  { minPct: 0,   label: "Fresh start",    text: "..." }
];
```

**The intro is deliberately minimal**: title, one line, field, button. The
user asked for that explicitly. The question count and rough time are
computed from the array and prepended to `CONFIG.note`, so they cannot go
stale. `blurb` is blank and hidden. Do not add paragraphs back.

Colours are CSS custom properties in one `:root` block at the top of the
`<style>` section, with a `prefers-color-scheme: dark` override. Changing
the look is mostly swapping hex values there.

---

## To build quiz three

1. **Copy `niche-quiz/index.html`**, not the root `index.html`. It is the
   newer of the two: trimmed intro, `quizId`, namespaced storage keys. Do
   not rewrite from scratch. The validation, keyboard handling, retry queue
   and band logic are already correct and tested.
2. **Put it in its own folder**, e.g. `quiz-3/index.html`, so the folder can
   be dragged onto Netlify and served at the root.
3. **Replace** `CONFIG.title`, `CONFIG.note` if the wording should change,
   `CONFIG.quizId`, the `QUESTIONS` array and the `BANDS` feedback text.
4. **Change the two `localStorage` keys** near the top of the machinery
   section to match the new `quizId`.
5. **Decide the storage question** (below).
6. **Deploy** as a separate Netlify site so each quiz has its own URL.

### The storage decision

**The easy path, and the recommended one: reuse the existing endpoint.**
Point `CONFIG.endpoint` at the deployment that runs the current `Code.gs`,
the one with the Quiz column:

```
https://script.google.com/macros/s/AKfycbzVKuO377whES3fwbvGsxxHS1X_ctW-bWx64ueuQYt-ptq_rimH1NrHh6ynTLxJxnS7/exec
```

Give quiz 3 a new `quizId` and it lands in the same sheet, labelled, with
**no Apps Script setup at all**. `Code.gs` already handles any number of
quizzes. This is the whole reason the Quiz column exists.

**Confirm which spreadsheet that deployment is bound to before relying on
it.** It was never established in the session that built quiz 2. In the
Apps Script editor, **Overview** in the sidebar names the bound file, and
**Extensions > Apps Script** opened from a sheet always belongs to that
sheet.

**The alternative, a new Sheet per quiz**, is zero risk to the working setup
but means repeating the full Apps Script walkthrough, about fifteen minutes
of clicking. `SETUP.md` has it either way, including the setting people get
wrong: **Who has access must be "Anyone"**, not "Anyone with Google
account", because quiz takers are not signed in. Getting that wrong fails
silently with no error and no row.

### Apps Script traps worth knowing

- **A deployment runs the code version it was deployed with.** Saving new
  code changes nothing until you redeploy. Two deployments of one project
  can be running different code, which is exactly what happened here.
- **"New version" on an existing deployment keeps the URL. "New deployment"
  mints a new one.** Use New version unless you actually want a second URL,
  otherwise the live pages keep hitting the old code.
- **Do not transcribe a deployment id from a screenshot.** Capital I and
  lowercase l are identical in that font. Use the Copy button.

---

## What to ask the user before building

1. The questions, the four options each, and which option is correct. They
   paste these as plain text with a tick on the right answer.
2. The quiz title.
3. Whether to reuse the existing endpoint or start a new Sheet.
4. Branding: community name, a hex colour, a logo. **This was asked twice
   during quiz 2 and never answered, so quiz 2 still wears quiz 1's Discord
   blurple** (`#5865f2` light, `#7c86f7` dark). Ask once, and if nothing
   comes back, ship with the existing palette rather than blocking.

A logo has to be an inline SVG or a data URI, since the no-external-requests
rule rules out a linked image file.

---

## Decisions already made, do not re-litigate

- **The answer key is visible in page source.** Accepted. Hiding it needs a
  backend. The results screen not showing answers is a separate, deliberate
  choice about what the taker sees, not a security measure.
- **Identity is honour system.** Someone types a handle into a text box.
  Typos split one person into two rows and nothing stops a fresh name for a
  clean first attempt. Accepted at this scale. The proper fix is Discord
  OAuth, which needs a server and a secret, and is out of scope.
- **Bands are percentage based**, so the question count can change freely.
- **The intro stays minimal.** One line, not three paragraphs.
- **No em dashes anywhere** in copy, comments or docs. Use full stops,
  colons, or a rewritten clause.
- **British spelling** in user facing copy (monetising, not monetizing).

## Explicitly out of scope

- A Discord bot: DMs, role assignment, channel gating. Needs always-on
  hosting.
- AI graded free text answers. Would mean API calls and billing.
- A randomised question bank.

---

## How to verify before shipping

None of this needs network access, and all of it caught something real:

- **Assert each answer index against the correct option text**, taken from
  what the user pasted. Do not re-count indices by eye.
- **Drive the whole quiz in a browser** (Playwright and Chromium are
  available): answer every question on the known key and expect full marks,
  then invert every answer and expect zero. Full marks alone does not prove
  scoring works.
- **Check the guards:** empty handle blocked, unanswered question blocked,
  Back preserves the selection, no answer text anywhere on the results
  screen.
- **Intercept the submission POST** with Playwright routing to confirm the
  body, the `text/plain` content type and the quiz label, without sending
  anything to the live endpoint.
- **Diff the machinery** against the file you copied, to prove only CONFIG,
  QUESTIONS, BANDS and the storage keys changed.
- **Run `Code.gs` in Node against a mock spreadsheet** if you change it at
  all. It writes to live data.

---

## Practical notes

- **Netlify free tier is about 20 deploys a month** across all sites. Batch
  changes into one deploy rather than redeploying after every small edit.
- **Redeploying does not change the URL.** A live quiz can be restyled or
  reworded at any time. Only the questions changing has consequences,
  because scores before and after are not strictly comparable.
- **The page is roughly 23 KB**, about 7 KB gzipped. Bandwidth is a non
  issue.
- **Test before sharing the link:** take the quiz on the live URL with a
  throwaway handle, confirm the row appears in the sheet with the right
  Quiz label, then delete that row. The results screen saying "Result sent"
  is not proof. Only the sheet is.
- **Filter by Quiz before reading results.** Averaging across two different
  question sets gives a meaningless number.
- **An agent sandbox may not be able to reach `script.google.com`.** The one
  that built quiz 2 could not, so endpoints had to be checked in a browser
  by the user.
