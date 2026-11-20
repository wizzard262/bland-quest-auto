// Bland Quest Auto: tests that play the game by tapping, like a player would.
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
  await page.addInitScript(() => { window.NO_PUNCTURES = true; window.NO_CARD_BLOCKS = true; window.NO_CALLS = true; });   // no random punctures, blocked cards or phone calls (a test turns them on)
  await page.goto(GAME);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.click('#title-play');                         // the title screen: in
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
  await idle(page);
  if (await page.evaluate(() => atCounter())) await act(page, 'Step back');   // up at the counter: step back to see the shelves
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
// Under something, with a light: move the pointer to aim the torch beam at a point (picture pixels)
async function aimTorch(page, x, y) {
  await idle(page);
  const box = await page.locator('#stage canvas').boundingBox();
  await page.mouse.move(box.x + 2, box.y + box.height - 2);           // off to one corner first, so the move below always registers
  await page.mouse.move(box.x + x / 480 * box.width, box.y + y / 270 * box.height);   // then straight there (not sweeping across)
}
// Where the lost nut lies under the tool chest
const NUT_SPOT = [330, 168];

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
  for (const s of ['home', 'city', 'garage', 'toolbox', 'under', 'underZoom', 'bonnet', 'fuseZoom', 'dash', 'bench', 'notebook', 'phone', 'pc', 'room', 'stores', 'handbook', 'glovebox', 'port', 'ecu', 'roadside', 'walkhome', 'solder']) {
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
  await tap(page, 'act:search:the tool chest'); await idle(page);        // he walks over and gets down
  expect(await page.evaluate(() => [S.screen, !!UNDER_LIT])).toEqual(['lookunder', true]);   // lit: aim the beam about
  expect(await page.locator('.dlg').count()).toBe(0);
  await page.evaluate(() => { BEAM = { x: 400, y: 250 }; act('underlook:0'); });   // the dust, with the beam elsewhere: too dark to see
  expect(await dialogText(page)).toContain('Too dark');
  await ok(page);
  await tap(page, 'act:underlook:0');                                   // tap it: the beam goes where you point
  const said = await dialogText(page);
  expect(said).toContain('Dust');                                       // nut 3 isn't lost yet: just dust…
  expect(said).not.toContain('nut');                                    // …and no talk of a nut
  await ok(page);
  expect(errors).toEqual([]);
});

test('look under a garage thing with a light: a spider sits in the dark now and then, and runs only when the beam finds it', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'garage'; S.flags.phoneTorch = true; render(); });
  await page.evaluate(() => { window.realRandom = Math.random; Math.random = () => 0; });   // a spider this time, at (250, 172)
  await tap(page, 'act:search:the shelves'); await idle(page);
  await page.evaluate(() => { Math.random = window.realRandom; });
  expect(await page.evaluate(() => UNDER_SPIDER)).toEqual({ x: 250, y: 172 });
  await aimTorch(page, 120, 240);                                       // the beam elsewhere: it stays put
  expect(await page.evaluate(() => [!!ANIM, !!UNDER_SPIDER])).toEqual([false, true]);
  await aimTorch(page, 250, 172);                                       // the beam on it: it runs for the dark
  await page.waitForFunction(() => ANIM && ANIM.kind === 'spider');
  expect(await dialogText(page)).toContain('scurries off into the dark');
  await ok(page);
  expect(await page.evaluate(() => UNDER_SPIDER)).toBe(null);
  await act(page, 'Get up');
  await page.evaluate(() => { window.realRandom = Math.random; Math.random = () => 0.99; });   // and this time there's none
  await tap(page, 'act:search:the shelves'); await idle(page);
  await page.evaluate(() => { Math.random = window.realRandom; });
  await aimTorch(page, 250, 172);
  expect(await page.evaluate(() => [!!ANIM, UNDER_SPIDER])).toEqual([false, null]);
  // the beam: lit inside its pool, dark outside it
  await page.evaluate(() => { BEAM = { x: 240, y: 205 }; });
  expect(await page.evaluate(() => [inTorchLight(240, 205), inTorchLight(470, 180)])).toEqual([true, false]);
  expect(errors).toEqual([]);
});

test('open the boot in the garage: the spare wheel, the jack and the wheel brace are in there', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'garage'; render(); });
  await tap(page, 'boot');                                              // he walks round to the back and lifts the lid
  await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('boot');
  for (const [what, says] of [['Spare wheel', 'flat tyre'], ['Jack', 'scissor jack'], ['Wheel brace', 'wheel nuts']]) {   // look at each thing in there
    await tap(page, 'act:look:' + what);
    expect(await dialogText(page)).toContain(says);
    await ok(page);
  }
  await act(page, 'Close the boot');
  expect(await page.evaluate(() => S.screen)).toBe('garage');
  expect(errors).toEqual([]);
});

test('your wife: she wants it scrapped, but every third time she says something useful', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await goRoom(page);
  const said = [];
  for (let k = 0; k < 3; k++) { await tap(page, 'act:wife'); said.push(await dialogText(page)); await ok(page); }
  expect(said[0]).toMatch(/scrap|Fiesta|Micra|wedding/i);
  expect(said[2]).toMatch(/handbook|codes|hammer|fuses|1234|tea/);
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

  // on the workbench: undo the 4 screws round the sensor (the last one shears), then lift the old sensor out
  await garage(page, 'Workbench');
  await act(page, 'Undo screw 1'); await ok(page);
  await act(page, 'Undo screw 2'); await ok(page);
  await act(page, 'Undo screw 3'); await ok(page);
  await act(page, 'Undo screw 4'); await ok(page);
  expect(await page.evaluate(() => S.flags.sheared)).toBe(4);
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
  await garageTap(page, 'Search under the tool chest');
  await aimTorch(page, ...NUT_SPOT); await ok(page);                                     // the beam finds it
  await act(page, 'Get up');
  await page.evaluate(() => { S.screen = 'home'; render(); });
  await act(page, 'Get a long stick'); await ok(page);
  await garage(page);
  await garageTap(page, 'Search under the tool chest');
  await aimTorch(page, ...NUT_SPOT); await choose(page, 'Hook it out');
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
  await act(page, 'Use the extractor on the snapped screw'); await ok(page);   // the snapped screw's stub, out with the proper extractor
  expect(await flag(page, 'stubOut')).toBe(true);
  await page.evaluate(() => { S.flags.screw3 = true; finishJob('screw3', 'from the jar'); });   // the third screw from the jar (its own test)

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

test('losing it at 100 anger: he kicks a headlight in (a job to replace it); only the headlights ever break', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { anger(100); render(); });
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('rage');
  await ok(page);
  expect(await page.evaluate(() => S.jobs.filter(j => j.id.startsWith('broke-')).map(j => j.id))).toEqual(['broke-headlight']);
  for (let i = 0; i < 4; i++) { await page.evaluate(() => { anger(100); render(); }); await ok(page); }   // the other one, then nothing new
  expect(await page.evaluate(() => S.jobs.filter(j => j.id.startsWith('broke-')).map(j => j.id).sort())).toEqual(['broke-headlight', 'broke-headlight2']);
  expect(await page.evaluate(() => S.jobs.some(j => j.id.startsWith('kicked-')))).toBe(false);
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
  await page.evaluate(() => { S.mins = 21 * 60; S.flags.pubCall = S.day; });
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
  await tap(page, 'act:search:the tool chest'); await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('lookunder');
  await aimTorch(page, ...NUT_SPOT);                                    // the phone's torch on the back corner: the nut glints
  expect(await dialogText(page)).toContain('THERE');
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
  await page.evaluate(() => { S.mins = 22 * 60 + 10; S.flags.pubCall = S.day; });
  await goPlace(page, 'The Hesketh Tavern');
  await tap(page, 'act:enter'); await idle(page);
  await tap(page, 'act:talk');
  await choose(page, 'Lager');
  expect(await page.evaluate(() => S.msgs[0].from)).toBe('The wife');
  expect(errors).toEqual([]);
});

// Drink n lagers at the bar (the dialog left open on the last one)
async function lagers(page, n) {
  for (let k = 0; k < n; k++) {
    await tap(page, 'act:talk');
    await page.locator('.dlg button', { hasText: 'Lager' }).click();
    if (k < n - 1) await ok(page);
  }
}
test('more than three drinks: off your stool, thrown out, sick, the wife fetches you by your car, home you stagger and sleep on the floor', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 18 * 60; S.money = 100; S.flags.pubCall = S.day; });
  await goPlace(page, 'The Hesketh Tavern');
  await tap(page, 'act:enter'); await idle(page);
  // the barman warns you from the first drink, and more firmly each time
  await lagers(page, 1);
  expect(await dialogText(page)).toContain('Go steady');
  await ok(page);
  await lagers(page, 2);
  expect(await dialogText(page)).toContain('your third, and your last');
  await ok(page);
  expect(await page.evaluate(() => [S.drinks.n, S.inside, S.flags.pubSat])).toEqual([3, true, true]);
  // the fourth: the bar tilts…
  await lagers(page, 1);
  expect(await dialogText(page)).toContain('tilt');
  await page.locator('.dlg').click();
  // …off the stool and onto the floor; the barman throws you out
  expect(await dialogText(page)).toContain('Out.');
  expect(await page.evaluate(() => [S.flags.pubSat, S.flags.pubFloor])).toEqual([false, true]);
  await page.locator('.dlg').click();
  // outside: sick in the gutter (the puddle stays)
  expect(await dialogText(page)).toContain('sick in the gutter');
  expect(await page.evaluate(() => [S.inside, S.flags.sick === S.day, isDrunk()])).toEqual([false, true, true]);
  await page.locator('.dlg').click();
  // she's there by your car, in her dress (no car of her own): NOT AGAIN, GET IN!
  expect(await dialogText(page)).toContain('NOT AGAIN, GET IN!');
  expect(await page.evaluate(() => [S.flags.pickup === S.day, DIALOG.at !== null])).toEqual([true, true]);
  await page.locator('.dlg').click();
  // home: she walks in; all he can do is follow her in
  expect(await dialogText(page)).toContain('car keys');
  expect(await page.evaluate(() => [S.screen, !!S.flags.wifeWalksIn])).toEqual(['home', true]);
  await ok(page);
  await expect(page.locator('.hs[data-go="city"]')).toHaveCount(0);
  await expect(page.locator('.hs[data-go="garage"]')).toHaveCount(0);
  await tap(page, 'room');
  // in the house: halfway across the room, and down on the carpet asleep
  expect(await dialogText(page)).toContain('fold up on the carpet');
  expect(await page.evaluate(() => [S.screen, S.flags.onFloor, S.spot.room.join() === COLLAPSE_AT.join()])).toEqual(['room', true, true]);
  await page.locator('.dlg').click();
  expect(await dialogText(page)).toContain('face down on the carpet');
  await ok(page);
  expect(await page.evaluate(() => [isDrunk(), !!S.flags.onFloor, S.mins])).toEqual([false, false, 8 * 60]);
  // sober: the car's back, and the barman remembers last time
  await page.evaluate(() => { S.mins = 18 * 60; S.flags.pubCall = S.day; S.screen = 'home'; render(); });
  await tap(page, 'city');
  await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('city');
  await goPlace(page, 'The Hesketh Tavern');
  await tap(page, 'act:enter'); await idle(page);
  await lagers(page, 1);
  expect(await dialogText(page)).toContain('last time');
  await ok(page);
  expect(errors).toEqual([]);
});

test('a drink or three, and the key will not go in the car door: it wobbles about; tap when it is in the lock', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 18 * 60; S.flags.pubCall = S.day; });
  await goPlace(page, 'The Hesketh Tavern');
  await tap(page, 'act:enter'); await idle(page);
  await lagers(page, 2);
  await ok(page);
  await tap(page, 'act:leave'); await idle(page);
  await tap(page, 'city');
  expect(await dialogText(page)).toContain('had a drink');                // a taxi, or drive anyway
  await page.locator('.dlg button', { hasText: 'Drive anyway' }).click();
  await idle(page);
  expect(await page.evaluate(() => [S.screen, KEY.drinks])).toEqual(['keyhole', 2]);
  // aim well away from the lock and tap: a scratch, still at the door
  const box = await page.locator('#c').boundingBox();
  const at = (x, y) => [box.x + x / 480 * box.width, box.y + y / 270 * box.height];
  await page.mouse.move(...at(100, 220));
  await page.waitForTimeout(100);
  await page.mouse.click(...at(100, 220));
  expect(await page.evaluate(() => [S.screen, KEY.scratches.length])).toEqual(['keyhole', 1]);
  // aim at the lock and keep trying: it goes in sooner or later
  await page.mouse.move(...at(300, 150));
  for (let k = 0; k < 1000; k++) {
    const near = await page.evaluate(() => Math.hypot(KEY.pos[0] - KEYHOLE[0], KEY.pos[1] - KEYHOLE[1]) <= KEY_FIT - 1);
    if (near) await page.mouse.click(...at(300, 150));
    if (await page.locator('.dlg').count()) break;                     // in: it says so (a miss just scratches: keep trying)
    await page.waitForTimeout(20);
  }
  expect(await dialogText(page)).toContain('It goes in at last');
  await page.locator('.dlg').click();
  expect(await dialogText(page)).toContain('Blue lights');
  await ok(page);
  expect(await page.evaluate(() => S.screen)).toBe('breath');
  // sober (no drinks today): straight into the car
  await page.evaluate(() => { S.drinks = null; S.booze = null; });
  await goPlace(page, 'The Hesketh Tavern');
  await tap(page, 'city');
  await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('city');
  expect(errors).toEqual([]);
});

