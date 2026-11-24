// Bland Quest Auto: more things to do.
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
    lead: ['headlight', 'A new left headlight: the parts shop (dear), online, or the Scrap Yard', 'you', 'sure', 'place:Scrap Yard'] },
  right: { id: 'headlight2', title: 'Replace the smashed right headlight (you kicked it)', what: 'You run round the other side and kick the right headlight in. Now they match.',
    lead: ['headlight2', 'A new right headlight: online, or the Scrap Yard', 'you', 'sure', 'place:Scrap Yard'] }
};
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
    if (RAGE.done && !ANIM && !DIALOG) LABELS.push('<div class="ov bookoff" data-act="rageback"></div>');   // all over: a tap anywhere takes you back (so you can't get stuck here)
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
    sfx('thud');
    flashStill('kick', () => {                                            // the still of the kick flashes up (flipped for the right headlight)… then he swears
      const head = [RAGE_MAN.standX + 5, RAGE_CAR[1] - 95];               // his head, where he stands after the kick
      const at = RAGE.mirror ? [W - head[0], head[1]] : head;             // his head (on the other side when the scene's mirrored)
      DIALOG = { title: 'You', body: '"$%$£$%^%^!"', at, spoken: true, options: [{ label: 'OK', run() { S.screen = RAGE.from; } }] };
    }, RAGE.mirror);
  };
  render();
}

