// The Thankless Task: every screen. Each one has
//   size     the picture size in pixels
//   paint()  draws the picture from the game state (S), adding labels and tap areas
//   actions() the buttons under the picture: [{ label, act }]
//   overlay() real-text screens on top (computer, phone, notebook)
// Tap targets: data-go (another screen, 'place:Name' or 'app:Name') or data-act (an action in story.js).

const SCREENS = {};
// Escape text for HTML
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// A tappable real-text label at a picture position
function tapLabel(textLine, x, y, attr) {
  LABELS.push(`<div class="lbl tap" ${attr} style="left:${x / W * 100}%;top:${y / H * 100}%">${esc(textLine)}</div>`);
}
// A real-text note box
function tip(title, body, x, y) {
  LABELS.push(`<div class="tip" style="left:${x}%;top:${y}%"><b>${esc(title)}</b>${body}</div>`);
}

// =====================================================================
// HOME: the house, the drive, the garage
// =====================================================================
SCREENS.home = {
  size: [480, 270],
  paint() {
    ISO.ox = 250; ISO.oy = 96;
    // grass, then the pavement and the road along the front
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) px(x, y, hash(x, y) < 0.1 ? C.grassDark : C.grass);
    ground(-400, 138, 700, 150, C.drive);
    ground(-400, 150, 700, 192, C.road);
    for (let x = -400; x < 700; x += 24) line(...P(x, 171), ...P(x + 12, 171), C.white);
    ground(92, 60, 138, 138, C.drive);                                                     // driveway
    ground(42, 60, 56, 138, C.concreteDark);                                               // path
    tree(-40, 10); tree(150, -30); tree(-80, 90);
    // the house: red brick, slate roof, white windows, blue front door
    ibox(0, 0, 90, 60, 0, 54, C.brick);
    bricks(0, 0, 90, 60, 54, C.brickLine);
    gableRoof(-3, -3, 93, 63, 54, 28, C.brick, C.roof);
    winLeft(60, 10, 26, 32, 46); winLeft(60, 64, 80, 32, 46); winLeft(60, 10, 26, 10, 24);
    winRight(90, 20, 36, 38, 48);
    onLeft(60, 39, 53, 0, 27, C.white); onLeft(60, 40, 52, 0, 26, C.door);
    { const k = P(50, 60, 12); px(k[0], k[1], C.warm); }
    // the garage, joined on
    ibox(90, 8, 140, 60, 0, 34, C.cream, C.steel);
    onLeft(60, 96, 134, 0, 28, C.steel);
    for (let z = 3; z < 28; z += 3) line(...P(96, 60, z), ...P(134, 60, z), C.steel2);
    // neighbour Ken's house
    ibox(180, 10, 236, 60, 0, 40, hex('#e8a8c0'));
    gableRoof(177, 7, 239, 63, 40, 20, hex('#e8a8c0'), C.roof);
    winLeft(60, 190, 204, 16, 30); winLeft(60, 214, 228, 16, 30);
    // the car, the bin, parcels by the door, you
    isoCar(102, 72);
    ibox(-18, 66, -8, 76, 0, 14, C.tree2);
    S.doorstep.forEach((p, i) => { ibox(56, 62 + i * 9, 64, 70 + i * 9, 0, 7, CARDBOARD); line(...P(60, 62 + i * 9, 7), ...P(60, 70 + i * 9, 7), C.warm); });
    standingMan('home');
    spot('Car: into town', isoArea(102, 72, 126, 118, 0, 22), 'city', [96, 96]);
    spot('Front door: the computer', isoArea(38, 58, 54, 62, 0, 28), 'pc', [46, 66]);
    spot('Garage', isoArea(94, 58, 136, 62, 0, 30), 'garage', [115, 66]);
    if (S.doorstep.length) spot('Parcel', isoArea(54, 60, 66, 72 + (S.doorstep.length - 1) * 9, 0, 9), 'act:parcel', [62, 76]);
    hud();
  },
  actions() {
    return [
      { label: 'Into town', act: 'go:city' },
      { label: 'Computer', act: 'go:pc' },
      { label: 'Garage', act: 'go:garage' },
      { label: 'Make a cup of tea', act: 'tea' },
      { label: 'Go to bed', act: 'bed' }
    ].concat(S.doorstep.length ? [{ label: 'Open the parcel', act: 'parcel' }] : []);
  }
};

// =====================================================================
// CITY: the map of town. Tap a place and you're there
// =====================================================================
const PLACES = [
  // [name, category]  (one per lot, 7 across x 6 down)
  ['Motor Factors', 'parts'], ['Quickfix Motors', 'mech'], ['Library (free Wi-Fi)', 'other'], ['Gearbox Gurus', 'trans'], ['Post Office', 'other'], ['Parts 4 Less', 'parts'], ["Auntie Jean's", 'people'],
  ['Pawn Shop', 'other'], ['Megastore', 'big'], ["Sparky's Auto Electrics", 'elec'], ['Tyre Place', 'other'], ["Dave's Garage", 'mech'], ['Phone Shop', 'other'], ['Tool Shop', 'tools'],
  ['Bits & Bobs Auto', 'parts'], ['Courier Depot', 'other'], ["Mum & Dad's", 'people'], ['Auto-Box Clinic', 'trans'], ['PC Shop', 'other'], ['Voltz Auto Electric', 'elec'], ['Bank', 'other'],
  ['Tool Hire', 'tools'], ['Spanner & Son', 'mech'], ['Main Dealer', 'mech'], ['Breakers Yard', 'yard'], ['DIY Warehouse', 'big'], ['Car Spares Direct', 'parts'], ["Mate Gaz's", 'people'],
  ['Petrol Station', 'other'], ['MOT Test Centre', 'other'], ['Machine Shop (lathe)', 'other'], ["Brother's", 'people'], ['Clutch & Co', 'trans'], ['Makerspace (3D printer)', 'other'], ['Café', 'other'],
  ['Home', 'home'], ["Neighbour Ken's", 'people'], ['Wired Up Auto Electric', 'elec'], ['Trusty Autos', 'mech'], ['Pattern Parts', 'parts'], ['Hardware Shop', 'tools'], ['Pound Shop', 'other']
];
const CAT = {
  parts: ['Parts shops', '#e08830'], mech: ['Mechanics', '#3c78c8'], elec: ['Auto electrics', '#f0c830'],
  trans: ['Auto transmission', '#9a5ac8'], tools: ['Tool shops', '#c84040'], big: ['Big box stores', '#a8aab0'], yard: ['Breakers yard', '#8a6a4a'],
  people: ['Family and friends', '#e070a8'], other: ['Everything else', '#40a090'], home: ['Home', '#f4f4f0']
};
const BLOCK = 100, STREET = 30;                          // each block: a 30-wide street, then a 70-wide lot
const placeIndex = name => PLACES.findIndex(p => p[0] === name);

