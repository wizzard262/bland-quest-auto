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
  await page.addInitScript(() => { window.NO_PUNCTURES = true; window.NO_CARD_BLOCKS = true; window.NO_CALLS = true; window.NO_SUNBATHING = true; window.NO_MOANS = true; window.NO_PAPERBOY = true; });   // no random punctures, blocked cards, phone calls, the paperboy or the wife out sunbathing (a test turns them on)
  await page.goto(GAME);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.click('#title-play');                         // the title screen: in
  await page.click('#help-close');
  await page.evaluate(() => { S.money = 250; });           // enough to be going on with (running out has its own test)
  if (skipOpening) return;
  await talk(page);
  await page.locator('.dlg').click();                    // his verdict: tap to carry on
  await choose(page, 'Back to the car');
  await page.evaluate(() => { if (S.screen !== 'city') throw new Error('not on the town map'); show('home'); });   // the town map; then home
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
// The ◀ Back button, top left (the only way back: no "Back to the garage" buttons)
async function goBack(page) {
  await idle(page);
  await page.locator('#stage .back').click();
}
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
  if (await page.evaluate(() => atCounter())) await goBack(page);   // up at the counter: step back to see the shelves
  await tap(page, 'act:shelfzoom:1');
  await tap(page, 'act:shelfitem:1:4');
  await goBack(page);
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
    await tap(page, 'city'); await idle(page);                           // tap the car (yours, or hers while yours is stuck)
    const herCar = await page.evaluate(() => !!HER_RIDE.at);             // hers: she says her piece, and you both get in
    if (herCar) { await page.locator('.dlg').click(); await idle(page); }
  }
  const i = await page.evaluate(n => placeIndex(n), name);
  await page.click(`[data-act="cam:${i % 7},${Math.floor(i / 7)}"]`);   // look at that part of town on the little map
  await page.locator(`.hs[data-go="place:${name}"]`).click();
}
// Tap the shopkeeper (you walk over), and wait for what they say
async function talk(page) {
  await idle(page);
  if (!(await page.evaluate(() => S.inside))) { await page.locator('.hs[data-go="act:enter"]').click(); await idle(page); }   // go in first
  if (await page.evaluate(() => S.place === 'Post Office' && !!DIALOG)) await ok(page);   // the queue's all inside: get here earlier
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
// Broken down, with nothing left to try: tap the glowing pavement (way: 0 = to the left, 1 = to the right)
async function walkHome(page, way) {
  await idle(page);
  const [x, y] = await page.evaluate(k => { [ISO.ox, ISO.oy] = ROAD_VIEW; const p = P(WALK_HOME_WAYS[k][2], 53); return [p[0] / W, p[1] / H]; }, way);
  const box = await page.locator('#stage').boundingBox();
  await page.mouse.click(box.x + x * box.width, box.y + y * box.height);
}
// Home from the walk: up to the house, soaked, in even heavier rain, and he stops where he always stands
async function upToTheHouse(page) {
  await page.waitForFunction(() => ANIM && ANIM.kind === 'walkup', null, { timeout: 30000 });
  expect(await page.evaluate(() => [S.screen, rainLevel('home') > rainLevel('walkhome')])).toEqual(['home', true]);
  await idle(page);
  expect(await page.evaluate(() => [S.screen, soakedAtHome(), !!DIALOG, manSpot('home').join()])).toEqual(['home', true, false, await page.evaluate(() => SPOT_HOME.home.join())]);
}
// …then in at the front door, and out to the garden, where she is
async function findHer(page) {
  await tap(page, 'room'); await idle(page);
  expect(await page.evaluate(() => [S.screen, !!DIALOG])).toEqual(['room', false]);
  await tap(page, 'act:garden'); await idle(page);
}
// Tap the wife's car at home: she walks out, says her piece, and you both get in; into town
async function ridesWithHer(page, first) {
  await tap(page, 'city');
  await page.waitForFunction(() => ANIM && ANIM.kind === 'liftout');
  expect(await dialogText(page)).toContain('hair appointment');
  if (first) expect(await dialogText(page)).toContain('hurry');
  expect(await page.evaluate(() => [S.screen, !!DIALOG.at])).toEqual(['home', true]);   // a bubble from her
  await page.locator('.dlg').click();
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('liftin');
  await idle(page);
  expect(await page.evaluate(() => [S.screen, withWife(), !!DIALOG])).toEqual(['city', true, false]);
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
  expect(await page.locator('.dlg').textContent()).not.toContain('carry on');   // no words telling you to tap (Steve)
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
  await page.locator('.dlg button', { hasText: 'Back to the car' }).click();
  await page.evaluate(() => show('home'));
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
  const fanged = await page.evaluate(() => BOOKS.findIndex(b => b[0].startsWith('Fanged Noumena')));
  await tap(page, 'act:book:' + fanged);
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
  for (const where of ['the shelves', 'the tool chest', 'the workbench', 'the parts boxes']) await expect(page.locator(`.hs[data-go="act:search:${where}"]`)).toHaveCount(1);
  await expect(page.locator('.hs[data-go="act:search:the car"]')).toHaveCount(0);   // you don't look under the car (that's lying under it)
  await tap(page, 'act:search:the workbench');
  expect(await dialogText(page)).toContain('Pitch black');
  await ok(page);
  await goBack(page);
  await page.evaluate(() => { S.flags.torchLit = true; render(); });
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
  await page.evaluate(() => { S.screen = 'garage'; S.flags.torchLit = true; render(); });
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
  await goBack(page);
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
  await goBack(page);
  expect(await page.evaluate(() => S.screen)).toBe('garage');
  expect(errors).toEqual([]);
});

test('your wife: she wants it scrapped, then on the third time she says something about what you are stuck on', async ({ page }) => {
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

test('waiting an hour (the watch) gives a hunch when a job has no leads; no Sit and think button in the car', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { closeLead('ask-mech', 'x', 'test'); render(); });
  await garage(page, "Driver's seat");
  await expect(page.locator('.acts button', { hasText: 'Sit and think' })).toHaveCount(0);
  await tap(page, 'act:wait');
  expect(await dialogText(page)).toContain('a hunch');
  await ok(page);
  expect(await page.evaluate(() => leadOpen('dealer'))).toBe(true);
  await tap(page, 'act:wait');                                          // not stuck now: just an hour
  expect(await dialogText(page)).not.toContain('a hunch');
  expect(errors).toEqual([]);
});

test('branch 1 can be played from the red light to the end', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.money = 1000; anger = () => {}; });        // (running out of money and losing it have their own tests)

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
  await tap(page, 'underZoom');                                            // tap the gearbox to look closer
  expect(await flag(page, 'sensorJob')).toBe(true);
  await tap(page, 'act:bolt1');                                            // tap the bolts: they're 10s, and you've no 10
  expect(await dialogText(page)).toContain('every socket but the 10');
  await ok(page);
  await goPlace(page, 'Tool Shop'); await idle(page);                      // a full socket set, off the Tool Shop's shelf
  await page.evaluate(() => { S.inside = true; S.basket = [{ place: S.place, slot: '0-6', name: 'Socket set', price: 24.99, kind: 'box' }]; act('checkout'); });
  expect(await dialogText(page)).toContain('even the 10');
  await ok(page);
  await garage(page, 'Under the car'); await tap(page, 'underZoom');
  await tap(page, 'act:bolt1'); await ok(page);
  await tap(page, 'act:boltmenu'); await ok(page);                         // bolt 2: the socket slips, it's rounded off
  await tap(page, 'act:nut3'); await ok(page);

  // the cheap extractor snaps; the proper one works
  await goPlace(page, 'Tool Shop'); await talk(page); await choose(page, 'cheap');
  await garage(page, 'Under the car'); await tap(page, 'underZoom');
  await tap(page, 'act:boltmenu'); await choose(page, 'cheap extractor'); await ok(page);
  await goPlace(page, 'Hardware Shop'); await talk(page); await choose(page, 'proper');
  await garage(page, 'Under the car'); await tap(page, 'underZoom');
  await tap(page, 'act:boltmenu'); await choose(page, 'proper extractor'); await ok(page);
  expect(await flag(page, 'b2')).toBe(true);
  await tap(page, 'act:pull'); await ok(page);                             // tap the box: the sensor comes off in its box
  expect(await flag(page, 'boxOff')).toBe(true);
  expect(await flag(page, 'sensorOut')).toBe(false);

  // on the workbench: undo the 4 screws round the sensor (the last one shears), then lift the old sensor out
  await garage(page, 'Workbench');
  await tap(page, 'act:screw:1'); await ok(page);
  await tap(page, 'act:screw:2'); await ok(page);
  await tap(page, 'act:screw:3'); await ok(page);
  await tap(page, 'act:screw:4'); await ok(page);
  expect(await page.evaluate(() => S.flags.sheared)).toBe(4);
  await act(page, 'Lift the old sensor out'); await ok(page);
  expect(await flag(page, 'sensorOut')).toBe(true);

  // find nut 3: torch (flat) from the toolbox, batteries from the kitchen, see it under the chest, a stick, hook it out
  await garage(page); await ok(page);
  await garageTap(page, 'Search under the workbench'); await ok(page);                   // too dark
  await goBack(page);
  await garageTap(page, 'Toolbox'); await tap(page, 'act:drawer:5'); await idle(page);
  expect(await page.locator('.acts button', { hasText: 'torch' }).count()).toBe(0);      // no button: tap the torch itself (Steve)
  await tap(page, 'act:takeTorch'); await ok(page);
  expect(await page.locator('.hs[data-go="act:takeTorch"]').count()).toBe(0);             // taken: not in the drawer any more
  await page.evaluate(() => { S.screen = 'home'; S.place = null; render(); });
  await goRoom(page); await act(page, 'Look for batteries'); await ok(page);
  await garage(page);
  await garageTap(page, 'Search under the tool chest');
  await aimTorch(page, ...NUT_SPOT); await ok(page);                                     // the beam finds it
  await goBack(page);
  await page.evaluate(() => { S.screen = 'home'; render(); });
  await tap(page, 'act:stick'); await ok(page);                            // tap the hedge: a long stick
  await garage(page);
  await garageTap(page, 'Search under the tool chest');
  await aimTorch(page, ...NUT_SPOT); await choose(page, 'Hook it out');
  expect(await page.evaluate(() => S.screen)).toBe('fish');
  await hookNut(page);
  await ok(page);
  expect(await flag(page, 'n3found')).toBe(true);

  // order the sensor, sleep on it, collect it from the other branch
  await goPlace(page, 'Halfords Car Parts'); await talk(page); await ok(page);
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
  await act(page, 'Try the old sensor'); await ok(page);                   // the old one: lined up, it goes back in
  expect(await page.evaluate(() => S.bench.state)).toBe('in');
  await act(page, 'Pull'); await ok(page);                                 // out again
  await act(page, 'Try the Parts 4 Less sensor'); await ok(page);          // the pins not lined up: it jams
  expect(await page.evaluate(() => S.bench.state)).toBe('stuck');
  await act(page, 'Pull'); await ok(page);                                 // jammed: needs a hammer
  await goBack(page); await garageTap(page, 'Toolbox'); await tap(page, 'act:drawer:6'); await act(page, 'Look for the hammer'); await ok(page);
  await goPlace(page, 'Hardware Shop'); await talk(page); await ok(page);   // "not got any"
  await buyHammer(page); await ok(page);
  expect(await page.evaluate(() => !!S.inv.hammer)).toBe(true);
  await garage(page, 'Workbench');
  await act(page, 'Tap it with the hammer'); await ok(page);
  await act(page, 'Pull'); await ok(page);
  await page.evaluate(() => { S.anger = 0; });                             // (calm: losing it has its own test)
  await act(page, 'Try the Parts 4 Less sensor');                          // lined up this time: it fits… but no plug
  expect(await dialogText(page)).toContain('Plug sold separately');
  await ok(page);
  expect(await flag(page, 'fits')).toBeFalsy();
  await act(page, 'Solder the old plug on'); await ok(page);               // the soldering game (its own test plays it in full)
  expect(await page.evaluate(() => [S.screen, solderFor()])).toEqual(['solder', 'part-p4l']);
  await page.evaluate(() => { S.flags.wireColours = true; S.inv.iron = true; S.inv.solder = true; render(); });
  for (const [k, j] of [[0, 0], [1, 2], [2, 1]]) { await tap(page, 'act:wirepick:' + k); await tap(page, 'act:wirejoin:' + j); }
  await act(page, 'Solder the joints');
  expect(await dialogText(page)).toContain('Parts 4 Less sensor has a plug');
  await ok(page);
  await garage(page, 'Workbench');
  await act(page, 'Try the Parts 4 Less sensor with the old plug'); await ok(page);
  expect(await page.evaluate(() => [S.flags.fits, S.flags.fittedPart])).toEqual([true, 'part-p4l']);
  await tap(page, 'act:stubmenu'); await choose(page, 'proper extractor'); await ok(page);   // the snapped screw's stub, out with the proper extractor
  expect(await flag(page, 'stubOut')).toBe(true);
  await page.evaluate(() => { S.flags.screw3 = true; finishJob('screw3', 'from the jar'); });   // the third screw from the jar (its own test)

  // fit it and start the car: the red light goes off… and the ABS light comes on
  await garage(page, 'Under the car'); await tap(page, 'underZoom');
  await tap(page, 'act:fit');                                              // tap the empty mount: the box goes back up…
  expect(await dialogText(page)).toContain('All three');
  await ok(page);
  for (const which of ['b1', 'n3', 'b2']) {                                // …then both bolts and the nut to do up again
    expect(await page.evaluate(() => !!S.flags.fitted)).toBe(false);
    await tap(page, 'act:redo:' + which);
    expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('boltBack');
    await ok(page);
  }
  expect(await flag(page, 'fitted')).toBe(true);
  expect(await page.locator('.hs[data-go^="act:redo"]').count()).toBe(0);
  await garage(page, "Driver's seat");
  await startCar(page);
  expect(await page.evaluate(() => [ANIM.kind, ANIM.noSkip])).toEqual(['start', true]);
  await page.mouse.click(600, 400); await page.mouse.click(600, 400);       // taps don't skip it…
  await page.waitForFunction(() => ANIM && ANIM.kind === 'absOn');         // …you see the orange light…
  await page.mouse.click(600, 400);
  expect(await page.evaluate(() => [ANIM && ANIM.kind, document.querySelectorAll('.dlg').length])).toEqual(['absOn', 0]);
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

test('the bolts and the nut under the car are all 10s: no 10 mm socket, no 10 mm spanner, so you need a full socket set', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.flags.codes = true; S.flags.sensorJob = true; job('sensor-off', 'Get the old sensor off', 'light'); S.screen = 'underZoom'; render(); });
  for (const go of ['act:bolt1', 'act:boltmenu', 'act:nut3']) {
    await tap(page, go);
    expect(await dialogText(page)).toContain('full socket set');
    await ok(page);
  }
  expect(await page.evaluate(() => [!!S.flags.b1, !!S.flags.b2round, !!S.flags.n3lost, findJob('ten').status, leadOpen('ten-shop')])).toEqual([false, false, false, 'open', true]);
  // the toolbox hasn't got one, either kind
  await page.evaluate(() => { S.screen = 'toolbox'; S.drawer = 1; render(); });
  await act(page, 'Look for the 10 mm'); await ok(page);
  await page.evaluate(() => { S.drawer = 2; render(); });
  await act(page, 'Find the 10 mm spanner');
  expect(await dialogText(page)).toContain('never a 10');
  await ok(page);
  expect(await page.evaluate(() => [leadOpen('ten-drawer'), leadOpen('ten-spanner'), wifeTip().includes('socket set')])).toEqual([false, false, true]);
  // a set off a tool shop's shelf: job done, and it sits on the garage shelf
  await page.evaluate(() => { S.place = 'Tool Shop'; S.screen = 'place'; S.inside = true; S.basket = [{ place: 'Tool Shop', slot: '0-6', name: sectionStock('Tool Shop', 0)[6][0], price: 24.99, kind: 'box' }]; act('checkout'); });
  expect(await dialogText(page)).toContain('even the 10');
  await ok(page);
  expect(await page.evaluate(() => [findJob('ten').status, haveTen(), storeList().some(r => r[0] === 'Socket set')])).toEqual(['done', true, true]);
  await page.evaluate(() => { S.screen = 'underZoom'; S.place = null; render(); });
  await tap(page, 'act:bolt1'); await ok(page);
  expect(await flag(page, 'b1')).toBe(true);
  expect(errors).toEqual([]);
});

