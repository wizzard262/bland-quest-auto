// The Thankless Task: tests that play the game by tapping, like a player would.
// The game's own variables (S = the game state) are read straight from the page to check the results.
const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const GAME = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

// ---------- helpers: each one is a thing a player does ----------
// Start a brand-new game, close How to play, and play the opening (the MOT verdict, then drive home)
// skipOpening: stay in the MOT Test Centre, where the game starts
async function start(page, errors, skipOpening) {
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(GAME);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.click('#help-close');
  if (skipOpening) return;
  await talk(page);
  await page.locator('.dlg').click();                    // his verdict: tap to carry on
  await choose(page, 'Drive home');
}
// Wait for any animated moment to finish playing
const idle = page => page.waitForFunction(() => !ANIM);
// Carry on past every dialog until none are left: tap a plain one, or click the first button of a choice
async function ok(page) {
  await idle(page);
  for (let i = 0; i < 6; i++) {
    await idle(page);
    const dlg = page.locator('.dlg');
    if (!(await dlg.count())) return;
    const buttons = dlg.locator('button');
    if (await buttons.count()) await buttons.first().click();
    else await dlg.click();
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
// Tap a thing in the picture by where it goes (its data-go)
async function tap(page, go) {
  await idle(page);
  await page.locator(`.hs[data-go="${go}"]`).click({ timeout: 20000 });   // a missing thing fails fast, naming it
}
// In a tool shop: the hammer is in the middle of shelf 2; into the basket, then pay at the till
async function buyHammer(page) {
  await tap(page, 'act:shelfzoom:1');
  await tap(page, 'act:shelfitem:1:4');
  await act(page, 'Step back');
  await tap(page, 'act:checkout');
}
// Go indoors, into the room (the computer, the bed, the kettle)
async function goRoom(page) {
  await page.evaluate(() => { S.screen = 'room'; render(); });
}
// Go to bed: indoors, tap the bed, and wait for the night to pass
async function sleep(page) {
  await goRoom(page);
  await tap(page, 'act:bed');
}
// In the driver's seat: tap the key until the engine starts
async function startCar(page) {
  for (let i = 0; i < 4 && !(await page.evaluate(() => S.flags.running)); i++) await tap(page, 'act:turnkey');
}
// Go into town from wherever you are, then to a place on the map
async function goPlace(page, name) {
  const screen = await page.evaluate(() => S.screen);
  if (screen === 'place') await page.evaluate(() => { S.screen = 'city'; render(); });
  else if (screen !== 'city') {
    await page.evaluate(() => { if (S.screen !== 'home') { S.screen = 'home'; render(); } });
    await tap(page, 'city'); await idle(page);                            // tap the car
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
  await tap(page, 'garage'); await idle(page);
  await ok(page);                                                       // close anything that happens as you walk in (the nut escaping)
  if (where) await garageTap(page, where);
}
// In the garage: tap a thing in the picture by its name
async function garageTap(page, where) {
  const go = { 'Toolbox': 'toolbox', 'Workbench': 'bench', "Driver's seat": 'dash', 'Under the car': 'under', 'Under the bonnet': 'bonnet' }[where];
  if (go) { await tap(page, go); await idle(page); return; }
  await tap(page, 'act:search:' + where.replace('Search under ', ''));         // 'Search under the car' and so on
}
const flag = (page, f) => page.evaluate(k => !!S.flags[k], f);

// ---------- the tests ----------
test('the game starts at the MOT Test Centre: lovely car, but the red light is a fail; ask him anything and it is no idea, mate', async ({ page }) => {
  const errors = [];
  await start(page, errors, true);
  expect(await page.evaluate(() => [S.screen, S.place, S.inside])).toEqual(['place', 'MOT Test Centre', true]);
  await talk(page);
  const verdict = await dialogText(page);
  expect(verdict).toContain('red light on the dashboard');
  expect(verdict).toContain('fail');
  expect(await page.evaluate(() => [findJob('pickup').status, !!findJob('codes'), !!S.inv['mot-sheet']])).toEqual(['done', true, true]);
  expect(await page.locator('.dlg button').count()).toBe(0);           // nothing to choose yet: tap to carry on
  await page.locator('.dlg').click();
  expect(await dialogText(page)).toContain('Anything else');
  // you ask in your own speech bubble; a tap anywhere carries on to his answer
  await page.locator('.dlg button', { hasText: 'Can you fix it' }).click();
  expect(await page.evaluate(() => [DIALOG.title, !!DIALOG.at])).toEqual(['You', true]);
  expect(await page.locator('.dlg.bubble button').count()).toBe(0);
  await page.mouse.click(600, 300);
  expect(await dialogText(page)).toContain('only test them');
  // every other question: no idea, mate
  for (const q of ['What does the red light mean', 'Who should I take it to']) {
    await page.locator('.dlg button', { hasText: q }).click();
    await page.locator('.dlg').click();
    expect(await dialogText(page)).toContain('No idea, mate');
  }
  await page.locator('.dlg button', { hasText: 'Drive home' }).click();
  expect(await page.evaluate(() => S.screen)).toBe('home');
  expect(errors).toEqual([]);
});

test('a message with nothing to choose has no OK button: a tap anywhere carries on; tapping away from a choice closes it', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => say('Test', 'Just a message.'));
  expect(await page.locator('.dlg button').count()).toBe(0);
  await page.mouse.click(300, 300);
  expect(await page.locator('.dlg').count()).toBe(0);
  await page.evaluate(() => say('Test', 'Pick one.', [{ label: 'One', run() {} }, { label: 'Two', run() {} }]));
  await page.mouse.click(1100, 850);
  expect(await page.locator('.dlg').count()).toBe(0);
  expect(errors).toEqual([]);
});

test('every screen draws without errors', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  for (const s of ['home', 'city', 'garage', 'toolbox', 'under', 'underZoom', 'bonnet', 'fuseZoom', 'dash', 'bench', 'notebook', 'phone', 'pc', 'room', 'stores']) {
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
  await tap(page, 'act:drawer:1');                                     // tap the drawer's front: it slides out
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('drawer');
  expect(await page.evaluate(() => S.drawer)).toBe(1);
  await act(page, 'Look for the 10 mm');
  expect(await dialogText(page)).toContain('10');
  await ok(page);
  await tap(page, 'act:drawer:1');                                     // tap its front again: it slides back in
  expect(await page.evaluate(() => S.drawer)).toBe(0);
  await tap(page, 'act:drawer:6');                                     // the bottom one: you look down so its front is still on screen
  const front = await page.locator('.hs[data-go="act:drawer:6"]').boundingBox();
  const stage = await page.locator('#stage').boundingBox();
  expect(front.y + front.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
  await tap(page, 'act:drawer:6');
  expect(await page.evaluate(() => S.drawer)).toBe(0);
});

test('the manuals: a book comes off the shelf and opens; three pages; tapping off it or leaving puts it back', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'shelf'; render(); });
  expect(await page.evaluate(() => BOOKS.map(b => b[0]).join('|'))).toContain('Fly Fishing');
  await tap(page, 'act:book:14');
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('book');   // off the shelf first
  await expect(page.locator('.book')).toContainText('Fanged Noumena');
  await expect(page.locator('.book')).toContainText('Page 1 of 3');
  await page.locator('.book [data-act="bookpage:1"]').click();
  await expect(page.locator('.book')).toContainText('Page 2 of 3');
  await page.locator('.bookoff').click({ position: { x: 5, y: 200 } });   // tap off the book: it goes back
  expect(await page.evaluate(() => S.book)).toBe(null);
  await idle(page);
  await tap(page, 'act:book:15');
  await idle(page);
  await page.evaluate(() => { S.screen = 'garage'; render(); });       // leave the shelf: it goes back too
  expect(await page.evaluate(() => S.book)).toBe(null);
  expect(errors).toEqual([]);
});

