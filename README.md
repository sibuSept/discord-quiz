# Discord community quiz

A single-page, 15-question multiple-choice knowledge check for a Discord
group, on the subject of running and monetising social media theme pages.
Taken *before* the content, so it reads as a starting point rather than an
exam. Scores are plain arithmetic, computed in the browser.

No backend, no AI, no API keys, no running costs.

```
index.html            the entire quiz — HTML, CSS and JS in one file
apps-script/Code.gs   Google Apps Script that writes submissions to a Sheet
SETUP.md              step-by-step: the Sheet endpoint, then hosting
```

## Quick start

1. Edit the `CONFIG` and `QUESTIONS` blocks at the top of the `<script>`
   section in `index.html`.
2. Follow **SETUP.md** to create the Google Sheet endpoint and paste its
   URL into `CONFIG.endpoint`.
3. Drop `index.html` onto Cloudflare Pages or Netlify.
4. Paste the link in Discord.

Open `index.html` directly in a browser to preview at any point — with
`CONFIG.endpoint` left blank it runs fully, scoring locally and sending
nothing.

## How it works

- Handle entry, then one question at a time, four options each. Advancing
  without choosing shows an inline error.
- Score is `answers.filter(correct).length`. A band lookup turns it into a
  line of feedback.
- On finish the browser POSTs `{ handle, score, total, timestamp }` to the
  Apps Script endpoint. One row per attempt, so filtering the sheet by
  handle gives that person's history.
- Attempts are also written to `localStorage`, which drives the
  "attempt 3 — 8/10, up from 6" line on the results screen. Device-local,
  so it's a bonus on top of the sheet, never the record.
- A submission that fails to send is queued locally and retried the next
  time that person opens the page.

## Editing questions

`answer` is the 0-based index of the correct option — `0` is the first
option, `3` the fourth.

```js
{ q: "Which of these is true?",
  options: ["First", "Second", "Third", "Fourth"],
  answer: 2 },   // "Third" is correct
```

Bands are checked top to bottom, so keep `minPct` values descending. They
are percentages, not raw scores, so adding or removing a question keeps
them correct without any edit.
