// The Thankless Task: more things to do.
//   Anger: ways to calm down, and when you lose it you break something on the car (a new job)
//   The manuals shelf: read each book's spine, pull one down and look inside
//   Shop shelves: zoom in on a shelf to see what's really on it (the hammer they said they hadn't got)
//   The fuse diagram: not in the book; you have to find it online

// =====================================================================
// ANGER
// =====================================================================
// Your headlights: every time you lose it you kick one in, the left, then the right, then the left again…
// A smashed one is a job until you fit a new one (and then it can be kicked in again)
const LAMP_BREAKS = {
  left: { id: 'headlight', title: 'Replace the smashed left headlight (you kicked it)', what: 'You run at the car and kick the left headlight in. Glass everywhere.',
    lead: ['headlight', 'A new left headlight: the parts shop (dear), online, or the Breakers Yard', 'you', 'sure', 'place:Breakers Yard'] },
  right: { id: 'headlight2', title: 'Replace the smashed right headlight (you kicked it)', what: 'You run round the other side and kick the right headlight in. Now they match.',
    lead: ['headlight2', 'A new right headlight: online, or the Breakers Yard', 'you', 'sure', 'place:Breakers Yard'] }
};
// When a headlight's already smashed, losing it breaks something else instead, one at a time; each is a small job to fix
const CAR_BREAKS = [
  { id: 'mirror', title: 'Fix the wing mirror (you knocked it off)', what: 'You slam the car door so hard the wing mirror falls off.',
    lead: ['tape', 'Tape it back on: there\'s tape in drawer 4 of the toolbox', 'you', 'fairly sure', 'toolbox'] },
  { id: 'lens', title: 'Replace the cracked indicator lens (you kicked it)', what: 'You kick the front of the car. The indicator lens cracks.',
    lead: ['lens', 'Car Spares Direct might have one', 'you', 'maybe', 'place:Car Spares Direct'] },
  { id: 'stay', title: 'Straighten the bonnet stay (you slammed the bonnet)', what: 'You slam the bonnet. The bonnet stay bends like a paperclip.',
    lead: ['vice', 'Straighten it in the vice on the workbench', 'you', 'sure', 'bench'] },
  { id: 'wiper', title: 'Fix the wiper (you thumped the windscreen)', what: 'You thump the windscreen. A wiper arm snaps off.',
    lead: ['wiper', 'Any old wiper arm will do: the Breakers Yard', 'you', 'fairly sure', 'place:Breakers Yard'] }
];
// =====================================================================
const RAGE = { from: 'home', shook: false, done: false };
// The kick scene: your car drawn the same way as everywhere else (isometric), big, its nose towards him
const RAGE_ISO = { ox: 344, oy: 115, s: 4 };                  // where the car sits, and how big
const RAGE_FLOOR = 110;                                       // where the wall meets the floor
const RAGE_LAMP = [174, 180];                                 // the headlight nearest him (on screen), the one he kicks
const RAGE_CAR = [0, 220];                                    // [unused x, the floor line he runs along: his feet]
const RAGE_MAN = { size: 5, kickX: 144, standX: 132 };        // him: man-sized (19 x 5 = 95 tall); where he kicks from (his foot on the headlight) and stands after
// The car, its near headlight whole or smashed (that's the side he kicks; mirrored for the right one), the far one as it really is
function rageCar(smashed) {
  ISO.ox = RAGE_ISO.ox; ISO.oy = RAGE_ISO.oy;
  const k = kickedLamps();
  const far = RAGE.mirror ? k.left : k.right;                 // the other headlight, as it is
  isoCar(0, 0, RAGE_ISO.s, C.car, { lampState: { left: smashed, right: far } });
}
SCREENS.rage = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, RAGE_FLOOR, C.concrete, 0.08, 91);                                  // a plain wall: it's all about him and the car
    for (let y = 8; y < RAGE_FLOOR; y += 9) rect(0, y, W, 1, C.concreteDark);
    rect(0, RAGE_FLOOR, W, H - RAGE_FLOOR, C.floor); rect(0, RAGE_FLOOR, W, 1, C.steel2);   // the floor
    rageCar(RAGE.done || RAGE.already);                                                // once he's kicked it, it stays smashed
    if (RAGE.done) man(RAGE_MAN.standX, RAGE_CAR[1], 'stand', RAGE_MAN.size);                                 // and there he stands
  },
  actions() { return []; }
};
// Start the cutscene from wherever you are; when it's over (and he's sworn), you're back where you were
// side: the headlight he kicks; the right one is the whole scene mirrored (he runs in from the other side)
function rageCutscene(side) {
  RAGE.from = S.screen === 'rage' ? RAGE.from : S.screen;
  RAGE.shook = false; RAGE.done = false;
  RAGE.mirror = side === 'right';
  RAGE.already = kickedLamps()[side];                                    // that one's smashed already: it's broken before he gets there
  S.screen = 'rage';
  sfx('kick', 1.45); sfx('glass', 1.5);
  moment('rage', 2400);
  ANIM.then = () => {
    RAGE.done = true;
    const head = [RAGE_MAN.standX + 5, RAGE_CAR[1] - 95];                 // his head, where he stands after the kick
    const at = RAGE.mirror ? [W - head[0], head[1]] : head;               // his head (on the other side when the scene's mirrored)
    DIALOG = { title: 'You', body: '"$%$£$%^%^!"', at, options: [{ label: 'OK', run() { S.screen = RAGE.from; } }] };
  };
  render();
}