test('a socket set off Zamanon: arrives tomorrow, and there is no 10 in it; the bolts still need the one from a tool shop', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'pc'; S.app = 'MegaMart'; render(); });
  await expect(page.locator('[data-act="buy:sockets-zam"]')).toHaveCount(0);    // not till you need one
  await page.evaluate(() => { job('sensor-off', 'Get the old sensor off', 'light'); needTen('Bolt 1'); });
  await ok(page);
  expect(await page.evaluate(() => leadOpen('ten-online'))).toBe(true);
  await page.evaluate(() => { S.screen = 'pc'; S.app = 'MegaMart'; render(); });
  await page.locator('[data-act="buy:sockets-zam"]').click();
  expect(await dialogText(page)).toContain('arrives tomorrow');
  await ok(page);
  expect(await page.evaluate(() => [leadOpen('ten-online'), S.parcels.some(p => p.item === 'sockets-zam')])).toEqual([false, true]);
  await page.evaluate(() => { S.parcels = []; S.anger = 10; S.screen = 'home'; render(); openParcel('sockets-zam'); });
  expect(await dialogText(page)).toContain('10-shaped gap');
  await ok(page);
  expect(await page.evaluate(() => [S.anger, haveTen(), findJob('ten').status, leadOpen('ten-shop'), storeList().some(r => r[0] === ZAM_SOCKETS)])).toEqual([20, false, 'open', true, true]);
  expect(errors).toEqual([]);
});

test('the taxi and the bus have their lights on at night, and none by day', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const lit = (mins, draw) => page.evaluate(([m, d]) => { S.mins = m; S.screen = 'home'; render(); [ISO.ox, ISO.oy] = VIEW.home; const n = OUR_LAMPS.length; new Function(d)(); const on = OUR_LAMPS.slice(n).filter(l => !l.off).length; const shining = lightsOn(); OUR_LAMPS.length = n; return shining ? on : 0; }, [mins, draw]);
  expect(await lit(22 * 60, 'drawTaxi(60, 151)')).toBe(2);
  expect(await lit(22 * 60, 'isoBus(-58, 151)')).toBe(2);
  expect(await lit(12 * 60, 'drawTaxi(60, 151)')).toBe(0);
  expect(errors).toEqual([]);
});

test('a big moment plays before its message: the nut drops and rolls away', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.flags.codes = true; S.flags.sensorJob = true; S.bought = { 'Socket set': { kind: 'box', n: 1 } }; job('sensor-off', 'Get the old sensor off', 'light'); S.screen = 'underZoom'; render(); });
  await tap(page, 'act:nut3');
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

test('losing it waits its turn: in the middle of something, that finishes first, then he loses it, and you are never stuck', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { Object.assign(S.flags, { boxOff: true, sensorOut: true, sheared: 3, screws: [1, 2, 4, 3], needHammer: true, tapped: true }); S.inv['part-p4l'] = true; S.inv.hammer = true; S.bench = { part: 'part-p4l', state: 'stuck', rotated: false }; S.screen = 'bench'; S.anger = 97; render(); });
  await act(page, 'Pull');                                              // this tips you over…
  expect(await page.evaluate(() => [ANIM && ANIM.kind, S.screen])).toEqual(['benchPull', 'bench']);   // …but it finishes first
  expect(await dialogText(page)).toContain('With a lot of wiggling');
  await page.locator('.dlg').click();
  await page.waitForFunction(() => S.screen === 'rage');                // then he loses it
  await ok(page); await ok(page);
  expect(await page.evaluate(() => [S.screen, S.anger])).toEqual(['bench', 40]);   // and you're back where you were
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
  await goBack(page);
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
  await expect(page.locator('[data-act="phonetorch"] .nope')).toHaveCount(1);   // crossed out
  await page.locator('[data-act="phonetorch"]').click();
  expect(await dialogText(page)).toContain('broken');                   // the phone's torch is broken…
  expect(await page.evaluate(() => [!!S.flags.phoneTorch, S.screen])).toEqual([false, 'phone']);   // …and the phone stays open
  await page.locator('.phoneoff').click({ position: { x: 10, y: 200 } });   // tap off it to put it away
  expect(await page.evaluate(() => S.screen)).toBe('garage');
  await page.evaluate(() => { S.flags.torchLit = true; });              // a proper torch, from the toolbox
  await tap(page, 'act:search:the tool chest'); await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('lookunder');
  await aimTorch(page, ...NUT_SPOT);                                    // the torch on the back corner: the nut glints
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
test('drinks are counted from when you were last sober: two, sober up, two more is two, not four; a new day starts again too', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const counts = await page.evaluate(() => {
    const out = [];
    S.mins = 12 * 60;
    out.push(haveADrink()); S.mins += 30; out.push(haveADrink());
    S.mins += 4 * 60;                                                    // it's all worn off
    out.push(boozeNow()); out.push(haveADrink()); S.mins += 30; out.push(haveADrink());
    S.day += 1; out.push(haveADrink());                                  // the next day
    return out;
  });
  expect(counts).toEqual([1, 2, 0, 1, 2, 1]);
  expect(errors).toEqual([]);
});

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
  // her car turns up, she gets out, in her dress: NOT AGAIN, GET IN!
  await page.waitForFunction(() => ANIM && ANIM.kind === 'pubfetch');
  expect(await dialogText(page)).toContain('NOT AGAIN, GET IN!');
  expect(await page.evaluate(() => [S.flags.pickup === S.day, DIALOG.at !== null])).toEqual([true, true]);
  await page.locator('.dlg').click();
  await page.waitForFunction(() => ANIM && ANIM.kind === 'publeave');      // you both leave in hers
  // home: she walks in; all he can do is follow her in
  expect(await dialogText(page)).toContain('car keys');
  expect(await page.evaluate(() => [S.screen, !!S.flags.wifeWalksIn, S.flags.carAt, findJob('fetch-car').status])).toEqual(['home', true, 'The Hesketh Tavern', 'open']);   // yours is left there
  await ok(page);
  for (const go of ['garage', 'act:wifecar', 'act:stick', 'room']) await expect(page.locator(`.hs[data-go="${go}"]`)).toHaveCount(1);   // everything on the drive can be gone to…
  await page.evaluate(() => goTo('city'));                               // …but not the bus, like that
  expect(await dialogText(page)).toContain('never make it up the step');
  await ok(page);
  await tap(page, 'room');
  // in the house: halfway across the room, and down on the carpet asleep
  expect(await dialogText(page)).toContain('fold up on the carpet');
  expect(await page.evaluate(() => [S.screen, S.flags.onFloor, S.spot.room.join() === COLLAPSE_AT.join()])).toEqual(['room', true, true]);
  await page.locator('.dlg').click();
  expect(await dialogText(page)).toContain('face down on the carpet');
  await ok(page);
  expect(await page.evaluate(() => [isDrunk(), !!S.flags.onFloor, S.mins])).toEqual([false, false, 8 * 60]);
  // sober: the bus into town, to fetch the car; and the barman remembers last time
  await page.evaluate(() => { S.mins = 18 * 60; S.flags.pubCall = S.day; S.screen = 'home'; render(); });
  await tap(page, 'city');
  await idle(page);
  expect(await dialogText(page)).toContain('The bus');
  await ok(page);
  expect(await page.evaluate(() => [!!S.flags.carAt, findJob('fetch-car').status])).toEqual([false, 'done']);
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

test('late at night the wife comes into the garage to say come to bed; five more minutes, and she goes back in', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 21 * 60; S.screen = 'home'; S.place = null; render(); });
  await tap(page, 'garage');
  await choose(page, 'Five more minutes');                              // she's counting… and back in she goes
  expect(await page.evaluate(() => wifeInGarage())).toBe(false);
  await tap(page, 'home'); await idle(page);                            // leave by the door: she's not following
  expect(await page.evaluate(() => [S.screen, wifeFollowing()])).toEqual(['home', false]);
  expect(errors).toEqual([]);
});

test('ring the wife on the phone: she says what she would say in person', async ({ page }) => {
  const errors = [];
  const FEMALE_VOICE_T = 290;                                           // the woman's voice (engine.js FEMALE_VOICE)
  await start(page, errors);
  await page.evaluate(() => { S.mins = 11 * 60; S.screen = 'garage'; render(); });
  const said = [];
  const ringWife = async () => {                                        // take the phone out (if it isn't already) and ring her
    if (await page.evaluate(() => S.screen !== 'phone')) { await page.click('.go[data-go="phone"]'); await idle(page); }
    await page.locator('[data-act="ring:Wife"]').click();
  };
  await page.evaluate(() => { window.PITCHES = []; chatter = (n, pitch) => PITCHES.push(pitch); });   // listen for the garbled speech
  for (let k = 0; k < 3; k++) { await ringWife(); said.push(await dialogText(page)); await ok(page); }
  const pitches = (await page.evaluate(() => PITCHES)).filter(p => p === FEMALE_VOICE_T);   // (you talk too now: just hers)
  expect(pitches.length).toBe(3);                                       // her voice down the phone, every time: the woman's voice
  await page.evaluate(() => { S.screen = 'room'; render(); });
  await tap(page, 'act:wife');                                          // in the house: the same voice
  expect(await page.evaluate(() => PITCHES[PITCHES.length - 1])).toBe(pitches[0]);
  await ok(page);
  expect(said[0]).toMatch(/scrap|Fiesta|Micra|wedding/i);               // the same as in person: scrap it…
  expect(said[2]).toMatch(/handbook|codes|hammer|fuses|1234|tea/);     // …and then something about what you're stuck on
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
  expect(await page.locator('.hs[data-go^="act:screw:"]').count()).toBe(0);   // nothing on the bench yet
  await page.evaluate(() => { S.flags.codes = true; S.flags.sensorJob = true; S.flags.b1 = S.flags.b2 = S.flags.n3lost = true; job('sensor-off', 'Get the old sensor off', 'light'); S.screen = 'underZoom'; render(); });
  await tap(page, 'act:pull'); await ok(page);
  expect(await page.evaluate(() => findJob('sensor-out').status)).not.toBe('done');
  await page.evaluate(() => { S.screen = 'garage'; DIALOG = null; render(); });   // out from under the car (it was set straight onto the close-up, so Back has nowhere to step back to)
  await garageTap(page, 'Workbench');
  await act(page, 'Lift the old sensor out'); await ok(page);           // still screwed in
  expect(await flag(page, 'sensorOut')).toBe(false);
  await tap(page, 'act:screw:2'); await ok(page);                       // the screws can be tapped in the picture too
  await tap(page, 'act:screw:3'); await ok(page);
  await tap(page, 'act:screw:4'); await ok(page);                      // the back one, by feel
  await tap(page, 'act:screw:1');
  expect(await dialogText(page)).toContain('SNAP');                     // the last one always shears
  await ok(page);
  expect(await page.evaluate(() => S.flags.sheared)).toBe(1);
  expect(await page.locator('.acts button', { hasText: 'Try the old sensor' }).count()).toBe(0);
  await page.evaluate(() => { window.ON_BENCH = []; const real = sensorUnit; sensorUnit = (b, at, z) => { if (!z && at && Math.round(at[0]) === Math.round(P(190, 30, 0)[0])) ON_BENCH.push(ANIM ? ANIM.kind : 'still'); return real(b, at, z); }; });
  await tap(page, 'act:boxout'); await idle(page);
  expect(await page.evaluate(() => [ON_BENCH.includes('benchLift'), ON_BENCH.includes('still')])).toEqual([false, true]);   // on the bench only once it's out of the box
  await ok(page);
  expect(await page.evaluate(() => [S.flags.sensorOut, !!S.inv['old-sensor'], findJob('sensor-out').status, !!findJob('new-sensor')])).toEqual([true, true, 'done', true]);
  await act(page, 'Try the old sensor'); await ok(page);                // now parts can be tried in the box's hole
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

test('after kicking the headlight it stays smashed: the Thee Bay one is the wrong side; the Scrap Yard has one; fit it under the bonnet', async ({ page }) => {
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
  await tap(page, 'act:lamp:left'); await ok(page);                     // under the bonnet: tap the smashed one
  expect(await page.evaluate(() => brokeOpen('headlight'))).toBe(false);
  expect(errors).toEqual([]);
});

test('kick both headlights in: each shows cracked wherever you see the car, and flickers on its own when the lights are on; a third kick breaks no more headlights', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const lampsOn = screen => page.evaluate(sc => { S.screen = sc; S.place = null; render(); return OUR_LAMPS.filter(l => l.cracked).length; }, screen);
  // night, with one kicked in: the cracked one flickers; the other is full on all the time
  const nightLit = () => page.evaluate(() => {
    S.mins = 22 * 60; S.place = 'Tool Shop'; S.inside = false; S.screen = 'place'; render();   // out in it (on the drive its lights are off)
    const out = [];
    for (let t = 0; t < 6; t += 0.05) out.push(OUR_LAMPS.map(l => lampLit(l, t)).join(','));
    S.mins = 11 * 60; S.place = null; S.screen = 'home'; render();
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
    S.mins = 22 * 60; S.place = 'Tool Shop'; S.inside = false; S.screen = 'place'; render();   // out in it (on the drive its lights are off)
    const out = [];
    for (let t = 0; t < 6; t += 0.05) out.push(OUR_LAMPS.map(l => lampLit(l, t)).join(','));
    return out;
  });
  expect(new Set(states).size).toBeGreaterThan(2);                       // on, off, and one without the other
  expect(states).toContain('true,false');
  // the Thee Bay headlight is a right one: now that's the one you need
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
  await tap(page, 'act:lamp:right'); await ok(page);                   // the right one goes in
  expect(await page.evaluate(() => kickedLamps())).toEqual({ left: true, right: false });
  await tap(page, 'act:lamp:left');                                     // the other right one: wrong side
  expect(await dialogText(page)).toContain('back on the shelf');
  await ok(page);
  expect(await page.evaluate(() => [S.lamps.right, storeList().some(([n]) => n === 'Headlight (Zafira, right)')])).toEqual([1, true]);
  // a left one from the yard: fit it; both whole again
  await page.evaluate(() => { addLamp('left'); render(); });
  await tap(page, 'act:lamp:left'); await ok(page);
  expect(await page.evaluate(() => kickedLamps())).toEqual({ left: false, right: false });
  expect(await kick()).toEqual([false, '']);                            // kick 3: the left again
  expect(await page.evaluate(() => [kickedLamps(), findJob('broke-headlight').status])).toEqual([{ left: true, right: false }, 'open']);
  expect(await kick()).toEqual([true, 'scaleX(-1)']);                   // kick 4: the right, and the spare on the shelf fits it
  await page.evaluate(() => { S.screen = 'bonnet'; render(); });
  await tap(page, 'act:lamp:right'); await ok(page);
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
  expect(await dialogText(page)).toContain('before six');
  await ok(page);
  expect(await page.evaluate(() => [S.mins, poInQueue()])).toEqual([9 * 60 + 10, false]);
  expect(await page.evaluate(() => S.anger)).toBeGreaterThan(anger);
  // set off at 5, with nobody about: no roadworks, and you're first
  await page.evaluate(() => { S.day += 1; S.mins = 5 * 60; S.screen = 'home'; S.place = null; render(); });
  await goPlace(page, 'Post Office'); await idle(page);
  expect(await page.evaluate(() => [!!DIALOG, S.mins, poInQueue(), poAhead()])).toEqual([false, 5 * 60 + 20, true, 0]);
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

test('the post office queue outside: it grows from 6am; in it before 9, you go in when it opens and there is no queue; after 9 the queue is all inside and never moves', async ({ page }) => {
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
  // 7:30: four in front, outside; at 9 it opens: they're all in, you go in, and there's no queue
  await page.evaluate(() => { S.day += 1; });
  await arrive(7 * 60 + 30);
  expect(await page.evaluate(() => poAhead())).toBe(4);
  const drawn = mins => page.evaluate(m => { S.mins = m; const real = man; let n = 0; man = (...a) => { n++; real(...a); }; S.inside ? postQueue() : postQueueOutside(); man = real; return n; }, mins);   // people in the queue
  expect(await drawn(8 * 60)).toBeGreaterThan(4);
  expect(await drawn(9 * 60)).toBe(0);                                  // open: nobody outside
  await goIn();
  expect(await page.evaluate(() => [S.inside, postFirst()])).toEqual([true, true]);
  expect(await drawn(9 * 60)).toBe(0);                                  // and no queue inside
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
  await page.evaluate(() => { S.flags.codes = true; S.flags.sensorJob = true; S.bought = { 'Socket set': { kind: 'box', n: 1 } }; job('sensor-off', 'Get the old sensor off', 'light'); S.screen = 'underZoom'; render(); });
  await tap(page, 'act:nut3');
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
  expect(await page.locator('.spine').count()).toBe(19);                                    // 18 books and the game box (no handbook yet: it's in the parts box)
  const sierra = await page.evaluate(() => BOOKS.findIndex(b => b[0].startsWith('Ford Sierra')));
  await page.locator(`.hs[data-go="act:book:${sierra}"]`).click();
  await expect(page.locator('.book')).toContainText('Sierra');           // not your car's handbook: that's in the parts box
  await page.locator('.bookoff').click({ position: { x: 5, y: 200 } });   // tap off the book: it goes back
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
  await goBack(page);
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
  await goBack(page);                                         // away from the counter, to see the shelves
  await tap(page, 'act:shelfzoom:0');
  expect(await page.locator('.lab', { hasText: 'Claw hammer' }).count()).toBe(0);   // not on the first shelf
  await goBack(page);
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
  expect(await page.evaluate(() => storeList().map(r => r[0]).includes(HANDBOOK_NAME))).toBe(false);   // not on the garage shelves…
  await page.evaluate(() => { S.screen = 'shelf'; render(); });           // …it's on the manuals shelf, at the end, and opens from there
  await expect(page.locator('.spine', { hasText: "Owner's Handbook" })).toHaveCount(1);
  await tap(page, 'act:handbook');
  expect(await page.evaluate(() => S.screen)).toBe('handbook');
  await act(page, 'Put it down');
  expect(await page.evaluate(() => S.screen)).toBe('shelf');              // back on the shelf
  expect(errors).toEqual([]);
});

test('the handbook found and put off till later goes on the manuals shelf', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await findHandbook(page);
  await choose(page, 'Later');
  expect(await page.evaluate(() => [S.inv.handbook, S.screen])).toEqual([true, 'partsbox']);
  await page.evaluate(() => { S.screen = 'shelf'; render(); });
  await expect(page.locator('.hs[data-go="act:handbook"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('the computer: Yoo Toob shows a still of Gaz in his workshop with our car up on the lift; the mail app is called E-mail; Thee Bay has a space', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'pc'; S.app = 'ViewTube'; render(); });
  await expect(page.locator('.video svg.thumb')).toHaveCount(1);                       // the video's still
  await expect(page.locator('.video svg.thumb')).toHaveAttribute('aria-label', /our car up on the lift/);
  expect(await page.evaluate(() => APPS.map(a => a[1]))).toEqual(expect.arrayContaining(['E-mail', 'Thee Bay', 'Instant Gramme', 'Weak-a-pedia']));
  await page.evaluate(() => { S.app = 'eBuy'; render(); });
  await expect(page.locator('.logo')).toContainText('Thee Bay');
  await page.evaluate(() => { S.app = 'Pics'; render(); });               // Instant Gramme: your posts are real little photos
  await expect(page.locator('.app-Pics .grid svg')).toHaveCount(6);
  await expect(page.locator('.logo')).toContainText('Instant Gramme');
  expect(errors).toEqual([]);
});

test('the manuals shelf: The Trial is there, the kinds of book are mixed up along it, and they all fit on the board', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const titles = await page.evaluate(() => BOOKS.map(b => b[0]));
  expect(titles.some(t => t.startsWith('The Trial (Franz Kafka)'))).toBe(true);
  const deep = ['Fanged Noumena', 'Das Kapital', 'A Thousand Plateaus', 'The Myth of Sisyphus', 'The Trial', 'Zen and the Art'];
  const at = deep.map(d => titles.findIndex(t => t.startsWith(d))).sort((a, b) => a - b);   // where each one stands
  for (let k = 1; k < at.length; k++) expect(Math.abs(at[k] - at[k - 1])).toBeGreaterThan(1);   // never two side by side
  await page.evaluate(() => { S.inv.handbook = true; S.screen = 'shelf'; render(); });
  const last = await page.evaluate(() => shelfX(BOOKS.length) + BOOK_W - 2);   // the handbook's right edge
  expect(last).toBeLessThanOrEqual(472);                                  // the shelf board ends at 472
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
  await goBack(page);
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
test('the glove box in the car opens on useless things: a snapped ice scraper, a tyre pressure gauge, a dead torch (no phone charger)', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'dash'; render(); });
  await tap(page, 'act:glovebox');
  expect(await page.evaluate(() => S.screen)).toBe('glovebox');
  expect(await page.evaluate(() => GLOVE_THINGS.map(t => t[0]))).toEqual(['Ice scraper', 'Tyre pressure gauge', 'Torch']);
  await tap(page, 'act:glove:0');
  expect(await dialogText(page)).toContain('snapped');
  await ok(page);
  await tap(page, 'act:glove:2');
  expect(await dialogText(page)).toContain('batteries');
  await choose(page, 'Leave it');
  await expect(page.locator('.acts button')).toHaveCount(0);            // no Shut it button: ◀ Back
  await goBack(page);
  expect(await page.evaluate(() => S.screen)).toBe('dash');
  expect(errors).toEqual([]);
});

test('the tyre pressure gauge goes from the glove box to the garage shelf; open the boot and it is on the spare, its needle riding up into the red (nothing said)', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'glovebox'; render(); });
  await tap(page, 'act:glove:1');
  await choose(page, 'Put it on the garage shelf');
  expect(await page.evaluate(() => [S.flags.gloveGauge, storeList().some(r => r[0] === GAUGE_NAME)])).toEqual([true, true]);
  await expect(page.locator('.hs[data-go="act:glove:1"]')).toHaveCount(0);   // gone from the glove box
  await page.evaluate(() => { S.screen = 'garage'; render(); show('boot'); });
  expect(await page.evaluate(() => [S.screen, !!DIALOG, spareReading() < 1 / 3])).toEqual(['boot', false, true]);   // poor: in the red, and no message
  await page.evaluate(() => { S.spare = 'good'; render(); });
  expect(await page.evaluate(() => spareReading() > 1 / 3)).toBe(true);   // a good spare: clear of the red
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
  expect(await page.locator('.acts button', { hasText: 'panel' }).count()).toBe(0);   // no button for it: ◀ Back (Steve)
  await goBack(page);
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
  await tap(page, 'act:meter');                                            // tap the multimeter in the drawer
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
  expect(await dialogText(page)).toContain('arrives tomorrow');         // it says when…
  expect(await page.evaluate(() => [S.msgs[0].from, S.msgs[0].body.includes(arrivesWhen(1)), arrivesWhen(1).includes(DAYS[(S.day + 1) % 7]), arrivesWhen(2).includes('in 2 days')])).toEqual(['Zamanon', true, true, true]);   // …and a text says so too
  await ok(page);
  expect(await page.evaluate(() => [leadOpen('bat-online'), S.parcels.some(p => p.item === 'battery-23a')])).toEqual([false, true]);
  await page.evaluate(() => { S.parcels = []; openParcel('battery-23a'); });
  expect(await dialogText(page)).toContain('It beeps');
  await ok(page);
  expect(await page.evaluate(() => [findJob('meter-battery').status, S.flags.meterOK])).toEqual(['done', true]);
  // it works: out of the drawer, and onto the garage shelf
  await page.evaluate(() => { S.screen = 'toolbox'; S.drawer = 5; render(); });
  await expect(page.locator('.hs[data-go="act:meter"]')).toHaveCount(0);
  await page.evaluate(() => { S.screen = 'stores'; render(); });
  const meterAt = await page.evaluate(() => storeList().findIndex(r => r[0] === METER_NAME));
  expect(meterAt).toBeGreaterThanOrEqual(0);
  await tap(page, 'act:storelook:' + meterAt);
  expect(await dialogText(page)).toContain('It works');
  await ok(page);
  expect(await page.evaluate(() => { S.flags.meterOut = true; const there = storeList().some(r => r[0] === METER_NAME); S.flags.meterOut = false; return there; })).toBe(false);   // not while it's out on the fuse box
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
  await tap(page, 'act:meter');                                            // tap the multimeter in the drawer
  expect(await dialogText(page)).toContain('AAs');
  await ok(page);
  expect(errors).toEqual([]);
});