test('the parts boxes: look down into them and rummage with the mouse', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'garage'; render(); });
  await tap(page, 'partsbox'); await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('partsbox');
  const before = await page.evaluate(() => PILE.map(j => j.x + ',' + j.y).join(' '));
  const box = await page.locator('#stage canvas').boundingBox();
  const at = (x, y) => [box.x + x / 480 * box.width, box.y + y / 270 * box.height];
  await page.mouse.move(...at(80, 80)); await page.mouse.down();
  for (let k = 1; k <= 20; k++) await page.mouse.move(...at(80 + k * 6, 80 + k * 7));
  await page.mouse.up();
  expect(await page.evaluate(() => PILE.map(j => j.x + ',' + j.y).join(' '))).not.toBe(before);
  const kinds = () => page.evaluate(() => PILE.map(j => j.k).join(','));
  const today = await kinds();
  await page.evaluate(() => { S.day += 1; render(); });                 // the next day: a fresh, different heap
  expect(await kinds()).not.toBe(today);
  expect(errors).toEqual([]);
});

test('look under the garage things any time: black without a light, lit with the phone torch', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'garage'; render(); });
  for (const where of ['the shelves', 'the tool chest', 'the workbench', 'the car', 'the parts boxes']) await expect(page.locator(`.hs[data-go="act:search:${where}"]`)).toHaveCount(1);
  await tap(page, 'act:search:the car');
  expect(await dialogText(page)).toContain('Pitch black');
  await ok(page);
  await act(page, 'Get up');
  await page.evaluate(() => { S.flags.phoneTorch = true; render(); });
  await tap(page, 'act:search:the tool chest');
  const said = await dialogText(page);
  expect(said).toContain('Dust');                                       // nut 3 isn't lost yet: nothing to find…
  expect(said).not.toContain('nut');                                    // …and no talk of a nut
  await ok(page);
  expect(await page.evaluate(() => S.screen)).toBe('lookunder');
  expect(errors).toEqual([]);
});