// Lose your temper: he kicks a headlight (left, right, left…); if that one's already smashed, something else breaks
function breakSomething() {
  S.anger = 40;
  S.kicks = (S.kicks || 0) + 1;
  const side = S.kicks % 2 ? 'left' : 'right';                          // kicks 1, 3, 5… the left; 2, 4, 6… the right
  const wasWhole = !kickedLamps()[side];
  rageCutscene(side);                                                    // wherever you are: he runs at the car and kicks it
  if (wasWhole) return breakLamp(side);
  const b = CAR_BREAKS.find(x => !S.flags['broke-' + x.id]);
  if (!b) {
    job('kicked-' + now(), 'Fix the wheelie bin (you kicked it)', null);
    return queueDialog('You lose it', 'You kick the wheelie bin. It breaks. Of course it does.\n\nThat\'s a new job in the notebook.');
  }
  S.flags['broke-' + b.id] = true;
  job('broke-' + b.id, b.title, null);
  lead('broke-' + b.id, ...b.lead);
  queueDialog('You lose it', b.what + '\n\nYou feel better. For a second. That\'s a new job in the notebook.');
}
const brokeOpen = id => { const j = findJob('broke-' + id); return !!j && j.status === 'open'; };
// A headlight kicked in: a job to replace it (the same job again if you'd replaced it before)
function breakLamp(side) {
  const b = LAMP_BREAKS[side], id = 'broke-' + b.id;
  const old = findJob(id);
  if (old) { old.status = 'open'; note(id, 'Kicked in again', 'x'); }  // fixed once, smashed again
  else { job(id, b.title, null); lead(id, ...b.lead); }
  queueDialog('You lose it', b.what + '\n\nYou feel better. For a second. That\'s a new job in the notebook.');
}
// Ways to calm down (tap the anger bar)
function calmMenu() {
  const opts = [
    { label: 'Count to ten (1 minute)', run() { pass(1); anger(-5); say('One… two… three…', 'By eight you\'re thinking about the nut again. A bit calmer.'); } },
    { label: 'Deep breaths (5 minutes)', run() { pass(5); anger(-8); say('Deep breaths', 'In… out… The neighbour\'s dog barks. A bit calmer.'); } },
    { label: 'Ring Mum (15 minutes)', run() { pass(15); anger(-12); say('Mum', 'She tells you about her knee, the neighbours and the price of butter. You feel calmer. Somehow.'); } }
  ];
  if (S.screen === 'home') {
    opts.push({ label: 'Walk round the block (30 minutes)', run() { pass(30); anger(-25); say('A walk', 'Round the block. A cat. A nice front garden. Much calmer.'); } });
    opts.push({ label: 'Make a cup of tea', run() { ACTIONS.tea(); } });
  }
  opts.push({ label: 'Hit something (quick relief, but…)', run() { breakSomething(); } });
  opts.push({ label: 'Never mind', run() {} });
  say('Anger: ' + S.anger + ' out of 100', S.anger >= 75 ? 'You\'re close to breaking something.' : 'How do you want to calm down?', opts);
}

