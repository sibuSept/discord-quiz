const { makeSpreadsheet, load, post } = require('./mock');
let fails = [];
const check = (n, c, e='') => { console.log((c?'  ok   ':'  FAIL ')+n+(c?'':'  '+e)); if(!c) fails.push(n); };
const tabs = ss => ss.getSheets().map(s => s.getName());
const dataRows = (ss, n) => (ss.getSheetByName(n)?._rows || []).slice(1);

const att = (quiz, handle='dave', score=9, total=12) =>
  ({ handle, score, total, timestamp: '2026-09-14T10:00:00.000Z', quiz });

console.log('\n[tabs are created per quiz]');
{
  const ss = makeSpreadsheet(); const env = load(ss);
  check('first submission succeeds', post(env, att('names')).ok === true);
  check('a "names" tab was created', tabs(ss).includes('names'), JSON.stringify(tabs(ss)));
  const s = ss.getSheetByName('names');
  check('headers written once', JSON.stringify(s._rows[0]) === JSON.stringify(['Received','Submitted','Handle','Score','Total','Percent','Quiz']));
  check('one data row', dataRows(ss,'names').length === 1);
  check('header row frozen', s._frozen === 1);
  check('percent column formatted', s._fmt['F:F'] === '0%');

  post(env, att('names', 'erin'));
  check('second submission appends, no new headers', dataRows(ss,'names').length === 2);
  check('still exactly one tab', tabs(ss).length === 1, JSON.stringify(tabs(ss)));

  post(env, att('niche', 'dave', 12, 15));
  check('a different quiz makes its own tab', tabs(ss).sort().join(',') === 'names,niche', JSON.stringify(tabs(ss)));
  check('niche tab has one row', dataRows(ss,'niche').length === 1);
  check('names tab untouched by it', dataRows(ss,'names').length === 2);
}

console.log('\n[row contents]');
{
  const ss = makeSpreadsheet(); const env = load(ss);
  post(env, att('names', '  spacey  ', 9, 12));
  const r = dataRows(ss,'names')[0];
  check('handle trimmed', r[2] === 'spacey', JSON.stringify(r[2]));
  check('score and total recorded', r[3] === 9 && r[4] === 12);
  check('percent is 0.75', r[5] === 0.75, String(r[5]));
  check('quiz label still in the row', r[6] === 'names', String(r[6]));
  check('submitted timestamp carried through', r[1] === '2026-09-14T10:00:00.000Z');
  // instanceof is unreliable across the vm realm boundary, so check the shape
  check('received timestamp is a real Date, set to now',
        Object.prototype.toString.call(r[0]) === '[object Date]' &&
        !isNaN(r[0].getTime()) && Math.abs(Date.now() - r[0].getTime()) < 5000);
}

console.log('\n[untrusted quiz names cannot name a tab]');
{
  const ss = makeSpreadsheet(); const env = load(ss);
  const nasty = ['../../etc', "Robert'); DROP", 'a/b', 'a:b', 'has space', '[bracket]',
                 'UPPER', 'x'.repeat(40), '-leadinghyphen', '', '   ', 'emoji🙂'];
  nasty.forEach(q => post(env, att(q)));
  const made = tabs(ss);
  check('no tab named after any junk value',
        !made.some(t => nasty.includes(t)), JSON.stringify(made));
  check('junk still recorded, in Unknown', dataRows(ss,'Unknown').length >= 1, JSON.stringify(made));

  // uppercase should normalise rather than be rejected outright
  const ss2 = makeSpreadsheet(); const env2 = load(ss2);
  post(env2, att('Names')); post(env2, att('names'));
  check('Names and names share one tab', tabs(ss2).join(',') === 'names', JSON.stringify(tabs(ss2)));
  check('both rows landed there', dataRows(ss2,'names').length === 2);

  // empty / missing quiz falls back to the theme page quiz
  const ss3 = makeSpreadsheet(); const env3 = load(ss3);
  post(env3, { handle: 'dave', score: 1, total: 2, timestamp: 'x' });
  check('missing quiz goes to theme-pages', tabs(ss3).join(',') === 'theme-pages', JSON.stringify(tabs(ss3)));
}

console.log('\n[tab ceiling]');
{
  const ss = makeSpreadsheet(); const env = load(ss);
  for (let i = 0; i < 12; i++) post(env, att('quiz-' + i));
  check('twelve quiz tabs created', tabs(ss).length === 12, String(tabs(ss).length));
  post(env, att('quiz-thirteen'));
  check('thirteenth quiz does not create a tab', !tabs(ss).includes('quiz-thirteen'), JSON.stringify(tabs(ss)));
  check('thirteenth is still recorded in Unknown', dataRows(ss,'Unknown').length === 1);
  post(env, att('quiz-0'));
  check('existing tabs still accept rows at the ceiling', dataRows(ss,'quiz-0').length === 2);
}

console.log('\n[hand-made tabs are not counted against the ceiling]');
{
  const ss = makeSpreadsheet(['Summary', 'My Notes', 'Working Sheet']); const env = load(ss);
  post(env, att('names'));
  check('a quiz tab is still created alongside them', tabs(ss).includes('names'), JSON.stringify(tabs(ss)));
  check('hand-made tabs left alone', dataRows(ss,'Summary').length === 0);
}

console.log('\n[bad input is rejected, not written]');
{
  const ss = makeSpreadsheet(); const env = load(ss);
  check('empty body rejected', env.__doPost({}).getContent().includes('empty body'));
  check('missing handle rejected', post(env, att('names','',9,12)).error === 'missing handle');
  check('zero total rejected', post(env, att('names','dave',9,0)).error === 'bad score');
  check('non-numeric score rejected', post(env, att('names','dave','nine',12)).error === 'bad score');
  check('malformed json reported, not thrown', post(env, '{not json').ok === false);
  check('nothing was written by any of those', tabs(ss).length === 0, JSON.stringify(tabs(ss)));
}

console.log('\n[lock contention]');
{
  const ss = makeSpreadsheet(); const env = load(ss, { lockFails: true });
  check('busy lock reported', post(env, att('names')).error === 'busy');
  check('nothing written while busy', tabs(ss).length === 0);
}

console.log('\n[doGet]');
{
  const ss = makeSpreadsheet(); const env = load(ss);
  check('liveness text returned', env.__doGet().getContent().includes('Quiz endpoint is live'));
}

console.log('\n' + (fails.length ? 'FAILURES: ' + fails.join(' | ') : 'All checks passed.'));
process.exit(fails.length ? 1 : 0);