// ---------- road snags: a puncture on the way home ----------
test('a puncture on the way home: the spare is flat, the phone dies, the walk home in the rain and a splash; the wife says get a wheel and lends you her car; fit it at the roadside', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 10 * 60; });
  await goPlace(page, 'Worn Out and Tired'); await idle(page);
  await page.evaluate(() => { PUNCTURE_CHANCE = 1; });                  // this time it happens
  await page.locator('.hs[data-go="city"]').first().click(); await idle(page);   // back in the car
  await page.locator('.hs[data-go="home"]').first().click();           // drive home…
  await page.waitForFunction(() => ANIM && ANIM.kind === 'flatdrive');  // you see the car come along, go bang and stop
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
  await goBack(page);                                   // back to the roadside
  expect(await page.evaluate(() => S.screen)).toBe('roadside');
  await expect(page.locator('.hs[data-go="act:walkhome"]')).toHaveCount(0);   // not till you've tried the phone too
  // ring for help: the phone dies (and stays dead)
  expect(await page.evaluate(() => brokenDown())).toBe(true);           // the phone in your pocket pulses
  await page.click('.go[data-go="phone"]');                             // one big button, and nothing else
  await expect(page.locator('.ph .recover')).toContainText('Fleengrag Car Recovery');
  await expect(page.locator('.ph .c')).toHaveCount(0);
  await page.click('.ph .recover');
  expect(await dialogText(page)).toContain('Thank you for calling');
  expect(await page.evaluate(() => [DIALOG.body.includes('Where are you'), voicePitch(DIALOG.title)])).toEqual([false, 290]);   // she doesn't ask where you are; a woman's voice
  await page.locator('.dlg').click();
  expect(await dialogText(page)).not.toContain('Mill Lane');            // and you don't say
  await ok(page);                                                       // …and it dies mid-sentence
  await expect(page.locator('.ph')).toContainText('charge it at your computer desk');
  expect(await page.evaluate(() => [S.screen, S.flags.phoneDead, brokenDown()])).toEqual(['phone', true, false]);
  expect(await page.evaluate(() => [findJob('phone').status, leadOpen('charge')])).toEqual(['open', true]);   // on the to-do list
  await page.evaluate(() => { back(); });
  await expect(page.locator('.acts button')).toHaveCount(0);            // no Walk home button: the pavement glows, both ways from two slabs off, and you tap it (Steve)
  await expect(page.locator('.hs[data-go="act:walkhome"]')).toHaveCount(2);
  expect(await page.evaluate(() => PAVEMENT_GLOW.length)).toBeGreaterThan(500);
  expect(await page.evaluate(() => WALK_HOME_WAYS[0][1] <= ROAD_MAN[0] - 24 && WALK_HOME_WAYS[1][0] >= ROAD_MAN[0] + 24)).toBe(true);
  // walk home: rain, a car, a puddle, soaked; home, and the wife has a plan
  await walkHome(page, 1);
  expect(await page.evaluate(() => [S.screen, ANIM && ANIM.kind])).toEqual(['walkhome', 'walkhome']);
  await upToTheHouse(page);
  expect(await page.evaluate(() => [inWifesCar(), strandedReason('city') !== null, leadOpen('tell-wife')])).toEqual([false, true, true]);   // no car till you've told her
  await findHer(page);
  expect(await dialogText(page)).toContain('SOAKED');
  // she's in the garden, in the sun, and doesn't believe it rained
  expect(await page.evaluate(() => [S.screen, wifeSunbathing(), !!DIALOG.at])).toEqual(['garden', true, true]);
  await page.locator('.dlg').click();
  expect(await dialogText(page)).toContain('It rained');                // you
  await page.locator('.dlg').click();
  expect(await dialogText(page)).toContain('NOT rained');               // her
  await ok(page);
  expect(await page.evaluate(() => [S.screen, S.road.walked, !!S.flags.phoneDead])).toEqual(['garden', true, true]);
  expect(await page.evaluate(() => [soakedAtHome(), inWifesCar(), rainLevel('home'), leadOpen('tell-wife'), leadOpen('wheel-yard')])).toEqual([false, true, 0, false, true]);
  await tap(page, 'act:backin'); await idle(page);                       // and not in the house
  await expect(page.locator('.hs[data-go="act:wife"]')).toHaveCount(0);
  expect(await page.evaluate(() => { act('wife'); return [!!DIALOG, wifeHead()]; })).toEqual([false, null]);   // no bubble in there
  // the phone: charged at the computer desk, from the box of chargers
  await tap(page, 'pc'); await idle(page);
  await tap(page, 'act:chargers');
  expect(await page.evaluate(() => S.screen)).toBe('charger');
  for (const [id, says] of [['hdmi', 'telly'], ['dp', 'DisplayPort'], ['eyefone', 'eyeFone'], ['nokia', '80%']]) {   // the wrong ones
    await tap(page, 'act:trycharger:' + id);
    expect(await dialogText(page)).toContain(says);
    await ok(page);
  }
  expect(await page.evaluate(() => [chargerBars(), S.flags.phoneDead])).toEqual([0, true]);
  await tap(page, 'act:trycharger:usb'); await idle(page);               // the right one: it fills up, bar by bar
  await page.waitForFunction(() => chargerBars() > 2 && chargerBars() < 9);
  await page.evaluate(() => act('chargeraway'));
  expect(await page.evaluate(() => S.screen)).toBe('charger');           // not till it's full
  await page.waitForFunction(() => !S.flags.phoneDead);
  expect(await page.evaluate(() => chargerBars())).toBe(10);
  await page.locator('#stage .phoneoff').click({ position: { x: 20, y: 300 } });   // tap off the phone: back to the computer
  expect(await page.evaluate(() => S.screen)).toBe('pc');
  await page.evaluate(() => { S.screen = 'room'; render(); });
  expect(await page.evaluate(() => [!!S.flags.phoneDead, leadOpen('charge')])).toEqual([false, false]);
  expect(await page.evaluate(() => findJob('phone').status)).toBe('done');
  await expect(page.locator('.hs[data-go="pc"]')).toHaveCount(1);
  expect(await page.evaluate(() => [leadOpen('wheel-yard'), leadOpen('wheel-shop')])).toEqual([true, true]);
  // your car's not in the garage; in town you drive hers
  await page.evaluate(() => { S.screen = 'garage'; render(); });
  await expect(page.locator('.hs[data-go="dash"]')).toHaveCount(0);
  await page.evaluate(() => { goTo('dash'); });
  expect(await dialogText(page)).toContain('on a flat');
  await ok(page);
  // a wheel from Worn Out and Tired
  const money = await page.evaluate(() => S.money);
  await goPlace(page, 'Worn Out and Tired'); await talk(page);
  expect(await dialogText(page)).toContain('part-worn');
  await ok(page);
  expect(await page.evaluate(() => carryingTyre())).toBe(true);         // you carry it out…
  await page.evaluate(() => { act('leave'); });
  await tap(page, 'city'); await idle(page);
  expect(await page.evaluate(() => carryingTyre())).toBe(false);        // …and into her car
  expect(await page.evaluate(() => [S.inv.wheel, S.money])).toEqual(['Worn Out and Tired', money - 35]);
  // back to Mill Lane in her car, and fit it
  await page.evaluate(() => { S.screen = 'home'; S.place = null; S.anger = 10; render(); });
  await ridesWithHer(page, false);                                      // she walks out and drives you (again: the first time was to the shop)
  await tap(page, 'act:toroad'); await idle(page);                       // your blue car, flashing on the map
  expect(await page.evaluate(() => [S.screen, S.road.watching])).toEqual(['roadside', true]);   // a wheel to fit: she gets out to watch
  await tap(page, 'act:wifewatch');
  expect(await dialogText(page)).toContain('wobble');
  await ok(page);
  await tap(page, 'act:roadtyre');                                           // tap the flat tyre: the wheel goes on
  expect(await dialogText(page)).toContain('spare is still flat');
  await page.locator('.dlg').click();
  expect(await dialogText(page)).toContain("Don't go to the pub");       // her last word…
  await page.locator('.dlg').click();
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('liftoff');  // …and off she drives
  await idle(page);
  expect(await page.evaluate(() => [S.screen, S.road, findJob('tyre').status, S.flags.punctured])).toEqual(['roadside', null, 'done', true]);
  await expect(page.locator('.acts button')).toHaveCount(0);
  await tap(page, 'act:roadhome'); await idle(page);                     // get in your own car, and drive it home
  expect(await page.evaluate(() => S.screen)).toBe('home');
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