test('your wife: she wants it scrapped, but every third time she says something useful', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await goRoom(page);
  const said = [];
  for (let k = 0; k < 3; k++) { await tap(page, 'act:wife'); said.push(await dialogText(page)); await ok(page); }
  expect(said[0]).toMatch(/scrap|Fiesta|Micra|wedding/i);
  expect(said[2]).toMatch(/codes|hammer|fuses|1234|tea/);
  await expect(page.locator('.dlg')).toHaveCount(0);
  expect(errors).toEqual([]);
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
  await goRoom(page); await tap(page, 'pc'); await idle(page);
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
  await act(page, 'Take the box off'); await ok(page);                     // the sensor comes off in its box
  expect(await flag(page, 'boxOff')).toBe(true);
  expect(await flag(page, 'sensorOut')).toBe(false);

  // on the workbench: undo the box's 3 screws (the last one shears), then lift the old sensor out
  await garage(page, 'Workbench');
  await act(page, 'Undo screw 1'); await ok(page);
  await act(page, 'Undo screw 2'); await ok(page);
  await act(page, 'Undo screw 3'); await ok(page);
  expect(await page.evaluate(() => S.flags.sheared)).toBe(3);
  await act(page, 'Lift the old sensor out'); await ok(page);
  expect(await flag(page, 'sensorOut')).toBe(true);

  // find nut 3: torch (flat) from the toolbox, batteries from the kitchen, see it under the chest, a stick, hook it out
  await garage(page); await ok(page);
  await garageTap(page, 'Search under the car'); await ok(page);                         // too dark
  await act(page, 'Get up');
  await garageTap(page, 'Toolbox'); await tap(page, 'act:drawer:5'); await act(page, 'Take the torch'); await ok(page);
  await page.evaluate(() => { S.screen = 'home'; S.place = null; render(); });
  await goRoom(page); await act(page, 'Look for batteries'); await ok(page);
  await garage(page);
  await garageTap(page, 'Search under the tool chest'); await ok(page);
  await act(page, 'Get up');
  await page.evaluate(() => { S.screen = 'home'; render(); });
  await act(page, 'Get a long stick'); await ok(page);
  await garage(page);
  await garageTap(page, 'Search under the tool chest'); await choose(page, 'Hook it out');
  expect(await page.evaluate(() => S.screen)).toBe('fish');
  await hookNut(page);
  await ok(page);
  expect(await flag(page, 'n3found')).toBe(true);

  // order the sensor, sleep on it, collect it from the other branch
  await goPlace(page, 'Motor Factors'); await talk(page); await ok(page);
  await page.evaluate(() => { S.screen = 'home'; S.place = null; render(); });
  await sleep(page); await ok(page);
  await goPlace(page, 'Parts 4 Less'); await ok(page);
  for (let i = 0; i < 10 && !(await page.evaluate(() => !!S.inv['part-p4l'])); i++) {
    if (await tryDoor(page)) {                                                      // open: go in and talk
      await talk(page);
      const pay = page.locator('.dlg button', { hasText: 'Pay £31.50' });
      if (await pay.count()) { await pay.click(); await ok(page); continue; }
      await ok(page);
    }
    await tap(page, 'act:wait'); await ok(page);                                  // the watch: wait an hour
  }
  expect(await page.evaluate(() => !!S.inv['part-p4l'])).toBe(true);

  // the workbench: it sticks, comes out, gets rotated, then fits
  await garage(page, 'Workbench');
  await act(page, 'Try the old sensor');                                   // the old one: lined up, it goes back in
  await act(page, 'Rotate'); await ok(page);
  await act(page, 'Push'); await ok(page);
  expect(await page.evaluate(() => S.bench.state)).toBe('in');
  await act(page, 'Try the Parts 4 Less sensor');
  await act(page, 'Push'); await ok(page);
  expect(await page.evaluate(() => S.bench.state)).toBe('stuck');
  await act(page, 'Pull'); await ok(page);                                 // jammed: needs a hammer
  await act(page, 'Back to the garage'); await garageTap(page, 'Toolbox'); await tap(page, 'act:drawer:6'); await act(page, 'Look for the hammer'); await ok(page);
  await goPlace(page, 'Hardware Shop'); await talk(page); await ok(page);   // "not got any"
  await buyHammer(page); await ok(page);
  expect(await page.evaluate(() => !!S.inv.hammer)).toBe(true);
  await garage(page, 'Workbench');
  await act(page, 'Tap it with the hammer'); await ok(page);
  await act(page, 'Pull'); await ok(page);
  await act(page, 'Rotate'); await ok(page);
  await act(page, 'Push'); await ok(page);
  expect(await flag(page, 'fits')).toBe(true);

  // fit it and start the car: the red light goes off… and the ABS light comes on
  await garage(page, 'Under the car'); await act(page, 'Zoom in: gearbox');
  await act(page, 'Fit the box back on'); await ok(page);
  await garage(page, "Driver's seat");
  await startCar(page);
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

test('losing it at 100 anger shakes the screen and adds a job; once the car is broken six ways, it is the wheelie bin', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { anger(100); render(); });
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('rage');
  await ok(page);
  expect(await page.evaluate(() => S.jobs.some(j => j.id.startsWith('broke-')))).toBe(true);
  for (let i = 0; i < 6; i++) { await page.evaluate(() => { anger(100); render(); }); await ok(page); }   // five more car breaks, then the bin
  expect(await page.evaluate(() => S.jobs.filter(j => j.id.startsWith('broke-')).length)).toBe(6);
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

test('shop shelves: along the left wall in sections; arrows move along; things go in and out of the basket; pay at the till; they appear on the garage shelves', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 10 * 60; });
  await goPlace(page, 'Hardware Shop');
  await tap(page, 'act:enter');
  await expect(page.locator('.hs[data-go^="act:shelfzoom:"]')).toHaveCount(3);
  await tap(page, 'act:shelfzoom:0');
  await tap(page, 'act:shelfgo:1');                                    // the arrow: on to shelf 2
  expect(await page.evaluate(() => S.shelfz)).toBe(1);
  await tap(page, 'act:shelfgo:-1');
  expect(await page.evaluate(() => S.shelfz)).toBe(0);
  await tap(page, 'act:shelfitem:0:0');                                // into the basket…
  await tap(page, 'act:shelfitem:0:1');
  await tap(page, 'act:shelfitem:0:1');                                // …and one put back
  await expect(page.locator('.basket')).toContainText('1 thing');
  const [name, price] = await page.evaluate(() => sectionStock(S.place, 0)[0]);
  const money = await page.evaluate(() => S.money);
  await act(page, 'Step back');
  await tap(page, 'act:checkout');
  expect(await dialogText(page)).toContain(name);
  await ok(page);
  expect(await page.evaluate(() => S.money)).toBeCloseTo(money - price, 2);
  expect(await page.evaluate(n => S.bought[n].n, name)).toBe(1);
  // on the garage shelves, in the grid
  await page.evaluate(() => { S.screen = 'garage'; render(); });
  await tap(page, 'stores');
  await idle(page);
  await expect(page.locator('.lab', { hasText: name })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('going to bed: it goes dark, black, then morning, before the message', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await sleep(page);
  await page.waitForFunction(() => ANIM && ANIM.kind === 'night');      // he walks to the bed, then night falls
  await expect(page.locator('.dlg')).toHaveCount(0);                   // the message waits
  expect(await dialogText(page)).toContain('morning');
  expect(errors).toEqual([]);
});

