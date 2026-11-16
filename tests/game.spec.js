// The Thankless Task: tests that play the game by tapping, like a player would.
// The game's own variables (S = the game state) are read straight from the page to check the results.
const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const GAME = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

// ---------- helpers: each one is a thing a player does ----------
// Start a brand-new game and close How to play
async function start(page, errors) {
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(GAME);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.click('#help-close');
}
// Wait for any animated moment to finish playing
const idle = page => page.waitForFunction(() => !ANIM);
// Click OK (or the first button) on every dialog until none are left
async function ok(page) {
  await idle(page);
  for (let i = 0; i < 6; i++) {
    await idle(page);
    const dlg = page.locator('.dlg');
    if (!(await dlg.count())) return;
    await dlg.locator('button').first().click();
  }
}
// Click a dialog button by its words
async function choose(page, words) {
  await idle(page);
  await page.locator('.dlg button', { hasText: words }).first().click();
  await ok(page);
}
// The words in the dialog now showing
const dialogText = async page => { await idle(page); return page.locator('.dlg').innerText(); };
// Click a button under the picture
async function act(page, label) {
  await idle(page);
  await page.locator('.acts button', { hasText: label }).first().click();
}
// Go into town from wherever you are, then to a place on the map
async function goPlace(page, name) {
  const screen = await page.evaluate(() => S.screen);
  if (screen === 'place') await act(page, 'Back to the map');
  else if (screen !== 'city') {
    await page.evaluate(() => { if (S.screen !== 'home') { S.screen = 'home'; render(); } });
    await act(page, 'Into town');
  }
  const i = await page.evaluate(n => placeIndex(n), name);
  await page.click(`[data-act="cam:${i % 7},${Math.floor(i / 7)}"]`);   // look at that part of town on the little map
  await page.locator(`.hs[data-go="place:${name}"]`).click();
}
// Walk home, then into the garage, then somewhere in it
async function garage(page, where) {
  await page.evaluate(() => { S.screen = 'home'; S.place = null; render(); });
  await act(page, 'Garage');
  if (where) await act(page, where);
}
const flag = (page, f) => page.evaluate(k => !!S.flags[k], f);

// ---------- the tests ----------
test('every screen draws without errors', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  for (const s of ['home', 'city', 'garage', 'toolbox', 'under', 'underZoom', 'bonnet', 'fuseZoom', 'dash', 'bench', 'notebook', 'phone', 'pc']) {
    await page.evaluate(k => { S.screen = k; render(); }, s);
    await expect(page.locator('#stage canvas')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('How to play fits without scrolling and closes with its button or a tap outside', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.click('#howto');
  const card = page.locator('.help .card');
  await expect(card).toBeVisible();
  const fits = await card.evaluate(el => el.scrollHeight <= el.clientHeight + 1);
  expect(fits).toBe(true);
  await page.click('#help-close');
  await expect(card).toBeHidden();
  await page.click('#howto');
  await page.mouse.click(5, 5);                                         // outside the card
  await expect(card).toBeHidden();
});

test('the toolbox drawers pull out and close', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await garage(page, 'Toolbox');
  await act(page, 'Open 1: Sockets');
  expect(await page.evaluate(() => S.drawer)).toBe(1);
  await act(page, 'Look for the 10 mm');
  expect(await dialogText(page)).toContain('10');
  await ok(page);
  await act(page, 'Close 1: Sockets');
  expect(await page.evaluate(() => S.drawer)).toBe(0);
});

test('a lead in the notebook takes you there', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.click('.go[data-go="notebook"]');
  await page.locator('.lead', { hasText: 'Ask a mechanic' }).click();
  expect(await page.evaluate(() => S.screen)).toBe('city');
});

test('shops shut: Sparky\'s is closed at lunchtime', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 12 * 60 + 30; render(); });
  await goPlace(page, "Sparky's Auto Electrics");
  expect(await dialogText(page)).toContain('Back in 10 minutes');
});

test('sitting and thinking gives a hunch when a job has no leads', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { closeLead('ask-mech', 'x', 'test'); render(); });
  await garage(page, "Driver's seat");
  await act(page, 'Sit and think');
  await ok(page);
  expect(await page.evaluate(() => leadOpen('dealer'))).toBe(true);
});