// =====================================================================
// THE MANUALS SHELF
// =====================================================================
const BOOKS = [
  ['Zafira 1999–2005 Petrol (Excite only)', ['Chapter 7: Automatic transmission. "Removal is a dealer operation."', 'Page 7-12 has a drawing of a sensor that looks nothing like yours.', 'Someone has written "LIES" in the margin, in biro. It might have been you.']],
  ['Zafira Diesel', ['Everything about the diesel. Your car is petrol.', 'Glow plugs. Your car doesn\'t have glow plugs.', 'The gearbox chapter says "As petrol models." The petrol book says "As diesel models."']],
  ['Astra 1998–2004', ['"The Astra and Zafira share many parts." It doesn\'t say which.', 'A whole page of torque settings. None of them for anything you\'ve got.', 'A pressed flower. Nobody knows how it got there.']],
  ['Vectra Workshop Manual', ['You don\'t own a Vectra. You never have.', 'It\'s very thorough. About the Vectra.', 'Stamped inside: "Property of Dave\'s Garage. DO NOT REMOVE."']],
  ['Car Electrics Made Simple (1987)', ['Chapter 1: What is electricity?', 'Chapter 2: Points and condensers.', 'Chapter 9: "Computers in cars? A fad."']],
  ['The Complete Gearbox', ['412 pages on manual gearboxes.', 'One paragraph on automatics: "These are best left to specialists."', 'The specialists are three months away.']],
  ['Zafira 1.6 Plus (Deutsch)', ['Ihr Fahrzeug ist mit einem Wählhebelsensor ausgestattet…', 'It\'s exactly your car. It\'s in German.', 'There\'s a lovely clear diagram. All the labels are in German too.']],
  ['Ford Sierra 1982–93', ['Not your car. Not even close.', 'Someone has done every job in it, in pencil, with the dates.', 'The last entry: "Sold it. Bought a Zafira. Mistake."']],
  ['Practical Car Maintenance', ['Lovely pictures of a 1972 Cortina.', '"Always use the correct tool."', '"If in doubt, consult your dealer." The dealer is £120 an hour.']],
  ['Wiring Diagrams Vol. 2', ['Volume 2 starts at circuit 214.', 'Volume 1 is missing.', 'Circuit 214: "Continued from Volume 1."']],
  ['Motor Repair for Beginners', ['Step 1: Take it to a mechanic.', 'Step 2: See step 1.', 'Index: "Gearbox, see Mechanic."']],
  ['Classic Minis', ['Not even slightly useful.', 'You read it for twenty minutes anyway.', 'You now want a Mini. That doesn\'t help either.']],
  ['How to Swear Less', ['The bookmark is on page 3.', 'Page 3: "Count to ten."', 'Someone has added a lot of words in the margins. Some of them are new to you.']],
  ['Fiesta Mk3 (borrowed, 2004)', ['Inside the cover: "PLEASE GIVE BACK — GAZ".', 'A Fiesta isn\'t a Zafira.', 'A receipt falls out: one pasty, 2004.']],
  ['Fanged Noumena (Nick Land)', ['"What appears to humanity as the history of capitalism is an invasion from the future."', 'You read the same page four times. Your head hurts. The car is still broken.', '"Machinic desire can seem a little inhuman." So can the gearbox.']],
  ['Das Kapital (Karl Marx)', ['Volume 1: Commodities.', 'The car is a commodity. The sensor is a commodity. The £120 diagnostic is surplus value.', 'Nothing about gearboxes. Marx never owned a Zafira.']],
  ['LEGO Instructions: Zafira (Model 1:24)', ['Step 1 of 212: Find the two grey 2x4 bricks.', 'Step 87: Fit the gearbox sensor (piece 4211). Simply click it in.', 'If only. You look at the real one and back at the picture.']],
  ['A Thousand Plateaus (Deleuze & Guattari)', ['"Make rhizomes, not roots."', 'The wiring loom under the car is, you realise, a rhizome.', 'You close it. You don\'t feel deterritorialised. You feel tired.']],
  ['Fly Fishing (J. R. Hartley)', ['A lovely old book about fly fishing.', 'You have no idea why it\'s in the garage.', 'Inside the cover, in pencil: "Found it at last. J.R.H."']]
];
const BOOK_COLOURS = [C.red, C.car, C.warm, hex('#40a060'), C.white, hex('#9a5ac8'), C.redDim, C.tree1, C.steel2, CARDBOARD, C.car, hex('#e070a8'), C.ink, C.red, hex('#202020'), hex('#a02020'), C.warm, hex('#e8e0c8'), hex('#3a6a4a')];
const BOOK_W = 23;                                         // each book's width on the shelf
let BOOK_MOVE = null;                                      // a book coming off the shelf or going back: { i, out } (drawn by its moment)
// Where book i stands on the shelf: x, top, height
function bookAt(i) {
  const h = 150 + Math.round(hash(i, 3) * 40);
  return [14 + i * (BOOK_W + 1), 220 - h, h];
}
// Book i's spine, lifted `lift` pixels up off the shelf (0 = standing on it)
function bookSpine(i, lift) {
  const [x, top, h] = bookAt(i), col = BOOK_COLOURS[i % BOOK_COLOURS.length], y = top - lift;
  rect(x, y, BOOK_W - 2, h, col); rect(x, y + 10, BOOK_W - 2, 2, shade(col, 0.7)); rect(x, y + h - 14, BOOK_W - 2, 2, shade(col, 0.7));
  rect(x + BOOK_W - 4, y, 2, h, shade(col, 0.75));
}
SCREENS.shelf = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, H, C.concrete, 0.08, 101);
    for (let y = 6; y < H; y += 9) rect(0, y, W, 1, C.concreteDark);
    // the shelf board, and the books standing on it (not the one you're reading, or one on the move)
    rect(8, 220, 464, 10, C.wood); rect(8, 230, 464, 4, C.bench);
    const moving = ANIM && ANIM.kind === 'book' && BOOK_MOVE ? BOOK_MOVE.i : null;
    BOOKS.forEach(([title], i) => {
      if (i === S.book || i === moving) return;                                   // off the shelf: a gap
      const [x, top, h] = bookAt(i), col = BOOK_COLOURS[i % BOOK_COLOURS.length];
      bookSpine(i, 0);
      const dark = [C.white, C.warm, CARDBOARD, hex('#e8e0c8')].includes(col);
      LABELS.push(`<div class="spine" style="left:${(x + 2) / W * 100}%;top:${(top + 16) / H * 100}%;width:${(BOOK_W - 6) / W * 100}%;height:${(h - 34) / H * 100}%;color:${dark ? '#101018' : '#fff'}">${esc(title)}</div>`);
      spot(esc(title), [x, top, BOOK_W - 2, h], 'act:book:' + i);
    });
    // reading: tap anywhere off the book to put it back
    if (S.book != null && !moving) LABELS.push('<div class="ov bookoff" data-act="book:-1"></div>');
    tip('The manuals shelf', S.book != null ? 'Reading: ' + esc(BOOKS[S.book][0]) : 'Point at a book to read its spine. Tap to pull it down.', 1, 8);
    hud();
  },
  overlay() {
    if (S.book == null || (ANIM && ANIM.kind === 'book')) return '';             // it opens once it's off the shelf
    const [title, pages] = BOOKS[S.book], k = S.bookPage || 0;
    const prev = k > 0 ? '<button class="flip" data-act="bookpage:-1">◀</button>' : '<span class="flip"></span>';
    const next = k < pages.length - 1 ? '<button class="flip" data-act="bookpage:1">▶</button>' : '<span class="flip"></span>';
    return `<div class="ov book"><div class="pg"><h3>${esc(title)}</h3><p>${esc(pages[k])}</p></div>`
      + `<div class="pg"><p class="faint">${'— '.repeat(30)}</p><p class="faint">(oil stain)</p><div class="pgnav">${prev}<span>Page ${k + 1} of ${pages.length}</span>${next}</div></div></div>`;
  },
  actions() {
    return S.book != null ? [{ label: 'Put it back', act: 'book:-1' }] : [{ label: 'Back to the garage', act: 'go:garage' }];
  }
};

// =====================================================================
// THE PARTS BOXES: looking down into two cardboard boxes of old parts; drag to rummage through them
// =====================================================================
const PART_BOXES = [[36, 34, 196, 216], [248, 34, 196, 216]];              // each box's inside: x, y, w, h
// The kinds of junk in there: name, and how it's drawn
const JUNK = [['A bolt', 'bolt'], ['A nut', 'nut'], ['A washer', 'washer'], ['A spring', 'spring'], ['A bit of hose', 'hose'], ['A bulb (blown)', 'bulb'],
  ['A fuse (10 amp)', 'fuse'], ['A spark plug', 'plug'], ['A gasket', 'gasket'], ['A circuit board from something', 'board'], ['An old sensor (not yours)', 'sensor'],
  ['Half a sandwich', 'sandwich'], ['A dead spider', 'spider'], ['A receipt (faded)', 'receipt'], ['A jubilee clip', 'washer'], ['A bracket', 'bolt']];