test('the house: a room with the computer on a chair, the bed and the kettle; the parcel sticks out of the mailbox at the kerb', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await tap(page, 'room');                                             // the front door: in
  await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('room');
  for (const go of ['pc', 'act:bed', 'act:tea', 'home']) await expect(page.locator(`.hs[data-go="${go}"]`)).toHaveCount(1);
  const anger = await page.evaluate(() => S.anger);
  await tap(page, 'act:tea'); await ok(page);
  expect(await page.evaluate(() => S.anger)).toBeLessThan(anger);
  await page.locator('.hs[data-go="home"]').last().click();           // your car (Home on the map goes there too)
  await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('home');
  await expect(page.locator('.lab', { hasText: 'Mailbox (empty)' })).toHaveCount(1);
  await page.evaluate(() => { S.doorstep.push({ id: 'reader-good' }); render(); });
  await expect(page.locator('.hs[data-go="act:parcel"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('the pub: open in the evening; sit at the bar, pick a beer; the two regulars give useless advice', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 21 * 60; });
  await goPlace(page, 'The Hesketh Tavern');
  await tap(page, 'act:enter'); await idle(page);
  const [money, anger] = await page.evaluate(() => [S.money, S.anger]);
  await tap(page, 'act:talk');
  for (const beer of ['Hazy DIPA', 'Cider', 'Lager', 'Bitter']) await expect(page.locator('.dlg button', { hasText: beer })).toHaveCount(1);
  await choose(page, 'Bitter');
  expect(await page.evaluate(() => S.money)).toBeCloseTo(money - 4.2, 2);
  expect(await page.evaluate(() => S.anger)).toBeLessThan(anger);
  await tap(page, 'act:punter:0');
  expect(await dialogText(page)).toContain('Old Ron');
  await ok(page);
  await tap(page, 'act:punter:1');
  expect(await dialogText(page)).toContain('Dodgy Dave');
  await ok(page);
  expect(errors).toEqual([]);
});

test('evening: outside gets dark and the lights come on; the garage window shows it', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const brightness = () => page.evaluate(() => { const d = ctx.getImageData(0, 40, W, H - 40).data; let t = 0; for (let i = 0; i < d.length; i += 4) t += d[i] + d[i + 1] + d[i + 2]; return t / (d.length / 4); });
  await page.evaluate(() => { S.mins = 12 * 60; S.screen = 'home'; render(); });
  const day = await brightness();
  await page.evaluate(() => { S.mins = 22 * 60; render(); });
  const night = await brightness();
  expect(night).toBeLessThan(day * 0.6);
  expect(await page.evaluate(() => skyColour()[0])).toBeLessThan(40);
  expect(errors).toEqual([]);
});

test('the phone shows over the screen you were on; its torch lights up under the tool chest', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.flags.n3lost = true; S.screen = 'garage'; render(); });
  await page.click('.go[data-go="phone"]'); await idle(page);
  await expect(page.locator('#stage .back')).toHaveCount(0);           // no Back button…
  await page.locator('.phoneoff').click({ position: { x: 10, y: 200 } });   // …tap off the phone to put it away
  expect(await page.evaluate(() => S.screen)).toBe('garage');
  await page.click('.go[data-go="phone"]'); await idle(page);
  await page.locator('[data-act="phonetorch"]').click();
  expect(await page.evaluate(() => [S.flags.phoneTorch, S.screen])).toEqual([true, 'garage']);
  await tap(page, 'act:search:the tool chest');
  expect(await dialogText(page)).toContain('THERE');
  expect(await page.evaluate(() => S.screen)).toBe('lookunder');
  await ok(page);
  expect(errors).toEqual([]);
});

test('the notebook leafs through its pages; the radio code gets written in it', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { for (let k = 0; k < 40; k++) job('x' + k, 'A made-up job ' + k + ' with a long title to fill the pages up', null); render(); });
  await page.click('.go[data-go="notebook"]'); await idle(page);
  await expect(page.locator('.nbflip.next')).toBeVisible();
  await page.locator('.nbflip.next').click();
  expect(await page.evaluate(() => S.nbPage)).toBe(1);
  await page.evaluate(() => { S.screen = 'dash'; S.key = 1; S.radio = null; render(); radioState().digits = [1, 2, 3, 3]; radioState().pos = 3; render(); });
  await tap(page, 'act:radio:0');
  expect(await page.evaluate(() => radioState().unlocked)).toBe(true);
  expect(await page.evaluate(() => JSON.stringify(findJob('radio')))).toContain('1234');
  expect(errors).toEqual([]);
});

