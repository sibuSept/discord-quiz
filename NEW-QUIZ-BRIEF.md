# Context handoff: building another quiz

Paste this into a new chat to build a second quiz without re-deriving any of
the decisions from the first one.

---

## What already exists and works

A multiple-choice knowledge check for a Discord community of about 100
people, taken **before** they consume the content, so it reads as a starting
point rather than an exam. It is live and recording submissions end to end.

- **Repo:** `sibuSept/discord-quiz`, branch `claude/discord-quiz-page-g73mhk`
- **Subject of quiz 1:** running and monetising social media theme pages
- **Hosting:** Netlify, drag and drop deploy of a single file
- **Storage:** Google Sheet via a Google Apps Script web app
- **Verified:** a real submission from the live page landed as a row in the sheet

Files in the repo:

```
index.html            the entire quiz: HTML, CSS and JS in one file
apps-script/Code.gs   the Apps Script that writes submissions to the Sheet
SETUP.md              step by step: the Sheet endpoint, then hosting
README.md             how it works and how to edit questions
NEW-QUIZ-BRIEF.md     this file
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

## How the existing one works

**Flow:** handle entry, then one question at a time with four options each,
then a results screen.

- Advancing without choosing an option shows an inline error.
- A Back button returns to the previous question with the answer still selected.
- Keyboard: 1 to 4 or A to D selects, Enter advances.
- Score is the count of correct answers. A band lookup turns it into a line
  of feedback.
- **The results screen never reveals the answers.** Score, band, and attempt
  history only. Someone who wants a better score goes back through the
  content and retakes it. This is deliberate and is stated on the intro
  screen so nobody finishes expecting an answer key.
- On finish the browser POSTs `{ handle, score, total, timestamp }` to the
  Apps Script endpoint. One row per attempt, so filtering the sheet by handle
  gives that person's history.
- Attempts are also written to `localStorage`, which drives an "Attempt 2, up
  from 9" line and a per-device history list. Device local only, so it is a
  bonus on top of the sheet and never the record.
- A submission that fails to send is queued in `localStorage` and retried the
  next time that person opens the page.

**Why the POST looks odd:** Apps Script web apps do not return usable CORS
headers on POST, so the request goes out as a no-cors simple request
(`text/plain` body, no preflight). The response is opaque, so a resolved
fetch means the browser handed the request off, not that a row was written.
The sheet is the only real confirmation. Do not "fix" this by adding CORS
headers or changing the content type; it will break the submission.

---

## Code shape

Everything editable lives in one `CONFIG` block plus two arrays at the top of
the `<script>` section.

```js
const CONFIG = {
  endpoint: "https://script.google.com/macros/s/.../exec",
  title:  "Theme Page Knowledge Check",
  note:   "You get your score at the end, but not the answers. ...",
  blurb:  "A quick check of what you already know ...",
  localHistory: true
};

const QUESTIONS = [
  { q: "Question text?",
    options: ["First", "Second", "Third", "Fourth"],
    answer: 2 },     // 0-based index of the correct option
  // ...
];

const BANDS = [      // minPct is a percentage, not a raw score, so these
  { minPct: 100, label: "Full marks",     text: "..." },   // stay correct if
  { minPct: 80,  label: "Strong footing", text: "..." },   // the question
  { minPct: 60,  label: "Solid start",    text: "..." },   // count changes.
  { minPct: 40,  label: "Plenty to gain", text: "..." },   // Descending order.
  { minPct: 0,   label: "Fresh start",    text: "..." }
];
```

Colours are CSS custom properties in one `:root` block at the top of the
`<style>` section, with a `prefers-color-scheme: dark` override. Changing the
look is mostly swapping hex values there.

---

## To build quiz number two

1. **Copy `index.html`** from the repo as the starting point. Do not rewrite
   it from scratch; the validation, keyboard handling, retry queue and band
   logic are all already correct and tested.
2. **Replace** `CONFIG.title`, `CONFIG.blurb`, the `QUESTIONS` array and the
   `BANDS` feedback text.
3. **Decide the storage question** (below).
4. **Deploy** as a separate Netlify site so each quiz has its own URL.

### The storage decision

**Option A, reuse the same Sheet and endpoint.** Add a `quiz` field to the
payload and a matching column in `Code.gs`, then filter the sheet by quiz
name. One deployment to maintain, all results in one place. Requires editing
and redeploying the existing Apps Script, which currently works, so change it
carefully. This is the better option if there will be more than two quizzes.

**Option B, a new Sheet and a new Apps Script deployment per quiz.** Zero
risk to the working setup, completely independent, but it means repeating the
full Apps Script setup each time, which is about fifteen minutes of clicking.
Fine for a one off second quiz.

`SETUP.md` in the repo has the full Apps Script walkthrough either way,
including the setting people get wrong: **Who has access must be "Anyone",
not "Anyone with Google account"**, because quiz takers are not signed in.
Getting that wrong fails silently with no error and no row.

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
- **No em dashes anywhere** in copy, comments or docs. Use full stops,
  colons, or a rewritten clause.
- **British spelling** in user facing copy (monetising, not monetizing).

## Explicitly out of scope

- A Discord bot: DMs, role assignment, channel gating. Needs always-on hosting.
- AI graded free text answers. Would mean API calls and billing.
- A randomised question bank.

---

## Practical notes

- **Netlify free tier is about 20 deploys a month** across all sites, shared
  from a 300 credit pool. Batch changes into one deploy rather than
  redeploying after every small edit.
- **Bandwidth is a non issue.** The page is roughly 23 KB, about 7 KB gzipped.
- **Redeploying does not change the URL.** A live quiz can be restyled or
  reworded at any time; everyone who opens the link afterwards gets the new
  version. Only the questions changing has consequences, because scores before
  and after are not strictly comparable.
- **Test before sharing the link:** take the quiz on the live URL with a
  throwaway handle, confirm the row appears in the sheet, then delete that
  row. The results screen saying "Result sent" is not proof; only the sheet is.

## What to ask the user before building

1. The questions, the four options each, and which option is correct.
2. The quiz title and the intro blurb.
3. Whether to reuse the existing Sheet or start a new one.
4. Branding: community name, logo, a hex colour, or a link to match against.
