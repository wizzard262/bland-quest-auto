// The Thankless Task: inside the places in town, and the breakers yard.
// Each kind of shop has its own stock, posters and shopkeeper. You walk round; tap the shopkeeper to talk.

// ---------- what kind of inside each place has ----------
const STYLE_BY_CAT = { parts: 'parts', mech: 'garage', elec: 'elec', trans: 'gearbox', tools: 'tools', big: 'aisles', yard: 'yard' };
const STYLE_BY_NAME = {
  'Post Office': 'parcels', 'Courier Depot': 'parcels', 'Library (free Wi-Fi)': 'books', 'Café': 'cafe',
  'PC Shop': 'gadgets', 'Phone Shop': 'gadgets', 'Tyre Place': 'tyres', 'MOT Test Centre': 'garage',
  'Machine Shop (lathe)': 'workshop', 'Makerspace (3D printer)': 'workshop', 'Bank': 'bank',
  'The Rusty Spanner': 'pub', 'Pound Shop': 'aisles', 'Petrol Station': 'aisles'
};
function placeStyle(name) {
  const i = placeIndex(name), cat = i >= 0 ? PLACES[i][1] : 'other';
  if (cat === 'people' || cat === 'home') return 'house';
  return STYLE_BY_NAME[name] || STYLE_BY_CAT[cat] || 'aisles';
}
// The shopkeeper's clothes for each kind of place
const BLUE_OVERALLS = { shirt: hex('#2848a0'), shirtDark: hex('#1c3478'), jeans: hex('#2848a0'), jeansDark: hex('#1c3478'), hair: hex('#202020') };
const KEEPER = {
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
  ISO.ox = SHOP_VIEW[0]; ISO.oy = SHOP_VIEW[1];
  const style = placeStyle(S.place);
  const at = style === 'house' ? [78, 46] : KEEPER_AT, p = P(at[0], at[1]);
  return [p[0] + 2, p[1] - 40];
}

