# Context handoff

Paste this into a new chat to pick this project up without re-deriving any
of the decisions.

---

## What this is

Multiple-choice knowledge checks for a Discord community of about 100
people, taken **before** they consume the content, so each reads as a
starting point rather than an exam.

- **Repo:** `sibuSept/discord-quiz`
- **Quiz 1 branch:** `claude/discord-quiz-page-g73mhk`
- **Quiz 2 branch:** `claude/nifty-brown-f6q3zv`, which is built on top of
  quiz 1's branch and contains both
- **`main` has neither.** It is still just the README. Nothing has been
  merged and no pull request has been opened.

```
index.html              quiz 1: running and monetising theme pages, 15 questions
niche-quiz/index.html   quiz 2: choosing a niche, 15 questions
apps-script/Code.gs     the Apps Script that writes submissions to a Sheet
SETUP.md                step by step: the Sheet endpoint, then hosting
README.md               how it works and how to edit questions
NEW-QUIZ-BRIEF.md       this file
```

---

## Status

**Quiz 1** is live on Netlify and recording. Untouched this session apart
from one inert change described below.

**Quiz 2** is finished and verified but **not yet deployed**. The file to
put on Netlify is `niche-quiz/index.html`. Keep that filename so it serves
at the root.

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

## How the quizzes work

**Flow:** handle entry, then one question at a time with four options each,
then a results screen.

- Advancing without choosing an option shows an inline error.
- A Back button returns to the previous question with the answer still
  selected.
- Keyboard: 1 to 4 or A to D selects, Enter advances.
- Score is the count of correct answers. A band lookup turns it into a line
  of feedback. Bands are percentage based, so the question count can change.
- **The results screen never reveals the answers.** Score, band and attempt
  history only. This is deliberate and is stated on the intro screen so
  nobody finishes expecting an answer key.
- On finish the browser POSTs
  `{ handle, score, total, timestamp, quiz }` to an Apps Script endpoint.
  One row per attempt.
- Attempts are also written to `localStorage`, driving an "Attempt 2, up
  from 9" line and a per-device history list. Device local only, a bonus on
  top of the sheet and never the record. Keys are namespaced per quiz.
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

const BANDS = [      // minPct is a percentage, so these survive a change
  { minPct: 100, label: "Full marks",     text: "..." },   // in question
  { minPct: 80,  label: "Strong footing", text: "..." },   // count.
  { minPct: 60,  label: "Solid start",    text: "..." },   // Descending.
  { minPct: 40,  label: "Plenty to gain", text: "..." },
  { minPct: 0,   label: "Fresh start",    text: "..." }
];
```

Quiz 2's intro is deliberately minimal: title, one line, field, button. The
question count and rough time are computed from the array and prepended to
`CONFIG.note`, so they cannot go stale.

Colours are CSS custom properties in one `:root` block at the top of the
`<style>` section, with a `prefers-color-scheme: dark` override.

---

## The Apps Script situation, read this carefully

There are **three deployments** in play. They are not interchangeable. A
deployment runs whichever code version was current when it was deployed,
so two deployments of the same project can be running different code.

| Deployment ID starts | Used by | Code it runs |
|---|---|---|
| `AKfycbx0t6La...` | quiz 1, live on Netlify | old, six columns |
| `AKfycbyNW64AX...` | nothing, superseded | unknown |
| `AKfycbzVKuO377...` | quiz 2, in the repo now | new, with Quiz column |

`Code.gs` was updated this session to add a **Quiz** column, written from
each page's `quizId`. Quiz is the **last** column on purpose, so rows
written before it existed stay lined up. The first submission after the new
code goes live adds the header and stamps every pre-existing row
`theme-pages`, once, then never touches them again. A submission carrying
no `quizId` is also recorded as `theme-pages`.

**Which spreadsheet each deployment is bound to was never confirmed.** The
user was asked twice and did not answer. Confirm before drawing any
conclusion about where rows land. In the Apps Script editor, **Overview**
in the sidebar names the bound file, and **Extensions > Apps Script** opened
from a sheet always belongs to that sheet.

**Known loose end:** quiz 1's deployment still runs the old six column code,
so its rows will land with a blank Quiz cell once the column exists. The fix
takes two minutes and needs no Netlify redeploy: Apps Script, **Deploy >
Manage deployments**, pencil on the `AKfycbx0t6La...` deployment,
**Version: New version > Deploy**. The URL does not change, so quiz 1's live
page picks up the new code immediately.

`SETUP.md` has the full walkthrough, including the setting people get wrong:
**Who has access must be "Anyone"**, not "Anyone with Google account",
because quiz takers are not signed in. Getting that wrong fails silently
with no error and no row.

---

## Still outstanding

1. **Deploy quiz 2 to Netlify.** Drag `niche-quiz/index.html`. Then test on
   the live URL with a throwaway handle, confirm a row appears with `niche`
   in the Quiz column, and delete that row. The results screen saying
   "Result sent" is not proof. Only the sheet is.
2. **Branding for quiz 2.** The user asked for a fuller rebrand: community
   name, accent hex for light and dark, and a logo. Never supplied, so quiz
   2 currently wears quiz 1's Discord blurple (`#5865f2` light, `#7c86f7`
   dark). A logo has to be an inline SVG or a data URI, since the
   no-external-requests rule rules out a linked image file.
3. **Bump quiz 1's deployment** to a new version, per above.
4. **Decide what happens to `main`.** Both quizzes live only on feature
   branches. Offer a pull request folding them in.

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

- A Discord bot: DMs, role assignment, channel gating. Needs always-on
  hosting.
- AI graded free text answers. Would mean API calls and billing.
- A randomised question bank.

---

## Practical notes

- **Netlify free tier is about 20 deploys a month** across all sites.
  Batch changes into one deploy.
- **Redeploying does not change the URL.** A live quiz can be restyled or
  reworded at any time. Only the questions changing has consequences,
  because scores before and after are not strictly comparable.
- **The page is roughly 23 KB**, about 7 KB gzipped. Bandwidth is a non
  issue.
- **Filter by Quiz before reading results** if both quizzes share a sheet.
  Averaging across two different question sets gives a meaningless number.
- **Transcribing a deployment ID from a screenshot does not work.** Capital
  I and lowercase l are identical in that font. One was misread this
  session and cost a round trip. Use the **Copy** button in Manage
  deployments.
- **This sandbox cannot reach `script.google.com`.** Outbound is blocked by
  the proxy, so endpoints cannot be tested from the agent side. Verify in a
  browser, or intercept the request in Playwright.

## How quiz 2 was verified

Worth repeating for any future change, because none of it needs a network:

- Answer indices asserted against the correct option **text**, not
  re-counted by eye.
- The whole quiz driven in Chromium: every question answered on the known
  key for 15/15, then inverted for 0/15, which proves scoring is real
  rather than always-passing.
- Empty handle blocked, unanswered question blocked, Back preserves the
  selection, no answer text present on the results screen, no external
  requests when opened as a local file.
- The submission POST intercepted with Playwright routing, to confirm the
  body, the `text/plain` content type and the quiz label without sending
  anything anywhere.
- `Code.gs` run in Node against a mock spreadsheet: fresh sheet, a
  populated six column sheet, the one-time migration not re-running,
  an unlabelled submission, and the existing validation still rejecting
  junk.