SCREENS.city = {
  size: [640, 360],
  paint() {
    ISO.ox = S.cam.ox; ISO.oy = S.cam.oy;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) px(x, y, hash(x, y) < 0.1 ? C.grassDark : C.grass);
    ground(0, 0, 7 * BLOCK + STREET, 6 * BLOCK + STREET, C.road);
    for (let k = 0; k <= 7; k++) for (let t = 0; t < 6 * BLOCK + STREET; t += 20) line(...P(k * BLOCK + 15, t), ...P(k * BLOCK + 15, t + 10), C.white);
    for (let k = 0; k <= 6; k++) for (let t = 0; t < 7 * BLOCK + STREET; t += 20) line(...P(t, k * BLOCK + 15), ...P(t + 10, k * BLOCK + 15), C.white);
    const lots = [];
    for (let bj = 0; bj < 6; bj++) for (let bi = 0; bi < 7; bi++) lots.push({ bi, bj, place: PLACES[bj * 7 + bi] });
    lots.sort((a, b) => (a.bi + a.bj) - (b.bi + b.bj));
    for (const lot of lots) lot.top = building(lot);
    // your car (the only blue one), parked in the street outside the last place you went
    const here = Math.max(0, placeIndex(S.place || 'Home'));
    isoCarX((here % 7) * BLOCK + STREET + 22, Math.floor(here / 7) * BLOCK + STREET + 74, 0.5, C.car);
    for (const lot of lots) sign(lot);
    minimap();
    tip('Town', 'Point at a building to see what it is; tap to go there (20 minutes).<br>Drag the map to look round.', 1, 80);
    hud();
  },
  actions() { return [{ label: 'Go home', act: 'go:home' }]; }
};
function building(lot) {
  const x0 = lot.bi * BLOCK + STREET, y0 = lot.bj * BLOCK + STREET, x1 = x0 + 70, y1 = y0 + 70;
  const cat = lot.place[1], col = hex(CAT[cat][1]);
  ground(x0, y0, x1, y1, C.concrete);
  if (cat === 'yard') {                                    // breakers yard: wrecks, two stacked, a tyre pile
    const paint = [C.car, C.red, C.warm, C.steel2, C.tree2];
    for (let n = 0; n < 6; n++) {
      const cx = x0 + 6 + (n % 3) * 21, cy = y0 + 6 + Math.floor(n / 3) * 32;
      isoCar(cx, cy, 0.45, shade(paint[n % 5], 0.8), { broken: true });
      if (n === 1 || n === 3) isoCar(cx + 1, cy + 2, 0.45, shade(paint[(n + 2) % 5], 0.75), { broken: true, dz: 6 });
    }
    ibox(x0 + 60, y0 + 4, x0 + 66, y0 + 10, 0, 4, C.tyre); ibox(x0 + 60, y0 + 4, x0 + 66, y0 + 10, 4, 8, C.tyre);
    line(...P(x0, y1), ...P(x1, y1), C.wood); line(...P(x1, y0), ...P(x1, y1), C.wood);
    return 12;
  }
  if (cat === 'home' || cat === 'people') {                // a house on a lawn
    ground(x0 + 4, y0 + 4, x1 - 4, y1 - 4, C.grassLine);
    ibox(x0 + 14, y0 + 16, x1 - 14, y1 - 16, 0, 16, col);
    gableRoof(x0 + 12, y0 + 14, x1 - 12, y1 - 14, 16, 12, col, C.roof);
    onLeft(y1 - 16, x0 + 30, x0 + 37, 0, 11, C.door);
    winLeft(y1 - 16, x0 + 18, x0 + 25, 6, 12); winLeft(y1 - 16, x0 + 44, x0 + 51, 6, 12);
    return 30;
  }
  const big = cat === 'big', h = big ? 22 : 14 + Math.floor(hash(lot.bi, lot.bj) * 10);
  const a = big ? 4 : 10;
  ibox(x0 + a, y0 + a, x1 - a, y1 - a, 0, h, col, C.steel);
  onLeft(y1 - a, x0 + a, x1 - a, h - 10, h - 2, C.white);                                 // the sign board along the shop front
  frontSign(lot.place[0], x0 + a, y1 - a, x1 - x0 - 2 * a, h - 2, 8);
  onLeft(y1 - a, x0 + a + 6, x0 + 30, 3, h - 9, C.glass);
  onLeft(y1 - a, x0 + 38, x0 + 46, 0, h - 9, C.ink);
  for (let y = y0 + a + 8; y < y1 - a - 6; y += 12) winRight(x1 - a, y, y + 6, h - 12, h - 7);
  return h;
}
// The name over each building: tap it (or the building) to go there
function sign(lot) {
  const x0 = lot.bi * BLOCK + STREET, y0 = lot.bj * BLOCK + STREET;
  const [sx, sy] = P(x0 + 35, y0 + 35, lot.top + 8);
  if (sx < -60 || sx > W + 60 || sy < 20 || sy > H - 10) return;
  const name = lot.place[0], cat = lot.place[1], dark = cat === 'elec' || cat === 'home' || cat === 'big';
  const target = name === 'Home' ? 'home' : 'place:' + name;
  // the building itself: it lights up and shows its name when you point at it
  spot(esc(name), isoArea(x0 + 8, y0 + 8, x0 + 62, y0 + 62, 0, lot.top), target, null, `background:${CAT[cat][1]};color:${dark ? '#101018' : '#fff'};border-color:#101018`);
}
// The whole town from above: tap a square to look there; the mint dot is you
function minimap() {
  const x = W - 104, y = 44;
  rect(x - 4, y - 4, 7 * 13 + 7, 6 * 13 + 7, C.ink);
  for (let bj = 0; bj < 6; bj++) for (let bi = 0; bi < 7; bi++) {
    rect(x + bi * 13, y + bj * 13, 10, 10, hex(CAT[PLACES[bj * 7 + bi][1]][1]));
    LABELS.push(`<a class="go" data-act="cam:${bi},${bj}" style="left:${(x + bi * 13) / W * 100}%;top:${(y + bj * 13) / H * 100}%;width:${10 / W * 100}%;height:${10 / H * 100}%"></a>`);
  }
  const here = Math.max(0, placeIndex(S.place || 'Home'));
  rect(x + (here % 7) * 13 + 3, y + Math.floor(here / 7) * 13 + 3, 4, 4, C.ink);
  text('TOWN', x, y + 6 * 13 + 1, C.ui);
}

// =====================================================================
// A PLACE IN TOWN: inside the shop (or on the doorstep), talking at the counter
// =====================================================================
SCREENS.place = {
  size: [480, 270],
  paint() {
    const name = S.place, shut = closedReason(name), style = placeStyle(name);
    if (!S.inside) {                                               // outside: the shop front; go in through the door
      shopExterior(name, shut);
      spot(shut ? 'The door (' + esc(shut.split('.')[0]) + ')' : 'Go in', isoArea(148, 39, 176, 41, 0, 50), 'act:enter', [162, 50]);
      spot('Back in the car', isoArea(40, 72, 86, 96, 0, 20), 'city', [64, 62]);
      tip(name, shut ? esc(shut) : 'Open. Tap the door to go in.', 1, 8);
      return hud();
    }
    shopInterior(name, shut);
    ISO.ox = SHOP_VIEW[0]; ISO.oy = SHOP_VIEW[1];
    const person = (PLACE_INFO[name] || {}).person || (style === 'house' ? name.replace("'s", '') : 'the shopkeeper');
    if (!shut) {
      const [hx, hy] = keeperHead();
      spot('Talk to ' + esc(person), [hx - 12, hy - 2, 26, 44], 'act:talk', style === 'house' ? [80, 70] : [104, 80]);
    }
    if (style !== 'house') {
      spot('Look at the stock', isoArea(10, 0, 190, 12, 14, 62), 'act:browse', [184, 82]);
      spot('Read the posters', isoArea(0, 70, 1, 140, 30, 56), 'act:posters', [18, 112]);
    }
    spot('Leave', isoArea(80, 138, 130, 150, 0, 6), style === 'house' ? 'city' : 'act:leave', [105, 146]);
    tip(name, shut ? esc(shut) : 'Tap the ' + (style === 'house' ? 'door' : 'shopkeeper') + ' to talk. Walk round and look at things.', 1, 8);
    hud();
  },
  actions() {
    return [
      { label: 'Wait 30 minutes', act: 'wait' },
      { label: 'Back to the map', act: 'go:city' },
      { label: 'Go home', act: 'go:home' }
    ];
  }
};