let PILE = null;                                                             // the parts, bottom first: { x, y, a, k, box }
let PILE_DAY = null;                                                         // the day the heap was last shuffled
let RUMMAGE = null;                                                          // a drag going on: { x, y, moved }
// Fill both boxes with a heap of junk: a new random heap each day (the same all day, so what you moved stays moved)
function makePile() {
  PILE = [];
  PILE_DAY = S.day;
  const seed = S.day * 97;                                                   // a different shuffle for each day
  for (let n = 0; n < 70; n++) {
    const box = n % 2, [bx, by, bw, bh] = PART_BOXES[box];
    const x = bx + 14 + hash(n + seed, 41) * (bw - 28), y = by + 14 + hash(41, n + seed) * (bh - 28);
    PILE.push({ x, y, a: hash(n + seed, 7) * 6.28, k: Math.floor(hash(n + seed, 13) * JUNK.length), box });
  }
  if (!S.inv.handbook) PILE.unshift({ x: 120, y: 150, a: 0.35, k: 0, box: 0, handbook: true });   // the car's handbook, right at the bottom
}
// The handbook in the parts box: a little blue booklet, turned by a
function drawHandbookSmall(j) {
  const { x, y, a } = j, c = Math.cos(a), s = Math.sin(a);
  const corner = (u, v) => [x + u * c - v * s, y + u * s + v * c];
  poly([corner(-15, -11), corner(15, -11), corner(15, 11), corner(-15, 11)], HANDBOOK_BLUE);   // the cover
  poly([corner(-12, -8), corner(12, -8), corner(12, -4), corner(-12, -4)], C.white);            // its title strip
  poly([corner(-6, 0), corner(6, 0), corner(6, 5), corner(-6, 5)], C.car);                      // the little picture of the car
}
// One bit of junk at x, y, turned by a
function drawJunk(j) {
  if (j.handbook) return drawHandbookSmall(j);
  const { x, y, a } = j, kind = JUNK[j.k][1];
  const c = Math.cos(a), s = Math.sin(a);
  const along = (d, w, col) => pipe(x - c * d, y - s * d, x + c * d, y + s * d, w, col);   // a bar through the middle
  if (kind === 'bolt') { along(10, 4, C.steel2); disc(x + c * 10, y + s * 10, 4, C.steel); return; }
  if (kind === 'nut') { nutAt(x, y, 5, a, C.steel2); disc(x, y, 2, C.ink); return; }
  if (kind === 'washer') { ring(x, y, 5, C.steel); ring(x, y, 4, C.steel2); return; }
  if (kind === 'spring') { for (let k = -4; k <= 4; k++) line(x + c * k * 2 - s * 4, y + s * k * 2 + c * 4, x + c * (k * 2 + 1) + s * 4, y + s * (k * 2 + 1) - c * 4, C.steel); return; }
  if (kind === 'hose') { along(14, 6, C.ink); along(14, 2, C.greyDark); return; }
  if (kind === 'bulb') { disc(x, y, 5, hex('#f0f0e0')); along(3, 4, C.steel2); return; }
  if (kind === 'fuse') { along(4, 6, C.red); px(x, y, C.white); return; }
  if (kind === 'plug') { along(9, 4, C.white); disc(x + c * 9, y + s * 9, 3, C.steel2); return; }
  if (kind === 'gasket') { ring(x, y, 9, hex('#6a5a40')); ring(x, y, 8, hex('#6a5a40')); return; }
  if (kind === 'board') { along(8, 12, hex('#2a7040')); px(x, y, C.warm); px(x + c * 4, y + s * 4, C.ink); return; }
  if (kind === 'sensor') { along(6, 8, ALLOY); pipe(x + c * 6, y + s * 6, x + c * 14 + s * 4, y + s * 14 - c * 4, 2, C.ink); return; }
  if (kind === 'sandwich') { poly([[x - c * 8, y - s * 8], [x + c * 8, y + s * 8], [x - s * 8, y + c * 8]], hex('#e8c890')); return; }
  if (kind === 'spider') { disc(x, y, 2, C.ink); for (let k = 0; k < 8; k++) line(x, y, x + Math.cos(a + k * 0.8) * 5, y + Math.sin(a + k * 0.8) * 5, C.ink); return; }
  along(7, 10, hex('#f4f0e0'));                                               // a receipt
}
SCREENS.partsbox = {
  size: [480, 270],
  paint() {
    if (!PILE || PILE_DAY !== S.day) makePile();                     // a new day: someone's been in them (a fresh heap)
    rect(0, 0, W, H, C.floor); grime(0, 0, W, H, C.floor, 0.12, 61);
    for (const [x, y, w, h] of PART_BOXES) {
      poly([[x - 14, y - 22], [x + w + 14, y - 22], [x + w, y], [x, y]], shade(CARDBOARD, 1.08));          // the flaps, folded back
      poly([[x - 14, y + h + 22], [x + w + 14, y + h + 22], [x + w, y + h], [x, y + h]], shade(CARDBOARD, 0.9));
      poly([[x - 22, y - 10], [x, y], [x, y + h], [x - 22, y + h + 10]], shade(CARDBOARD, 0.95));
      poly([[x + w + 22, y - 10], [x + w, y], [x + w, y + h], [x + w + 22, y + h + 10]], shade(CARDBOARD, 0.85));
      rect(x, y, w, h, shade(CARDBOARD, 0.6));                                                              // the inside, in shadow
      rect(x, y, w, 6, shade(CARDBOARD, 0.45));
    }
    tip('Parts boxes', 'Drag to rummage through them. Tap a thing to see what it is.', 1, 8);
    hud();
  },
  animate() { for (const j of PILE || []) drawJunk(j); },
  actions() { return [{ label: 'Back to the garage', act: 'go:garage' }]; }
};
// The pointer, in picture pixels
function picturePoint(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
}
// Rummaging: what's under the pointer gets pushed along and comes to the top
function rummageStart(e) { const [x, y] = picturePoint(e); RUMMAGE = { x, y, moved: 0 }; }
function rummageMove(e) {
  if (!RUMMAGE) return;
  const [x, y] = picturePoint(e), dx = x - RUMMAGE.x, dy = y - RUMMAGE.y;
  RUMMAGE.moved += Math.abs(dx) + Math.abs(dy);
  RUMMAGE.x = x; RUMMAGE.y = y;
  const pushed = [];
  for (const j of PILE) if (Math.hypot(j.x - x, j.y - y) < 16) pushed.push(j);
  for (const j of pushed) {
    const [bx, by, bw, bh] = PART_BOXES[j.box];
    j.x = Math.max(bx + 6, Math.min(bx + bw - 6, j.x + dx * 1.1));                // pushed along, but stays in its box
    j.y = Math.max(by + 6, Math.min(by + bh - 6, j.y + dy * 1.1));
    j.a += (dx - dy) * 0.03;                                                      // and turned over a bit
    PILE.splice(PILE.indexOf(j), 1); PILE.push(j);                                // to the top of the heap
  }
  if (pushed.length && Math.random() < 0.2) sfx('clink');
}
// Let go: if it was a tap, not a rummage, say what's on top there
function rummageEnd() {
  if (!RUMMAGE) return;
  const { x, y, moved } = RUMMAGE;
  RUMMAGE = null;
  if (moved > 4) return;
  const top = PILE.slice().reverse().find(j => Math.hypot(j.x - x, j.y - y) < (j.handbook ? 16 : 10));
  if (top && top.handbook) return takeHandbook(top);                             // the handbook!
  if (top) { say(JUNK[top.k][0], 'Not what you need.'); render(); }
}

