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
// Tap the shopkeeper (you walk over), and wait for what they say
async function talk(page) {
  await idle(page);
  if (!(await page.evaluate(() => S.inside))) { await page.locator('.hs[data-go="act:enter"]').click(); await idle(page); }   // go in first
  await page.locator('.hs[data-go="act:talk"]').click();
  await idle(page);
}
// Try the door: true if it's open and you went in (a closed door gives a message instead)
async function tryDoor(page) {
  await idle(page);
  if (await page.evaluate(() => S.inside)) return true;
  await page.locator('.hs[data-go="act:enter"]').click();
  await idle(page);
  if (await page.locator('.dlg').count()) { await ok(page); return false; }
  return true;
}
// The little game: go round the side of the nut, get behind it, and draw it out towards you
async function hookNut(page) {
  const box = await page.locator('#stage canvas').boundingBox();
  const at = (x, y) => page.mouse.move(box.x + x / 480 * box.width, box.y + y / 270 * box.height, { steps: 12 });
  const nut = await page.evaluate(() => FISH.nut.slice());
  await at(nut[0] + 40, 240);                 // up the side, well clear of the nut
  await at(nut[0] + 40, nut[1] - 20);
  await at(nut[0], nut[1] - 20);              // across, behind it
  await at(nut[0], 262);                      // and pull it all the way out
  await idle(page);
}
// Walk home, then into the garage, then somewhere in it
async function garage(page, where) {
  await page.evaluate(() => { S.screen = 'home'; S.place = null; render(); });
  await act(page, 'Garage');
  await ok(page);                                                       // close anything that happens as you walk in (the nut escaping)
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
  expect(await page.evaluate(() => S.inside)).toBe(false);             // you only see the outside
  await page.locator('.hs[data-go="act:enter"]').click();
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
  await goPlace(page, 'Spanner & Son'); await talk(page); await ok(page);
  await goPlace(page, 'Quickfix Motors'); await talk(page); await ok(page);
  await goPlace(page, 'Main Dealer'); await talk(page); await choose(page, 'Pay £120');
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
  await goPlace(page, 'Tool Shop'); await talk(page); await choose(page, 'cheap');
  await garage(page, 'Under the car'); await act(page, 'Zoom in: gearbox');
  await act(page, 'Use the extractor'); await ok(page);
  await goPlace(page, 'Hardware Shop'); await talk(page); await choose(page, 'proper');
  await garage(page, 'Under the car'); await act(page, 'Zoom in: gearbox');
  await act(page, 'Use the extractor'); await ok(page);
  expect(await flag(page, 'b2')).toBe(true);
  await act(page, 'Pull the sensor out'); await ok(page);
  expect(await flag(page, 'sensorOut')).toBe(true);

  // find nut 3: torch (flat) from the toolbox, batteries from the kitchen, see it under the chest, a stick, hook it out
  await garage(page); await ok(page);
  await act(page, 'Search under the car'); await ok(page);                         // too dark
  await act(page, 'Toolbox'); await act(page, 'Open 5'); await act(page, 'Take the torch'); await ok(page);
  await page.evaluate(() => { S.screen = 'home'; S.place = null; render(); });
  await act(page, 'Look for batteries'); await ok(page);
  await garage(page);
  await act(page, 'Search under the tool chest'); await ok(page);
  await page.evaluate(() => { S.screen = 'home'; render(); });
  await act(page, 'Get a long stick'); await ok(page);
  await garage(page);
  await act(page, 'Search under the tool chest'); await choose(page, 'Hook it out');
  expect(await page.evaluate(() => S.screen)).toBe('fish');
  await hookNut(page);
  await ok(page);
  expect(await flag(page, 'n3found')).toBe(true);

  // order the sensor, sleep on it, collect it from the other branch
  await goPlace(page, 'Motor Factors'); await talk(page); await ok(page);
  await page.evaluate(() => { S.screen = 'home'; S.place = null; render(); });
  await act(page, 'Go to bed'); await ok(page);
  await goPlace(page, 'Parts 4 Less'); await ok(page);
  for (let i = 0; i < 10 && !(await page.evaluate(() => !!S.inv['part-p4l'])); i++) {
    if (await tryDoor(page)) {                                                      // open: go in and talk
      await talk(page);
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
  await act(page, 'Pull'); await ok(page);                                 // jammed: needs a hammer
  await act(page, 'Back to the garage'); await act(page, 'Toolbox'); await act(page, 'Open 6'); await act(page, 'Look for the hammer'); await ok(page);
  await goPlace(page, 'Hardware Shop'); await talk(page); await ok(page);   // "not got any"
  await page.locator('.hs[data-go="act:shelfzoom:1"]').click(); await idle(page);
  await page.locator('.hs[data-go="act:shelfitem:Claw hammer"]').click(); await ok(page);
  expect(await page.evaluate(() => !!S.inv.hammer)).toBe(true);
  await garage(page, 'Workbench');
  await act(page, 'Tap it with the hammer'); await ok(page);
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

test('losing it at 100 anger shakes the screen and adds a job; once the car is broken four ways, it is the wheelie bin', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { anger(100); render(); });
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('kick');
  await ok(page);
  expect(await page.evaluate(() => S.jobs.some(j => j.id.startsWith('broke-')))).toBe(true);
  for (let i = 0; i < 4; i++) { await page.evaluate(() => { anger(100); render(); }); await ok(page); }   // three more car breaks, then the bin
  expect(await page.evaluate(() => S.jobs.filter(j => j.id.startsWith('broke-')).length)).toBe(4);
  expect(await page.evaluate(() => S.jobs.some(j => j.id.startsWith('kicked-')))).toBe(true);
  expect(errors).toEqual([]);
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
  const name = garage.locator('xpath=following-sibling::span[1]');      // its name sits just after it
  await expect(name).toBeHidden();
  await garage.hover();
  await expect(name).toBeVisible();
  await expect(name).toHaveText('Garage');
  const lit = await garage.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(lit).not.toBe('rgba(0, 0, 0, 0)');
});

test('in a shop you walk to the shopkeeper and they answer in a speech bubble with an arrow', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await goPlace(page, 'Spanner & Son');
  expect(await page.evaluate(() => S.inside)).toBe(false);             // the shop front first
  await page.locator('.hs[data-go="act:enter"]').click(); await idle(page);
  expect(await page.evaluate(() => S.inside)).toBe(true);
  expect(await page.locator('.dlg').count()).toBe(0);                  // nobody talks until you go to them
  await page.locator('.hs[data-go="act:talk"]').click();
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('walk');
  await idle(page);
  const bubble = page.locator('.dlg.bubble');
  await expect(bubble).toBeVisible();
  const arrow = await bubble.evaluate(el => getComputedStyle(el, '::after').borderTopWidth);
  expect(parseFloat(arrow)).toBeGreaterThan(10);
  expect(errors).toEqual([]);
});