// ---------- the manuals shelf: the game box ----------
test('a thicker game box on the manuals shelf: pull it down for the title and a picture, and you moan about point and click games; tap off it and it goes back', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'shelf'; render(); });
  const [boxWide, bookWide] = await page.evaluate(() => [bookAt(GAME_BOX)[3], bookAt(0)[3]]);
  expect(boxWide).toBeGreaterThan(bookWide * 2);                           // thicker than the books
  await expect(page.locator('.spine', { hasText: 'MONKEY ISLAND' })).toHaveCount(1);
  await tap(page, 'act:book:' + await page.evaluate(() => GAME_BOX));
  expect(await dialogText(page)).toContain('tedious');
  await expect(page.locator('.gamebox')).toContainText('The Secret of');
  await expect(page.locator('.gamebox')).toContainText('MONKEY ISLAND');
  await expect(page.locator('.gamebox')).toContainText('1990');
  await expect(page.locator('.gamebox .pic')).toBeVisible();
  await expect(page.locator('.book')).toHaveCount(0);                      // it doesn't open like a book
  // what you say doesn't cover the box
  const box = await page.locator('.gamebox').boundingBox(), words = await page.locator('.dlg').boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(words.y + 1);
  await ok(page);
  await expect(page.locator('.gamebox')).toBeVisible();                    // still looking at it…
  await page.locator('.bookoff').click({ position: { x: 5, y: 200 } });    // …till you tap off it
  await idle(page);
  expect(await page.evaluate(() => S.book)).toBe(null);
  await expect(page.locator('.spine', { hasText: 'MONKEY ISLAND' })).toHaveCount(1);   // back on the shelf
  expect(errors).toEqual([]);
});

// ---------- the flat spare: a screw in it, so it has to be replaced ----------
test('the flat spare has a screw in it: Worn Out and Tired puts a new tyre on it (ready tomorrow), or the Scrap Yard has one off a wreck', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  // fixed the puncture: the spare is still flat, and that's the next job
  await page.evaluate(() => { job('tyre', 'Sort out the flat tyre', null); S.road = { spare: true, walked: true }; S.spare = 'flat'; S.flags.punctured = true; S.inv.wheel = 'Worn Out and Tired'; S.screen = 'roadside'; render(); });
  await tap(page, 'act:roadtyre');                                           // tap the flat tyre: the wheel goes on
  expect(await dialogText(page)).toContain('screw in it');
  await ok(page);
  expect(await page.evaluate(() => [findJob('spare').status, leadOpen('spare-yard'), leadOpen('spare-shop')])).toEqual(['open', true, true]);
  // in the boot: the screw
  await page.evaluate(() => { S.screen = 'boot'; render(); });
  await tap(page, 'act:look:Spare wheel');
  expect(await dialogText(page)).toContain('screw in the tread');
  await ok(page);
  // Worn Out and Tired: a new tyre on it, tomorrow
  await page.evaluate(() => { S.mins = 10 * 60; });
  const money = await page.evaluate(() => S.money);
  await goPlace(page, 'Worn Out and Tired');
  for (let n = 0; n < 2; n++) {                                          // you didn't bring it in: he says the same every time
    await talk(page);
    expect(await dialogText(page)).toContain('bring it in');
    await ok(page);
  }
  expect(await page.evaluate(() => [S.spare, S.money])).toEqual(['flat', money]);
  await page.evaluate(() => { act('counteroff'); act('leave'); }); await idle(page);   // out to the car for it
  await tap(page, 'act:sparefetch');
  expect(await dialogText(page)).toContain('heave it out');
  await ok(page);
  await page.locator('.hs[data-go="act:enter"]').click(); await idle(page);
  await page.locator('.hs[data-go="act:talk"]').click();                 // he walks over with it, and hands it across
  await page.waitForFunction(() => ANIM && ANIM.kind === 'tyrehand');
  expect(await page.evaluate(() => TYRE_HAND.give)).toBe(true);
  expect(await dialogText(page)).toContain('Ready tomorrow');
  await ok(page);
  expect(await page.evaluate(() => [S.spare, S.spareOut, S.money])).toEqual(['away', false, money - 35]);
  await talk(page);
  expect(await dialogText(page)).toContain('I said tomorrow');
  await ok(page);
  await page.evaluate(() => { S.day += 1; S.mins = 10 * 60; S.counter = null; render(); });
  await page.locator('.hs[data-go="act:talk"]').click();                 // and he hands it back
  await page.waitForFunction(() => ANIM && ANIM.kind === 'tyrehand');
  expect(await page.evaluate(() => TYRE_HAND.give)).toBe(false);
  expect(await dialogText(page)).toContain('New tyre on it');
  await ok(page);
  expect(await page.evaluate(() => [S.spare, S.spareOut, findJob('spare').status, !!S.flags.spareJinx])).toEqual(['good', true, 'done', false]);
  expect(errors).toEqual([]);
});

test('mend the spare before you ever get a flat: you drive off straight into a puncture; the good spare goes on, you drive off, and get another flat', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  // look at it in the boot: flat already, and on the list
  await page.evaluate(() => { S.screen = 'boot'; render(); });
  await tap(page, 'act:look:Spare wheel');
  expect(await dialogText(page)).toContain('before you need it');
  await ok(page);
  expect(await page.evaluate(() => [S.spare, findJob('spare').status])).toEqual(['flat', 'open']);
  // at the tyre shop, waiting for you, mended
  await page.evaluate(() => { S.day = 3; S.mins = 10 * 60; visit(TYRE_SHOP); DIALOG = null; S.inside = true; S.spare = 'away'; S.spareReady = 3; render(); });
  expect(await page.evaluate(() => { PUNCTURE_CHANCE = 1; const got = punctureOnTheWayHome(); PUNCTURE_CHANCE = 0; return got; })).toBe(false);   // none while it's in there
  await talk(page); await ok(page);
  expect(await page.evaluate(() => [S.spare, S.flags.spareJinx])).toEqual(['good', true]);
  // drive off: bang
  await page.evaluate(() => { act('counteroff'); act('leave'); }); await idle(page);
  await tap(page, 'city');
  expect(await dialogText(page)).toContain('good spare');
  await ok(page);
  expect(await page.evaluate(() => [S.screen, !!S.road, S.spareOut])).toEqual(['roadside', true, false]);
  await page.evaluate(() => { act('roadspare'); });
  expect(await dialogText(page)).toContain('good spare on');
  expect(await page.evaluate(() => [S.spare, S.road.spareOn])).toEqual(['flat', true]);   // the flat one's in the boot now
  await page.locator('.dlg').click();
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('sparedrive');   // off you go…
  await page.waitForFunction(() => ANIM && ANIM.kind === 'flatdrive');       // …along the lane, bang, and you stop again
  expect(await dialogText(page)).toContain('ANOTHER one');
  await ok(page);
  expect(await page.evaluate(() => [S.screen, S.road, FLAT_DRIVE])).toEqual(['roadside', { spare: false, walked: false, second: true }, null]);
  await page.evaluate(() => { act('roadspare'); });
  expect(await dialogText(page)).toContain('went flat ten minutes ago');
  await ok(page);
  // a wheel fitted: the spare's on the list again
  await page.evaluate(() => { S.road.walked = true; S.inv.wheel = TYRE_SHOP; act('fitwheel'); });
  await ok(page);
  expect(await page.evaluate(() => [findJob('spare').status, leadOpen('spare-shop'), S.flags.punctured])).toEqual(['open', true, true]);
  // mended again: no second puncture
  await page.evaluate(() => { spareMended('again'); S.screen = 'place'; S.place = TYRE_SHOP; });
  expect(await page.evaluate(() => [!!S.flags.spareJinx, spareJinxed()])).toEqual([false, false]);
  expect(errors).toEqual([]);
});

test('an old save with the Tyre Place in it opens with its new name', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const place = await page.evaluate(() => { S.place = 'Tyre Place'; S.screen = 'place'; save(); load(); return S.place; });
  expect(place).toBe('Worn Out and Tired');
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
  expect(await page.evaluate(() => [carryingTyre(), S.counter])).toEqual([true, null]);   // he handed it over: you carry it out
  await page.evaluate(() => { act('leave'); });
  await tap(page, 'city'); await idle(page);
  expect(await page.evaluate(() => carryingTyre())).toBe(false);        // …and into the car
  expect(errors).toEqual([]);
});

test('the Scrap Yard: the door to the scrap cars is always there, whatever else is going on; and back to the office', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  for (const state of ['', "S.spare = 'flat'; spareJob();", "S.flags.punctured = true; S.road = { spare: true, walked: true };"]) {
    await page.evaluate(code => { DIALOG = null; new Function(code)(); S.mins = 10 * 60; S.yardSlot = { day: S.day, from: 10 * 60 }; S.place = YARD; S.inside = true; S.spot.place = [105, 140]; show('place'); }, state);
    await tap(page, 'act:yardcars'); await idle(page);
    expect(await page.evaluate(() => S.screen)).toBe('yard');
    await tap(page, 'act:yardoffice'); await idle(page);
    expect(await page.evaluate(() => [S.screen, S.inside, S.place])).toEqual(['place', true, 'Scrap Yard']);
  }
  expect(errors).toEqual([]);
});

test('ringing the recovery: her words are in a bubble from the phone, in her voice; yours in your own', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 10 * 60; puncture(); });
  await ok(page);
  await page.evaluate(() => { window.PITCHES = []; chatter = (n, pitch) => PITCHES.push(pitch); show('phone'); act('recovery'); });
  await expect(page.locator('.dlg.bubble')).toContainText('number one in the queue');
  await page.locator('.dlg').click();
  await expect(page.locator('.dlg.bubble')).toContainText('got a puncture');   // you
  expect(await page.evaluate(() => PITCHES)).toEqual([290, 120]);       // a woman's voice, then yours
  expect(errors).toEqual([]);
});

test('a wheel from the Scrap Yard: he hands it over the counter, and you carry it out to her car, like at Worn Out and Tired', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('tyre', 'Sort out the flat tyre', null); S.road = { spare: true, walked: true }; S.flags.punctured = true; S.mins = 10 * 60; S.yardSlot = { day: S.day, from: 10 * 60 }; });
  const money = await page.evaluate(() => S.money);
  await goPlace(page, 'Scrap Yard');
  await page.evaluate(() => { window.HANDED = 0; const real = handTyre; handTyre = give => { HANDED++; real(give); }; });
  await talk(page);
  expect(await dialogText(page)).toContain('Tenner');
  expect(await page.evaluate(() => [HANDED, S.inv.wheel, S.money, carryingTyre()])).toEqual([1, 'Scrap Yard', money - 10, true]);   // in your arms
  await ok(page);
  await page.evaluate(() => { act('leave'); });
  await tap(page, 'city'); await idle(page);
  expect(await page.evaluate(() => carryingTyre())).toBe(false);        // and into her car
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
    const said = await dialogText(page);
    expect(said).toContain(words);
    expect(said).toContain(no);
    await ok(page);
    expect(await page.evaluate(k => [!!S.inv[k], S.junked.includes(k), !!S.flags.fits], id)).toEqual([false, true, false]);   // …no good: into the parts box
  }
  expect(errors).toEqual([]);
});

test('the "universal" sensor off a parts shop shelf: bought, taken from the garage shelf to the bench, tried, no good; one of two is left', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await benchReady(page);
  await expect(page.locator('.acts button[data-act="pick:uni-sensor"]')).toHaveCount(0);   // not till you've bought one
  await page.evaluate(() => { S.mins = 10 * 60; S.money = 200; S.bought = { [UNIVERSAL]: { kind: 'box', n: 1 } }; });   // one from before, too
  await goPlace(page, 'Halfords Car Parts');
  await tap(page, 'act:enter');
  await tap(page, 'act:shelfzoom:0');
  await tap(page, 'act:shelfitem:0:7');                                // the universal sensor
  await goBack(page);
  await tap(page, 'act:checkout');
  expect(await dialogText(page)).toContain('"Universal" sensor');
  await ok(page);
  expect(await page.evaluate(() => [S.bought[UNIVERSAL].n, leadOpen('try-uni-sensor')])).toEqual([2, true]);
  // the garage shelf: to the bench
  await page.evaluate(() => { S.screen = 'stores'; render(); });
  const k = await page.evaluate(() => storeList().findIndex(r => r[0] === UNIVERSAL));
  await tap(page, 'act:storelook:' + k);
  await choose(page, 'Take it to the workbench');
  expect(await page.evaluate(() => S.screen)).toBe('bench');
  // tried: nine rings, none of them right
  await page.locator('.acts button[data-act="pick:uni-sensor"]').click();
  const no = await page.evaluate(() => SENSORS['uni-sensor'].no);
  await expect(page.locator('.partno')).toContainText(no);
  expect(await dialogText(page)).toContain('name of the company');
  await ok(page);
  expect(await page.evaluate(() => [S.bought[UNIVERSAL].n, S.junked.includes('uni-sensor'), leadOpen('try-uni-sensor'), !!S.flags.fits])).toEqual([1, true, false, false]);
  // the other one: the same, and then there are none
  await page.locator('.acts button[data-act="pick:uni-sensor"]').click(); await ok(page);
  expect(await page.evaluate(() => boughtOne(UNIVERSAL))).toBe(false);
  await expect(page.locator('.acts button[data-act="pick:uni-sensor"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the Pound Shop man: everything is priced in pounds', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 10 * 60; });
  await goPlace(page, 'Pound Shop'); await talk(page);
  expect(await dialogText(page)).toContain('Yes, the Pound Shop. Everything is priced in pounds.');
  expect(errors).toEqual([]);
});

test('Tameside Transmissions and Voltz Auto Electric are next door to each other, and each sends you next door to the other', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  expect(await page.evaluate(() => placeIndex('Voltz Auto Electric') - placeIndex('Tameside Transmissions'))).toBe(1);
  expect(await page.evaluate(() => placeIndex('Voltz Auto Electric') % 7)).toBeGreaterThan(0);   // on the same row of the map
  expect(await page.evaluate(() => [PLACES.length, new Set(PLACES.map(p => p[0])).size])).toEqual([42, 42]);   // nobody lost or doubled
  await page.evaluate(() => { S.mins = 10 * 60; readCodes('test'); });
  await ok(page);
  await goPlace(page, 'Tameside Transmissions'); await talk(page);
  expect(await dialogText(page)).toContain('next door to Voltz Auto Electric');
  await ok(page);
  expect(await page.evaluate(() => leadOpen('voltz'))).toBe(true);
  await goPlace(page, 'Voltz Auto Electric'); await talk(page);
  expect(await dialogText(page)).toContain('next door to Tameside Transmissions');
  expect(errors).toEqual([]);
});

test('every sensor has a plug on the end of its wires, except the two with bare wires', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const plugged = await page.evaluate(() => {
    const out = {};
    const real = sensorPlug;
    let plugs = 0;
    sensorPlug = (x, y) => { plugs++; real(x, y); };
    for (const id of SENSOR_ORDER) { plugs = 0; drawSensor(id, true, [200, 200], 0); out[id] = plugs; }
    return out;
  });
  for (const [id, plugs] of Object.entries(plugged)) expect(plugs, id).toBe(['part-p4l', 'lot-cut'].includes(id) ? 0 : 1);
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
  expect(await dialogText(page)).toContain('It fits');
  await ok(page);
  expect(await page.evaluate(() => [S.flags.fits, S.flags.fittedPart, findJob('new-sensor').status])).toEqual([true, 'lot-cut', 'done']);
  expect(errors).toEqual([]);
});