// =====================================================================
// SHOP SHELVES: along the left wall in sections; look at one section close up,
// put things in a basket (and back again), then pay at the till
// =====================================================================
// What each kind of shop sells: [name, price, how it's drawn]
const SHOP_STOCK = {
  tools: [['Spanner set', 14.99, 'spanners'], ['Screwdrivers', 7.99, 'drivers'], ['Pliers', 5.49, 'pliers'], ['Hacksaw', 8.99, 'saw'],
    ['Tape measure', 3.99, 'tape'], ['Drill', 39.99, 'box'], ['Socket set', 24.99, 'box'], ['Torch', 4.99, 'can'],
    ['WD-40', 3.49, 'can'], ['Gaffer tape', 2.99, 'tape'], ['Cable ties', 1.99, 'box'], ['Work gloves', 3.49, 'box']],
  parts: [['Brake pads', 24.99, 'box'], ['Oil filter', 6.99, 'can'], ['Wiper blades', 12.99, 'box'], ['Bulbs', 4.99, 'box'],
    ['Spark plugs', 9.99, 'box'], ['Headlight (Zafira, right)', 64.99, 'box'], ['Fuses', 2.99, 'box'], ['"Universal" sensor', 19.99, 'box'],
    ['Engine oil', 29.99, 'can'], ['Screen wash', 2.49, 'can'], ['Jump leads', 14.99, 'box'], ['Headlight (Zafira, left)', 64.99, 'box']],
  aisles: [['Air freshener', 1.49, 'can'], ['Fluffy dice', 3.99, 'box'], ['Screen wash', 2.49, 'can'], ['Torch', 4.99, 'can'],
    ['Batteries', 3.99, 'box'], ['Gaffer tape', 2.99, 'tape'], ['Crisps', 1.25, 'box'], ['Energy drink', 1.79, 'can'],
    ['Biscuits', 1.1, 'box'], ['Car sponge', 1.99, 'box'], ['Ice scraper', 1.49, 'box'], ['Phone charger', 6.99, 'box']]
};
const HAMMER = ['Claw hammer', 6.99, 'hammer'];
const SHELF_STYLES = ['tools', 'parts', 'aisles'];          // the shops with shelves you can look along
const SHELF_SECTIONS = 3;                                     // the left wall is split into this many sections
const BOARDS = [92, 168, 244];                                // close up: where each board is (things stand on it)
const SLOT_X = [124, 214, 304];                               // close up: where each thing stands along a board

// What's in one section: three boards of three things (the hammer is only in the middle of the middle section of a tool shop)
function sectionStock(place, s) {
  const style = placeStyle(place);
  const list = SHOP_STOCK[style] || SHOP_STOCK.aisles;
  const out = [];
  for (let n = 0; n < 9; n++) out.push(list[(s * 9 + n) % list.length]);
  if (style === 'tools' && s === 1) out[4] = HAMMER;
  return out;
}
// The basket: what you've taken off the shelves in this shop
function basketHere() { return (S.basket || []).filter(b => b.place === S.place); }
function inBasket(s, n) { return basketHere().some(b => b.slot === s + '-' + n); }
function basketTotal() { return basketHere().reduce((sum, b) => sum + b.price, 0); }
// The basket, shown in the corner: how many things and what they come to
function basketLabel() {
  const items = basketHere();
  if (!items.length) return;
  LABELS.push(`<div class="basket">Basket: ${items.length} thing${items.length > 1 ? 's' : ''} · £${basketTotal().toFixed(2)}</div>`);
}

