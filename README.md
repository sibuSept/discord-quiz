# Discord community quizzes

Single-page multiple-choice knowledge checks for a Discord group. Each one
is taken *before* the content, so it reads as a starting point rather than
an exam. Scores are plain arithmetic, computed in the browser.

No backend, no AI, no API keys, no running costs.

Two quizzes live here. They share the same code, and differ only in their
`CONFIG`, `QUESTIONS` and `BANDS` blocks:

```
index.html              quiz 1: running and monetising theme pages, 15 questions
niche-quiz/index.html   quiz 2: choosing a niche, 15 questions
apps-script/Code.gs     Google Apps Script that writes submissions to a Sheet
SETUP.md                step-by-step: the Sheet endpoint, then hosting
NEW-QUIZ-BRIEF.md       context handoff for building further quizzes
```

Each quiz is deployed as its own site, so each has its own URL. Both post
to the same Apps Script deployment and the same Sheet, and each row carries
a **Quiz** column so the two can be told apart. The label comes from
`CONFIG.quizId` in each page: `theme-pages` and `niche`.

Changing `Code.gs` means redeploying it in the Apps Script editor before the
page that depends on the change goes live. See SETUP.md.

Because the two are served from different origins, their `localStorage`
never collides. The storage keys are namespaced per quiz as well, so they
stay separate even if both are ever served from one domain.

## Quick start

1. Edit the `CONFIG` and `QUESTIONS` blocks at the top of the `<script>`
   section of the quiz you are changing.
2. Follow **SETUP.md** to create the Google Sheet endpoint and paste its
   URL into `CONFIG.endpoint`.
3. Drop the file onto Cloudflare Pages or Netlify. For quiz 2, drag the
   whole `niche-quiz` folder, which serves its `index.html` at the root.
4. Paste the link in Discord.

Open either `index.html` directly in a browser to preview at any point. With
`CONFIG.endpoint` left blank it runs fully, scoring locally and sending
nothing.

## How it works

- Handle entry, then one question at a time, four options each. Advancing
  without choosing shows an inline error.
- Score is `answers.filter(correct).length`. A band lookup turns it into a
  line of feedback.
- **The results screen never reveals the answers.** Score, band and history
  only. Someone who wants full marks goes back through the content and takes
  the quiz again. This is stated on the intro screen too, so nobody finishes
  expecting an answer key.
- On finish the browser POSTs `{ handle, score, total, timestamp }` to the
  Apps Script endpoint. One row per attempt, so filtering the sheet by
  handle gives that person's history.
- Attempts are also written to `localStorage`, which drives the
  "attempt 3, 8/10, up from 6" line on the results screen. Device-local,
  so it's a bonus on top of the sheet, never the record.
- A submission that fails to send is queued locally and retried the next
  time that person opens the page.

## Editing questions

`answer` is the 0-based index of the correct option. `0` is the first
option, `3` the fourth.

```js
{ q: "Which of these is true?",
  options: ["First", "Second", "Third", "Fourth"],
  answer: 2 },   // "Third" is correct
```

Bands are checked top to bottom, so keep `minPct` values descending. They
are percentages, not raw scores, so adding or removing a question keeps
them correct without any edit.
