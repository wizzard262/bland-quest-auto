// The Thankless Task: more things to do.
//   Anger: ways to calm down, and when you lose it you break something on the car (a new job)
//   The manuals shelf: read each book's spine, pull one down and look inside
//   Shop shelves: zoom in on a shelf to see what's really on it (the hammer they said they hadn't got)
//   The fuse diagram: not in the book; you have to find it online

// =====================================================================
// ANGER
// =====================================================================
// What breaks on the car when you lose your temper, one at a time; each is a small job to fix
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
// Lose your temper: something on the car breaks (once each), then it's the wheelie bin
function breakSomething() {
  const b = CAR_BREAKS.find(x => !S.flags['broke-' + x.id]);
  S.anger = 40;
  moment('kick', 1300); sfx('kick');
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
  ['Zafira 1999–2005 Petrol (Excite only)', 'Chapter 7: Automatic transmission. "Removal is a dealer operation." Page 7-12 has a drawing of a sensor that looks nothing like yours.'],
  ['Zafira Diesel', 'Everything about the diesel. Your car is petrol.'],
  ['Astra 1998–2004', '"The Astra and Zafira share many parts." It doesn\'t say which.'],
  ['Vectra Workshop Manual', 'You don\'t own a Vectra. You never have.'],
  ['Car Electrics Made Simple (1987)', 'Chapter 1: What is electricity? Chapter 2: Points and condensers.'],
  ['The Complete Gearbox', '412 pages on manual gearboxes. One paragraph on automatics: "These are best left to specialists."'],
  ['Zafira 1.6 Plus (Deutsch)', 'Ihr Fahrzeug ist mit einem Wählhebelsensor ausgestattet… It\'s exactly your car. It\'s in German.'],
  ['Zafira Owner\'s Handbook', 'Fuses: "The fuse box is behind the battery. See the fuse allocation table on page 62." Pages 61 to 64 have been torn out.'],
  ['Practical Car Maintenance', 'Lovely pictures of a 1972 Cortina. "Always use the correct tool."'],
  ['Wiring Diagrams Vol. 2', 'Volume 2 starts at circuit 214. Volume 1 is missing.'],
  ['Motor Repair for Beginners', 'Step 1: Take it to a mechanic.'],
  ['Classic Minis', 'Not even slightly useful. You read it for twenty minutes anyway.'],
  ['How to Swear Less', 'The bookmark is on page 3.'],
  ['Fiesta Mk3 (borrowed, 2004)', 'Inside the cover: "PLEASE GIVE BACK — GAZ".']
];
SCREENS.shelf = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, H, C.concrete, 0.08, 101);
    for (let y = 6; y < H; y += 9) rect(0, y, W, 1, C.concreteDark);
    // the shelf board, and the books standing on it
    rect(12, 220, 456, 10, C.wood); rect(12, 230, 456, 4, C.bench);
    const cols = [C.red, C.car, C.warm, hex('#40a060'), C.white, hex('#9a5ac8'), C.redDim, C.tree1, C.steel2, CARDBOARD, C.car, hex('#e070a8'), C.ink, C.red];
    BOOKS.forEach(([title], i) => {
      const x = 20 + i * 32, h = 150 + Math.round(hash(i, 3) * 40), top = 220 - h;
      rect(x, top, 28, h, cols[i]); rect(x, top + 10, 28, 2, shade(cols[i], 0.7)); rect(x, 220 - 14, 28, 2, shade(cols[i], 0.7));
      rect(x + 26, top, 2, h, shade(cols[i], 0.75));
      const dark = [C.white, C.warm, CARDBOARD].includes(cols[i]);
      LABELS.push(`<div class="spine" style="left:${(x + 4) / W * 100}%;top:${(top + 16) / H * 100}%;width:${20 / W * 100}%;height:${(h - 34) / H * 100}%;color:${dark ? '#101018' : '#fff'}">${esc(title)}</div>`);
      spot(esc(title), [x, top, 28, h], 'act:book:' + i);
    });
    tip('The manuals shelf', S.book != null ? 'Reading: ' + esc(BOOKS[S.book][0]) : 'Point at a book to read its spine. Tap to pull it down.', 1, 8);
    hud();
  },
  overlay() {
    if (S.book == null) return '';
    const [title, page] = BOOKS[S.book];
    return `<div class="ov book"><div class="pg"><h3>${esc(title)}</h3><p>${esc(page)}</p></div><div class="pg"><p class="faint">${'— '.repeat(30)}</p><p class="faint">(oil stain)</p></div></div>`;
  },
  actions() {
    return S.book != null ? [{ label: 'Put it back', act: 'book:-1' }] : [{ label: 'Back to the garage', act: 'go:garage' }];
  }
};

