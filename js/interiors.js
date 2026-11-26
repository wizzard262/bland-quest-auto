// Bland Quest Auto: inside the places in town, and the scrap yard.
// Each kind of shop has its own stock, posters and shopkeeper. You walk round; tap the shopkeeper to talk.

// ---------- what kind of inside each place has ----------
const STYLE_BY_CAT = { parts: 'parts', mech: 'garage', elec: 'elec', trans: 'gearbox', tools: 'tools', big: 'aisles', yard: 'yard' };
const STYLE_BY_NAME = {
  'Post Office': 'parcels', 'Courier Depot': 'parcels', 'Café': 'cafe',
  'PC Shop': 'gadgets', 'Phone Shop': 'gadgets', 'Worn Out and Tired': 'tyres', 'MOT Test Centre': 'garage',
  'Machine Shop (lathe)': 'workshop', 'Police Station': 'police', 'Bank': 'bank',
  'The Hesketh Tavern': 'pub', 'Pound Shop': 'aisles', 'Petrol Station': 'aisles'
};
function placeStyle(name) {
  const i = placeIndex(name), cat = i >= 0 ? PLACES[i][1] : 'other';
  if (cat === 'people' || cat === 'home') return 'house';
  return STYLE_BY_NAME[name] || STYLE_BY_CAT[cat] || 'aisles';
}
// The shopkeeper's clothes for each kind of place
const BLUE_OVERALLS = { shirt: hex('#2848a0'), shirtDark: hex('#1c3478'), jeans: hex('#2848a0'), jeansDark: hex('#1c3478'), hair: hex('#202020') };
const KEEPER = {
  police: { shirt: C.white, shirtDark: hex('#c8c8d0'), jeans: hex('#1c2a4a'), jeansDark: hex('#101a30'), hair: hex('#303030'), police: true },   // cap, hi-vis and radio (art.js)
  parts: { shirt: hex('#e08830'), shirtDark: hex('#b06820'), jeans: C.greyDark, jeansDark: C.ink, hair: hex('#c8a060') },
  garage: BLUE_OVERALLS, gearbox: BLUE_OVERALLS, tyres: BLUE_OVERALLS, workshop: BLUE_OVERALLS,
  elec: { shirt: C.warm, shirtDark: C.warmDim, jeans: C.greyDark, jeansDark: C.ink, hair: hex('#803020') },
  tools: { shirt: hex('#7a5634'), shirtDark: hex('#5a3c20'), jeans: C.greyDark, jeansDark: C.ink, hair: C.white },
  aisles: { shirt: hex('#40a090'), shirtDark: hex('#2a7060'), jeans: C.ink, jeansDark: C.ink, hair: hex('#603818') },
  parcels: { shirt: C.red, shirtDark: C.redDim, jeans: C.ink, jeansDark: C.ink, hair: C.white },
  books: { shirt: hex('#9a5ac8'), shirtDark: hex('#6a3a90'), jeans: C.greyDark, jeansDark: C.ink, hair: C.steel },
  cafe: { shirt: C.white, shirtDark: C.steel, jeans: C.ink, jeansDark: C.ink, hair: hex('#202020') },
  gadgets: { shirt: C.ink, shirtDark: C.ink, jeans: C.car, jeansDark: C.carDark, hair: hex('#e07030') },
  bank: { shirt: hex('#f4f4f0'), shirtDark: hex('#2a3a6a'), jeans: hex('#2a3a6a'), jeansDark: hex('#1a2a50'), hair: hex('#303030') },
  yard: { shirt: hex('#6a7a40'), shirtDark: hex('#4a5a28'), jeans: C.jeans, jeansDark: C.jeansDark, hair: hex('#202020') },
  pub: { shirt: C.white, shirtDark: hex('#c8c8c0'), jeans: C.ink, jeansDark: C.ink, hair: hex('#202020') },
  house: { shirt: hex('#e070a8'), shirtDark: hex('#b05080'), jeans: C.jeans, jeansDark: C.jeansDark, hair: C.steel }
};
// What you find when you look at the stock, and what the posters say
const BROWSE = {
  police: 'A noticeboard: HAVE YOU SEEN THIS CAT? A list of lost property: one hubcap. A rack of forms: all for something else.',
  parts: 'Boxes and boxes of parts. Brake pads, filters, bulbs, wiper blades. Nothing says Zafira. One box says "UNIVERSAL*".',
  garage: 'A board of car keys with paper tags, a calendar from 2019, and a coffee machine that says OUT OF ORDER.',
  elec: 'Batteries, reels of wire in every colour, bulbs, fuses and a machine with a hundred plugs. None is yours.',
  gearbox: 'Gearboxes on pallets, clutch plates on the wall, and a smell of hot oil.',
  tools: 'Every tool you have ever needed, in a kit with 119 tools you will never need.',
  aisles: 'Long shelves of everything. Car stuff is half an aisle: air fresheners and fluffy dice.',
  parcels: 'Parcels, a queue, and a sign that says the queue starts at the other end.',
  books: 'Car manuals for every model except yours. Someone has torn out the gearbox chapter from the one next to it.',
  cafe: 'Tea, coffee and a cake with a sign: "Please do not touch the cake."',
  gadgets: 'Phones, laptops and chargers. None of the chargers fits anything you own.',
  tyres: 'Tyres, tyres, tyres. Your size is "on order".',
  workshop: 'Machines that can make anything, if you bring a drawing with every size on it.',
  bank: 'Leaflets about savings. A pen on a chain. The chain has no pen.',
  yard: 'Parts in piles, all a bit rusty. A dog watches you.',
  pub: 'A carpet you don\'t want to look at too closely, a fruit machine, and a dog asleep by the fire.',
  house: 'Net curtains. Someone is definitely in.'
};
const POSTERS = {
  police: ['HAVE YOU SEEN THIS CAT?', 'reward: none'],
  parts: ['WE PRICE MATCH*', '*not online'], garage: ['ALL WORK GUARANTEED', 'for 7 days'],
  elec: ['WE FIX IT', 'OR WE CHARGE YOU'], gearbox: ['AUTOMATIC?', 'WE CAN HELP (MAYBE)'],
  tools: ['LIFETIME GUARANTEE', 'keep your receipt'], aisles: ['EVERYTHING £1', '(some things more)'],
  parcels: ['NEXT DAY DELIVERY', 'most days'], books: ['QUIET PLEASE', 'printer out of order'],
  cafe: ['TODAY\'S SOUP', 'soup'], gadgets: ['NEW PHONE?', 'NEW PASSWORD'], tyres: ['WHILE-U-WAIT', 'bring a book'],
  workshop: ['NO DRAWING', 'NO JOB'], bank: ['WE\'RE HERE FOR YOU', 'Mon-Wed 10-2'], yard: ['BEWARE OF THE DOG', 'and the owner'], pub: ['QUIZ NIGHT THURSDAY', 'no car talk'], house: ['', '']
};

// ---------- where things are in a shop (world units; the counter runs across the middle) ----------
const SHOP_VIEW = [230, 96];
const KEEPER_AT = [100, 40];                    // behind the counter
const COUNTER = [40, 50, 170, 70];             // x0, y0, x1, y1
// Where the shopkeeper's head is on screen (for the speech bubble's arrow)
function keeperHead() {
  if (placeStyle(S.place) === 'pub') return pubKeeperHead();        // the pub is drawn flat, side on
  if (atCounter()) return counterKeeperHead();                      // at the counter: the close-up of him
  ISO.ox = SHOP_VIEW[0]; ISO.oy = SHOP_VIEW[1];
  const style = placeStyle(S.place);
  const at = style === 'house' ? [78, 46] : KEEPER_AT, p = P(at[0], at[1]);
  return [p[0] + 2, p[1] - 40];
}

// ---------- at the counter: a flat close-up of the shopkeeper (a plain stand-in until Steve's picture) ----------
const COUNTER_VIEW = { top: 200, keeper: 240, size: 5, feet: 250 };   // the counter's top edge, where he stands, how big he's drawn, where his feet are (the counter hides him from the waist down: Steve)
// Shops with a counter to go up to (not the pub, not a house's doorstep)
function hasCounter(name) {
  const style = placeStyle(name);                                   // what kind of place it is
  return style !== 'pub' && style !== 'house';                      // the pub has its own flat bar; a house has a door
}
// Are you up at the counter, looking at the shopkeeper close up?
function atCounter() {
  if (!S.inside || S.counter !== S.place) return false;             // not in, or not up at this place's counter
  if (!hasCounter(S.place)) return false;                           // no counter here
  return !closedReason(S.place);                                    // shut: nobody behind it
}
// The close-up: the back wall, the shopkeeper, the counter across the front, the till
function counterScene(name) {
  const i = placeIndex(name);                                       // which place on the map
  const cat = i >= 0 ? PLACES[i][1] : 'other';                      // its kind (for its colour)
  const col = hex(CAT[cat][1]);                                     // the shop's own colour
  const look = KEEPER[placeStyle(name)];                            // the shopkeeper's clothes
  rect(0, 18, W, H - 18, shade(col, 0.8));                          // the back wall
  rect(0, 18, W, 30, col);                                          // a band along the top, with the shop's name
  LABELS.push(`<div class="front" style="left:0;top:${22 / H * 100}%;width:100%;height:${24 / H * 100}%;font-size:${14 / W * 100}cqw;line-height:${24 / W * 100}cqw;text-align:center;transform:none">${esc(name)}</div>`);
  for (const sy of [90, 130]) {                                     // two shelves of stock behind him
    rect(60, sy, 360, 3, C.wood);                                   // the shelf
    for (let bx = 66, n = 0; bx < 410; bx += 14, n++) rect(bx, sy - 14 + (n % 2) * 3, 10, 14 - (n % 2) * 3, shade(col, 0.55 + (n % 3) * 0.2));   // boxes on it
  }
  man(COUNTER_VIEW.keeper, COUNTER_VIEW.feet, 'stand', COUNTER_VIEW.size, 0, look);   // him, behind the counter (it hides his legs)
  rect(30, COUNTER_VIEW.top, W - 60, 6, C.benchTop);                // the counter top
  rect(34, COUNTER_VIEW.top + 6, W - 68, H - COUNTER_VIEW.top - 6, C.bench);   // its front
  rect(330, COUNTER_VIEW.top - 26, 44, 26, C.steel);                // the till
  rect(334, COUNTER_VIEW.top - 22, 36, 10, hex('#0a2a20'));         // its screen
  rect(340, COUNTER_VIEW.top - 34, 24, 8, C.steel2);                // the receipt roll on top
}
// Talk to Dad: another theory (and a little more wound up)
function dadTalk() {
  S.flags.dadTalks = (S.flags.dadTalks || 0) + 1;
  pass(10);
  anger(3);
  const d = P(...DAD_AT);
  SPEAKER = [d[0] + 2, d[1] - 40];
  if (needMoney() && mumCanHelp()) return say('Dad', '"Skint? Ask your mother. She\'s on the doorstep. It\'s all in the biscuit tin."');
  say('Dad', DAD_LINES[(S.flags.dadTalks - 1) % DAD_LINES.length]);
}
// What you can tap at the counter
function counterSpots(name) {
  const [hx, hy] = counterKeeperHead();                             // where his head is
  const person = (PLACE_INFO[name] || {}).person || 'the shopkeeper';   // who he is
  spot('Talk to ' + esc(person), [hx - 26, hy - 6, 52, 96], 'act:talk');
  if (SHELF_STYLES.includes(placeStyle(name))) {                    // a shop with a basket: pay at the till
    spot('Till: pay' + (basketHere().length ? ' £' + basketTotal().toFixed(2) : ''), [326, COUNTER_VIEW.top - 36, 52, 38], 'act:checkout');
  }
}
// Where his head is in the close-up (for the speech bubble's arrow)
const counterKeeperHead = () => [COUNTER_VIEW.keeper + 4, COUNTER_VIEW.feet - 20 * COUNTER_VIEW.size];

