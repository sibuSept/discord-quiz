# Discord community quizzes

Single-page multiple-choice knowledge checks for a Discord group. Each one
is taken *before* the content, so it reads as a starting point rather than
an exam. Scores are plain arithmetic, computed in the browser.

No backend, no AI, no API keys, no running costs.

Seven quizzes live here. They share the same code, and differ only in their
`CONFIG`, `QUESTIONS` and `BANDS` blocks:

```
index.html              quiz 1: running and monetising theme pages, 15 questions
niche-quiz/index.html   quiz 2: choosing a niche, 15 questions
quiz-3/index.html       quiz 3: usernames and page names, 12 questions
quiz-4/index.html       quiz 4: growth tactics, 15 questions
quiz-5/index.html       quiz 5: profile picture and bio, 15 questions
quiz-6/index.html       quiz 6: mindset and social proof, 13 questions
quiz-7/index.html       quiz 7: posting times and expectations, 11 questions
apps-script/Code.gs     Google Apps Script that writes submissions to a Sheet
apps-script/test/       runs Code.gs against a fake spreadsheet, in plain Node
tools/shuffle-options.py  evens out where the correct answer sits
SETUP.md                step-by-step: the Sheet endpoint, then hosting
NEW-QUIZ-BRIEF.md       context handoff for building further quizzes
```

Quiz 3 is twelve questions rather than fifteen because the piece behind it
carries two ideas and the rest is examples. The bands are percentage based,
so a different question count needs no other change, and the **Percent**
column is the one to compare across quizzes.

Each quiz is deployed as its own site, so each has its own URL, and each
posts to its own Apps Script deployment.

Quizzes 1 and 2 post to two deployments of one script project, so they write
to whichever spreadsheet that project is bound to. Which file that is has
never been confirmed and is worth establishing rather than assuming: a script
opened from a sheet via **Extensions > Apps Script** always belongs to that
sheet.

**Quiz 3 gets its own Sheet and its own script project**, deliberately, so it
does not depend on that answer. Its `CONFIG.endpoint` is blank until that
deployment exists. See SETUP.md, "Giving a quiz its own sheet".

**Each quiz writes to its own tab**, named after its `quizId`:
`theme-pages`, `niche`, `names`, `growth`, `bio`, `mindset`, `timing`. The script creates
the tab, heads it and
formats it the first time a score arrives for that quiz, so adding a quiz
means giving it a new `quizId` and pointing it at the same web app URL.
Nothing to edit in the script, nothing to redeploy.

Quiz names are not trusted with tab creation, since the endpoint URL is
public: only plain lowercase names become tabs, and at most twelve of them.
Anything else is still recorded, in a tab called `Unknown`.

Every row also carries a **Quiz** column, which is redundant once the tabs
are separate and kept anyway: one cell, and a row still says where it came
from if the tabs are ever merged or exported.

Changing `Code.gs` means redeploying it in the Apps Script editor before the
page that depends on the change goes live, and a deployment runs whichever
version was current when it was deployed. Two deployments of the same
project can be running different code. See SETUP.md.

`Code.gs` writes to live data, so it has tests that run it against a fake
spreadsheet with no network and no Google account:

```
node apps-script/test/test-codegs.js
```

Because each is served from a different origin, their `localStorage` never
collides. The keys are distinct regardless, so they would stay separate even
if all three were ever served from one domain: `dq.history.v1` for quiz 1,
then `dq.niche.*`, `dq.names.*`, `dq.growth.*`, `dq.bio.*`, `dq.mindset.*` and
`dq.timing.*`. Quiz 1's keys predate the per-quiz
namespacing and were left alone rather than renamed, since renaming them
would orphan the attempt history of everyone who has already taken it.

## Quick start

1. Edit the `CONFIG` and `QUESTIONS` blocks at the top of the `<script>`
   section of the quiz you are changing.
2. Follow **SETUP.md** to create the Google Sheet endpoint and paste its
   URL into `CONFIG.endpoint`.
3. Drop the file onto Cloudflare Pages or Netlify. For quizzes 2 onward,
   drag the whole `niche-quiz` or `quiz-N` folder, which serves its
   `index.html` at the root.
4. Paste the link in Discord.

Open any `index.html` directly in a browser to preview at any point. With
`CONFIG.endpoint` left blank it runs fully, scoring locally and sending
nothing, which is exactly the state quiz 3 is in right now.

## Two conventions worth knowing before you edit a quiz

**Correct answers are spread evenly across the four positions.** Every quiz
has arrived with them bunched: quiz 4 came in as ten Bs and five Cs with no
As and no Ds, so picking B every time scored 10/15 without reading a
question. `tools/shuffle-options.py` fixes that. It reorders options only,
never the wording and never which option is correct, and it is seeded from
the quizId so the result is reproducible and the diff reviewable.

```
python3 tools/shuffle-options.py --check quiz-5/index.html   # report the spread
python3 tools/shuffle-options.py quiz-5/index.html           # even it out
```

Run it on any new quiz, then re-check the answer key against what the author
ticked. **An even count is not enough on its own.** Quiz 6 arrived with a tidy
3/3/4/3 spread whose positions ran 2,0,3,1 and then repeated that cycle
twice. Quiz 7 was worse: B,C,A,D repeated straight through all eleven
questions, on a spread that looks perfect. `--check` reports the count, so
read the sequence yourself before deciding a quiz is fine.

**No em dashes, with one exception.** Copy, comments and docs use full stops,
colons or a rewritten clause. `quiz-5/index.html` is the single agreed
exception, where the dashes pair a verdict with its reason in the options.
That file says so at the top of its `QUESTIONS` array. It is not a precedent
for anywhere else.

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