SCREENS.shelfzoom = {
  size: [480, 270],
  paint() {
    const i = placeIndex(S.place), col = hex(CAT[i >= 0 ? PLACES[i][1] : 'other'][1]);
    const s = S.shelfz || 0;
    rect(0, 0, W, H, shade(col, 0.8));
    // the section: two uprights, three boards, floor to ceiling
    rect(96, 0, 10, H, C.bench); rect(374, 0, 10, H, C.bench);
    for (const by of BOARDS) { rect(96, by, 288, 10, C.wood); rect(96, by + 10, 288, 4, C.bench); }
    // the things on it, each with its price on the board's edge
    sectionStock(S.place, s).forEach(([name, price, kind], n) => {
      const x = SLOT_X[n % 3], by = BOARDS[Math.floor(n / 3)];
      const taken = inBasket(s, n);
      if (taken) dashBox(x - 2, by - 72, 56, 72, C.mint);                         // a gap where it was (it's in your basket)
      else drawShelfItem(kind, x, by, n);
      rect(x + 10, by + 2, 32, 9, C.white);                                        // the price tag
      text(price.toFixed(2), x + 12, by + 4, C.ink);
      const label = (taken ? 'Put back: ' : '') + esc(name) + ' £' + price.toFixed(2);
      spot(label, [x - 4, by - 72, 60, 86], 'act:shelfitem:' + s + ':' + n);
    });
    // arrows to the next section along
    if (s > 0) { poly([[30, 135], [62, 110], [62, 160]], C.ui); spot('Shelf ' + s, [24, 104, 44, 62], 'act:shelfgo:-1'); }
    if (s < SHELF_SECTIONS - 1) { poly([[450, 135], [418, 110], [418, 160]], C.ui); spot('Shelf ' + (s + 2), [412, 104, 44, 62], 'act:shelfgo:1'); }
    tip(esc(S.place) + ': shelf ' + (s + 1) + ' of ' + SHELF_SECTIONS, 'Tap a thing to put it in your basket. Pay at the till.', 1, 8);
    basketLabel();
    hud();
  },
  actions() { return [{ label: 'Step back', act: 'shelfback' }]; }
};
// One thing on a shelf, front on, standing on the board at y (at most 70 high, to fit under the board above)
function drawShelfItem(kind, x, y, n) {
  if (kind === 'hammer') { rect(x + 22, y - 56, 6, 52, C.wood); rect(x + 8, y - 64, 34, 12, C.tool); rect(x + 36, y - 68, 8, 6, C.tool); rect(x + 10, y - 62, 30, 2, C.steel); return; }
  if (kind === 'spanners') { for (let k = 0; k < 4; k++) { rect(x + 6 + k * 10, y - 60 + k * 4, 5, 56 - k * 4, C.steel); ring(x + 8 + k * 10, y - 62 + k * 4, 5, C.steel2); } return; }
  if (kind === 'drivers') { for (let k = 0; k < 4; k++) { rbox(x + 4 + k * 12, y - 40, 9, 18, 3, [C.red, C.warm, C.car, hex('#40a060')][k]); rect(x + 7 + k * 12, y - 66, 3, 26, C.steel); } return; }
  if (kind === 'pliers') { pipe(x + 10, y - 66, x + 30, y - 4, 4, C.red); pipe(x + 40, y - 66, x + 20, y - 4, 4, C.red); disc(x + 25, y - 38, 4, C.steel); return; }
  if (kind === 'saw') { rect(x + 4, y - 50, 48, 6, C.steel); for (let k = 0; k < 12; k++) px(x + 4 + k * 4, y - 44, C.steel2); rect(x + 4, y - 66, 4, 20, C.red); rect(x + 48, y - 66, 4, 20, C.red); rect(x + 4, y - 66, 48, 4, C.red); return; }
  if (kind === 'tape') { disc(x + 26, y - 22, 18, C.warm); disc(x + 26, y - 22, 8, C.ink); rect(x + 40, y - 8, 14, 4, C.warm); return; }
  if (kind === 'can') { rbox(x + 8, y - 60, 36, 60, 6, [C.red, C.car, hex('#40a060')][n % 3]); rect(x + 12, y - 40, 28, 14, C.white); return; }
  rbox(x + 2, y - 54, 48, 54, 3, [CARDBOARD, C.white, C.red, C.car, C.warm][n % 5]); rect(x + 8, y - 40, 36, 12, C.white); rect(x + 10, y - 36, 26, 2, C.ink);
}

// In the shop: the shelves along the left wall, in sections, with things on three levels
function leftWallShelves() {
  const w = 150 / SHELF_SECTIONS;
  for (let s = 0; s < SHELF_SECTIONS; s++) {
    const y0 = s * w + 4, y1 = (s + 1) * w - 4;
    const stock = sectionStock(S.place, s);
    ibox(0, y0, 12, y0 + 2, 0, 70, C.bench);                                      // the back upright
    for (let b = 0; b < 3; b++) {
      const z = 4 + b * 22;
      ibox(0, y0, 12, y1, z - 3, z, C.wood);                                       // the board
      for (let i = 0; i < 3; i++) {                                                // three things on it
        const n = b * 3 + i, [, , kind] = stock[n];
        if (inBasket(s, n)) continue;
        const iy = y0 + 3 + i * ((y1 - y0 - 4) / 3), tall = kind === 'can' ? 12 : 10;
        ibox(2, iy, 10, iy + 8, z, z + tall, STOCK_COLOUR(kind, n));
      }
    }
    ibox(0, y1 - 2, 12, y1, 0, 70, C.bench);                                      // the front upright
  }
}
// A colour for a small thing on a far-off shelf
function STOCK_COLOUR(kind, n) {
  if (kind === 'hammer' || kind === 'spanners' || kind === 'saw') return C.steel2;
  if (kind === 'tape') return C.warm;
  return [CARDBOARD, C.white, C.red, C.car, C.warm, hex('#40a060')][n % 6];
}
// Where on screen each section is (to tap it), and where you stand to look at it
function shelfSpots() {
  const w = 150 / SHELF_SECTIONS;
  for (let s = 0; s < SHELF_SECTIONS; s++) {
    const y0 = s * w + 4, y1 = (s + 1) * w - 4;
    spot('Shelf ' + (s + 1) + ': look closer', isoArea(0, y0, 12, y1, 0, 70), 'act:shelfzoom:' + s, [22, (y0 + y1) / 2]);
  }
}