// ---------- the pub: a flat, side-on view of the bar (not isometric) ----------
const PUB = { barTop: 166, floor: 232, keeper: 150, keeperY: 211, stools: [236, 296, 356], size: 5 };   // the bar's top, the floor, the barman (over to the left; the top of his head level with the middle of the bottles on the middle shelf: Steve), the stools (yours first); people drawn 5x, to scale with the bar
const PUB_FLOOR_AT = [130, 262];                                     // where he lands when he falls off his stool
const PUB_SEAT_Y = 237;                                              // where someone sat on a stool is drawn from (their hips on the seat, 9 up)
const PUB_WALL = hex('#4a2e20');                                     // the back wall's dark wood
// Fade what's on the back wall towards the wall's own colour, so the people in front stand out
function fadeBackWall(y0, y1, k) {
  const dd = img.data, [wr, wg, wb] = PUB_WALL;                         // the wall's red, green and blue
  for (let i = y0 * W * 4; i < y1 * W * 4; i += 4) {
    dd[i] += (wr - dd[i]) * k; dd[i + 1] += (wg - dd[i + 1]) * k; dd[i + 2] += (wb - dd[i + 2]) * k;
  }
}
// The fruit machine: a lit-up top box, three reels showing fruit, HOLD and NUDGE buttons, a coin slot, the payout tray,
//   chrome trim and chasing lights down its sides (x, y: its top left; it stands on the floor)
const FRUIT_AT = [398, 92];                                              // the fruit machine's top left, in the pub
const FRUIT_REELS = [6, 22, 38];                                        // where each reel sits across it
const FRUIT = { show: ['cherry', 'bell', 'seven'] };                     // what the reels show now
// One reel (k = 0, 1, 2) showing a symbol: a cherry, a bell, a 7, a lemon or a BAR; the red win line across it
function fruitReel(k, kind) {
  const [x, y] = FRUIT_AT, rx = FRUIT_REELS[k];
  rect(x + rx, y + 38, 12, 26, C.white);
  const cx = x + rx + 6, cy = y + 51;
  if (kind === 'cherry') { disc(cx - 2, cy + 3, 2, C.red); disc(cx + 3, cy + 2, 2, C.red); line(cx - 2, cy + 1, cx + 1, cy - 5, hex('#3a8a30')); line(cx + 3, cy, cx + 1, cy - 5, hex('#3a8a30')); }
  if (kind === 'bell') { disc(cx, cy - 1, 4, hex('#f0c030')); rect(cx - 5, cy + 2, 11, 2, hex('#f0c030')); px(cx, cy + 5, hex('#a07010')); }
  if (kind === 'seven') { rect(cx - 4, cy - 6, 9, 2, C.red); line(cx + 4, cy - 4, cx - 1, cy + 6, C.red); line(cx + 3, cy - 4, cx - 2, cy + 6, C.red); }
  if (kind === 'lemon') { disc(cx, cy, 4, hex('#f0e040')); px(cx - 4, cy, hex('#c8b820')); px(cx + 4, cy, hex('#c8b820')); }
  if (kind === 'bar') { rect(cx - 5, cy - 3, 11, 6, C.ink); text('BAR', cx - 5, cy - 2, C.white); }
  rect(x + rx, y + 50, 12, 1, hex('#e02020'));                          // the win line across them
}
function fruitMachine(x, y) {
  const w = 54, h = PUB.floor - y, cab = hex('#6a1a7a'), chrome = hex('#c8ccd4');
  rbox(x, y, w, h, 4, cab);                                               // the cabinet
  rect(x + 2, y + 2, w - 4, 26, hex('#f0c030'));                          // the lit top box…
  rect(x + 4, y + 4, w - 8, 22, hex('#e02060'));
  text('JACKPOT', x + 6, y + 8, hex('#f0f040'));                          // …with its name
  text('£100', x + 15, y + 17, C.white);
  rect(x + 2, y + 30, w - 4, 2, chrome);                                  // chrome trim
  rect(x + 5, y + 36, w - 10, 30, hex('#101018'));                        // the reel window
  if (!(ANIM && ANIM.kind === 'reels')) FRUIT.show.forEach((kind, k) => fruitReel(k, kind));   // three reels, each showing a symbol (while they spin, the moment draws them)
  rect(x + 2, y + 70, w - 4, 2, chrome);
  [['HOLD', 6], ['HOLD', 22], ['HOLD', 38]].forEach(([, bx]) => { rbox(x + bx, y + 76, 11, 7, 2, hex('#f0f040')); });   // the HOLD buttons
  rbox(x + 6, y + 87, 20, 7, 2, hex('#40c040')); rbox(x + 28, y + 87, 20, 7, 2, hex('#2a80e0'));   // NUDGE and START
  rect(x + 40, y + 98, 8, 2, hex('#101018'));                             // the coin slot
  rbox(x + 8, y + 112, w - 16, 10, 2, chrome); rect(x + 10, y + 114, w - 20, 6, hex('#303038'));   // the payout tray
  for (let k = 0; k < 9; k++) {                                           // chasing lights down both sides
    const lit = (Math.floor(performance.now() / 150) + k) % 3 === 0;
    disc(x + 1, y + 36 + k * 9, 1, lit ? hex('#f0f040') : hex('#8a6a20'));
    disc(x + w - 2, y + 36 + k * 9, 1, lit ? hex('#f0f040') : hex('#8a6a20'));
  }
}
// One line of a flat poster (front on): sized to fit its width, so it's never cut short
function posterLine(words, x, y, w, tall) {
  const fit = signFontSize(words, w, tall);
  LABELS.push(`<div class="front" style="left:${x / W * 100}%;top:${y / H * 100}%;width:${w / W * 100}%;height:${tall / H * 100}%;font-size:${fit / W * 100}cqw;line-height:${tall / W * 100}cqw;text-align:center;transform:none">${esc(words)}</div>`);
}
function pubScene(shut) {
  // the back wall: dark wood panels, a big mirror, shelves of drinks
  rect(0, 18, W, PUB.floor - 18, PUB_WALL);
  for (let x = 0; x < W; x += 40) rect(x, 18, 1, PUB.floor - 18, hex('#3a2218'));     // the joins between the panels
  rect(0, 58, W, 2, hex('#6a4430'));                                                   // the dado rail
  rect(150, 62, 180, 56, hex('#8aa0a8')); rect(154, 66, 172, 48, hex('#a8c0c8'));    // the mirror
  const bottle = [hex('#3a7a40'), hex('#a05020'), C.white, hex('#6a2a20'), C.warm, hex('#5a6aa0')];
  for (const sy of [96, 126, 156]) {                                                   // shelves of drinks behind the bar
    rect(110, sy, 260, 3, C.wood);
    for (let bx = 114, n = 0; bx < 364; bx += 9, n++) {
      const tall = 12 + (n % 3) * 2;
      rect(bx, sy - tall, 5, tall, bottle[(n + sy) % 6]); rect(bx + 1, sy - tall - 4, 3, 4, bottle[(n + sy) % 6]);
    }
  }
  rect(196, 20, 208, 34, hex('#2a1a12')); rect(198, 22, 204, 30, hex('#e8dcbc'));   // the pub's name board
  LABELS.push(`<div class="front" style="left:${200 / W * 100}%;top:${22 / H * 100}%;width:${200 / W * 100}%;height:${30 / H * 100}%;font-size:${16 / W * 100}cqw;line-height:${30 / W * 100}cqw;text-align:center;transform:none">${esc(S.place)}</div>`);
  // a poster, and the fruit machine
  rect(20, 70, 64, 44, C.white); rect(22, 72, 60, 40, C.warm);
  posterLine('QUIZ NIGHT', 22, 76, 60, 12); posterLine('THURSDAY', 22, 89, 60, 12); posterLine('no car talk', 22, 100, 60, 9);   // each line sized to fit (no clipping)
  fadeBackWall(18, PUB.floor, 0.6);                                                  // all of that faded back, so the people stand out
  fruitMachine(398, 92);                                                             // the fruit machine, bright (not faded: it's off to the side)
  // the barman, behind the bar (it hides his legs)
  if (!shut) man(PUB.keeper, PUB.keeperY, 'stand', PUB.size, 0, KEEPER.pub);
  // the bar: its top, the front panels, a brass foot rail; the pumps on top; your pint
  rect(80, PUB.barTop, 320, 6, hex('#b88a58'));
  rect(84, PUB.barTop + 6, 312, PUB.floor - PUB.barTop - 6, hex('#7a5634'));
  for (let x = 92; x < 370; x += 40) rect(x, PUB.barTop + 14, 32, 40, hex('#6a4828'));
  rect(84, PUB.floor - 12, 312, 3, hex('#d8b040'));
  [[200, C.warm], [222, hex('#a05020')], [272, C.white]].forEach(([px, c]) => { rect(px, PUB.barTop - 20, 4, 20, C.ink); rect(px - 1, PUB.barTop - 28, 6, 9, c); });
  if (S.flags.pint) { rect(PUB.stools[0] + 6, PUB.barTop - 13, 8, 13, hex('#d89a30')); rect(PUB.stools[0] + 6, PUB.barTop - 15, 8, 3, C.white); }
  // the floor: a pub carpet
  rect(0, PUB.floor, W, H - PUB.floor, hex('#6a2a2a'));
  for (let x = 0; x < W; x += 12) for (let y = PUB.floor + 4; y < H; y += 10) px(x + (y % 20 ? 6 : 0), y, hex('#a04a30'));
  // the bar stools, two regulars, and you (sat at the bar once you've ordered; by the door before)
  for (const sx of PUB.stools) {                                     // tall stools: the seat at hip height when sat
    rect(sx - 12, 192, 26, 5, C.redDim); rect(sx, 197, 3, PUB.floor - 197, C.steel2);
    rect(sx - 6, 216, 15, 2, C.steel2); rect(sx - 9, PUB.floor - 2, 21, 2, C.steel2);
  }
  PUNTERS.forEach((p, k) => man(PUB.stools[k + 1], PUB_SEAT_Y, 'sit', PUB.size, 0, p.look));
  if (S.flags.pubSat) man(PUB.stools[0], PUB_SEAT_Y, 'sit', PUB.size);
  else if (S.flags.pubFloor) { if (!(ANIM && ANIM.kind === 'stoolFall')) man(PUB_FLOOR_AT[0], PUB_FLOOR_AT[1], 'lie', PUB.size); }   // flat out by his stool
  else man(86, PUB.floor + 6, 'stand', PUB.size);
  if (ON_PHONE) phoneToEar();                                         // on the phone to the wife
  // the way out: a see-through door on the left
  const d = [[12, 120], [62, 120]];                                  // a door tall enough for him
  dashedLine([12, PUB.floor], d[0], C.mint); dashedLine(d[0], d[1], C.mint); dashedLine(d[1], [62, PUB.floor], C.mint);
  rect(55, 180, 3, 2, C.mint);
}
// Where he is in the pub: on his stool, or standing inside the door
function pubMe() { return S.flags.pubSat ? [PUB.stools[0], PUB_SEAT_Y] : [86, PUB.floor + 6]; }
// The phone held to his ear (drawn just after him, beside his head)
function phoneToEar() {
  const [x, y] = pubMe(), s = PUB.size;
  rect(x + 2 * s, y - 19 * s, 5, 3 * s, C.ink);                        // the phone
  rect(x + 2 * s + 1, y - 19 * s + 1, 3, 3 * s - 4, hex('#6080c0'));   // its lit screen
  rect(x + 2 * s, y - 16 * s, 5, 4, C.skin);                           // his hand round it
}
// Where her voice comes out: the phone at his ear
function phoneInHand() {
  const [x, y] = pubMe(), s = PUB.size;
  return [x + 2 * s + 2, y - 19 * s - 2];
}
// What you can tap in the pub
function pubSpots(shut) {
  const s = PUB.size;
  if (!shut) spot('Talk to the barman', [PUB.keeper - 16, PUB.keeperY - 20 * s, 44, PUB.barTop - (PUB.keeperY - 20 * s)], 'act:talk');   // his head, over the bar
  PUNTERS.forEach((p, k) => spot('Talk to ' + p.name, [PUB.stools[k + 1] - 14, PUB_SEAT_Y - 20 * s, 34, 18 * s], 'act:punter:' + k));
  spot('Fruit machine: have a go', [FRUIT_AT[0], FRUIT_AT[1], 54, PUB.floor - FRUIT_AT[1]], 'act:fruit');   // £1, £5 or £10 a go; win ten times your stake
  spot('Door: leave', [10, 118, 54, PUB.floor - 118], 'act:leave');
}
// Where the pub people's heads are (for their speech bubbles)
const pubKeeperHead = () => [PUB.keeper + PUB.size, PUB.keeperY - 20 * PUB.size];
const pubPunterHead = k => [PUB.stools[k + 1] + PUB.size, PUB_SEAT_Y - 20 * PUB.size];
// The two regulars at the bar
const PUNTERS = [
  { name: 'Old Ron', look: { shirt: hex('#7a6040'), shirtDark: hex('#5a4428'), jeans: hex('#4a4a50'), jeansDark: hex('#3a3a40'), hair: C.steel },
    lines: ['"In my day you could fix a car with a hammer and a pair of tights."', '"It\'s the timing belt. It\'s always the timing belt."', '"Never trust a car with a computer in it. Or a man with a code reader."'] },
  { name: 'Dodgy Dave', look: { shirt: hex('#5a6a3a'), shirtDark: hex('#3a4a28'), jeans: C.jeans, jeansDark: C.jeansDark, hair: hex('#3a2418'), beard: hex('#3a2418') },
    lines: ['"Put it through the car wash. Dries the electrics out."', '"Give the dashboard a good bang. Worked on my telly."', '"My ex had a Zafira. Look how that turned out."'] }
];
function punterHead(k) { return pubPunterHead(k); }