// =====================================================================
// THE COMPUTER: real text, made-up sites
// =====================================================================
SCREENS.pc = {
  size: [480, 270],
  paint() {
    rect(0, 0, W, H, C.cream);
    for (let x = 0; x < W; x += 24) rect(x, 0, 1, 228, C.creamDark);
    rect(0, 228, W, 42, C.wood); rect(0, 228, W, 1, C.bench);
    rect(30, 9, 420, 210, C.greyDark); rect(33, 12, 414, 204, C.grey); rect(39, 18, 402, 192, C.ink);
    rect(222, 219, 36, 9, C.greyDark); rect(204, 226, 72, 3, C.greyDark);
    rect(450, 30, 21, 18, C.warm); text('PW?', 453, 36, C.bench);
    rect(105, 240, 180, 15, C.greyDark); for (let k = 0; k < 21; k++) rect(109 + k * 8, 243, 6, 3, C.grey), rect(109 + k * 8, 249, 6, 3, C.grey);
    rect(321, 237, 15, 18, C.white); rect(336, 241, 4, 7, C.white); rect(324, 239, 9, 1, C.bench);
  },
  overlay() {
    const apps = ['ViewTube', 'Forum', 'Mail', 'Pics', 'MegaMart', 'eBuy', 'TechDocs'];
    const dock = apps.map(a => `<button data-app="${a}" class="${a === S.app ? 'on' : ''}">${a}</button>`).join('');
    return `<div class="ov pc"><div class="dock">${dock}</div><div class="win">${appHTML(S.app)}</div></div>`;
  },
  actions() { return [{ label: 'Get up (back outside)', act: 'go:home' }]; }
};
// A product row with a Buy button
function product(id, extra) {
  const it = ITEMS[id], ordered = S.flags['ordered-' + id];
  return `<tr><td>${esc(it.name)}<br><span class="meta">${extra}</span></td><td>£${it.price.toFixed(2)}</td><td>${ordered ? 'Ordered' : `<button data-act="buy:${id}">Buy</button>`}</td></tr>`;
}
function appHTML(app) {
  if (app === 'ViewTube') return `<div class="bar">viewtube.example/watch?v=zaf1ra-excite</div><div class="body">
    <h2>2005 Zafira 1.6i EXCITE gearbox sensor replacement (EASY 10 MIN JOB)</h2><div class="meta">GarageGuy Gaz · 1.2M views · 9 years ago</div>
    <p>Right lads, first get the car on a ramp. After removing the dashboard, simply slide the sensor out. Refit in reverse order of removal.</p>
    <div class="post"><b>@ZafPlusOwner</b> mine is the PLUS, totally different connector</div><div class="post"><b>@tony_b</b> 13:42 he just skips the hard bit</div>
    <p><button data-act="watch">Watch it (15 min)</button></p></div>`;
  if (app === 'Forum') return `<div class="bar">SpannerTalk Forums › Vauxhall › Zafira A (1999–2005) › Gearbox</div><div class="body">
    <h2>${S.flags.codes ? 'P0705 red light on dash, auto box?? HELP' : 'Search the forum'}</h2>
    ${S.flags.codes ? `<div class="meta">Started by <b>zaf_dave</b> · 14 March 2009 · 3,412 views</div>
    <div class="post"><b>zaf_dave</b> · 14 Mar 2009<br>P0705, red light on dash. Garage says 3 months. Any ideas?</div>
    <div class="post"><b>MrTorque</b> · 15 Mar 2009<br>Its the selector sensor. Or the loom. Check ur fuses first tbh</div>
    <div class="post"><b>zaf_dave</b> · 2 Jun 2009<br>Fixed it.</div>
    <div class="post"><b>Lisa_K</b> · 11 Nov 2016<br>how?? same problem</div>
    <div class="post"><b>zaf_dave</b> · 12 Nov 2016<br>Solved, PM me<br><span class="red">[image no longer available]</span></div>
    <p><button data-act="readforum">Read it properly and note it down (30 min)</button></p>` :
    `<p>You type "red light dash". 41,000 results. Without the error codes you don't know what to search for.</p>`}</div>`;
  if (app === 'Mail') return `<div class="bar">Inbox</div><div class="body"><table>${S.mails.map(m => `<tr><td>${esc(m.from)}</td><td>${esc(m.subject)}</td><td>${m.when}</td></tr>`).join('') || '<tr><td>No mail. Not even spam.</td></tr>'}</table></div>`;
  if (app === 'Pics') return `<div class="bar">Pictures › Car</div><div class="body"><div class="grid">
    <div style="--p:#4a5a60">dash_light.jpg</div><div style="--p:#5a4a40">IMG_0042.jpg</div><div style="--p:#6a6050">part_number_blurry.jpg</div><div style="--p:#3a4448">thumb.jpg</div></div></div>`;
  if (app === 'MegaMart') return `<div class="bar">megamart.example — Everything, Delivered Eventually</div><div class="body"><table>
    ${product('reader-cheap', '★★★★☆ · *not all cars · arrives tomorrow')}
    ${findJob('new-sensor') ? product('part-mega', '"fits all models*" · *not all models · arrives tomorrow') : ''}
    <tr><td>Universal Car Sensor Fits All Models 2005 2006 2007 Zafira Astra Golf Tractor<br><span class="meta">Sponsored</span></td><td>£24.99</td><td class="red">Unavailable</td></tr></table></div>`;
  if (app === 'eBuy') return `<div class="bar">ebuy.example — Used, untested, spares or repair</div><div class="body"><table>
    ${product('reader-good', 'Used · "works fine (I think)" · arrives in 2 days')}
    <tr><td>ZAFIRA GEARBOX SENSOR WORKING WHEN REMOVED (I THINK)<br><span class="meta">Collection only, Aberdeen</span></td><td>£0.99</td><td class="red">Collection only</td></tr>
    <tr><td>Job lot of car sensors (approx 300) no idea what from<br><span class="meta">No returns</span></td><td>£45.00</td><td class="red">Too far</td></tr></table></div>`;
  return `<div class="bar">techdocs.example › TIS › Bulletins › SB-0471/09 Rev C (superseded by Rev B)</div><div class="body">
    <h2>SB-0471/09 Rev C — TCM DTC P0705/P0706 sporadic, MY 03–05, see note 4</h2>
    <p><b>1.</b> With KL15 ON and KL50 OFF, measure resistance between X12/3 (BK/WH) and X12/7 (BU/RD). Specified value: 4.7 kΩ ± 12% (see table 9, not included).</p>
    <p><b>2.</b> If value is within specification, continue at step 4. If not, continue at step 2.</p><p><b>3.</b> Step deleted.</p>
    <p class="red">Diagram 12 of 12 failed to load.</p><p><button data-act="readdocs">Try to make sense of it (20 min)</button></p></div>`;
}

// =====================================================================
// THE PHONE
// =====================================================================
SCREENS.phone = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, H, C.greyDark, 0.1, 71);
    rect(168, 9, 144, 255, C.greyDark); rect(171, 12, 138, 249, C.ink); rect(225, 17, 30, 3, C.grey);
  },
  overlay() {
    const msgs = S.msgs.map(m => `<div class="m"><em>${esc(m.when.split('   ')[0])}</em><b>${esc(m.from)}</b>${esc(m.body)}</div>`).join('') || '<div class="m">No messages.</div>';
    return `<div class="ov ph"><div class="msgs">${msgs}</div>
      <div class="tabs"><div data-act="ring:Gaz">Ring Gaz</div><div data-act="ring:Mum">Ring Mum</div><div data-act="ring:Brother">Ring Brother</div></div></div>`;
  },
  actions() { return []; }
};

// =====================================================================
// THE NOTEBOOK: jobs as a tree, with notes and leads
// =====================================================================
SCREENS.notebook = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, H, C.wood, 0.15, 61);
    rbox(40, 6, 400, 258, 4, hex('#c8bc98'));
    rect(44, 10, 190, 250, hex('#f2ecd8')); rect(246, 10, 190, 250, hex('#f2ecd8'));
    for (let y = 24; y < 258; y += 10) { rect(46, y, 186, 1, hex('#c8d4e0')); rect(248, y, 186, 1, hex('#c8d4e0')); }
    rect(70, 10, 1, 250, hex('#e0a0a0')); rect(272, 10, 1, 250, hex('#e0a0a0'));
    rect(236, 6, 8, 258, hex('#a89870'));
  },
  overlay() {
    // a job, its notes and leads, then the jobs beneath it
    const block = (j, depth) => {
      const kids = S.jobs.filter(k => k.parent === j.id);
      const open = j.leads.filter(l => l.status === 'open');
      let h = `<div class="job ${j.status}" style="margin-left:${depth * 0.8}em"><h3>${j.status === 'done' ? '✔ ' : ''}${esc(j.title)}</h3>`;
      if (j.status === 'open') {
        for (const n of j.notes) h += `<div class="${n.kind}">${n.kind === 'ok' ? '✔' : n.kind === 'x' ? '✘' : '·'} ${esc(n.text)}</div>`;
        for (const l of open) h += `<div class="lead" data-go="${esc(l.go)}">→ ${esc(l.text)} <i>(${esc(l.who)} · ${esc(l.sure)})</i></div>`;
        if (!open.length && !kids.some(k => k.status === 'open')) h += `<div class="none">No leads. Sit in the car and think? Ring someone? Wait for something to turn up?</div>`;
      }
      h += '</div>';
      for (const k of kids) h += block(k, depth + 1);
      return h;
    };
    const roots = S.jobs.filter(j => !j.parent);
    const html = roots.map(r => block(r, 0)).join('');
    return `<div class="ov nb"><div class="cols">${html}</div></div>`;
  },
  actions() { return []; }
};