test('in town your blue car takes you home; no Go home button', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => {                                         // the car parked by home, and the map moved so it's in the middle
    S.place = null;
    const i = placeIndex('Home'), x = (i % 7) * BLOCK + STREET + 34, y = Math.floor(i / 7) * BLOCK + STREET + 80;
    S.cam = { ox: 291 - (x - y), oy: 164 - (x + y) / 2 };
    S.screen = 'city'; render();
  });
  await expect(page.locator('.acts button', { hasText: 'Go home' })).toHaveCount(0);
  await page.locator('.hs[data-go="home"]').last().click();           // your car (Home on the map goes there too)
  await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('home');
  expect(errors).toEqual([]);
});

test('at night the wife wears her nightie, asks you to bed and follows you there; stay late at the pub and she texts', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 20 * 60; });
  await goRoom(page);
  await tap(page, 'act:wife');
  expect(await dialogText(page)).toContain('bed');
  await ok(page);
  const before = await page.evaluate(() => Math.hypot(WIFE.pos[0] - BEDSIDE[0], WIFE.pos[1] - BEDSIDE[1]));
  await tap(page, 'act:bed');
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => Math.hypot(WIFE.pos[0] - BEDSIDE[0], WIFE.pos[1] - BEDSIDE[1]));
  expect(after).toBeLessThan(before);
  await ok(page);
  await page.evaluate(() => { S.mins = 22 * 60 + 10; });
  await goPlace(page, 'The Hesketh Tavern');
  await tap(page, 'act:enter'); await idle(page);
  await tap(page, 'act:talk');
  await choose(page, 'Lager');
  expect(await page.evaluate(() => S.msgs[0].from)).toBe('The wife');
  expect(errors).toEqual([]);
});

test('late at night the wife comes into the garage in her nightie: come to bed, Husband', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 21 * 60; S.screen = 'home'; S.place = null; render(); });
  await tap(page, 'garage');
  expect(await dialogText(page)).toContain('Come to bed, Husband');
  await choose(page, 'Go to bed');
  await page.waitForFunction(() => S.mins < 12 * 60 && S.screen === 'room');
  expect(errors).toEqual([]);
});

test('late at night, leave the garage after the wife came in and she follows you outside', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 21 * 60; S.screen = 'home'; S.place = null; render(); });
  await tap(page, 'garage');
  await choose(page, 'Five more minutes');                              // stay a bit: she waits in the garage
  await tap(page, 'home');                                              // leave by the door
  await idle(page);
  expect(await page.evaluate(() => [S.screen, wifeFollowing()])).toEqual(['home', true]);
  const start1 = await page.evaluate(() => FOLLOW.pos.slice());
  expect(Math.hypot(start1[0] - 115, start1[1] - 62)).toBeLessThan(8);  // she comes out of the garage door…
  await page.waitForTimeout(1500);
  const gap = await page.evaluate(() => { const t = followTarget(); return Math.hypot(FOLLOW.pos[0] - t[0], FOLLOW.pos[1] - t[1]); });
  const gap0 = await page.evaluate(s => { const t = followTarget(); return Math.hypot(s[0] - t[0], s[1] - t[1]); }, start1);
  expect(gap).toBeLessThan(gap0);                                       // …and walks after him
  await tap(page, 'act:wife');
  expect(await dialogText(page)).toContain('bed');
  await ok(page);
  await tap(page, 'city'); await idle(page);                           // drive off: she doesn't come too
  expect(await page.evaluate(() => wifeFollowing())).toBe(false);
  expect(errors).toEqual([]);
});

test('ring the wife on the phone: she says what she would say in person', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 11 * 60; S.screen = 'garage'; render(); });
  const said = [];
  const ringWife = async () => {                                        // take the phone out (if it isn't already) and ring her
    if (await page.evaluate(() => S.screen !== 'phone')) { await page.click('.go[data-go="phone"]'); await idle(page); }
    await page.locator('[data-act="ring:Wife"]').click();
  };
  await page.evaluate(() => { window.PITCHES = []; chatter = (n, pitch) => PITCHES.push(pitch); });   // listen for the garbled speech
  for (let k = 0; k < 3; k++) { await ringWife(); said.push(await dialogText(page)); await ok(page); }
  const pitches = await page.evaluate(() => PITCHES);
  expect(pitches.length).toBe(3);                                       // her voice down the phone, every time…
  expect(Math.min(...pitches)).toBeGreaterThan(215);                    // …higher than anyone else's
  await page.evaluate(() => { S.screen = 'room'; render(); });
  await tap(page, 'act:wife');                                          // in the house: the same voice
  expect(await page.evaluate(() => PITCHES[PITCHES.length - 1])).toBe(pitches[0]);
  await ok(page);
  expect(said[0]).toMatch(/scrap|Fiesta|Micra|wedding/i);               // the same as in person: scrap it…
  expect(said[2]).toMatch(/codes|hammer|fuses|1234|tea/);              // …and every third time something useful
  await page.evaluate(() => { S.mins = 22 * 60; });
  await ringWife();
  expect(await dialogText(page)).toContain('bed');                      // late: come to bed
  await ok(page);
  expect(errors).toEqual([]);
});