// Press and hold on the breathalyser for `ms`, then let go
async function blow(page, ms) {
  await idle(page);
  const box = await page.locator('#c').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}
test('driving off after a drink, the police breath test you: hold to blow; one drink is half way and a pass; two is red, three beeps, again, and a £300 fine', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 20 * 60; S.place = 'The Hesketh Tavern'; S.drinks = { day: S.day, n: 1 }; S.booze = { level: 1, at: nowAbs() }; BREATH_TIME.secs = 0.6; breathStart(); });
  expect(await page.evaluate(() => S.screen)).toBe('breath');
  // let go too soon: blow again
  await blow(page, 150);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => [BREATH.short, !!DIALOG])).toEqual([true, false]);
  // one drink: the lights stop half way, and it's a pass
  await blow(page, 900);
  expect(await page.evaluate(() => BREATH.lit)).toBe(5);
  expect(await dialogText(page)).toContain('Just under');
  await ok(page);
  expect(await page.evaluate(() => S.screen)).toBe('city');
  // two drinks: all the way to red; a fail, blow again, a fail, and the fine on paper
  const money = await page.evaluate(() => { S.drinks = { day: S.day, n: 2 }; S.booze = { level: 2, at: nowAbs() }; breathStart(); return S.money; });
  await blow(page, 900);
  expect(await page.evaluate(() => [BREATH.lit, BREATH.beeped])).toEqual([10, true]);
  expect(await dialogText(page)).toContain('do it again');
  await page.locator('.dlg').click();
  await blow(page, 900);
  expect(await dialogText(page)).toContain('£300 fixed penalty');
  expect(await page.evaluate(() => [BREATH.ticket, S.money, !!S.fine, !!findJob('fine')])).toEqual([true, money, true, true]);   // it comes in the post
  await page.locator('.dlg').click();
  expect(await dialogText(page)).toContain('long walk home');
  await ok(page);
  expect(await page.evaluate(() => [S.screen, isDrunk()])).toEqual(['home', true]);
  expect(errors).toEqual([]);
});

test('at the pub the wife rings: answer and she talks from the phone at your ear; leave it and it is a missed call, then a text', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 18 * 60; CALL_TIMES.after = 300; CALL_TIMES.ring = 1500; CALL_TIMES.text = 1500; });
  await goPlace(page, 'The Hesketh Tavern');
  await tap(page, 'act:enter'); await idle(page);
  // it rings: the phone glows and rattles (no message box); tap it to answer
  await page.waitForFunction(() => CALL && CALL.who === 'The wife');
  await expect(page.locator('.dlg')).toHaveCount(0);
  const still = await page.evaluate(() => { const c = document.querySelector('#c'); return c.toDataURL(); });
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => document.querySelector('#c').toDataURL())).not.toBe(still);   // it's moving
  await page.click('.go[data-go="phone"]');
  expect(await dialogText(page)).toContain('Are you at the pub again?');
  expect(await page.evaluate(() => [ON_PHONE, DIALOG.at !== null, DIALOG.title])).toEqual([true, true, 'The wife']);
  await page.locator('.dlg').click();
  expect(await page.evaluate(() => ON_PHONE)).toBe(false);
  // only once a day
  await tap(page, 'act:leave'); await idle(page);
  await tap(page, 'act:enter'); await idle(page);
  await page.waitForTimeout(800);
  await expect(page.locator('.dlg')).toHaveCount(0);
  // the next day she rings again: leave it ringing
  await page.evaluate(() => { S.day += 1; S.mins = 18 * 60; });
  await tap(page, 'act:leave'); await idle(page);
  await tap(page, 'act:enter'); await idle(page);
  await page.waitForFunction(() => CALL && CALL.who === 'The wife');   // ringing: leave it
  await page.waitForFunction(() => S.msgs[0].body === 'Missed call');
  await page.waitForFunction(() => S.msgs[0].body.includes("Don't drink too much!"));
  expect(await page.evaluate(() => [S.msgs[0].from, S.msgs[1].body])).toEqual(['The wife', 'Missed call']);
  expect(errors).toEqual([]);
});

test('the card machine light blinks on the card machine inside a shop, not on the pavement outside', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 11 * 60; });
  await goPlace(page, 'Hardware Shop');
  expect(await page.evaluate(() => tillLightAt())).toBe(null);               // outside: no light floating about
  await tap(page, 'act:enter'); await idle(page);
  const [light, machine] = await page.evaluate(() => { ISO.ox = SHOP_VIEW[0]; ISO.oy = SHOP_VIEW[1]; return [tillLightAt(), P(78, 61, 24)]; });
  expect(light).toEqual(machine);                                           // inside: on the card machine by the till
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
  expect(said[2]).toMatch(/handbook|codes|hammer|fuses|1234|tea/);     // …and every third time something useful
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
  await act(page, 'Undo screw 4'); await ok(page);                      // the back one, by feel
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

test('after kicking the headlight it stays smashed: the TheeBay one is the wrong side; the Scrap Yard has one; fit it under the bonnet', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { anger(100); render(); });
  await ok(page);
  expect(await page.evaluate(() => brokeOpen('headlight'))).toBe(true);
  await page.evaluate(() => { openParcel('headlight-bay'); render(); });
  expect(await dialogText(page)).toContain('other side');
  await ok(page);
  await page.evaluate(() => { S.screen = 'yard'; S.place = 'Scrap Yard'; render(); ACTIONS.wreck('2'); render(); });
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
  const lampsOn = screen => page.evaluate(sc => { S.screen = sc; S.place = null; render(); return OUR_LAMPS.filter(l => l.cracked).length; }, screen);
  // night, with one kicked in: the cracked one flickers; the other is full on all the time
  const nightLit = () => page.evaluate(() => {
    S.mins = 22 * 60; S.screen = 'home'; render();
    const out = [];
    for (let t = 0; t < 6; t += 0.05) out.push(OUR_LAMPS.map(l => lampLit(l, t)).join(','));
    S.mins = 11 * 60; render();
    return out;
  });
  await page.evaluate(() => { anger(100); render(); }); await ok(page);   // the first kick: the left one
  expect(await page.evaluate(() => kickedLamps())).toEqual({ left: true, right: false });
  expect(await lampsOn('home')).toBe(1);
  expect(await lampsOn('garage')).toBe(1);
  const oneKicked = await nightLit();
  expect(new Set(oneKicked)).toEqual(new Set(['false,true', 'true,true']));   // left flickers, right always on
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
    for (let t = 0; t < 6; t += 0.05) out.push(OUR_LAMPS.map(l => lampLit(l, t)).join(','));
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

test('the scrap yard: look round the wrecks; your exact car has had the part taken', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('new-sensor', 'Find a sensor that fits', 'light'); lead('new-sensor', 'breakers', 'Breakers', 'Gaz', 'maybe', 'place:Scrap Yard'); S.mins = 10 * 60; S.yardSlot = { day: S.day, from: 10 * 60 }; });   // a slot booked for now
  await goPlace(page, 'Scrap Yard');
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

test('the post office: ten in the queue and it never moves; the roadworks make you late every morning; sleep in the car outside and you are first', async ({ page }) => {
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
  // next morning: set off at 7 to beat the queue… the roadworks: you park at 9:10, too late
  await page.evaluate(() => { S.screen = 'home'; S.place = null; render(); });
  await sleep(page); await ok(page);
  await page.evaluate(() => { S.mins = 7 * 60; });
  const anger = await page.evaluate(() => S.anger);
  await goPlace(page, 'Post Office');
  expect(await dialogText(page)).toContain('Roadworks');
  expect(await dialogText(page)).toContain('the night before');
  await ok(page);
  expect(await page.evaluate(() => [S.mins, poInQueue()])).toEqual([9 * 60 + 10, false]);
  expect(await page.evaluate(() => S.anger)).toBeGreaterThan(anger);
  // set off at 3am: the road's shut all night, then the jam: 9:10 again
  await page.evaluate(() => { S.day += 1; S.mins = 3 * 60; S.screen = 'home'; S.place = null; render(); });
  await goPlace(page, 'Post Office');
  expect(await dialogText(page)).toContain('ROAD CLOSED');
  await ok(page);
  expect(await page.evaluate(() => S.mins)).toBe(9 * 60 + 10);
  // so: drive over the evening before (no roadworks then), sleep in the car, wake first in the queue
  await page.evaluate(() => { S.mins = 20 * 60; S.screen = 'home'; S.place = null; render(); });
  await goPlace(page, 'Post Office'); await idle(page);
  expect(await page.locator('.dlg').count()).toBe(0);                  // no jam in the evening
  const day = await page.evaluate(() => S.day);
  await act(page, 'Sleep in the car till morning');
  expect(await dialogText(page)).toContain("You're first");
  await ok(page);
  expect(await page.evaluate(() => [S.day, S.mins, poInQueue(), poAhead()])).toEqual([day + 1, 5 * 60 + 45, true, 0]);
  expect(await page.evaluate(() => S.msgs[0].body)).toContain('POST OFFICE');   // the wife wants to know where you are
  while (await page.evaluate(() => S.mins < poServedAt())) { await tap(page, 'act:wait'); await ok(page); }   // wait outside until it opens
  await talk(page);
  expect(await dialogText(page)).toContain('first');
  expect(errors).toEqual([]);
});

test('waiting outside the shut post office all night (the watch) also makes you first in the queue', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 22 * 60; });
  await goPlace(page, 'Post Office'); await idle(page);
  for (let k = 0; k < 4; k++) { await tap(page, 'act:wait'); await ok(page); }   // 22:20 to 2:20
  expect(await page.evaluate(() => [poInQueue(), poAhead(), poServedAt()])).toEqual([true, 0, 9 * 60]);
  expect(errors).toEqual([]);
});

test('the post office queue outside: it grows from 6am; before 6 you are first (in at 9), from 6 to 9 you are in at 10; after 9 the queue is inside and never moves', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  expect(await page.evaluate(() => [poQueueBy(6 * 60), poQueueBy(7 * 60), poQueueBy(8 * 60), poQueueBy(9 * 60 + 30)])).toEqual([0, 3, 6, 8]);
  const arrive = mins => page.evaluate(m => { S.mins = m; S.inside = false; S.flags.poFirst = 0; S.place = 'Post Office'; arriveAt('Post Office'); S.screen = 'place'; render(); }, mins);
  const goIn = async () => { await tap(page, 'act:enter'); await idle(page); const t = await page.evaluate(() => !!DIALOG && DIALOG.body); await ok(page); return t; };
  // before 6: first in the queue; the door opens at 9 and you're served
  await arrive(5 * 60 + 30);
  expect(await page.evaluate(() => [poAhead(), poServedAt()])).toEqual([0, 9 * 60]);
  await page.evaluate(() => { S.mins = 9 * 60; render(); });
  await goIn();
  expect(await page.evaluate(() => [S.inside, postFirst()])).toEqual([true, true]);
  // 7:30: four in front; at 9 it's not your turn yet; at 10 you're in and served
  await page.evaluate(() => { S.day += 1; });
  await arrive(7 * 60 + 30);
  expect(await page.evaluate(() => poAhead())).toBe(4);
  await page.evaluate(() => { S.mins = 9 * 60 + 20; render(); });
  expect(await goIn()).toContain('Not your turn');
  expect(await page.evaluate(() => S.inside)).toBe(false);
  await page.evaluate(() => { S.mins = 10 * 60; render(); });
  await goIn();
  expect(await page.evaluate(() => [S.inside, postFirst()])).toEqual([true, true]);
  // after 9: straight in, the queue's inside, and you never get served
  await page.evaluate(() => { S.day += 1; });
  await arrive(11 * 60);
  await goIn();
  expect(await page.evaluate(() => [S.inside, postFirst()])).toEqual([true, false]);
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
  expect(await page.locator('.spine').count()).toBe(20);                                    // 20 books, the last The Myth of Sisyphus
  await page.locator('.hs[data-go="act:book:7"]').click();
  await expect(page.locator('.book')).toContainText('Sierra');           // not your car's handbook: that's in the parts box
  await act(page, 'Put it back');
  await expect(page.locator('.book')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the fuses: the lid says see the owner\'s handbook, its fuse page is ripped out, the diagram online is copied onto a page of the notebook and says F23', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('meaning', 'What does P0705 mean?', null); S.screen = 'fuseZoom'; render(); });
  await act(page, 'Check every fuse');
  expect(await dialogText(page)).toContain('see owner');
  await ok(page);
  const note7 = async () => { await page.click('.go[data-go="notebook"]'); await page.locator('.lead', { hasText: 'Note 7' }).click(); };
  await note7();                                                           // the lead: the handbook, which you haven't got
  expect(await page.evaluate(() => S.screen)).toBe('shelf');
  expect(await dialogText(page)).toContain('isn\'t here');                 // not on the shelf
  await ok(page);
  await page.evaluate(() => { S.inv.handbook = true; render(); });        // (found it in the parts box)
  await note7();                                                           // now the lead opens it, at the fuse page: ripped out
  expect(await page.evaluate(() => [S.screen, S.hbPage])).toEqual(['handbook', 4]);
  await expect(page.locator('.book .torn .stub')).toHaveCount(1);
  await expect(page.locator('.book')).toContainText('ripped out');
  expect(await page.evaluate(() => leadOpen('fusebook'))).toBe(false);
  expect(await page.evaluate(() => JSON.stringify(findJob('meaning').notes))).toContain('ripped out');
  expect(await page.evaluate(() => leadOpen('fusediagram'))).toBe(true);
  // online: copy the diagram into the notebook, on a page of its own (the notebook opens at it)
  await page.evaluate(() => { S.screen = 'home'; render(); });
  await goRoom(page); await tap(page, 'pc'); await idle(page);
  await page.click('[data-app="TechDocs"]');
  await page.locator('button', { hasText: 'Copy it into your notebook' }).click();
  expect(await dialogText(page)).toContain('last page of your notebook');
  await ok(page);
  expect(await page.evaluate(() => [S.flags.knowF23, S.flags.fuseCopy, S.screen])).toEqual([true, true, 'notebook']);
  await expect(page.locator('.nb .copied svg')).toHaveCount(1);
  await expect(page.locator('.nb .copied')).toContainText('F23 IPC / TCM sensor supply');
  await expect(page.locator('.nb .copied svg')).toBeInViewport();          // it's the page showing
  await page.evaluate(() => { S.screen = 'fuseZoom'; render(); });
  await act(page, 'Check every fuse');
  expect(await dialogText(page)).toContain('F23');
  expect(errors).toEqual([]);
});