// ---------- drawing a shop ----------
function shopInterior(name, shut) {
  const i = placeIndex(name), cat = i >= 0 ? PLACES[i][1] : 'other', col = hex(CAT[cat][1]);
  const style = placeStyle(name), look = KEEPER[style];
  ISO.ox = SHOP_VIEW[0]; ISO.oy = SHOP_VIEW[1];
  rect(0, 0, W, H, C.greyDark);
  if (style === 'house') return houseDoorstep(name, col, shut, look);
  // walls, a tiled floor, the shop's name on the back wall
  poly([P(0, 0, 0), P(0, 150, 0), P(0, 150, 80), P(0, 0, 80)], shade(col, 0.8));
  poly([P(0, 0, 0), P(200, 0, 0), P(200, 0, 80), P(0, 0, 80)], col);
  for (let x = 0; x < 200; x += 10) for (let y = 0; y < 150; y += 10) ground(x, y, x + 10, y + 10, ((x + y) / 10) % 2 ? C.concrete : C.concreteDark);
  onLeft(0, 36, 164, 64, 78, C.white); frontSign(name, 36, 0, 128, 78, 14);
  if (SHELF_STYLES.includes(style)) {
    backPosters(style);                                            // posters on the back wall
    leftWallShelves();                                             // and the shelves along the left wall, in sections
  } else {
    posters(style);                                                // posters on the side wall
    STOCK[style] ? STOCK[style](col) : STOCK.aisles(col);          // the stock along the back wall
    if (style === 'yard') yardDoor();                              // the Scrap Yard: the door out to the cars
  }
  // the shopkeeper behind the counter (drawn first so the counter hides his legs), then the counter and the till
  if (!shut) { const m = P(KEEPER_AT[0], KEEPER_AT[1]); man(m[0], m[1], 'stand', 2, 0, look); }
  ibox(COUNTER[0], COUNTER[1], COUNTER[2], COUNTER[3], 0, 22, C.bench, C.benchTop);
  onLeft(COUNTER[3], COUNTER[0] + 4, COUNTER[2] - 4, 16, 18, shade(C.bench, 1.2));
  till(56, 54);
  if (style === 'bank') bankGlass();                               // the glass screen along the counter
  if (style === 'cafe') { ibox(60, 54, 74, 64, 22, 36, C.steel2, C.tool); disc(...P(67, 64, 30), 2, C.red); }
  if (style === 'parcels') { ibox(80, 54, 96, 64, 22, 24, C.steel, C.steel2); }
  if (shut) { onLeft(COUNTER[3], 80, 130, 28, 40, C.ink); LABELS.push(''); }
  // things standing on the floor in front of the counter
  if (FLOOR[style]) FLOOR[style]();
  if (name === 'Post Office') postQueue();
  // you (with a tyre in your arms, on its way in or out)
  if (!(ANIM && ANIM.kind === 'walk')) {
    const [x, y] = manSpot('place'), m = P(x, y);
    man(m[0], m[1], 'stand', 2);
    if (carryingTyre() && !(ANIM && ANIM.kind === 'tyrehand')) carriedTyre(m);   // (being handed over: the moment draws it)
  }
}
// A friend's house: red brick or cream render (each house always the same)
function houseWalls(name) {
  const k = Math.floor(hash(name.length, name.charCodeAt(0)) * 3);
  return [[C.brick, true], [C.cream, false], [hex('#d8c8a8'), false]][k];
}
// A friend's front door, with them at it
// Someone's house, from their doorstep: its windows, for the curtains and the lights at night
const DOORSTEP_WINDOWS = [['L', 40, 20, 44, 10, 30], ['L', 40, 112, 136, 10, 30], ['L', 40, 20, 44, 36, 50], ['L', 40, 70, 86, 38, 50], ['L', 40, 112, 136, 36, 50], ['R', 160, -30, -6, 12, 30]];
function houseDoorstep(name, col, shut, look) {
  ground(-300, -300, 500, 500, C.grass);
  ground(-300, 120, 500, 140, C.drive);
  const [wall, brick] = houseWalls(name);                             // red brick, or cream render
  ibox(0, BUILDING_BACK, 160, 40, 0, 54, wall);
  if (brick) bricks(0, BUILDING_BACK, 160, 40, 54, C.brickLine);
  ibox(118, -24, 132, -10, 60, 96, wall);                            // the chimney (drawn before the roof, so the roof hides its foot)
  gableRoof(-3, BUILDING_BACK - 3, 163, 43, 54, 26, wall, C.roof);
  ibox(118, -24, 132, -10, 76, 96, wall); ibox(117, -25, 133, -9, 96, 98, C.steel2);   // the chimney stack above the roof, and its cap
  onLeft(40, 66, 90, 0, 34, C.white); onLeft(40, 68, 88, 0, 33, C.door);   // the front door
  winLeft(40, 20, 44, 10, 30); winLeft(40, 112, 136, 10, 30);         // downstairs
  winLeft(40, 20, 44, 36, 50); winLeft(40, 70, 86, 38, 50); winLeft(40, 112, 136, 36, 50);   // upstairs
  winRight(160, -30, -6, 12, 30);                                     // the side window
  houseCurtains(DOORSTEP_WINDOWS);                                     // midnight till 8: curtains drawn (art.js)
  for (const x of [8, 140]) { ibox(x, 44, x + 14, 54, 0, 6, C.tree2); for (let k = 0; k < 6; k++) px(...P(x + 2 + k * 2, 49, 7), [C.red, C.warm, C.white][k % 3]); }
  ground(66, 40, 90, 120, C.concrete);
  if (name === MUM_DAD) mumDadDrive();                               // their drive: your car, bonnet up
  if (!shut) { const m = P(78, 46); man(m[0], m[1], 'stand', 2, 0, look); }
  if (!(ANIM && ANIM.kind === 'walk')) { const [x, y] = manSpot('place'), m = P(x, y); man(m[0], m[1], 'stand', 2); }
  if (name === MUM_DAD) { const d = P(...DAD_AT); man(d[0], d[1], 'stand', 2, 0, DAD_LOOK); }   // Dad, beside you, peering in
}
// ---------- Mum & Dad's: "come over any time". You and Dad on their drive, looking under the bonnet; Dad is all wrong ----------
const MUM_DAD = "Mum & Dad's";
const MUM_DAD_CAR = [96, 56];                                      // your car on their drive (along x, nose to the right)
const MUM_DAD_YOU = [152, 62], DAD_AT = [152, 78];                 // you and Dad, at its nose
const DAD_LOOK = { shirt: hex('#8a7a5a'), shirtDark: hex('#6a5a40'), jeans: hex('#4a4a52'), jeansDark: hex('#3a3a42'), hair: hex('#d8d8d0') };   // a cardigan, grey slacks, white hair
function mumDadDrive() {
  ground(92, 40, 160, 120, C.concrete);                             // their drive
  if (S.flags.taxi || inWifesCar()) return;                         // not in your car: nothing to look under
  const [x, y] = MUM_DAD_CAR;
  isoCar(x, y, 1, C.car, { alongX: true });
  const hx = x + 36;                                                // the bonnet's hinge, at the bottom of the windscreen
  poly([P(hx, y + 2, 15), P(hx, y + 22, 15), P(hx + 4, y + 22, 32), P(hx + 4, y + 2, 32)], shade(C.car, 0.7));   // the bonnet, propped up
  poly([P(hx + 1, y + 3, 12), P(x + 46, y + 3, 11), P(x + 46, y + 21, 11), P(hx + 1, y + 21, 12)], hex('#2a2a2e'));   // the engine bay
  line(...P(hx + 6, y + 12, 11), ...P(hx + 3, y + 12, 28), C.steel2);   // the stay holding it up
}
// Dad's theories: confident, and all wrong
const DAD_LINES = [
  '"Could be the tyres. They look a bit… round."',
  '"Have you checked the windows? Electric windows. They drain everything."',
  '"It\'s the wipers. On these foreign ones the sensor\'s in the wipers."',
  '"In my day you just gave it a good thump. Here, hold this." He hands you nothing.',
  '"Have you tried a new air freshener? Your mother swears by them."',
  '"That\'s your engine, that is." He points at the battery.'
];
// A cash register on the counter: body, a green display, a card machine
function till(x, y) {
  ibox(x, y, x + 16, y + 12, 22, 30, C.greyDark, C.grey);
  ibox(x + 2, y, x + 14, y + 3, 30, 36, C.ink);
  onLeft(y + 3, x + 3, x + 13, 31, 35, hex('#40c070'));
  ibox(x + 20, y + 4, x + 25, y + 10, 22, 24, C.ink, C.grey);
}
// Two posters on the side wall, with real (slanted) words on them
// The bank's glass screen along the counter: see-through, so just its frame, its posts and a glint of glare
function bankGlass() {
  const [x0, y0, x1] = COUNTER, gy = y0 + 1;                             // along the counter's back edge
  const frame = hex('#a8b8c8'), glare = hex('#e8f6ff');
  ibox(x0, y0, x1, y0 + 2, 56, 58, frame, shade(frame, 1.15));          // the top rail
  for (let x = x0; x <= x1 - 2; x += 26) ibox(x, y0, x + 2, y0 + 2, 22, 56, frame, shade(frame, 1.15));   // the posts, one per pane
  for (let x = x0 + 6; x < x1 - 8; x += 26) {                           // in each pane, two streaks of glare
    line(...P(x, gy, 30), ...P(x + 6, gy, 50), glare);
    line(...P(x + 4, gy, 28), ...P(x + 8, gy, 38), glare);
  }
  const hole = P(x0 + 70, gy, 32);                                       // the speaking holes
  for (const [dx, dy] of [[0, 0], [2, 0], [1, 1], [-1, 1], [0, 2], [2, 2]]) px(hole[0] + dx, hole[1] + dy, frame);
}
function posters(style) {
  const [a, b] = POSTERS[style] || ['', ''];
  if (!a) return;
  onRight(0, 70, 110, 30, 56, C.white); onRight(0, 72, 108, 32, 54, C.warm);
  onRight(0, 118, 140, 34, 56, C.white); onRight(0, 120, 138, 36, 54, hex('#e070a8'));
  wallText(a, 110, 50, 40, 8); wallText(b, 110, 41, 40, 6);
  wallText(style === 'police' ? 'WANTED' : 'SALE', 140, 50, 22, 8);   // (the police don't have a sale on)
}
// The Scrap Yard's door in the left wall, standing open: the wrecks out in the yard, in daylight
const YARD_DOOR = [16, 48, 56];                                     // from y, to y, height
function yardDoor() {
  const [y0, y1, h] = YARD_DOOR;
  onRight(0, y0, y1, 0, h, C.wood);                                 // the frame
  onRight(0, y0 + 3, y1 - 3, 0, h - 3, skyColour());                // the sky
  onRight(0, y0 + 3, y1 - 3, 0, 16, hex('#7a6a50'));                // the mud
  onRight(0, y0 + 6, y1 - 6, 12, 20, C.red);                        // a wreck…
  onRight(0, y0 + 11, y1 - 11, 20, 27, shade(C.red, 0.7));
  onRight(0, y0 + 13, y1 - 13, 21, 25, C.ink);                      // …no glass in it
  onRight(0, y0 + 5, y1 - 9, 27, 34, C.warmDim);                    // and one on top of it
  onRight(0, y0 + 9, y1 - 14, 34, 39, shade(C.warmDim, 0.7));
}
// Two posters on the back wall (shops whose side wall is all shelves)
function backPosters(style) {
  const [a, b] = POSTERS[style] || ['', ''];
  if (!a) return;
  onLeft(0, 140, 190, 30, 56, C.white); onLeft(0, 142, 188, 32, 54, C.warm);
  frontSign(a, 142, 0, 46, 50, 8);
  frontSign(b, 142, 0, 46, 41, 6);
}
// Words on the side wall (x = 0), reading left to right: start at world y (the left end), top at height z
function wallText(words, y, z, len, tall) {
  const [sx, sy] = P(0, y, z);
  const fit = signFontSize(words, len, tall);                           // measured, so it's never cut short (Steve)
  LABELS.push(`<div class="front side" style="left:${sx / W * 100}%;top:${sy / H * 100}%;width:${len / W * 100}%;height:${tall / H * 100}%;font-size:${fit / W * 100}cqw;line-height:${tall / W * 100}cqw">${esc(words)}</div>`);
}
// Shelves along the back wall, filled by `item(x, z, k)` for each slot
function shelves(fill, from = 10, to = 190) {
  for (const z of [16, 34, 52]) {
    ibox(from, 0, to, 12, z - 2, z, C.wood);
    for (let x = from + 4, k = 0; x < to - 6; x += 10, k++) fill(x, z, k);
  }
}
const STOCK = {
  police() {                                                          // the police station: grey filing cabinets, and a cork noticeboard
    for (let k = 0; k < 4; k++) {
      ibox(20 + k * 24, 2, 40 + k * 24, 14, 0, 42, C.steel2, C.steel);
      for (const z of [10, 24, 36]) onLeft(14, 26 + k * 24, 34 + k * 24, z, z + 2, C.tool);   // the drawer handles
    }
    onLeft(0, 128, 192, 18, 62, hex('#a07850'));                       // the noticeboard
    for (let n = 0; n < 9; n++) { const x = 132 + (n % 3) * 20, z = 24 + Math.floor(n / 3) * 12; onLeft(0, x, x + 14, z, z + 9, n % 4 ? C.white : C.warm); }   // papers pinned up
  },
  parts(col) {
    shelves((x, z, k) => { ibox(x, 1, x + 8, 10, z, z + 9 + (k % 3), [CARDBOARD, C.white, C.red, C.car][(k + z) % 4]); onLeft(10, x + 2, x + 6, z + 3, z + 6, C.ink); });
    for (let k = 0; k < 4; k++) line(...P(0, 20 + k * 6, 70), ...P(0, 50 + k * 6, 30), C.steel);     // exhaust pipes on the side wall
  },
  garage(col) {
    onLeft(0, 140, 190, 0, 50, C.ink);                                                                  // the workshop door
    isoCar(150, -46, 1.1, S.place === 'MOT Test Centre' ? C.car : C.red);                                // a car on the ramp (at the MOT, it's yours)
    // the car is in the workshop behind the wall: put the wall back over it, so you only see it through the door
    onLeft(0, 0, 140, 0, 80, col); onLeft(0, 190, 200, 0, 80, col); onLeft(0, 140, 190, 50, 80, col);
    onLeft(0, 36, 164, 64, 78, C.white);                                                                // the sign board, again
    const top = P(200, 0, 80), foot = P(200, 0, 0);
    poly([top, [W, top[1]], [W, foot[1]], foot], C.greyDark);                                           // and nothing showing past the corner
    ground(140, 0, 190, 1, C.greyDark);
    onLeft(0, 20, 60, 30, 56, C.peg); for (let k = 0; k < 18; k++) px(...P(24 + (k % 6) * 6, 0, 34 + Math.floor(k / 6) * 7), C.warm);   // the key board
    onLeft(0, 70, 92, 30, 56, C.white); onLeft(0, 72, 90, 44, 54, C.car);                          // a calendar
  },
  elec() {
    shelves((x, z, k) => {
      if (z === 52) { ellipse(...P(x + 4, 6, z + 5), 5, 3, [C.red, C.warm, C.car, hex('#40a060')][k % 4]); return; }   // reels of wire
      ibox(x, 1, x + 8, 9, z, z + 7, C.ink); px(...P(x + 2, 5, z + 8), C.red); px(...P(x + 6, 5, z + 8), C.white);      // batteries
    });
  },
  gearbox() {
    for (let k = 0; k < 4; k++) { const x = 14 + k * 44; ibox(x, 2, x + 34, 16, 0, 4, C.wood); ibox(x + 3, 4, x + 31, 14, 4, 22, ALLOY, shade(ALLOY, 1.1)); for (let r = x + 6; r < x + 30; r += 5) onLeft(14, r, r + 1, 6, 20, shade(ALLOY, 0.75)); }
    for (let k = 0; k < 5; k++) { const p = P(30 + k * 30, 0, 50); ellipse(p[0], p[1], 9, 9, C.tool); ellipse(p[0], p[1], 3, 3, C.ink); }   // clutch plates on the wall
  },
  tools() {
    onLeft(0, 10, 190, 14, 62, C.peg);
    for (let x = 14; x < 188; x += 6) for (let z = 18; z < 60; z += 10) { const p = P(x, 0, z); line(p[0], p[1], p[0], p[1] + 6 + (x % 3) * 2, [C.tool, C.red, C.steel2, C.car][(x + z) % 4]); }
    for (const x of [16, 150]) { ibox(x, 0, x + 30, 14, 0, 30, C.red); for (const z of [8, 16, 24]) onLeft(14, x + 2, x + 28, z, z + 1, C.redDim); }
  },
  aisles(col) {
    shelves((x, z, k) => ibox(x, 1, x + 8, 9, z, z + 6 + (k % 4) * 2, [C.red, C.warm, C.car, hex('#40a060'), C.white, hex('#e070a8')][(k * 7 + z) % 6]));
  },
  parcels() { for (let k = 0; k < 14; k++) { const x = 12 + (k % 7) * 25, z = Math.floor(k / 7) * 14; ibox(x, 2, x + 20, 16, z, z + 13, CARDBOARD); line(...P(x + 10, 2, z + 13), ...P(x + 10, 16, z + 13), C.warm); } },
  books() { shelves((x, z, k) => { for (let s = 0; s < 4; s++) ibox(x + s * 2, 1, x + s * 2 + 2, 9, z, z + 9 + ((k + s) % 3), [C.red, C.car, hex('#40a060'), C.warm, C.white, C.redDim][(k + s + z) % 6]); }); },
  cafe() { onLeft(0, 20, 80, 30, 58, C.ink); for (let k = 0; k < 5; k++) onLeft(0, 24, 70 - k * 4, 52 - k * 5, 53 - k * 5, C.white); },
  gadgets() { shelves((x, z, k) => { ibox(x, 1, x + 7, 3, z, z + 12, C.ink); onLeft(3, x + 1, x + 6, z + 2, z + 11, [C.car, hex('#40c070'), C.warm][k % 3]); }); },
  tyres() { for (let k = 0; k < 6; k++) for (let n = 0; n < 5; n++) { const p = P(18 + k * 30, 8, 3 + n * 6); ellipse(p[0], p[1], 12, 6, C.tyre); ellipse(p[0], p[1], 5, 2, C.greyDark); } },
  workshop() { ibox(20, 2, 110, 18, 0, 26, hex('#507a5a'), hex('#6a9a74')); ibox(30, 6, 60, 14, 26, 34, C.steel); ibox(130, 2, 170, 30, 0, 40, C.white, C.steel); onLeft(30, 134, 166, 10, 36, C.ink); },
  bank() { onLeft(0, 30, 70, 30, 56, C.white); onLeft(0, 32, 68, 32, 54, hex('#2a3a6a')); },
  yard() { for (let k = 0; k < 8; k++) ibox(12 + k * 22, 2, 30 + k * 22, 14, 0, 6 + (k % 3) * 6, [C.rust, C.tool, CARDBOARD][k % 3]); }
};
// The café's tables (x, y of each one's corner) and who's sat at them
const CAFE_TABLES = [[30, 110], [150, 110]];
const CAFE_CUSTOMERS = [
  { shirt: hex('#c86a9a'), shirtDark: hex('#9a4a74'), jeans: C.ink, jeansDark: C.ink, hair: hex('#e0c060') },
  { shirt: hex('#4a7a5a'), shirtDark: hex('#2a5a3a'), jeans: hex('#4a4a50'), jeansDark: hex('#3a3a40'), hair: C.steel }
];
// One café table: a chair with someone sat on it (behind the table), then the table (leg first, so the top sits on it), then their cup
function cafeTable([x, y], look) {
  const cx = x + 10, cy = y - 4;                                   // where the chair stands, behind the table
  ibox(cx - 3, cy - 3, cx + 3, cy + 3, 0, 8, C.tool, C.wood);      // the chair
  ibox(cx - 3, cy - 4, cx + 3, cy - 3, 8, 18, C.wood);              // its back
  const seat = P(cx, cy, 9);
  man(seat[0], seat[1] + 18, 'sit', 2, 0, look);                    // them, sat on it
  ibox(x + 9, y + 9, x + 11, y + 11, 0, 14, C.tool);               // the table's leg…
  ibox(x + 6, y + 6, x + 14, y + 14, 0, 1, C.tool);                // …its foot…
  ibox(x, y, x + 20, y + 20, 14, 16, C.white);                     // …and the top, on top
  const cup = P(x + 10, y + 5, 16);                                // their cup, in front of them
  rect(cup[0] - 2, cup[1] - 4, 4, 4, C.white); rect(cup[0] - 2, cup[1] - 4, 4, 1, hex('#6a4028')); px(cup[0] + 2, cup[1] - 3, C.white);   // the cup, coffee, handle
  rect(cup[0] - 3, cup[1], 6, 1, C.steel2);                        // the saucer
}
// Things on the shop floor, in front of the counter
const FLOOR = {
  parts() { for (let k = 0; k < 6; k++) ibox(176, 84 + k * 8, 186, 90 + k * 8, 0, 14 + (k % 2) * 4, [C.warm, C.red, C.car][k % 3]); },
  garage() { for (let n = 0; n < 4; n++) { const p = P(178, 120, 3 + n * 6); ellipse(p[0], p[1], 12, 6, C.tyre); ellipse(p[0], p[1], 5, 2, C.greyDark); } ibox(20, 120, 34, 134, 0, 12, C.red); ibox(40, 120, 54, 134, 0, 12, C.red); },
  aisles() { ibox(170, 100, 190, 130, 0, 26, C.white, C.steel); for (let k = 0; k < 6; k++) ibox(172, 102 + k * 4, 188, 105 + k * 4, 26, 30, [C.red, C.warm, C.car][k % 3]); },
  cafe() { CAFE_TABLES.forEach((t, k) => cafeTable(t, CAFE_CUSTOMERS[k])); },   // tables, each with someone sat at it over a cup (Steve)
  parcels() { for (const x of [30, 70, 110, 150]) ibox(x, 90, x + 2, 92, 0, 18, C.steel); line(...P(31, 91, 16), ...P(151, 91, 16), C.red); },
  tyres() { for (let n = 0; n < 5; n++) { const p = P(30, 120, 3 + n * 6); ellipse(p[0], p[1], 12, 6, C.tyre); } },
  yard() { const p = P(170, 120); rect(p[0] - 8, p[1] - 6, 16, 6, hex('#8a6a4a')); rect(p[0] + 6, p[1] - 9, 4, 4, hex('#8a6a4a')); }   // the dog
};