// Lose your temper: he kicks a headlight (left, right, left…). Only the headlights break; one that's smashed already just gets kicked again
function breakSomething() {
  S.anger = 40;
  S.kicks = (S.kicks || 0) + 1;
  S.flags.kicksSincePint = (S.flags.kicksSincePint || 0) + 1;             // counts towards "only a pint will do"
  let side = S.kicks % 2 ? 'left' : 'right';                            // kicks 1, 3, 5… the left; 2, 4, 6… the right
  if (kickedLamps()[side] && !kickedLamps()[side === 'left' ? 'right' : 'left']) side = side === 'left' ? 'right' : 'left';   // the whole one, if there is one
  const wasWhole = !kickedLamps()[side];
  rageCutscene(side);                                                    // wherever you are: he runs at the car and kicks it
  if (wasWhole) return breakLamp(side);
  queueDialog('You lose it', 'You kick the headlight again. It\'s in bits already. It doesn\'t help.');   // both smashed: nothing new breaks
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
// Fed up: after so many cups of tea and nights' sleep since your last pint (or losing it twice), tea and sleep stop working; only the pub will do (Steve)
const FED_UP_KICKS = 2;
const COMFORTS_LAST = 6;                                              // this many teas and nights, all told, calm you down
function fedUp() {
  const kicks = S.flags.kicksSincePint || 0;                            // times you've lost it since the last pint
  const comforts = S.flags.comfortsSincePint || 0;                      // teas and nights' sleep since the last pint
  return kicks >= FED_UP_KICKS || comforts >= COMFORTS_LAST;
}
// A cup of tea or a night's sleep: does it calm you? If it does, that's one more used up
function comforted() {
  if (fedUp()) return false;
  S.flags.comfortsSincePint = (S.flags.comfortsSincePint || 0) + 1;
  return true;
}
// A pint at the pub: the fed-up feeling goes (true if you were fed up)
function pintCures() {
  const was = fedUp();                                                  // were you past tea and sleep?
  delete S.flags.kicksSincePint;                                        // start counting again
  delete S.flags.comfortsSincePint;
  return was;
}
// Ways to calm down (tap the anger bar)
function calmMenu() {
  const opts = [
    { label: 'Count to ten (1 minute)', run() { pass(1); anger(-5); say('One… two… three…', 'By eight you\'re thinking about the nut again. A bit calmer.'); } },
    { label: 'Deep breaths (5 minutes)', run() { pass(5); anger(-8); say('Deep breaths', 'In… out… The neighbour\'s dog barks. A bit calmer.'); } },
    { label: 'Ring Mum & Dad (15 minutes)', run() { pass(15); anger(-12); say('Mum', 'She tells you about her knee, the neighbours and the price of butter. You feel calmer. Somehow.'); } }
  ];
  if (S.screen === 'home') {
    opts.push({ label: 'Walk round the block (30 minutes)', run() { pass(30); anger(-25); say('A walk', 'Round the block. A cat. A nice front garden. Much calmer.'); } });
    opts.push({ label: 'Make a cup of tea', run() { ACTIONS.tea(); } });
  }
  opts.push({ label: 'Hit something (quick relief, but…)', run() { breakSomething(); } });
  opts.push({ label: 'Never mind', run() {} });
  let ask = S.anger >= 75 ? 'You\'re close to breaking something.' : 'How do you want to calm down?';   // what the box says
  if (fedUp()) ask += '\n\nTea won\'t touch this. Nor will sleep. You need a pint.';   // past tea and sleep: the pub
  say('Anger: ' + S.anger + ' out of 100', ask, opts);
}

// =====================================================================
// THE MANUALS SHELF
// =====================================================================
// The German Zafira manual, open at its diagram, once you've the codes: you work out what P0705 is
function germanDiagram() {
  const [title, pages] = BOOKS[S.book];
  if (!title.includes('Deutsch') || S.bookPage !== pages.length - 1) return;   // the diagram's on its last page
  if (!sensorFound('the German manual', 'fairly sure')) return;
  pass(15);
  say(title, 'You hold the diagram up next to the codes in your notebook. "Getriebe… Wählhebelsensor." Selector lever sensor. A little box on the side of the gearbox.\n\nYour German is better than you thought.');
}
const BOOKS = [                                          // mixed up along the shelf: manuals, odd ones and philosophy (Steve)
  ['Zafira 1999–2005 Petrol (Excite only)', ['Chapter 7: Automatic transmission. "Removal is a dealer operation."', 'Page 7-12 has a drawing of a sensor that looks nothing like yours.', 'Someone has written "LIES" in the margin, in biro. It might have been you.']],
  ['Fanged Noumena (Nick Land)', ['"What appears to humanity as the history of capitalism is an invasion from the future."', 'You read the same page four times. Your head hurts. The car is still broken.', '"Machinic desire can seem a little inhuman." So can the gearbox.']],
  ['Car Electrics Made Simple (1987)', ['Chapter 1: What is electricity?', 'Chapter 2: Points and condensers.', 'Chapter 9: "Computers in cars? A fad."']],
  ['How to Swear Less', ['The bookmark is on page 3.', 'Page 3: "Count to ten."', 'Someone has added a lot of words in the margins. Some of them are new to you.']],
  ['Zafira Diesel', ['Everything about the diesel. Your car is petrol.', 'Glow plugs. Your car doesn\'t have glow plugs.', 'The gearbox chapter says "As petrol models." The petrol book says "As diesel models."']],
  ['Das Kapital (Karl Marx)', ['Volume 1: Commodities.', 'The car is a commodity. The sensor is a commodity. The £120 diagnostic is surplus value.', 'Nothing about gearboxes. Marx never owned a Zafira.']],
  ['The Complete Gearbox', ['412 pages on manual gearboxes.', 'One paragraph on automatics: "These are best left to specialists."', 'The specialists are three months away.']],
  ['Classic Minis', ['Not even slightly useful.', 'You read it for twenty minutes anyway.', 'You now want a Mini. That doesn\'t help either.']],
  ['Ford Sierra 1982–93', ['Not your car. Not even close.', 'Someone has done every job in it, in pencil, with the dates.', 'The last entry: "Sold it. Bought a Zafira. Mistake."']],
  ['The Trial (Franz Kafka)', ['"Someone must have slandered Josef K., for one morning, without having done anything wrong, he was arrested."', 'K. is never told what he\'s charged with. The court is always in another office, up another staircase, open by appointment only.', 'A man waits all his life at the door of the Law. You\'ve waited three days for a sensor. You know how he feels.']],
  ['Wiring Diagrams Vol. 2', ['Volume 2 starts at circuit 214.', 'Volume 1 is missing.', 'Circuit 214: "Continued from Volume 1."']],
  ['Fly Fishing (J. R. Hartley)', ['A lovely old book about fly fishing.', 'You have no idea why it\'s in the garage.', 'Inside the cover, in pencil: "Found it at last. J.R.H."']],
  ['Zafira 1.6 Plus (Deutsch)', ['Ihr Fahrzeug ist mit einem Wählhebelsensor ausgestattet…', 'It\'s exactly your car. It\'s in German.', 'There\'s a lovely clear diagram. All the labels are in German too.']],
  ['A Thousand Plateaus (Deleuze & Guattari)', ['"Make rhizomes, not roots."', 'The wiring loom under the car is, you realise, a rhizome.', 'You close it. You don\'t feel deterritorialised. You feel tired.']],
  ['Astra 1998–2004', ['"The Astra and Zafira share many parts." It doesn\'t say which.', 'A whole page of torque settings. None of them for anything you\'ve got.', 'A pressed flower. Nobody knows how it got there.']],
  ['LEGO Instructions: Zafira (Model 1:24)', ['Step 1 of 212: Find the two grey 2x4 bricks.', 'Step 87: Fit the gearbox sensor (piece 4211). Simply click it in.', 'If only. You look at the real one and back at the picture.']],
  ['Practical Car Maintenance', ['Lovely pictures of a 1972 Cortina.', '"Always use the correct tool."', '"If in doubt, consult your dealer." The dealer is £120 an hour.']],
  // a page can be { text, pic }: words on the left, a picture on the right
  ['The Myth of Sisyphus (Albert Camus)', [{ text: 'Opposite the title page, a picture: a man pushing his car up a hill. He looks a lot like you.', pic: 'sisyphus' },
    'The gods condemned Sisyphus to push a rock to the top of a mountain, where it rolled back down. For ever.', 'You think about the gearbox sensor.',
    '"The struggle itself toward the heights is enough to fill a man\'s heart. One must imagine Sisyphus happy."', 'You do not feel happy. You feel like Sisyphus.']],
  ['Vectra Workshop Manual', ['You don\'t own a Vectra. You never have.', 'It\'s very thorough. About the Vectra.', 'Stamped inside: "Property of E & D Motors. DO NOT REMOVE."']],
  ['Fiesta Mk3 (borrowed, 2004)', ['Inside the cover: "PLEASE GIVE BACK — GAZ".', 'A Fiesta isn\'t a Zafira.', 'A receipt falls out: one pasty, 2004.']],
  ['Motor Repair for Beginners', ['Step 1: Take it to a mechanic.', 'Step 2: See step 1.', 'Index: "Gearbox, see Mechanic."']]
];
const BOOK_COLOURS = [C.red, C.car, C.warm, hex('#40a060'), C.white, hex('#9a5ac8'), C.redDim, C.tree1, C.steel2, CARDBOARD, C.car, hex('#e070a8'), C.ink, C.red, hex('#202020'), hex('#a02020'), C.warm, hex('#e8e0c8'), hex('#3a6a4a'), hex('#d8c8a0')];
const BOOK_W = 20;                                         // each book's slot on the shelf (21 books and the car handbook fit along it)
// The picture in the Myth of Sisyphus: our hero, side-on, pushing his car up a hill (pixel-sharp)
function sisyphusPicture() {
  const r = (x, y, w, h, col) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}"/>`;
  const sky = r(0, 0, 96, 64, '#c8d8e8');
  const sun = r(10, 6, 8, 8, '#f8e070');
  const hill = '<polygon points="0,64 0,58 96,22 96,64" fill="#58a048"/><polygon points="0,58 96,22 96,24 0,60" fill="#3e8a3a"/>';
  // the car, side-on, on the level; turned to sit on the slope (it climbs to the right)
  const car = r(40, 26, 32, 8, '#3c78c8') + r(46, 20, 18, 7, '#3c78c8') + r(48, 21, 6, 5, '#203048') + r(56, 21, 6, 5, '#203048')
    + r(70, 28, 2, 2, '#f8d038') + r(43, 33, 6, 5, '#222228') + r(63, 33, 6, 5, '#222228') + r(45, 35, 2, 1, '#a8acb4') + r(65, 35, 2, 1, '#a8acb4');
  // him, behind it (downhill), leaning in with both hands on the back of the car
  const man = r(30, 30, 2, 8, '#4060a8') + r(34, 29, 2, 8, '#304a88') + r(31, 22, 6, 8, '#e04838') + r(36, 18, 4, 4, '#e8b090') + r(36, 17, 4, 1, '#603818')
    + r(37, 24, 4, 2, '#e04838') + r(40, 24, 1, 2, '#e8b090');
  const climb = `<g transform="rotate(-20.6 56 37)">${car}${man}</g>`;
  return `<svg class="pic" viewBox="0 0 96 64" shape-rendering="crispEdges" aria-label="A man pushing his car up a hill">${sky}${sun}${hill}${climb}</svg>`;
}
// The car's handbook on the shelf, once found: a slim navy booklet at the end of the row; tap it to read it
const SHELF_HANDBOOK_TITLE = "Zafira Owner's Handbook";
function shelfHandbook() {
  const x = 10 + BOOKS.length * (BOOK_W + 1);                                     // the next slot along
  const h = 120, top = 220 - h;                                                    // shorter than the manuals
  rect(x, top, BOOK_W - 2, h, HANDBOOK_BLUE); rect(x, top + 8, BOOK_W - 2, 2, C.white); rect(x + BOOK_W - 4, top, 2, h, shade(HANDBOOK_BLUE, 0.75));   // the cover, a white band, its edge
  const across = BOOK_W - 4, along = h - 24;                                       // the lettering: under the band, down the spine
  const size = signFontSize(SHELF_HANDBOOK_TITLE, along, across);                  // as big as fits (screens.js)
  LABELS.push(`<div class="spine" style="left:${x / W * 100}%;top:${(top + 14) / H * 100}%;width:${across / W * 100}%;height:${along / H * 100}%;font-size:${size / W * 100}cqw;line-height:${across / W * 100}cqw;color:#fff">${esc(SHELF_HANDBOOK_TITLE)}</div>`);
  spot(HANDBOOK_NAME, [x, top, BOOK_W - 2, h], 'act:handbook');                   // tap: read it
}
let BOOK_MOVE = null;                                      // a book coming off the shelf or going back: { i, out } (drawn by its moment)
// Where book i stands on the shelf: x, top, height
function bookAt(i) {
  const h = 150 + Math.round(hash(i, 3) * 40);
  return [10 + i * (BOOK_W + 1), 220 - h, h];
}
// Book i's spine, lifted `lift` pixels up off the shelf (0 = standing on it)
function bookSpine(i, lift) {
  const [x, top, h] = bookAt(i), col = BOOK_COLOURS[i % BOOK_COLOURS.length], y = top - lift;
  rect(x, y, BOOK_W - 2, h, col); rect(x, y + 10, BOOK_W - 2, 2, shade(col, 0.7)); rect(x, y + h - 14, BOOK_W - 2, 2, shade(col, 0.7));
  rect(x + BOOK_W - 4, y, 2, h, shade(col, 0.75));
}
SCREENS.shelf = {
  backAct() { return S.book != null ? 'book:-1' : null; },          // reading a book: ◀ Back puts it back on the shelf first (then ◀ Back leaves the shelf: Steve)
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
      const dark = [C.white, C.warm, CARDBOARD, hex('#e8e0c8'), hex('#d8c8a0')].includes(col);   // pale covers: dark lettering
      const across = BOOK_W - 4, along = h - 30;                                   // the spine between its bands: as wide as the book's face, and its length
      const size = signFontSize(title, along, across);                              // as big as fits (screens.js)
      LABELS.push(`<div class="spine" style="left:${x / W * 100}%;top:${(top + 15) / H * 100}%;width:${across / W * 100}%;height:${along / H * 100}%;font-size:${size / W * 100}cqw;line-height:${across / W * 100}cqw;color:${dark ? '#101018' : '#fff'}">${esc(title)}</div>`);   // centred both ways
      spot(esc(title), [x, top, BOOK_W - 2, h], 'act:book:' + i);
    });
    if (S.inv.handbook) shelfHandbook();                                            // found: the car's handbook stands at the end
    // reading: tap anywhere off the book to put it back
    if (S.book != null && !moving) LABELS.push('<div class="ov bookoff" data-act="book:-1"></div>');
    tip('The manuals shelf', S.book != null ? 'Reading: ' + esc(BOOKS[S.book][0]) : 'Point at a book to read its spine. Tap to pull it down.', 1, 8);
    hud();
  },
  overlay() {
    if (S.book == null || (ANIM && ANIM.kind === 'book')) return '';             // it opens once it's off the shelf
    const [title, pages] = BOOKS[S.book], k = S.bookPage || 0;
    const pg = pages[k];
    const words = typeof pg === 'string' ? pg : pg.text;                          // a page of words, or words and a picture
    const right = pg.pic === 'sisyphus' ? sisyphusPicture() : BOOK_BLANK + '<p class="faint">(oil stain)</p>';
    return openBook(`<h3>${esc(title)}</h3><p>${esc(words)}</p>`, right, `Page ${k + 1} of ${pages.length}`, 'bookpage', k > 0, k < pages.length - 1);
  },
  actions() {
    return [];                                                                    // tap off the book to put it back; ◀ Back to the garage
  }
};

