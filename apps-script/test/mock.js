// Minimal stand-in for the Apps Script runtime, enough to exercise Code.gs
// in plain Node. Code.gs writes to live data, so changes to it are checked
// here first. Run:  node apps-script/test/test-codegs.js
const fs = require('fs');

function makeSheet(name) {
  const rows = [];
  const fmt = {};
  return {
    _rows: rows, _fmt: fmt, _frozen: 0, _bold: null,
    getName: () => name,
    getLastRow: () => rows.length,
    appendRow: r => { rows.push(r.slice()); },
    setFrozenRows(n) { this._frozen = n; return this; },
    getRange(a, b, c, d) {
      const self = this;
      const key = (typeof a === 'string') ? a : `${a},${b},${c},${d}`;
      return {
        setFontWeight(w) { self._bold = key; return this; },
        setNumberFormat(f) { fmt[key] = f; return this; },
        setValue(v) { return this; },
        setValues(v) { return this; }
      };
    }
  };
}

function makeSpreadsheet(initial = []) {
  const sheets = initial.map(makeSheet);
  return {
    _sheets: sheets,
    getSheets: () => sheets,
    getSheetByName: n => sheets.find(s => s.getName() === n) || null,
    insertSheet(n) { const s = makeSheet(n); sheets.push(s); return s; }
  };
}

function load(spreadsheet, { lockFails = false } = {}) {
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8');
  const sandbox = {
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet },
    ContentService: {
      MimeType: { TEXT: 'TEXT', JSON: 'JSON' },
      createTextOutput: t => ({ _t: t, setMimeType() { return this; }, getContent() { return this._t; } })
    },
    LockService: {
      getScriptLock: () => ({
        waitLock(ms) { if (lockFails) throw new Error('timeout'); },
        releaseLock() {}
      })
    }
  };
  const vm = require('vm');
  vm.createContext(sandbox);
  vm.runInContext(src + '\n;this.__doPost = doPost; this.__doGet = doGet; this.__tabNameFor = tabNameFor_;', sandbox);
  return sandbox;
}

const post = (env, payload) => JSON.parse(
  env.__doPost({ postData: { contents: typeof payload === 'string' ? payload : JSON.stringify(payload) } }).getContent()
);

module.exports = { makeSpreadsheet, load, post };