test('the sensor comes off in its box; on the workbench a screw shears, then parts are tried in the box', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'garage'; render(); });
  await garageTap(page, 'Workbench');
  expect(await page.locator('.acts button', { hasText: 'Undo screw' }).count()).toBe(0);   // nothing on the bench yet
  await page.evaluate(() => { S.flags.codes = true; S.flags.sensorJob = true; S.flags.b1 = S.flags.b2 = S.flags.n3lost = true; job('sensor-off', 'Get the old sensor off', 'light'); S.screen = 'underZoom'; render(); });
  await act(page, 'Take the box off'); await ok(page);
  expect(await page.evaluate(() => findJob('sensor-out').status)).not.toBe('done');
  await act(page, 'Zoom out'); await act(page, 'Get out from under'); await ok(page);
  await garageTap(page, 'Workbench');
  await act(page, 'Lift the old sensor out'); await ok(page);           // still screwed in
  expect(await flag(page, 'sensorOut')).toBe(false);
  await tap(page, 'act:screw:2'); await ok(page);                       // the screws can be tapped in the picture too
  await act(page, 'Undo screw 3'); await ok(page);
  await act(page, 'Undo screw 1');
  expect(await dialogText(page)).toContain('SNAP');                     // the last one always shears
  await ok(page);
  expect(await page.evaluate(() => S.flags.sheared)).toBe(1);
  expect(await page.locator('.acts button', { hasText: 'Try the old sensor' }).count()).toBe(0);
  await tap(page, 'act:boxout'); await ok(page);
  expect(await page.evaluate(() => [S.flags.sensorOut, !!S.inv['old-sensor'], findJob('sensor-out').status, !!findJob('new-sensor')])).toEqual([true, true, 'done', true]);
  await act(page, 'Try the old sensor');                                // now parts can be tried in the box's hole
  await act(page, 'Rotate'); await ok(page);
  await act(page, 'Push'); await ok(page);
  expect(await page.evaluate(() => S.bench.state)).toBe('in');
  expect(errors).toEqual([]);
});

test('going into the garage: the roller door rolls up first', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'home'; S.place = null; render(); });
  await page.locator('.hs[data-go="garage"]').click();
  expect(await page.evaluate(() => GARAGE_OPENING !== null)).toBe(true);   // the door starts up as soon as you tap
  await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('garage');
  expect(errors).toEqual([]);
});

test('after kicking the headlight it stays smashed: the TheeBay one is the wrong side; the Breakers Yard has one; fit it under the bonnet', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { anger(100); render(); });
  await ok(page);
  expect(await page.evaluate(() => brokeOpen('headlight'))).toBe(true);
  await page.evaluate(() => { openParcel('headlight-bay'); render(); });
  expect(await dialogText(page)).toContain('other side');
  await ok(page);
  await page.evaluate(() => { S.screen = 'yard'; S.place = 'Breakers Yard'; render(); ACTIONS.wreck('2'); render(); });
  await choose(page, 'Take its headlight');
  expect(await page.evaluate(() => S.lamps.left)).toBe(1);
  await page.evaluate(() => { S.screen = 'bonnet'; render(); });
  await act(page, 'Fit a new headlight'); await ok(page);
  expect(await page.evaluate(() => brokeOpen('headlight'))).toBe(false);
  expect(errors).toEqual([]);
});

test('kick both headlights in: each shows cracked wherever you see the car, and flickers on its own when the lights are on; a third kick breaks no more headlights', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const lampsOn = screen => page.evaluate(sc => { S.screen = sc; S.place = null; render(); return OUR_LAMPS.length; }, screen);
  await page.evaluate(() => { anger(100); render(); }); await ok(page);   // the first kick: the left one
  expect(await page.evaluate(() => kickedLamps())).toEqual({ left: true, right: false });
  expect(await lampsOn('home')).toBe(1);
  expect(await lampsOn('garage')).toBe(1);
  await page.evaluate(() => { anger(100); render(); }); await ok(page);   // the second: the right one too
  expect(await page.evaluate(() => kickedLamps())).toEqual({ left: true, right: true });
  expect(await lampsOn('home')).toBe(2);
  expect(await lampsOn('garage')).toBe(2);
  await page.evaluate(() => { anger(100); render(); }); await ok(page);   // the third: just the two broken headlights still
  expect(await page.evaluate(() => [kickedLamps(), S.jobs.filter(j => j.id.startsWith('broke-headlight')).length])).toEqual([{ left: true, right: true }, 2]);
  // at night the lights are on: each cracked lamp flickers, and not in step with the other
  const states = await page.evaluate(() => {
    S.mins = 22 * 60; S.screen = 'home'; render();
    const out = [];
    for (let t = 0; t < 6; t += 0.05) out.push(OUR_LAMPS.map(l => { const k = l.seed * 7.3; return Math.sin(t * 17 + k) + Math.sin(t * 5.1 + k * 2) + Math.sin(t * 31 + k * 3) > 0.4; }).join(','));
    return out;
  });
  expect(new Set(states).size).toBeGreaterThan(2);                       // on, off, and one without the other
  expect(states).toContain('true,false');
  // the TheeBay headlight is a right one: now that's the one you need
  await page.evaluate(() => { openParcel('headlight-bay'); render(); });
  expect(await dialogText(page)).toContain('exactly right');
  await ok(page);
  expect(await page.evaluate(() => S.lamps.right)).toBe(1);
  expect(errors).toEqual([]);
});