test('fill a basket and walk out without paying: you leave without the things, and the basket is empty', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 10 * 60; });
  await goPlace(page, 'Hardware Shop');
  await tap(page, 'act:enter'); await idle(page);
  await tap(page, 'act:shelfzoom:1');
  await tap(page, 'act:shelfitem:1:4');                                  // the hammer, into the basket
  await act(page, 'Step back');
  expect(await page.evaluate(() => basketHere().length)).toBe(1);
  const money = await page.evaluate(() => S.money);
  await tap(page, 'act:leave');                                          // out of the door, not to the till
  expect(await dialogText(page)).toContain("haven't paid");
  await ok(page);
  expect(await page.evaluate(() => [basketHere().length, !!S.inv.hammer, S.money])).toEqual([0, false, money]);
  await tap(page, 'act:enter'); await idle(page);
  expect(await page.evaluate(() => basketHere().length)).toBe(0);         // back in: the basket's still empty
  expect(errors).toEqual([]);
});

test('a shop shelf, close up: the hammer they said they had not got is on the middle shelf', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('hammer', 'Find a hammer', null); S.flags.needHammer = true; S.mins = 10 * 60; });   // 10 o'clock: the shop is open
  await goPlace(page, 'Hardware Shop'); await talk(page);
  expect(await dialogText(page)).toContain('Not got any');
  await ok(page);
  await act(page, 'Step back');                                         // away from the counter, to see the shelves
  await tap(page, 'act:shelfzoom:0');
  expect(await page.locator('.lab', { hasText: 'Claw hammer' }).count()).toBe(0);   // not on the first shelf
  await act(page, 'Step back');
  await buyHammer(page);
  expect(await dialogText(page)).toContain("Didn't know we had one");
  await ok(page);
  expect(await page.evaluate(() => !!S.inv.hammer)).toBe(true);
  expect(errors).toEqual([]);
});

// ---------- the car handbook ----------
// In the parts box: rummage the junk off the handbook, then tap it
async function findHandbook(page) {
  await page.evaluate(() => { S.screen = 'partsbox'; render(); });
  await idle(page);
  const at = await page.evaluate(() => {
    const hb = PILE.find(j => j.handbook);
    for (const j of PILE) if (!j.handbook && Math.hypot(j.x - hb.x, j.y - hb.y) < 30) { j.x = 220; j.y = 60; }   // the junk on top of it, pushed aside
    render();
    return [hb.x, hb.y];
  });
  const box = await page.locator('#stage canvas').boundingBox();
  await page.mouse.click(box.x + at[0] / 480 * box.width, box.y + at[1] / 270 * box.height);
}

test('the car handbook: the wife says look in it; not on the shelf; found in the parts box; cover, warranty ran out 2 days ago, radio code 1234, the fuse page ripped out', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await goRoom(page);
  for (let k = 0; k < 3; k++) { await tap(page, 'act:wife'); if (k < 2) await ok(page); }
  expect(await dialogText(page)).toContain('car handbook');               // the third time: something useful
  await ok(page);
  await page.click('.go[data-go="notebook"]');
  await page.locator('.lead', { hasText: 'manuals shelf' }).click();      // her lead: the manuals shelf
  expect(await page.evaluate(() => S.screen)).toBe('shelf');
  expect(await dialogText(page)).toContain('isn\'t here');
  await ok(page);
  expect(await page.evaluate(() => leadOpen('handbook-box'))).toBe(true); // try the parts boxes
  await findHandbook(page);
  expect(await dialogText(page)).toContain('There it is');
  await choose(page, 'Read it');
  expect(await page.evaluate(() => [S.inv.handbook, S.screen, findJob('handbook').status])).toEqual([true, 'handbook', 'done']);
  await expect(page.locator('.hbcover')).toContainText('Vauxhall Zafira 1.6 Life / Club Automatic');   // the cover
  const turn = () => page.locator('[data-act="hbpage:1"]').click();
  await turn();
  await expect(page.locator('.book')).toContainText('Contents');
  await turn();
  const expiry = await page.evaluate(() => dateOfDay(S.day - 2));
  expect(expiry).toBe('15 November 2026');                                 // day 1 is Tuesday 17 November: two days before
  await expect(page.locator('.book')).toContainText('Warranty until ' + expiry);
  await turn();
  await expect(page.locator('.book')).toContainText('1234');
  expect(await page.evaluate(() => JSON.stringify(findJob('radio')))).toContain('1234');   // the code goes in the notebook
  await turn();
  await expect(page.locator('.book')).toContainText('ripped out');            // the fuse page

  await expect(page.locator('[data-act="hbpage:1"]')).toHaveCount(0);     // the last page
  await act(page, 'Put it down');
  expect(await page.evaluate(() => S.screen)).toBe('garage');
  await page.evaluate(() => { S.day += 1; S.screen = 'partsbox'; render(); });   // it's not back in the box the next day
  expect(await page.evaluate(() => PILE.some(j => j.handbook))).toBe(false);
  await page.evaluate(() => { S.screen = 'stores'; render(); });          // it's on the garage shelf, and opens from there
  const i = await page.evaluate(() => storeList().findIndex(r => r[0] === HANDBOOK_NAME));
  expect(i).toBeGreaterThanOrEqual(0);
  await page.evaluate(k => ACTIONS.storelook(String(k)), i);
  expect(await page.evaluate(() => S.screen)).toBe('handbook');
  expect(errors).toEqual([]);
});

test('the handbook found and put off till later goes on the garage shelf', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await findHandbook(page);
  await choose(page, 'Later');
  expect(await page.evaluate(() => [S.inv.handbook, S.screen])).toEqual([true, 'partsbox']);
  expect(await page.evaluate(() => storeList().map(r => r[0]))).toContain('Car handbook');
  expect(errors).toEqual([]);
});

// ---------- the battery leads ----------
test('battery leads: each comes off by itself; with either off there is no power, the engine dies, the radio forgets its code and the car will not go', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const lead = side => page.evaluate(k => batteryLeadOn(k), side);
  const power = () => page.evaluate(() => carPowered());
  for (const side of ['plus', 'minus']) {
    await page.evaluate(() => { S.screen = 'dash'; S.key = 1; radioState().unlocked = true; render(); });   // the radio working…
    await startCar(page); await ok(page);
    expect(await flag(page, 'running')).toBe(true);                        // …and the engine running
    await page.evaluate(() => { S.screen = 'bonnet'; render(); });
    await tap(page, 'act:batlead:' + side);                                // take this lead off
    expect(await dialogText(page)).toContain('lift it off');
    await ok(page);
    expect([await lead(side), await power()]).toEqual([false, false]);
    expect(await lead(side === 'plus' ? 'minus' : 'plus')).toBe(true);     // the other one is still on
    expect(await flag(page, 'running')).toBe(false);                       // the engine stopped dead
    expect(await page.evaluate(() => radioState().unlocked)).toBe(false); // and the radio forgot its code
    await page.evaluate(() => { S.screen = 'dash'; S.key = 1; render(); });
    await expect(page.locator('.scr.radio')).toHaveCount(0);              // no power: the radio's dark
    await tap(page, 'act:radio:0');
    expect(await dialogText(page)).toContain('No power');
    await ok(page);
    await tap(page, 'act:turnkey'); await ok(page);                        // II
    await tap(page, 'act:turnkey');                                        // start: nothing
    expect(await dialogText(page)).toContain('No lights');
    await ok(page);
    expect(await flag(page, 'running')).toBe(false);
    await tap(page, 'act:horn');
    expect(await dialogText(page)).toContain('Not a squeak');
    await ok(page);
    await page.evaluate(() => { S.key = 0; S.screen = 'home'; render(); });
    await tap(page, 'city'); await idle(page);                             // the car won't take you to town
    expect(await dialogText(page)).toContain('battery lead');
    await ok(page);
    expect(await page.evaluate(() => S.screen)).toBe('home');
    await page.evaluate(() => { S.screen = 'bonnet'; render(); });
    await tap(page, 'act:batlead:' + side);                                // put it back on
    expect(await dialogText(page)).toContain('Both leads are on');
    await ok(page);
    expect(await power()).toBe(true);
    await page.evaluate(() => { S.screen = 'dash'; S.key = 1; render(); });
    await expect(page.locator('.scr.radio')).toContainText('CODE');       // power back: the radio wants its code again
    await page.evaluate(() => { S.key = 0; render(); });
  }
  await page.evaluate(() => { S.screen = 'bonnet'; render(); });           // both off: one back on isn't enough
  await tap(page, 'act:batlead:plus'); await ok(page);
  await tap(page, 'act:batlead:minus'); await ok(page);
  await tap(page, 'act:batlead:plus');
  expect(await dialogText(page)).toContain('still off');
  await ok(page);
  expect(await power()).toBe(false);
  expect(errors).toEqual([]);
});

// ---------- the shopkeeper close up ----------
test('tap the shopkeeper: a flat close-up of him at the counter, where he talks and you can pay; Step back goes back into the shop', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 10 * 60; });
  await goPlace(page, 'Hardware Shop');
  await talk(page);                                                     // walk over and talk: up to the counter
  expect(await page.evaluate(() => atCounter())).toBe(true);
  await expect(page.locator('.dlg.bubble')).toBeVisible();              // he talks in a speech bubble…
  const [bx, by] = await page.evaluate(() => keeperHead());
  expect([bx, by]).toEqual(await page.evaluate(() => counterKeeperHead()));   // …from his head in the close-up
  await ok(page);
  await expect(page.locator('.hs[data-go="act:checkout"]')).toHaveCount(1);   // the till is on the counter
  await expect(page.locator('.hs[data-go="act:shelfzoom:0"]')).toHaveCount(0); // the shelves aren't in view
  await tap(page, 'act:talk');                                          // talk again, right there
  await expect(page.locator('.dlg')).toHaveCount(1);
  await ok(page);
  await act(page, 'Step back');
  expect(await page.evaluate(() => atCounter())).toBe(false);
  await expect(page.locator('.hs[data-go="act:shelfzoom:0"]')).toHaveCount(1); // back in the shop
  await expect(page.locator('.acts button', { hasText: 'Step back' })).toHaveCount(0);
  await talk(page); await ok(page);                                     // leaving the shop leaves the counter too
  await page.evaluate(() => act('leave')); await ok(page);
  expect(await page.evaluate(() => [S.inside, S.counter])).toEqual([false, null]);
  expect(errors).toEqual([]);
});

// ---------- the Scrap Yard: by appointment only ----------
test('the scrap yard is by appointment only: the number on the gate goes in your phone; ring and book a 2-hour slot; only then is it open', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 9 * 60 + 40; });
  await goPlace(page, 'Scrap Yard');                                   // 10:00 by the time you're there
  await expect(page.locator('.tip')).toContainText('By appointment only');
  await tap(page, 'act:enter');                                           // the gate: shut, with a card on it
  const gate = await dialogText(page);
  expect(gate).toContain('01632 960451');
  expect(gate).toContain('in your phone');
  await ok(page);
  expect(await page.evaluate(() => [S.inside, S.flags.yardNumber, leadOpen('yard-ring')])).toEqual([false, true, true]);
  await page.evaluate(() => { S.mins = 9 * 60 + 50; });                    // 9:55 once it rings: the next slot today starts at 11
  await page.click('.go[data-go="phone"]'); await idle(page);
  await page.locator('[data-act="ring:Yard"]').click();                   // ring them from the phone
  const offer = await dialogText(page);
  expect(offer).toContain('Two-hour slots');
  await expect(page.locator('.dlg button', { hasText: 'Book today 11:00–13:00' })).toHaveCount(1);
  await expect(page.locator('.dlg button', { hasText: 'Book tomorrow 09:00–11:00' })).toHaveCount(1);
  await expect(page.locator('.dlg button', { hasText: 'Book tomorrow 14:00–16:00' })).toHaveCount(1);
  await choose(page, 'Book today 11:00–13:00');
  expect(await page.evaluate(() => S.yardSlot)).toEqual(await page.evaluate(() => ({ day: S.day, from: 11 * 60 })));
  expect(await page.evaluate(() => JSON.stringify(findJob('yard').notes))).toContain('11:00–13:00');
  expect(await page.evaluate(() => closedReason('Scrap Yard'))).toContain('Not before');   // too early still
  await page.evaluate(() => { S.mins = 11 * 60 + 30; S.screen = 'place'; S.inside = false; render(); });   // in the slot
  expect(await page.evaluate(() => closedReason('Scrap Yard'))).toBe(null);
  await tap(page, 'act:enter'); await idle(page);
  expect(await page.evaluate(() => [S.inside, findJob('yard').status])).toEqual([true, 'done']);
  await page.evaluate(() => { S.mins = 13 * 60; });                       // the slot's over: shut again
  expect(await page.evaluate(() => closedReason('Scrap Yard'))).toContain('You missed it');
  await page.evaluate(() => { S.mins = 20 * 60; S.screen = 'garage'; render(); });   // out of hours: the answerphone
  await page.click('.go[data-go="phone"]'); await idle(page);
  await page.locator('[data-act="ring:Yard"]').click();
  expect(await dialogText(page)).toContain('answerphone');
  expect(errors).toEqual([]);
});