// =====================================================================
// THE PARTS BOXES: looking down into two cardboard boxes of old parts; drag to rummage through them
// =====================================================================
const PART_BOXES = [[36, 34, 196, 216], [248, 34, 196, 216]];              // each box's inside: x, y, w, h
// The kinds of junk in there: name, and how it's drawn
const JUNK = [['A bolt', 'bolt'], ['A nut', 'nut'], ['A washer', 'washer'], ['A spring', 'spring'], ['A bit of hose', 'hose'], ['A bulb (blown)', 'bulb'],
  ['A fuse (10 amp)', 'fuse'], ['A spark plug', 'plug'], ['A gasket', 'gasket'], ['A circuit board from something', 'board'], ['An old sensor (not yours)', 'sensor'],
  ['A dead spider', 'spider'], ['A jubilee clip', 'clip'], ['A bracket', 'bracket']];
// What's been found to be no good, and thrown in the parts boxes: [name, how it's drawn, what you think when you find it again]
const JUNKED = {
  'lamp-left': ['Your smashed headlight (left)', 'lamp', 'The left headlight you kicked in. Glass rattles about inside it.'],
  'lamp-right': ['Your smashed headlight (right)', 'lamp', 'The right headlight you kicked in. It still has a bit of your boot print on it.'],
  'reader-old': ["Gaz's code reader", 'reader', "Gaz's reader, round plug and all. From 1994. You really should give it back."],
  'reader-cheap': ['The Zamanon code reader', 'reader', '"Fits all cars*". *Fits all lorries.'],
  'extractor-cheap': ['The cheap extractor (snapped)', 'extractor', 'Half of the cheap bolt extractor. The other half is still stuck in something.'],
  'old-sensor': ['The old sensor', 'badsensor', 'The old sensor, its plug cut off. It was never the sensor anyway. Probably.']
};
// A thing found to be no good: its name, how it's drawn and what you think (the wrong sensors come from SENSORS)
function junkedInfo(id) {
  if (JUNKED[id]) return JUNKED[id];
  const s = SENSORS[id];
  if (s) return [`The ${s.name} (no good)`, 'badsensor', `Part no. ${s.no}. ${s.says || 'No good.'}`];
  return ['Something', 'bolt', 'No good.'];
}
// Throw a thing that's no good in the parts boxes (it lands on top of the heap)
function junkIt(id) {
  S.junked = S.junked || [];
  S.junked.push(id);
  if (PILE && PILE_DAY === S.day) PILE.push(junkedSpot(S.junked.length - 1));   // the heap's out: it lands on top now
}
// Where junked thing n lies in the heap (its own spot, so it's in the same place all day)
function junkedSpot(n) {
  const box = n % 2, [bx, by, bw, bh] = PART_BOXES[box];
  return { x: bx + 30 + hash(n, 77) * (bw - 60), y: by + 30 + hash(77, n) * (bh - 60), a: hash(n, 5) * 6.28, box, junk: S.junked[n] };
}
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
  if (!S.inv.stick) { const [bx, by, bw] = PART_BOXES[1]; PILE.splice(1, 0, { x: bx + bw / 2, y: by + 60, a: 0.2, k: 0, box: 1, golf: true }); }   // a broken golf club, near the bottom of the other box
  (S.junked || []).forEach((id, n) => PILE.push(junkedSpot(n)));             // what you've thrown in, on top
}
// Something you threw in the parts boxes, drawn turned by a
function drawJunked(j) {
  const { x, y, a } = j, c = Math.cos(a), s = Math.sin(a);
  const corner = (u, v) => [x + u * c - v * s, y + u * s + v * c];
  const box = (u0, v0, u1, v1, col) => poly([corner(u0, v0), corner(u1, v0), corner(u1, v1), corner(u0, v1)], col);
  const seg = (u0, v0, u1, v1, col) => line(...corner(u0, v0), ...corner(u1, v1), col);
  const kind = junkedInfo(j.junk)[1];
  if (kind === 'lamp') {                                                     // a smashed headlight: black housing, chrome reflector, cracked lens, a chunk gone
    box(-17, -11, 17, 11, hex('#202024'));                                    // the housing
    box(-15, -9, 15, 9, C.steel2);                                            // the reflector
    box(-13, -7, 13, 7, hex('#dce8f0'));                                      // the lens
    for (let u = -11; u < 13; u += 4) seg(u, -7, u, 7, hex('#c4d4e0'));       // its ribs
    seg(-10, -5, 2, 1, C.greyDark); seg(2, 1, 10, -6, C.greyDark); seg(2, 1, 6, 6, C.greyDark); seg(2, 1, -6, 6, C.greyDark);   // the cracks
    box(4, -6, 10, -1, C.steel2);                                              // the bit that's gone: you see the reflector
    box(-19, -4, -17, 4, hex('#202024')); box(17, -4, 19, 4, hex('#202024')); // its mounting tabs
    return;
  }
  if (kind === 'reader') {                                                   // a code reader: yellow case, a screen, buttons, its lead and plug
    box(-9, -13, 9, 13, hex('#d0a020'));
    box(-7, -11, 7, -1, hex('#1a1a1a')); box(-6, -10, 6, -2, hex('#0a2a20'));  // the screen
    for (const u of [-5, 0, 5]) box(u - 1.5, 3, u + 1.5, 6, hex('#303030'));   // its buttons
    pipe(...corner(0, 13), ...corner(8, 22), 4, C.ink);                         // its thick lead
    box(6, 22, 12, 26, hex('#303030'));                                        // the plug on the end
    return;
  }
  if (kind === 'extractor') {                                                // the snapped extractor: a tapered spiral bit, its broken end bright
    box(-14, -3, -6, 3, C.tool);                                               // the square drive end
    poly([corner(-6, -3), corner(6, -2), corner(6, 2), corner(-6, 3)], C.tool);
    for (let u = -5; u < 6; u += 3) seg(u, -2.5, u + 2, 2.5, shade(C.tool, 0.6));   // the left-hand spiral
    poly([corner(6, -2), corner(9, -1), corner(8, 0), corner(9, 1), corner(6, 2)], C.white);   // the jagged snapped end
    return;
  }
  const col = j.junk === 'old-sensor' ? BLACKPART : sensorColour(j.junk);   // a sensor: its body, its colour
  box(-8, -6, 6, 6, col);
  box(-12, -2, -8, 2, col); const ear = corner(-10, 0); disc(Math.round(ear[0]), Math.round(ear[1]), 1, hex('#5a4a34'));   // its bolt ear
  disc(Math.round(x - c), Math.round(y - s), 3, shade(col, 1.4));            // its face
  if (j.junk !== 'old-sensor') box(6, -3, 13, 3, hex('#30302c'));            // its plug (the old one's is cut off)
  else { seg(6, -1, 11, -2, C.red); seg(6, 1, 11, 2, C.car); seg(6, 0, 10, 0, C.white); }   // three cut wires
}
// The handbook in the parts box: a little blue booklet, turned by a
function drawHandbookSmall(j) {
  const { x, y, a } = j, c = Math.cos(a), s = Math.sin(a);
  const corner = (u, v) => [x + u * c - v * s, y + u * s + v * c];
  poly([corner(-15, -11), corner(15, -11), corner(15, 11), corner(-15, 11)], HANDBOOK_BLUE);   // the cover
  poly([corner(-12, -8), corner(12, -8), corner(12, -4), corner(-12, -4)], C.white);            // its title strip
  poly([corner(-6, 0), corner(6, 0), corner(6, 5), corner(-6, 5)], C.car);                      // the little picture of the car
}
// The broken golf club in the parts box: a long thin shaft, its head bent over at the end
function drawGolfClub(j) {
  const { x, y, a } = j, c = Math.cos(a), s = Math.sin(a);
  pipe(x - c * 40, y - s * 40, x + c * 30, y + s * 30, 2, C.steel);
  poly([[x + c * 30, y + s * 30], [x + c * 30 - s * 8, y + s * 30 + c * 8], [x + c * 36 - s * 8, y + s * 36 + c * 8], [x + c * 36, y + s * 36]], C.greyDark);   // the head
  pipe(x - c * 40, y - s * 40, x - c * 28, y - s * 28, 4, C.ink);    // the grip
}
// Take the golf club out of the parts box: long and thin, it'll hook the nut out
function takeGolfClub(j) {
  PILE.splice(PILE.indexOf(j), 1);
  S.inv.stick = true;
  sfx('clink');
  closeLead('stick', 'ok', 'A broken golf club from the parts box');
  render();
  say('A broken golf club', 'A broken golf club. Long, thin, and bent at the end. Perfect for hooking things out from under the tool chest.\n\n(Nobody in the house has ever played golf.)');
}
// One bit of junk at x, y, turned by a: each drawn like the real thing (Steve)
function drawJunk(j) {
  if (j.handbook) return drawHandbookSmall(j);
  if (j.golf) return drawGolfClub(j);
  if (j.junk) return drawJunked(j);                                         // something you threw in
  const { x, y, a } = j, kind = JUNK[j.k][1];
  const c = Math.cos(a), s = Math.sin(a);
  const at = (u, v) => [x + u * c - v * s, y + u * s + v * c];              // a point on the part (u along it, v across), turned
  const box = (u0, v0, u1, v1, col) => poly([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)], col);   // a rectangle on the part
  const dot = (u, v, r, col) => { const [px0, py0] = at(u, v); disc(Math.round(px0), Math.round(py0), r, col); };
  const seg = (u0, v0, u1, v1, col) => line(...at(u0, v0), ...at(u1, v1), col);
  const HOLE = hex('#5a4a34');                                               // the cardboard showing through a hole
  if (kind === 'bolt') {                                                     // a hex bolt: the head, then a threaded shank
    box(-6, -2, 12, 2, C.steel2);
    for (let u = -4; u < 12; u += 2) seg(u, -2, u + 1, 2, C.steel);           // the thread
    seg(-6, 2, 12, 2, shade(C.steel2, 0.7));                                  // its shadow side
    const [hx, hy] = at(-9, 0); nutAt(hx, hy, 4, a, C.steel);                 // the hex head
    dot(-9, 0, 1, C.steel2);
    return;
  }
  if (kind === 'nut') {                                                      // a hex nut: six flats, a threaded hole
    nutAt(x, y, 5, a, C.steel2);
    nutAt(x, y, 4, a, C.steel);                                               // its chamfer
    disc(x, y, 2, HOLE); ring(x, y, 2, shade(C.steel2, 0.7));
    return;
  }
  if (kind === 'washer') {                                                   // a flat washer
    disc(x, y, 5, C.steel2); ring(x, y, 5, shade(C.steel2, 0.7));
    disc(x, y, 2, HOLE);
    dot(-2, -3, 0, C.white);                                                  // a glint
    return;
  }
  if (kind === 'spring') {                                                   // a coil spring: loops along its length
    for (let u = -8; u <= 8; u += 2) { seg(u, -4, u + 1, 4, C.steel2); seg(u + 1, 4, u + 2, -4, shade(C.steel2, 0.6)); }
    return;
  }
  if (kind === 'hose') {                                                     // a bit of rubber hose, bent, a jubilee clip on one end
    let prev = null;
    for (let k = 0; k <= 8; k++) {
      const u = -14 + k * 3.5, v = Math.sin(k / 8 * Math.PI) * 5;               // a gentle bend
      const pt = at(u, v);
      if (prev) { pipe(prev[0], prev[1], pt[0], pt[1], 6, hex('#202024')); }
      prev = pt;
    }
    const end = at(-14, 0); disc(Math.round(end[0]), Math.round(end[1]), 2, C.ink);   // its open end
    box(10, 1, 12, 9, C.steel2);                                               // the clip
    return;
  }
  if (kind === 'bulb') {                                                     // a blown bulb: glass, a broken filament, a brass cap
    dot(-2, 0, 4, hex('#e8ecdc'));
    dot(-3, -1, 1, C.white);                                                  // a glint on the glass
    seg(-4, -1, -2, 1, hex('#3a3a3a')); seg(-1, 1, 0, -1, hex('#3a3a3a'));     // the snapped filament
    box(2, -3, 7, 3, hex('#c8a040'));                                          // the cap
    for (let u = 3; u < 7; u += 2) seg(u, -3, u, 3, hex('#9a7a28'));
    dot(8, 0, 1, C.steel);                                                     // its contact
    return;
  }
  if (kind === 'fuse') {                                                     // a blade fuse: coloured plastic, two legs
    box(-4, -3, 4, 2, C.red);
    box(-3, -2, 3, -1, shade(C.red, 1.3));                                    // its top
    box(-3, 2, -1, 6, C.steel2); box(1, 2, 3, 6, C.steel2);                   // the two blades
    return;
  }
  if (kind === 'plug') {                                                     // a spark plug: terminal, white insulator, hex, thread, electrode
    box(-12, -1, -10, 1, C.steel);                                            // the terminal
    box(-10, -2, -2, 2, C.white);
    for (let u = -9; u < -2; u += 2) seg(u, -2, u, 2, hex('#d8d8d0'));        // the ribs
    box(-2, -3, 2, 3, C.steel2);                                              // the hex
    box(2, -2, 8, 2, C.steel);
    for (let u = 3; u < 8; u += 2) seg(u, -2, u, 2, C.greyDark);              // the thread
    box(8, -1, 10, 1, hex('#4a4a4a'));                                         // the electrode, black with soot
    return;
  }
  if (kind === 'gasket') {                                                   // an old gasket: a thin brown plate, bolt holes, a big hole in the middle
    box(-11, -7, 11, 7, hex('#7a5a38'));
    box(-11, -7, 11, -6, hex('#94704a'));                                     // its edge
    dot(0, 0, 4, HOLE);
    for (const [u, v] of [[-8, -4], [8, -4], [-8, 4], [8, 4]]) dot(u, v, 1, HOLE);
    return;
  }
  if (kind === 'board') {                                                    // a circuit board from something: chips, tracks, a capacitor
    box(-9, -6, 9, 6, hex('#2a7040'));
    for (const v of [-4, -1, 2]) seg(-8, v, 8, v + 1, hex('#c8a040'));        // copper tracks
    box(-6, -3, -1, 2, C.ink); box(2, -4, 6, -1, C.ink);                      // two chips
    for (let u = -6; u <= -1; u += 2) { seg(u, -4, u, -3, C.steel2); seg(u, 2, u, 3, C.steel2); }   // their legs
    dot(5, 3, 1, hex('#3060c0'));                                              // a capacitor
    return;
  }
  if (kind === 'sensor') {                                                   // somebody's old sensor: an alloy body, a bolt ear, a plug, a stub of wire
    box(-6, -4, 4, 4, ALLOY);
    box(-10, -2, -6, 2, ALLOY); dot(-8, 0, 1, HOLE);                           // the ear and its bolt hole
    box(4, -3, 9, 3, hex('#30302c'));                                          // the plug
    pipe(...at(9, 0), ...at(15, 3), 2, C.ink);                                 // the wire
    return;
  }
  if (kind === 'clip') {                                                     // a jubilee clip: a slotted steel band and its screw housing
    ring(x, y, 6, C.steel2); ring(x, y, 5, C.steel);
    box(4, -3, 9, 3, C.steel2);                                                // the housing
    dot(7, 0, 1, C.greyDark);                                                  // the screw's slot
    return;
  }
  if (kind === 'bracket') {                                                  // a bent steel bracket with two holes, a bit of rust
    box(-10, -3, 6, 3, C.steel); box(6, -3, 10, 7, shade(C.steel, 0.8));      // the flat, and the bent-over end
    dot(-6, 0, 1, HOLE); dot(2, 0, 1, HOLE);
    dot(-1, 2, 1, C.rust);
    return;
  }
  if (kind === 'sandwich') { poly([at(-8, 0), at(8, 0), at(0, 8)], hex('#e8c890')); return; }
  if (kind === 'spider') {                                                   // a dead spider, on its back, legs curled up
    disc(x, y, 2, C.ink); dot(3, 0, 1, C.ink);
    for (let k = 0; k < 8; k++) { const ang = a + (k < 4 ? -1 : 1) * (0.5 + (k % 4) * 0.45); const mid = [x + Math.cos(ang) * 3, y + Math.sin(ang) * 3]; line(x, y, mid[0], mid[1], C.ink); line(mid[0], mid[1], mid[0] + Math.cos(ang + 1.6) * 2, mid[1] + Math.sin(ang + 1.6) * 2, C.ink); }
    return;
  }
  box(-7, -5, 7, 5, hex('#f4f0e0'));                                          // a receipt
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
  actions() { return []; }   // ◀ Back to the garage
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
  const top = PILE.slice().reverse().find(j => Math.hypot(j.x - x, j.y - y) < (j.handbook || j.golf ? 16 : 10));
  if (top && top.handbook) return takeHandbook(top);                             // the handbook!
  if (top && top.golf) return takeGolfClub(top);                                  // the broken golf club: a long stick
  if (top && top.junk) { const [name, , line] = junkedInfo(top.junk); say(name, line); return render(); }   // something you threw in
  if (top && JUNK[top.k][1] === 'sensor' && takeBoxSensor(top)) return render();  // an old sensor (not yours): worth a try (sensors.js)
  if (top) { say(JUNK[top.k][0], 'Not what you need.'); render(); }
}

