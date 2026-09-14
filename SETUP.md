# Setup

Two jobs: get the Google Sheet collecting scores, then put the page online.
Do them in that order. The page needs the endpoint URL from step one.

---

## Part 1: The Google Sheet endpoint

You need a Google account. Nothing here costs money and no API key is involved.

### 1. Make the sheet

1. Go to <https://sheets.new>, which creates a blank spreadsheet.
2. Name it something you'll recognise, e.g. **Discord Quiz Responses**.
3. Leave it completely empty. The script creates and formats its own tab
   the first time a score comes in.

### 2. Open the script editor

1. In that sheet, menu **Extensions → Apps Script**.
2. A new tab opens with a file called `Code.gs` containing a stub
   `function myFunction() {}`.
3. Select all of that stub and delete it.
4. Open `apps-script/Code.gs` from this repo, copy the whole file, paste it in.
5. Hit the save icon (or Ctrl/Cmd + S).

The script is attached to *this* sheet, which is why it needs no key or
credentials. It already has permission to write to its own spreadsheet.

### 3. Deploy it as a web app

This is the fiddly bit. Read the two settings carefully.

1. Top right, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description**: anything, e.g. `v1`
   - **Execute as**: **Me (your@email)** ← so it writes to your sheet
   - **Who has access**: **Anyone** ← *not* "Anyone with Google account"
4. Click **Deploy**.

> **"Who has access: Anyone" is the one people get wrong.** Quiz takers
> aren't signing in, so the request arrives anonymously. If this is set to
> "Anyone with Google account", every submission is silently rejected.

### 4. Authorise it

The first deployment asks for permission:

1. Click **Authorize access**, pick your Google account.
2. You'll see **"Google hasn't verified this app"**. Expected, since you wrote
   it five minutes ago. Click **Advanced**, then **Go to *(your project name)* (unsafe)**.
3. Click **Allow**.

### 5. Copy the URL

After deploying you get a **Web app URL** ending in `/exec`, like:

```
https://script.google.com/macros/s/AKfycbx...long.../exec
```

Copy it. Paste it into a browser address bar. You should see
*"Quiz endpoint is live. Submissions are accepted via POST."* If you see that,
it works.

Keep the URL handy. It isn't secret in any meaningful sense (it ends up in
the page source anyway), but anyone who has it can append rows to your sheet.

### 6. Put the URL in the page

Open `index.html`, find the `CONFIG` block near the top of the `<script>`
section, and paste the URL between the quotes:

```js
const CONFIG = {
  endpoint: "https://script.google.com/macros/s/AKfycbx.../exec",
```

### If you ever change `Code.gs`

Saving is not enough. You must redeploy. **Deploy → Manage deployments →**
pencil icon **→ Version: New version → Deploy**. This keeps the same URL.
Creating a *new deployment* instead gives you a different URL and the page
will keep posting to the old one.

### Adding another quiz

Every quiz gets its own tab, named after its `quizId`. The script creates
the tab, writes its headers and formats it the first time a score arrives
for that quiz.

So adding a quiz needs no Apps Script work at all:

1. Give the new page a `quizId` nobody else uses.
2. Point its `CONFIG.endpoint` at the same `/exec` URL.
3. Put it online.

That is the whole procedure. The first person to finish it creates the tab.
Nothing to edit in `Code.gs`, nothing to redeploy, no way to get the order
wrong.

Two details worth knowing:

- **Tab names are the `quizId`, lowercased.** `names` and `Names` are the
  same tab. Anything that is not plain lowercase letters, digits and
  hyphens, up to 24 characters, is still recorded but goes to a tab called
  `Unknown` rather than naming a tab. The `/exec` URL is public, so the quiz
  name arriving at the script is not trusted with tab creation.
- **The script will create at most twelve quiz tabs.** Past that, rows go to
  `Unknown` instead. This is a guard against someone who found the URL, not
  a limit you are likely to meet. Raise `MAX_QUIZ_TABS` in `Code.gs` if you
  ever genuinely need more, and redeploy.

### Changing `Code.gs` itself

There are tests. `Code.gs` writes to live data, so run them before you
redeploy anything:

```
node apps-script/test/test-codegs.js
```

They run the real `Code.gs` against a fake spreadsheet in plain Node, with
no network and no Google account, and cover tab creation, junk quiz names,
the tab ceiling, bad payloads and lock contention.

### Giving a quiz its own spreadsheet instead

