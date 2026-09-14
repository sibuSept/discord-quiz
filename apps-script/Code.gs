/**
 * Google Apps Script web app that receives quiz submissions and appends
 * one row per attempt to the bound spreadsheet.
 *
 * Paste this into the Apps Script editor attached to your Google Sheet
 * (Extensions > Apps Script), then deploy it as a web app. Full
 * walkthrough is in SETUP.md.
 *
 * Every submission is its own row, so three attempts by one person are
 * three rows with three timestamps. Filter the sheet by handle to get
 * that person's history.
 */

var SHEET_NAME = 'Responses';
var HEADERS = ['Received', 'Submitted', 'Handle', 'Score', 'Total', 'Percent'];

/** Browser hits the /exec URL directly — handy for checking it's live. */
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

    getSheet_().appendRow([
      new Date(),                       // when the server received it
      data.timestamp || '',             // when the browser submitted it
      handle,
      score,
      total,
      Math.round((score / total) * 100) / 100   // formatted as % by the sheet
    ]);

    return jsonOut_({ ok: true });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Returns the Responses sheet, creating and formatting it on first run. */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

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