test('only one old plug: solder it onto the Parts 4 Less sensor and the job lot one can\'t have it; an older save with the plug cut still solders the job lot one', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await benchReady(page);
  await page.evaluate(() => { S.inv['part-p4l'] = true; S.inv['lot-cut'] = true; S.flags.linedUp = true; render(); });
  await page.locator('.acts button[data-act="pick:part-p4l"]').click();
  expect(await dialogText(page)).toContain('Plug sold separately');
  await ok(page);
  await page.evaluate(() => { act('soldergo'); }); await ok(page);        // the plug's cut off, for this one
  await page.evaluate(() => { S.screen = 'bench'; render(); });
  await page.locator('.acts button[data-act="pick:lot-cut"]').click();
  expect(await dialogText(page)).toContain('going on the Parts 4 Less sensor');
  await ok(page);
  expect(await page.evaluate(() => { S.flags.soldered = true; return [sensorFit('part-p4l'), sensorFit('lot-cut')]; })).toEqual(['right', 'cut']);
  // a save from before: cut and soldered, with nothing saying which
  expect(await page.evaluate(() => { delete S.flags.solderFor; S.flags.cutSeen = true; return [sensorFit('part-p4l'), sensorFit('lot-cut')]; })).toEqual(['cut', 'right']);
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
  await tap(page, 'act:screw:3');
  await page.waitForFunction(() => ANIM && ANIM.kind === 'still');
  await expect(page.locator('.still img')).toHaveAttribute('src', 'stills/snap.svg');
  expect(await dialogText(page)).toContain('SNAP');
  expect(errors).toEqual([]);
});

test('lost it twice: tea and sleep no longer calm you down; only a pint at the pub does, and then tea works again', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.flags.kicksSincePint = 2; S.anger = 60; });   // you've lost it twice since your last pint
  // tea: poured down the sink
  await goRoom(page);
  await tap(page, 'act:tea');
  expect(await dialogText(page)).toContain('You need a pint');
  await ok(page);
  expect(await page.evaluate(() => S.anger)).toBe(60);
  // sleep: awake all night, fuming
  await tap(page, 'act:bed');
  expect(await dialogText(page)).toContain('fuming');
  await ok(page);
  expect(await page.evaluate(() => S.anger)).toBe(60);
  // the pub: a pint does it
  await page.evaluate(() => { S.mins = 18 * 60; S.money = 100; S.flags.pubCall = S.day; });
  await goPlace(page, 'The Hesketh Tavern');
  await tap(page, 'act:enter'); await idle(page);
  await lagers(page, 1);
  expect(await dialogText(page)).toContain('MUCH better');
  await ok(page);
  expect(await page.evaluate(() => [fedUp(), S.anger])).toEqual([false, 18]);   // 60, less 12 for the pint and 30 for the relief
  // and tea works again
  await page.evaluate(() => { S.anger = 50; });
  await goRoom(page);
  await tap(page, 'act:tea');
  expect(await dialogText(page)).not.toContain('pint');
  await ok(page);
  expect(await page.evaluate(() => S.anger)).toBeLessThan(50);
  expect(errors).toEqual([]);
});

test('so many cups of tea and nights, and they stop working: then only the pub will do, and a pint starts them working again', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const drop = async run => page.evaluate(code => { S.anger = 60; ANIM = null; DIALOG = null; STILL = null; new Function(code)(); const d = 60 - S.anger; ANIM = null; return d; }, run);   // how much it calms you
  for (let k = 0; k < 5; k++) expect(await drop("act('tea')")).toBe(15);   // five teas…
  expect(await drop('goToBed()')).toBe(20);                               // …and a night: all of them work
  expect(await page.evaluate(() => DIALOG.body)).toContain('a bit better');
  expect(await drop("act('tea')")).toBe(0);                               // that was the last: tea…
  expect(await page.evaluate(() => DIALOG.body)).toContain('You need a pint');
  expect(await drop('goToBed()')).toBe(0);                                // …and sleep don't touch it
  expect(await page.evaluate(() => DIALOG.body)).toContain('You need a pint');
  await page.evaluate(() => pintCures());                                 // a pint at the pub
  expect(await drop("act('tea')")).toBe(15);
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
test('get the multimeter out on the fuse box: point at a fuse and the probes go on it; 0 and a tone if good, 1 if blown; all of them and that is the lot', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('meaning', 'What does P0705 mean?', null); lead('meaning', 'fuses', 'Check your fuses first', 'MrTorque', 'tbh', 'fuseZoom'); S.flags.knowF23 = S.flags.f23Checked = S.flags.meterOK = true; S.screen = 'fuseZoom'; render(); });
  await act(page, 'Get the multimeter out');
  expect(await page.evaluate(() => meterOut())).toBe(true);
  await page.locator('.hs[data-go="act:testfuse:5"]').hover();          // just point at it: no tap
  await page.waitForFunction(() => S.meterFuse === 5);
  expect(await page.evaluate(() => [S.meterFuse, meterReading(5), S.fusesChecked])).toEqual([5, '0', [5]]);
  await page.locator('.hs[data-go="act:testfuse:17"]').hover();
  await page.waitForFunction(() => S.meterFuse === 17);
  expect(await page.evaluate(() => [meterReading(17), !!DIALOG])).toEqual(['1', false]);   // a 1 on the screen; no message in the way
  expect(await page.evaluate(() => JSON.stringify(findJob('meaning').notes))).toContain('F17');
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
  await walkHome(page, 0);
  await page.waitForFunction(() => ANIM && ANIM.kind === 'still');      // part way along: the still
  expect(await page.evaluate(() => [S.screen, WALK_PART[1] === WALK_SPLASH])).toEqual(['walkhome', true]);
  await page.waitForFunction(() => ANIM && ANIM.kind === 'walkhome');   // then the rest of the walk
  expect(await page.evaluate(() => WALK_PART[0] === WALK_SPLASH && WALK_PART[1] === 1)).toBe(true);
  await upToTheHouse(page);
  await findHer(page);
  expect(await dialogText(page)).toContain('SOAKED');                   // then home: she's in the garden
  expect(await page.evaluate(() => S.screen)).toBe('garden');
  expect(errors).toEqual([]);
});

test('the clamp: the wife drives you about in hers, moaning from the car; every third moan is what to do; taps never get past the little films', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 10 * 60; S.fine = { day: S.day, paid: false, clamped: true }; S.screen = 'home'; render(); });
  await tap(page, 'city');                                              // her car
  await page.waitForFunction(() => ANIM && ANIM.kind === 'liftout');
  await page.mouse.click(600, 300);                                     // tapping doesn't skip it
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('liftout');
  await dialogText(page);
  await page.locator('.dlg').click(); await idle(page);
  expect(await page.evaluate(() => [S.screen, withWife()])).toEqual(['city', true]);
  const moans = await page.evaluate(() => [1, 2, 3, 4, 5, 6].map(() => { const a = S.anger = 10; const text = nextMoan(); return [text, S.anger - a]; }));
  for (const k of [2, 5]) { expect(moans[k][0]).toContain('Post Office'); expect(moans[k][1]).toBe(0); }   // what to do: no anger
  for (const k of [0, 1, 3, 4]) expect(moans[k][1]).toBe(5);            // a moan: winds you up
  // a bubble from her car, on the map and outside a shop; not in your way; gone by itself
  await page.evaluate(() => { window.NO_MOANS = false; MOAN = { text: null, at: performance.now() - 60000 }; });
  await expect(page.locator('.moan')).toHaveCount(1, { timeout: 5000 });
  expect(await page.locator('.moan').evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
  await expect(page.locator('.moan')).toHaveCount(0, { timeout: 9000 });
  await page.evaluate(() => { window.NO_MOANS = true; visit('Tool Shop'); window.NO_MOANS = false; MOAN = { text: null, at: performance.now() - 60000 }; });
  await expect(page.locator('.moan')).toHaveCount(1, { timeout: 5000 });
  expect(await page.evaluate(() => { S.road = { spare: true, walked: true }; S.inv.wheel = null; const a = whatToDo(); S.inv.wheel = 'Scrap Yard'; return [a.includes('wheel'), whatToDo().includes('Mill Lane')]; })).toEqual([true, true]);
  expect(errors).toEqual([]);
});