// =====================================================================
// THE GARAGE SHELVES: everything you've bought, in a grid of slots
// =====================================================================
// How each thing you can own is drawn (things bought off shop shelves keep their own kind)
const ITEM_KIND = { 'reader-good': 'reader', 'reader-cheap': 'reader', 'reader-old': 'reader', 'part-mega': 'sensor', 'part-p4l': 'sensor', 'extractor-cheap': 'drivers', 'extractor-good': 'drivers', 'fuses': 'box' };
// Everything you've bought: [name, how it's drawn, how many]
function storeList() {
  const list = [];
  for (const [name, b] of Object.entries(S.bought || {})) list.push([name, b.kind, b.n]);
  for (const id of Object.keys(S.inv)) {
    const it = ITEMS[id];
    if (!it || it.none || !S.inv[id]) continue;                                    // not a thing you bought
    list.push([it.name, ITEM_KIND[id] || 'box', 1]);
  }
  if (S.inv.hammer && !(S.bought && S.bought['Claw hammer'])) list.push(['Claw hammer', 'hammer', 1]);   // bought before there was a basket
  if (S.inv.handbook) list.push([HANDBOOK_NAME, 'handbook', 1]);                     // found in the parts box
  const lamps = spareLamps();                                                       // spare headlights, waiting for a side to break
  if (lamps.left) list.push(['Headlight (Zafira, left)', 'box', lamps.left]);
  if (lamps.right) list.push(['Headlight (Zafira, right)', 'box', lamps.right]);
  return list;
}
const GRID = { x: 78, y: 70, cell: 36, cols: 9 };             // the grid of slots: top-left, size of each, slots across
// Where slot k is: 9 across, 3 rows, then a gap and a last row (like a game's inventory)
function slotAt(k) {
  const row = Math.floor(k / GRID.cols), col = k % GRID.cols;
  return [GRID.x + col * GRID.cell, GRID.y + row * GRID.cell + (row === 3 ? 8 : 0)];
}
SCREENS.stores = {
  size: [480, 270],
  paint() {
    rect(0, 0, W, H, hex('#24242c'));
    // the panel: light grey with a raised edge
    const px0 = GRID.x - 12, py0 = GRID.y - 30, pw = GRID.cols * GRID.cell + 24, ph = 4 * GRID.cell + 50;
    rect(px0, py0, pw, ph, hex('#c6c6c6'));
    rect(px0, py0, pw, 2, C.white); rect(px0, py0, 2, ph, C.white);
    rect(px0, py0 + ph - 2, pw, 2, hex('#555555')); rect(px0 + pw - 2, py0, 2, ph, hex('#555555'));
    text('GARAGE SHELVES', px0 + 12, py0 + 12, hex('#404040'));
    // the slots, sunk in (dark top and left edges, light bottom and right)
    for (let k = 0; k < GRID.cols * 4; k++) {
      const [x, y] = slotAt(k);
      rect(x, y, 34, 34, hex('#8b8b8b'));
      rect(x, y, 34, 2, hex('#373737')); rect(x, y, 2, 34, hex('#373737'));
      rect(x, y + 32, 34, 2, C.white); rect(x + 32, y, 2, 34, C.white);
    }
    // what you've bought, one thing per slot, with how many if more than one
    const list = storeList();
    list.slice(0, GRID.cols * 4).forEach(([name, kind, n], k) => {
      const [x, y] = slotAt(k);
      drawIcon(kind, x + 1, y + 1, k);
      if (n > 1) { text(String(n), x + 24, y + 24, hex('#3a3a3a')); text(String(n), x + 23, y + 23, C.white); }
      spot(esc(name) + (n > 1 ? ' ×' + n : ''), [x, y, 34, 34], 'act:storelook:' + k);
    });
    tip('Garage shelves', list.length ? 'Everything you\'ve bought.' : 'Empty. Things you buy go here.', 1, 8);
    hud();
  },
  actions() { return [{ label: 'Back to the garage', act: 'go:garage' }]; }
};
// A little picture of a thing, in a 32 x 32 slot
function drawIcon(kind, x, y, n) {
  if (kind === 'handbook') { rbox(x + 7, y + 4, 18, 25, 2, HANDBOOK_BLUE); rect(x + 9, y + 7, 14, 4, C.white); rect(x + 11, y + 15, 10, 5, C.car); return; }
  if (kind === 'hammer') { pipe(x + 9, y + 27, x + 21, y + 11, 3, C.wood); poly([[x + 12, y + 5], [x + 26, y + 15], [x + 23, y + 19], [x + 9, y + 9]], C.tool); return; }
  if (kind === 'spanners') { pipe(x + 7, y + 25, x + 24, y + 8, 3, C.steel); ring(x + 26, y + 6, 4, C.steel2); ring(x + 5, y + 27, 3, C.steel2); return; }
  if (kind === 'drivers') { pipe(x + 6, y + 26, x + 13, y + 19, 5, C.red); pipe(x + 14, y + 18, x + 26, y + 6, 2, C.steel); return; }
  if (kind === 'pliers') { pipe(x + 8, y + 27, x + 18, y + 12, 3, C.red); pipe(x + 24, y + 27, x + 14, y + 12, 3, C.red); pipe(x + 16, y + 13, x + 16, y + 4, 3, C.steel); return; }
  if (kind === 'saw') { rect(x + 4, y + 14, 24, 4, C.steel); rect(x + 4, y + 8, 3, 8, C.red); rect(x + 25, y + 8, 3, 8, C.red); rect(x + 4, y + 8, 24, 2, C.red); return; }
  if (kind === 'tape') { disc(x + 16, y + 16, 10, C.warm); disc(x + 16, y + 16, 4, C.ink); return; }
  if (kind === 'can') { rbox(x + 9, y + 4, 14, 25, 3, [C.red, C.car, hex('#40a060')][n % 3]); rect(x + 10, y + 12, 12, 7, C.white); return; }
  if (kind === 'reader') { rbox(x + 7, y + 3, 18, 26, 3, hex('#d0a020')); rect(x + 10, y + 6, 12, 8, hex('#0a2a20')); rect(x + 10, y + 18, 4, 3, C.grey); rect(x + 17, y + 18, 4, 3, C.grey); return; }
  if (kind === 'sensor') { rbox(x + 6, y + 10, 16, 12, 2, ALLOY); rect(x + 22, y + 13, 6, 6, C.ink); disc(x + 10, y + 16, 2, C.steel2); return; }
  rbox(x + 5, y + 7, 22, 20, 2, [CARDBOARD, C.white, C.red, C.car, C.warm][n % 5]); rect(x + 8, y + 13, 16, 5, C.white); rect(x + 9, y + 15, 12, 1, C.ink);
}
// In the garage: the shelves on the back wall, next to the tool chest, with what you've bought on them
function garageShelves() {
  ibox(2, 0, 4, 10, 0, 78, C.wood); ibox(54, 0, 56, 10, 0, 78, C.wood);          // the uprights
  const list = storeList();
  [8, 26, 44, 62].forEach((z, b) => {
    ibox(2, 0, 56, 10, z - 2, z, C.wood);                                          // the board
    for (let i = 0; i < 5; i++) {                                                  // up to five things on each
      const k = b * 5 + i;
      if (!list[k]) continue;
      const x = 6 + i * 10, kind = list[k][1];
      ibox(x, 2, x + 7, 8, z, z + (kind === 'can' ? 10 : 7), STOCK_COLOUR(kind, k));
    }
  });
}