test('the breakers yard: look round the wrecks; your exact car has had the part taken', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('new-sensor', 'Find a sensor that fits', 'light'); lead('new-sensor', 'breakers', 'Breakers', 'Gaz', 'maybe', 'place:Breakers Yard'); S.mins = 10 * 60; });
  await goPlace(page, 'Breakers Yard');
  await talk(page);
  await choose(page, 'Look round the yard');
  expect(await page.evaluate(() => S.screen)).toBe('yard');
  for (let i = 0; i < 6; i++) {
    await idle(page);
    await page.locator(`.hs[data-go="act:wreck:${i}"]`).click();
    await idle(page);
    if (i === 4) expect(await dialogText(page)).toContain('gone');
    await ok(page);
  }
  expect(await page.evaluate(() => leadOpen('breakers'))).toBe(false);
  expect(errors).toEqual([]);
});

test('turn the key by tapping it: I, II, then start; running, only the red light stays on', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'dash'; render(); });
  for (let k = 1; k <= 2; k++) { await idle(page); await page.locator('.hs[data-go="act:turnkey"]').click(); expect(await page.evaluate(() => S.key)).toBe(k); }
  await idle(page);
  await page.locator('.hs[data-go="act:turnkey"]').click();
  await ok(page);
  expect(await page.evaluate(() => S.flags.running)).toBe(true);
  await expect(page.locator('.acts button', { hasText: 'Rev the engine' })).toBeVisible();
  await act(page, 'Rev the engine');
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('rev');
  expect(errors).toEqual([]);
});

test('the horn in the middle of the steering wheel goes PARP, with the key off or on', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'dash'; render(); });
  await idle(page);
  await page.locator('.hs[data-go="act:horn"]').click();
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('horn');
  await idle(page);
  await act(page, 'Press the horn');
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('horn');
  expect(errors).toEqual([]);
});