Quizzes can also be split across separate spreadsheets, which is how quiz 3
came to have one of its own: it did not depend on knowing which file the
older script project was bound to. There is no special procedure. Do Part 1
again from the top in a new spreadsheet, pasting the same unmodified
`apps-script/Code.gs`.

Do not fork the script. One file, deployed in more than one place, is the
arrangement that stays understandable. Two copies that have drifted apart is
how a spreadsheet ends up with rows in two different shapes.

Note that separate deployments are independent: each keeps running the
version it was deployed with, so updating `Code.gs` and redeploying one
leaves the other on the old version.

---

## Part 2: Putting the page online

Both options are free, need no credit card, and give you a URL to paste in
Discord. Pick one.

### Option A: Cloudflare Pages (drag and drop)

1. Sign up at <https://dash.cloudflare.com> (free account).
2. Sidebar: **Workers & Pages → Create → Pages → Upload assets**.
3. Name the project, e.g. `community-quiz`.
4. Drag in the folder containing `index.html` (or just the file itself).
5. **Deploy**. You get `https://community-quiz.pages.dev`.

To update: same screen, **Create new deployment**, drop the new file in.

### Option B: Netlify Drop (fastest)

1. Go to <https://app.netlify.com/drop>.
2. Drag the folder containing `index.html` onto the page.
3. It deploys immediately and gives you a random URL like
   `https://gleaming-mochi-1a2b3c.netlify.app`.
4. Make a free account to keep it and rename the site to something tidier.

### Either way

Only `index.html` needs to be uploaded. `SETUP.md` and `apps-script/` are
for you, not for the server, though it does no harm if they go up too.

---

## Testing before you post the link

1. Open the deployed URL.
2. Enter a throwaway handle like `test-run`.
3. Answer every question, hit **See my score**.
4. The results screen should say *"Result sent."*
5. Check the spreadsheet. A tab named after that quiz now exists, with your
   row in it. Quiz 3's is called `names`.
6. Delete that test row before sharing the link.

If no row appears:

- **Nothing at all, no new tab** → the request never arrived. Nine times out
  of ten this is "Who has access" not being set to **Anyone**. Check it in a
  private browsing window, not your normal one: signed in as the account that
  owns the script you will see the endpoint working even when anonymous
  visitors are being turned away. Fix it and redeploy (Manage deployments →
  new version).
- **The row landed in a tab called `Unknown`** → the page sent a `quizId` the
  script would not turn into a tab name. Check `CONFIG.quizId` is plain
  lowercase letters, digits and hyphens.
- **URL doesn't end in `/exec`** → you copied the `/dev` URL, which only works
  while you're signed in. Get the `/exec` one from Manage deployments.
- **Page says "Couldn't reach the server"** → the result is held in that
  browser and re-sent automatically next time the page is opened there, so
  nothing is lost. Check the endpoint URL for typos.

---

## Reading the results

Each quiz has its own tab, named after its `quizId`, and each tab gets one
row per attempt:

| Received | Submitted | Handle | Score | Total | Percent | Quiz |
|---|---|---|---|---|---|---|

Attempt history falls out of this for free. Sort or filter a tab by
**Handle** and you see every attempt that person made, with timestamps.
Three attempts is three rows.

Because the tabs are already separate, reading one quiz needs no filtering
and there is no way to average two quizzes together by accident. Formulas
are the plain ones, dropped into an empty cell on a tab of your own:

```
=COUNTA(names!C2:C)                      ' attempts on quiz 3
=COUNTA(UNIQUE(names!C2:C))              ' how many different people
=AVERAGE(names!F2:F)                     ' mean percentage
=COUNTIF(names!C2:C, "somehandle")       ' that person's attempts
=MAXIFS(names!D2:D, names!C2:C, "somehandle")   ' their best score
```

Swap `names` for another quiz's tab name to read that one.

The **Quiz** column is still there in every row even though the tab already
says which quiz it is. It costs one cell and means a row still identifies
itself if tabs are ever merged, exported, or copied somewhere that loses the
tab name.

**Comparing across quizzes, use Percent, not Score.** Quiz 3 is out of
twelve and the others are out of fifteen, so the raw scores are not
comparable. They are also different questions, so even the percentages only
tell you so much.

## Two things to keep in mind

Both were decided up front and are fine at this scale. They are noted here so
they don't surprise you later.

- **The answer key is in the page source.** The results screen doesn't show
  the answers, but anyone who opens dev tools can read them out of the
  `QUESTIONS` array. Hiding it properly needs a backend, which this
  deliberately doesn't have.
- **Handles are typed by hand.** Typos split one person across two rows, and
  nothing stops someone entering a fresh name for a clean first attempt.
