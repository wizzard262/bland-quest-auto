// Bland Quest Auto: the dead-end explorer. Plays the game at random (taps whatever can be tapped, picks dialog
// options, waits for the moments) and reports anywhere it gets stuck: a screen with nothing to tap, a moment that
// never ends, a page error, or a screen it can't get off for a long time.
//   node explore.js [runs] [steps] [seed]      e.g. node explore.js 6 600, or node explore.js 1 400 16838 to replay one
// Headed, as all browser work here is (a visible window, a little slowMo).
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');

const RUNS = +process.argv[2] || 4;                                  // (with a seed given, that one game)                                  // how many games to play
const STEPS = +process.argv[3] || 500;                               // taps in each
const GAME = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const STUCK_STEPS = 60;
const ONE_SEED = +process.argv[4] || 0;                              // replay just this seed                                              // this many taps on one screen without leaving it: worth a look

// A little seeded random, so a run that finds something can be played again
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// Everything that can be tapped right now: dialog buttons first (if a dialog's up, that's all you can do)
function tappables() {
  const dlg = document.querySelector('.dlg');
  if (dlg) {
    const buttons = [...dlg.querySelectorAll('button')];
    return buttons.length ? buttons.map((b, i) => ({ kind: 'dlgbutton', i, label: b.textContent })) : [{ kind: 'dlg', label: 'tap to carry on' }];
  }
  const out = [];
  document.querySelectorAll('#stage [data-go], #stage [data-act]').forEach((el, i) => out.push({ kind: 'stage', i, label: el.dataset.go || el.dataset.act }));
  document.querySelectorAll('#acts button').forEach((el, i) => out.push({ kind: 'acts', i, label: el.textContent }));
  if (document.querySelector('#stage .back')) out.push({ kind: 'back', label: 'Back' });
  return out;
}
// Tap one of them
function tapOne(t) {
  const pick = (sel, i) => document.querySelectorAll(sel)[i];
  let el = null;
  if (t.kind === 'dlgbutton') el = pick('.dlg button', t.i);
  if (t.kind === 'dlg') el = document.querySelector('.dlg');
  if (t.kind === 'stage') el = pick('#stage [data-go], #stage [data-act]', t.i);
  if (t.kind === 'acts') el = pick('#acts button', t.i);
  if (t.kind === 'back') el = document.querySelector('#stage .back');
  if (el) el.click();
}

async function play(seed) {
  const rand = rng(seed);
  const browser = await chromium.launch({ headless: false, slowMo: 20 });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  const found = [];
  const note = (what, extra) => found.push({ what, ...extra });
  page.on('pageerror', e => note('page error', { msg: e.message, at: (e.stack || '').split('\n').slice(1, 4).map(l => l.trim()).join(' < ') }));
  await page.addInitScript(() => { window.NO_CALLS = false; });
  await page.goto(GAME);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('#title-play');
  await page.click('#help-close');
  await page.evaluate(() => { BREATH_TIME.secs = 0.3; WALK_PART = [0, 1]; });   // the breath test: a short blow will do
  let screen = null, onScreen = 0;
  for (let step = 0; step < STEPS; step++) {
    // wait for any moment to finish (a moment that never ends is a find)
    const ended = await page.waitForFunction(() => !ANIM, null, { timeout: 25000 }).then(() => true, () => false);
    if (!ended) { note('a moment that never ends', { step, screen: await page.evaluate(() => S.screen + ' ' + (ANIM && ANIM.kind)) }); await page.evaluate(() => finishMoment()); }
    const state = await page.evaluate(() => ({ screen: S.screen, place: S.place, inside: S.inside, day: S.day, mins: S.mins, money: S.money, jobs: S.jobs.filter(j => j.status === 'open').map(j => j.id) }));
    if (state.screen === screen) onScreen++; else { screen = state.screen; onScreen = 0; }
    if (onScreen === STUCK_STEPS) note('stuck on a screen', { step, ...state });
    // the breath test: hold to blow
    if (state.screen === 'breath' && !(await page.evaluate(() => !!DIALOG))) {
      const box = await page.locator('#c').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.6);
      await page.mouse.down(); await page.waitForTimeout(500); await page.mouse.up();
      continue;
    }
    const list = await page.evaluate(tappables);
    if (!list.length) { note('nothing to tap', { step, ...state }); break; }
    const t = list[Math.floor(rand() * list.length)];
    await page.evaluate(tapOne, t);
    await page.waitForTimeout(30);
  }
  const end = await page.evaluate(() => ({ day: S.day, screen: S.screen, open: S.jobs.filter(j => j.status === 'open').map(j => j.id), done: S.jobs.filter(j => j.status === 'done').map(j => j.id) }));
  await browser.close();
  return { seed, found, end };
}

(async () => {
  for (let r = 0; r < RUNS; r++) {
    const seed = ONE_SEED || 1000 + r * 7919;
    const { found, end } = await play(seed);
    console.log(`\n=== run ${r + 1} (seed ${seed}): day ${end.day}, on ${end.screen}`);
    console.log(`  jobs done: ${end.done.join(', ') || 'none'}`);
    console.log(`  jobs open: ${end.open.join(', ') || 'none'}`);
    if (!found.length) console.log('  nothing found');
    for (const f of found) console.log('  ' + JSON.stringify(f));
  }
})();