test('before you have been to the gate, the phone has no number for the scrap yard', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.click('.go[data-go="phone"]'); await idle(page);
  await expect(page.locator('[data-act="ring:Yard"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// ---------- the glove box ----------
test('the glove box in the car opens on useless things: a snapped ice scraper, a gauge reading 0, a dead torch, the wrong charger', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'dash'; render(); });
  await tap(page, 'act:glovebox');
  expect(await page.evaluate(() => S.screen)).toBe('glovebox');
  const said = [];
  for (let k = 0; k < 4; k++) { await tap(page, 'act:glove:' + k); said.push(await dialogText(page)); await ok(page); }
  expect(said[0]).toContain('snapped');
  expect(said[1]).toContain('0 PSI');
  expect(said[2]).toContain('batteries');
  expect(said[3]).toContain('2009');
  await act(page, 'Shut it');
  expect(await page.evaluate(() => S.screen)).toBe('dash');
  expect(errors).toEqual([]);
});

// ---------- the diagnostic port: try each reader's plug ----------
test('the diagnostic port close up: Gaz\'s round plug and the MegaMart lorry plug don\'t fit; the used reader goes in and reads the codes', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('codes', 'Read the codes', 'light'); S.inv['reader-old'] = S.inv['reader-cheap'] = S.inv['reader-good'] = true; S.screen = 'dash'; render(); });
  await tap(page, 'act:hatch'); await ok(page);                        // pop the hatch off
  await tap(page, 'act:hatch');                                        // then the port, close up
  expect(await page.evaluate(() => S.screen)).toBe('port');
  for (const id of ['reader-old', 'reader-cheap', 'reader-good']) await expect(page.locator(`.hs[data-go="act:tryplug:${id}"]`)).toHaveCount(1);
  const anger = await page.evaluate(() => S.anger);
  await tap(page, 'act:tryplug:reader-old');
  expect(await dialogText(page)).toContain('1994');
  await ok(page);
  await tap(page, 'act:tryplug:reader-cheap');
  expect(await dialogText(page)).toContain('lorries');
  await ok(page);
  expect(await page.evaluate(() => S.anger)).toBeGreaterThan(anger);
  expect(await page.evaluate(() => [S.flags['tried-reader-old'], S.flags['tried-reader-cheap']])).toEqual([true, true]);
  expect(await page.evaluate(() => [!!S.inv['reader-old'], !!S.inv['reader-cheap'], S.junked])).toEqual([false, false, ['reader-old', 'reader-cheap']]);   // no good: in the parts box
  expect(await page.evaluate(() => leadOpen('ebuy-reader'))).toBe(true);   // the MegaMart one sends you to eBuy
  expect(await page.evaluate(() => S.screen)).toBe('port');           // the wrong ones drop back: still at the port
  await tap(page, 'act:tryplug:reader-good');                          // the key's at 0: it fits, but nothing wakes up
  expect(await dialogText(page)).toContain('key needs to be at II');
  await ok(page);
  expect(await page.evaluate(() => S.screen)).toBe('dash');
  expect(await flag(page, 'readerIn')).toBe(false);
  await page.evaluate(() => { S.key = 2; render(); });                // key to II, and try again
  await act(page, 'Try a reader in the port');
  expect(await page.evaluate(() => S.screen)).toBe('port');
  await tap(page, 'act:tryplug:reader-good');
  expect(await dialogText(page)).toContain('P0705');
  await ok(page);
  expect(await flag(page, 'readerIn')).toBe(true);
  expect(await flag(page, 'codes')).toBe(true);
  expect(await page.evaluate(() => S.screen)).toBe('dash');
  expect(errors).toEqual([]);
});

test('the MegaMart reader arrives and is kept, to try in the port', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('codes', 'Read the codes', 'light'); openParcel('reader-cheap'); });
  expect(await dialogText(page)).toContain('Fits all cars');
  await ok(page);
  expect(await page.evaluate(() => [!!S.inv['reader-cheap'], leadOpen('try-cheap')])).toEqual([true, true]);
  expect(errors).toEqual([]);
});

// ---------- the ECU, behind the panel under the dashboard ----------
test('the panel under the dashboard unscrews to show the ECU, covered in stickers', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'dash'; render(); });
  await tap(page, 'act:ecu');
  expect(await dialogText(page)).toContain('Four screws');
  await ok(page);
  expect(await page.evaluate(() => S.screen)).toBe('ecu');
  const said = [];
  for (let k = 0; k < 5; k++) { await tap(page, 'act:ecuthing:' + k); said.push(await dialogText(page)); await ok(page); }
  expect(said[0]).toContain("car's computer");
  expect(said[1]).toContain('ran out two days ago');
  expect(said[2]).toContain('approved dealer');
  expect(said[3]).toContain('red light');
  expect(said[4]).toContain('2008');
  await act(page, 'Put the panel back');
  expect(await page.evaluate(() => S.screen)).toBe('dash');
  await tap(page, 'act:ecu');                                          // the second time: straight in, no screws
  expect(await page.locator('.dlg').count()).toBe(0);
  expect(await page.evaluate(() => S.screen)).toBe('ecu');
  expect(errors).toEqual([]);
});

// ---------- check every fuse: the multimeter and its odd battery ----------
test('check every fuse: F23 looks fine but you need the multimeter; its 23A battery is flat; the Pound Shop and Hardware Shop have not got one; MegaMart has; then all fuses test fine bar the cigarette lighter', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('meaning', 'What does P0705 mean?', null); lead('meaning', 'fuses', 'Check your fuses first', 'MrTorque', 'tbh', 'fuseZoom'); S.flags.knowF23 = true; S.screen = 'fuseZoom'; render(); });
  await act(page, 'Check every fuse');                                 // F23: it looks fine, but test them all
  expect(await dialogText(page)).toContain('multimeter');
  await ok(page);
  expect(await page.evaluate(() => leadOpen('meter'))).toBe(true);
  // the multimeter in drawer 5: flat, and it's an odd battery
  await page.evaluate(() => { S.screen = 'toolbox'; render(); });
  await tap(page, 'act:drawer:5');
  await act(page, 'Test the multimeter');
  expect(await dialogText(page)).toContain('23A');
  await ok(page);
  expect(await page.evaluate(() => ['bat-pound', 'bat-hardware', 'bat-online'].map(leadOpen))).toEqual([true, true, true]);
  await page.evaluate(() => { S.screen = 'fuseZoom'; render(); });
  await act(page, 'Check every fuse');
  expect(await dialogText(page)).toContain('flat');
  await ok(page);
  // the shops: no luck
  await page.evaluate(() => { S.mins = 10 * 60; });
  await goPlace(page, 'Pound Shop'); await talk(page);
  expect(await dialogText(page)).toContain('Twelve volt');
  await ok(page);
  await goPlace(page, 'Hardware Shop'); await talk(page);
  expect(await dialogText(page)).toContain('Try the internet');
  await ok(page);
  expect(await page.evaluate(() => [leadOpen('bat-pound'), leadOpen('bat-hardware')])).toEqual([false, false]);
  // online: MegaMart has them
  await page.evaluate(() => { S.screen = 'pc'; S.app = 'MegaMart'; render(); });
  await page.locator('[data-act="buy:battery-23a"]').click();
  expect(await dialogText(page)).toContain('Order placed');
  await ok(page);
  expect(await page.evaluate(() => [leadOpen('bat-online'), S.parcels.some(p => p.item === 'battery-23a')])).toEqual([false, true]);
  await page.evaluate(() => { S.parcels = []; openParcel('battery-23a'); });
  expect(await dialogText(page)).toContain('It beeps');
  await ok(page);
  expect(await page.evaluate(() => [findJob('meter-battery').status, S.flags.meterOK])).toEqual(['done', true]);
  // now every fuse: a beep each, all fine except F17
  await page.evaluate(() => { S.screen = 'fuseZoom'; render(); });
  await act(page, 'Check every fuse');
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('fusetest');
  expect(await dialogText(page)).toContain('F17');
  await ok(page);
  expect(await page.evaluate(() => [S.flags.fusesTested, leadOpen('fuses'), leadOpen('testfuses')])).toEqual([true, false, false]);
  expect(errors).toEqual([]);
});

test('AA batteries off the shop shelf do not fit the multimeter', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.flags.meterFlat = true; S.bought = { Batteries: { kind: 'box', n: 1 } }; S.screen = 'toolbox'; render(); });
  await tap(page, 'act:drawer:5');
  await act(page, 'Test the multimeter');
  expect(await dialogText(page)).toContain('AAs');
  await ok(page);
  expect(errors).toEqual([]);
});

// ---------- road snags: a puncture on the way home ----------
test('a puncture on the way home: the spare is flat, the phone dies, the walk home in the rain and a splash; the wife says get a wheel and lends you her car; fit it at the roadside', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 10 * 60; });
  await goPlace(page, 'Tyre Place'); await idle(page);
  await page.evaluate(() => { PUNCTURE_CHANCE = 1; });                  // this time it happens
  await page.locator('.hs[data-go="city"]').first().click(); await idle(page);   // back in the car
  await page.locator('.hs[data-go="home"]').first().click();           // drive home…
  expect(await dialogText(page)).toContain('A puncture');
  await ok(page);
  expect(await page.evaluate(() => [S.screen, !!S.road, !!findJob('tyre')])).toEqual(['roadside', true, true]);
  // stuck: you can't go anywhere else
  await page.evaluate(() => { goTo('place:Tool Shop'); });
  expect(await dialogText(page)).toContain('stuck on Mill Lane');
  await ok(page);
  // the spare: flat
  await act(page, 'Open the boot');                                    // the boot opens on its close-up, at the roadside
  expect(await page.evaluate(() => S.screen)).toBe('boot');
  await tap(page, 'act:roadspare');                                    // tap the spare: heave it out
  expect(await dialogText(page)).toContain('flat since 2019');
  await ok(page);
  await act(page, 'Close the boot');                                   // back to the roadside
  expect(await page.evaluate(() => S.screen)).toBe('roadside');
  // ring for help: the phone dies (and stays dead)
  await act(page, 'Ring for help');
  expect(await dialogText(page)).toContain('screen goes black');
  await ok(page);
  await page.click('.go[data-go="phone"]');                             // the phone in your pocket: dead
  await expect(page.locator('.ph')).toContainText('battery is flat');
  await page.evaluate(() => { back(); });
  // walk home: rain, a car, a puddle, soaked; home, and the wife has a plan
  await act(page, 'Walk home');
  expect(await page.evaluate(() => [S.screen, ANIM && ANIM.kind])).toEqual(['walkhome', 'walkhome']);
  expect(await dialogText(page)).toContain('SOAKED');
  await ok(page);
  expect(await page.evaluate(() => [S.screen, S.road.walked, !!S.flags.phoneDead])).toEqual(['room', true, false]);
  expect(await page.evaluate(() => [leadOpen('wheel-yard'), leadOpen('wheel-shop')])).toEqual([true, true]);
  // your car's not in the garage; in town you drive hers
  await page.evaluate(() => { S.screen = 'garage'; render(); });
  await expect(page.locator('.hs[data-go="dash"]')).toHaveCount(0);
  await page.evaluate(() => { goTo('dash'); });
  expect(await dialogText(page)).toContain('on a flat');
  await ok(page);
  // a wheel from the Tyre Place
  const money = await page.evaluate(() => S.money);
  await goPlace(page, 'Tyre Place'); await talk(page);
  expect(await dialogText(page)).toContain('part-worn');
  await ok(page);
  expect(await page.evaluate(() => [S.inv.wheel, S.money])).toEqual(['Tyre Place', money - 35]);
  // back to Mill Lane in her car, and fit it
  await page.evaluate(() => { S.screen = 'home'; S.place = null; render(); });
  await act(page, 'Drive to your car');
  expect(await page.evaluate(() => S.screen)).toBe('roadside');
  await act(page, 'Fit the wheel');
  expect(await dialogText(page)).toContain('spare is still flat');
  await ok(page);
  expect(await page.evaluate(() => [S.screen, S.road, findJob('tyre').status, S.flags.punctured])).toEqual(['home', null, 'done', true]);
  await page.evaluate(() => { S.screen = 'garage'; render(); });
  await expect(page.locator('.hs[data-go="dash"]')).toHaveCount(1);     // your car's back
  expect(errors).toEqual([]);
});