test('kicks take turns: the left headlight, then (mirrored) the right, then the left again once it is fixed; a wrong-side spare waits on the shelf', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const kick = async () => {
    await page.evaluate(() => { anger(100); render(); });
    const seen = await page.evaluate(() => [RAGE.mirror, canvas.style.transform]);
    await ok(page);
    return seen;
  };
  expect(await kick()).toEqual([false, '']);                            // kick 1: the left, from the left
  expect(await kick()).toEqual([true, 'scaleX(-1)']);                   // kick 2: the right, the scene mirrored
  expect(await page.evaluate(() => kickedLamps())).toEqual({ left: true, right: true });
  // a right one in the post while the left is smashed too: fit it, then try another right one for the left… it goes back on the shelf
  await page.evaluate(() => { openParcel('headlight-bay'); openParcel('headlight-bay'); DIALOG = null; QUEUE.length = 0; S.screen = 'bonnet'; render(); });
  await act(page, 'Fit a new headlight'); await ok(page);               // the right one goes in
  expect(await page.evaluate(() => kickedLamps())).toEqual({ left: true, right: false });
  await act(page, 'Fit a new headlight');                               // the other right one: wrong side
  expect(await dialogText(page)).toContain('back on the shelf');
  await ok(page);
  expect(await page.evaluate(() => [S.lamps.right, storeList().some(([n]) => n === 'Headlight (Zafira, right)')])).toEqual([1, true]);
  // a left one from the yard: fit it; both whole again
  await page.evaluate(() => { addLamp('left'); render(); });
  await act(page, 'Fit a new headlight'); await ok(page);
  expect(await page.evaluate(() => kickedLamps())).toEqual({ left: false, right: false });
  expect(await kick()).toEqual([false, '']);                            // kick 3: the left again
  expect(await page.evaluate(() => [kickedLamps(), findJob('broke-headlight').status])).toEqual([{ left: true, right: false }, 'open']);
  expect(await kick()).toEqual([true, 'scaleX(-1)']);                   // kick 4: the right, and the spare on the shelf fits it
  await page.evaluate(() => { S.screen = 'bonnet'; render(); });
  await act(page, 'Fit a new headlight'); await ok(page);
  expect(await page.evaluate(() => [kickedLamps().right, S.lamps.right])).toEqual([false, 0]);
  expect(errors).toEqual([]);
});

test('you can buy headlights ahead: both sides at the parts shop, and online; they wait on the garage shelf', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const sides = await page.evaluate(() => SHOP_STOCK.parts.filter(([n]) => n.startsWith('Headlight')).map(([n]) => n));
  expect(sides).toEqual(['Headlight (Zafira, right)', 'Headlight (Zafira, left)']);
  await page.evaluate(() => { S.screen = 'pc'; S.app = 'MegaMart'; render(); });
  await expect(page.locator('[data-act="buy:headlight-zam"]')).toHaveCount(1);   // listed with nothing smashed
  await page.evaluate(() => { openParcel('headlight-zam'); DIALOG = null; render(); });
  expect(await page.evaluate(() => [S.lamps.left, storeList().some(([n]) => n === 'Headlight (Zafira, left)')])).toEqual([1, true]);
  expect(errors).toEqual([]);
});

test('from 11 at night the wife is asleep in bed with Zs rising off her: she does not talk, answer the phone or come to the garage', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 23 * 60 + 15; S.screen = 'room'; render(); });
  await tap(page, 'act:wife');
  expect(await dialogText(page)).toContain('asleep');
  await ok(page);
  await page.click('.go[data-go="phone"]'); await idle(page);
  await page.locator('[data-act="ring:Wife"]').click();
  expect(await dialogText(page)).toContain('asleep');
  await ok(page);
  await page.evaluate(() => { S.screen = 'home'; render(); });
  await tap(page, 'garage'); await idle(page);
  expect(await page.evaluate(() => [S.screen, wifeInGarage(), !!DIALOG])).toEqual(['garage', false, false]);
  expect(errors).toEqual([]);
});

test('the watch, bottom left: point at it for Wait 1 hour; tap it and an hour goes by; no other waiting buttons', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  for (const screen of ['home', 'garage', 'room']) {
    await page.evaluate(sc => { S.screen = sc; S.place = null; render(); }, screen);
    await expect(page.locator('.hs[data-go="act:wait"]')).toHaveCount(1);
  }
  await page.locator('.hs[data-go="act:wait"]').hover();
  await expect(page.locator('.lab', { hasText: 'Wait 1 hour' })).toBeVisible();
  const before = await page.evaluate(() => S.mins);
  await tap(page, 'act:wait');
  expect(await dialogText(page)).toContain('An hour goes by');
  await ok(page);
  expect(await page.evaluate(() => S.mins)).toBe(before + 60);
  await page.evaluate(() => { S.mins = 8 * 60; });
  await goPlace(page, 'Post Office'); await idle(page);
  await expect(page.locator('.acts button', { hasText: 'Wait' })).toHaveCount(0);   // no waiting buttons: just the watch
  expect(errors).toEqual([]);
});

test('in a shop there is no Back button: you leave by the wireframe door at the bottom', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await goPlace(page, 'Spanner & Son');
  await tap(page, 'act:enter');
  await expect(page.locator('#stage .back')).toHaveCount(0);
  await tap(page, 'act:leave');
  await idle(page);
  expect(await page.evaluate(() => S.inside)).toBe(false);
  await expect(page.locator('#stage .back')).toHaveCount(0);           // outside too: you leave in your car
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
  const wrecks = await page.evaluate(() => WRECKS.length);
  expect(wrecks).toBeGreaterThan(6);                                  // six that might be yours, and some that aren't
  for (let i = 0; i < wrecks; i++) {
    await idle(page);
    await page.locator(`.hs[data-go="act:wreck:${i}"]`).click();
    await idle(page);
    if (i === 4) expect(await dialogText(page)).toContain('gone');
    if (i === 5) expect(await dialogText(page)).toContain('all six');   // the lead is done once the six are seen
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
  await tap(page, 'act:pedal');                                        // the accelerator revs it
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('rev');
  for (const gone of ['Key: off', 'Key: I', 'Key: II', 'Start it', 'Rev the engine', 'Press the horn', 'Get out']) {
    await expect(page.locator('.acts button', { hasText: gone })).toHaveCount(0);   // no buttons for what's in the picture
  }
  expect(errors).toEqual([]);
});

