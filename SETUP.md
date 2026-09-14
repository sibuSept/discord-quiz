# Setup

Two jobs: get the Google Sheet collecting scores, then put the page online.
Do them in that order — the page needs the endpoint URL from step one.

---

## Part 1 — The Google Sheet endpoint

You need a Google account. Nothing here costs money and no API key is involved.

### 1. Make the sheet

1. Go to <https://sheets.new> — that creates a blank spreadsheet.
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
credentials — it already has permission to write to its own spreadsheet.

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
2. You'll see **"Google hasn't verified this app"**. Expected — you wrote it
   five minutes ago. Click **Advanced**, then **Go to *(your project name)* (unsafe)**.
3. Click **Allow**.

### 5. Copy the URL

After deploying you get a **Web app URL** ending in `/exec`, like:

```
https://script.google.com/macros/s/AKfycbx...long.../exec
```

Copy it. Paste it into a browser address bar — you should see
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

Saving is not enough — you must redeploy. **Deploy → Manage deployments →**
pencil icon **→ Version: New version → Deploy**. This keeps the same URL.
Creating a *new deployment* instead gives you a different URL and the page
will keep posting to the old one.

---

## Part 2 — Putting the page online

Both options are free, need no credit card, and give you a URL to paste in
Discord. Pick one.

### Option A — Cloudflare Pages (drag and drop)

1. Sign up at <https://dash.cloudflare.com> (free account).
2. Sidebar: **Workers & Pages → Create → Pages → Upload assets**.
3. Name the project, e.g. `community-quiz`.
4. Drag in the folder containing `index.html` (or just the file itself).
5. **Deploy**. You get `https://community-quiz.pages.dev`.

To update: same screen, **Create new deployment**, drop the new file in.

### Option B — Netlify Drop (fastest)

1. Go to <https://app.netlify.com/drop>.
2. Drag the folder containing `index.html` onto the page.
3. It deploys immediately and gives you a random URL like
   `https://gleaming-mochi-1a2b3c.netlify.app`.
4. Make a free account to keep it and rename the site to something tidier.

### Either way

Only `index.html` needs to be uploaded. `SETUP.md` and `apps-script/` are
for you, not for the server — though it does no harm if they go up too.

---

## Testing before you post the link

1. Open the deployed URL.
2. Enter a throwaway handle like `test-run`.
3. Answer all fifteen, hit **See my score**.
4. The results screen should say *"Result sent."*
5. Check the sheet — a **Responses** tab now exists with your row in it.
6. Delete that test row before sharing the link.

If no row appears:

- **Blank sheet, no Responses tab** → the request never arrived. Nine times
  out of ten this is "Who has access" not being set to **Anyone**. Fix it and
  redeploy (Manage deployments → new version).
- **URL doesn't end in `/exec`** → you copied the `/dev` URL, which only works
  while you're signed in. Get the `/exec` one from Manage deployments.
- **Page says "Couldn't reach the server"** → the result is held in that
  browser and re-sent automatically next time the page is opened there, so
  nothing is lost. Check the endpoint URL for typos.

---

## Reading the results

The **Responses** tab gets one row per attempt:

| Received | Submitted | Handle | Score | Total | Percent |
|---|---|---|---|---|---|

Attempt history falls out of this for free — filter or sort by **Handle** and
you see every attempt that person made, with timestamps. Three attempts is
three rows.

Useful formulas, dropped into an empty cell on another tab:

```
=UNIQUE(Responses!C2:C)                              ' everyone who has taken it
=COUNTA(UNIQUE(Responses!C2:C))                      ' how many distinct handles
=AVERAGE(Responses!D2:D)                             ' mean score
=COUNTIF(Responses!C2:C, "somehandle")               ' attempts by one person
=MAXIFS(Responses!D2:D, Responses!C2:C, "somehandle") ' their best score
```

---

## Two things to keep in mind

Both were decided up front and are fine at this scale — noted here so they
don't surprise you later.

- **The answer key is in the page source.** The results screen doesn't show
  the answers, but anyone who opens dev tools can read them out of the
  `QUESTIONS` array. Hiding it properly needs a backend, which this
  deliberately doesn't have.
- **Handles are typed by hand.** Typos split one person across two rows, and
  nothing stops someone entering a fresh name for a clean first attempt.