// =====================================================================
// THE BREAKERS YARD: walk round the wrecks and look at each one
// =====================================================================
const WRECKS = [
  // [world x, y, paint, stacked?, what you find, body shape, how wrecked]
  // The first six might be yours (look at all six and the lead is done); the rest are just other wrecks
  [20, 20, C.red, false, '1999 Zafira, the old shape. Different sensor, different plug.', 'zafiraOld', { noWheels: true, noBonnet: true }],
  [70, 18, hex('#9a5ac8'), true, '2006 Zafira, the new shape. The sensor looks right… but its plug has 4 pins. Yours has 3.', 'zafiraNew', { noWheels: true }],
  [120, 22, C.steel2, false, 'Zafira 1.6… with a manual gearbox. Manual gearboxes don\'t have the sensor at all.', 'zafira', { flat: true }],
  [24, 92, hex('#40a060'), false, 'Zafira diesel. A different gearbox altogether.', 'zafira', { noBonnet: true }],
  [76, 96, C.ink, false, 'YOUR EXACT CAR. Same year, same engine, automatic… and the sensor has gone. Two neat holes and a cut wire. Someone got here first.', 'zafira', {}],
  [130, 92, C.warm, true, 'Not a Zafira: an Astra. The man shouts "same gearbox, mate". It isn\'t. Its sensor is square.', 'astra', { noWheels: true }],
  [176, 30, C.white, false, 'A white van. No sensor, no engine, no seats. Someone has written CLEAN ME in the dirt. Then, under it, ALSO WASH ME.', 'van', { noWheels: true }],
  [24, 150, hex('#c87830'), false, 'A Vectra. Same badge on the front, nothing else the same. The dog is asleep on the back seat.', 'saloon', { flat: true }],
  [180, 100, hex('#e070a0'), false, 'A tiny pink Corsa with no engine at all. Somebody\'s had that too.', 'city', { noBonnet: true, noWheels: true }]
];
const MAYBE_YOURS = 6;                                   // the first six are the ones that might be yours
const YARD_VIEW = [240, 70];
// One wreck (and the one it's stacked on, if it is)
function drawWreck(i) {
  const [x, y, col, stacked, , shape, how] = WRECKS[i];
  if (stacked) isoCar(x + 2, y - 4, 1, shade([C.steel2, C.redDim][i % 2], 0.8), { broken: true, noWheels: true, shape: 'zafiraOld' });   // the wreck underneath
  isoCar(x, y, 1, shade(col, 0.85), Object.assign({ broken: true, shape, dz: stacked ? 12 : 0 }, how));
}
// Every scrap yard has a dog. Every scrap yard is full of dog poo
const YARD_POO = [[60, 120], [-20, 90], [150, 60], [100, 170], [10, 170], [170, 130], [-40, 20], [120, 10]];
function dogPoo(x, y) {
  const brown = hex('#5a3a1e'), dark = hex('#3e2614');
  ellipse(x, y, 4, 2, dark);                                          // the bottom coil
  ellipse(x, y - 2, 3, 1, brown);                                     // the middle
  px(x, y - 4, brown); px(x + 1, y - 3, brown);                       // the twist on top
}
SCREENS.yard = {
  size: [480, 270],
  paint() {
    ISO.ox = YARD_VIEW[0]; ISO.oy = YARD_VIEW[1];
    grime(0, 0, W, H, hex('#8a7a60'), 0.25, 91);                                               // dirt and gravel
    ground(-60, -60, 220, 200, hex('#7a6a50'));
    for (let n = 0; n < 500; n++) { const p = P(-60 + hash(n, 1) * 280, -60 + hash(1, n) * 260); px(p[0], p[1], hash(n, n) < 0.5 ? hex('#6e6a62') : hex('#a8a090')); }   // gravel: grey stones
    for (let x = -60; x <= 220; x += 14) { ibox(x, -62, x + 2, -60, 0, 30, C.wood); }            // the fence
    line(...P(-60, -61, 26), ...P(220, -61, 26), C.wood); line(...P(-60, -61, 14), ...P(220, -61, 14), C.wood);
    ibox(170, -50, 214, -20, 0, 34, hex('#e0e0d0'), C.steel); winLeft(-20, 178, 194, 14, 26); onLeft(-20, 200, 210, 0, 24, C.door);   // the office
    for (let n = 0; n < 4; n++) { const p = P(-40, 140, 3 + n * 6); ellipse(p[0], p[1], 12, 6, C.tyre); ellipse(p[0], p[1], 5, 2, hex('#5a4a38')); }   // tyres
    for (let n = 0; n < 3; n++) {                                     // tyres lying flat: a black ring, its tread catching the light, the hole in the middle
      const p = P(-30, 40 + n * 20, 3);
      ellipse(p[0], p[1], 10, 5, C.tyre);
      ellipse(p[0], p[1] - 1, 9, 4, shade(C.tyre, 1.6));
      ellipse(p[0], p[1], 7, 3, C.tyre);
      ellipse(p[0], p[1], 4, 2, hex('#7a6a50'));
    }
    WRECKS.forEach((w, i) => drawWreck(i));
    const d = P(190, 0); rect(d[0] - 10, d[1] - 7, 18, 7, hex('#8a6a4a')); rect(d[0] + 6, d[1] - 11, 5, 5, hex('#8a6a4a'));   // the dog
    for (const [x, y] of YARD_POO) dogPoo(...P(x, y));                // and, as at every scrap yard, what the dog leaves
    spot('Something on the ground', isoArea(YARD_POO[0][0] - 4, YARD_POO[0][1] - 4, YARD_POO[0][0] + 4, YARD_POO[0][1] + 4, 0, 4), 'act:look:Dog poo');
    if (!(ANIM && ANIM.kind === 'walk')) { const [x, y] = manSpot('yard'), m = P(x, y); man(m[0], m[1], 'stand', 2); if (carryingTyre()) carriedTyre(m); inFront('yard', x, y); }   // (behind a wreck: it hides him)
    WRECKS.forEach(([x, y, , stacked, , shape], i) => {
      const k = CAR_SHAPES[shape];                                                           // the tap area fits the car's size
      spot(S.flags['wreck' + i] ? 'Looked at it' : 'Look at this one', isoArea(x, y, x + 24, y + k.L, 0, k.rz + (stacked ? 12 : 0)), 'act:wreck:' + i, [x + 30, y + 30]);
    });
    spot('Back to the office', isoArea(170, -50, 214, -20, 0, 34), 'act:yardoffice', [190, 0]);
    tip('Scrap Yard', 'Six of them might be yours. Look at each.', 1, 8);
    hud();
  },
  actions() { return []; }   // ◀ Back to the map
};