test("when you need the bus the wife's car has gone from the drive", async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const herCar = () => page.evaluate(() => { S.screen = 'home'; const real = isoCar; let n = 0; isoCar = (x, y, s, col, o) => { if (col === WIFE_CAR) n++; real(x, y, s, col, o); }; render(); isoCar = real; return n > 0; });
  expect(await herCar()).toBe(true);
  await page.evaluate(() => { carLeftAt('The Hesketh Tavern'); });
  expect(await herCar()).toBe(false);
  await expect(page.locator('.hs[data-go="act:wifecar"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("the alarm: with a fine to pay and the Post Office queue seen, bed offers 5 am; the wife's car has its lights on at night, and leaves no trail of them", async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 22 * 60; S.fine = { day: S.day, paid: false, clamped: false }; });
  expect(await page.evaluate(() => alarmOffered())).toBe(false);         // not tried the Post Office yet
  await page.evaluate(() => { S.flags.poTried = true; S.screen = 'room'; render(); });
  const day = await page.evaluate(() => S.day);
  await page.evaluate(() => act('bed'));
  await page.locator('.dlg button', { hasText: 'Set the alarm for 5 am' }).click();
  expect(await dialogText(page)).toContain('The alarm');
  await ok(page);
  expect(await page.evaluate(() => [S.day, S.mins, alarmWentOff()])).toEqual([day + 1, 5 * 60, true]);
  // clamped: she'll still take you, at five, and say so
  await page.evaluate(() => { S.fine.clamped = true; S.screen = 'home'; render(); });
  await tap(page, 'city');
  expect(await dialogText(page)).toContain('FIVE');
  // at home, parked up: both cars' lights are off; out in hers, they're on
  expect(await page.evaluate(() => { DIALOG = null; HER_RIDE.at = null; S.mins = 21 * 60; render(); return [lightsOn(), OUR_LAMPS.length, OUR_LAMPS.every(l => l.off)]; })).toEqual([true, 4, true]);
  expect(await page.evaluate(() => { S.place = 'Tool Shop'; S.inside = false; S.screen = 'place'; lift().out = true; render(); const out = [OUR_LAMPS.length, OUR_LAMPS.some(l => l.off)]; S.place = null; S.screen = 'home'; render(); return out; })).toEqual([2, false]);
  // driving along: no trail of lit headlights left behind
  expect(await page.evaluate(() => { const n = OUR_LAMPS.length; moment('homeride', 60000); RIDE = { kind: 'taxi', home: false }; const real = MOMENTS.homeride; MOMENTS.homeride = p => isoCar(p * 100, 150, 1, WIFE_CAR, { alongX: true, shape: 'city' }); for (let k = 0; k < 20; k++) drawFrame(performance.now()); MOMENTS.homeride = real; finishMoment(); return OUR_LAMPS.length <= n; })).toBe(true);
  expect(errors).toEqual([]);
});

// ---------- the fine: letters, the clamp, a taxi, paying at the Post Office ----------
test('the fine comes in the post; unpaid, a reminder (£450), then in two days the car is clamped with a note; the wife drives you to the Post Office; pay; home, and a man takes the clamp off', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { fineIssued(); S.screen = 'home'; render(); });
  // the next morning: the letter in the mailbox
  await page.evaluate(() => { S.day += 1; S.mins = 7 * 60; pass(70); render(); });
  await expect(page.locator('.hs[data-go="act:letters"]')).toHaveCount(1);
  await tap(page, 'act:letters');
  await expect(page.locator('.letter')).toContainText('FIXED PENALTY');
  await expect(page.locator('.letter')).toContainText('£300');
  await goBack(page);                                                    // ◀ Back puts it down
  await expect(page.locator('.hs[data-go="act:letters"]')).toHaveCount(0);   // read: not in the mailbox any more…
  await page.evaluate(() => { S.screen = 'room'; render(); });
  await tap(page, 'act:rack');                                           // …it's in the rack on the desk
  await expect(page.locator('.letter')).toContainText('FIXED PENALTY');
  await page.evaluate(() => { S.screen = 'home'; render(); });
  expect(await page.evaluate(() => fineOwed())).toBe(300);
  // the next day: the reminder, and it's £450
  await page.evaluate(() => { S.day += 1; S.mins = 7 * 60; pass(70); render(); });
  expect(await page.evaluate(() => carClamped())).toBe(false);
  expect(await page.evaluate(() => [fineOwed(), S.letters.map(l => l.id).includes('finelate')])).toEqual([450, true]);
  // two days from the letter: clamped; the note on the windscreen
  await page.evaluate(() => { S.day += 1; S.mins = 7 * 60; pass(70); S.screen = 'home'; render(); });
  expect(await page.evaluate(() => [carClamped(), fineOwed()])).toEqual([true, 550]);
  await tap(page, 'act:clampnote');
  expect(await dialogText(page)).toContain('IMMOBILISED');
  await ok(page);
  await expect(page.locator('.hs[data-go="city"]')).toHaveCount(1);     // only her car goes into town
  // the wife drives you into town; at the Post Office after it's opened, no skipping the queue
  const money = await page.evaluate(() => { S.money = 1000; S.mins = 11 * 60; render(); return S.money; });
  await page.evaluate(() => { S.screen = 'garage'; render(); S.screen = 'home'; render(); });
  await ridesWithHer(page, true);
  await goPlace(page, 'Post Office'); await tap(page, 'act:enter');
  expect(await dialogText(page)).toContain('get here earlier');
  await ok(page);
  expect(await page.evaluate(() => [findJob('fine').notes.some(n => JSON.stringify(n).includes('before it opens')), S.flags.poTried])).toEqual([true, true]);   // in the notebook
  await talk(page);
  expect(await dialogText(page)).toContain('Same queue');
  await ok(page);
  expect(await page.evaluate(() => [S.fine.paid, withWife()])).toEqual([false, true]);
  // there all night in her car: in the queue before it opens, so no queue, and it's paid
  await page.evaluate(() => { S.day += 1; S.mins = 8 * 60; S.inside = false; S.po = { day: S.day, arrived: 0 }; S.mins = 9 * 60; render(); });
  await talk(page);
  expect(await dialogText(page)).toContain('Window 3');
  await choose(page, 'Pay £550');
  expect(await page.evaluate(() => [S.fine.paid, findJob('fine').status, S.fine.unclamp])).toEqual([true, 'done', true]);
  expect(await page.evaluate(() => [carClamped(), inWifesCar()])).toEqual([false, true]);   // paid, but you're still out in hers
  await ok(page);
  // home in her car: a man's taking the clamp off
  await page.evaluate(() => { S.inside = false; S.screen = 'city'; render(); goTo('home'); });
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('unclamp');
  expect(await page.evaluate(() => typeof towTruck === 'function' && TOW_AT[1] > 140)).toBe(true);   // his tow truck, out in the road
  expect(await dialogText(page)).toContain('taking the clamp off');
  await ok(page);
  expect(await page.evaluate(() => [carClamped(), inWifesCar(), S.fine.unclamp, S.money])).toEqual([false, false, false, money - 550]);
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
  await expect(page.locator('.acts button', { hasText: 'Fit the new headlight' })).toHaveCount(0);   // no button: tap the headlight under the bonnet, or the spare on the shelf
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
  await page.evaluate(() => { S.flags.torchLit = true; S.flags.screwsSpilt = true; ACTIONS.search('the shelves'); });
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
test('dead ends: the gearbox shows its bolts once you know what P0705 is (Old Ron knows, Dodgy Dave does not); a taxi you cannot afford, the wife pays; whatever has to be paid, she pays (and texts); no clamp while the car is stuck on Mill Lane; no jack once Paul has it', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  // the codes, but you don't know what P0705 is: the gearbox is just bolts; Old Ron at the pub knows, and then it's the sensor
  await page.evaluate(() => { S.flags.codes = true; job('meaning', 'What does P0705 mean?', 'light'); show('underZoom'); });
  expect(await page.evaluate(() => S.flags.sensorJob)).toBeFalsy();
  await expect(page.locator('.hs[data-go="act:bolt1"]')).toHaveCount(0);
  await page.evaluate(() => { S.mins = 19 * 60; S.place = 'The Hesketh Tavern'; S.inside = true; ACTIONS.punter(1); });
  expect(await dialogText(page)).not.toContain('selector sensor');            // Dodgy Dave doesn't know
  await ok(page);
  await page.evaluate(() => ACTIONS.punter(0));
  expect(await dialogText(page)).toContain('selector sensor');                // Old Ron does
  await ok(page);
  await page.evaluate(() => { S.inside = false; show('underZoom'); });
  expect(await page.evaluate(() => S.flags.sensorJob)).toBe(true);
  await expect(page.locator('.hs[data-go="act:bolt1"]')).toHaveCount(1);
  // a taxi you can't afford: the wife pays
  await page.evaluate(() => { S.fine = { day: S.day - 8, paid: false, clamped: true }; S.money = 5; });
  expect(await page.evaluate(() => [spend(TAXI_FARE, false, true), S.flags.wifePaid])).toEqual([true, 1]);
  // at the Post Office with not enough money: she pays the fine, and texts you about it
  await page.evaluate(() => { S.flags.cardBlocked = false; S.money = 5; S.place = 'Post Office'; payFineAtPost(); });
  await page.locator('.dlg button').first().click();
  expect(await dialogText(page)).toContain('That\'s paid');
  expect(await page.evaluate(() => [S.fine.paid, S.fine.unclamp, S.money, S.msgs[0].from, S.flags.wifePaid > 0])).toEqual([true, true, 5, 'The wife', true]);
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
  expect(await page.evaluate(() => { const xs = []; const real = isoCar; isoCar = (x, y, s, col, o) => { if (y === TAXI_LANE) xs.push(x); }; for (let p = 0.6; p <= 1; p += 0.02) MOMENTS.taxipub(p); isoCar = real; return xs.every((x, i) => !i || x >= xs[i - 1]); })).toBe(true);   // always forwards
  await page.waitForFunction(() => ANIM && ANIM.kind === 'homeride' && RIDE.kind === 'taxi' && RIDE.home, null, { timeout: 20000 });   // you see it drop you at home
  expect(await dialogText(page)).toContain('fetch it');                       // …then home
  expect(await page.evaluate(() => [S.screen, S.flags.carAt, carAway()])).toEqual(['home', 'The Hesketh Tavern', true]);
  await ok(page);
  // no car on the drive or in the garage
  expect(await page.evaluate(() => { const r = []; goTo('dash'); r.push(DIALOG && DIALOG.body); DIALOG = null; return r[0]; })).toContain('still outside');
  // the next morning: the bus into town, and there's the car
  await page.evaluate(() => { sleepUntilMorning(); S.screen = 'home'; render(); });
  await page.locator('.hs[data-go="city"]', { hasText: '' }).first().click();   // the bus stop (your car's not here)
  await page.waitForFunction(() => ANIM && ANIM.kind === 'homeride' && RIDE.kind === 'bus' && !RIDE.home, null, { timeout: 20000 });   // it comes, you get on, off it goes
  expect(await page.evaluate(() => ANIM.dur)).toBeLessThan(4000);          // quick: he's straight on
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
  await tap(page, 'act:screw:4'); await ok(page);                          // the back one: it shears
  expect(await page.evaluate(() => [S.flags.sheared, !!findJob('stub')])).toEqual([4, true]);
  await page.evaluate(() => { S.flags.sensorOut = true; S.flags.fits = true; S.flags.n3found = true; ACTIONS.fit(); });
  expect(await dialogText(page)).toContain('stub still in the box');      // not with the stub in
  await ok(page);
  await page.evaluate(() => { S.inv['extractor-cheap'] = true; render(); });
  await tap(page, 'act:stubmenu'); await page.locator('.dlg button', { hasText: 'cheap extractor' }).click();
  expect(await dialogText(page)).toContain('snaps');                       // the cheap one snaps, as on bolt 2
  await ok(page);
  await page.evaluate(() => { S.inv['extractor-good'] = true; render(); });
  await tap(page, 'act:stubmenu'); await page.locator('.dlg button', { hasText: 'proper extractor' }).click();
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
  // the dustpan and brush are always in the corner of the garage
  await page.evaluate(() => { show('garage'); });
  await tap(page, 'act:dustpan');
  expect(await dialogText(page)).toContain('Nobody has ever swept');
  await ok(page);
  // before you need one: just a jar of screws
  await page.evaluate(() => { show('stores'); ACTIONS.storelook(storeList().findIndex(i => i[0] === SCREW_JAR)); });
  expect(await dialogText(page)).toContain('None of them match');
  await ok(page);
  // the stub's out: the box won't go back on with two screws
  await page.evaluate(() => { Object.assign(S.flags, { boxOff: true, sensorOut: true, sheared: 3, stubOut: true, fits: true, n3found: true }); screwJob(); ACTIONS.fit(); });
  expect(await dialogText(page)).toContain('screw jar');
  await ok(page);
  // where they land: on the clear floor, never on (or behind) the car
  expect(await page.evaluate(() => { const bad = []; for (let k = 0; k < 160; k++) { const [x, y] = spillSpot(k); if (!floorClear(x, y)) bad.push(k); } return bad; })).toEqual([]);
  expect(await page.evaluate(() => [floorClear(55, 75), floorClear(50, 40), floorClear(120, 90)])).toEqual([false, false, true]);
  // take the jar down: it spills; sweep up
  await page.evaluate(() => { show('stores'); ACTIONS.storelook(storeList().findIndex(i => i[0] === SCREW_JAR)); });
  await page.locator('.dlg button', { hasText: 'Take the jar down' }).click();
  expect(await dialogText(page)).toContain('bottom falls out');
  await ok(page);
  // they stay on the garage floor (away and back too) till you get the dustpan and brush from the corner
  expect(await page.evaluate(() => [S.screen, screwsOnFloor(), leadOpen('dustpan'), storeList().some(r => r[0] === SCREW_JAR)])).toEqual(['garage', true, true, false]);
  await page.evaluate(() => { show('room'); show('garage'); });
  expect(await page.evaluate(() => { [ISO.ox, ISO.oy] = VIEW.garage; const pt = P(...spillSpot(3)); return [...img.data.slice((Math.round(pt[1]) * W + Math.round(pt[0])) * 4, (Math.round(pt[1]) * W + Math.round(pt[0])) * 4 + 3)].join() === C.steel.join(); })).toBe(true);
  await tap(page, 'act:dustpan'); await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('sweep');
  await act(page, 'Leave them for now'); await idle(page);              // leave them: still there
  expect(await page.evaluate(() => [S.screen, screwsOnFloor()])).toEqual(['garage', true]);
  await tap(page, 'act:dustpan'); await idle(page);
  await page.evaluate(() => { for (let y = 40; y <= 260; y += 10) for (let x = 24; x <= 456; x += 20) sweepMove(x, y); });   // over the whole floor
  expect(await dialogText(page)).toContain('Swept up');
  await ok(page);
  expect(await page.evaluate(() => [S.flags.jarSwept, S.screen, screwsOnFloor(), leadOpen('dustpan')])).toEqual([true, 'screwtray', false, false]);
  // the tray: a wrong one, then the right one
  await tap(page, 'act:trayscrew:2');
  expect(await page.evaluate(() => [S.screen, ANIM && ANIM.kind, SCREW_TRYING])).toEqual(['bench', 'screwTest', 2]);   // a wrong one: you see it tried as well
  expect(await dialogText(page)).toContain('too long');
  expect(await page.evaluate(() => S.screen)).toBe('screwtray');          // then back to the tray
  await ok(page);
  await tap(page, 'act:trayscrew:7');
  expect(await page.evaluate(() => [S.screen, ANIM && ANIM.kind])).toEqual(['bench', 'screwTest']);   // you see it go in the hole
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

test('every screw in the tray is drawn being tried, each in its own way, and ◀ Back still goes to where you came from', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const ways = await page.evaluate(() => {
    Object.assign(S.flags, { boxOff: true, sensorOut: true, n3found: true, jarSwept: true, stubOut: true, sheared: 3, fits: true, screws: [1, 2, 3, 4] });
    S.screen = 'bench'; show('screwtray');
    const drawn = [];
    for (let k = 0; k < TRAY.length; k++) {
      SCREW_TRYING = k;
      render();
      for (let p = 0; p <= 1; p += 0.05) MOMENTS.screwTest(p, p);           // (all the way through)
      drawn.push(TRAY[k][2][1]);
    }
    return drawn;
  });
  expect(ways.length).toBe(12);
  expect(ways.every(w => ['bind', 'spin', 'loose', 'big', 'fits'].includes(w))).toBe(true);
  expect(ways.filter(w => w === 'fits').length).toBe(1);
  await page.evaluate(() => { trayScrew(0); });
  expect(await dialogText(page)).toContain('wood screw');
  await ok(page);
  await goBack(page);
  expect(await page.evaluate(() => S.screen)).toBe('bench');              // one step back, as before
  expect(errors).toEqual([]);
});

test('the spanner drawer: proper spanners, 4 to 19 in order, and a gap for the 10', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const sizes = await page.evaluate(() => {
    const drawn = [], gaps = [];
    const [spanner, gap] = [drawSpanner, spannerGap];
    drawSpanner = (a, b, size) => { drawn.push([size, Math.hypot(b[0] - a[0], b[1] - a[1])]); spanner(a, b, size); };
    spannerGap = (a, b, size) => { gaps.push(size); gap(a, b, size); };
    S.screen = 'toolbox'; S.drawer = 2; render();
    return { drawn, gaps };
  });
  expect(sizes.drawn.map(d => d[0])).toEqual([4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  expect(sizes.gaps).toEqual([10]);
  for (let k = 1; k < sizes.drawn.length; k++) expect(sizes.drawn[k][1]).toBeGreaterThan(sizes.drawn[k - 1][1]);   // the bigger, the longer
  expect(errors).toEqual([]);
});

test('trying a replacement screw: the hole it goes in is empty (the sensor in or not, and in an old save)', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  // what colour is the middle of the snapped screw's hole, as the screw's about to go in?
  const hole = (n, flags) => page.evaluate(([k, more]) => {
    ANIM = null; DIALOG = null; QUEUE.length = 0;
    Object.assign(S.flags, { boxOff: true, sensorOut: true, n3found: true, jarSwept: true, screw3: false, stubOut: true, sheared: k, screwsTried: [], screws: [1, 2, 3, 4], fits: true }, more);
    screwJob();
    trayScrew(TRAY_RIGHT);
    [ISO.ox, ISO.oy] = [240, 64];
    const c = P(...BOX_SCREWS[k], 40).map(Math.round), i = (c[1] * W + c[0]) * 4;
    return [...BG.slice(i, i + 3)].join() === C.ink.join();
  }, [n, flags]);
  for (const n of [1, 2, 3, 4]) {
    expect(await hole(n, {})).toBe(true);
    expect(await hole(n, { fits: false })).toBe(true);
    expect(await hole(n, { screws: undefined })).toBe(true);               // an old save: which ones are out isn't known
  }
  // no sensor in the box yet: the screw comes out again
  expect(await page.evaluate(() => { S.flags.fits = false; return true; })).toBe(true);
  expect(await dialogText(page)).toContain('kept safe');
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

test('your own speech bubble at a counter close-up (the MOT tester) sits low down, not over them', async ({ page }) => {
  const errors = [];
  await start(page, errors, true);                                         // still in the MOT Test Centre
  await talk(page);
  expect(await page.evaluate(() => { const [x, y] = meHead(); return [atCounter(), y > H * 0.9, x < W * 0.3]; })).toEqual([true, true, true]);   // bottom left
  expect(errors).toEqual([]);
});

test('the phone torch is broken (and the phone stays open) even with a message still up behind it (as in the house); messages delete; the numbers are rows with a green phone button', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'room'; render(); });
  await page.click('.go[data-go="phone"]'); await idle(page);
  await page.evaluate(() => { DIALOG = { title: 'The wife', body: '"Husband."', options: [{ label: 'OK', run() {} }] }; });   // something said, still up
  await page.locator('[data-act="phonetorch"]').click();
  expect(await page.evaluate(() => [S.screen, !!DIALOG && DIALOG.body.includes('broken')])).toEqual(['phone', true]);   // broken; the phone stays open
  await page.evaluate(() => { DIALOG = null; render(); });
  // the numbers you know: one to a row, a name and a green phone button
  await expect(page.locator('.ph .c')).toHaveCount(4);
  await expect(page.locator('.ph .c').first()).toContainText('Gaz');
  await expect(page.locator('.ph .c .call[data-act="ring:Wife"]')).toHaveCount(1);
  // delete a message, and a missed call
  await page.evaluate(() => { S.msgs = [{ from: 'Gaz', body: 'U got my reader?', when: '9:05', read: false }, { from: 'Mum', body: 'Missed call', when: '9:00', read: false }]; render(); });
  await expect(page.locator('.ph .m')).toHaveCount(2);
  await page.locator('.ph .m .del').first().click();
  await expect(page.locator('.ph .m')).toHaveCount(1);
  await expect(page.locator('.ph .m')).toContainText('Missed call');
  await page.locator('.ph .m .del').first().click();
  await expect(page.locator('.ph .m')).toContainText('No messages');
  expect(errors).toEqual([]);
});

test("leaving a place for the town map (however you got there), the map is centred on it", async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.cam = { ox: -999, oy: -999 }; visit("Mate Gaz's"); DIALOG = null; S.inside = false; show('city'); });   // as if from a lead in the notebook
  const off = await page.evaluate(() => {
    const i = placeIndex("Mate Gaz's"), cx = (i % 7) * BLOCK + STREET + 35, cy = Math.floor(i / 7) * BLOCK + STREET + 35;
    [ISO.ox, ISO.oy] = [S.cam.ox, S.cam.oy];
    const p = P(cx, cy);
    return [Math.round(p[0] - 291), Math.round(p[1] - 172)];
  });
  expect(off).toEqual([0, 0]);
  expect(errors).toEqual([]);
});

test('with the card blocked, every till says: card declined, go to the bank to fix it', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.flags.cardBlocked = true; S.flags.cardWasBlocked = true; buy('extractor-cheap', 'Tool Shop'); });
  expect(await dialogText(page)).toContain('Go to the bank to fix it');
  expect(errors).toEqual([]);
});

test('under the bonnet both headlights show from above (the smashed one cracked): tap it to fit a spare; the snapped cheap extractor goes in the parts box', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { job('broke-headlight', 'Replace the smashed left headlight', null); S.screen = 'bonnet'; render(); });
  await expect(page.locator('.hs[data-go="act:lamp:left"]')).toHaveCount(1);
  await expect(page.locator('.hs[data-go="act:lamp:right"]')).toHaveCount(1);
  await expect(page.locator('.acts button', { hasText: 'headlight' })).toHaveCount(0);   // no button for it
  await tap(page, 'act:lamp:left');
  expect(await dialogText(page)).toContain('You need a new left one');      // no spare yet
  await ok(page);
  await page.evaluate(() => { addLamp('left'); render(); });
  await tap(page, 'act:lamp:left'); await ok(page);
  expect(await page.evaluate(() => brokeOpen('headlight'))).toBe(false);
  // the cheap extractor snaps on bolt 2: it goes in the parts box
  await page.evaluate(() => { S.inv['extractor-cheap'] = true; S.flags.b2round = true; ACTIONS.extract(); });
  await ok(page);
  expect(await page.evaluate(() => S.junked.includes('extractor-cheap'))).toBe(true);
  expect(errors).toEqual([]);
});

test('the playtest batch: tap the multimeter; a golf club in the parts box; tap the hedge; the notebook has no Back; skint: Mum & Dad or Paul help; the wife helps with what you are stuck on', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  // the toolbox: drawer 5, tap the multimeter itself
  await page.evaluate(() => { S.drawer = 5; show('toolbox'); });
  await expect(page.locator('.hs[data-go="act:meter"]')).toHaveCount(1);
  await expect(page.locator('.acts button', { hasText: 'multimeter' })).toHaveCount(0);
  // the hedge: tap it for a stick once you need one
  await page.evaluate(() => { S.flags.nutSeen = true; S.screen = 'home'; render(); });
  await tap(page, 'act:stick'); await ok(page);
  expect(await page.evaluate(() => S.inv.stick)).toBe(true);
  // or the golf club in the parts boxes
  await page.evaluate(() => { S.inv.stick = false; PILE = null; makePile(); const g = PILE.find(j => j.golf); takeGolfClub(g); });
  expect(await dialogText(page)).toContain('golf club');
  await ok(page);
  expect(await page.evaluate(() => [S.inv.stick, JUNK.some(j => /sandwich|receipt/.test(j[0]))])).toEqual([true, false]);
  // the notebook: no Back button; tap off it
  await page.evaluate(() => { S.screen = 'home'; render(); show('notebook'); });
  await expect(page.locator('#stage .back')).toHaveCount(0);
  await page.locator('.phoneoff[data-act="nbclose"]').click({ position: { x: 5, y: 5 } });
  expect(await page.evaluate(() => S.screen)).toBe('home');
  // skint: Mum sends £50 (not again for a few days); Paul twenty, once
  await page.evaluate(() => { S.money = 5; askMumForMoney('Mum'); });
  expect(await dialogText(page)).toContain("Don't tell your father");
  await ok(page);
  expect(await page.evaluate(() => S.money)).toBe(55);
  await page.evaluate(() => { S.money = 5; askPaulForMoney('Paul'); });
  expect(await dialogText(page)).toContain("Don't tell Mum");
  await ok(page);
  expect(await page.evaluate(() => [S.money, askPaulForMoney()])).toEqual([25, false]);
  // the wife: about the card
  expect(await page.evaluate(() => { S.flags.cardBlocked = true; return wifeTip(); })).toContain('bank');
  expect(errors).toEqual([]);
});