// =====================================================================
// A SHOP SHELF, CLOSE UP: what's really on it
// =====================================================================
const SHELF_ITEMS = {
  tools: [['Spanner set', 'spanners'], ['Screwdrivers', 'drivers'], ['Pliers', 'pliers'], ['Claw hammer', 'hammer'], ['Hacksaw', 'saw'], ['Tape measure', 'tape'], ['Drill (box)', 'box'], ['Socket set', 'box']],
  parts: [['Brake pads', 'box'], ['Oil filter', 'can'], ['Wiper blades', 'box'], ['Bulbs', 'box'], ['Spark plugs', 'box'], ['Air freshener', 'can'], ['Fuses', 'box'], ['"Universal" sensor', 'box']]
};
function shelfItemsFor(place) {
  const style = placeStyle(place);
  const list = (style === 'tools' ? SHELF_ITEMS.tools : SHELF_ITEMS.parts).slice();
  // shelf by shelf the order changes, and the hammer is only on the middle shelf of a tool shop
  const k = S.shelfz || 0;
  const rot = list.slice(k * 3).concat(list.slice(0, k * 3)).filter(([n]) => style === 'tools' ? (n !== 'Claw hammer' || k === 1) : true);
  if (style === 'tools' && k === 1 && !rot.some(([n]) => n === 'Claw hammer')) rot.splice(3, 0, ['Claw hammer', 'hammer']);
  return rot.slice(0, 7);
}
SCREENS.shelfzoom = {
  size: [480, 270],
  paint() {
    const i = placeIndex(S.place), col = hex(CAT[i >= 0 ? PLACES[i][1] : 'other'][1]);
    rect(0, 0, W, H, shade(col, 0.8));
    rect(0, 200, W, 14, C.wood); rect(0, 214, W, 6, C.bench); rect(0, 220, W, H - 220, shade(col, 0.6));
    shelfItemsFor(S.place).forEach(([name, kind], n) => {
      const x = 22 + n * 64, sold = name === 'Claw hammer' && S.inv.hammer;
      if (sold) return;
      drawShelfItem(kind, x, 200, n);
      spot(esc(name), [x - 4, 120, 60, 84], 'act:shelfitem:' + name);
    });
    tip(esc(S.place) + ': shelf ' + ((S.shelfz || 0) + 1), 'Point at things to see what they are.', 1, 8);
    hud();
  },
  actions() { return [{ label: 'Step back', act: 'shelfback' }]; }
};
// One thing on a shelf, front on, standing on the board at y
function drawShelfItem(kind, x, y, n) {
  if (kind === 'hammer') { rect(x + 22, y - 70, 6, 66, C.wood); rect(x + 8, y - 78, 34, 12, C.tool); rect(x + 36, y - 82, 8, 6, C.tool); rect(x + 10, y - 76, 30, 2, C.steel); return; }
  if (kind === 'spanners') { for (let k = 0; k < 4; k++) { rect(x + 6 + k * 10, y - 60 + k * 4, 5, 56 - k * 4, C.steel); ring(x + 8 + k * 10, y - 62 + k * 4, 5, C.steel2); } return; }
  if (kind === 'drivers') { for (let k = 0; k < 4; k++) { rbox(x + 4 + k * 12, y - 40, 9, 18, 3, [C.red, C.warm, C.car, hex('#40a060')][k]); rect(x + 7 + k * 12, y - 70, 3, 30, C.steel); } return; }
  if (kind === 'pliers') { pipe(x + 10, y - 70, x + 30, y - 4, 4, C.red); pipe(x + 40, y - 70, x + 20, y - 4, 4, C.red); disc(x + 25, y - 40, 4, C.steel); return; }
  if (kind === 'saw') { rect(x + 4, y - 50, 48, 6, C.steel); for (let k = 0; k < 12; k++) px(x + 4 + k * 4, y - 44, C.steel2); rect(x + 4, y - 66, 4, 20, C.red); rect(x + 48, y - 66, 4, 20, C.red); rect(x + 4, y - 66, 48, 4, C.red); return; }
  if (kind === 'tape') { disc(x + 26, y - 22, 18, C.warm); disc(x + 26, y - 22, 8, C.ink); rect(x + 40, y - 8, 14, 4, C.warm); return; }
  if (kind === 'can') { rbox(x + 8, y - 60, 36, 60, 6, [C.red, C.car, hex('#40a060')][n % 3]); rect(x + 12, y - 40, 28, 14, C.white); return; }
  rbox(x + 2, y - 54, 48, 54, 3, [CARDBOARD, C.white, C.red, C.car, C.warm][n % 5]); rect(x + 8, y - 40, 36, 12, C.white); rect(x + 10, y - 36, 26, 2, C.ink);
}

// =====================================================================
// NEW ACTIONS
// =====================================================================
Object.assign(ACTIONS, {
  calm() { calmMenu(); },
  // the manuals
  book(n) {
    const i = +n;
    if (i < 0) { S.book = null; sfx('thud'); return; }
    S.book = i; pass(5); sfx('drawer');
    if (i === 7 && leadOpen('fusebook')) {
      closeLead('fusebook', 'x', 'Owner\'s handbook: the fuse pages are torn out');
      lead('meaning', 'fusediagram', 'Find the fuse box diagram online', 'you', 'hopeful', 'app:TechDocs');
    }
  },
  // shop shelves
  shelfzoom(k) { S.shelfz = +k; show('shelfzoom'); },
  shelfback() { show('place'); },
  shelfitem(name) {
    if (name === 'Claw hammer' && S.flags.needHammer && !S.inv.hammer) {
      if (!spend(6.99)) return say('The counter', 'Card declined.');
      S.inv.hammer = true; sfx('beep');
      closeLead('hammer-shelf', 'ok'); closeLead('hammer-shop', 'ok');
      finishJob('hammer', 'Found a hammer on their shelf (they said they hadn\'t got any)');
      lead('new-sensor', 'tap', 'Tap the stuck part with the hammer', 'you', 'sure', 'bench');
      return say('The counter', 'You take it to the counter.\n\n"Oh. Didn\'t know we had one of them." £6.99.');
    }
    pass(2);
    say(name, name === 'Claw hammer' ? 'A good, heavy hammer.' : 'Not what you need. Probably.');
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