// =====================================================================
// OUTSIDE A PLACE: the shop front, from the pavement. You see this first; go in through the door
// =====================================================================
const OUTSIDE_VIEW = [250, 70];
// The street in front of a place (and the roadside on Mill Lane): grass all over, the road with its white line,
// the kerb, and the pavement in slabs (with ISO set to the view already)
function streetFront() {
  grassField();
  ground(-400, 66, 600, 120, C.road);                                                    // the road
  for (let x = -400; x < 600; x += 24) line(...P(x, 94), ...P(x + 12, 94), C.white);    // its white line
  ground(-400, 40, 600, 66, C.drive);                                                    // the pavement
  line(...P(-400, 66), ...P(600, 66), C.white);                                          // the kerb
  for (let x = -400; x < 600; x += 12) line(...P(x, 40), ...P(x, 66), shade(C.drive, 0.9));   // its slabs
}
// The petrol station from outside: the forecourt, a pump island with your car parked at a pump, the canopy, the kiosk
function petrolFront(name, shut) {
  ISO.ox = OUTSIDE_VIEW[0]; ISO.oy = OUTSIDE_VIEW[1];
  grassField();                                                          // grass all over
  ground(-400, 104, 600, 160, C.road);                                                    // the road, beyond the forecourt
  for (let x = -400; x < 600; x += 24) line(...P(x, 132), ...P(x + 12, 132), C.white);
  ground(-40, 40, 240, 104, C.concreteDark);                                              // the forecourt
  for (let x = -40; x < 240; x += 20) line(...P(x, 40), ...P(x, 104), shade(C.concreteDark, 0.92));
  // the kiosk: white with a red band, its window and door
  ibox(0, BUILDING_BACK, 200, 40, 0, 60, C.white, C.steel);
  onLeft(40, 0, 200, 46, 58, C.red); frontSign(name, 114, 40, 82, 57, 11);   // the name on the red strip, right of the canopy
  onLeft(40, 10, 136, 8, 40, C.glass);
  for (let k = 0; k < 10; k++) onLeft(40, 16 + k * 12, 24 + k * 12, 9, 14 + (k % 3) * 4, [C.red, C.warm, C.car, C.white][k % 4]);   // snacks in the window
  onLeft(40, 148, 176, 0, 46, C.white); onLeft(40, 150, 174, 0, 44, shut ? C.greyDark : C.glass);   // the door
  // the pump island, and two pumps on it
  ibox(30, 62, 96, 68, 0, 2, C.concrete);
  for (const px0 of [42, 74]) { ibox(px0, 63, px0 + 8, 67, 2, 22, C.red, C.white); onLeft(67, px0 + 1, px0 + 7, 12, 19, C.ink); onLeft(67, px0 + 2, px0 + 6, 14, 17, hex('#40c070')); }
  // the canopy over the pumps, on four posts
  for (const [cx, cy] of [[20, 50], [104, 50], [20, 100], [104, 100]]) ibox(cx, cy, cx + 3, cy + 3, 0, 70, C.steel2);
  // your car, parked at a pump
  drivenCar(40, 72, 1);
  ibox(14, 46, 112, 104, 70, 76, C.red, C.white);                                        // the canopy roof
  if (!(ANIM && ANIM.kind === 'walk')) { const [x, y] = manSpot('place'), m = P(x, y); man(m[0], m[1], 'stand', 2); }
}
// The petrol station at night, from the forecourt: the kiosk window and door lit, the canopy's lights pooling on the pumps
function petrolLights(d) {
  [ISO.ox, ISO.oy] = OUTSIDE_VIEW;
  onLeft(40, 12, 134, 10, 38, LIT);                                      // the shop window, bright
  for (let k = 0; k < 10; k++) onLeft(40, 16 + k * 12, 24 + k * 12, 9, 14 + (k % 3) * 4, [C.red, C.warm, C.car, C.white][k % 4]);   // the snacks in it, lit
  onLeft(40, 150, 174, 0, 44, LIT);                                      // the door's glass
  onLeft(40, 0, 200, 46, 58, C.red); onLeft(40, 2, 198, 47, 57, shade(C.red, 1.15));   // its red strip, lit
  ibox(14, 46, 112, 104, 70, 76, C.red, shade(C.white, 0.42));          // the canopy: its red edge lit (its top in the dark)
  for (const [gx, gy] of [[40, 70], [80, 70], [40, 90], [80, 90]]) { const g = P(gx, gy, 0); lampGlow(g[0], g[1], 26, d); }   // pools of light under it
}
// The petrol station on the town map at night: a glow over its forecourt and kiosk
function petrolLightsOnMap(d) {
  const i = placeIndex('Petrol Station');
  if (i < 0) return;
  ISO.ox = S.cam.ox; ISO.oy = S.cam.oy;
  const x0 = (i % 7) * BLOCK + STREET, y0 = Math.floor(i / 7) * BLOCK + STREET;
  const g = P(x0 + 25, y0 + 41, 0); lampGlow(g[0], g[1], 22, d);         // under the canopy
  onLeft(y0 + 30, x0 + 44, x0 + 56, 1, 8, LIT);                         // the kiosk window
  keepHud(36);
}
const BUILDING_BACK = -60;
// Outside the bank: stone, three steps up to a row of columns, a pediment over them, big doors (as on the town map)
const BANK_DOOR = [84, 116];                                                         // the bank's big doors: from x, to x (in the middle)
function bankFront(name, shut) {
  ISO.ox = OUTSIDE_VIEW[0]; ISO.oy = OUTSIDE_VIEW[1];
  streetFront();
  const stone = hex('#d8d0b8');
  ibox(-130, BUILDING_BACK, -2, 40, 0, 60, C.cream, C.steel); winLeft(40, -110, -70, 12, 40); winLeft(40, -50, -20, 12, 40);   // the shop to its left
  ibox(0, BUILDING_BACK, 200, 26, 0, 70, stone, hex('#c0b8a0'));                     // the main hall, set back behind its columns
  for (let k = 0; k < 3; k++) ibox(2, 26 + k * 5, 198, 31 + k * 5, 0, 6 - k * 2, shade(stone, 0.92 - k * 0.04));   // the steps up to it
  const [d0, d1] = BANK_DOOR;                                                         // the doors, in the middle (as on the town map: Steve)
  for (let x = 10; x <= 186; x += 22) { if (x + 6 > d0 && x < d1) continue; ibox(x, 28, x + 6, 34, 6, 62, C.white); }   // the columns (none in front of the doors)
  ibox(2, 26, 198, 36, 62, 70, stone);                                               // the beam along the top
  poly([P(2, 36, 70), P(198, 36, 70), P(100, 36, 92)], shade(stone, 0.95));           // the pediment
  frontSign(name.toUpperCase(), 20, 36, 160, 69, 7);
  onLeft(26, d0, d1, 6, 46, shut ? C.ink : hex('#5a3a22'));                           // the big doors
  onLeft(26, (d0 + d1) / 2 - 1, (d0 + d1) / 2 + 1, 6, 46, C.ink);                     // the gap between them
  ibox(202, BUILDING_BACK, 320, 40, 0, 70, shade(C.brick, 0.95), C.steel); bricks(202, BUILDING_BACK, 320, 40, 70, C.brickLine); winLeft(40, 220, 260, 14, 44);   // the one to its right (in front)
  drivenCar(40, 72, 1);                                                              // your car at the kerb
  if (!(ANIM && ANIM.kind === 'walk')) { const [x, y] = manSpot('place'), m = P(x, y); man(m[0], m[1], 'stand', 2); }
}                                                // how far back the buildings on the street go (their fronts are at y = 40)
// A big picture sign standing on the roofline above a shop's name, on its front (y = 40): what the shop is (Steve)
//   the Phone Shop a mobile, Worn Out and Tired a tyre, the PC Shop a laptop (the Post Office has its red board instead: Steve)
const ROOF_SIGNS = { 'Phone Shop': phoneShopSign, 'Worn Out and Tired': tyrePlaceSign, 'PC Shop': pcShopSign, 'Police Station': policeBadgeSign };
function roofSign(name) {
  const draw = ROOF_SIGNS[name];
  if (!draw) return;                                                      // most shops have only their name
  for (const x of [88, 110]) onLeft(40, x, x + 2, 84, 88, C.steel);       // two brackets holding it up
  draw();
}
// The Phone Shop: a mobile phone standing up, its screen lit, a home button
function phoneShopSign() {
  onLeft(40, 92, 108, 86, 116, hex('#1c1c20'));                           // the phone
  onLeft(40, 94, 106, 91, 112, hex('#5ab0f0'));                           // its screen
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) onLeft(40, 95 + k * 4, 97 + k * 4, 103 - r * 4, 105 - r * 4, C.white);   // app icons
  onLeft(40, 99, 101, 87, 89, C.steel);                                   // the home button
}
// Worn Out and Tired: a tyre standing on its edge, tread round it, a silver wheel in the middle
function tyrePlaceSign() { tyreSign(40, 100, 100, 1); }
// The tyre sign on a wall facing you (y = yf), its middle at cx, cz; s: its size (1 = the street's; the town map's is smaller)
function tyreSign(yf, cx, cz, s) {
  const r = 14 * s, block = 3 * s;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {                   // the tyre, as a ring of chunky tread blocks
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    onLeft(yf, x - block, x + block, z - block, z + block, C.tyre);
  }
  onLeft(yf, cx - 9 * s, cx + 9 * s, cz - 9 * s, cz + 9 * s, C.tyre);     // its sidewall
  onLeft(yf, cx - 6 * s, cx + 6 * s, cz - 6 * s, cz + 6 * s, C.rim);      // the wheel
  onLeft(yf, cx - 2 * s, cx + 2 * s, cz - 2 * s, cz + 2 * s, C.steel2);   // its hub
}
// A police badge on a wall facing you (y = yf): a silver shield, navy inside, a gold star in the middle (Steve)
//   cx: its middle across; z0: the bottom of its point; s: its size (1 = the close-up's)
function policeBadge(yf, cx, z0, s) {
  const shield = (inset, col) => poly([[-14, 26], [14, 26], [14, 12], [0, 0], [-14, 12]].map(([u, v]) => {
    const k = (14 - inset) / 14;                                          // shrink towards its middle
    return P(cx + u * k * s, yf, z0 + (13 + (v - 13) * k) * s);
  }), col);
  shield(0, hex('#c8ccd4'));                                              // the silver rim
  shield(3, hex('#1a2a5a'));                                              // the navy inside
  const pts = [];                                                         // the gold star: five points
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 5, r = (k % 2 ? 3 : 7) * s;
    pts.push(P(cx + Math.cos(a) * r, yf, z0 + 14 * s - Math.sin(a) * r));
  }
  poly(pts, hex('#f0c030'));
}
// Battenburg checks: two rows of blue and white squares along a wall facing you (y = yf), from x0 to x1, from z up
function policeChecks(yf, x0, x1, z, sq) {
  for (let row = 0; row < 2; row++) for (let x = x0, k = 0; x < x1; x += sq, k++) {
    onLeft(yf, x, Math.min(x1, x + sq), z + row * sq, z + (row + 1) * sq, (k + row) % 2 ? C.white : hex('#1a4ab0'));
  }
}
// The Police Station's sign: the badge, big, above its name
function policeBadgeSign() { policeBadge(40, 100, 84, 1); }
// The PC Shop: a laptop, open, its screen lit
function pcShopSign() {
  onLeft(40, 84, 116, 94, 116, hex('#2a2a30'));                           // the lid
  onLeft(40, 86, 114, 96, 114, hex('#3a80c8'));                           // its screen
  onLeft(40, 88, 100, 108, 112, C.white); onLeft(40, 88, 108, 102, 104, shade(C.white, 0.8));   // a window on it
  onLeft(40, 80, 120, 88, 94, hex('#9a9aa2'));                            // the keyboard half, seen from the front
  onLeft(40, 80, 120, 88, 89, hex('#6a6a72'));                            // its front edge
}
function shopExterior(name, shut) {
  if (name === 'Petrol Station') return petrolFront(name, shut);
  if (name === 'Bank') return bankFront(name, shut);
  const info = PLACE_INFO[name] || {}, style = placeStyle(name), pub = style === 'pub';
  const i = placeIndex(name), cat = i >= 0 ? PLACES[i][1] : 'other', col = pub ? C.cream : name === POLICE ? hex('#2a3a6a') : name === 'BustBlockers' ? BUST_BLUE : hex(CAT[cat][1]);   // the pub: cream, with black timbers
  ISO.ox = OUTSIDE_VIEW[0]; ISO.oy = OUTSIDE_VIEW[1];
  streetFront();                                                         // grass, the road, the kerb and the pavement
  // the shops either side
  ibox(-130, BUILDING_BACK, -2, 40, 0, 60, C.cream, C.steel); winLeft(40, -110, -70, 12, 40); winLeft(40, -50, -20, 12, 40);
  // this shop: walls, a sign board along the top, an awning, big windows with stock in them, the door
  ibox(0, BUILDING_BACK, 200, 40, 0, 84, col, C.steel);
  // the one to its right is nearer to you, so it's drawn after (it hides the shop's side wall)
  ibox(202, BUILDING_BACK, 320, 40, 0, 70, shade(C.brick, 0.95), C.steel); bricks(202, BUILDING_BACK, 320, 40, 70, C.brickLine); winLeft(40, 220, 260, 14, 44);
  onLeft(40, 0, 200, 60, 78, C.white); onLeft(40, 2, 198, 61, 77, name === POLICE ? C.white : shade(col, 1.15));
  if (name === 'BustBlockers') { onLeft(40, 2, 198, 61, 77, BUST_BLUE); bustTicket(40, 20, 180, 61, 77); }   // the bust video shop: its yellow ticket sign on blue   // (the police: a white board, so the name reads on the dark blue)
  if (name === 'BustBlockers') frontSign('BUSTBLOCKERS', 34, 40, 142, 76, 14, '#1a3a9a');   // its name in blue on the ticket
  else if (name === 'Post Office') postOfficeBoard(40, 2, 198, 61, 77);                 // a red board, POST OFFICE in white (Steve)
  else frontSign(name, 6, 40, 188, 77, 16);
  roofSign(name);                                                                                                    // a picture sign above its name: the envelope, the phone, the tyre, the laptop (Steve)
  if (pub) {                                                                                                       // the pub: timbers, a hanging sign, no awning
    for (let x = 0; x <= 196; x += 22) onLeft(40, x, x + 4, 0, 60, hex('#2a1a12'));
    onLeft(40, 0, 200, 46, 49, hex('#2a1a12'));
    ibox(196, 40, 200, 58, 74, 76, hex('#2a1a12')); onLeft(58, 190, 204, 50, 72, hex('#7a2a20')); onLeft(58, 192, 202, 52, 70, hex('#a04a30'));
  } else if (name === POLICE) policeChecks(40, 0, 200, 48, 6);                                                         // the police: blue and white checks along the front, no awning
  else for (let x = 0; x < 140; x += 10) onLeft(40, x, x + 5, 50, 58, (x / 10) % 2 ? C.white : shade(col, 0.8));        // the striped awning
  onLeft(40, 10, 136, 8, 46, C.white); onLeft(40, 12, 134, 10, 44, C.glass);                                         // the shop window
  for (let k = 0; k < 10; k++) onLeft(40, 16 + k * 12, 24 + k * 12, 11, 16 + (k % 3) * 5, [CARDBOARD, C.red, C.car, C.warm, C.white][(k + i) % 5]);   // stock in the window
  onLeft(40, 72, 74, 10, 44, C.white);
  onLeft(40, 148, 176, 0, 50, C.white); onLeft(40, 150, 174, 0, 48, shade(col, 0.6)); onLeft(40, 152, 172, 18, 46, C.glass);   // the door
  { const k = P(170, 40, 24); rect(k[0], k[1], 2, 2, C.steel); }
  // the sign on the door: OPEN, CLOSED, gone, or on holiday
  const doorSign = info.gone ? 'TO LET' : info.holiday ? 'AWAY' : shut && info.byAppointment ? 'APPT' : shut ? 'CLOSED' : 'OPEN';   // the yard: by appointment
  const signHalf = (textW(doorSign) + 3) / 2;                            // half its width: the sign is as wide as its word
  onLeft(40, 162 - signHalf, 162 + signHalf, 27, 36, C.white);
  boardText(doorSign, 40, 162 - signHalf, 162 + signHalf, 27, 36, doorSign === 'OPEN' ? hex('#2a8a3a') : C.red);   // sloping with the door
  if (info.gone) {                                                                                                   // boarded up
    onLeft(40, 10, 136, 8, 46, C.wood); for (let z = 12; z < 46; z += 8) onLeft(40, 10, 136, z, z + 1, C.bench);
    onLeft(40, 150, 174, 0, 48, C.wood);
  } else if (shut) {                                                                                                 // the shutter down over the window
    onLeft(40, 10, 136, 8, 46, C.steel); for (let z = 10; z < 46; z += 3) onLeft(40, 10, 136, z, z + 1, C.steel2);
  }
  // on the pavement: an A-board, a bin, a lamp post
  ibox(110, 48, 122, 52, 0, 16, C.ink); onLeft(52, 111, 121, 4, 14, C.white);
  ibox(20, 46, 28, 52, 0, 12, C.tree2);
  ibox(-20, 60, -17, 63, 0, 70, C.greyDark); ibox(-24, 58, -10, 66, 70, 74, C.greyDark); onLeft(66, -22, -12, 69, 70, C.warm);
  if (name === 'Post Office') postQueueOutside();                                                                     // before it opens: the queue along the pavement
  if (pub && S.flags.sick === S.day) sickPuddle(1);                                                                   // where he was sick (it's there all day)

  // your car (blue), parked at the kerb
  const fetching = ANIM && ['pubfetch', 'publeave'].includes(ANIM.kind);   // (she's come for you: the moment draws the cars and her: lift.js)
  if (!(fetching && inWifesCar())) drivenCar(40, 72, 1);
  const sheIsHere = pub && S.flags.pickup === S.day && !fetching;
  if (sheIsHere && !inWifesCar()) { const [hx, hy] = fetchCarAt(); isoCar(hx, hy, 1, WIFE_CAR, { alongX: true, shape: 'city' }); drivenCar(40, 72, 1); }   // her car, behind yours
  if (sheIsHere) wife(PICKUP_AT[0], PICKUP_AT[1], S.wifeLook || 'navy', { hip: true });       // she's come to fetch him: by the car, in her dress
  if (!(ANIM && ['walk', 'sick', 'taxipub', 'publeave'].includes(ANIM.kind))) { const [x, y] = manSpot('place'), m = P(x, y); man(m[0], m[1], 'stand', 2); if (carryingTyre()) carriedTyre(m); }   // (in the taxi moment, it draws him)
}
// ---------- outside the pub, after too many ----------
const PICKUP_AT = [92, 58];                                          // where she stands to fetch him: on the pavement, by the front of your car
const SICK = hex('#a8b040'), SICK_DARK = hex('#7c8428');             // sick (sorry)
// The puddle on the pavement in front of him; grow = 0 (none yet) to 1 (all of it)
function sickPuddle(grow) {
  if (grow <= 0) return;
  const [x, y] = manSpot('place'), m = P(x, y);
  const cx = m[0] + 16, cy = m[1] + 1;                               // just in front of his feet
  ellipse(cx, cy, Math.round(7 * grow), Math.round(3 * grow), SICK_DARK);
  ellipse(cx, cy, Math.round(5 * grow), Math.round(2 * grow), SICK);
}