// The hammer, bought at last: if you were looking for one, that's a job done
function boughtHammer() {
  const needed = S.flags.needHammer && !S.inv.hammer;
  S.inv.hammer = true;
  if (!needed) return '';
  closeLead('hammer-shelf', 'ok'); closeLead('hammer-shop', 'ok');
  finishJob('hammer', 'Found a hammer on their shelf (they said they hadn\'t got any)');
  lead('new-sensor', 'tap', 'Tap the stuck part with the hammer', 'you', 'sure', 'bench');
  return '\n\nThe hammer: "Oh. Didn\'t know we had one of them."';
}

// =====================================================================
// NEW ACTIONS
// =====================================================================
Object.assign(ACTIONS, {
  calm() { calmMenu(); },
  // the manuals
  book(n) {
    const i = +n;
    if (i < 0) {                                                                  // put it back: it slides onto the shelf
      if (S.book == null) return;
      BOOK_MOVE = { i: S.book, out: false };
      S.book = null;
      sfx('thud');
      return moment('book', 450);
    }
    S.book = i; S.bookPage = 0; pass(5); sfx('drawer');
    BOOK_MOVE = { i, out: true };                                                 // off the shelf, then it opens
    moment('book', 550);
  },
  // flick through the pages
  bookpage(d) {
    if (S.book == null) return;
    S.bookPage = Math.max(0, Math.min(BOOKS[S.book][1].length - 1, (S.bookPage || 0) + +d));
    sfx('click');
  },
  // shop shelves: look at a section, move along with the arrows, things in and out of the basket
  shelfzoom(k) { S.shelfz = +k; show('shelfzoom'); },
  shelfback() { show('place'); },
  shelfgo(dir) { S.shelfz = Math.max(0, Math.min(SHELF_SECTIONS - 1, (S.shelfz || 0) + +dir)); sfx('click'); },
  shelfitem(where) {
    const [s, n] = where.split(':').map(Number);
    const [name, price, kind] = sectionStock(S.place, s)[n];
    S.basket = S.basket || [];
    const slot = s + '-' + n;
    const at = S.basket.findIndex(b => b.place === S.place && b.slot === slot);
    if (at >= 0) { S.basket.splice(at, 1); sfx('drawer'); return; }                 // in the basket: put it back
    S.basket.push({ place: S.place, slot, name, price, kind });                        // on the shelf: into the basket
    sfx('clink');
  },
  // the till: pay for what's in the basket; it goes on the shelves in your garage
  checkout() {
    const items = basketHere();
    if (!items.length) return say('The till', '"Can I help you?"\n\nYour basket\'s empty. The shelves are along the left wall.');
    const total = basketTotal();
    if (!spend(total)) return say('The till', '£' + total.toFixed(2) + '. Card declined.');
    pass(5);
    sfx('beep');
    S.bought = S.bought || {};
    for (const b of items) {
      if (b.name.startsWith('Headlight')) { addLamp(b.name.includes('right') ? 'right' : 'left'); continue; }   // a headlight: a spare, on the shelf
      const had = S.bought[b.name];
      S.bought[b.name] = { kind: b.kind, n: (had ? had.n : 0) + 1 };                   // onto your garage shelves
    }
    S.basket = S.basket.filter(b => b.place !== S.place);
    const names = items.map(b => b.name).join(', ');
    const hammer = items.some(b => b.name === 'Claw hammer') ? boughtHammer() : '';
    say('The till', `"That's £${total.toFixed(2)}." Beep.\n\nYou bought: ${names}. It'll be on the shelves in your garage.${hammer}`);
  },
  // the garage shelves: what each thing is
  storelook(k) {
    const [name, , n] = storeList()[+k] || [];
    if (!name) return;
    if (name === HANDBOOK_NAME) return openHandbook();               // the handbook: read it
    say(name, n > 1 ? `You've got ${n}.` : 'On your garage shelf.');
  },
  // fixing what you broke when you lost it
  tapemirror() { pass(10); sfx('drawer'); finishJob('broke-mirror', 'Taped back on. It wobbles.'); closeLead('tape', 'ok'); say('The wing mirror', 'Half a roll of tape later, the mirror is back on. It points at the sky.'); },
  straighten() { pass(15); sfx('creak'); finishJob('broke-stay', 'Straightened in the vice. Nearly straight.'); closeLead('vice', 'ok'); say('The bonnet stay', 'Into the vice, a lot of leaning, and it\'s… nearly straight.'); },
  // the hammer and the stuck part
  tapit() {
    pass(5); sfx('thud'); sfx('thud', 0.3); sfx('clink', 0.6);
    S.flags.tapped = true; closeLead('tap', 'ok');
    say('Tap, tap, TAP', 'It moves. Just a little. Try pulling it now.');
  },
  hammerbox() {
    pass(5);
    closeLead('hammer-box', 'x', 'No hammer in the toolbox (your brother borrowed it in 2019)');
    lead('hammer', 'hammer-shop', 'Buy a hammer at the Hardware Shop', 'you', 'sure', 'place:Hardware Shop');
    say('Drawer 6', 'A hammer-shaped gap. Your brother borrowed it in 2019.');
  },
  fusenote() {
    if (S.flags.knowF23) return;
    pass(20); S.flags.knowF23 = true;
    closeLead('fusediagram', 'ok', 'Fuse diagram online: F23 is the instrument cluster and the gearbox sensor (probably)');
    lead('meaning', 'checkf23', 'Check fuse F23', 'TechDocs', 'fairly sure', 'fuseZoom');
    say('The fuse diagram', 'Half of it makes sense. The other half is codes. But F23 says "IPC / TCM sensor supply". That\'s probably it.');
  }
});