// =====================================================================
// THE GARAGE
// =====================================================================
SCREENS.garage = {
  size: [480, 270],
  paint() {
    ISO.ox = 230; ISO.oy = 106;
    rect(0, 0, W, H, C.greyDark);
    poly([P(0, 0, 0), P(0, 140, 0), P(0, 140, 84), P(0, 0, 84)], shade(C.concrete, 0.88));
    poly([P(0, 0, 0), P(180, 0, 0), P(180, 0, 84), P(0, 0, 84)], C.concrete);
    for (let z = 7; z < 84; z += 7) { line(...P(0, 0, z), ...P(0, 140, z), C.concreteDark); line(...P(0, 0, z), ...P(180, 0, z), C.concreteDark); }
    ground(0, 0, 180, 140, C.floor);
    ground(30, 100, 50, 112, shade(C.floor, 0.85));
    onLeft(0, 30, 90, 74, 77, C.light);
    onLeft(0, 100, 172, 36, 70, C.peg);
    for (let x = 104; x < 170; x += 5) for (let z = 40; z < 68; z += 5) { const p = P(x, 0, z); px(p[0], p[1], C.pegHole); }
    for (const [x, len] of [[106, 20], [112, 16], [118, 22], [124, 14]]) line(...P(x, 0, 64), ...P(x, 0, 64 - len), C.tool);
    onLeft(0, 132, 148, 56, 60, C.tool); onLeft(0, 138, 141, 44, 56, C.tool);
    for (const z of [24, 50]) ibox(0, 18, 14, 96, z - 2, z, C.wood);
    const spines = [C.red, C.car, C.warm, C.tree2, C.red, C.white, C.car, C.warm, C.redDim, C.tree1, C.car, C.red, C.warm, C.white];
    for (let k = 0; k < 14; k++) ibox(0, 20 + k * 5, 10, 24 + k * 5, 50, 60 + Math.floor(hash(k, 3) * 5), spines[k]);
    ibox(0, 20, 12, 38, 24, 36, CARDBOARD); ibox(0, 42, 12, 58, 24, 33, CARDBOARD); ibox(0, 62, 12, 92, 24, 38, CARDBOARD);
    ibox(60, 0, 86, 18, 0, 40, C.red); ibox(60, 0, 86, 18, 40, 50, C.red);
    for (const z of [8, 16, 24, 32, 44]) onLeft(18, 62, 84, z, z + 1, C.redDim);
    ibox(98, 0, 176, 26, 0, 28, C.bench, C.benchTop);
    ibox(102, 4, 112, 14, 28, 36, C.tool);
    ibox(124, 4, 140, 16, 28, 29, C.grey); onLeft(4, 124, 140, 29, 40, C.grey); onLeft(4, 125, 139, 30, 39, C.winGlass);
    ibox(150, 4, 172, 16, 28, 38, C.red); line(...P(156, 10, 41), ...P(166, 10, 41), C.ink);
    if (S.flags.screwsSpilt && !S.flags.n3found) for (let n = 0; n < 60; n++) { const p = P(100 + hash(n, 9) * 70, 30 + hash(9, n) * 30); px(p[0], p[1], C.steel); }
    ibox(0, 104, 18, 122, 0, 12, CARDBOARD); ibox(2, 106, 16, 120, 12, 22, CARDBOARD); ibox(0, 124, 16, 138, 0, 10, CARDBOARD);
    isoCar(40, 46, 1.25);
    ibox(82, 60, 92, 86, 1, 3, C.red);
    standingMan('garage');
    spot('Toolbox', isoArea(60, 0, 86, 18, 0, 50), 'toolbox', [73, 26]);
    spot('Workbench', isoArea(98, 0, 176, 26, 0, 40), 'bench', [132, 34]);
    spot('Manuals', isoArea(0, 18, 14, 96, 50, 66), 'act:look:Manuals', [22, 56]);
    spot('Parts boxes', isoArea(0, 104, 18, 138, 0, 22), 'act:look:Parts boxes', [26, 118]);
    spot('Driver\'s seat', isoArea(40, 58, 70, 88, 16, 28), 'dash', [78, 70]);
    spot('Bonnet', isoArea(40, 90, 70, 104, 4, 20), 'bonnet', [56, 112]);
    spot('Under the car (creeper)', isoArea(80, 58, 94, 88, 0, 4), 'under', [96, 80]);
    spot('Out', isoArea(130, 126, 178, 140, 0, 2), 'home', [150, 132]);
    hud();
  },
  actions() {
    return [
      { label: 'Under the car', act: 'go:under' }, { label: 'Under the bonnet', act: 'go:bonnet' },
      { label: 'Driver\'s seat', act: 'go:dash' }, { label: 'Workbench', act: 'go:bench' },
      { label: 'Toolbox', act: 'go:toolbox' }, { label: 'Look under the workbench', act: 'under-bench' }, { label: 'Out', act: 'go:home' }
    ];
  }
};

