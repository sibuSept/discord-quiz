/**
 * Google Apps Script web app that receives quiz submissions and appends
 * one row per attempt to the bound spreadsheet.
 *
 * Paste this into the Apps Script editor attached to your Google Sheet
 * (Extensions > Apps Script), then deploy it as a web app. Full
 * walkthrough is in SETUP.md.
 *
 * Every quiz gets its own tab, named after the quizId the page sends.
 * The tab is created, headed and formatted the first time a score comes
 * in for that quiz, so adding a new quiz needs no change to this file and
 * no redeploy: give the new page a quizId nobody else uses, point it at
 * this same web app URL, and its tab appears on the first submission.
 *
 * Every submission is its own row, so three attempts by one person are
 * three rows with three timestamps in that quiz's tab.
 */

var HEADERS = ['Received', 'Submitted', 'Handle', 'Score', 'Total', 'Percent', 'Quiz'];

/* A submission that names no quiz is the theme page quiz, the only one
   that predates quiz labelling. All current pages send their own. */
var DEFAULT_QUIZ = 'theme-pages';

/* Where anything unrecognised goes. See TAB_PATTERN below. */
var FALLBACK_TAB = 'Unknown';

/* The /exec URL is public and sits in every page's source, so the quiz
   name arriving here is untrusted. Only plain lowercase names become
   tabs: letters, digits and hyphens, 24 characters at most. Anything
   else is still recorded, in FALLBACK_TAB, rather than being allowed to
   name a tab. This keeps out both mischief and accidents, since a tab
   name cannot contain : \ / ? * [ ] in the first place. */
var TAB_PATTERN = /^[a-z0-9][a-z0-9-]{0,23}$/;

/* A ceiling on tabs this script will create, so that someone who found
   the URL cannot fill the spreadsheet with them. Real quizzes are added
   a few times a year; raise this if you ever genuinely need to. */
var MAX_QUIZ_TABS = 12;

/** Browser hits the /exec URL directly. Handy for checking it's live. */
function doGet() {
  return ContentService
    .createTextOutput('Quiz endpoint is live. Submissions are accepted via POST.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var lock = LockService.getScriptLock();

  // Two people finishing at the same moment would otherwise race for the
  // same row. Waiting up to 30s costs nothing at this volume.
  try {
    lock.waitLock(30000);
  } catch (err) {
    return jsonOut_({ ok: false, error: 'busy' });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut_({ ok: false, error: 'empty body' });
    }

    var data = JSON.parse(e.postData.contents);

    var handle = String(data.handle == null ? '' : data.handle).trim().slice(0, 100);
    var score = Number(data.score);
    var total = Number(data.total);

    if (!handle) return jsonOut_({ ok: false, error: 'missing handle' });
    if (!isFinite(score) || !isFinite(total) || total <= 0) {
      return jsonOut_({ ok: false, error: 'bad score' });
    }

    var quiz = String(data.quiz == null ? '' : data.quiz).trim().slice(0, 60) || DEFAULT_QUIZ;

    /* The Quiz column is redundant now that each quiz has a tab, and it
       stays anyway: it costs one cell and it means a row still says which
       quiz it came from if the tabs are ever merged, exported or copied
       somewhere that loses the tab name. */
    getSheet_(tabNameFor_(quiz)).appendRow([
      new Date(),                       // when the server received it
      data.timestamp || '',             // when the browser submitted it
      handle,
      score,
      total,
      Math.round((score / total) * 100) / 100,  // formatted as % by the sheet
      quiz
    ]);

    return jsonOut_({ ok: true });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Which tab this quiz's rows belong in. Never trusts the name blindly. */
function tabNameFor_(quiz) {
  var name = String(quiz == null ? '' : quiz).trim().toLowerCase();
  if (!name) name = DEFAULT_QUIZ;
  return TAB_PATTERN.test(name) ? name : FALLBACK_TAB;
}

/** Returns the named tab, creating and formatting it on first use. */
function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sheet = ss.getSheetByName(name);
  if (sheet) return withHeaders_(sheet);

  /* At the ceiling, record it rather than lose it, but stop making tabs.
     FALLBACK_TAB itself is always allowed through, or a full spreadsheet
     would have nowhere left to put anything. */
  if (name !== FALLBACK_TAB && countQuizTabs_(ss) >= MAX_QUIZ_TABS) {
    return getSheet_(FALLBACK_TAB);
  }

  return withHeaders_(ss.insertSheet(name));
}

/** Tabs this script would have made. Anything you added by hand, with a
    capital letter or a space in the name, is not counted against the cap. */
function countQuizTabs_(ss) {
  var sheets = ss.getSheets();
  var n = 0;
  for (var i = 0; i < sheets.length; i++) {
    if (TAB_PATTERN.test(sheets[i].getName())) n++;
  }
  return n;
}

/** Headers and formatting, once, on an empty tab. */
function withHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sheet.getRange('F:F').setNumberFormat('0%');
  }
  return sheet;
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