// ---------- the pub: a flat, side-on view of the bar (not isometric) ----------
const PUB = { barTop: 166, floor: 232, keeper: 236, stools: [120, 300, 350] };   // the bar's top, the floor, the barman, the stools (yours first)
const PUB_SEAT_Y = 214;                                       // where someone sat on a stool is drawn from (their hips on the seat)
function pubScene(shut) {
  // the back wall: dark wood panels, a big mirror, shelves of drinks
  rect(0, 18, W, PUB.floor - 18, hex('#4a2e20'));
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
  LABELS.push(`<div class="front" style="left:${200 / W * 100}%;top:${22 / H * 100}%;width:${200 / W * 100}%;height:${30 / H * 100}%;font-size:${16 / W * 100}cqw;line-height:${30 / W * 100}cqw;text-align:center;transform:none">${esc(S.place)}</div>`);
  // a poster, and the fruit machine
  rect(20, 70, 64, 44, C.white); rect(22, 72, 60, 40, C.warm);
  LABELS.push(`<div class="front" style="left:${22 / W * 100}%;top:${74 / H * 100}%;width:${60 / W * 100}%;height:${36 / H * 100}%;font-size:${7 / W * 100}cqw;line-height:${10 / W * 100}cqw;text-align:center;transform:none">QUIZ NIGHT THURSDAY<br>no car talk</div>`);
  rect(400, 110, 50, PUB.floor - 110, hex('#7a2a8a')); rect(408, 120, 34, 22, hex('#202030'));
  for (const rx of [411, 422, 433]) rect(rx, 124, 7, 14, C.white);                      // its reels
  // the barman, behind the bar (it hides his legs)
  if (!shut) man(PUB.keeper, PUB.barTop + 8, 'stand', 2, 0, KEEPER.pub);
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
  for (const sx of PUB.stools) {
    rect(sx - 8, 196, 18, 4, C.redDim); rect(sx, 200, 2, PUB.floor - 200, C.steel2);
    rect(sx - 4, 216, 10, 1, C.steel2); rect(sx - 6, PUB.floor - 2, 14, 2, C.steel2);
  }
  PUNTERS.forEach((p, k) => man(PUB.stools[k + 1], PUB_SEAT_Y, 'sit', 2, 0, p.look));
  if (S.flags.pubSat) man(PUB.stools[0], PUB_SEAT_Y, 'sit', 2);
  else man(64, PUB.floor + 6, 'stand', 2);
  // the way out: a see-through door on the left
  const d = [[16, 140], [56, 140]];
  dashedLine([16, PUB.floor], d[0], C.mint); dashedLine(d[0], d[1], C.mint); dashedLine(d[1], [56, PUB.floor], C.mint);
  rect(50, 186, 3, 2, C.mint);
}
// What you can tap in the pub
function pubSpots(shut) {
  if (!shut) spot('Talk to the barman', [PUB.keeper - 14, PUB.barTop - 46, 30, 54], 'act:talk');
  PUNTERS.forEach((p, k) => spot('Talk to ' + p.name, [PUB.stools[k + 1] - 10, 160, 22, 60], 'act:punter:' + k));
  spot('Door: leave', [14, 138, 44, PUB.floor - 138], 'act:leave');
}
// Where the pub people's heads are (for their speech bubbles)
const pubKeeperHead = () => [PUB.keeper + 2, PUB.barTop + 8 - 40];
const pubPunterHead = k => [PUB.stools[k + 1] + 2, PUB_SEAT_Y - 40];
// The two regulars at the bar
const PUNTERS = [
  { name: 'Old Ron', look: { shirt: hex('#7a6040'), shirtDark: hex('#5a4428'), jeans: hex('#4a4a50'), jeansDark: hex('#3a3a40'), hair: C.steel },
    lines: ['"In my day you could fix a car with a hammer and a pair of tights."', '"It\'s the timing belt. It\'s always the timing belt."', '"Never trust a car with a computer in it. Or a man with a code reader."'] },
  { name: 'Sue', look: { shirt: hex('#8a4ab0'), shirtDark: hex('#6a3090'), jeans: C.jeans, jeansDark: C.jeansDark, hair: hex('#c04020') },
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
  }
  // the shopkeeper behind the counter (drawn first so the counter hides his legs), then the counter and the till
  if (!shut) { const m = P(KEEPER_AT[0], KEEPER_AT[1]); man(m[0], m[1], 'stand', 2, 0, look); }
  ibox(COUNTER[0], COUNTER[1], COUNTER[2], COUNTER[3], 0, 22, C.bench, C.benchTop);
  onLeft(COUNTER[3], COUNTER[0] + 4, COUNTER[2] - 4, 16, 18, shade(C.bench, 1.2));
  till(56, 54);
  if (style === 'bank') { ibox(COUNTER[0], COUNTER[1], COUNTER[2], COUNTER[1] + 2, 22, 58, hex('#b8d8f0'), hex('#d8f0ff')); }
  if (style === 'cafe') { ibox(60, 54, 74, 64, 22, 36, C.steel2, C.tool); disc(...P(67, 64, 30), 2, C.red); }
  if (style === 'parcels') { ibox(80, 54, 96, 64, 22, 24, C.steel, C.steel2); }
  if (shut) { onLeft(COUNTER[3], 80, 130, 28, 40, C.ink); LABELS.push(''); }
  // things standing on the floor in front of the counter
  if (FLOOR[style]) FLOOR[style]();
  if (name === 'Post Office') postQueue();
  // you
  if (!(ANIM && ANIM.kind === 'walk')) { const [x, y] = manSpot('place'), m = P(x, y); man(m[0], m[1], 'stand', 2); }
}
// A friend's front door, with them at it
function houseDoorstep(name, col, shut, look) {
  ground(-300, -300, 500, 500, C.grass);
  ground(-300, 120, 500, 140, C.drive);
  ibox(0, 0, 160, 40, 0, 70, col);
  bricks(0, 0, 160, 40, 70, shade(col, 0.85));
  onLeft(40, 66, 90, 0, 44, C.white); onLeft(40, 68, 88, 0, 42, C.door);
  winLeft(40, 20, 44, 26, 46); winLeft(40, 112, 136, 26, 46);
  for (const x of [8, 140]) { ibox(x, 44, x + 14, 54, 0, 6, C.tree2); for (let k = 0; k < 6; k++) px(...P(x + 2 + k * 2, 49, 7), [C.red, C.warm, C.white][k % 3]); }
  ground(66, 40, 90, 120, C.concrete);
  if (!shut) { const m = P(78, 46); man(m[0], m[1], 'stand', 2, 0, look); }
  if (!(ANIM && ANIM.kind === 'walk')) { const [x, y] = manSpot('place'), m = P(x, y); man(m[0], m[1], 'stand', 2); }
}
// A cash register on the counter: body, a green display, a card machine
function till(x, y) {
  ibox(x, y, x + 16, y + 12, 22, 30, C.greyDark, C.grey);
  ibox(x + 2, y, x + 14, y + 3, 30, 36, C.ink);
  onLeft(y + 3, x + 3, x + 13, 31, 35, hex('#40c070'));
  ibox(x + 20, y + 4, x + 25, y + 10, 22, 24, C.ink, C.grey);
}
// Two posters on the side wall, with real (slanted) words on them
function posters(style) {
  const [a, b] = POSTERS[style] || ['', ''];
  if (!a) return;
  onRight(0, 70, 110, 30, 56, C.white); onRight(0, 72, 108, 32, 54, C.warm);
  onRight(0, 118, 140, 34, 56, C.white); onRight(0, 120, 138, 36, 54, hex('#e070a8'));
  wallText(a, 110, 50, 40, 8); wallText(b, 110, 41, 40, 6);
  wallText('SALE', 140, 50, 22, 8);
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
  const fit = Math.min(tall * 0.8, len / (Math.max(words.length, 3) * 0.56));
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
// Things on the shop floor, in front of the counter
const FLOOR = {
  parts() { for (let k = 0; k < 6; k++) ibox(176, 84 + k * 8, 186, 90 + k * 8, 0, 14 + (k % 2) * 4, [C.warm, C.red, C.car][k % 3]); },
  garage() { for (let n = 0; n < 4; n++) { const p = P(178, 120, 3 + n * 6); ellipse(p[0], p[1], 12, 6, C.tyre); ellipse(p[0], p[1], 5, 2, C.greyDark); } ibox(20, 120, 34, 134, 0, 12, C.red); ibox(40, 120, 54, 134, 0, 12, C.red); },
  aisles() { ibox(170, 100, 190, 130, 0, 26, C.white, C.steel); for (let k = 0; k < 6; k++) ibox(172, 102 + k * 4, 188, 105 + k * 4, 26, 30, [C.red, C.warm, C.car][k % 3]); },
  cafe() { for (const [x, y] of [[30, 110], [150, 110]]) { ibox(x, y, x + 20, y + 20, 14, 16, C.white); ibox(x + 9, y + 9, x + 11, y + 11, 0, 14, C.tool); } },
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
SCREENS.yard = {
  size: [480, 270],
  paint() {
    ISO.ox = YARD_VIEW[0]; ISO.oy = YARD_VIEW[1];
    grime(0, 0, W, H, hex('#8a7a60'), 0.25, 91);                                               // dirt and gravel
    ground(-60, -60, 220, 200, hex('#7a6a50'));
    for (let n = 0; n < 500; n++) { const p = P(-60 + hash(n, 1) * 280, -60 + hash(1, n) * 260); px(p[0], p[1], hash(n, n) < 0.5 ? hex('#5a4a38') : hex('#a89878')); }
    for (let x = -60; x <= 220; x += 14) { ibox(x, -62, x + 2, -60, 0, 30, C.wood); }            // the fence
    line(...P(-60, -61, 26), ...P(220, -61, 26), C.wood); line(...P(-60, -61, 14), ...P(220, -61, 14), C.wood);
    ibox(170, -50, 214, -20, 0, 34, hex('#e0e0d0'), C.steel); winLeft(-20, 178, 194, 14, 26); onLeft(-20, 200, 210, 0, 24, C.door);   // the office
    for (let n = 0; n < 4; n++) { const p = P(-40, 140, 3 + n * 6); ellipse(p[0], p[1], 12, 6, C.tyre); ellipse(p[0], p[1], 5, 2, hex('#5a4a38')); }   // tyres
    for (let n = 0; n < 3; n++) { const p = P(-30, 40 + n * 20, 3); ellipse(p[0], p[1], 10, 5, C.tyre); }
    WRECKS.forEach(([x, y, col, stacked, , shape, how], i) => {
      if (stacked) isoCar(x + 2, y - 4, 1, shade([C.steel2, C.redDim][i % 2], 0.8), { broken: true, noWheels: true, shape: 'zafiraOld' });   // the wreck underneath
      isoCar(x, y, 1, shade(col, 0.85), Object.assign({ broken: true, shape, dz: stacked ? 12 : 0 }, how));
    });
    const d = P(190, 0); rect(d[0] - 10, d[1] - 7, 18, 7, hex('#8a6a4a')); rect(d[0] + 6, d[1] - 11, 5, 5, hex('#8a6a4a'));   // the dog
    if (!(ANIM && ANIM.kind === 'walk')) { const [x, y] = manSpot('yard'), m = P(x, y); man(m[0], m[1], 'stand', 2); }
    WRECKS.forEach(([x, y, , stacked, , shape], i) => {
      const k = CAR_SHAPES[shape];                                                           // the tap area fits the car's size
      spot(S.flags['wreck' + i] ? 'Looked at it' : 'Look at this one', isoArea(x, y, x + 24, y + k.L, 0, k.rz + (stacked ? 12 : 0)), 'act:wreck:' + i, [x + 30, y + 30]);
    });
    spot('Back to the office', isoArea(170, -50, 214, -20, 0, 34), 'place:Breakers Yard', [190, 0]);
    tip('Breakers Yard', 'Six of them might be yours. Look at each.', 1, 8);
    hud();
  },
  actions() { return [{ label: 'Back to the map', act: 'go:city' }]; }
};

// =====================================================================
// OUTSIDE A PLACE: the shop front, from the pavement. You see this first; go in through the door
// =====================================================================
const OUTSIDE_VIEW = [250, 70];
function shopExterior(name, shut) {
  const i = placeIndex(name), cat = i >= 0 ? PLACES[i][1] : 'other', col = hex(CAT[cat][1]);
  const info = PLACE_INFO[name] || {}, style = placeStyle(name);
  ISO.ox = OUTSIDE_VIEW[0]; ISO.oy = OUTSIDE_VIEW[1];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) px(x, y, hash(x, y) < 0.1 ? C.grassDark : C.grass);
  // the road, the kerb and the pavement
  ground(-400, 66, 600, 120, C.road);
  for (let x = -400; x < 600; x += 24) line(...P(x, 94), ...P(x + 12, 94), C.white);
  ground(-400, 40, 600, 66, C.drive); line(...P(-400, 66), ...P(600, 66), C.white);
  for (let x = -400; x < 600; x += 12) line(...P(x, 40), ...P(x, 66), shade(C.drive, 0.9));
  // the shops either side
  ibox(-130, 0, -2, 40, 0, 60, C.cream, C.steel); winLeft(40, -110, -70, 12, 40); winLeft(40, -50, -20, 12, 40);
  ibox(202, 0, 320, 40, 0, 70, shade(C.brick, 0.95), C.steel); bricks(202, 0, 320, 40, 70, C.brickLine); winLeft(40, 220, 260, 14, 44);
  // this shop: walls, a sign board along the top, an awning, big windows with stock in them, the door
  ibox(0, 0, 200, 40, 0, 84, col, C.steel);
  onLeft(40, 0, 200, 60, 78, C.white); onLeft(40, 2, 198, 61, 77, shade(col, 1.15));
  frontSign(name, 6, 40, 188, 77, 16);
  for (let x = 0; x < 140; x += 10) onLeft(40, x, x + 5, 50, 58, (x / 10) % 2 ? C.white : shade(col, 0.8));        // the striped awning
  onLeft(40, 10, 136, 8, 46, C.white); onLeft(40, 12, 134, 10, 44, C.glass);                                         // the shop window
  for (let k = 0; k < 10; k++) onLeft(40, 16 + k * 12, 24 + k * 12, 11, 16 + (k % 3) * 5, [CARDBOARD, C.red, C.car, C.warm, C.white][(k + i) % 5]);   // stock in the window
  onLeft(40, 72, 74, 10, 44, C.white);
  onLeft(40, 148, 176, 0, 50, C.white); onLeft(40, 150, 174, 0, 48, shade(col, 0.6)); onLeft(40, 152, 172, 18, 46, C.glass);   // the door
  { const k = P(170, 40, 24); rect(k[0], k[1], 2, 2, C.steel); }
  // the sign on the door: OPEN, CLOSED, gone, or on holiday
  const doorSign = info.gone ? 'TO LET' : info.holiday ? 'HOLIDAY' : shut ? 'CLOSED' : 'OPEN';
  onLeft(40, 154, 170, 28, 34, C.white);
  { const t = P(155, 40, 33); text(doorSign.slice(0, 4), t[0] + 1, t[1] + 2, doorSign === 'OPEN' ? hex('#2a8a3a') : C.red); }
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
  // your car (blue), parked at the kerb
  isoCarX(40, 72, 1, C.car);
  if (!(ANIM && ANIM.kind === 'walk')) { const [x, y] = manSpot('place'), m = P(x, y); man(m[0], m[1], 'stand', 2); }
}

// =====================================================================
// THE POST OFFICE QUEUE: ten people, and it never moves.
// Be standing outside when it opens at 9:00 and you're first; otherwise you're at the back
// =====================================================================
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
  // first in the queue: they all came in after you, behind you; otherwise they're all in front of you
  const spots = postFirst() ? QUEUE_SPOTS.slice(1).concat([[116, 146]]) : QUEUE_SPOTS;
  spots.slice().sort((a, b) => (a[0] + a[1]) - (b[0] + b[1])).forEach(([x, y], k) => {
    const m = P(x, y);
    man(m[0], m[1], 'stand', 2, 0, QUEUE_LOOKS[(k * 3) % QUEUE_LOOKS.length]);
  });
}