// =====================================================================
// UNDER THE CAR, and the gearbox close up
// =====================================================================
SCREENS.under = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, H, hex('#d6d9d4'), 0.06, 5);
    for (const y of [30, 250]) rect(0, y, W, 4, C.light);
    for (const [x0, y0, x1, y1] of [[0, 8, 70, 44], [0, 262, 70, 236], [480, 8, 410, 44], [480, 262, 410, 236]]) { pipe(x0, y0, x1, y1, 8, hex('#5a5c60')); disc(x1, y1, 5, C.red); disc(x1, y1, 2, C.greyDark); }
    for (const wx of [56, 352]) for (const wy of [34, 228]) rect(wx - 6, wy, 76, 24, hex('#1e1c1a'));
    rbox(24, 36, 432, 214, 18, C.car); rbox(28, 40, 424, 206, 16, UNDERSIDE); grime(36, 46, 408, 194, UNDERSIDE, 0.22, 9);
    for (const wx of [56, 352]) for (const wy of [38, 226]) grime(wx - 4, wy, 72, 22, hex('#26231f'), 0.2, wx + wy);
    for (const y of [44, 238]) { rect(120, y, 220, 4, shade(UNDERSIDE, 1.25)); for (let x = 122; x < 340; x += 5) px(x, y + 2, C.greyDark); }
    for (const y of [72, 80, 200, 208]) { rect(214, y, 112, 1, shade(UNDERSIDE, 1.3)); rect(214, y + 1, 112, 1, shade(UNDERSIDE, 0.7)); }
    for (let n = 0; n < 160; n++) { const x = 40 + hash(n, 1) * 400, y = 50 + hash(1, n) * 186; if (hash(n, n) < 0.6) px(x, y, C.rust); }
    for (const wx of [58, 354]) for (const wy of [22, 232]) { rbox(wx, wy, 60, 18, 6, C.tyre); for (let x = wx + 3; x < wx + 57; x += 4) rect(x, wy + 3, 2, 12, hex('#34343a')); rect(wx + 4, wy === 22 ? wy + 18 : wy - 4, 52, 4, hex('#8a8c90')); }
    grime(150, 118, 250, 44, hex('#2e2b28'), 0.2, 3); grime(232, 120, 96, 40, hex('#b8b4a8'), 0.25, 4);
    for (let y = 122; y < 158; y += 3) for (let x = 234; x < 326; x += 3) px(x + (y % 2), y, hex('#8e8a80'));
    for (const [y, h] of [[58, 58], [164, 58]]) { rbox(128, y, 74, h, 6, BLACKPART); for (let x = 134; x < 198; x += 8) rect(x, y + 4, 1, h - 8, shade(BLACKPART, 1.4)); }
    for (const x of [144, 184]) rect(x, 56, 4, 168, C.steel2);
    pipe(118, 50, 118, 236, 9, BLACKPART);
    for (const wy of [62, 224]) { pipe(118, wy, 86, wy, 6, BLACKPART); for (let r = 9; r > 2; r -= 2) ring(100, wy === 62 ? 76 : 210, r, r % 4 === 1 ? C.red : C.redDim); }
    for (const [y, col] of [[222, hex('#c0a070')], [225, hex('#b0b4b0')], [228, hex('#c0a070')]]) line(126, y, 340, y, col);
    for (let x = 140; x < 340; x += 28) rect(x, 220, 3, 10, C.white);
    pipe(392, 141, 104, 141, 6, RUSTPIPE);
    for (let x = 376; x < 392; x += 2) for (let y = 138; y < 145; y += 2) px(x + (y % 4 ? 1 : 0), y, C.steel);
    rbox(334, 128, 38, 26, 8, hex('#8a8478')); rect(340, 130, 26, 1, C.steel);
    rbox(238, 128, 56, 26, 12, hex('#7d7468')); rect(240, 140, 52, 1, shade(RUSTPIPE, 0.6));
    rbox(38, 100, 66, 54, 22, hex('#7d7468')); rect(44, 112, 54, 1, C.steel); rect(42, 126, 60, 1, shade(RUSTPIPE, 0.6));
    pipe(42, 140, 14, 140, 7, RUSTPIPE); disc(14, 140, 3, C.ink);
    for (const x of [130, 214, 316]) rect(x, 134, 4, 14, C.ink);
    for (const x of [340, 432]) grime(x, 54, 8, 178, BLACKPART, 0.3, x);
    pipe(344, 64, 384, 46, 7, BLACKPART); pipe(344, 222, 384, 240, 7, BLACKPART);
    pipe(372, 98, 382, 46, 5, C.steel2); pipe(372, 120, 382, 238, 5, C.steel2);
    for (const [x, y] of [[379, 58], [376, 108], [377, 130], [380, 226]]) { rbox(x - 6, y - 5, 12, 10, 4, C.ink); for (let k = -4; k < 5; k += 2) rect(x + k, y - 4, 1, 8, C.greyDark); }
    grime(326, 58, 56, 64, ALLOY, 0.2, 12); for (let x = 330; x < 380; x += 6) rect(x, 60, 1, 60, shade(ALLOY, 0.75));
    grime(386, 70, 44, 64, hex('#b4b6b0'), 0.15, 13); for (let y = 74; y < 132; y += 5) rect(388, y, 40, 1, shade(ALLOY, 0.8));
    bolt(408, 120, 4); for (const [x, y] of [[330, 62], [378, 62], [330, 118], [378, 118]]) bolt(x, y, 2);
    if (!S.flags.sensorOut || S.flags.fitted) { disc(352, 98, 5, S.flags.fitted ? C.car : C.ink); px(351, 96, C.white); }
    line(357, 98, 368, 92, C.red); line(357, 99, 368, 94, C.warm);
    rect(436, 60, 12, 166, hex('#202020'));
    zoomZones([['Rear suspension', 62, 54, 66, 54, false, 'act:look:Rear suspension'], ['Fuel tank', 126, 166, 78, 58, false, 'act:look:Fuel tank'], ['Exhaust', 234, 118, 96, 44, false, 'act:look:Exhaust'], ['Brake lines', 206, 216, 120, 18, false, 'act:look:Brake lines'], ['Gearbox', 324, 56, 60, 68, true, 'underZoom'], ['Engine', 386, 68, 46, 68, false, 'act:look:Engine']]);
    tip('Under the car', 'Point at things to see what they are; tap to look closer.', 1, 82);
    hud();
  },
  actions() { return [{ label: 'Zoom in: gearbox', act: 'go:underZoom' }, { label: 'Get out from under', act: 'go:garage' }]; }
};

SCREENS.underZoom = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, H, UNDERSIDE, 0.25, 21);
    for (let n = 0; n < 300; n++) px(hash(n, 7) * W, hash(7, n) * H, C.rust);
    poly([[40, 40], [400, 30], [450, 90], [440, 250], [60, 262], [20, 160]], ALLOY);
    for (let y = 30; y < 262; y++) for (let x = 20; x < 450; x++) {
      const i = (y * W + x) * 4;
      if (img.data[i] === ALLOY[0] && img.data[i + 1] === ALLOY[1] && img.data[i + 2] === ALLOY[2]) px(x, y, shade(ALLOY, 1 + (hash(x, y) - 0.5) * 0.16));
    }
    for (let k = 0; k < 7; k++) { const x = 70 + k * 46; line(x, 50, x + 30, 240, shade(ALLOY, 1.25)); line(x + 2, 50, x + 32, 240, shade(ALLOY, 0.7)); }
    for (const [x, y] of [[52, 52], [140, 44], [230, 40], [320, 36], [410, 60], [436, 140], [424, 228], [300, 250], [180, 254], [80, 246], [36, 150]]) bolt(x, y, 7);
    for (let n = 0; n < 400; n++) px(230 + hash(n, 3) * 60 - 30, 160 + hash(3, n) * 80, shade(ALLOY, 0.45));
    rbox(176, 104, 140, 72, 18, shade(ALLOY, 0.8));
    const f = S.flags;
    if (!f.sensorOut || f.fitted) { disc(246, 140, 30, f.fitted ? C.car : BLACKPART); ring(246, 140, 30, C.greyDark); ring(246, 140, 22, shade(BLACKPART, 1.6)); disc(240, 134, 6, shade(BLACKPART, 1.5)); }
    else { disc(246, 140, 22, C.ink); ring(246, 140, 22, C.greyDark); }                  // the empty hole
    const hole = (x, y) => { disc(x, y, 7, C.ink); ring(x, y, 7, C.greyDark); ring(x, y, 4, shade(C.greyDark, 1.3)); };
    if (!f.b1 || f.fitted) bolt(194, 120, 8); else hole(194, 120);
    if (f.fitted || !f.b2) bolt(298, 164, 8, f.b2round && !f.fitted); else hole(298, 164);
    if (f.fitted || !f.n3lost) bolt(194, 162, 7); else hole(194, 162);
    if (!f.sensorOut || f.fitted) { rbox(276, 128, 52, 24, 4, hex('#30302c')); rect(282, 124, 20, 6, C.warm); rect(286, 122, 12, 2, C.warm); }
    for (const [k, col] of [[0, C.red], [1, C.warm], [2, hex('#40a060')]]) pipe(328, 134 + k * 6, 470, 112 + k * 6, 4, col);
    for (const x of [360, 400, 440]) pipe(x, 122 + (440 - x) * 0.05, x + 8, 120 + (440 - x) * 0.05, 22, hex('#1c1c1c'));
    for (let y = 18; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - 250, (y - 140) * 1.2), k = d < 110 ? 1.12 : Math.max(0.45, 1.12 - (d - 110) / 220);
      const i = (y * W + x) * 4; img.data[i] *= k; img.data[i + 1] *= k; img.data[i + 2] *= k;
    }
    tip('Under the car › Gearbox', S.flags.sensorJob ? 'The sensor: 2 bolts and a nut.' : 'The gearbox. Lots of bolts. Which bit matters?', 1, 8);
    hud();
  },
  actions() {
    const f = S.flags, a = [];
    if (f.sensorJob && !f.sensorOut) {
      if (!f.b1) a.push({ label: 'Undo bolt 1', act: 'bolt1' });
      if (!f.b2) a.push({ label: f.b2round ? 'Try bolt 2 again' : 'Undo bolt 2', act: 'bolt2' });
      if (f.b2round && !f.b2 && (S.inv['extractor-cheap'] || S.inv['extractor-good'])) a.push({ label: 'Use the extractor on bolt 2', act: 'extract' });
      if (!f.n3lost) a.push({ label: 'Undo nut 3', act: 'nut3' });
      a.push({ label: 'Pull the sensor out', act: 'pull' });
    }
    if (f.sensorOut && !f.fitted) a.push({ label: 'Fit the new sensor', act: 'fit' });
    if (leadOpen('loom')) a.push({ label: 'Check the wiring', act: 'wiring' });
    a.push({ label: 'Zoom out', act: 'go:under' });
    return a;
  }
};

