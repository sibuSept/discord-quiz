# discord-quiz
quiz for discord

## Quizzes

| File | Quiz | Topic |
| --- | --- | --- |
| `quiz3.html` | Quiz 3 | Username vs page name — 12 questions |

Each quiz is one self-contained HTML file: open it, host it anywhere static, and
it runs with no build step.

### Logging results

Every quiz posts to a Google Apps Script web app that appends a row to the shared
sheet, with a `Quiz` column telling the quizzes apart. Wire it up by pasting the
deployment URL into the two constants at the top of the `<script>` block:

```js
var ENDPOINT = "";          // Apps Script web-app URL
var QUIZ_NAME = "Quiz 3";   // value written to the sheet's Quiz column
```

Left empty, the quiz still runs and scores locally — it just submits nothing.
The POST is `mode: "no-cors"` and form-encoded, with fields:
`quiz`, `name`, `score`, `total`, `percent`, `answers`.