test("the wife's car lives on its own drive the other side of the house: she needs it, unless yours is stuck on Mill Lane", async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'home'; render(); });
  await tap(page, 'act:wifecar');
  expect(await dialogText(page)).toContain('I need it');
  expect(await page.evaluate(() => [DIALOG.at.join() === houseVoice().join(), DIALOG.voiced, voicePitch(DIALOG.title)])).toEqual([true, true, 290]);   // a bubble from the house, in her voice
  await ok(page);
  await page.evaluate(() => { S.road = { spare: true, walked: true }; render(); });   // yours on a flat, walked home
  await page.evaluate(() => { S.battery = { plus: true, minus: false }; });    // (even with the battery off in yours)
  await page.evaluate(() => { S.mins = 23 * 60 + 30; goTo('city'); });       // late: she's asleep, so no lift
  expect(await dialogText(page)).toContain('asleep');
  await ok(page);
  await page.evaluate(() => { S.mins = 10 * 60; render(); });
  await ridesWithHer(page, true);                                            // hers, highlighted like yours: she drives
  expect(await page.evaluate(() => { act('ring:Wife'); return DIALOG.body; })).toContain("in the car");   // she's not at home, she's outside
  await ok(page);
  // yours is on the map, its hazards flashing; tap it to go to it, and back into town again
  const flash = await page.evaluate(() => [0.1, 0.6].map(t => { ISO.ox = S.cam.ox; ISO.oy = S.cam.oy; brokenCarFlash(t); const [mx, my] = minimapCorner(); return IMG32[(my + MAP_LANE.mini[1] + 1) * W + mx + MAP_LANE.mini[0] + 1]; }));
  expect(flash[0]).not.toBe(flash[1]);                                       // orange, then not
  await tap(page, 'act:toroad'); await idle(page);
  expect(await page.evaluate(() => [S.screen, !!S.road.watching])).toEqual(['roadside', false]);   // no wheel to fit: she stays in the car
  await act(page, 'Into town'); await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('city');
  await page.evaluate(() => { S.road = null; render(); });                   // fixed: it's gone from Mill Lane
  await expect(page.locator('.hs[data-go="act:toroad"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the bank is in the grand building with the columns (where the library was); its old shop is boarded up', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  expect(await page.evaluate(() => [placeIndex('Bank') >= 0, placeIndex('Library (free Wi-Fi)'), placeIndex('BustBlockers') >= 0, !!PLACE_INFO['BustBlockers'].gone])).toEqual([true, -1, true, true]);
  await page.evaluate(() => { S.day = 7; S.mins = 11 * 60; S.place = 'Bank'; S.inside = false; show('place'); });
  expect(errors).toEqual([]);
});

test('anger: the wife being no help raises it, a tip does not; so does anything that gets you nowhere', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const rise = async run => page.evaluate(code => { S.anger = 10; DIALOG = null; ANIM = null; new Function(code)(); return S.anger - 10; }, run);   // how much it goes up
  await page.evaluate(() => { S.mins = 11 * 60; });
  expect(await rise('S.wifeTalks = 0; wifeLine()')).toBe(5);                 // scrap it
  expect(await rise('S.flags.mumMoneyDay = 1; S.wifeTalks = 5; wifeLine()')).toBe(5);   // just a remark
  expect(await rise('S.flags.cardBlocked = true; S.wifeTalks = 4; wifeLine(); S.flags.cardBlocked = false')).toBe(0);   // a real tip
  expect(await rise('gardenLine()')).toBe(5);
  expect(await rise('S.screen = "home"; act("wifecar")')).toBe(5);           // use your own
  expect(await rise('talk("Trusty Autos")')).toBe(4);                        // a garage that's no help
  expect(await rise(`S.flags.sparky = true; S.place = "Sparky's Auto Electrics"; talk(S.place)`)).toBe(4);   // "Still broken, mate."
  expect(await rise('talk("Pound Shop")')).toBe(4);                          // "Yes, the Pound Shop."
  expect(await rise('S.money = 100; talk("Police Station")')).toBe(4);
  expect(await rise('S.money = 100; talk("Bank")')).toBe(4);                 // "We're here for you."
  expect(await rise('S.place = "Bank"; S.day = 6; S.mins = 11 * 60; S.screen = "place"; S.inside = false; act("enter")')).toBe(8);   // shut
  expect(await rise('S.day = 2; S.mins = 11 * 60; S.place = "Post Office"; S.screen = "place"; S.inside = false; act("enter")')).toBe(8);   // the queue
  expect(await rise('talk("Post Office")')).toBe(8);                         // and joining it
  expect(await rise('S.flags.punctured = false; puncture(); S.road = null; S.place = null; S.screen = "home"')).toBe(20);   // a flat tyre
  expect(await rise('S.flags.gazTried = 1; S.mins = 11 * 60; ACTIONS.ring("Gaz")')).toBe(4);   // "Still looking for it, mate."
  expect(await rise('ACTIONS.search("the shelves")')).toBe(4);               // pitch black
  expect(await rise('ACTIONS.ring("Nobody")')).toBe(4);                      // no answer
  expect(errors).toEqual([]);
});

test('money runs out: not enough for something and the till says to see Mum & Dad or Paul; they only give it in person; once they have, the wife pays', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  expect(await page.evaluate(() => [START_MONEY, freshState().money])).toEqual([140, 140]);
  await page.evaluate(() => { S.money = 32; });
  expect(await page.evaluate(() => [spend(35), S.money, declinedWords().includes('Mum & Dad or Paul'), findJob('money').status, leadOpen('mum-money'), leadOpen('paul-money')])).toEqual([false, 32, true, 'open', true, true]);
  await page.evaluate(() => { ACTIONS.ring('Mum'); });                        // by phone: come round
  expect(await dialogText(page)).toContain('Come round');
  await ok(page);
  await page.evaluate(() => { ACTIONS.ring('Brother'); });
  expect(await dialogText(page)).toContain('Come round');
  await ok(page);
  expect(await page.evaluate(() => S.money)).toBe(32);
  await page.evaluate(() => { talk("Mum & Dad's"); });                        // in person: £50
  expect(await dialogText(page)).toContain('£50');
  await ok(page);
  expect(await page.evaluate(() => [S.money, findJob('money').status, spend(35), S.money])).toEqual([82, 'done', true, 47]);
  expect(await page.evaluate(() => [spend(60), declinedWords().includes('Paul'), declinedWords().includes('Mum')])).toEqual([false, true, false]);   // Mum's just helped: Paul
  await page.evaluate(() => { talk("Paul's"); }); await ok(page);
  expect(await page.evaluate(() => S.money)).toBe(67);
  expect(await page.evaluate(() => [spend(100), S.money, S.flags.wifePaid])).toEqual([true, 67, 1]);   // they've both helped: the wife pays
  expect(await page.evaluate(() => { S.flags.paulLent = false; return [spend(100), spend(100, false, true)]; })).toEqual([false, true]);   // a fine or a taxi: she pays straight away
  expect(errors).toEqual([]);
});

test('running out of money goes on the list (Mum & Dad, Paul, a bank loan); the bank lends you £200 once', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.money = 30; spend(5); });                      // under £30: skint
  expect(await page.evaluate(() => [findJob('money').status, leadOpen('bank-loan')])).toEqual(['open', true]);
  await page.evaluate(() => { S.day = 7; S.mins = 11 * 60; S.place = 'Bank'; bankTalk(); });
  await page.locator('.dlg button', { hasText: 'Sign for' }).click();
  expect(await dialogText(page)).toContain('five years');
  await ok(page);
  expect(await page.evaluate(() => [S.money, findJob('money').status, S.flags.bankLoan])).toEqual([225, 'done', true]);
  expect(errors).toEqual([]);
});

// ---------- money ----------
test('every time money goes out or comes in it goes kerching, once; nothing bought, no kerching', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const heard = run => page.evaluate(code => {
    window.SOUNDED = [];
    const real = sfx;
    sfx = name => { SOUNDED.push(name); };
    DIALOG = null; ANIM = null;
    new Function(code)();
    sfx = real;
    return SOUNDED.filter(n => n === 'kerching').length;
  }, run);
  expect(await heard('S.money = 100; spend(5)')).toBe(1);                 // in a shop
  expect(await heard("S.money = 100; act('buy:battery-23a')")).toBe(1);   // online
  expect(await heard('S.money = 100; coffeeServed(["one", "two"])')).toBe(1);   // a coffee
  expect(await heard('S.money = 1; spend(5, true)')).toBe(0);             // can't afford a pint
  expect(await heard('S.money = 0; S.flags.paulLent = true; S.flags.mumMoneyDay = S.day; spend(5)')).toBe(1);   // the wife pays
  expect(await heard('S.money = 100; fruitPlay(1)')).toBe(1);            // change from the bar for the fruit machine
  expect(await heard('S.money = 10; S.flags.mumMoneyDay = undefined; moneyIn(50, "from Mum")')).toBe(1);   // given money
  expect(await heard('S.money = 10; S.flags.cardBlocked = true; S.cash = 30; bankQuestions(2); DIALOG.options[0].run()')).toBe(1);   // the bank pays your cash in
  expect(await heard('S.money = 100; S.flags.cardBlocked = true; S.cash = 0; spend(5); S.flags.cardBlocked = false')).toBe(0);   // blocked, no cash: nothing paid
  // a basket at the till
  expect(await heard("S.money = 100; S.place = 'Tool Shop'; S.screen = 'place'; S.inside = true; S.basket = [{ place: S.place, slot: '0-6', name: 'Torch', price: 4.99, kind: 'can' }]; act('checkout')")).toBe(1);
  expect(errors).toEqual([]);
});

// ---------- animations ----------
test('a tap never skips an animation; only a walk, a drawer, a book, the pedal, the horn, a rev and the garage door', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await goRoom(page);
  // every animation in the game: start it, tap, and see if it's still playing
  const skipped = await page.evaluate(() => {
    const out = [];
    for (const kind of [...Object.keys(MOMENTS), 'fusetest', 'chargertry']) {
      if (kind === 'walk') continue;                                    // a walk: tap past it
      ANIM = null;
      moment(kind, 60000);
      const real = MOMENTS[kind];
      MOMENTS[kind] = () => {};                                         // (not drawn here: just the tap)
      document.getElementById('stage').click();
      if (!ANIM) out.push(kind);
      MOMENTS[kind] = real;
    }
    ANIM = null;
    return [...new Set(out)].sort();
  });
  expect(skipped.filter(k => !['book', 'drawer', 'garagedoor', 'horn', 'pedal', 'rev'].includes(k))).toEqual([]);
  expect(errors).toEqual([]);
});

test('the version number is after the tagline, at the top and on the title screen', async ({ page }) => {
  await page.goto(GAME);
  const lines = await page.evaluate(() => [document.querySelector('h1 small').textContent, document.querySelector('.tline').textContent, VERSION]);
  expect(lines[2]).toMatch(/^v\d+$/);
  expect(lines[0]).toBe(`Everybody's sure. Nobody's right. ${lines[2]}`);
  expect(lines[1]).toBe(lines[0]);
});

// ---------- the paperboy ----------
test('at the hedge by day: the paperboy rides past and his paper knocks you flat, out in the open, stars round your head and birds twittering; once a game, never at night', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => {
    window.heard = [];
    const play = sfx;
    sfx = (name, delay) => { window.heard.push(name); play(name, delay); };
    window.rings = 0;
    const draw = starRing;
    starRing = (x, y, t) => { window.rings++; draw(x, y, t); };
    PAPERBOY_OFF = false;
    S.mins = 13 * 60;
    show('home');
  });
  // is he on his way (or here), a second and a half from now?
  const comes = async () => { await page.waitForTimeout(1500); return page.evaluate(() => !!ANIM && ANIM.kind === 'paperboy'); };
  const stand = (spot, mins) => page.evaluate(([at, m]) => { S.spot = S.spot || {}; S.spot.home = at; S.mins = m; render(); }, [spot, mins]);
  await stand([96, 96], 13 * 60);
  expect(await comes()).toBe(false);                                      // not on the drive (the car hides it)
  await stand(await page.evaluate(() => HEDGE_SPOT.slice()), 22 * 60);
  expect(await comes()).toBe(false);                                      // not at night
  await stand([46, 84], 13 * 60);
  await tap(page, 'act:stick');                                           // over to the hedge, by day
  await ok(page);
  await page.waitForFunction(() => ANIM && ANIM.kind === 'paperboy');
  // in the middle of it: you're down, the stars are out, and a tap doesn't skip it
  await page.waitForFunction(() => window.rings > 3, null, { timeout: 15000 });
  await page.locator('#stage').click({ position: { x: 200, y: 200 } });
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('paperboy');
  expect(await dialogText(page)).toContain('front page');
  expect(await page.evaluate(() => ['bikebell', 'bonk', 'twitter'].every(n => window.heard.includes(n)))).toBe(true);
  await ok(page);
  expect(await comes()).toBe(false);                                      // once a game
  expect(errors).toEqual([]);
});

// ---------- the back garden ----------
// ---------- the back garden ----------
test('the back door between the sofa and the computer goes out to the garden; some sunny days the wife is out there on her sun lounger, and not indoors', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await goRoom(page);
  await tap(page, 'act:garden'); await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('garden');
  await expect(page.locator('.hs[data-go="act:wife"]')).toHaveCount(0);   // (the tests keep her indoors)
  await expect(page.locator('.back')).toHaveCount(0);                     // no Back button: you go in by the door
  await tap(page, 'act:backin'); await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('room');
  await expect(page.locator('.hs[data-go="act:garden"] + .lab')).toHaveText('Garden');   // just that, whether she's out there or not
  // a sunny day, after 11: she's out on the lounger, not in the room
  await page.evaluate(() => { window.NO_SUNBATHING = false; let d = 1; while (hash(d, 17) >= 0.5) d++; S.day = d; S.mins = 13 * 60; render(); });
  await expect(page.locator('.hs[data-go="act:wife"]')).toHaveCount(0);
  await expect(page.locator('.hs[data-go="act:garden"] + .lab')).toHaveText('Garden');
  await tap(page, 'act:garden'); await idle(page);
  await tap(page, 'act:wife');
  expect(await dialogText(page)).toContain('Husband');
  expect(await page.evaluate(() => GARDEN_LINES.includes(DIALOG.body))).toBe(true);
  await ok(page);
  expect(errors).toEqual([]);
});

test('the sun is up in the top right corner of the garden, pulsing 20% every 2 seconds; only in the day, and on no other screen', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await expect(page.locator('#sky')).toBeHidden();                        // not outside the house
  await page.evaluate(() => { S.mins = 13 * 60; show('garden'); });
  await idle(page);
  await expect(page.locator('#sun img')).toBeVisible();
  // the picture is there, up in the top right corner
  const sun = await page.evaluate(() => {
    const el = document.getElementById('sun'), pulse = el.getAnimations()[0];
    const widthAt = ms => { pulse.currentTime = ms; return el.getBoundingClientRect().width; };
    pulse.pause();
    const small = widthAt(0), big = widthAt(1000), again = widthAt(2000);
    const box = el.getBoundingClientRect(), all = stage.getBoundingClientRect();
    return { loaded: el.firstElementChild.naturalWidth, grows: big / small, shrinks: again / small, tall: box.height / all.height,
      x: (box.left + box.width / 2 - all.left) / all.width, y: (box.top + box.height / 2 - all.top) / all.height };
  });
  expect(sun.loaded).toBe(236);
  expect(sun.grows).toBeCloseTo(1.2, 2);
  expect(sun.shrinks).toBeCloseTo(1, 2);
  expect(sun.tall).toBeCloseTo(0.44, 2);
  expect(sun.x).toBeGreaterThan(0.85);
  expect(sun.y).toBeLessThan(0.3);
  // the picture is see-through where the sky is, and solid where the lawn is
  const alphas = await page.evaluate(() => { [ISO.ox, ISO.oy] = VIEW.garden; const [x, y] = P(100, 80).map(Math.round); return [ctx.getImageData(380, 60, 1, 1).data[3], ctx.getImageData(x, y, 1, 1).data[3]]; });
  expect(alphas).toEqual([0, 255]);
  // only in the day: not at dawn, dusk or night; and gone when you go in
  const shownAt = hour => page.evaluate(h => { S.mins = h * 60; render(); return !document.getElementById('sun').hidden; }, hour);
  const shown = [];
  for (const hour of [4, 6, 8, 13, 17.5, 19, 22]) shown.push(await shownAt(hour));
  expect(shown).toEqual([false, false, true, true, true, false, false]);
  await page.evaluate(() => { S.mins = 13 * 60; show('room'); });
  await expect(page.locator('#sky')).toBeHidden();
  expect(errors).toEqual([]);
});