test('a puncture only happens once, and never with the chance at 0', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 10 * 60; S.screen = 'city'; render(); });
  expect(await page.evaluate(() => punctureOnTheWayHome())).toBe(false);   // the tests turn them off
  await page.evaluate(() => { PUNCTURE_CHANCE = 1; S.flags.punctured = true; });
  expect(await page.evaluate(() => punctureOnTheWayHome())).toBe(false);   // had one already
  await page.evaluate(() => { S.flags.punctured = false; S.mins = 20 * 60; });
  expect(await page.evaluate(() => punctureOnTheWayHome())).toBe(false);   // not at night
  expect(errors).toEqual([]);
});

// ---------- the manuals shelf: The Myth of Sisyphus ----------
test('The Myth of Sisyphus is on the manuals shelf: open it and there is a picture of our hero pushing his car up a hill', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'shelf'; render(); });
  const i = await page.evaluate(() => BOOKS.findIndex(b => b[0].startsWith('The Myth of Sisyphus')));
  expect(i).toBeGreaterThanOrEqual(0);
  expect(await page.evaluate(k => { const [x] = bookAt(k); return x + BOOK_W - 2 <= 472; }, i)).toBe(true);   // it fits on the shelf
  await tap(page, 'act:book:' + i); await idle(page);
  await expect(page.locator('.book .pic')).toHaveCount(1);              // the picture, opposite the title page
  await expect(page.locator('.book')).toContainText('pushing his car up a hill');
  await page.locator('[data-act="bookpage:1"]').click();
  await expect(page.locator('.book .pic')).toHaveCount(0);              // the other pages are words
  await expect(page.locator('.book')).toContainText('Sisyphus');
  expect(errors).toEqual([]);
});

// ---------- the flat spare: a screw in it, so it has to be replaced ----------
test('the flat spare has a screw in it: the Tyre Place puts a new tyre on it (ready tomorrow), or the Scrap Yard has one off a wreck', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  // fixed the puncture: the spare is still flat, and that's the next job
  await page.evaluate(() => { job('tyre', 'Sort out the flat tyre', null); S.road = { spare: true, walked: true }; S.spare = 'flat'; S.inv.wheel = 'Tyre Place'; S.screen = 'roadside'; render(); });
  await act(page, 'Fit the wheel');
  expect(await dialogText(page)).toContain('screw in it');
  await ok(page);
  expect(await page.evaluate(() => [findJob('spare').status, leadOpen('spare-yard'), leadOpen('spare-shop')])).toEqual(['open', true, true]);
  // in the boot: the screw
  await page.evaluate(() => { S.screen = 'boot'; render(); });
  await tap(page, 'act:look:Spare wheel');
  expect(await dialogText(page)).toContain('screw in the tread');
  await ok(page);
  // the Tyre Place: a new tyre on it, tomorrow
  await page.evaluate(() => { S.mins = 10 * 60; });
  const money = await page.evaluate(() => S.money);
  await goPlace(page, 'Tyre Place'); await talk(page);
  expect(await dialogText(page)).toContain('Ready tomorrow');
  await ok(page);
  expect(await page.evaluate(() => [S.spare, S.money])).toEqual(['away', money - 35]);
  await talk(page);
  expect(await dialogText(page)).toContain('I said tomorrow');
  await ok(page);
  await page.evaluate(() => { S.day += 1; S.mins = 10 * 60; });
  await talk(page);
  expect(await dialogText(page)).toContain('New tyre on it');
  await ok(page);
  expect(await page.evaluate(() => [S.spare, findJob('spare').status])).toEqual(['good', 'done']);
  expect(errors).toEqual([]);
});

test('the flat spare: a spare off a wreck at the Scrap Yard, in your slot', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.spare = 'flat'; spareJob(); S.mins = 10 * 60; S.yardSlot = { day: S.day, from: 10 * 60 }; });
  await goPlace(page, 'Scrap Yard'); await talk(page);
  expect(await dialogText(page)).toContain('Tenner');
  await ok(page);
  expect(await page.evaluate(() => [S.spare, findJob('spare').status])).toEqual(['good', 'done']);
  expect(errors).toEqual([]);
});

// ---------- bought things that do something: the torch and the batteries ----------
test('a torch off a shop shelf: batteries not included; with AAs from the shop it works, and lights up under the tool chest instead of the phone', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const useOnShelf = async name => {                                     // tap it on the garage shelves
    await page.evaluate(() => { S.screen = 'stores'; render(); });
    const k = await page.evaluate(n => storeList().findIndex(r => r[0] === n), name);
    await tap(page, 'act:storelook:' + k);
    return dialogText(page);
  };
  await page.evaluate(() => { S.bought = { Torch: { kind: 'can', n: 1 } }; });
  expect(await useOnShelf('Torch')).toContain('Batteries not included');
  await ok(page);
  await page.evaluate(() => { S.screen = 'garage'; render(); });
  await tap(page, 'act:search:the tool chest');
  expect(await dialogText(page)).toContain('Pitch black');                 // no light yet (and the phone's torch is off)
  await ok(page);
  await page.evaluate(() => { S.bought.Batteries = { kind: 'box', n: 1 }; });
  expect(await useOnShelf('Batteries')).toContain('the new torch');
  await ok(page);
  expect(await flag(page, 'torchLit')).toBe(true);
  await page.evaluate(() => { S.screen = 'garage'; render(); });
  await tap(page, 'act:search:the tool chest'); await idle(page);
  expect(await page.evaluate(() => [S.screen, !!UNDER_LIT])).toEqual(['lookunder', true]);   // lit by the torch, not the phone
  expect(await page.locator('.dlg').count()).toBe(0);
  expect(await flag(page, 'phoneTorch')).toBe(false);
  expect(errors).toEqual([]);
});

test('AA batteries from the shop also fix the old torch from the toolbox, and that counts for the nut hunt', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('nut3', 'Find nut 3', null); lead('nut3', 'batteries', 'Batteries for the torch', 'you', 'sure', 'home'); S.inv.torch = true; S.bought = { Batteries: { kind: 'box', n: 1 } }; S.screen = 'stores'; render(); });
  const k = await page.evaluate(() => storeList().findIndex(r => r[0] === 'Batteries'));
  await tap(page, 'act:storelook:' + k);
  expect(await dialogText(page)).toContain('old torch from the toolbox');
  await ok(page);
  expect(await page.evaluate(() => [S.flags.torchLit, leadOpen('batteries'), leadOpen('search')])).toEqual([true, false, true]);
  expect(errors).toEqual([]);
});

// ---------- the wrong sensors, and the soldering game ----------
// The box on the workbench, the old sensor out, the job of finding one that fits
async function benchReady(page) {
  await page.evaluate(() => { S.flags.boxOff = true; S.flags.sensorOut = true; S.inv['old-sensor'] = true; job('new-sensor', 'Find a sensor that fits', null); S.screen = 'bench'; render(); });
}
test('wrong sensors on the bench: each touches the hole and fails its own way, with its long part number', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await benchReady(page);
  await page.evaluate(() => { for (const id of ['part-mega', 'lot-square', 'lot-octagon', 'lot-thin', 'lot-long', 'yard-sensor', 'csd-sensor', 'box-sensor']) S.inv[id] = true; render(); });
  const expectFor = { 'part-mega': 'hexagonal', 'lot-square': 'Square peg', 'lot-octagon': 'Eight sides', 'lot-thin': 'pencil in a mug', 'lot-long': 'sticking up', 'yard-sensor': 'lug teeth', 'csd-sensor': 'too short', 'box-sensor': 'too fat' };
  for (const [id, words] of Object.entries(expectFor)) {
    await page.locator(`.acts button[data-act="pick:${id}"]`).click();
    const no = await page.evaluate(k => SENSORS[k].no, id);
    await expect(page.locator('.partno')).toContainText(no);           // its part number, on a label
    await act(page, 'Push');
    expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('benchTry');   // down to the hole…
    const said = await dialogText(page);
    expect(said).toContain(words);
    expect(said).toContain(no);
    await ok(page);
    expect(await page.evaluate(k => [!!S.inv[k], S.junked.includes(k), !!S.flags.fits], id)).toEqual([false, true, false]);   // …no good: into the parts box
  }
  expect(errors).toEqual([]);
});

test('where the wrong sensors come from: the eBuy job lot, the 1999 Zafira at the Scrap Yard, Car Spares Direct (in two days), the parts box', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('new-sensor', 'Find a sensor that fits', null); lead('new-sensor', 'ebuy-lot', 'eBuy', 'you', 'hopeful', 'app:eBuy'); });
  // eBuy: the job lot
  await page.evaluate(() => { S.screen = 'pc'; S.app = 'eBuy'; render(); });
  await page.locator('[data-act="buy:sensor-lot"]').click(); await ok(page);
  expect(await page.evaluate(() => [leadOpen('ebuy-lot'), S.parcels.some(p => p.item === 'sensor-lot')])).toEqual([false, true]);
  await page.evaluate(() => { S.parcels = []; openParcel('sensor-lot'); });
  expect(await dialogText(page)).toContain('washing machines');
  await ok(page);
  expect(await page.evaluate(() => JOB_LOT.every(id => S.inv[id]))).toBe(true);
  // the Scrap Yard: the 1999 Zafira's sensor
  await page.evaluate(() => { S.screen = 'yard'; render(); });
  await tap(page, 'act:wreck:0');
  await choose(page, 'Take its sensor');
  expect(await page.evaluate(() => !!S.inv['yard-sensor'])).toBe(true);
  // Car Spares Direct: order it, the day after tomorrow
  await page.evaluate(() => { S.mins = 10 * 60; });
  await goPlace(page, 'Car Spares Direct'); await talk(page);
  await choose(page, 'Order it');
  await talk(page);
  expect(await dialogText(page)).toContain('not today');
  await ok(page);
  await page.evaluate(() => { S.day += 2; S.mins = 10 * 60; });
  await talk(page);
  expect(await dialogText(page)).toContain('Says Zafira on the box');
  await ok(page);
  expect(await page.evaluate(() => !!S.inv['csd-sensor'])).toBe(true);
  // the parts box: an old sensor, not yours
  await page.evaluate(() => { S.screen = 'partsbox'; render(); const j = { x: 100, y: 100, a: 0, k: JUNK.findIndex(t => t[1] === 'sensor'), box: 0 }; PILE.push(j); takeBoxSensor(j); });
  expect(await dialogText(page)).toContain('Not yours');
  expect(await page.evaluate(() => !!S.inv['box-sensor'])).toBe(true);
  expect(errors).toEqual([]);
});

test('the job lot sensor with the cut wires fits; solder the old plug on: find the colours, join them in order, the iron, the solder; then it fits for real', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await benchReady(page);
  await page.evaluate(() => { S.inv['lot-cut'] = true; render(); });
  await page.locator('.acts button[data-act="pick:lot-cut"]').click();
  await act(page, 'Push');
  expect(await dialogText(page)).toContain('No plug');
  await ok(page);
  expect(await page.evaluate(() => S.flags.fits)).toBeFalsy();
  // to the soldering: the colours don't match; can't carry on
  await act(page, 'Solder the old plug on');
  expect(await page.evaluate(() => S.screen)).toBe('solder');
  expect(await dialogText(page)).toContain('Which goes where');
  await ok(page);
  await expect(page.locator('.hs[data-go="act:wirepick:0"]')).toHaveCount(0);   // locked until you know
  // TechDocs: the wire colours
  await page.evaluate(() => { S.screen = 'pc'; S.app = 'TechDocs'; render(); });
  await page.locator('button', { hasText: 'Note the wire colours' }).click(); await ok(page);
  expect(await page.evaluate(() => [S.flags.wireColours, leadOpen('wire-colours')])).toEqual([true, false]);
  // back to it: join them wrong first
  await page.evaluate(() => { S.screen = 'solder'; render(); });
  const join = async (k, j) => { await tap(page, 'act:wirepick:' + k); await tap(page, 'act:wirejoin:' + j); };
  await join(0, 0); await join(1, 1); await join(2, 2);                 // blue to yellow, white to green: crossed
  await act(page, 'Solder the joints');
  expect(await dialogText(page)).toContain('crossed');
  await ok(page);
  expect(await page.evaluate(() => solderState().pairs)).toEqual([0, null, null]);   // the crossed ones come apart
  await join(1, 2); await join(2, 1);                                    // blue to green, white to yellow
  // no iron yet
  await act(page, 'Solder the joints');
  expect(await dialogText(page)).toContain('no soldering iron');
  await ok(page);
  await page.evaluate(() => { S.inv.iron = true; render(); });
  await act(page, 'Solder the joints');                                  // the old reel: one joint, then it runs out
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('solder');
  expect(await dialogText(page)).toContain('runs out');
  await ok(page);
  expect(await page.evaluate(() => solderState().joints)).toBe(1);
  await page.evaluate(() => { S.inv.solder = true; render(); });
  await act(page, 'Solder the joints');
  expect(await dialogText(page)).toContain('Three shiny joints');
  await ok(page);
  expect(await page.evaluate(() => [solderState().joints, S.flags.soldered])).toEqual([3, true]);
  // on the bench: lined up, it fits for real
  await page.evaluate(() => { S.screen = 'bench'; render(); });
  await page.locator('.acts button[data-act="pick:lot-cut"]').click();
  await act(page, 'Rotate'); await ok(page);
  await act(page, 'Push');
  expect(await dialogText(page)).toContain('It fits');
  await ok(page);
  expect(await page.evaluate(() => [S.flags.fits, S.flags.fittedPart, findJob('new-sensor').status])).toEqual([true, 'lot-cut', 'done']);
  expect(errors).toEqual([]);
});