// =====================================================================
// UNDER THE BONNET, and the fuse box close up
// =====================================================================
SCREENS.bonnet = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, H, C.floor, 0.12, 31);
    rbox(40, 20, 400, 34, 6, C.car); grime(52, 24, 376, 26, hex('#5a5a5a'), 0.3, 32);
    for (let x = 60; x < 420; x += 12) rect(x, 26, 6, 22, hex('#4c4c4c'));
    pipe(420, 50, 380, 26, 2, C.steel);
    rbox(18, 50, 444, 214, 10, C.car); grime(48, 56, 384, 190, hex('#26241f'), 0.25, 33);
    rect(48, 56, 384, 6, hex('#1a1a1a'));
    rect(80, 226, 320, 16, hex('#3a3c40')); for (let x = 82; x < 398; x += 3) rect(x, 228, 1, 12, hex('#55585c'));
    rbox(18, 244, 444, 20, 6, C.car); rect(200, 250, 80, 6, C.ink); disc(240, 253, 4, C.steel);
    rbox(62, 70, 98, 80, 8, C.ink); grime(66, 74, 90, 72, hex('#2a2a2a'), 0.2, 34);
    for (const [x, y] of [[62, 90], [62, 130], [158, 90], [158, 130]]) rect(x - 2, y, 5, 8, C.steel2);
    pipe(158, 110, 176, 112, 16, hex('#1e1e1e')); for (let x = 160; x < 176; x += 3) rect(x, 102, 1, 18, hex('#3a3a3a'));
    rbox(172, 76, 150, 120, 14, hex('#3c3e44')); for (let y = 90; y < 186; y += 8) rect(186, y, 122, 2, hex('#4a4d54'));
    rbox(214, 118, 66, 22, 6, C.steel2); text('1.6 16V', 222, 126, C.ink);
    disc(300, 96, 9, C.warm); ring(300, 96, 9, C.warmDim); rect(296, 95, 9, 2, C.warmDim);
    rect(196, 186, 2, 22, C.warm); ring(197, 212, 5, C.warm);
    rbox(330, 66, 32, 26, 4, hex('#d8d4b0')); disc(346, 66, 6, C.warm); rect(332, 82, 28, 8, hex('#c8a858'));
    rbox(354, 98, 64, 46, 4, hex('#1c1c1c')); rect(358, 96, 12, 8, C.red); rect(400, 96, 12, 8, C.ink); text('+', 362, 98, C.white); text('-', 404, 98, C.white);
    rbox(352, 152, 68, 56, 4, hex('#202020'));
    for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { const fc = FUSECOLS[(r * 6 + k * 5) % 5][0]; rect(358 + k * 10, 158 + r * 12, 7, 9, fc); rect(360 + k * 10, 160 + r * 12, 3, 2, shade(fc, 0.7)); }
    rbox(64, 166, 56, 50, 10, hex('#e4e0d4')); rect(68, 190, 48, 22, hex('#e080a0')); disc(92, 166, 8, C.warm); text('MAX', 70, 186, C.ink);
    disc(420, 222, 7, C.car); ring(420, 222, 7, C.carDark);
    for (const [x0, y0, x1, y1] of [[160, 160, 340, 170], [330, 170, 352, 180], [322, 120, 354, 120]]) pipe(x0, y0, x1, y1, 4, C.ink);
    for (let x = 180; x < 330; x += 22) rect(x, 158, 3, 10, hex('#3a3a3a'));
    zoomZones([['Fuse box', 348, 148, 76, 64, true, 'fuseZoom'], ['Battery', 350, 94, 72, 52, false, 'act:look:Battery'], ['Engine', 170, 74, 154, 124, false, 'act:look:Engine'], ['Air filter', 58, 66, 106, 88, false, 'act:look:Air filter'], ['Coolant', 60, 160, 64, 60, false, 'act:look:Coolant'], ['Brake fluid', 326, 58, 40, 36, false, 'act:look:Brake fluid']]);
    hud();
  },
  actions() { return [{ label: 'Zoom in: fuse box', act: 'go:fuseZoom' }, { label: 'Close the bonnet', act: 'go:garage' }]; }
};

SCREENS.fuseZoom = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, H, hex('#26241f'), 0.25, 41);
    rbox(30, 34, 270, 222, 10, hex('#1c1c1c')); rbox(38, 42, 254, 206, 6, hex('#141414'));
    for (let r = 0; r < 5; r++) for (let k = 0; k < 6; k++) {
      const n = r * 6 + k + 1, x = 50 + k * 40, y = 54 + r * 38, [col] = FUSECOLS[(r * 6 + k * 5) % 5];
      rect(x - 2, y - 2, 30, 30, hex('#0c0c0c'));
      if (n === 27 || n === 28) { text('F' + n, x + 4, y + 30, C.dim); continue; }
      rbox(x, y, 26, 18, 3, col); rect(x + 3, y + 3, 20, 3, shade(col, 1.25));
      rect(x + 4, y + 18, 4, 8, C.steel); rect(x + 18, y + 18, 4, 8, C.steel);
      rect(x + 6, y + 8, 14, 2, shade(col, 0.6));
      text('F' + n, x + 4, y + 30, C.dim);
    }
    rbox(316, 34, 140, 222, 8, hex('#1c1c1c')); rect(326, 46, 120, 196, hex('#d8d4c4'));
    for (let n = 0; n < 2000; n++) px(326 + hash(n, 5) * 120, 46 + hash(5, n) * 196, hex('#b8b4a4'));
    const fuses = [['F21', 'Radio'], ['F22', '▒▒▒ ▒▒'], ['F23', 'Instr. (see note 7)'], ['F24', '—'], ['F25', 'Spare?'], ['F26', 'ABS / ESP / ???'], ['F27', 'Spare'], ['F28', 'Spare'], ['F29', 'Not used*'], ['F30', '*see F29']];
    LABELS.push(`<div class="lid" style="left:${330 / W * 100}%;top:${52 / H * 100}%;width:${112 / W * 100}%">${fuses.map(([fn, t]) => `<div><b>${fn}</b> ${esc(t)}</div>`).join('')}<div class="note">Note 7: see owner's manual</div></div>`);
    hud();
  },
  actions() { return [{ label: 'Check every fuse', act: 'fuses' }, { label: 'Zoom out', act: 'go:bonnet' }]; }
};