test('branch 1 can be played from the red light to the end', async ({ page }) => {
  const errors = [];
  await start(page, errors);

  // ask the mechanics, then pay the main dealer to read the codes
  await goPlace(page, 'Spanner & Son'); await ok(page);
  await goPlace(page, 'Quickfix Motors'); await ok(page);
  await goPlace(page, 'Main Dealer'); await choose(page, 'Pay £120');
  expect(await flag(page, 'codes')).toBe(true);

  // look it up on the forum
  await page.evaluate(() => { S.screen = 'home'; S.place = null; render(); });
  await act(page, 'Computer');
  await page.click('[data-app="Forum"]');
  await page.locator('button', { hasText: 'Read it properly' }).click(); await ok(page);

  // under the car: two bolts and a nut
  await garage(page, 'Under the car');
  await act(page, 'Zoom in: gearbox');
  expect(await flag(page, 'sensorJob')).toBe(true);
  await act(page, 'Undo bolt 1'); await ok(page);
  await act(page, 'Undo bolt 2'); await ok(page);
  await act(page, 'Undo nut 3'); await ok(page);

  // the cheap extractor snaps; the proper one works
  await goPlace(page, 'Tool Shop'); await choose(page, 'cheap');
  await garage(page, 'Under the car'); await act(page, 'Zoom in: gearbox');
  await act(page, 'Use the extractor'); await ok(page);
  await goPlace(page, 'Hardware Shop'); await choose(page, 'proper');
  await garage(page, 'Under the car'); await act(page, 'Zoom in: gearbox');
  await act(page, 'Use the extractor'); await ok(page);
  expect(await flag(page, 'b2')).toBe(true);
  await act(page, 'Pull the sensor out'); await ok(page);
  expect(await flag(page, 'sensorOut')).toBe(true);

  // find nut 3 under the workbench (the screws go everywhere first)
  await garage(page);
  await act(page, 'Look under the workbench'); await ok(page);
  await act(page, 'Look under the workbench'); await ok(page);
  expect(await flag(page, 'n3found')).toBe(true);

  // order the sensor, sleep on it, collect it from the other branch
  await goPlace(page, 'Motor Factors'); await ok(page);
  await page.evaluate(() => { S.screen = 'home'; S.place = null; render(); });
  await act(page, 'Go to bed'); await ok(page);
  await goPlace(page, 'Parts 4 Less'); await ok(page);
  for (let i = 0; i < 10 && !(await page.evaluate(() => !!S.inv['part-p4l'])); i++) {
    const canTalk = await page.locator('.acts button', { hasText: 'Talk' }).count();
    if (canTalk) {
      await act(page, 'Talk');
      const pay = page.locator('.dlg button', { hasText: 'Pay £31.50' });
      if (await pay.count()) { await pay.click(); await ok(page); continue; }
      await ok(page);
    }
    await act(page, 'Wait 30 minutes'); await ok(page);
  }
  expect(await page.evaluate(() => !!S.inv['part-p4l'])).toBe(true);

  // the workbench: it sticks, comes out, gets rotated, then fits
  await garage(page, 'Workbench');
  await act(page, 'Try the Parts 4 Less sensor');
  await act(page, 'Push'); await ok(page);
  expect(await page.evaluate(() => S.bench.state)).toBe('stuck');
  await act(page, 'Pull'); await ok(page);
  await act(page, 'Rotate'); await ok(page);
  await act(page, 'Push'); await ok(page);
  expect(await flag(page, 'fits')).toBe(true);

  // fit it and start the car: the red light goes off… and the ABS light comes on
  await garage(page, 'Under the car'); await act(page, 'Zoom in: gearbox');
  await act(page, 'Fit the new sensor'); await ok(page);
  await garage(page, "Driver's seat");
  await act(page, 'Start it');
  expect(await dialogText(page)).toContain('ABS');
  await ok(page);
  expect(await page.evaluate(() => findJob('light').status)).toBe('done');
  expect(await page.evaluate(() => !!findJob('abs'))).toBe(true);
  expect(errors).toEqual([]);
});

test('the home screen keeps moving (traffic on the road)', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const grab = () => page.evaluate(() => Array.from(ctx.getImageData(0, 0, W, H).data.filter((v, i) => i % 97 === 0)).join(','));
  const a = await grab();
  await page.waitForTimeout(600);
  const b = await grab();
  expect(a).not.toEqual(b);
  expect(errors).toEqual([]);
});

test('a big moment plays before its message: the nut drops and rolls away', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.flags.codes = true; S.flags.sensorJob = true; job('sensor-off', 'Get the old sensor off', 'light'); S.screen = 'underZoom'; render(); });
  await act(page, 'Undo nut 3');
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('nutDrop');
  expect(await page.locator('.dlg').count()).toBe(0);                  // the message waits…
  await idle(page);
  expect(await page.locator('.dlg').count()).toBe(1);                  // …until the nut has rolled away
  expect(errors).toEqual([]);
});

test('kicking something at 100 anger shakes the screen and adds a job', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { anger(100); render(); });
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('kick');
  await ok(page);
  expect(await page.evaluate(() => S.jobs.some(j => j.id.startsWith('kicked-')))).toBe(true);
});

test('sound can be switched off and stays off', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.click('#mute');
  await expect(page.locator('#mute')).toHaveText('Sound: off');
  await page.reload();
  await expect(page.locator('#mute')).toHaveText('Sound: off');
});

test('tapping the garage: the man walks over to it first, then you are in the garage', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.locator('.hs[data-go="garage"]').click();
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('walk');
  expect(await page.evaluate(() => S.screen)).toBe('home');            // still walking
  await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('garage');
  // in the garage he walks to the workbench before it opens
  await page.locator('.hs[data-go="bench"]').click();
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('walk');
  await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('bench');
  expect(errors).toEqual([]);
});

test('labels stay hidden until you point at a thing; then it lights up and shows its name', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const garage = page.locator('.hs[data-go="garage"]');
  await expect(garage.locator('.lab')).toBeHidden();
  await garage.hover();
  await expect(garage.locator('.lab')).toBeVisible();
  await expect(garage.locator('.lab')).toHaveText('Garage');
  const glow = await garage.evaluate(el => getComputedStyle(el).boxShadow);
  expect(glow).not.toBe('none');
});