test('at night the moon takes the place of the sun in the garden: small, and quite still', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 22 * 60; show('garden'); });
  await idle(page);
  await expect(page.locator('#moon img')).toBeVisible();
  await expect(page.locator('#sun')).toBeHidden();
  const moon = await page.evaluate(() => {
    const el = document.getElementById('moon');
    const box = el.getBoundingClientRect(), all = stage.getBoundingClientRect();
    return { loaded: el.firstElementChild.naturalWidth, moving: el.getAnimations().length, tall: box.height / all.height,
      onScreen: box.right <= all.right && box.top >= all.top,
      x: (box.left + box.width / 2 - all.left) / all.width, y: (box.top + box.height / 2 - all.top) / all.height };
  });
  expect(moon.loaded).toBe(328);
  expect(moon.moving).toBe(0);                                            // it doesn't move
  expect(moon.tall).toBeCloseTo(0.0925, 2);
  expect([moon.x, moon.y].map(n => n.toFixed(2))).toEqual(['0.88', '0.27']);   // where the sun was
  expect(moon.onScreen).toBe(true);
  // only at night
  const shown = [];
  for (const hour of [4, 8, 13, 17.5, 20, 22]) shown.push(await page.evaluate(h => { S.mins = h * 60; render(); return !document.getElementById('moon').hidden; }, hour));
  expect(shown).toEqual([true, false, false, false, true, true]);
  expect(errors).toEqual([]);
});

test('the wife never vanishes mid-conversation, and her bubble is never in the house while she is in the garden', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await goRoom(page);
  // two minutes before she goes out to sunbathe: she finishes talking first, then goes
  await page.evaluate(() => { window.NO_SUNBATHING = false; let d = 1; while (hash(d, 17) >= 0.5) d++; S.day = d; S.mins = 9 * 60 + 58; render(); act('wife'); });
  expect(await page.evaluate(() => [S.mins >= 10 * 60, wifeSunbathing(), !!DIALOG.at])).toEqual([true, false, true]);
  await ok(page);
  expect(await page.evaluate(() => [wifeSunbathing(), wifeHead()])).toEqual([true, null]);
  // out late on the walk home: she's indoors in her nightie, and still doesn't believe it rained
  await page.evaluate(() => { window.NO_SUNBATHING = true; job('tyre', 'Sort out the flat tyre', null); S.road = { spare: true, walked: false }; S.mins = 19 * 60; homeSoaked(); });
  await idle(page);
  await page.evaluate(() => show('room'));
  expect(await page.evaluate(() => [S.screen, wifeSunbathing(), !!DIALOG.at])).toEqual(['room', false, true]);
  expect(errors).toEqual([]);
});

test('going to bed by day she does not come too; at night, in her nightie, she does', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await goRoom(page);
  // counts how often she's drawn asleep in bed while it goes dark
  await page.evaluate(() => { window.inBed = 0; const draw = sleepingWife; sleepingWife = t => { window.inBed++; draw(t); }; });
  const bedAt = async mins => {
    await page.evaluate(m => { window.inBed = 0; S.mins = m; render(); ACTIONS.bed(); }, mins);
    await ok(page);
    return page.evaluate(() => window.inBed);
  };
  expect(await bedAt(14 * 60)).toBe(0);                                  // an afternoon nap: on your own
  expect(await bedAt(20 * 60)).toBeGreaterThan(0);                       // at night: she's in bed beside you
  expect(errors).toEqual([]);
});

// ---------- money when the card's blocked ----------
test('card blocked: the pub says so; Mum and Paul give you cash when you visit, which pays for a pint; the bank pays the rest in', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 13 * 60; S.money = 400; S.flags.cardBlocked = true; S.flags.cardWasBlocked = true; visit('The Hesketh Tavern'); S.inside = true; DIALOG = null; talk('The Hesketh Tavern'); });
  await page.locator('.dlg button', { hasText: 'Bitter' }).click();
  expect(await dialogText(page)).toContain('blocked');
  await ok(page);
  // on the phone: come round for it
  await page.evaluate(() => { ACTIONS.ring('Mum'); });
  expect(await dialogText(page)).toContain('Come round');
  await ok(page);
  // Dad sends you to Mum; Mum: fifty, cash
  await page.evaluate(() => { visit("Mum & Dad's"); DIALOG = null; dadTalk(); });
  expect(await dialogText(page)).toContain('Ask your mother');
  await ok(page);
  await page.evaluate(() => { talk("Mum & Dad's"); });
  expect(await dialogText(page)).toContain('biscuit tin');
  await ok(page);
  expect(await page.evaluate(() => [S.cash, S.money])).toEqual([50, 400]);
  // Paul: twenty (once you need it)
  await page.evaluate(() => { S.cash = 10; visit("Paul's"); DIALOG = null; talk("Paul's"); });
  expect(await dialogText(page)).toContain('twenty, cash');
  await ok(page);
  expect(await page.evaluate(() => S.cash)).toBe(30);
  // too soon for more: they say so
  await page.evaluate(() => { S.cash = 5; talk("Paul's"); });
  expect(await dialogText(page)).toContain('owe me twenty');
  await ok(page);
  await page.evaluate(() => { talk("Mum & Dad's"); });
  expect(await dialogText(page)).toContain('only just gave you');
  await ok(page);
  // the cash pays; then the bank unblocks the card and the rest goes in
  expect(await page.evaluate(() => [spend(4.2, true), Math.round(S.cash * 10)])).toEqual([true, 8]);
  await page.evaluate(() => { S.cash = 8; S.place = 'Bank'; S.inside = true; bankQuestions(2); });
  await page.locator('.dlg button').first().click();
  await ok(page);
  expect(await page.evaluate(() => [S.money, S.cash, !!S.flags.cardBlocked])).toEqual([408, 0, false]);
  // skint, card fine: straight into the account
  await page.evaluate(() => { S.money = 3; S.day += 5; talk("Mum & Dad's"); });
  expect(await dialogText(page)).toContain('in your account');
  expect(await page.evaluate(() => S.money)).toBe(53);
  expect(errors).toEqual([]);
});

test('signs slope with their walls: MILL LANE and the OPEN sign drop one pixel for every two across', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  // the first and last dots of a word, drawn on its own: the last is lower by half the distance across
  const drop = await page.evaluate(() => {
    const dots = [], real = px;
    px = (x, y) => dots.push([x, y]);
    boardText('LL', 40, 0, 20, 20, 30, C.ink);
    px = real;
    const tops = [Math.min(...dots.map(d => d[0])), Math.min(...dots.map(d => d[0])) + 4].map(x => Math.min(...dots.filter(d => d[0] === x).map(d => d[1])));
    return tops[1] - tops[0];
  });
  expect(drop).toBe(2);
  expect(errors).toEqual([]);
});

test('Auntie Jean thinks you are Harold, her late husband', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 13 * 60; visit("Auntie Jean's"); DIALOG = null; talk("Auntie Jean's"); });
  expect(await dialogText(page)).toContain('Harold!');
  expect(await dialogText(page)).toContain('(Harold was her husband. He died in a freak gearbox sensor accident in 1982.)');
  expect(errors).toEqual([]);
});

// ---------- the café ----------
test('the café: people at tables with cups; the menu board close up lists about thirty coffees; buying a coffee is ten questions, then its very long name', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 12 * 60; S.money = 100; visit('Café'); DIALOG = null; S.inside = true; render(); });
  await page.locator('.hs[data-go="cafemenu"]').click({ force: true }); await idle(page);
  expect(await page.evaluate(() => S.screen)).toBe('cafemenu');
  expect(await page.locator('.cafemenu .items div').count()).toBeGreaterThanOrEqual(30);
  await page.locator('.phoneoff').click({ position: { x: 10, y: 200 } });   // tap off it: back in the café
  expect(await page.evaluate(() => S.screen)).toBe('place');
  await page.evaluate(() => { S.counter = 'Café'; talk('Café'); });
  const picks = [];
  for (let k = 0; k < 10; k++) {                                         // ten questions, three answers each
    await expect(page.locator('.dlg button')).toHaveCount(3);
    const b = page.locator('.dlg button').nth(k % 3);
    picks.push(await b.textContent());
    await b.click();
  }
  const served = await dialogText(page);
  for (const p of picks) expect(served).toContain(p);                    // every choice, in its name
  expect(await page.evaluate(() => 100 - S.money)).toBeCloseTo(await page.evaluate(() => COFFEE_PRICE), 2);   // paid for it
  expect(errors).toEqual([]);
});

test('reading a book: ◀ Back puts it back on the shelf; ◀ Back again leaves the shelf', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.screen = 'garage'; render(); show('shelf'); });
  await tap(page, 'act:book:0'); await idle(page);
  expect(await page.evaluate(() => S.book)).toBe(0);
  await goBack(page);
  expect(await page.evaluate(() => [S.screen, S.book])).toEqual(['shelf', null]);   // back on the shelf, the book put back
  await idle(page);
  await goBack(page);
  expect(await page.evaluate(() => S.screen)).toBe('garage');
  expect(errors).toEqual([]);
});

// ---------- the fruit machine ----------
test('the fruit machine in the pub: play for £1, £5 or £10; the reels spin and stop; three the same pays ten times the stake', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 18 * 60; S.money = 100; S.flags.pubCall = S.day; visit('The Hesketh Tavern'); DIALOG = null; S.inside = true; render(); });
  await tap(page, 'act:fruit');
  for (const st of [1, 5, 10]) await expect(page.locator('.dlg button', { hasText: new RegExp('^Play for £' + st + '$') })).toHaveCount(1);
  await page.evaluate(() => { window.played = []; const real = sfx; sfx = (n, d) => { window.played.push(n); real(n, d); }; });   // what you hear
  await page.evaluate(() => { window.realRandom = Math.random; Math.random = () => 0.01; });   // a win
  await page.locator('.dlg button', { hasText: /^Play for £5$/ }).click();
  expect(await page.evaluate(() => ANIM && ANIM.kind)).toBe('reels');  // spinning
  await idle(page);
  expect(await dialogText(page)).toContain('Three the same');
  expect(await page.evaluate(() => [S.money, new Set(FRUIT.show).size])).toEqual([100 - 5 + 50, 1]);
  const heard = () => page.evaluate(() => ['kerchunk', 'coins', 'nowin'].map(n => window.played.filter(x => x === n).length));
  expect(await heard()).toEqual([3, 1, 0]);                              // three ker-chunks, then the coins
  await page.evaluate(() => { window.played = []; });
  await page.evaluate(() => { Math.random = () => 0.5; });              // a loss
  await page.locator('.dlg button', { hasText: 'Play again' }).click();
  await page.locator('.dlg button', { hasText: /^Play for £10$/ }).click();
  await idle(page);
  expect(await dialogText(page)).toContain('Nothing');
  expect(await heard()).toEqual([3, 0, 1]);                              // three ker-chunks, then the no-win beep
  expect(await page.evaluate(() => S.money)).toBe(135);
  await page.evaluate(() => { Math.random = window.realRandom; });
  expect(errors).toEqual([]);
});

test('the puncture always comes in the end: by the fourth daytime drive home from town', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  const got = await page.evaluate(() => {
    PUNCTURE_CHANCE = 1e-9; const real = Math.random; Math.random = () => 0.99;   // (bad luck every time)
    S.mins = 12 * 60; S.screen = 'city'; DIALOG = null;
    const out = [];
    for (let k = 0; k < 4; k++) out.push(punctureOnTheWayHome());
    Math.random = real;
    return out;
  });
  expect(got).toEqual([false, false, false, true]);
  expect(errors).toEqual([]);
});

test('ringing people after midnight: they complain it is late', async ({ page }) => {
  const errors = [];
  await start(page, errors);
  await page.evaluate(() => { S.mins = 1 * 60; S.screen = 'garage'; render(); });
  await page.click('.go[data-go="phone"]'); await idle(page);
  await page.locator('[data-act="ring:Gaz"]').click();
  expect(await dialogText(page)).toContain('gone midnight');
  await ok(page);
  await page.evaluate(() => { S.mins = 10 * 60; DIALOG = null; S.screen = 'phone'; render(); });
  await page.locator('[data-act="ring:Gaz"]').click();
  expect(await dialogText(page)).not.toContain('midnight');            // by day he answers as normal
  expect(errors).toEqual([]);
});

test('everyone who talks makes the speech noise: the tester, the first time too; on the phone; part of the way through a message', async ({ page }) => {
  const errors = [];
  await start(page, errors, true);                                       // in the MOT Test Centre
  // listen for the speech noise, and measure what really comes out
  await page.evaluate(() => {
    window.HEARD = [];
    window.LOUDEST = 0;
    const realMumble = mumble;
    mumble = (n, pitch) => { HEARD.push(pitch); realMumble(n, pitch); };
    const ears = AC.createAnalyser();
    MASTER.connect(ears);
    const wave = new Float32Array(ears.fftSize);
    setInterval(() => { ears.getFloatTimeDomainData(wave); for (const v of wave) LOUDEST = Math.max(LOUDEST, Math.abs(v)); }, 20);
  });
  const heard = async () => page.evaluate(() => HEARD.splice(0));         // what's been heard since last time
  await page.evaluate(() => AC.suspend());                                // the sound has gone to sleep: the tap wakes it
  await talk(page);
  await expect.poll(() => page.evaluate(() => HEARD.length)).toBe(1);     // his very first words
  expect(await page.evaluate(() => AC.state)).toBe('running');
  await page.evaluate(() => { LOUDEST = 0; });
  await expect.poll(() => page.evaluate(() => LOUDEST)).toBeGreaterThan(0.2);   // …and they're loud (they were about 0.1)
  await heard();
  await page.locator('.dlg').click();                                     // "Anything else, mate?"
  expect(await heard()).toEqual([120]);
  await page.locator('.dlg button', { hasText: 'Can you fix it?' }).click();   // you ask…
  expect(await heard()).toEqual([120]);
  await page.locator('.dlg').click();                                     // …and he answers
  expect(await heard()).toEqual([120]);
  await choose(page, 'Back to the car');
  await page.evaluate(() => { if (S.screen !== 'city') throw new Error('not on the town map'); show('home'); });   // the town map; then home
  await heard();
  // each of these: [title, words, the voice it's said in (null: nobody's talking)]
  const lines = [
    ['Mum & Dad', '"Hello love, it is Mum."', 290],
    ['Ringing Mum', '"Come over any time, love."', 290],
    ['Ringing the Scrap Yard', 'An answerphone: "Scrap Yard."', 120],
    ['The taxi', 'A taxi. "Zafira? Never again."', 120],
    ['Blue lights', 'A policeman taps on your window. "Evening, sir."', 120],
    ['Ringing Gaz', 'No answer.', null],
    ['The posters', '"OIL" (faded).', null],
    ['Home', 'The taxi drops you home.', null]
  ];
  for (const [title, words, voice] of lines) {
    await page.evaluate(([t, w]) => { DIALOG = null; say(t, w); }, [title, words]);
    expect(await heard(), title).toEqual(voice ? [voice] : []);
  }
  // a message waiting for a moment to finish: the words come with the message, not before
  await page.evaluate(() => { DIALOG = null; moment('fadein', 60000); say('Dad', '"Skint?"'); });
  expect(await heard()).toEqual([]);
  await page.evaluate(() => finishMoment());
  expect(await heard()).toEqual([120]);
  await page.evaluate(() => { DIALOG = null; S.screen = 'garage'; rageCutscene('left'); });   // losing it: he swears out loud
  await expect.poll(() => page.evaluate(() => HEARD.length), { timeout: 15000 }).toBe(1);
  expect(errors).toEqual([]);
});