// =====================================================================
// SHOP SHELVES: along the left wall in sections; look at one section close up,
// put things in a basket (and back again), then pay at the till
// =====================================================================
const UNIVERSAL = '"Universal" sensor';                       // off a parts shop's shelf: try it on the bench (sensors.js)
// What each kind of shop sells: [name, price, how it's drawn]
const SHOP_STOCK = {
  tools: [['Spanner set', 14.99, 'spanners'], ['Screwdrivers', 7.99, 'drivers'], ['Pliers', 5.49, 'pliers'], ['Hacksaw', 8.99, 'saw'],
    ['Tape measure', 3.99, 'tape'], ['Drill', 39.99, 'box'], ['Socket set', 24.99, 'box'], ['Torch', 4.99, 'can'],
    ['WD-40', 3.49, 'can'], ['Gaffer tape', 2.99, 'tape'], ['Cable ties', 1.99, 'box'], ['Work gloves', 3.49, 'box']],
  parts: [['Brake pads', 24.99, 'box'], ['Oil filter', 6.99, 'can'], ['Wiper blades', 12.99, 'box'], ['Bulbs', 4.99, 'box'],
    ['Spark plugs', 9.99, 'box'], ['Headlight (Zafira, right)', 64.99, 'box'], ['Fuses', 2.99, 'box'], [UNIVERSAL, 19.99, 'box'],
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
      else drawShelfItem(kind, x, by, n, name);
      rect(x + 10, by + 2, 32, 9, C.white);                                        // the price tag
      text(price.toFixed(2), x + 12, by + 4, C.ink);
      const label = (taken ? 'Put back: ' : '') + esc(name) + ' £' + price.toFixed(2);
      spot(label, [x - 4, by - 72, 60, 86], 'act:shelfitem:' + s + ':' + n);
    });
    // arrows to the next section along
    // the arrows go the way the shelves run in the shop: the wall runs back to front from right to left, so left is the next shelf along
    if (s < SHELF_SECTIONS - 1) { poly([[30, 135], [62, 110], [62, 160]], C.ui); spot('Shelf ' + (s + 2), [24, 104, 44, 62], 'act:shelfgo:1'); }
    if (s > 0) { poly([[450, 135], [418, 110], [418, 160]], C.ui); spot('Shelf ' + s, [412, 104, 44, 62], 'act:shelfgo:-1'); }
    tip(esc(S.place) + ': shelf ' + (s + 1) + ' of ' + SHELF_SECTIONS, 'Tap a thing to put it in your basket. Pay at the till.', 1, 8);
    basketLabel();
    hud();
  },
  actions() { return []; }   // ◀ Back to the shop (no Step back: Steve)
};
// One thing on a shelf, front on, standing on the board at y (at most 70 high, to fit under the board above): its proper picture, twice size
function drawShelfItem(kind, x, y, n, name) {
  drawProduct(name, kind, x - 6, y - 64, 2, n);
}
// ---------- every thing you can buy, drawn properly: one picture for each, used on the shop shelves and the garage shelf (Steve) ----------
// Each is designed on a 32 x 32 grid; s = pixels per grid square (1 on the garage shelf, 2 on a shop shelf close up)
//   name: what it is (picks its picture); kind: the old rough kind (a fallback); n: a number, for colour variety
function drawProduct(name, kind, x, y, s, n = 0) {
  const nm = String(name || '').toLowerCase();
  const has = (...words) => words.some(w => nm.includes(w));
  const q = v => Math.round(v);
  const R = (dx, dy, w, h, c) => rect(q(x + dx * s), q(y + dy * s), Math.max(1, q(w * s)), Math.max(1, q(h * s)), c);   // a rectangle
  const B = (dx, dy, w, h, r, c) => rbox(q(x + dx * s), q(y + dy * s), Math.max(2, q(w * s)), Math.max(2, q(h * s)), Math.max(1, q(r * s)), c);   // a rounded box
  const O = (cx, cy, r, c) => disc(q(x + cx * s), q(y + cy * s), Math.max(1, q(r * s)), c);   // a disc
  const OR = (cx, cy, r, c) => ring(q(x + cx * s), q(y + cy * s), Math.max(1, q(r * s)), c);  // a ring
  const L = (x0, y0, x1, y1, w, c) => pipe(x + x0 * s, y + y0 * s, x + x1 * s, y + y1 * s, Math.max(1, w * s), c);   // a thick line
  const P1 = (x0, y0, c) => R(x0, y0, 1, 1, c);                            // one grid square
  const label = (str, dx, dy, c) => { if (s >= 2) text(str, q(x + dx * s), q(y + dy * s), c); };   // words only when it's big enough to read
  const DARK = hex('#202024');

  // ----- tools -----
  if (has('hammer')) {                                                     // a claw hammer: wooden handle, steel head, the claw
    L(9, 29, 19, 9, 3, C.wood); L(9, 29, 12, 23, 3.4, hex('#3a3a40'));    // the handle and its rubber grip
    poly([[x + 11 * s, y + 4 * s], [x + 25 * s, y + 13 * s], [x + 22 * s, y + 17 * s], [x + 8 * s, y + 8 * s]].map(([a, b]) => [q(a), q(b)]), C.steel);   // the head
    L(24, 14, 29, 10, 2, C.steel); L(23, 16, 29, 14, 1.5, C.steel);       // the claw
    return;
  }
  if (has('spanner')) {                                                    // a set of spanners in a red wallet
    B(2, 7, 28, 20, 2, hex('#a02020')); B(3, 8, 26, 18, 2, hex('#c83030'));
    for (let k = 0; k < 5; k++) { const sx = 6 + k * 5; L(sx, 24, sx + 1, 11, 1.6, C.steel2); OR(sx + 1, 10, 1.6, C.steel2); OR(sx, 25, 1.2, C.steel2); }
    label('SPANNERS', 4, 28, C.white);
    return;
  }
  if (has('screwdriver') || kind === 'drivers' && !has('extractor')) {     // screwdrivers on a card: coloured handles, steel shafts
    R(3, 3, 26, 27, hex('#e8e0c8'));
    [C.red, C.warm, C.car, hex('#40a060')].forEach((c, k) => { const sx = 6 + k * 6; B(sx, 17, 4, 10, 1.5, c); R(sx + 1.5, 5, 1, 12, C.steel2); });
    return;
  }
  if (has('pliers')) {                                                     // pliers: steel jaws, a rivet, red grips
    L(16, 4, 15, 13, 3, C.steel2); L(16, 4, 17, 13, 3, C.steel); O(16, 13, 2, C.steel);
    L(15, 14, 10, 29, 3.4, C.red); L(17, 14, 22, 29, 3.4, C.red);
    for (let k = 0; k < 3; k++) { R(10.5 + k * 0.6, 20 + k * 3, 3, 0.6, hex('#8a1a1a')); R(19 - k * 0.6, 20 + k * 3, 3, 0.6, hex('#8a1a1a')); }
    return;
  }
  if (has('hacksaw', 'saw')) {                                             // a hacksaw: red frame, a blade with teeth
    R(3, 8, 26, 2, C.red); R(3, 8, 2, 12, C.red); R(27, 8, 2, 12, C.red);  // the frame
    B(2, 18, 6, 10, 2, hex('#a01818'));                                    // the handle
    R(5, 19, 22, 2, C.steel2);                                             // the blade
    for (let k = 0; k < 11; k++) P1(5 + k * 2, 21, C.steel);               // its teeth
    return;
  }
  if (has('tape measure')) {                                               // a tape measure: yellow case, black middle, the tape poking out
    B(4, 6, 22, 20, 5, hex('#f0c020')); O(15, 16, 5, DARK); O(15, 16, 2, C.steel);
    R(24, 22, 6, 3, hex('#f8e070')); R(29, 21, 1, 5, C.steel2);            // the tape and its hook
    for (let k = 0; k < 3; k++) R(25 + k * 1.5, 22, 0.4, 1.4, DARK);
    return;
  }
  if (has('drill')) {                                                      // a cordless drill, side on
    B(6, 6, 20, 10, 3, hex('#2a8a3a')); R(26, 9, 3, 4, DARK); R(29, 10, 2, 2, C.steel2);   // body, chuck, bit
    L(14, 15, 12, 25, 5, hex('#2a8a3a')); R(13, 18, 2, 2, C.red);         // the grip and trigger
    B(7, 25, 14, 5, 1, DARK);                                              // the battery
    return;
  }
  if (has('socket')) {                                                     // a socket set: black case open, sockets in two rows
    B(2, 6, 28, 22, 2, DARK); R(4, 9, 24, 16, hex('#3a3a40'));
    for (let k = 0; k < 6; k++) { O(7 + k * 4, 13, 1.5 + k * 0.15, C.steel2); O(7 + k * 4, 20, 1.6, C.steel); }
    R(14, 4, 4, 2, C.steel);                                               // the catch
    return;
  }
  if (nm === METER_NAME.toLowerCase()) {                                   // the multimeter: yellow, its screen, its dial, the two leads
    B(8, 4, 16, 26, 2, C.warm); R(10, 7, 12, 6, hex('#0a2a20')); R(16, 9, 4, 2, C.mint);
    O(16, 20, 4.5, C.ink); R(15.5, 16, 1, 4, C.white);
    L(11, 29, 4, 24, 1, C.red); L(21, 29, 28, 24, 1, DARK);
    return;
  }
  if (has('torch')) {                                                      // a torch: black body, a yellow head, its glass
    L(5, 18, 21, 18, 6, DARK); B(20, 12, 9, 12, 2, hex('#d0a020')); R(28, 14, 1.5, 8, hex('#e8f0f0'));
    R(11, 15, 3, 2, C.red);                                                // the switch
    return;
  }
  if (has('wd-40', 'wd40')) {                                              // WD-40: a blue can, a yellow band, the red straw
    B(10, 7, 12, 23, 2, hex('#1a4ab0')); R(10, 14, 12, 7, hex('#f0c020')); R(11, 16, 10, 2, hex('#1a4ab0'));
    R(13, 4, 6, 3, C.red); L(19, 5, 28, 2, 1, C.red);                      // the cap, the straw
    return;
  }
  if (has('gaffer', 'tape')) {                                             // a roll of gaffer tape: silver, a cardboard middle, a loose end
    O(15, 15, 11, hex('#9a9ea4')); O(15, 15, 9, hex('#b8bcc2')); O(15, 15, 5, CARDBOARD); O(15, 15, 3.5, hex('#3a2e20'));
    R(15, 26, 12, 3, hex('#9a9ea4'));                                      // the loose end
    return;
  }
  if (has('cable ties')) {                                                 // cable ties in a clear bag with a card header
    R(5, 3, 22, 6, C.red); label('TIES', 9, 4, C.white);
    R(6, 9, 20, 20, hex('#dce8ec'));
    for (let k = 0; k < 7; k++) L(8 + k * 2.6, 27, 9 + k * 2.6, 11, 0.8, C.ink);
    return;
  }
  if (has('glove')) {                                                      // a pair of work gloves
    for (const [gx, c] of [[3, hex('#f0b030')], [15, hex('#e09020')]]) {
      B(gx, 14, 11, 12, 3, c); for (let k = 0; k < 4; k++) R(gx + 1 + k * 2.6, 6, 2, 9, c); R(gx + 10, 13, 3, 6, c);   // palm, fingers, thumb
      R(gx, 24, 11, 3, hex('#2a5a9a'));                                     // the cuff
    }
    return;
  }
  // ----- car parts -----
  if (has('headlight')) {                                                  // a headlight in its box, a window showing it, L or R big on the side
    const right = has('right') && !has('left');
    B(1, 4, 30, 25, 1, CARDBOARD); R(1, 4, 30, 4, hex('#3060a0'));
    B(4, 10, 20, 15, 4, DARK); B(6, 12, 16, 11, 3, C.steel2); B(8, 13, 12, 9, 2, hex('#e8f0f8'));   // housing, reflector, lens
    if (has('zafira', 'unit', 'used')) { R(25, 12, 5, 9, C.white); label(right ? 'R' : 'L', 26, 14, C.red); }
    return;
  }
  if (has('brake')) {                                                      // brake pads: an orange box with a pad on the front
    B(2, 6, 28, 22, 1, hex('#e07020')); R(2, 6, 28, 4, DARK);
    poly([[10, 14], [22, 14], [25, 22], [7, 22]].map(([a, b]) => [q(x + a * s), q(y + b * s)]), hex('#4a4a50'));   // the pad
    R(9, 20, 14, 2, hex('#2a2a2e'));                                       // its friction lining
    label('PADS', 9, 7, C.white);
    return;
  }
  if (has('oil filter')) {                                                 // an oil filter: a blue canister, ribs at the bottom, a white label
    B(8, 4, 16, 24, 3, hex('#1a4ab0')); R(10, 10, 12, 8, C.white); R(12, 12, 8, 1, C.ink); R(12, 15, 6, 1, C.ink);
    for (let k = 0; k < 6; k++) R(8.5 + k * 2.6, 24, 1, 4, hex('#103080'));
    return;
  }
  if (has('wiper')) {                                                      // wiper blades on a card, long and thin
    R(3, 3, 26, 27, hex('#e8e0c8')); R(3, 3, 26, 5, hex('#2a6ab0'));
    L(6, 27, 26, 10, 2, DARK); L(7, 28, 27, 11, 0.8, hex('#4a4a50'));      // the blade
    O(26, 10, 1.5, C.steel2);                                              // its clip
    return;
  }
  if (has('bulb')) {                                                       // car bulbs in a blister pack
    R(4, 3, 24, 27, C.white); R(4, 3, 24, 6, C.red); label('BULBS', 6, 4, C.white);
    for (const bx of [11, 21]) { O(bx, 15, 4, hex('#f4f4e0')); R(bx - 2, 19, 4, 5, hex('#c8a040')); R(bx - 0.5, 13, 1, 3, hex('#5a5a40')); }
    return;
  }
  if (has('spark')) {                                                      // spark plugs in a blister pack: white insulators, steel hex and thread
    R(3, 3, 26, 27, hex('#e8e0c8')); R(3, 3, 26, 5, C.red);
    for (const px0 of [10, 20]) {
      R(px0 - 0.5, 9, 1, 2, C.steel); R(px0 - 2, 11, 4, 8, C.white); R(px0 - 2.5, 19, 5, 3, C.steel2);
      for (let k = 0; k < 3; k++) R(px0 - 1.5, 22 + k * 1.6, 3, 0.8, C.steel); R(px0 - 0.5, 27, 1, 1.5, hex('#4a4a4a'));
    }
    return;
  }
  if (has('fuse')) {                                                       // a card of blade fuses, all the colours
    R(3, 4, 26, 25, C.white); R(3, 4, 26, 5, hex('#2a6ab0'));
    const cols = [C.red, C.car, hex('#f0c020'), C.white, hex('#40a060'), hex('#e070a8')];
    for (let k = 0; k < 6; k++) { const fx = 6 + (k % 3) * 8, fy = 12 + Math.floor(k / 3) * 8; R(fx, fy, 5, 4, cols[k]); R(fx + 0.5, fy + 4, 1, 2, C.steel2); R(fx + 3.5, fy + 4, 1, 2, C.steel2); }
    return;
  }
  if (has('23a')) {                                                        // a card of five tiny 23A batteries
    R(5, 4, 22, 25, C.white); R(5, 4, 22, 5, C.red); label('23A', 11, 5, C.white);
    for (let k = 0; k < 5; k++) { R(8 + k * 3.6, 12, 2.4, 12, C.steel2); R(8 + k * 3.6, 12, 2.4, 2, C.ink); }
    return;
  }
  if (has('batter')) {                                                     // AA batteries on a card: copper tops
    R(4, 3, 24, 27, C.white); R(4, 3, 24, 6, hex('#1a1a1a')); label('AA', 13, 4, hex('#d08030'));
    for (let k = 0; k < 4; k++) { R(7 + k * 5, 12, 3.6, 15, hex('#1a1a1a')); R(7 + k * 5, 12, 3.6, 4, hex('#d08030')); R(8 + k * 5, 11, 1.6, 1, C.steel2); }
    return;
  }
  if (has('sensor', 'part-')) {                                            // a sensor in a blister pack: an alloy body, its ear, its plug
    if (has('lot')) {                                                      // the job lot: an open box of them
      B(2, 10, 28, 19, 1, CARDBOARD); R(2, 10, 28, 3, hex('#9a7a4a'));
      for (let k = 0; k < 6; k++) O(6 + (k % 3) * 9, 8 + Math.floor(k / 3) * 3, 3, k % 2 ? ALLOY : BLACKPART);
      return;
    }
    R(3, 3, 26, 27, C.white); R(3, 3, 26, 5, hex('#e07020'));
    B(8, 12, 12, 10, 2, ALLOY); B(5, 15, 4, 4, 1, ALLOY); O(7, 17, 0.8, C.ink); B(20, 14, 6, 6, 1, DARK);
    label('FITS ALL*', 4, 25, C.ink);
    return;
  }
  if (has('reader')) {                                                     // a code reader: yellow, a screen, buttons, its lead
    B(8, 2, 16, 24, 3, has('zamanon', 'fits all cars') ? hex('#2e5a34') : hex('#d0a020'));   // (the Zamanon one is green, like its plug)
    R(10, 5, 12, 8, hex('#0a2a20')); R(11, 6, 6, 1, C.mint);
    for (const bx of [10, 15, 20]) R(bx, 16, 3, 2, hex('#3a3a3a'));
    L(16, 26, 22, 30, 2.4, C.ink);                                         // its thick lead
    return;
  }
  if (has('extractor')) {                                                  // bolt extractors on a card: tapered spiral bits
    R(4, 3, 24, 27, hex('#e8e0c8')); R(4, 3, 24, 5, C.red);
    for (let k = 0; k < 3; k++) { const bx = 9 + k * 7; R(bx - 1.5, 10, 3, 6, C.tool); poly([[bx - 1.5, 16], [bx + 1.5, 16], [bx + 0.5, 27], [bx - 0.5, 27]].map(([a, b]) => [q(x + a * s), q(y + b * s)]), C.tool); for (let t = 17; t < 26; t += 2) R(bx - 1, t, 2, 0.6, shade(C.tool, 0.6)); }
    return;
  }
  if (has('engine oil')) {                                                 // a 5 litre bottle of engine oil: black, gold label, a handle
    B(8, 6, 18, 24, 3, DARK); R(20, 8, 4, 8, C.white);                     // the bottle, the hole for the handle
    R(10, 16, 14, 9, hex('#d8b040')); R(12, 18, 10, 1, DARK); R(12, 21, 7, 1, DARK);
    R(10, 3, 5, 3, hex('#d8b040'));                                        // the cap
    return;
  }
  if (has('screen wash')) {                                                // a jug of screen wash: blue, see-through, a handle
    B(8, 6, 18, 24, 3, hex('#8ab8e8')); B(9, 12, 16, 17, 2, hex('#2a6ad0')); R(20, 8, 4, 6, C.white);
    R(10, 3, 5, 3, C.white); R(11, 18, 12, 4, C.white); label('WASH', 11, 18, hex('#2a6ad0'));
    return;
  }
  if (has('jump')) {                                                       // jump leads: a coil of red and black, the clamps
    for (let k = 0; k < 3; k++) { OR(13, 16, 8 - k, C.red); OR(17, 16, 8 - k, DARK); }
    for (const [cx, c] of [[4, C.red], [26, DARK]]) { R(cx - 2, 24, 4, 6, c); R(cx - 2, 22, 4, 2, C.steel2); }
    return;
  }
  // ----- the everything shop -----
  if (has('air freshener')) {                                              // a little tree air freshener on a string
    L(16, 2, 16, 7, 0.6, C.white);
    poly([[16, 6], [24, 16], [20, 16], [26, 23], [18, 23], [18, 28], [14, 28], [14, 23], [6, 23], [12, 16], [8, 16]].map(([a, b]) => [q(x + a * s), q(y + b * s)]), hex('#2a9a3a'));
    return;
  }
  if (has('dice')) {                                                       // fluffy dice: two pink furry cubes
    for (const [dx, dy] of [[5, 10], [16, 14]]) { B(dx, dy, 11, 11, 3, hex('#f080b8')); O(dx + 3, dy + 3, 0.8, C.ink); O(dx + 5.5, dy + 5.5, 0.8, C.ink); O(dx + 8, dy + 8, 0.8, C.ink); }
    L(10, 10, 16, 3, 0.6, C.white); L(21, 14, 16, 3, 0.6, C.white);       // their string
    return;
  }
  if (has('crisps')) {                                                     // a bag of crisps: crimped ends, a window
    B(7, 4, 18, 25, 2, hex('#d02030')); for (let k = 0; k < 6; k++) { R(7 + k * 3, 3, 1.5, 2, hex('#d02030')); R(7 + k * 3, 28, 1.5, 2, hex('#d02030')); }
    O(16, 17, 5, hex('#f0d070')); label('CRISPS', 8, 7, C.white);
    return;
  }
  if (has('energy')) {                                                     // an energy drink: a tall slim can with a lightning bolt
    B(11, 3, 10, 27, 2, hex('#1a1a2a')); R(11, 4, 10, 2, C.steel2);
    poly([[17, 9], [13, 18], [16, 18], [14, 26], [19, 15], [16, 15]].map(([a, b]) => [q(x + a * s), q(y + b * s)]), hex('#d8f030'));
    return;
  }
  if (has('biscuit')) {                                                    // a packet of biscuits lying down, one end showing them
    B(3, 11, 26, 12, 4, hex('#4a2a8a')); O(27, 17, 6, hex('#c08a50')); O(27, 17, 4, hex('#a06a38'));
    R(6, 14, 14, 3, C.white);
    return;
  }
  if (has('sponge')) {                                                     // a yellow car sponge, full of holes
    B(4, 9, 24, 15, 5, hex('#f0d040'));
    for (let k = 0; k < 9; k++) O(7 + (k * 7) % 20, 12 + (k * 5) % 10, 0.8, hex('#c8a020'));
    return;
  }
  if (has('ice scraper')) {                                                // an ice scraper: a blue blade and handle
    poly([[4, 6], [20, 6], [16, 16], [8, 16]].map(([a, b]) => [q(x + a * s), q(y + b * s)]), hex('#3070c0'));
    L(12, 16, 22, 28, 4, hex('#2a5aa0'));
    return;
  }
  if (has('charger')) {                                                    // a phone charger: a white plug, its cable in loops
    B(5, 6, 10, 12, 2, C.white); R(7, 3, 2, 3, C.steel2); R(11, 3, 2, 3, C.steel2);
    for (let k = 0; k < 3; k++) OR(19 + k * 3, 20, 4, hex('#d8d8d8'));
    R(26, 26, 4, 2, C.steel2);
    return;
  }
  // ----- your own things -----
  if (kind === 'jar') { B(8, 6, 16, 22, 3, hex('#c8d8e0')); R(8, 3, 16, 5, C.red); for (let k = 0; k < 9; k++) R(10 + (k * 5) % 12, 14 + Math.floor(k / 3) * 4, 3, 1, C.steel2); return; }   // a coffee jar of screws
  if (kind === 'gauge') { L(6, 26, 18, 14, 4, C.steel2); O(21, 11, 7, C.steel); O(21, 11, 5, C.white); L(21, 11, 18, 13, 1, C.ink); R(17, 11, 3, 3, C.red); return; }   // the tyre pressure gauge
  if (kind === 'handbook') { B(7, 4, 18, 25, 2, HANDBOOK_BLUE); R(9, 7, 14, 4, C.white); R(11, 15, 10, 5, C.car); return; }
  if (kind === 'can') { B(9, 4, 14, 25, 3, [C.red, C.car, hex('#40a060')][n % 3]); R(10, 12, 12, 7, C.white); R(12, 2, 8, 2, C.steel2); return; }
  // anything else: a cardboard box, taped, with THIS WAY UP arrows
  B(3, 7, 26, 21, 1, CARDBOARD); R(3, 7, 26, 3, hex('#b08850')); R(14, 7, 4, 21, hex('#d8c090'));   // the box, its lid edge, the tape
  for (const ax of [6, 22]) { R(ax + 1, 16, 1, 5, DARK); P1(ax, 17, DARK); P1(ax + 2, 17, DARK); }
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
const ITEM_KIND = { 'reader-good': 'reader', 'reader-cheap': 'reader', 'reader-old': 'reader', 'part-mega': 'sensor', 'part-p4l': 'sensor', 'extractor-cheap': 'drivers', 'extractor-good': 'drivers', 'fuses': 'box', 'battery-23a': 'box' };
// Everything you've bought: [name, how it's drawn, how many]
function storeList() {
  const list = [];
  for (const [name, b] of Object.entries(S.bought || {})) {
    if (name === DICE) { const n = b.n - (diceUp() ? 1 : 0); if (n > 0) list.push([name, 'dice', n]); continue; }   // the dice: not while they're hanging in the car
    list.push([name, b.kind, b.n]);
  }
  for (const id of Object.keys(S.inv)) {
    const it = ITEMS[id];
    if (!it || it.none || !S.inv[id]) continue;                                    // not a thing you bought
    list.push([it.name, ITEM_KIND[id] || 'box', 1]);
  }
  if (S.inv.hammer && !(S.bought && S.bought['Claw hammer'])) list.push(['Claw hammer', 'hammer', 1]);   // bought before there was a basket
  if (!screwsOnFloor()) list.push([SCREW_JAR, 'jar', 1]);                           // the screw jar (not while its screws are all over the floor: screws.js)
  if (S.flags.gloveTorch) list.push([GLOVE_TORCH, 'torch', 1]);                     // out of the glove box (car.js)
  if (S.flags.meterOK && !S.flags.meterOut) list.push([METER_NAME, 'box', 1]);      // the multimeter, with its new battery in (not while it's out on the fuse box)
  if (S.flags.gloveGauge) list.push([GAUGE_NAME, 'gauge', 1]);                      // the tyre pressure gauge, out of the glove box
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
      drawIcon(kind, x + 1, y + 1, k, name);
      if (n > 1) { text(String(n), x + 24, y + 24, hex('#3a3a3a')); text(String(n), x + 23, y + 23, C.white); }
      spot(esc(name) + (n > 1 ? ' ×' + n : ''), [x, y, 34, 34], 'act:storelook:' + k);
    });
    tip('Garage shelves', list.length ? 'Everything you\'ve bought.' : 'Empty. Things you buy go here.', 1, 8);
    hud();
  },
  actions() { return []; }   // ◀ Back to the garage
};
// A spare headlight on the shelf: fit it, if one of yours is smashed (the old one goes in the parts box)
function shelfHeadlight(name) {
  const smashed = brokeOpen('headlight') || brokeOpen('headlight2');
  if (!smashed) return say(name, 'On your garage shelf. For when you next lose your temper.');
  say(name, 'A new headlight, still in its box.', [
    { label: 'Fit it to the car', run() { ACTIONS.fitlight(); } },
    { label: 'Leave it on the shelf', run() {} }
  ]);
}
// ---------- fluffy dice: off the shelf onto the rear-view mirror, and back ----------
const DICE = 'Fluffy dice';
const diceUp = () => !!S.flags.diceUp;                              // hanging in the car
function shelfDice() {
  say(DICE, 'Pink. Fluffy. Very nearly dice.', [
    { label: 'Hang them in the car', run: hangDice },
    { label: 'Leave them on the shelf', run() {} }
  ]);
}
function hangDice() {
  S.flags.diceUp = true;                                            // off the shelf, onto the mirror
  sfx('click');
  say(DICE, 'You hang them on the rear-view mirror. The car is now worth slightly less.');
}
function takeDiceDown() {
  S.flags.diceUp = false;                                           // back on the garage shelf
  sfx('click');
  say(DICE, 'You take them down. They go back on the garage shelf.');
}
// A little picture of a thing, in a 32 x 32 slot: the same picture as on the shop shelf (drawProduct)
function drawIcon(kind, x, y, n, name) {
  drawProduct(name, kind, x, y, 1, n);
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
// BOUGHT THINGS THAT DO SOMETHING (tap them on the garage shelves). So far: the torch and the batteries
// A working torch lights up under the shelves, the tool chest, the workbench, the car (no need for the phone's)
// =====================================================================
const boughtOne = name => !!(S.bought && S.bought[name]);
// A torch that works: what made it work goes in the notebook if you were after batteries for the nut hunt
function torchWorks(how) {
  S.flags.torchLit = true;
  sfx('click');
  if (!leadOpen('batteries')) return;
  closeLead('batteries', 'ok', how);
  lead('nut3', 'search', 'Search the garage floor (with the torch)', 'you', 'hopeful', 'garage');
}
// The torch off a shop shelf: batteries not included
function useBoughtTorch() {
  if (S.flags.torchLit) return say('Torch', 'It works. Point it under anything: the shelves, the tool chest, the workbench, the parts boxes.');
  if (!boughtOne('Batteries')) frustrated();
  if (!boughtOne('Batteries')) return say('Torch', 'A new torch. You click it: nothing. On the back of the box: "Batteries not included."');
  torchWorks('A new torch, with AAs from the shop: it works');
  say('Torch', 'Two of the AAs from the shop go in the new torch. Click. Light!\n\nNow you can see under things.');
}
// AA batteries off a shop shelf: into a torch, if you've got one
function useBoughtBatteries() {
  if (S.flags.torchLit) return say('Batteries', 'Spare AAs. The torch already works.');
  const torch = boughtOne('Torch') ? 'the new torch' : S.inv.torch ? 'the old torch from the toolbox' : null;   // a torch to put them in
  if (!torch) return say('Batteries', 'AA batteries. Nothing you own takes AAs. Yet.');
  torchWorks(`AA batteries from the shop in ${torch}: it works`);
  say('Batteries', `Two AAs in ${torch}. Click. Light!\n\nNow you can see under things.`);
}

// Open the notebook at its last page: the fuse diagram you copied off TechDocs
function showFuseCopy() {
  S.nbPage = 999;                                                       // as far as it goes (the notebook stops at its last spread)
  show('notebook');
}

// =====================================================================
// NEW ACTIONS
// =====================================================================
Object.assign(ACTIONS, {
  rageback() { S.screen = RAGE.from || 'home'; render(); },             // after losing it: back where you were
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
    germanDiagram();                                                              // the German manual's diagram: it might tell you what P0705 is
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
    if (!spend(total)) { anger(10); return say('The till', '£' + total.toFixed(2) + '. ' + declinedWords()); }
    pass(5);
    S.bought = S.bought || {};
    for (const b of items) {
      if (b.name.startsWith('Headlight')) { addLamp(b.name.includes('right') ? 'right' : 'left'); continue; }   // a headlight: a spare, on the shelf
      const had = S.bought[b.name];
      S.bought[b.name] = { kind: b.kind, n: (had ? had.n : 0) + 1 };                   // onto your garage shelves
    }
    S.basket = S.basket.filter(b => b.place !== S.place);
    const names = items.map(b => b.name).join(', ');
    const hammer = items.some(b => b.name === 'Claw hammer') ? boughtHammer() : '';
    const sockets = items.some(b => b.name === SOCKET_SET) ? boughtSockets() : '';   // the 10 mm, at last (story.js)
    if (items.some(b => b.name === UNIVERSAL)) boughtUniversal();     // the universal sensor: a lead to try it (sensors.js)
    say('The till', `"That's £${total.toFixed(2)}." Beep.\n\nYou bought: ${names}. It'll be on the shelves in your garage.${hammer}${sockets}`);
  },
  // the garage shelves: what each thing is
  storelook(k) {
    const [name, , n] = storeList()[+k] || [];
    if (!name) return;
    if (name === HANDBOOK_NAME) return openHandbook();               // the handbook: read it
    if (name === 'Torch') return useBoughtTorch();                   // a torch off a shop shelf
    if (name === 'Batteries') return useBoughtBatteries();           // AAs off a shop shelf
    if (name.startsWith('Headlight (Zafira')) return shelfHeadlight(name);   // a spare headlight: fit it, if one's smashed
    if (name === UNIVERSAL) return shelfUniversal();                 // the universal sensor: try it on the bench (sensors.js)
    if (name === DICE) return shelfDice();                          // fluffy dice: hang them in the car
    if (name === SCREW_JAR) return shelfJar();                      // the screw jar (screws.js)
    if (name === GLOVE_TORCH) return say(name, 'Click. Nothing. The batteries inside have gone furry.');   // the glove box torch
    if (name === ZAM_SOCKETS) return say(name, '107 pieces. Every size but the 10.');   // off Zamanon
    if (name === SOCKET_SET) return say(name, 'Every size, even the 10. For now.');   // for the bolts under the car
    if (name === METER_NAME) return testMeter();                     // the multimeter: it works now
    if (name === GAUGE_NAME) return say(name, 'A dial on a stick. It lives on the shelf now.');   // the tyre pressure gauge
    say(name, n > 1 ? `You've got ${n}.` : 'On your garage shelf.');
  },
  // fixing what you broke when you lost it
  // the hammer and the stuck part
  tapit() {
    pass(5); sfx('thud'); sfx('thud', 0.3); sfx('clink', 0.6);
    S.flags.tapped = true; closeLead('tap', 'ok');
    say('Tap, tap, TAP', 'It moves. Just a little. Try pulling it now.');
  },
  hammerbox() {
    pass(5);
    closeLead('hammer-box', 'x', 'No hammer in the toolbox (your brother Paul borrowed it in 2019)');
    lead('hammer', 'hammer-shop', 'Buy a hammer at the Hardware Shop', 'you', 'sure', 'place:Hardware Shop');
    say('Drawer 6', 'A hammer-shaped gap. Your brother Paul borrowed it in 2019.');
  },
  // the fuse diagram online: copy it by hand onto a page of the notebook (the handbook's page was ripped out)
  fusenote() {
    if (S.flags.fuseCopy) return showFuseCopy();                         // copied already: look at it
    pass(20);
    S.flags.knowF23 = true;
    S.flags.fuseCopy = true;
    closeLead('fusediagram', 'ok', 'Fuse diagram copied into the back of this notebook: F23 is the instrument cluster and the gearbox sensor (probably)');
    lead('meaning', 'checkf23', 'Check fuse F23', 'TechDocs', 'fairly sure', 'fuseZoom');
    showFuseCopy();
    say('The fuse diagram', 'Twenty minutes with a biro. Half of it makes sense. The other half is codes. But F23 says "IPC / TCM sensor supply". That\'s probably it.\n\nIt\'s on the last page of your notebook now.');
  }
});