test('the soldering iron is at the Tool Shop and the solder at the Hardware Shop', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  expect(await page.evaluate(() => [PLACE_INFO['Tool Shop'].shop.includes('iron'), PLACE_INFO['Hardware Shop'].shop.includes('solder')])).toEqual([true, true]);
  await page.evaluate(() => { S.mins = 10 * 60; });
  await goPlace(page, 'Tool Shop'); await talk(page);
  await choose(page, 'Soldering iron');
  expect(await page.evaluate(() => !!S.inv.iron)).toBe(true);
  expect(errors).toEqual([]);
});

// ---------- the kick: the still flashes up after it, like a comic-book cut ----------
test('after the kick, the still of it flashes up (zooming and turning), mirrored for the right headlight; then he swears', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { anger(100); render(); });
  await page.waitForFunction(() => ANIM && ANIM.kind === 'still');   // the kick plays, then the still
  const still = page.locator('.still img');
  await expect(still).toHaveAttribute('src', 'stills/kick.svg');
  await expect(page.locator('.still.mirror')).toHaveCount(0);             // the left headlight: as drawn
  expect(await still.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);   // the picture loaded
  expect(await page.locator('.dlg').count()).toBe(0);                     // he swears after it, not over it
  expect(await dialogText(page)).toContain('$%$£$%^%^');
  await expect(page.locator('.still')).toHaveCount(0);                    // gone by then
  await ok(page);
  await page.evaluate(() => { anger(100); render(); });                  // the next kick: the right headlight, mirrored
  await page.waitForFunction(() => ANIM && ANIM.kind === 'still');
  await expect(page.locator('.still.mirror')).toHaveCount(1);
  await ok(page);
  expect(errors).toEqual([]);
});

// ---------- the other stills: each big moment flashes up its own ----------
test('big moments flash up their stills: a cup of tea, the screw snapping; then what is said', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await goRoom(page);
  await tap(page, 'act:tea');
  await page.waitForFunction(() => ANIM && ANIM.kind === 'still');
  await expect(page.locator('.still img')).toHaveAttribute('src', 'stills/tea.svg');
  expect(await page.locator('.still img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(await dialogText(page)).toContain('tea');                        // what's said comes after it
  await expect(page.locator('.still')).toHaveCount(0);
  await ok(page);
  // the last screw on the bench: SNAP
  await page.evaluate(() => { S.flags.boxOff = true; S.flags.screws = [1, 2, 4]; job('sensor-out', 'Get the old sensor off', null); S.screen = 'bench'; render(); });
  await act(page, 'Undo screw 3');
  await page.waitForFunction(() => ANIM && ANIM.kind === 'still');
  await expect(page.locator('.still img')).toHaveAttribute('src', 'stills/snap.svg');
  expect(await dialogText(page)).toContain('SNAP');
  expect(errors).toEqual([]);
});

test('every still on its own: each picture file loads', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  for (const name of ['kick', 'pubfloor', 'sick', 'asleep', 'breath', 'breathpass', 'splash', 'tea', 'snap', 'click', 'abs']) {
    await page.evaluate(n => { flashStill(n); render(); }, name);
    const img = page.locator('.still img');
    await expect(img).toHaveAttribute('src', `stills/${name}.svg`);
    await expect.poll(() => img.evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
    await idle(page);
  }
  expect(errors).toEqual([]);
});

// ---------- the parts boxes: what's no good ends up in them ----------
test('what turns out to be no good goes in the parts boxes, on top of the heap: rummage and find it again', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'partsbox'; render(); junkIt('lamp-left'); junkIt('lot-square'); junkIt('reader-cheap'); render(); });
  const found = await page.evaluate(() => PILE.filter(j => j.junk).map(j => j.junk));
  expect(found).toEqual(['lamp-left', 'lot-square', 'reader-cheap']);
  await page.evaluate(() => { PILE_DAY = -1; render(); });              // a new heap tomorrow: they're still in there
  expect(await page.evaluate(() => PILE.filter(j => j.junk).length)).toBe(3);
  // tap one: what it is
  const spotAt = await page.evaluate(() => { const j = PILE.find(t => t.junk === 'lot-square'); return [j.x, j.y]; });
  const box = await page.locator('#stage canvas').boundingBox();
  await page.mouse.click(box.x + spotAt[0] / 480 * box.width, box.y + spotAt[1] / 270 * box.height);
  expect(await dialogText(page)).toContain('square sensor');
  expect(errors).toEqual([]);
});

test('a smashed headlight, once replaced, goes in the parts box', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('broke-headlight', 'Replace the left headlight', null); spareLamps().left = 1; act('fitlight'); });
  expect(await dialogText(page)).toContain('parts box');
  expect(await page.evaluate(() => S.junked)).toEqual(['lamp-left']);
  expect(errors).toEqual([]);
});

// ---------- the title screen ----------
test('the title screen: the logo on three lines, our hero with his spanner, panels of the game behind; tap to go in, then How to play', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { window.NO_PUNCTURES = true; });
  await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await expect(page.locator('#title')).toBeVisible();
  await expect(page.locator('.tlogo')).toContainText('BLAND');
  await expect(page.locator('.tlogo')).toContainText('QUEST');
  await expect(page.locator('.tlogo')).toContainText('AUTO-matic Transmission');
  await expect(page.locator('.tpanel img')).toHaveCount(7);
  for (const img of await page.locator('.tpanel img, .thero').all()) expect(await img.evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);   // every picture loads
  await expect(page.locator('#help')).not.toHaveClass(/open/);            // How to play waits for the title
  await page.locator('.tcard').click({ position: { x: 30, y: 30 } });     // tap anywhere on it
  await expect(page.locator('#title')).toBeHidden();
  await expect(page.locator('#help')).toHaveClass(/open/);                // then How to play, the first time
  expect(errors).toEqual([]);
});

// ---------- your brother comes round ----------
test('ring your brother and he comes round the next day: your hammer back, advice, and his "help" (a battery lead off, codes cleared, the jack borrowed); then he goes', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('hammer', 'Find a hammer', null); });
  await page.click('.go[data-go="phone"]'); await idle(page);
  await page.locator('[data-act="ring:Brother"]').click();
  expect(await dialogText(page)).toContain('come round tomorrow');
  await ok(page);
  expect(await page.evaluate(() => S.flags.brotherDay)).toBe(await page.evaluate(() => S.day + 1));
  await page.evaluate(() => { S.screen = 'garage'; render(); });           // not today: he isn't there
  expect(await page.evaluate(() => brotherHere())).toBe(false);
  await page.evaluate(() => { S.day += 1; S.mins = 10 * 60; S.screen = 'home'; render(); });
  await tap(page, 'garage'); await idle(page);                               // tomorrow: there he is
  expect(await dialogText(page)).toContain('give you a hand');
  await ok(page);
  expect(await page.evaluate(() => brotherHere())).toBe(true);
  await tap(page, 'act:brother');                                            // the hammer, back after four years
  expect(await dialogText(page)).toContain('your hammer');
  await ok(page);
  expect(await page.evaluate(() => [S.inv.hammer, findJob('hammer').status])).toEqual([true, 'done']);
  await tap(page, 'act:brother');
  expect(await dialogText(page)).toContain('timing belt');
  await ok(page);
  await act(page, 'Let Paul help');                                  // the battery lead off
  expect(await dialogText(page)).toContain('resets the computer');
  await ok(page);
  expect(await page.evaluate(() => carPowered())).toBe(false);
  await act(page, 'Let Paul help');                                  // the codes cleared; the light comes back
  expect(await dialogText(page)).toContain('Huh');
  await ok(page);
  await act(page, 'Let Paul help');                                  // the jack, and off he goes
  expect(await dialogText(page)).toContain('Back Tuesday');
  await ok(page);
  expect(await page.evaluate(() => [brotherHere(), S.flags.jackLent])).toEqual([false, true]);
  await expect(page.locator('.acts button', { hasText: 'Let Paul help' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

// ---------- the multimeter out on the fuse box; the splash still mid-walk ----------
test('get the multimeter out on the fuse box: tap a fuse and the probes go on it; 0.0 and a beep if good, OL if blown; all of them and that is the lot', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('meaning', 'What does P0705 mean?', null); lead('meaning', 'fuses', 'Check your fuses first', 'MrTorque', 'tbh', 'fuseZoom'); S.flags.knowF23 = S.flags.f23Checked = S.flags.meterOK = true; S.screen = 'fuseZoom'; render(); });
  await act(page, 'Get the multimeter out');
  expect(await page.evaluate(() => meterOut())).toBe(true);
  await tap(page, 'act:testfuse:5');
  expect(await page.evaluate(() => [S.meterFuse, meterReading(5), S.fusesChecked])).toEqual([5, '0.0', [5]]);
  await tap(page, 'act:testfuse:17');
  expect(await dialogText(page)).toContain('OL');
  await ok(page);
  for (let n = 1; n <= 30; n++) if (![5, 17, 27, 28].includes(n)) await page.evaluate(k => { act('testfuse:' + k); DIALOG = null; }, n);
  expect(await page.evaluate(() => [S.flags.fusesTested, leadOpen('fuses')])).toEqual([true, false]);
  await act(page, 'Put the multimeter away');
  expect(await page.evaluate(() => meterOut())).toBe(false);
  expect(errors).toEqual([]);
});

test('the walk home: the SPLOOSH still flashes up as the water hits him, then the rest of the walk, then home', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.road = { spare: true, walked: false }; S.flags.phoneDead = true; job('tyre', 'Sort out the flat tyre', null); S.screen = 'roadside'; render(); });
  await act(page, 'Walk home');
  await page.waitForFunction(() => ANIM && ANIM.kind === 'still');      // part way along: the still
  expect(await page.evaluate(() => [S.screen, WALK_PART[1] === WALK_SPLASH])).toEqual(['walkhome', true]);
  await page.waitForFunction(() => ANIM && ANIM.kind === 'walkhome');   // then the rest of the walk
  expect(await page.evaluate(() => WALK_PART[0] === WALK_SPLASH && WALK_PART[1] === 1)).toBe(true);
  expect(await dialogText(page)).toContain('SOAKED');                   // then home
  expect(await page.evaluate(() => S.screen)).toBe('room');
  expect(errors).toEqual([]);
});

// ---------- the fine: letters, the clamp, a taxi, paying at the Post Office ----------
test('the fine comes in the post; unpaid, a reminder (£450), then the car is clamped with a note; a taxi to the Post Office; pay; home, and a man takes the clamp off', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { fineIssued(); S.screen = 'home'; render(); });
  // the next morning: the letter in the mailbox
  await page.evaluate(() => { S.day += 1; S.mins = 7 * 60; pass(70); render(); });
  await expect(page.locator('.hs[data-go="act:letters"]')).toHaveCount(1);
  await tap(page, 'act:letters');
  await expect(page.locator('.letter')).toContainText('FIXED PENALTY');
  await expect(page.locator('.letter')).toContainText('£300');
  await act(page, 'Put them down');
  expect(await page.evaluate(() => fineOwed())).toBe(300);
  // day 4: the reminder, and it's £450
  await page.evaluate(() => { S.day += 3; S.mins = 7 * 60; pass(70); render(); });
  expect(await page.evaluate(() => [fineOwed(), S.letters.map(l => l.id).includes('finelate')])).toEqual([450, true]);
  // a week: clamped; the car won't go; the note on the windscreen
  await page.evaluate(() => { S.day += 3; S.mins = 7 * 60; pass(70); S.screen = 'home'; render(); });
  expect(await page.evaluate(() => [carClamped(), fineOwed()])).toEqual([true, 550]);
  await tap(page, 'act:clampnote');
  expect(await dialogText(page)).toContain('IMMOBILISED');
  await ok(page);
  await page.evaluate(() => { goTo('city'); });
  expect(await dialogText(page)).toContain("It's clamped");
  await ok(page);
  // a taxi into town (£15), and the Post Office: window 3, no queue
  const money = await page.evaluate(() => { S.money = 1000; return S.money; });
  await page.click('.go[data-go="phone"]'); await idle(page);
  await page.locator('[data-act="taxi"]').click();
  expect(await dialogText(page)).toContain('taxi');
  await ok(page);
  expect(await page.evaluate(() => [S.screen, S.flags.taxi, S.money])).toEqual(['city', true, money - 15]);
  await page.evaluate(() => { S.mins = 11 * 60; });
  await goPlace(page, 'Post Office'); await talk(page);
  expect(await dialogText(page)).toContain('Window 3');
  await choose(page, 'Pay £550');
  expect(await page.evaluate(() => [S.fine.paid, findJob('fine').status, S.fine.unclamp])).toEqual([true, 'done', true]);
  // home in the taxi (£15): a man's taking the clamp off
  await page.evaluate(() => { goTo('home'); });
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('unclamp');
  expect(await page.evaluate(() => typeof towTruck === 'function' && TOW_AT[1] > 140)).toBe(true);   // his tow truck, out in the road
  expect(await dialogText(page)).toContain('taking the clamp off');
  await ok(page);
  expect(await page.evaluate(() => [carClamped(), S.flags.taxi, S.fine.unclamp, S.money])).toEqual([false, false, false, money - 15 - 550 - 15]);
  expect(errors).toEqual([]);
});

test('the police station is on the map, and no help at all', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 11 * 60; });
  await goPlace(page, 'Police Station'); await talk(page);
  expect(await dialogText(page)).toContain('Fill in a form');
  await ok(page);
  await page.evaluate(() => { fineIssued(); });
  await talk(page);
  expect(await dialogText(page)).toContain('Post Office');
  expect(errors).toEqual([]);
});