test('the accelerator does nothing with the engine off; the hatch under the wheel opens on the diagnostic port', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'dash'; render(); });
  await tap(page, 'act:pedal');
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('pedal');
  await tap(page, 'act:hatch');
  expect(await dialogText(page)).toContain('diagnostic port');
  await ok(page);
  expect(await flag(page, 'hatch')).toBe(true);
  await tap(page, 'act:hatch');                                        // nothing to plug in: it goes back on
  expect(await flag(page, 'hatch')).toBe(false);
  expect(errors).toEqual([]);
});

test('the radio: put the code in with the arrows and the middle button; 1234 unlocks it, then it plays three stations', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'dash'; render(); });
  await tap(page, 'act:turnkey');                                      // key to I: the radio wakes up
  const screen = page.locator('.scr.radio');
  await expect(screen).toContainText('CODE');
  await expect(screen).toContainText('_ _ _ _');
  // for each place: press the middle button up to the number, then the right arrow
  for (const digit of [1, 2, 3, 4]) {
    for (let n = 0; n <= digit; n++) await tap(page, 'act:radio:0');   // _ , 0, 1 … up to the number
    if (digit < 4) await tap(page, 'act:radio:1');
  }
  expect(await page.evaluate(() => radioState().unlocked)).toBe(true);
  await expect(screen).toHaveText(/^\d\d:\d\d$/);                    // unlocked and off: the time
  await tap(page, 'act:radio:0');                                      // the middle button turns it on
  await expect(screen).toContainText('CHIP FM');
  await tap(page, 'act:radio:1');
  await expect(screen).toContainText('8BIT GOLD');
  await tap(page, 'act:radio:-1'); await tap(page, 'act:radio:-1');    // left past the first goes round to the last
  await expect(screen).toContainText('BLEEP 99');
  // the key off turns the radio off
  await tap(page, 'act:turnkey'); await ok(page);                      // II
  await startCar(page); await ok(page);
  await tap(page, 'act:turnkey');                                      // running: switch it all off
  expect(await page.evaluate(() => [S.key, radioState().on])).toEqual([0, false]);
  expect(errors).toEqual([]);
});

test('the wrong radio code does not unlock it', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'dash'; S.key = 1; render(); });
  for (let k = 0; k < 4; k++) { await tap(page, 'act:radio:0'); await tap(page, 'act:radio:1'); }   // 0 0 0 0
  expect(await page.evaluate(() => radioState().digits.join(''))).toBe('0000');
  expect(await page.evaluate(() => radioState().unlocked)).toBe(false);
  expect(errors).toEqual([]);
});

test("the door handle in the driver's door gets you out", async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'dash'; render(); });
  await tap(page, 'garage');
  await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('garage');
  expect(errors).toEqual([]);
});

test('the horn in the middle of the steering wheel goes PARP, with the key off or on', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'dash'; render(); });
  await idle(page);
  await page.locator('.hs[data-go="act:horn"]').click();
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
  await ok(page);
  await tap(page, 'act:wait');                                          // wait an hour in the queue (the watch)
  expect(await dialogText(page)).toContain("hasn't moved");
  await ok(page);
  expect(await page.evaluate(() => S.flags.poFirst)).toBeFalsy();
  // next morning: get there before nine, wait outside, go in when it opens: first
  await page.evaluate(() => { S.screen = 'home'; S.place = null; render(); });
  await sleep(page); await ok(page);
  await goPlace(page, 'Post Office');
  while (await page.evaluate(() => S.mins < 9 * 60)) { await tap(page, 'act:wait'); await ok(page); }   // wait outside until it's open
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
  await tap(page, 'garage');                                            // walk in: the nut escapes as you arrive
  await page.waitForFunction(() => ANIM && ANIM.kind === 'nutEscape');
  await ok(page);
  await garageTap(page, 'Search under the tool chest');
  expect(await dialogText(page)).toContain('torch');
  expect(errors).toEqual([]);
});

test('lose your temper and something on the car breaks; the anger bar goes red and shakes', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.anger = 0; anger(55); render(); });
  await expect(page.locator('.anger.cross.shaking')).toHaveCount(1);     // over half: orange, shaking
  await page.evaluate(() => { anger(50); render(); });                 // full: a cutscene, wherever you are
  expect(await page.evaluate(() => [S.screen, ANIM && ANIM.kind])).toEqual(['rage', 'rage']);
  expect(await dialogText(page)).toContain('$%$£$%^%^');                // he swears (in symbols)
  await ok(page);
  expect(await page.evaluate(() => S.screen)).toBe('home');             // back where you were
  expect(await page.evaluate(() => !!findJob('broke-headlight'))).toBe(true);
  await expect(page.locator('.go[data-go="act:calm"]')).toHaveCount(0);  // no calm-down menu on the bar
  expect(errors).toEqual([]);
});

test('the manuals: each book has its title on the spine; pull one down and read it', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await garage(page);
  await page.locator('.hs[data-go="shelf"]').click(); await idle(page);
  expect(await page.locator('.spine').count()).toBe(19);
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
  await goRoom(page); await tap(page, 'pc'); await idle(page);
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
  await tap(page, 'act:shelfzoom:0');
  expect(await page.locator('.lab', { hasText: 'Claw hammer' }).count()).toBe(0);   // not on the first shelf
  await act(page, 'Step back');
  await buyHammer(page);
  expect(await dialogText(page)).toContain("Didn't know we had one");
  await ok(page);
  expect(await page.evaluate(() => !!S.inv.hammer)).toBe(true);
  expect(errors).toEqual([]);
});