test('the post office: ten in the queue and it never moves, unless you were outside when it opened at 9', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  // late: at the back of the queue, and waiting gets you nowhere
  await page.evaluate(() => { S.mins = 11 * 60; });
  await goPlace(page, 'Post Office');
  await talk(page);
  expect(await dialogText(page)).toContain('Ten people');
  await choose(page, 'Wait in the queue');
  expect(await page.evaluate(() => S.flags.poFirst)).toBeFalsy();
  // next morning: get there before nine, wait outside, go in when it opens: first
  await page.evaluate(() => { S.screen = 'home'; S.place = null; render(); });
  await act(page, 'Go to bed'); await ok(page);
  await goPlace(page, 'Post Office');
  await act(page, 'Wait until it opens'); await ok(page);
  await talk(page);
  expect(await dialogText(page)).toContain('first');
  expect(errors).toEqual([]);
});

test('the nut bounces out and hides under the tool chest; you need a torch to see it', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.flags.codes = true; S.flags.sensorJob = true; job('sensor-off', 'Get the old sensor off', 'light'); S.screen = 'underZoom'; render(); });
  await act(page, 'Undo nut 3');
  expect(await dialogText(page)).toContain('bounces out');
  await ok(page);
  await page.evaluate(() => { S.screen = 'home'; S.place = null; render(); });
  await act(page, 'Garage');                                            // walk in: the nut escapes as you arrive
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('nutEscape');
  await ok(page);
  await act(page, 'Search under the tool chest');
  expect(await dialogText(page)).toContain('torch');
  expect(errors).toEqual([]);
});

test('lose your temper and something on the car breaks; tap the anger bar to calm down', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { anger(100); render(); });
  await ok(page);
  expect(await page.evaluate(() => !!findJob('broke-mirror'))).toBe(true);
  await page.click('.go[data-go="act:calm"]');
  await choose(page, 'Ring Mum');
  expect(await page.evaluate(() => S.anger)).toBeLessThan(40);
  expect(errors).toEqual([]);
});

test('the manuals: each book has its title on the spine; pull one down and read it', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await garage(page);
  await page.locator('.hs[data-go="shelf"]').click(); await idle(page);
  expect(await page.locator('.spine').count()).toBe(14);
  await page.locator('.hs[data-go="act:book:7"]').click();
  await expect(page.locator('.book')).toContainText('torn out');
  await act(page, 'Put it back');
  await expect(page.locator('.book')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the fuses: the lid says see the manual, the manual pages are torn out, the diagram online says F23', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('meaning', 'What does P0705 mean?', null); S.screen = 'fuseZoom'; render(); });
  await act(page, 'Check every fuse');
  expect(await dialogText(page)).toContain('see owner');
  await ok(page);
  await page.evaluate(() => { S.screen = 'shelf'; render(); });
  await page.locator('.hs[data-go="act:book:7"]').click();               // the owner's handbook
  await expect(page.locator('.book')).toContainText('torn out');
  expect(await page.evaluate(() => leadOpen('fusediagram'))).toBe(true);
  await page.evaluate(() => { S.screen = 'home'; render(); });
  await act(page, 'Computer');
  await page.click('[data-app="TechDocs"]');
  await page.locator('button', { hasText: 'Note it down' }).click(); await ok(page);
  expect(await flag(page, 'knowF23')).toBe(true);
  await page.evaluate(() => { S.screen = 'fuseZoom'; render(); });
  await act(page, 'Check every fuse');
  expect(await dialogText(page)).toContain('F23');
  expect(errors).toEqual([]);
});

test('a shop shelf, close up: the hammer they said they had not got is on the middle shelf', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('hammer', 'Find a hammer', null); S.flags.needHammer = true; S.mins = 10 * 60; });   // 10 o'clock: the shop is open
  await goPlace(page, 'Hardware Shop'); await talk(page);
  expect(await dialogText(page)).toContain('Not got any');
  await ok(page);
  await page.locator('.hs[data-go="act:shelfzoom:0"]').click(); await idle(page);
  expect(await page.locator('.hs[data-go="act:shelfitem:Claw hammer"]').count()).toBe(0);   // not on the top shelf
  await act(page, 'Step back');
  await page.locator('.hs[data-go="act:shelfzoom:1"]').click(); await idle(page);
  await page.locator('.hs[data-go="act:shelfitem:Claw hammer"]').click();
  expect(await dialogText(page)).toContain("Didn't know we had one");
  await ok(page);
  expect(await page.evaluate(() => !!S.inv.hammer)).toBe(true);
  expect(errors).toEqual([]);
});