test('the usual post: junk and a reminder that the MOT has run out', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.day = 2; S.mins = 7 * 60; pass(70); S.day = 3; S.mins = 7 * 60; pass(70); });
  expect(await page.evaluate(() => S.letters.map(l => l.id).sort())).toEqual(['junk', 'mot']);
  expect(errors).toEqual([]);
});

// ---------- card declined: the bank ----------
test('now and then the card is blocked as you pay: declined everywhere until the bank (Mon to Wed, 10 till 2) asks three security questions and unblocks it', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.day = 7; S.mins = 11 * 60; CARD_BLOCK_CHANCE = 1; });   // a Monday; the next payment gets blocked
  const money = await page.evaluate(() => S.money);
  expect(await page.evaluate(() => spend(5))).toBe(false);                 // declined
  expect(await page.evaluate(() => [S.money, S.flags.cardBlocked, !!findJob('card'), S.msgs[0].from])).toEqual([money, true, true, 'Your Bank']);
  expect(await page.evaluate(() => spend(1))).toBe(false);                 // and again, until it's sorted
  // the bank: three questions, all wrong; unblocked anyway
  await goPlace(page, 'Bank'); await talk(page);
  expect(await dialogText(page)).toContain('unusual activity');
  for (let k = 0; k < 3; k++) await page.locator('.dlg button').first().click();
  expect(await dialogText(page)).toContain("I've unblocked it");
  await ok(page);
  expect(await page.evaluate(() => [S.flags.cardBlocked, findJob('card').status, spend(1)])).toEqual([false, 'done', true]);   // and only once a game
  expect(errors).toEqual([]);
});

test('the bank is open Monday to Wednesday, 10 till 2', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  expect(await page.evaluate(() => { S.day = 7; S.mins = 11 * 60; return closedReason('Bank'); })).toBe(null);   // Monday, 11am: open
  expect(await page.evaluate(() => { S.mins = 15 * 60; return closedReason('Bank'); })).toContain('Shut at 14:00');
  expect(await page.evaluate(() => { S.day = 10; S.mins = 11 * 60; return closedReason('Bank'); })).toContain('Closed on THUs');
  expect(errors).toEqual([]);
});

// ---------- looks: the clamp, the bank's glass, the wife on the sofa, the estate ----------
// How many pixels on the picture are exactly this colour
const countColour = (page, rgb) => page.evaluate(([r, g, b]) => {
  const d = ctx.getImageData(0, 0, W, H).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] === r && d[i + 1] === g && d[i + 2] === b) n++;
  return n;
}, rgb);

test('the clamp sits on the front wheel: a yellow plate, an arm over the tyre and a locked bar', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const yellow = [248, 208, 56];                                           // C.warm
  await page.evaluate(() => { S.fine = null; show('home'); });
  const before = await countColour(page, yellow);
  await page.evaluate(() => { S.fine = { day: 1, clamped: true, paid: false }; show('home'); });
  expect(await countColour(page, yellow)).toBeGreaterThan(before + 10);   // the clamp's there
  expect(await page.evaluate(() => CLAMP_WHEEL)).toEqual([126, 72 + 0.8 * 46, 4]);   // on the car's front wheel
  expect(errors).toEqual([]);
});

test("the bank's glass screen is see-through: no solid pane over the counter", async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.day = 7; S.mins = 11 * 60; S.place = 'Bank'; show('place'); });
  expect(await countColour(page, [184, 216, 240])).toBe(0);               // the old solid glass colour, gone
  expect(errors).toEqual([]);
});

test('the wife sits on the sofa with her legs crossed, turned side-on, her face half to us; the car is an estate; the scrap yard has parts for later', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  // every look draws sitting without trouble
  expect(await page.evaluate(() => { for (const look of Object.keys(WIFE_LOOKS)) { [ISO.ox, ISO.oy] = VIEW.room; wife(11, 32, look, { sit: true }); } return true; })).toBe(true);
  // the estate's back: taller, gently sloped
  expect(await page.evaluate(() => [CAR_SHAPES.zafira.tz, CAR_SHAPES.zafira.hy, CAR_SHAPES.zafira.ry0])).toEqual([17, 2, 6]);
  // the scrap yard: any of these cars might do for parts one day
  await page.evaluate(() => TALK['Scrap Yard']());
  expect(await dialogText(page)).toContain('good for parts one day');
  expect(errors).toEqual([]);
});

// ---------- the BOOZE meter, stuck at the car door, pulled over, the dice, the headlight off the shelf, the wife asleep, spiders ----------
test('the BOOZE meter: each drink fills it, it wears off an hour a drink, and sleep clears it; under ANGER on the strip', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 18 * 60; boozeAdd(2); render(); });
  expect(await page.evaluate(() => [boozeNow(), boozePercent(), boozeDrinks()])).toEqual([2, 50, 2]);
  await expect(page.locator('.anger.booze')).toHaveCount(1);              // the bar, under ANGER
  await page.evaluate(() => pass(90));                                      // an hour and a half later
  expect(await page.evaluate(() => [boozeNow(), boozeDrinks()])).toEqual([0.5, 1]);
  await page.evaluate(() => pass(30));                                      // and it's gone
  expect(await page.evaluate(() => boozeNow())).toBe(0);
  await page.evaluate(() => { boozeAdd(3); sleepUntilMorning(); });         // or sleep it off
  expect(await page.evaluate(() => [boozeNow(), S.booze])).toEqual([0, null]);
  expect(errors).toEqual([]);
});

test("drunk at the car door: give up (or miss 8 times) and you're stuck till it wears off; sit on the wall, then you can drive", async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 18 * 60; S.flags.pubCall = S.day; });
  await goPlace(page, 'The Hesketh Tavern');
  await tap(page, 'act:enter'); await idle(page);
  await lagers(page, 2);
  await ok(page);
  await tap(page, 'act:leave'); await idle(page);
  await tap(page, 'city');
  await page.locator('.dlg button', { hasText: 'Drive anyway' }).click(); await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('keyhole');
  await act(page, 'Give up');
  expect(await dialogText(page)).toContain("stuck here till it wears off");
  await page.locator('.dlg button', { hasText: 'Sit on the wall' }).click();
  expect(await dialogText(page)).toContain('fit to drive');
  await ok(page);
  expect(await page.evaluate(() => [S.screen, boozeNow()])).toEqual(['place', 0]);
  await tap(page, 'city'); await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('city');                 // sober: straight in and off
  // eight misses and you give up anyway
  await page.evaluate(() => { boozeAdd(2); KEY.scratches = []; for (let k = 0; k < 7; k++) KEY.scratches.push([0, 0]); KEY.pos = [10, 10]; S.screen = 'keyhole'; keyTry(); });
  expect(await dialogText(page)).toContain('8 new scratches');
  expect(errors).toEqual([]);
});

test('driving off after a drink: the police car comes up behind with its blue lights and pulls you over, then the knock on the window', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 21 * 60; boozeAdd(2); pullOver(); });
  expect(await page.evaluate(() => [S.screen, ANIM && ANIM.kind])).toEqual(['pullover', 'pullover']);
  expect(await dialogText(page)).toContain('Blue lights');
  expect(errors).toEqual([]);
});

test('fluffy dice: hang them in the car from the garage shelf; take them down in the car and they go back on the shelf', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.bought = { 'Fluffy dice': { kind: 'box', n: 1 } }; show('stores'); });
  expect(await page.evaluate(() => storeList().map(i => i[0]))).toContain('Fluffy dice');
  await page.evaluate(() => { const k = storeList().findIndex(i => i[0] === 'Fluffy dice'); ACTIONS.storelook(k); });
  await page.locator('.dlg button', { hasText: 'Hang them in the car' }).click();
  await ok(page);
  expect(await page.evaluate(() => [diceUp(), storeList().some(i => i[0] === 'Fluffy dice')])).toEqual([true, false]);   // off the shelf, on the mirror
  await page.evaluate(() => show('dash'));
  await tap(page, 'act:dicedown');
  expect(await dialogText(page)).toContain('back on the garage shelf');
  expect(await page.evaluate(() => [diceUp(), storeList().some(i => i[0] === 'Fluffy dice')])).toEqual([false, true]);
  expect(errors).toEqual([]);
});

test('a spare headlight on the garage shelf: tap it to fit it (the smashed one goes in the parts box); the garage offers it too', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('broke-headlight', 'Replace the smashed left headlight', null); addLamp('left'); show('garage'); });
  await expect(page.locator('.acts button', { hasText: 'Fit the new headlight' })).toHaveCount(1);
  await page.evaluate(() => { show('stores'); const k = storeList().findIndex(i => i[0].startsWith('Headlight (Zafira, left')); ACTIONS.storelook(k); });
  await page.locator('.dlg button', { hasText: 'Fit it to the car' }).click();
  expect(await dialogText(page)).toContain('parts box');
  expect(await page.evaluate(() => [brokeOpen('headlight'), spareLamps().left])).toEqual([false, 0]);
  expect(errors).toEqual([]);
});

test('going to bed when she is already asleep: she stays in bed through the night', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 23 * 60 + 30; show('room'); ACTIONS.bed(); });
  expect(await page.evaluate(() => [S.flags.bedAsleep, ANIM && ANIM.kind])).toEqual([true, 'night']);
  expect(errors).toEqual([]);
});

test('the first look under anything with a light: there is always a spider', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.flags.phoneTorch = true; S.flags.screwsSpilt = true; ACTIONS.search('the shelves'); });
  expect(await page.evaluate(() => !!UNDER_SPIDER)).toBe(true);
  expect(errors).toEqual([]);
});

test('soaked by the puddle: he sighs, his shoulders drop, and he trudges on head down at half his pace; the rain gets heavier from the puncture to the walk', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  expect(await page.evaluate(() => { man(100, 200, 'trudge', 4, 1); return true; })).toBe(true);
  // the rain: spitting at the puncture, steady with the flat spare, heavy once the phone dies, a downpour on the walk
  const levels = await page.evaluate(() => {
    const out = [];
    S.road = { spare: false, walked: false }; out.push(rainLevel('roadside'));
    S.road.spare = true; out.push(rainLevel('roadside'));
    S.flags.phoneDead = true; out.push(rainLevel('roadside'));
    out.push(rainLevel('walkhome'));
    S.road.walked = true; out.push(rainLevel('roadside'));
    return out;
  });
  expect(levels).toEqual([1, 2, 3, 4, 0]);
  // half pace: the trudge covers the rest of the pavement in about twice the time the plain walk would
  const ratio = await page.evaluate(() => {
    const rest = WALK.to - lerp(WALK.from, WALK.to, WALK_HIT);                   // what's left of the pavement (from where the splash got him)
    const plainSpeed = (WALK.to - WALK.from) / WALK_MS;                          // his normal pace
    const trudgeSpeed = rest / (WALK_AFTER_MS * (1 - WALK_SINK));               // after the sigh and the sinking
    return trudgeSpeed / plainSpeed;
  });
  expect(ratio).toBeGreaterThan(0.4);
  expect(ratio).toBeLessThan(0.6);
  expect(errors).toEqual([]);
});

test('the code reader unplugs from the port; the glove box torch goes on the garage shelf; the fine is held up clear of the dialog', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  // the code reader: plugged in, then out
  await page.evaluate(() => { S.flags.readerIn = true; S.flags.hatch = true; show('dash'); });
  await act(page, 'Unplug the code reader');
  expect(await dialogText(page)).toContain('back on the garage shelf');
  expect(await page.evaluate(() => S.flags.readerIn)).toBe(false);
  await ok(page);
  // the glove box torch, onto the shelf
  await page.evaluate(() => show('glovebox'));
  await tap(page, 'act:glove:2');
  await page.locator('.dlg button', { hasText: 'Put it on the garage shelf' }).click();
  await ok(page);
  expect(await page.evaluate(() => [S.flags.gloveTorch, storeList().some(i => i[0] === GLOVE_TORCH)])).toEqual([true, true]);
  // the fine: top right, above where the dialog sits
  expect(await page.evaluate(() => BREATH_TICKET[1] < 60)).toBe(true);
  // the pub: people drawn big enough for the bar; the street scenes are iso; a police car draws its light bar
  expect(await page.evaluate(() => PUB.size >= 5)).toBe(true);
  expect(await page.evaluate(() => { [ISO.ox, ISO.oy] = ROAD_STREET_VIEW; isoCar(0, 76, 1, C.white, { alongX: true, shape: 'saloon', police: true, flash: true }); return !!POLICE_BAR; })).toBe(true);
  expect(errors).toEqual([]);
});