// =====================================================================
// THE POST OFFICE QUEUES
//   Outside, before it opens: from 6am a queue grows along the pavement, from the door leftwards
//   (6am nobody, 7am 3, 8am 6); people join behind you until 9, when it opens and they all go in.
//   In the queue outside before 9: in you go when it opens, and there's no queue (Steve). Turn up after 9: the queue's all
//   inside, ten people, it never moves, and you can't skip it (not even to pay a fine).
//   Getting there: set off between 6 and 9 and you hit the roadworks, so you park at 9:10, too late. To beat them: the alarm at
//   5, or be there the night before and sleep in the car.
// =====================================================================
const PO_OPENS = 9 * 60;                                             // the door opens
const PO_QUEUE_STARTS = 6 * 60;                                     // the first ones turn up
const PO_OUTSIDE_SLOTS = 10;                                        // room along the pavement (you and nine more)
// How many are queuing outside who turned up by time t (3 an hour from 6am; not after 9)
function poQueueBy(t) {
  if (t < PO_QUEUE_STARTS) return 0;
  return Math.min(PO_OUTSIDE_SLOTS - 1, Math.floor((Math.min(t, PO_OPENS - 1) - PO_QUEUE_STARTS) / 20));
}
// Did you get here before it opened today? (you're in the queue outside)
function poInQueue() { return !!S.po && S.po.day === S.day && S.po.arrived < PO_OPENS; }
// How many were in front of you when you got here
function poAhead() { return poInQueue() ? poQueueBy(S.po.arrived) : 0; }
// When you get served, if you were in the queue outside: as soon as it opens
function poServedAt() { return PO_OPENS; }