// =====================================================================
// THE DASHBOARD: the driver's seat
// =====================================================================
SCREENS.dash = {
  size: [480, 270],
  paint() {
    grime(0, 18, W, 90, C.concrete, 0.1, 51); for (let y = 24; y < 108; y += 7) rect(0, y, W, 1, C.concreteDark);
    rect(0, 18, 14, 100, hex('#2a2c30')); rect(466, 18, 14, 100, hex('#2a2c30'));
    for (let x = 0; x < W; x++) { const top = 100 + Math.round(10 * Math.cos((x - 240) / 160)); rect(x, top, 1, H - top, hex('#2c2e33')); }
    grime(0, 112, W, 158, hex('#2c2e33'), 0.12, 52);
    rbox(104, 108, 210, 92, 20, hex('#18191c'));
    for (const cx of [154, 264]) {
      disc(cx, 152, 36, hex('#0e0f11')); ring(cx, 152, 36, C.steel2);
      for (let a = 2.4; a < 7.1; a += 0.39) line(cx + Math.cos(a) * 30, 152 + Math.sin(a) * 30, cx + Math.cos(a) * 34, 152 + Math.sin(a) * 34, S.key >= 1 ? C.ui : C.dim);
      line(cx, 152, cx + Math.cos(2.5) * 26, 152 + Math.sin(2.5) * 26, C.red); disc(cx, 152, 3, C.steel2);
    }
    text('MPH', 148, 168, C.dim); text('RPM', 258, 168, C.dim);
    const on = S.key >= 2;
    const check = on && !S.flags.running;                            // key at II: every bulb lights to show it works; running: they go out
    warnLight(209, 126, 'gear', C.red, on && !S.flags.fitted);       // …except the red one
    warnLight(209, 146, 'engine', C.warm, check);
    warnLight(196, 166, 'battery', C.red, check); warnLight(222, 166, 'oil', C.red, check);
    warnLight(209, 184, 'abs', C.warm, on && !!S.flags.fitted);
    for (let r = 64; r < 74; r++) ring(209, 262, r, r < 66 || r > 71 ? hex('#121214') : hex('#1c1d20'));
    pipe(150, 252, 268, 252, 10, hex('#1c1d20')); rbox(186, 232, 46, 30, 8, hex('#1c1d20')); disc(209, 246, 6, C.steel2);
    // the key turned to its position
    disc(330, 200, 10, C.steel2); disc(330, 200, 6, hex('#18191c')); ring(330, 200, 13, C.dim);
    const ang = [-1.57, -0.9, -0.3, 0.2][S.key];
    pipe(330, 200, 330 + Math.cos(ang + 1.57) * 22, 200 + Math.sin(ang + 1.57) * 22, 3, C.steel);
    text('0 I II III', 312, 182, C.dim);
    rbox(372, 116, 96, 60, 6, hex('#18191c')); rect(380, 124, 80, 22, hex('#0a2a20'));
    for (const x of [384, 412, 440]) disc(x + 6, 160, 6, C.steel2);
    rbox(404, 184, 34, 22, 4, hex('#18191c')); poly([[421, 188], [430, 202], [412, 202]], C.red); poly([[421, 193], [426, 200], [416, 200]], hex('#18191c'));
    for (const x of [390, 420, 450]) { disc(x, 232, 11, hex('#18191c')); ring(x, 232, 11, C.steel2); line(x, 232, x + 5, 224, C.white); }
    if (S.flags.readerIn) {
      rbox(18, 150, 78, 110, 8, hex('#d0a020')); rect(26, 160, 62, 44, hex('#0a2a20'));
      for (const [x, y] of [[30, 214], [56, 214], [30, 232], [56, 232]]) rbox(x, y, 22, 12, 3, hex('#3a3a3a'));
      pipe(96, 230, 120, 262, 4, C.ink);
      LABELS.push(`<div class="scr" style="left:${27 / W * 100}%;top:${161 / H * 100}%;width:${60 / W * 100}%;height:${42 / H * 100}%">${S.key >= 2 ? '2 codes found<br><b>P0705</b> Trans. range sensor circ. malf.<br><b>P0706</b> Range/perf.' : 'NO POWER'}</div>`);
    }
    if (S.key >= 1) LABELS.push(`<div class="scr blink" style="left:${381 / W * 100}%;top:${125 / H * 100}%;width:${78 / W * 100}%;height:${20 / H * 100}%;text-align:center">CODE - - - -</div>`);
    spot(S.flags.running ? 'Turn the key: switch off' : ['Turn the key to I', 'Turn the key to II', 'Turn the key: start it'][S.key] || 'Key', [314, 184, 36, 32], 'act:turnkey');
    tip("Driver's seat", S.flags.running ? 'Engine running.' : ['Key at 0: off. Tap the key to turn it.', 'Key at I: radio on.', 'Key at II: dash lights on. Tap again to start.', ''][S.key], 1, 8);
    hud();
  },
  actions() {
    const a = [
      { label: 'Key: off', act: 'key:0' }, { label: 'Key: I', act: 'key:1' }, { label: 'Key: II', act: 'key:2' }, { label: 'Start it', act: 'key:3' }
    ];
    if (S.inv['reader-good']) a.push({ label: 'Plug in your code reader', act: 'plug:good' });
    if (S.inv['reader-old']) a.push({ label: "Plug in Gaz's reader", act: 'plug:old' });
    if (S.flags.running) a.push({ label: 'Rev the engine', act: 'rev' });
    if (S.flags.codes) a.push({ label: 'Clear the codes', act: 'clear' });
    a.push({ label: 'Sit and think (1 hour)', act: 'think' });
    a.push({ label: 'Get out', act: 'go:garage' });
    return a;
  }
};

// =====================================================================
// THE WORKBENCH: try the new part in the hole
// =====================================================================
SCREENS.bench = {
  size: [480, 270],
  paint() {
    ISO.ox = 240; ISO.oy = 64;
    rect(0, 0, W, H, C.greyDark);
    poly([P(0, 0, 0), P(0, 170, 0), P(0, 170, 90), P(0, 0, 90)], shade(C.peg, 0.88));
    poly([P(0, 0, 0), P(230, 0, 0), P(230, 0, 90), P(0, 0, 90)], C.peg);
    for (let a = 6; a < 230; a += 8) for (let z = 6; z < 90; z += 8) { const p = P(a, 0, z); px(p[0], p[1], C.pegHole); if (a < 170) { const q = P(0, a, z); px(q[0], q[1], C.pegHole); } }
    ibox(0, 0, 230, 170, -30, 0, C.bench, C.benchTop);
    for (let x = 30; x < 230; x += 40) line(...P(x, 0), ...P(x, 170), C.wood);
    // the bracket the old sensor came out of, with its round hole
    ibox(60, 60, 140, 130, 0, 40, C.steel2, C.steel);
    const h = P(100, 95, 40);
    ellipse(h[0], h[1], 20, 10, C.greyDark); ellipse(h[0], h[1] + 2, 17, 7, C.ink);
    rect(h[0] - 23, h[1] - 1, 5, 3, C.ink); rect(h[0] + 19, h[1] - 1, 5, 3, C.ink);
    // the part being tried: held over the hole, stuck halfway, or in
    const b = S.bench;
    const moving = ANIM && ANIM.kind.startsWith('bench');           // while a moment moves the part, it draws it
    if (b && !moving) benchPart(b, LIFT[b.state], 0);
    ISO.ox = 240; ISO.oy = 64;
    if (S.inv['old-sensor']) { ibox(170, 30, 210, 44, 0, 12, C.greyDark); text('OLD', ...P(196, 40, 22), C.ink); }
    tip('Workbench', b ? ({ over: 'Held over the hole.', stuck: 'Stuck halfway.', in: 'It\'s in!' })[b.state] + (b.rotated ? ' Pins lined up.' : '') : 'Pick a part to try.', 1, 8);
    hud();
  },
  actions() {
    const a = [];
    if (S.inv['part-p4l']) a.push({ label: 'Try the Parts 4 Less sensor', act: 'pick:part-p4l' });
    if (S.inv['part-mega']) a.push({ label: 'Try the MegaMart sensor', act: 'pick:part-mega' });
    if (S.bench && S.bench.state !== 'in') a.push({ label: 'Push', act: 'push' }, { label: 'Pull', act: 'pullpart' }, { label: 'Rotate', act: 'rotate' }, { label: 'Flip it over', act: 'flip' });
    a.push({ label: 'Back to the garage', act: 'go:garage' });
    return a;
  }
};