// ---------- dead ends, fixed ----------
test('dead ends: the gearbox shows its bolts once you know what P0705 is (Old Ron knows, Dodgy Dave does not); clamped with a blocked card, the wife pays the taxi; whatever you cannot afford, she pays (and texts); no clamp while the car is stuck on Mill Lane; no jack once Paul has it', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  // the codes, but you don't know what P0705 is: the gearbox is just bolts; Old Ron at the pub knows, and then it's the sensor
  await page.evaluate(() => { S.flags.codes = true; job('meaning', 'What does P0705 mean?', 'light'); show('underZoom'); });
  expect(await page.evaluate(() => S.flags.sensorJob)).toBeFalsy();
  await expect(page.locator('.acts button', { hasText: 'Undo bolt 1' })).toHaveCount(0);
  await page.evaluate(() => { S.mins = 19 * 60; S.place = 'The Hesketh Tavern'; S.inside = true; ACTIONS.punter(1); });
  expect(await dialogText(page)).not.toContain('selector sensor');            // Dodgy Dave doesn't know
  await ok(page);
  await page.evaluate(() => ACTIONS.punter(0));
  expect(await dialogText(page)).toContain('selector sensor');                // Old Ron does
  await ok(page);
  await page.evaluate(() => { S.inside = false; show('underZoom'); });
  expect(await page.evaluate(() => S.flags.sensorJob)).toBe(true);
  await expect(page.locator('.acts button', { hasText: 'Undo bolt 1' })).toHaveCount(1);
  // clamped, card blocked: the taxi still comes (the wife pays)
  await page.evaluate(() => { S.fine = { day: S.day - 8, paid: false, clamped: true }; S.flags.cardBlocked = true; ringTaxi(); });
  expect(await dialogText(page)).toContain('the wife pays');
  expect(await page.evaluate(() => [S.flags.taxi, S.flags.wifePaid])).toEqual([true, 1]);
  await ok(page);
  // at the Post Office with not enough money: she pays the fine, and texts you about it
  await page.evaluate(() => { S.flags.cardBlocked = false; S.money = 5; S.place = 'Post Office'; payFineAtPost(); });
  await page.locator('.dlg button').first().click();
  expect(await dialogText(page)).toContain('That\'s paid');
  expect(await page.evaluate(() => [S.fine.paid, S.fine.unclamp, S.money, S.msgs[0].from, S.flags.wifeOwed > 0])).toEqual([true, true, 5, 'The wife', true]);
  await ok(page);
  // a week unpaid while the car's on a flat on Mill Lane: no clamp yet
  await page.evaluate(() => { S.fine = { day: S.day - 8, paid: false, clamped: false }; S.road = { spare: true, walked: true }; postArrives(); });
  expect(await page.evaluate(() => S.fine.clamped)).toBe(false);
  // Paul's got the jack: an empty tray in the boot; fitting a wheel, a neighbour lends you his
  await page.evaluate(() => { S.flags.jackLent = true; S.inv.wheel = 'Scrap Yard'; ACTIONS.fitwheel(); });
  expect(await dialogText(page)).toContain('Paul\'s still got it');
  expect(errors).toEqual([]);
});

test('the German Zafira manual: open at its diagram once you have the codes, and you work out P0705 is the selector sensor', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const german = await page.evaluate(() => BOOKS.findIndex(b => b[0].includes('Deutsch')));
  await page.evaluate(k => { S.book = k; S.bookPage = 0; ACTIONS.bookpage(1); ACTIONS.bookpage(1); }, german);   // no codes yet: just German
  expect(await page.evaluate(() => leadExists('sensor'))).toBe(false);
  await page.evaluate(k => { S.flags.codes = true; job('meaning', 'What does P0705 mean?', 'light'); S.book = k; S.bookPage = 1; ACTIONS.bookpage(1); }, german);
  expect(await dialogText(page)).toContain('Selector lever sensor');
  expect(await page.evaluate(() => leadExists('sensor'))).toBe(true);
  expect(errors).toEqual([]);
});

// ---------- phone calls, and Mum & Dad's ----------
test('people ring: answer and they talk; leave it and it is a missed call then a text; the calls come at their times', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { NO_CALLS = false; CALL_TIMES.ring = 1500; CALL_TIMES.text = 300; });
  // Mum & Dad ring on day 2 at 6pm: answer it
  await page.evaluate(() => { S.screen = 'home'; S.day = 2; S.mins = 17 * 60 + 50; pass(15); render(); });
  await page.waitForFunction(() => CALL && CALL.who === 'Mum & Dad');
  await page.click('.go[data-go="phone"]');
  expect(await dialogText(page)).toContain('I DO KNOW CARS');
  await ok(page);
  // the wrong number: leave it ringing: a missed call, then the text
  await page.evaluate(() => { pass(160); render(); });
  await page.waitForFunction(() => CALL && CALL.who === 'Unknown number');
  await page.waitForFunction(() => !CALL && S.msgs.some(m => m.body.includes('large doner')));
  expect(await page.evaluate(() => S.msgs.some(m => m.from === 'Unknown number' && m.body === 'Missed call'))).toBe(true);
  // Paul rings about the jack the day after he borrowed it
  expect(await page.evaluate(() => { S.flags.jackLentDay = S.day; return EVENTS.find(e => e.id === 'call-jack').when(); })).toBe(false);
  expect(await page.evaluate(() => { S.day += 1; S.mins = 10 * 60; return EVENTS.find(e => e.id === 'call-jack').when(); })).toBe(true);
  expect(errors).toEqual([]);
});

test("Mum & Dad's: come over any time; your car on their drive with the bonnet up; Mum at the door, Dad's theories all wrong", async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await goPlace(page, "Mum & Dad's");
  expect(await page.evaluate(() => [S.screen, S.inside, S.spot.place])).toEqual(['place', true, [152, 62]]);
  await tap(page, 'act:dad');
  expect(await dialogText(page)).toContain('tyres');
  await ok(page);
  await tap(page, 'act:dad');
  expect(await dialogText(page)).toContain('windows');
  await ok(page);
  await tap(page, 'act:talk');
  expect(await dialogText(page)).toContain('Have you eaten');
  expect(errors).toEqual([]);
});

test("drunk and locked out at the pub: a taxi home; the car stays at the pub; the next day the bus into town to fetch it", async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 21 * 60; S.place = 'The Hesketh Tavern'; S.inside = false; S.screen = 'place'; boozeAdd(3); render(); });
  await tap(page, 'city');                                                    // your car, with a drink in you: a taxi, or drive anyway
  await page.locator('.dlg button', { hasText: 'Ring for a taxi home' }).click();
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('taxipub');        // it pulls up, you get in, it drives off, black…
  expect(await dialogText(page)).toContain('fetch it');                       // …then home
  expect(await page.evaluate(() => [S.screen, S.flags.carAt, carAway()])).toEqual(['home', 'The Hesketh Tavern', true]);
  await ok(page);
  // no car on the drive or in the garage
  expect(await page.evaluate(() => { const r = []; goTo('dash'); r.push(DIALOG && DIALOG.body); DIALOG = null; return r[0]; })).toContain('still outside');
  // the next morning: the bus into town, and there's the car
  await page.evaluate(() => { sleepUntilMorning(); S.screen = 'home'; render(); });
  await tap(page, 'city');
  expect(await dialogText(page)).toContain('The bus into town');
  expect(await page.evaluate(() => [S.screen, S.place, S.flags.carAt, carAway()])).toEqual(['city', 'The Hesketh Tavern', undefined, false]);
  expect(errors).toEqual([]);
});

test('the breath test shows a box on BLOW where you press', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 21 * 60; boozeAdd(2); breathStart(); });
  await expect(page.locator('.hs[data-go="act:blowhere"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("two snapped fixings need the stud extractor: bolt 2 under the car, and the screw's stub on the bench (the box won't go back on with the stub in)", async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.flags.boxOff = true; S.flags.screws = [1, 2, 3]; job('sensor-out', 'Get the old sensor off', null); S.screen = 'bench'; render(); });
  await act(page, 'Undo screw 4'); await ok(page);                          // the back one: it shears
  expect(await page.evaluate(() => [S.flags.sheared, !!findJob('stub')])).toEqual([4, true]);
  await page.evaluate(() => { S.flags.sensorOut = true; S.flags.fits = true; S.flags.n3found = true; ACTIONS.fit(); });
  expect(await dialogText(page)).toContain('stub still in the box');      // not with the stub in
  await ok(page);
  await page.evaluate(() => { S.inv['extractor-cheap'] = true; render(); });
  await act(page, 'Use the extractor on the snapped screw');
  expect(await dialogText(page)).toContain('snaps');                       // the cheap one snaps, as on bolt 2
  await ok(page);
  await page.evaluate(() => { S.inv['extractor-good'] = true; render(); });
  await act(page, 'Use the extractor on the snapped screw');
  expect(await dialogText(page)).toContain('winds out');
  await ok(page);
  expect(await page.evaluate(() => [S.flags.stubOut, findJob('stub').status])).toEqual([true, 'done']);
  expect(errors).toEqual([]);
});

test('the splash: as the car hits the puddle he is level with it, and stops dead in it', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const [at, puddle] = await page.evaluate(() => [lerp(WALK.from, WALK.to, WALK_HIT), WALK.puddle[0]]);
  expect(Math.abs(at - puddle)).toBeLessThan(6);                             // right beside it
  expect(errors).toEqual([]);
});

test('the screw jar: once the stub is out you need a third screw; the jar on the garage shelf spills everywhere; sweep it up with the dustpan; try screws from the tray till one fits', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  // before you need one: just a jar of screws
  await page.evaluate(() => { show('stores'); ACTIONS.storelook(storeList().findIndex(i => i[0] === SCREW_JAR)); });
  expect(await dialogText(page)).toContain('None of them match');
  await ok(page);
  // the stub's out: the box won't go back on with two screws
  await page.evaluate(() => { Object.assign(S.flags, { boxOff: true, sensorOut: true, sheared: 3, stubOut: true, fits: true, n3found: true }); screwJob(); ACTIONS.fit(); });
  expect(await dialogText(page)).toContain('screw jar');
  await ok(page);
  // take the jar down: it spills; sweep up
  await page.evaluate(() => { show('stores'); ACTIONS.storelook(storeList().findIndex(i => i[0] === SCREW_JAR)); });
  await page.locator('.dlg button', { hasText: 'Take the jar down' }).click();
  expect(await dialogText(page)).toContain('bottom falls out');
  await ok(page);
  expect(await page.evaluate(() => S.screen)).toBe('sweep');
  await page.evaluate(() => { for (let y = 40; y <= 260; y += 10) for (let x = 24; x <= 456; x += 20) sweepMove(x, y); });   // over the whole floor
  expect(await dialogText(page)).toContain('Swept up');
  await ok(page);
  expect(await page.evaluate(() => [S.flags.jarSwept, S.screen])).toEqual([true, 'screwtray']);
  // the tray: a wrong one, then the right one
  await tap(page, 'act:trayscrew:2');
  expect(await dialogText(page)).toContain('too long');
  await ok(page);
  await tap(page, 'act:trayscrew:7');
  expect(await dialogText(page)).toContain('All four screws');
  expect(await page.evaluate(() => [S.flags.screw3, findJob('screw3').status, S.screen])).toEqual([true, 'done', 'bench']);
  expect(errors).toEqual([]);
});

test('he walks round things, not over them: round the wrecks at the yard, this side of a shop counter, round the car in the garage', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const crosses = await page.evaluate(() => {
    const bad = [];
    const check = (key, a, b) => {
      const path = routeAround(key, a, b);
      for (const s of solidsFor(key)) for (let i = 1; i < path.length; i++) if (segmentCrosses(path[i - 1], path[i], s.box)) bad.push([key, a, b]);
    };
    S.screen = 'yard'; check('yard', [100, 150], [-20, 20]); check('yard', [-30, 40], [180, 160]);
    S.screen = 'garage'; check('garage', [20, 70], [90, 80]);
    S.place = 'Tool Shop'; S.inside = true; check('place', [105, 140], [100, 30]);
    return bad;
  });
  expect(crosses).toEqual([]);
  // the shop counter: tapping behind it, he stops this side
  expect(await page.evaluate(() => { const p = routeAround('place', [105, 140], [100, 60]); const end = p[p.length - 1]; return end[1] >= COUNTER[3] || end[1] <= COUNTER[1] || end[0] <= COUNTER[0] || end[0] >= COUNTER[2]; })).toBe(true);
  expect(errors).toEqual([]);
});

test('stranded on Mill Lane: no Back button off the roadside; and if you are in town anyway, your car takes you back to it', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.road = { spare: false, walked: false }; S.screen = 'roadside'; render(); });
  await expect(page.locator('#stage .back')).toHaveCount(0);
  await page.evaluate(() => { S.screen = 'city'; render(); goTo('home'); });
  expect(await page.evaluate(() => S.screen)).toBe('roadside');
  expect(errors).toEqual([]);
});

test('the box (the sub-unit) comes off whole: under the car there is an empty mount, not the box with no sensor; on the bench, once the new sensor fits, its screws go back in', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  // the box on: alloy where it sits; off: dark
  const at = async () => page.evaluate(() => { const d = ctx.getImageData(345, 90, 1, 1).data; return d[0] + d[1] + d[2]; });
  await page.evaluate(() => { S.flags.boxOff = false; show('under'); });
  const on = await at();
  await page.evaluate(() => { S.flags.boxOff = true; render(); });
  expect(await at()).toBeLessThan(on / 2);                                    // an empty dark mount
  // the bench: fitted, all three screws back in (the third once found)
  await page.evaluate(() => { Object.assign(S.flags, { boxOff: true, sensorOut: true, screws: [1, 2, 3], sheared: 3, stubOut: true, fits: true, screw3: true }); show('bench'); });
  expect(errors).toEqual([]);
});

test('dead ends the explorer found: a walk on a screen he is not drawn on just goes; after losing it you can always get back', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  expect(await page.evaluate(() => { let went = false; S.screen = 'rage'; walkTo(10, 10, () => { went = true; }); return went; })).toBe(true);
  await page.evaluate(() => { RAGE.from = 'home'; RAGE.done = true; ANIM = null; DIALOG = null; S.screen = 'rage'; render(); });
  await page.click('[data-act="rageback"]');                                // no button: a tap anywhere takes you back
  expect(await page.evaluate(() => S.screen)).toBe('home');
  expect(errors).toEqual([]);
});