// ----- the roadworks on the way, and sleeping in the car outside -----
const PO_JAM_PARKED = PO_OPENS + 10;                                // stuck in the roadworks, you park at 9:10
const PO_ROAD_OPENS = 6 * 60;                                       // the roadworks start at 6
const PO_WAKE = 5 * 60 + 45;                                        // asleep in the car, you wake at 5:45
// Driving to the post office: between 6 and 9 the roadworks hold you up until 9:10.
// Returns null (no hold-up), or { mins: how long the trip takes, words: what happened }
function poJam() {
  if (S.place === 'Post Office') return null;                       // already here
  const t = S.mins;
  if (t >= PO_OPENS) return null;                                   // after 9 the roads are clear (no point, by then)
  if (t < PO_ROAD_OPENS) return null;                               // before 6 there's nobody about: up with the alarm, you beat it (Steve)
  const mins = Math.max(20, PO_JAM_PARKED - t);                     // however early you set off, you park at 9:10
  const parked = `It's ${hhmm(t + mins)} by the time you park. The queue has already gone in.`;
  const hint = '\n\nAt this rate you\'d have to set off before six.';
  return { mins, words: `Roadworks on Station Road. Temporary lights, stuck on red. Nobody moves.\n\n${parked}${hint}` };
}
// Can you sleep in the car outside the post office now? (it's shut for the night, and it's not yet 5:45)
function poCanSleep() {
  if (S.screen !== 'place' || S.place !== 'Post Office' || S.inside) return false;   // only outside it, in the car
  const evening = S.mins >= (PLACE_INFO['Post Office'].open[1]);  // shut for the day
  const night = S.mins < PO_WAKE;                                   // or the small hours
  return evening || night;
}
// Time passes while you're outside the post office: if you've been here since the day before, you're first in the queue
function poStayedOvernight() {
  if (S.screen !== 'place' || S.place !== 'Post Office' || S.inside) return;
  if (!S.po || S.po.day !== S.day - 1) return;                      // got here today, or long ago
  S.po = { day: S.day, arrived: 0 };                                // here all night: since before anyone
  S.spot.outside = poSlot(0);                                       // at the door, first
}
// Where slot k of the outside queue is: along the pavement by the wall, from the door leftwards
const poSlot = k => [160 - k * 12, 45];
// Draw the queue outside, before it opens: the ones in front of you, then the ones who came after you
function postQueueOutside() {
  if (S.mins >= PO_OPENS) return;                                   // open: they're all inside
  const inQueue = poInQueue(), ahead = poAhead();
  const everyone = poQueueBy(S.mins);                                // everyone who's turned up (not you)
  const slots = [];
  for (let k = 0; k < everyone; k++) {
    const slot = inQueue && k >= ahead ? k + 1 : k;                  // the ones who came after you stand behind you
    slots.push(slot);
  }
  slots.sort((a, b) => a - b).reverse().forEach(k => {                // the far end first (it's further back)
    const [x, y] = poSlot(k), m = P(x, y);
    man(m[0], m[1], 'stand', 2, 0, QUEUE_LOOKS[(k * 3) % QUEUE_LOOKS.length]);
  });
}
const QUEUE_LOOKS = [
  { shirt: hex('#8a5a9a'), shirtDark: hex('#6a3a7a'), hair: C.white }, { shirt: hex('#3a7a4a'), shirtDark: hex('#2a5a34') },
  { shirt: C.warm, shirtDark: C.warmDim, hair: hex('#202020') }, { shirt: hex('#a04040'), shirtDark: hex('#702828'), hair: C.steel },
  { shirt: hex('#4a6aa0'), shirtDark: hex('#2a4a80'), jeans: C.ink, jeansDark: C.ink }, { shirt: C.white, shirtDark: C.steel, hair: hex('#c08040') },
  { shirt: hex('#e070a8'), shirtDark: hex('#b05080'), hair: hex('#202020') }, { shirt: C.greyDark, shirtDark: C.ink, hair: C.white },
  { shirt: hex('#c0a040'), shirtDark: hex('#907020') }, { shirt: hex('#40a090'), shirtDark: hex('#2a7060'), hair: hex('#803020') }
];
// Where each person in the queue stands: two rows, snaking back from the counter to the door
const QUEUE_SPOTS = [[104, 80], [92, 86], [80, 92], [68, 98], [56, 104], [56, 116], [68, 122], [80, 128], [92, 134], [104, 140]];
function postFirst() { return S.flags.poFirst === S.day; }
function postQueue() {
  if (postFirst()) return;                                          // in the queue before it opened: no queue now
  const spots = QUEUE_SPOTS;                                        // otherwise they're all in front of you
  spots.slice().sort((a, b) => (a[0] + a[1]) - (b[0] + b[1])).forEach(([x, y], k) => {
    const m = P(x, y);
    man(m[0], m[1], 'stand', 2, 0, QUEUE_LOOKS[(k * 3) % QUEUE_LOOKS.length]);
  });
}