// =====================================================================
// THE TOOLBOX: a tall red chest; each drawer pulls out to show what's in it
// =====================================================================
const DRAWERS = ['Sockets', 'Spanners', 'Screwdrivers', 'Pliers and odds', 'Electrical', 'Big stuff'];
const DRAWER_NOTES = [
  'Every size from 8 to 19 mm… except the 10. There is a 10-shaped gap.',
  'Dozens of spanners in a heap. The one you want is always at the bottom.',
  'Flat, cross, Torx, a Torx with a hole in it, and one that has been used as a chisel.',
  'Pliers, cable ties, tape, a sweet wrapper from 1996 and a key to nothing.',
  'A multimeter, a crimping tool, loose fuses and a test lamp.',
  'Hammer, breaker bar, a bent wheel brace and the jack handle.'
];
SCREENS.toolbox = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, H, C.concrete, 0.08, 81);
    for (let y = 6; y < 230; y += 9) rect(0, y, W, 1, C.concreteDark);
    rect(0, 230, W, 40, C.floor); rect(0, 230, W, 1, C.steel2);
    // the chest: top box with a lid, then six drawers, on wheels
    const x0 = 140, x1 = 340, top = 26;
    rbox(x0 - 4, top, x1 - x0 + 8, 30, 4, C.red); rect(x0, top + 22, x1 - x0, 3, C.redDim); rect(220, top + 8, 40, 4, C.steel);
    rect(x0 - 4, top + 30, x1 - x0 + 8, 176, shade(C.red, 0.85));
    const slot = k => top + 34 + k * 28;
    for (let k = 0; k < 6; k++) {
      rect(x0, slot(k), x1 - x0, 25, C.red); rect(x0, slot(k), x1 - x0, 2, shade(C.red, 1.2)); rect(x0, slot(k) + 23, x1 - x0, 2, C.redDim);
      rect(x0 + 60, slot(k) + 9, 80, 4, C.steel); rect(x0 + 60, slot(k) + 12, 80, 1, C.steel2);
      text(String(k + 1), x0 + 8, slot(k) + 9, C.redDim);
    }
    for (const wx of [x0 + 6, x1 - 18]) { disc(wx + 6, 236, 6, C.tyre); disc(wx + 6, 236, 2, C.steel); }
    // the open drawer: pulled out towards you, seen from above, over the drawers below it
    const d = S.drawer;
    if (d) {
      const y = slot(d - 1) + 6;
      poly([[x0 - 6, y], [x1 + 6, y], [x1 + 40, y + 96], [x0 - 40, y + 96]], shade(C.red, 0.7));
      poly([[x0, y + 4], [x1, y + 4], [x1 + 32, y + 88], [x0 - 32, y + 88]], hex('#3a3c42'));
      rect(x0 - 40, y + 96, x1 - x0 + 80, 18, C.red); rect(x0 + 40, y + 102, x1 - x0 - 80, 4, C.steel);
      drawerContents(d, x0, y);
    }
    tip('Toolbox', d ? `Drawer ${d}: ${esc(DRAWERS[d - 1])}.<br>${esc(DRAWER_NOTES[d - 1])}` : 'Six drawers. Pull one out.', 1, 8);
    hud();
  },
  actions() {
    const a = DRAWERS.map((name, i) => ({ label: (S.drawer === i + 1 ? 'Close ' : 'Open ') + `${i + 1}: ${name}`, act: 'drawer:' + (i + 1) }));
    if (S.drawer === 1) a.push({ label: 'Look for the 10 mm', act: 'find10' });
    if (S.drawer === 2) a.push({ label: 'Find the right spanner', act: 'findspanner' });
    if (S.drawer === 5) a.push({ label: 'Test the multimeter', act: 'meter' });
    a.push({ label: 'Back to the garage', act: 'go:garage' });
    return a;
  }
};
// What you see in each drawer, laid out on its foam (x0, y = where the tray starts)
function drawerContents(d, x0, y) {
  const row = (n, f) => { for (let i = 0; i < n; i++) f(i); };
  if (d === 1) row(12, i => {                                  // sockets in a row, the 10 missing
    const cx = x0 - 10 + i * 20, cy = y + 40 + (i % 2) * 22, r = 4 + Math.floor(i / 3);
    if (i === 2) { ring(cx, cy, r + 1, C.dim); text('10', cx - 3, cy + r + 3, C.dim); return; }
    disc(cx, cy, r + 1, C.steel); disc(cx, cy, Math.max(1, r - 2), C.greyDark); text(String(8 + i), cx - 3, cy + r + 3, C.ui);
  });
  if (d === 2) row(16, i => {                                  // a heap of spanners at every angle
    const cx = x0 + 10 + hash(i, 1) * 180, cy = y + 24 + hash(1, i) * 56, a = hash(i, i) * 3.14, l = 26 + hash(i, 4) * 20;
    pipe(cx - Math.cos(a) * l / 2, cy - Math.sin(a) * l / 3, cx + Math.cos(a) * l / 2, cy + Math.sin(a) * l / 3, 4, i % 3 ? C.steel : C.steel2);
    disc(Math.round(cx + Math.cos(a) * l / 2), Math.round(cy + Math.sin(a) * l / 3), 4, C.steel2);
  });
  if (d === 3) row(9, i => {                                   // screwdrivers, handles in every colour
    const cx = x0 - 10 + i * 24, cy = y + 30 + (i % 2) * 8;
    rbox(cx, cy, 8, 22, 3, [C.red, C.warm, C.car, hex('#40a060'), C.ink][i % 5]); rect(cx + 3, cy + 22, 2, 26 - (i % 3) * 4, C.steel);
  });
  if (d === 4) {                                               // pliers and odds
    for (let k = 0; k < 3; k++) { const cx = x0 + 10 + k * 60, cy = y + 30; pipe(cx, cy, cx + 30, cy + 36, 4, C.red); pipe(cx + 20, cy, cx - 4, cy + 36, 4, C.red); disc(cx + 10, cy + 12, 3, C.steel); }
    ring(x0 + 200, y + 50, 12, C.ink); ring(x0 + 200, y + 50, 8, C.ink);                // tape
    for (let k = 0; k < 8; k++) line(x0 + 150 + k * 3, y + 30, x0 + 160 + k * 3, y + 80, C.white);   // cable ties
    rect(x0 + 230, y + 70, 14, 6, C.warm);                                              // sweet wrapper
  }
  if (d === 5) {                                               // electrical
    rbox(x0 + 10, y + 20, 44, 60, 6, C.warm); rect(x0 + 16, y + 26, 32, 18, hex('#0a2a20')); disc(x0 + 32, y + 60, 9, C.ink);
    for (let k = 0; k < 14; k++) rect(x0 + 80 + hash(k, 3) * 120, y + 24 + hash(3, k) * 50, 6, 8, FUSECOLS[k % 5][0]);
    pipe(x0 + 220, y + 20, x0 + 250, y + 80, 5, C.car); pipe(x0 + 240, y + 20, x0 + 230, y + 80, 5, C.car);
  }
  if (d === 6) {                                               // big stuff
    pipe(x0 - 10, y + 40, x0 + 120, y + 30, 6, C.tool); rbox(x0 + 116, y + 22, 18, 18, 3, C.steel2);    // breaker bar
    pipe(x0 + 20, y + 70, x0 + 110, y + 60, 7, C.wood); rbox(x0 + 106, y + 50, 26, 16, 2, C.tool);     // hammer
    pipe(x0 + 150, y + 30, x0 + 220, y + 50, 5, C.steel); pipe(x0 + 220, y + 50, x0 + 240, y + 76, 5, C.steel);   // bent wheel brace
  }
}

// A shop's name written along a wall that faces down-left (at y = yf): it starts at world x, top at height z,
// runs `len` along the wall and is `tall` pixels high. Real text, slanted to lie on the wall
function frontSign(name, x, yf, len, z, tall) {
  const [sx, sy] = P(x, yf, z);
  if (sx > W || sx + len < 0 || sy > H || sy + len / 2 + tall < 0) return;
  const fit = Math.min(tall * 0.8, len / (name.length * 0.56));          // shrink long names to fit the board
  LABELS.push(`<div class="front" style="left:${sx / W * 100}%;top:${sy / H * 100}%;width:${len / W * 100}%;height:${tall / H * 100}%;font-size:${fit / W * 100}cqw;line-height:${tall / W * 100}cqw">${esc(name)}</div>`);
}
