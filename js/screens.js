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
    // the far pavement and front gardens across the road
    ground(-400, 192, 700, 204, C.drive);
    for (let x = -400; x < 700; x += 12) line(...P(x, 192), ...P(x, 204), shade(C.drive, 0.9));
    for (let x = -60; x < 400; x += 70) { ibox(x, 210, x + 50, 214, 0, 6, C.wood); for (let k = 0; k < 50; k += 6) ibox(x + k, 210, x + k + 2, 214, 0, 9, C.bench); }
    isoCarX(-120, 176, 1, C.red);                                                          // a neighbour's car parked opposite
    // kerb stones, drains, the line of the kerb
    line(...P(-400, 150), ...P(700, 150), C.white); line(...P(-400, 192), ...P(700, 192), C.white);
    for (const x of [-60, 60, 180]) { const d = P(x, 151); rect(d[0] - 3, d[1], 7, 3, C.ink); for (let k = -2; k < 4; k += 2) px(d[0] + k, d[1] + 1, C.steel2); }
    ground(92, 60, 138, 138, C.drive);                                                     // driveway
    ground(42, 60, 56, 138, C.concreteDark);                                               // path
    for (let y = 64; y < 136; y += 8) line(...P(42, y), ...P(56, y), shade(C.concreteDark, 0.9));
    tree(-40, 10); tree(150, -30); tree(-80, 90);
    // the front garden: a low hedge along the pavement (gaps for the path and the drive), flower beds, a fence to next door
    ibox(-50, 130, 40, 136, 0, 8, C.tree2, C.tree1); ibox(58, 130, 90, 136, 0, 8, C.tree2, C.tree1); ibox(140, 130, 176, 136, 0, 8, C.tree2, C.tree1);
    for (let k = 0; k < 40; k++) { const f = P(2 + (k % 10) * 3.6, 64 + Math.floor(k / 10) * 4, 1); px(f[0], f[1], [C.red, C.warm, C.white, hex('#e070a8')][k % 4]); }
    for (let y = 0; y < 130; y += 10) ibox(170, y, 172, y + 2, 0, 14, C.wood);
    line(...P(171, 0, 12), ...P(171, 130, 12), C.wood); line(...P(171, 0, 6), ...P(171, 130, 6), C.wood);
    // a lamp post and the red postbox by the kerb
    ibox(-30, 140, -27, 143, 0, 80, C.greyDark); ibox(-34, 136, -20, 147, 80, 84, C.greyDark); onLeft(147, -32, -22, 79, 80, C.warm);
    ibox(156, 138, 164, 146, 0, 16, C.red, shade(C.red, 1.2)); onLeft(146, 158, 162, 11, 12, C.ink);
    backGarden();                                                                          // behind the house
    // the house next door, on the left: cream render, a green door
    ibox(-170, 0, -80, 60, 0, 54, C.cream);
    gableRoof(-173, -3, -77, 63, 54, 28, C.cream, C.roofLine);
    winLeft(60, -160, -144, 32, 46); winLeft(60, -106, -90, 32, 46); winLeft(60, -160, -144, 10, 24);
    onLeft(60, -131, -117, 0, 27, C.white); onLeft(60, -130, -118, 0, 26, C.tree2);
    ground(-132, 60, -116, 130, C.concreteDark);                                           // their path
    ibox(-200, 130, -132, 136, 0, 8, C.tree2, C.tree1); ibox(-116, 130, -60, 136, 0, 8, C.tree2, C.tree1);   // their hedge
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
    kerbMailbox(S.doorstep.length > 0);                                                   // the mailbox at the kerb: a parcel sticks out when there is one
    standingMan('home');
    if (S.flags.drunkHome) {                                          // home from the pub: all he can manage is the front door
      spot('Front door: go in', isoArea(38, 58, 54, 62, 0, 28), 'room', [46, 66]);
      return hud();
    }
    spot('Car: into town', isoArea(102, 72, 126, 118, 0, 22), 'city', [96, 96]);
    spot('Front door: go in', isoArea(38, 58, 54, 62, 0, 28), 'room', [46, 66]);
    spot('Garage', isoArea(94, 58, 136, 62, 0, 30), 'garage', [115, 66]);
    spot(S.doorstep.length ? 'Mailbox: a parcel!' : 'Mailbox (empty)', isoArea(MAILBOX[0] - 2, MAILBOX[1], MAILBOX[0] + 10, MAILBOX[1] + 12, 0, 26), S.doorstep.length ? 'act:parcel' : 'act:look:Mailbox', [MAILBOX[0] + 4, MAILBOX[1] - 8]);
    if (wifeFollowing()) {                                             // late: she's followed him out (drawn in life.js); last, so she's on top of the garage when she stands by it
      const [fx, fy] = FOLLOW.pos || followTarget();
      spot('Talk to the wife', isoArea(fx - 4, fy - 4, fx + 4, fy + 4, 0, 40), 'act:wife', [fx - 12, fy + 10]);
    }
    hud();
  },
  actions() {
    return [
      ...(S.flags.nutSeen && !S.inv.stick ? [{ label: 'Get a long stick from the hedge', act: 'stick' }] : [])
    ];
  }
};

// Night at home: dark outside; lit windows in all three houses; the street light glows
const HOME_WINDOWS_LEFT = [[60, 10, 26, 32, 46], [60, 64, 80, 32, 46], [60, 10, 26, 10, 24], [60, -160, -144, 32, 46], [60, -106, -90, 32, 46], [60, -160, -144, 10, 24], [60, 190, 204, 16, 30], [60, 214, 228, 16, 30]];
SCREENS.home.night = function (d) {
  ISO.ox = 250; ISO.oy = 96;
  nightShade(0, 18, W, H, d);
  if (d > 0.2) {
    for (const [yf, a, b, c, e] of HOME_WINDOWS_LEFT) onLeft(yf, a + 1, b - 1, c + 1, e - 1, LIT);
    onRight(90, 21, 35, 39, 47, LIT);
  }
  const lamp = P(-27, 141, 79), pool = P(-27, 141, 0);
  lampGlow(lamp[0], lamp[1], 14, d); lampGlow(pool[0], pool[1], 22, d * 0.6);     // the street light, and its pool of light
  keepHud(18);
};

// =====================================================================
// INSIDE THE HOUSE: one room. The computer (on a chair: there's no desk), the bed, the kitchen
// =====================================================================
const ROOM = { w: 180, d: 140, h: 84 };                    // the room: across (x), deep (y), high
const KETTLE = [146, 8];
const WIFE_AT = [128, 38];                                  // where she stands: by the kitchen                                   // where the kettle stands on the worktop (the tea is made here)
SCREENS.room = {
  size: [480, 270],
  paint() {
    ISO.ox = VIEW.room[0]; ISO.oy = VIEW.room[1];
    rect(0, 0, W, H, C.greyDark);
    // walls (wallpaper with a stripe), a carpet
    poly([P(0, 0, 0), P(0, ROOM.d, 0), P(0, ROOM.d, ROOM.h), P(0, 0, ROOM.h)], shade(C.cream, 0.88));
    poly([P(0, 0, 0), P(ROOM.w, 0, 0), P(ROOM.w, 0, ROOM.h), P(0, 0, ROOM.h)], C.cream);
    for (let k = 6; k < ROOM.w; k += 12) onLeft(0, k, k + 1, 0, ROOM.h, C.creamDark);
    for (let k = 6; k < ROOM.d; k += 12) onRight(0, k, k + 1, 0, ROOM.h, shade(C.creamDark, 0.9));
    ground(0, 0, ROOM.w, ROOM.d, hex('#8a6a5a'));
    ground(40, 40, 120, 100, hex('#9a5a4a'));                                         // a rug
    // the window on the back wall
    onLeft(0, 64, 96, 38, 66, C.white); onLeft(0, 66, 94, 40, 64, skyColour()); onLeft(0, 79, 81, 40, 64, C.white);
    // the computer: on a small desk under the window, a chair pulled up to it
    for (const [lx, ly] of [[68, 1], [90, 1], [68, 14], [90, 14]]) ibox(lx, ly, lx + 2, ly + 2, 0, 22, C.bench);   // desk legs
    ibox(66, 0, 94, 17, 22, 24, C.wood);                                              // the desk top
    ibox(74, 2, 86, 6, 24, 36, C.ink);                                                // the monitor
    onLeft(6, 75, 85, 26, 35, hex('#2a5070'));                                        // its screen
    ibox(72, 9, 86, 14, 24, 25, C.greyDark);                                          // the keyboard
    for (const [lx, ly] of [[73, 22], [85, 22], [73, 32], [85, 32]]) ibox(lx, ly, lx + 2, ly + 2, 0, 13, C.bench);   // chair legs
    ibox(72, 21, 88, 35, 13, 15, C.wood);                                             // the seat
    ibox(72, 33, 88, 36, 15, 29, C.bench);                                            // its back (towards you)
    // the kitchen: units along the back wall, a sink, the kettle, cupboards above
    ibox(104, 0, 178, 18, 0, 30, C.white, C.steel2);                                  // the units and the worktop
    for (const x of [104, 129, 154]) onLeft(18, x + 2, x + 22, 4, 26, shade(C.white, 0.93));   // cupboard doors
    onLeft(18, 108, 124, 27, 29, C.steel2);                                            // the kitchen drawer
    ground(112, 3, 132, 14, C.steel, 30);                                             // the sink
    kettle(KETTLE[0], KETTLE[1]);                                                      // the kettle
    ibox(104, 0, 178, 12, 50, 68, C.white);                                           // cupboards on the wall
    // the bed, its head against the left wall
    ibox(0, 80, 3, 130, 0, 28, C.wood);                                               // headboard
    ibox(3, 80, 58, 130, 0, 12, C.bench);                                             // the base
    ibox(3, 82, 58, 128, 12, 17, C.white);                                            // the mattress
    ibox(4, 86, 16, 124, 17, 22, C.white, hex('#ffffff'));                            // the pillow
    ibox(18, 81, 59, 129, 15, 20, C.door);                                            // the duvet
    // the sofa, in the corner against the left wall
    const sofa = hex('#4a6a8a');
    ibox(0, 6, 18, 58, 0, 10, sofa);                                                  // the seat
    ibox(0, 6, 5, 58, 10, 24, shade(sofa, 0.9));                                      // its back
    ibox(0, 4, 18, 9, 0, 16, shade(sofa, 0.95)); ibox(0, 55, 18, 60, 0, 16, shade(sofa, 0.95));   // its arms
    ibox(6, 10, 16, 30, 10, 12, shade(sofa, 1.1)); ibox(6, 32, 16, 52, 10, 12, shade(sofa, 1.1));  // cushions
    // the way out: a see-through door in the near wall
    exitDoor(ROOM.d);
    standingMan('room');
    spot('Computer', isoArea(66, 0, 94, 17, 0, 36), 'pc', [80, 46]);
    spot('Bed: go to sleep', isoArea(0, 80, 59, 130, 0, 22), 'act:bed', [70, 104]);
    spot('Kettle: make a cup of tea', isoArea(KETTLE[0] - 6, 0, KETTLE[0] + 14, 18, 26, 42), 'act:tea', [150, 32]);
    spot('Door: outside', isoArea(EXIT_DOOR[0], ROOM.d - 4, EXIT_DOOR[1], ROOM.d, 0, EXIT_DOOR[2]), 'home', [105, 130]);
    const [fx, fy] = WIFE.pos;                                         // she walks round (drawn in life.js); the tap area follows her
    spot('Talk to the wife', isoArea(fx - 4, fy - 4, fx + 4, fy + 4, 0, 40), 'act:wife', [fx - 18, fy + 14]);   // last: on top, even when she's in bed
    hud();
  },
  actions() {
    const a = [];
    if (S.inv.torch && !S.flags.torchLit) a.push({ label: 'Look for batteries in the kitchen drawer', act: 'batteries' });
    return a;
  }
};

// The back garden: a lawn behind the house, fences, a patio, a washing line and a shed
function backGarden() {
  for (let y = -100; y < 0; y += 10) ground(0, y, 170, y + 10, (y / 10) % 2 ? C.grass : C.grassLine);   // mown stripes
  ground(0, -24, 90, 0, C.concrete);                                                     // the patio
  for (let x = 0; x <= 170; x += 10) ibox(x, -101, x + 2, -99, 0, 14, C.wood);          // the back fence
  line(...P(0, -100, 12), ...P(170, -100, 12), C.wood); line(...P(0, -100, 6), ...P(170, -100, 6), C.wood);
  for (let y = -100; y < 0; y += 10) ibox(170, y, 172, y + 2, 0, 14, C.wood);           // the fence to next door, carried on
  line(...P(171, -100, 12), ...P(171, 0, 12), C.wood); line(...P(171, -100, 6), ...P(171, 0, 6), C.wood);
  ibox(124, -92, 160, -66, 0, 24, hex('#7a6a50'), hex('#5a4a38'));                    // the shed
  onLeft(-66, 132, 144, 0, 18, hex('#5a4a38'));                                         // its door
  for (const x of [20, 100]) ibox(x, -70, x + 2, -68, 0, 34, C.steel2);                 // the washing line's poles…
  line(...P(21, -69, 33), ...P(101, -69, 33), C.white);                                 // …the line…
  [[30, C.red], [44, C.white], [58, C.car], [72, C.warm], [86, C.white]].forEach(([x, c]) => onLeft(-69, x, x + 8, 22, 32, c));   // …and the washing
}

// A red kettle on the worktop: body, lid, handle, spout, on its base
function kettle(x, y) {
  ibox(x - 1, y - 1, x + 9, y + 8, 30, 31, C.ink);                                  // the base
  ibox(x, y, x + 8, y + 7, 31, 41, C.red, shade(C.red, 1.25));                      // the body
  ibox(x + 2, y + 2, x + 6, y + 5, 41, 42, C.ink);                                  // the lid's knob
  line(...P(x + 8, y + 2, 39), ...P(x + 11, y + 2, 37), C.ink); line(...P(x + 11, y + 2, 37), ...P(x + 11, y + 2, 33), C.ink); line(...P(x + 11, y + 2, 33), ...P(x + 8, y + 2, 32), C.ink);   // the handle
  line(...P(x + 3, y + 7, 36), ...P(x + 2, y + 11, 39), C.red); line(...P(x + 4, y + 7, 36), ...P(x + 3, y + 11, 39), C.red);   // the spout
  const k = P(x + 6, y + 7, 33); px(k[0], k[1], C.warm);                             // its little light
}

// The mailbox at the kerb, on its post; full: the flag's up and a parcel sticks out of the front
const MAILBOX = [62, 140];
function kerbMailbox(full) {
  const [x, y] = MAILBOX;
  ibox(x + 3, y + 3, x + 5, y + 5, 0, 16, C.wood);                                // the post
  ibox(x, y, x + 8, y + 10, 16, 23, hex('#2e5a3a'), hex('#3a7048'));              // the box
  if (full) {
    ibox(x + 1, y + 8, x + 7, y + 15, 17, 22, CARDBOARD);                         // the parcel, sticking out
    line(...P(x + 4, y + 8, 22), ...P(x + 4, y + 15, 22), C.warm);                // its tape
    ibox(x + 8, y + 2, x + 9, y + 4, 20, 29, C.red);                              // the flag, up
  } else {
    ibox(x + 8, y + 2, x + 9, y + 9, 20, 22, C.red);                              // the flag, down
  }
}

// =====================================================================
// CITY: the map of town. Tap a place and you're there
// =====================================================================
const PLACES = [
  // [name, category]  (one per lot, 7 across x 6 down)
  ['Motor Factors', 'parts'], ['Quickfix Motors', 'mech'], ['Library (free Wi-Fi)', 'other'], ['Gearbox Gurus', 'trans'], ['Post Office', 'other'], ['Parts 4 Less', 'parts'], ["Auntie Jean's", 'people'],
  ['The Hesketh Tavern', 'other'], ['Megastore', 'big'], ["Sparky's Auto Electrics", 'elec'], ['Tyre Place', 'other'], ["Dave's Garage", 'mech'], ['Phone Shop', 'other'], ['Tool Shop', 'tools'],
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

SCREENS.city_night = function (d) {
  nightShade(0, 36, W, H, d);
  ISO.ox = S.cam.ox; ISO.oy = S.cam.oy;
  for (let i = 0; i <= 7; i++) for (let j = 0; j <= 6; j++) { const p = P(i * BLOCK + 2, j * BLOCK + 2, 6); lampGlow(p[0], p[1], 9, d); }
  keepHud(36);
};
SCREENS.city = {
  size: [582, 328],                                         // one zoom step closer than 640 x 360
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
    const carX = (here % 7) * BLOCK + STREET + 22, carY = Math.floor(here / 7) * BLOCK + STREET + 74;
    isoCarX(carX, carY, 0.5, C.car);
    for (const lot of lots) sign(lot);
    spot('Your car: drive home', isoArea(carX, carY, carX + 24, carY + 13, 0, 12), 'home');   // tap your car to go home
    minimap();
    tip('Town', 'Point at a building to see what it is; tap to go there (20 minutes).<br>Drag the map to look round. Tap your blue car to go home.', 1, 80);
    hud();
  },
  actions() { return []; }
};
function building(lot) {
  const x0 = lot.bi * BLOCK + STREET, y0 = lot.bj * BLOCK + STREET, x1 = x0 + 70, y1 = y0 + 70;
  const cat = lot.place[1], col = hex(CAT[cat][1]);
  ground(x0, y0, x1, y1, C.concrete);
  if (cat === 'yard') {                                    // breakers yard: wrecks, two stacked, a tyre pile
    const paint = [hex('#9a5ac8'), C.red, C.warm, C.steel2, C.tree2];   // no blue: blue is your car
    for (let n = 0; n < 6; n++) {
      const cx = x0 + 6 + (n % 3) * 21, cy = y0 + 6 + Math.floor(n / 3) * 32;
      isoCar(cx, cy, 0.45, shade(paint[n % 5], 0.8), { broken: true, noWheels: true, noBonnet: true });
      if (n === 1 || n === 3) isoCar(cx + 1, cy + 2, 0.45, shade(paint[(n + 2) % 5], 0.75), { broken: true, noWheels: true, noBonnet: true, dz: 6 });
    }
    ibox(x0 + 60, y0 + 4, x0 + 66, y0 + 10, 0, 4, C.tyre); ibox(x0 + 60, y0 + 4, x0 + 66, y0 + 10, 4, 8, C.tyre);
    line(...P(x0, y1), ...P(x1, y1), C.wood); line(...P(x1, y0), ...P(x1, y1), C.wood);
    return 12;
  }
  if (placeStyle(lot.place[0]) === 'pub') {               // the pub: black and white timbers, a tiled roof, a hanging sign, benches outside
    ground(x0 + 4, y0 + 4, x1 - 4, y1 - 4, C.grassLine);
    ibox(x0 + 12, y0 + 14, x1 - 12, y1 - 18, 0, 18, C.cream);
    for (let x = x0 + 14; x < x1 - 12; x += 7) onLeft(y1 - 18, x, x + 1, 0, 18, hex('#2a1a12'));   // the timbers
    onLeft(y1 - 18, x0 + 12, x1 - 12, 8, 9, hex('#2a1a12'));
    gableRoof(x0 + 10, y0 + 12, x1 - 10, y1 - 16, 18, 12, C.cream, hex('#7a3a2a'));
    onLeft(y1 - 18, x0 + 32, x0 + 38, 0, 9, hex('#4a2a18'));                 // the door
    winLeft(y1 - 18, x0 + 18, x0 + 26, 4, 7); winLeft(y1 - 18, x0 + 44, x0 + 52, 4, 7);
    ibox(x1 - 14, y1 - 18, x1 - 13, y1 - 10, 14, 15, hex('#2a1a12'));        // the sign's bracket…
    onLeft(y1 - 11, x1 - 15, x1 - 9, 6, 13, hex('#7a2a20'));                 // …and the sign hanging off it
    for (const bx of [x0 + 16, x0 + 40]) ibox(bx, y1 - 12, bx + 12, y1 - 8, 0, 3, C.wood);   // benches outside
    frontSign(lot.place[0], x0 + 12, y1 - 18, x1 - x0 - 24, 17, 6);
    return 30;
  }
  if (cat === 'home' || cat === 'people') {                // a house on a lawn
    ground(x0 + 4, y0 + 4, x1 - 4, y1 - 4, C.grassLine);
    ibox(x0 + 14, y0 + 16, x1 - 14, y1 - 16, 0, 16, col);
    gableRoof(x0 + 12, y0 + 14, x1 - 12, y1 - 14, 16, 12, col, C.roof);
    onLeft(y1 - 16, x0 + 30, x0 + 37, 0, 11, C.door);
    winLeft(y1 - 16, x0 + 18, x0 + 25, 6, 12); winLeft(y1 - 16, x0 + 44, x0 + 51, 6, 12);
    return 30;
  }
  const name = lot.place[0];
  if (name === 'Library (free Wi-Fi)') return library(x0, y0, x1, y1);
  if (name === 'Café') return cafe(x0, y0, x1, y1);
  if (name === 'Petrol Station') return petrolStation(x0, y0, x1, y1);
  if (MOTOR_CATS.includes(cat) || MOTOR_NAMES.includes(name)) return motorUnit(lot, x0, y0, x1, y1, col);
  return shopUnit(lot, x0, y0, x1, y1, col, cat === 'big');
}
// Which places are for cars (they all look like a works unit); the rest are shops (they all look like a shop)
const MOTOR_CATS = ['parts', 'mech', 'elec', 'trans'];
const MOTOR_NAMES = ['MOT Test Centre', 'Tyre Place', 'Petrol Station', 'Machine Shop (lathe)'];
// A motor place: a works unit with a sawtooth roof, a big roller door, a small office door and window
function motorUnit(lot, x0, y0, x1, y1, col) {
  const a = 8, h = 20;
  ibox(x0 + a, y0 + a, x1 - a, y1 - a, 0, h, col, C.steel);
  for (let x = x0 + a; x < x1 - a - 6; x += 12) {                                         // the sawtooth roof: slopes, and windows facing the light
    poly([P(x, y0 + a, h), P(x, y1 - a, h), P(x + 6, y1 - a, h + 6), P(x + 6, y0 + a, h + 6)], shade(C.steel, 0.72));
    poly([P(x + 6, y0 + a, h), P(x + 6, y1 - a, h), P(x + 6, y1 - a, h + 6), P(x + 6, y0 + a, h + 6)], C.glass);
  }
  onLeft(y1 - a, x0 + a, x1 - a, h - 8, h - 1, C.white);                                  // the sign board
  frontSign(lot.place[0], x0 + a, y1 - a, x1 - x0 - 2 * a, h - 1, 7);
  onLeft(y1 - a, x0 + a + 4, x0 + a + 30, 0, h - 9, C.steel);                            // the roller door
  for (let z = 2; z < h - 9; z += 2) line(...P(x0 + a + 4, y1 - a, z), ...P(x0 + a + 30, y1 - a, z), C.steel2);
  onLeft(y1 - a, x0 + 44, x0 + 50, 0, h - 10, C.ink);                                     // the office door
  onLeft(y1 - a, x0 + 52, x1 - a - 3, 4, h - 11, C.glass);                                // the office window
  return h + 6;
}
// A shop: a flat roof with a parapet, a striped awning over a big window, the door
function shopUnit(lot, x0, y0, x1, y1, col, big) {
  const a = big ? 4 : 10, h = big ? 22 : 18;
  ibox(x0 + a, y0 + a, x1 - a, y1 - a, 0, h, col, C.steel);
  onLeft(y1 - a, x0 + a, x1 - a, h, h + 2, shade(col, 0.8));                              // the parapet
  onLeft(y1 - a, x0 + a, x1 - a, h - 9, h - 1, C.white);                                  // the sign board
  frontSign(lot.place[0], x0 + a, y1 - a, x1 - x0 - 2 * a, h - 1, 8);
  for (let x = x0 + a + 4; x < x0 + 40; x += 4) ibox(x, y1 - a, x + 2, y1 - a + 4, h - 12, h - 11, (x / 4) % 2 ? C.white : shade(col, 0.75));   // the striped awning
  onLeft(y1 - a, x0 + a + 4, x0 + 40, 2, h - 12, C.glass);                                // the shop window
  onLeft(y1 - a, x0 + 44, x0 + 50, 0, h - 10, C.ink);                                     // the door
  for (let y = y0 + a + 8; y < y1 - a - 6; y += 12) winRight(x1 - a, y, y + 6, h - 12, h - 7);
  return h + 2;
}
// The library: stone, steps up to a row of columns, a triangle of roof over them
function library(x0, y0, x1, y1) {
  const stone = hex('#d8d0b8'), h = 22;
  ground(x0 + 4, y0 + 4, x1 - 4, y1 - 4, C.grassLine);
  ibox(x0 + 10, y0 + 10, x1 - 10, y1 - 22, 0, h, stone, hex('#c0b8a0'));                  // the main hall
  for (let k = 0; k < 3; k++) ibox(x0 + 12, y1 - 22 + k * 3, x1 - 12, y1 - 19 + k * 3, 0, 4 - k * 1.3, shade(stone, 0.92 - k * 0.04));   // the steps
  for (let x = x0 + 16; x < x1 - 14; x += 8) ibox(x, y1 - 24, x + 3, y1 - 21, 3, h - 2, C.white);   // the columns
  ibox(x0 + 12, y1 - 26, x1 - 12, y1 - 21, h - 2, h, stone);                              // the beam across the top
  poly([P(x0 + 12, y1 - 21, h), P(x1 - 12, y1 - 21, h), P((x0 + x1) / 2, y1 - 21, h + 9)], shade(stone, 0.95));   // the pediment
  onLeft(y1 - 22, x0 + 32, x0 + 38, 3, 14, C.ink);                                        // the big door
  frontSign('LIBRARY', x0 + 12, y1 - 21, x1 - x0 - 24, h - 3, 5);
  return h + 9;
}
// The petrol station: a forecourt with pumps under a canopy, the kiosk at the back, a price sign by the road
function petrolStation(x0, y0, x1, y1) {
  ground(x0 + 2, y0 + 2, x1 - 2, y1 - 2, C.concreteDark);                                 // the forecourt
  ibox(x0 + 40, y0 + 6, x1 - 6, y0 + 30, 0, 12, C.white, C.steel);                        // the kiosk
  onLeft(y0 + 30, x0 + 40, x1 - 6, 9, 12, C.red);                                         // its red band
  onLeft(y0 + 30, x0 + 44, x0 + 56, 1, 8, C.glass); onLeft(y0 + 30, x0 + 58, x0 + 63, 0, 8, C.ink);
  for (const [px, py] of [[x0 + 18, y0 + 40], [x0 + 32, y0 + 40]]) { ibox(px - 3, py - 6, px + 3, py + 6, 0, 1, C.concrete); ibox(px - 1, py - 2, px + 1, py + 2, 1, 8, C.red, C.white); }   // pump islands
  for (const [cx, cy] of [[x0 + 10, y0 + 26], [x0 + 40, y0 + 26], [x0 + 10, y0 + 56], [x0 + 40, y0 + 56]]) ibox(cx, cy, cx + 1, cy + 1, 0, 16, C.steel2);   // canopy posts
  ibox(x0 + 6, y0 + 22, x0 + 44, y0 + 60, 16, 19, C.red, C.white);                         // the canopy
  ibox(x1 - 10, y1 - 10, x1 - 9, y1 - 9, 0, 18, C.steel2); onLeft(y1 - 9, x1 - 14, x1 - 5, 14, 24, C.ink);   // the price sign
  frontSign('PETROL', x0 + 6, y0 + 60, 38, 19, 3);
  return 22;
}
// The café: small and bright, a striped awning, tables and umbrellas outside
function cafe(x0, y0, x1, y1) {
  const wall = hex('#f4e8c8'), h = 14;
  ground(x0 + 4, y1 - 22, x1 - 4, y1 - 4, hex('#d8c8a8'));                                // the terrace
  ibox(x0 + 14, y0 + 12, x1 - 14, y1 - 24, 0, h, wall, hex('#b05a3a'));                    // the café, a terracotta roof
  for (let x = x0 + 14; x < x1 - 14; x += 6) ibox(x, y1 - 24, x + 3, y1 - 18, h - 4, h - 3, (x / 6) % 2 ? C.white : C.red);   // the striped awning
  onLeft(y1 - 24, x0 + 18, x0 + 40, 2, h - 5, C.glass);                                   // the window
  onLeft(y1 - 24, x0 + 44, x0 + 50, 0, h - 5, hex('#2a6a3a'));                            // a green door
  for (const [tx, ty] of [[x0 + 16, y1 - 14], [x0 + 34, y1 - 12], [x0 + 52, y1 - 14]]) {
    ibox(tx, ty, tx + 6, ty + 6, 4, 5, C.white);                                          // a table
    ibox(tx + 2.5, ty + 2.5, tx + 3.5, ty + 3.5, 5, 12, C.steel2);                        // its umbrella pole…
    poly([P(tx - 3, ty + 3, 12), P(tx + 3, ty - 3, 12), P(tx + 9, ty + 3, 12), P(tx + 3, ty + 9, 12), P(tx + 3, ty + 3, 15)].slice(0, 4), [C.red, C.warm, hex('#2a8a5a')][(tx + ty) % 3]);   // …and its umbrella
  }
  frontSign('CAFÉ', x0 + 14, y1 - 24, x1 - x0 - 28, h - 1, 5);
  return h + 4;
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
// The door out of a shop: in the near wall (the one you can't see), so it's drawn as a wireframe
const EXIT_DOOR = [88, 122, 52];                                    // from x, to x, height
function exitDoor(y = 150, where = EXIT_DOOR) {
  const [x0, x1, h] = where;
  const edges = [[P(x0, y, 0), P(x0, y, h)], [P(x0, y, h), P(x1, y, h)], [P(x1, y, h), P(x1, y, 0)]];   // the frame: both sides and the top
  for (const [a, b] of edges) dashedLine(a, b, C.mint);
  const k = P(x1 - 5, y, h * 0.45);                                 // the handle
  rect(k[0] - 2, k[1], 4, 2, C.mint);
}
// A dashed line from a to b (3 pixels on, 2 off)
function dashedLine(a, b, col) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (let d = 0; d < len; d++) {
    if (d % 5 >= 3) continue;                                       // the gaps
    px(a[0] + (b[0] - a[0]) * d / len, a[1] + (b[1] - a[1]) * d / len, col);
  }
}

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
    if (style === 'pub') {                                         // the pub: a flat, side-on view of the bar
      pubScene(shut);
      pubSpots(shut);
      tip(name, shut ? esc(shut) : 'Tap the barman to order. The regulars will tell you what\'s wrong with your car.', 1, 8);
      return hud();
    }
    shopInterior(name, shut);
    ISO.ox = SHOP_VIEW[0]; ISO.oy = SHOP_VIEW[1];
    const person = (PLACE_INFO[name] || {}).person || (style === 'house' ? name.replace("'s", '') : 'the shopkeeper');
    if (!shut) {
      const [hx, hy] = keeperHead();
      const queueing = name === 'Post Office' && !postFirst();       // at the post office you stay at the back of the queue
      spot('Talk to ' + esc(person), [hx - 12, hy - 2, 26, 44], 'act:talk', style === 'house' ? [80, 70] : queueing ? [118, 146] : [104, 80]);
    }
    if (style !== 'house') {
      if (SHELF_STYLES.includes(style)) {                          // shelves along the left wall, a till to pay at, posters on the back wall
        shelfSpots();
        if (!shut) spot('Till: pay' + (basketHere().length ? ' £' + basketTotal().toFixed(2) : ''), isoArea(56, 54, 82, 66, 22, 36), 'act:checkout', [66, 80]);
        spot('Read the posters', isoArea(140, 0, 190, 1, 30, 56), 'act:posters', [160, 80]);
      } else {
        spot('Look at the stock', isoArea(10, 0, 190, 12, 14, 62), 'act:browse', [184, 82]);
        spot('Read the posters', isoArea(0, 70, 1, 140, 30, 56), 'act:posters', [18, 112]);
      }
      basketLabel();
    }
    exitDoor();                                                    // the way out: a see-through door in the near wall
    spot('Door: leave', isoArea(EXIT_DOOR[0], 146, EXIT_DOOR[1], 150, 0, EXIT_DOOR[2]), style === 'house' ? 'city' : 'act:leave', [105, 140]);
    tip(name, shut ? esc(shut) : 'Tap the ' + (style === 'house' ? 'door' : 'shopkeeper') + ' to talk. Walk round and look at things.', 1, 8);
    hud();
  },
  actions() { return []; }                                         // to wait, tap the watch (bottom left)
};

// =====================================================================
// THE COMPUTER: real text, made-up sites
// =====================================================================
SCREENS.pc = {
  size: [480, 270],
  paint() {
    rect(0, 0, W, H, C.cream);
    for (let x = 0; x < W; x += 24) rect(x, 0, 1, 228, C.creamDark);
    rect(0, 228, W, 42, C.wood); rect(0, 228, W, 1, C.bench);                       // the table
    rect(30, 9, 420, 210, C.greyDark); rect(33, 12, 414, 204, C.grey); rect(39, 18, 402, 192, C.ink);
    rect(222, 219, 36, 9, C.greyDark); rect(204, 226, 72, 3, C.greyDark);
    rect(450, 30, 21, 18, C.warm); text('PW?', 453, 36, C.bench);
    rect(105, 240, 180, 15, C.greyDark); for (let k = 0; k < 21; k++) rect(109 + k * 8, 243, 6, 3, C.grey), rect(109 + k * 8, 249, 6, 3, C.grey);
    rect(321, 237, 15, 18, C.white); rect(336, 241, 4, 7, C.white); rect(324, 239, 9, 1, C.bench);
  },
  overlay() {
    const dock = APPS.map(([id, name]) => `<button data-app="${id}" class="${id === S.app ? 'on' : ''}">${APP_ICON[id]}<span>${name}</span></button>`).join('');
    return `<div class="ov pc"><div class="dock">${dock}</div><div class="win app-${S.app}">${appHTML(S.app)}</div></div>`;
  },
  actions() { return [{ label: 'Get up', act: 'go:room' }]; }
};
// The apps on the computer: [the game's name for it, the name you see]
const APPS = [['ViewTube', 'Yoo Toob'], ['Forum', 'Reedit'], ['Mail', 'Grrmail'], ['Pics', 'Instaglum'], ['MegaMart', 'Zamanon'], ['eBuy', 'TheeBay'], ['TechDocs', 'Wonkypedia']];
// Each app's little logo (drawn in SVG, 24 x 24)
const svgIcon = inner => `<svg viewBox="0 0 24 24" class="ic">${inner}</svg>`;
const APP_ICON = {
  ViewTube: svgIcon('<rect x="1" y="5" width="22" height="15" rx="4" fill="#f03"/><path d="M10 9l6 3.5-6 3.5z" fill="#fff"/>'),
  Forum: svgIcon('<circle cx="12" cy="12" r="11" fill="#ff4500"/><ellipse cx="12" cy="14" rx="7" ry="5" fill="#fff"/><circle cx="9.5" cy="13.5" r="1.2" fill="#ff4500"/><circle cx="14.5" cy="13.5" r="1.2" fill="#ff4500"/><circle cx="16" cy="6" r="1.6" fill="#fff"/><path d="M12 9l1.5-4 2.5 1" stroke="#fff" fill="none"/>'),
  Mail: svgIcon('<rect x="2" y="5" width="20" height="14" rx="2" fill="#fff"/><path d="M2 7l10 7 10-7v12h-3V11l-7 5-7-5v8H2z" fill="#ea4335"/><path d="M2 7v12h3v-8z" fill="#4285f4"/><path d="M22 7v12h-3v-8z" fill="#34a853"/>'),
  Pics: svgIcon('<defs><linearGradient id="igg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#feda75"/><stop offset=".5" stop-color="#d62976"/><stop offset="1" stop-color="#4f5bd5"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" fill="url(#igg)"/><rect x="6" y="6" width="12" height="12" rx="4" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="#fff" stroke-width="2"/><circle cx="16.5" cy="7.5" r="1" fill="#fff"/>'),
  MegaMart: svgIcon('<rect x="1" y="1" width="22" height="22" rx="4" fill="#232f3e"/><text x="12" y="13" font-size="11" font-weight="bold" fill="#fff" text-anchor="middle" font-family="Arial">z</text><path d="M5 16q7 4 14 0" stroke="#ff9900" stroke-width="2" fill="none"/><path d="M17 14.5l2.5 1.5-2 1.8" stroke="#ff9900" stroke-width="1.5" fill="none"/>'),
  eBuy: svgIcon('<rect x="1" y="1" width="22" height="22" rx="4" fill="#fff"/><text y="16" font-size="10" font-weight="bold" font-family="Arial"><tspan x="2" fill="#e53238">T</tspan><tspan fill="#0064d2">h</tspan><tspan fill="#f5af02">e</tspan><tspan fill="#86b817">B</tspan></text>'),
  TechDocs: svgIcon('<circle cx="12" cy="12" r="11" fill="#eee" stroke="#999"/><text x="12" y="17" font-size="14" font-family="Georgia, serif" text-anchor="middle" fill="#222">W</text>')
};
// Each app, made to look like the site it's like
function appHTML(app) {
  if (app === 'ViewTube') return `<div class="top">${APP_ICON.ViewTube}<b class="logo">Yoo Toob</b><span class="search">zafira gearbox sensor</span></div><div class="body">
    <div class="video"><div class="play"></div><div class="prog"><i></i></div></div>
    <h2>2005 Zafira 1.6i EXCITE gearbox sensor replacement (EASY 10 MIN JOB)</h2>
    <div class="chan"><span class="av">G</span><div><b>GarageGuy Gaz</b><div class="meta">1.2M views · 9 years ago</div></div><span class="sub">SUBSCRIBE</span></div>
    <p>Right lads, first get the car on a ramp. After removing the dashboard, simply slide the sensor out. Refit in reverse order of removal.</p>
    <div class="post"><b>@ZafPlusOwner</b> mine is the PLUS, totally different connector</div><div class="post"><b>@tony_b</b> 13:42 he just skips the hard bit</div>
    <p><button data-act="watch">Watch it (15 min)</button></p></div>`;
  if (app === 'Forum') return `<div class="top">${APP_ICON.Forum}<b class="logo">reedit</b><span class="sub">r/ZafiraOwners</span><span class="search">Search r/ZafiraOwners</span></div><div class="body">
    ${S.flags.codes ? `<div class="card"><div class="votes">▲<b>412</b>▼</div><div><div class="meta">r/ZafiraOwners · Posted by u/zaf_dave · 14 March 2009</div>
    <h2>P0705 red light on dash, auto box?? HELP</h2><p>P0705, red light on dash. Garage says 3 months. Any ideas?</p></div></div>
    <div class="card"><div class="votes">▲<b>88</b>▼</div><div><div class="meta">u/MrTorque · 15 Mar 2009</div>Its the selector sensor. Or the loom. Check ur fuses first tbh</div></div>
    <div class="card"><div class="votes">▲<b>3</b>▼</div><div><div class="meta">u/zaf_dave · 2 Jun 2009</div>Fixed it.</div></div>
    <div class="card"><div class="votes">▲<b>146</b>▼</div><div><div class="meta">u/Lisa_K · 11 Nov 2016</div>how?? same problem</div></div>
    <div class="card"><div class="votes">▲<b>−20</b>▼</div><div><div class="meta">u/zaf_dave · 12 Nov 2016</div>Solved, PM me<br><span class="red">[image no longer available]</span></div></div>
    <p><button data-act="readforum">Read it properly and note it down (30 min)</button></p>` :
    `<div class="card"><div class="votes">▲<b>•</b>▼</div><div>You type "red light dash". 41,000 results. Without the error codes you don't know what to search for.</div></div>`}</div>`;
  if (app === 'Mail') return `<div class="top">${APP_ICON.Mail}<b class="logo">Grrmail</b><span class="search">Search mail</span></div><div class="cols">
    <div class="side"><span class="compose">✎ Compose</span><span class="here">Inbox <b>${S.mails.length || ''}</b></span><span>Starred</span><span>Sent</span><span>Drafts</span></div>
    <div class="body"><table>${S.mails.map(m => `<tr><td><b>${esc(m.from)}</b></td><td>${esc(m.subject)}</td><td class="meta">${m.when}</td></tr>`).join('') || '<tr><td>No mail. Not even spam.</td></tr>'}</table></div></div>`;
  if (app === 'Pics') return `<div class="top">${APP_ICON.Pics}<b class="logo">Instaglum</b></div><div class="body">
    <div class="prof"><span class="ring"><span>Z</span></span><div><b>zafira_pain</b><div class="meta">4 posts · 2 followers (Mum, Gaz)</div></div></div>
    <div class="grid"><div style="--p:#4a5a60" title="dash_light.jpg"></div><div style="--p:#5a4a40" title="IMG_0042.jpg"></div><div style="--p:#6a6050" title="part_number_blurry.jpg"></div><div style="--p:#3a4448" title="thumb.jpg"></div></div>
    <div class="meta">dash_light.jpg · IMG_0042.jpg · part_number_blurry.jpg · thumb.jpg</div></div>`;
  if (app === 'MegaMart') return `<div class="top">${APP_ICON.MegaMart}<b class="logo">zamanon</b><span class="search">car code reader</span><span class="sbtn">🔍</span></div><div class="body"><table>
    ${product('reader-cheap', '<span class="stars">★★★★☆</span> · *not all cars · FREE delivery tomorrow')}
    ${true ? product('headlight-zam', '<span class="stars">★★★★☆</span> · *check your side · arrives tomorrow') : ''}
    ${findJob('new-sensor') ? product('part-mega', '<span class="stars">★★★☆☆</span> "fits all models*" · *not all models · arrives tomorrow') : ''}
    <tr><td>Universal Car Sensor Fits All Models 2005 2006 2007 Zafira Astra Golf Tractor<br><span class="meta">Sponsored</span></td><td>£24.99</td><td class="red">Unavailable</td></tr></table></div>`;
  if (app === 'eBuy') return `<div class="top"><b class="logo"><i style="color:#e53238">T</i><i style="color:#0064d2">h</i><i style="color:#f5af02">ee</i><i style="color:#86b817">Bay</i></b><span class="search">zafira code reader</span><span class="sbtn">Search</span></div><div class="body"><table>
    ${product('reader-good', 'Used · "works fine (I think)" · arrives in 2 days')}
    ${true ? product('headlight-bay', 'Used · "fits Zafira A" · arrives in 2 days') : ''}
    <tr><td>ZAFIRA GEARBOX SENSOR WORKING WHEN REMOVED (I THINK)<br><span class="meta">Collection only, Aberdeen</span></td><td>£0.99</td><td class="red">Collection only</td></tr>
    <tr><td>Job lot of car sensors (approx 300) no idea what from<br><span class="meta">No returns</span></td><td>£45.00</td><td class="red">Too far</td></tr></table></div>`;
  return `<div class="top">${APP_ICON.TechDocs}<b class="logo">Wonkypedia</b><span class="meta">The free car manual that anyone can make worse</span></div><div class="cols">
    <div class="side"><span>Main page</span><span>Random fault</span><span>Help</span><span>Talk</span></div><div class="body">
    <h2>SB-0471/09 Rev C — TCM DTC P0705/P0706 sporadic, MY 03–05, see note 4</h2>
    <div class="meta">From Wonkypedia. This article is superseded by Rev B. [citation needed]</div>
    <p><b>1.</b> With KL15 ON and KL50 OFF, measure resistance between X12/3 (BK/WH) and X12/7 (BU/RD). Specified value: 4.7 kΩ ± 12% (see table 9, not included).</p>
    <p><b>2.</b> If value is within specification, continue at step 4. If not, continue at step 2.</p><p><b>3.</b> Step deleted.</p>
    <p class="red">Diagram 12 of 12 failed to load.</p><p><button data-act="readdocs">Try to make sense of it (20 min)</button></p>
    ${leadExists('fusediagram') ? `<h2>Fuse box (engine bay) — allocation, MY 03–05</h2><table>
      <tr><td>F21</td><td>Infotainment / ICM (KL30)</td></tr><tr><td>F22</td><td>B+ ECM/PCM (see table 4-2)</td></tr>
      <tr><td>F23</td><td>IPC / TCM sensor supply (KL15/R)</td></tr><tr><td>F24</td><td>— (MX7 only)</td></tr>
      <tr><td>F25</td><td>X13/4 → K38 (relay, see SB-0119)</td></tr><tr><td>F26</td><td>ABS/ESP (except M32, see F26a)</td></tr>
      <tr><td>F27–28</td><td>Spare</td></tr><tr><td>F29</td><td>Not used* (*used)</td></tr></table>
      <p><button data-act="fusenote">Note it down (20 min)</button></p>` : ''}</div></div>`;
}
// A product row with a Buy button
function product(id, extra) {
  const it = ITEMS[id], ordered = S.flags['ordered-' + id];
  return `<tr><td>${esc(it.name)}<br><span class="meta">${extra}</span></td><td>£${it.price.toFixed(2)}</td><td>${ordered ? 'Ordered' : `<button data-act="buy:${id}">Buy</button>`}</td></tr>`;
}

// =====================================================================
// THE PHONE
// =====================================================================
SCREENS.phone = {
  size: [480, 270],
  paint() {
    paintBehind();                                                   // over whatever you were looking at
    rect(168, 9, 144, 255, C.greyDark); rect(171, 12, 138, 249, C.ink); rect(225, 17, 30, 3, C.grey);
  },
  overlay() {
    const msgs = S.msgs.map(m => `<div class="m"><em>${esc(m.when.split('   ')[0])}</em><b>${esc(m.from)}</b>${esc(m.body)}</div>`).join('') || '<div class="m">No messages.</div>';
    return `<div class="ov phoneoff" data-act="phoneaway"></div><div class="ov ph"><div class="msgs">${msgs}</div>
      <div class="tabs"><div data-act="ring:Gaz">Ring Gaz</div><div data-act="ring:Mum">Ring Mum</div><div data-act="ring:Brother">Ring Brother</div><div data-act="ring:Wife">Ring the wife</div><div data-act="phonetorch" class="${S.flags.phoneTorch ? 'on' : ''}">🔦 Torch ${S.flags.phoneTorch ? 'off' : 'on'}</div></div></div>`;
  },
  actions() { return []; }
};

// =====================================================================
// THE NOTEBOOK: jobs as a tree, with notes and leads
// =====================================================================
SCREENS.notebook = {
  size: [480, 270],
  paint() {
    paintBehind();                                                   // over whatever you were looking at
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
    return `<div class="ov nb"><div class="cols">${html}</div></div>`
      + '<button class="ov nbflip prev" data-act="nbpage:-1">◀</button><button class="ov nbflip next" data-act="nbpage:1">▶</button>';
  },
  // the notebook runs onto more pages: show two at a time, ◀ ▶ to leaf through
  after() {
    const cols = stage.querySelector('.nb .cols');
    if (!cols) return;
    const gapText = getComputedStyle(cols).columnGap;                 // the gap between pages (it may be given in %)
    const gap = gapText.endsWith('%') ? parseFloat(gapText) / 100 * cols.clientWidth : parseFloat(gapText);
    const spread = cols.clientWidth + gap;                             // two pages and the gap to the next two
    const spreads = Math.max(1, Math.round((cols.scrollWidth + gap) / spread));
    S.nbPage = Math.max(0, Math.min(spreads - 1, S.nbPage || 0));
    cols.scrollLeft = S.nbPage * spread;
    stage.querySelector('.nbflip.prev').hidden = S.nbPage === 0;
    stage.querySelector('.nbflip.next').hidden = S.nbPage >= spreads - 1;
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
    onLeft(0, 104, 168, 74, 81, C.white); onLeft(0, 105, 167, 75, 80, skyColour());   // a high window: you can see if it's dark outside
    for (let x = 104; x < 170; x += 5) for (let z = 40; z < 68; z += 5) { const p = P(x, 0, z); px(p[0], p[1], C.pegHole); }
    for (const [x, len] of [[106, 20], [112, 16], [118, 22], [124, 14]]) line(...P(x, 0, 64), ...P(x, 0, 64 - len), C.tool);
    onLeft(0, 132, 148, 56, 60, C.tool); onLeft(0, 138, 141, 44, 56, C.tool);
    for (const z of [24, 50]) ibox(0, 18, 14, 96, z - 2, z, C.wood);
    const spines = [C.red, C.car, C.warm, C.tree2, C.red, C.white, C.car, C.warm, C.redDim, C.tree1, C.car, C.red, C.warm, C.white];
    for (let k = 0; k < 14; k++) ibox(0, 20 + k * 5, 10, 24 + k * 5, 50, 60 + Math.floor(hash(k, 3) * 5), spines[k]);
    ibox(0, 20, 12, 38, 24, 36, CARDBOARD); ibox(0, 42, 12, 58, 24, 33, CARDBOARD); ibox(0, 62, 12, 92, 24, 38, CARDBOARD);
    garageShelves();                                                     // shelves next to the tool chest: what you've bought
    ibox(60, 0, 86, 18, 0, 40, C.red); ibox(60, 0, 86, 18, 40, 50, C.red);
    for (const z of [8, 16, 24, 32, 44]) onLeft(18, 62, 84, z, z + 1, C.redDim);
    ibox(98, 0, 176, 26, 0, 28, C.bench, C.benchTop);
    ibox(102, 4, 112, 14, 28, 36, C.tool);
    ibox(124, 4, 140, 16, 28, 29, C.grey); onLeft(4, 124, 140, 29, 40, C.grey); onLeft(4, 125, 139, 30, 39, C.winGlass);
    ibox(150, 4, 172, 16, 28, 38, C.red); line(...P(156, 10, 41), ...P(166, 10, 41), C.ink);
    if (S.flags.screwsSpilt && !S.flags.n3found) for (let n = 0; n < 60; n++) { const p = P(100 + hash(n, 9) * 70, 30 + hash(9, n) * 30); px(p[0], p[1], C.steel); }
    ibox(0, 104, 18, 122, 0, 12, CARDBOARD); ibox(2, 106, 16, 120, 12, 22, CARDBOARD); ibox(0, 124, 16, 138, 0, 10, CARDBOARD);
    isoCar(40, 46, 1.25);
    for (const [wx, wy] of [[83, 61], [91, 61], [83, 85], [91, 85]]) { const w = P(wx, wy, 0.6); ellipse(w[0], w[1], 2, 1, C.tyre); }   // the creeper's little wheels
    ibox(82, 60, 92, 86, 1, 3, C.red);
    standingMan('garage');
    spot('Toolbox', isoArea(60, 0, 86, 18, 0, 50), 'toolbox', [73, 26]);
    spot('Shelves: what you\'ve bought', isoArea(2, 0, 56, 10, 0, 78), 'stores', [30, 24]);
    spot('Workbench', isoArea(98, 0, 176, 26, 0, 40), 'bench', [132, 34]);
    spot('Manuals', isoArea(0, 18, 14, 96, 50, 66), 'shelf', [22, 56]);
    spot('Parts boxes', isoArea(0, 104, 18, 138, 0, 22), 'partsbox', [26, 118]);
    spot('Driver\'s seat', isoArea(40, 58, 70, 88, 16, 28), 'dash', [78, 70]);
    spot('Bonnet', isoArea(40, 90, 70, 104, 4, 20), 'bonnet', [56, 112]);
    spot('Under the car (creeper)', isoArea(80, 58, 94, 88, 0, 4), 'under', [96, 80]);
    exitDoor(140, [136, 168, 52]);                                    // the way out: a see-through door in the near wall
    spot('Door: leave', isoArea(136, 136, 168, 140, 0, 52), 'home', [150, 128]);
    if (wifeInGarage()) spot('Talk to the wife', isoArea(WIFE_IN_GARAGE[0] - 4, WIFE_IN_GARAGE[1] - 4, WIFE_IN_GARAGE[0] + 4, WIFE_IN_GARAGE[1] + 4, 0, 40), 'act:wife', [160, 48]);
    // look under things (any time, not just while the nut is lost): dark, unless you've a light
    spot('Look under the shelves', isoArea(2, 0, 56, 12, 0, 6), 'act:search:the shelves', [30, 24]);
    spot('Look under the tool chest', isoArea(60, 0, 86, 20, 0, 6), 'act:search:the tool chest', [73, 28]);
    spot('Look under the workbench', isoArea(98, 0, 176, 28, 0, 6), 'act:search:the workbench', [132, 36]);
    spot('Look under the car', isoArea(40, 50, 70, 100, 0, 4), 'act:search:the car', [34, 70]);
    spot('Look under the parts boxes', isoArea(18, 104, 23, 138, 0, 3), 'act:search:the parts boxes', [26, 118]);   // the floor along their front, so the boxes themselves still open
    hud();
  },
  actions() {
    return [];                                                         // everything is in the picture: tap it
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
    if (!S.flags.boxOff || S.flags.fitted) { disc(352, 98, 5, S.flags.fitted ? SENSOR_COLOUR['part-p4l'] : C.ink); px(351, 96, C.white); }   // the sensor (in its box), unless the box is off
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
    const f = S.flags;
    const boxOn = !f.boxOff || f.fitted;                                                   // the box the sensor sits in: on the car, or on the workbench
    if (boxOn) {
      rbox(176, 104, 140, 72, 18, shade(ALLOY, 0.8));                                      // the box
      rect(184, 106, 124, 1, shade(ALLOY, 1.15));                                          // its top edge catching the light
      disc(246, 140, 30, SENSOR_COLOUR[f.fitted ? 'part-p4l' : 'old-sensor']); ring(246, 140, 30, C.greyDark);   // the same colour as on the workbench ring(246, 140, 22, shade(BLACKPART, 1.6)); disc(240, 134, 6, shade(BLACKPART, 1.5));   // the sensor in it
    } else {
      rbox(176, 104, 140, 72, 18, shade(ALLOY, 1.08));                                     // a clean patch where the box sat
      grime(176, 104, 140, 4, shade(ALLOY, 0.5), 0.35, 23); grime(176, 172, 140, 4, shade(ALLOY, 0.5), 0.35, 24);   // a line of muck round its edge
      disc(246, 140, 9, C.ink); ring(246, 140, 9, C.greyDark);                              // the hole the sensor's nose went into
    }
    const hole = (x, y) => { disc(x, y, 7, C.ink); ring(x, y, 7, C.greyDark); ring(x, y, 4, shade(C.greyDark, 1.3)); };
    if (!f.b1 || f.fitted) bolt(194, 120, 8); else hole(194, 120);
    if (f.fitted || !f.b2) bolt(298, 164, 8, f.b2round && !f.fitted); else hole(298, 164);
    if (f.fitted || !f.n3lost) bolt(194, 162, 7); else hole(194, 162);
    if (boxOn) { rbox(276, 128, 52, 24, 4, hex('#30302c')); rect(282, 124, 20, 6, C.warm); rect(286, 122, 12, 2, C.warm); }   // the connector, plugged in
    else rbox(322, 130, 14, 18, 3, hex('#30302c'));                                        // unplugged: just the end of the loom
    SENSOR_WIRES.forEach((col, k) => pipe(328, 134 + k * 6, 470, 112 + k * 6, 4, col));   // the loom: red, yellow, green
    for (const x of [360, 400, 440]) pipe(x, 122 + (440 - x) * 0.05, x + 8, 120 + (440 - x) * 0.05, 22, hex('#1c1c1c'));
    for (let y = 18; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - 250, (y - 140) * 1.2), k = d < 110 ? 1.12 : Math.max(0.45, 1.12 - (d - 110) / 220);
      const i = (y * W + x) * 4; img.data[i] *= k; img.data[i + 1] *= k; img.data[i + 2] *= k;
    }
    const zoomTip = !f.sensorJob ? 'The gearbox. Lots of bolts. Which bit matters?' : boxOn ? 'The sensor sits in a box: 2 bolts and a nut hold the box on.' : 'The box is off. It\'s on the workbench.';
    tip('Under the car › Gearbox', zoomTip, 1, 8);
    hud();
  },
  actions() {
    const f = S.flags, a = [];
    if (f.sensorJob && !f.boxOff) {                                    // the box (sensor and all) is still on the car
      if (!f.b1) a.push({ label: 'Undo bolt 1', act: 'bolt1' });
      if (!f.b2) a.push({ label: f.b2round ? 'Try bolt 2 again' : 'Undo bolt 2', act: 'bolt2' });
      if (f.b2round && !f.b2 && (S.inv['extractor-cheap'] || S.inv['extractor-good'])) a.push({ label: 'Use the extractor on bolt 2', act: 'extract' });
      if (!f.n3lost) a.push({ label: 'Undo nut 3', act: 'nut3' });
      a.push({ label: 'Take the box off (sensor and all)', act: 'pull' });
    }
    if (f.boxOff && !f.fitted) a.push({ label: 'Fit the box back on', act: 'fit' });
    if (leadOpen('loom')) a.push({ label: 'Check the wiring', act: 'wiring' });
    a.push({ label: 'Zoom out', act: 'go:under' });
    return a;
  }
};

// =====================================================================
// UNDER THE BONNET, and the fuse box close up
// =====================================================================
// The battery's two terminals (+ red, − black) and their leads: on the posts, or lifted off and lying beside them
const BATTERY_POST = { plus: [364, 96], minus: [406, 96] };
const BATTERY_LEAD_COL = { plus: C.red, minus: C.ink };
const batteryLeadOn = side => !S.battery || S.battery[side] !== false;
// Is there power in the car? (both leads on)
const carPowered = () => batteryLeadOn('plus') && batteryLeadOn('minus');
function batteryLeads() {
  for (const side of ['plus', 'minus']) {
    const [x, y] = BATTERY_POST[side], col = BATTERY_LEAD_COL[side], on = batteryLeadOn(side);
    rect(x - 2, y - 2, 4, 4, C.steel2);                                         // the post
    if (on) {
      rect(x - 6, y - 4, 12, 8, col);                                            // the clamp, on the post
      pipe(x, y - 4, x + 10, y - 40, 4, col);                                    // its cable, up and away from the brake fluid
    } else {
      rect(x + 4, y - 24, 12, 8, col);                                           // lifted off, to one side
      pipe(x + 10, y - 24, x + 14, y - 46, 4, col);
    }
    text(side === 'plus' ? '+' : '-', x - 2, y + 6, C.white);
  }
}
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
    rbox(354, 98, 64, 46, 4, hex('#1c1c1c')); batteryLeads();
    rbox(352, 152, 68, 56, 4, hex('#202020'));
    for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { const fc = FUSECOLS[(r * 6 + k * 5) % 5][0]; rect(358 + k * 10, 158 + r * 12, 7, 9, fc); rect(360 + k * 10, 160 + r * 12, 3, 2, shade(fc, 0.7)); }
    rbox(64, 166, 56, 50, 10, hex('#e4e0d4')); rect(68, 190, 48, 22, hex('#e080a0')); disc(92, 166, 8, C.warm); text('MAX', 70, 186, C.ink);
    disc(420, 222, 7, C.car); ring(420, 222, 7, C.carDark);
    for (const [x0, y0, x1, y1] of [[160, 160, 340, 170], [330, 170, 352, 180], [322, 120, 354, 120]]) pipe(x0, y0, x1, y1, 4, C.ink);
    for (let x = 180; x < 330; x += 22) rect(x, 158, 3, 10, hex('#3a3a3a'));
    zoomZones([['Fuse box', 348, 148, 76, 64, true, 'fuseZoom'], ['Battery', 350, 106, 72, 40, false, 'act:look:Battery'], ['Engine', 170, 74, 154, 124, false, 'act:look:Engine'], ['Air filter', 58, 66, 106, 88, false, 'act:look:Air filter'], ['Coolant', 60, 160, 64, 60, false, 'act:look:Coolant'], ['Brake fluid', 326, 58, 34, 36, false, 'act:look:Brake fluid']]);
    for (const side of ['plus', 'minus']) {                                     // each lead comes off (and goes back on) by itself
      const [x, y] = BATTERY_POST[side], on = batteryLeadOn(side);
      spot((side === 'plus' ? '+ lead' : '− lead') + (on ? ': take it off' : ': put it back on'), [x - 4, y - 26, 22, 34], 'act:batlead:' + side);
    }
    hud();
  },
  actions() {
    const a = [{ label: 'Zoom in: fuse box', act: 'go:fuseZoom' }];
    const spares = spareLamps(), smashed = brokeOpen('headlight') || brokeOpen('headlight2');
    if (smashed && (spares.left || spares.right)) a.push({ label: 'Fit a new headlight', act: 'fitlight' });   // from the shelf (it might be the wrong side)
    a.push({ label: 'Close the bonnet', act: 'go:garage' });
    return a;
  }
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
// Where things are on the dashboard (it's a right-hand drive car: the driver's door is on the right)
//   the two dials (centre height, x of each, radius) and the warning lights between them
const DASH = { y: 150, mph: 123, rpm: 215, r: 29, gear: [169, 126], engine: [169, 141], abs: [169, 157], battery: [161, 173], oil: [179, 173] };
const WHEEL = [169, 262];                                  // the middle of the steering wheel
const HORN = [146, 232, 46, 30];                           // the horn pad in the middle of the wheel
const IGNITION = [290, 200];                               // the key
const RADIO_BUTTONS = [330, 358, 386];                     // x of the radio's three buttons: ◀, the middle one, ▶
const DOOR_HANDLE = [434, 136, 38, 18];                    // the handle inside the driver's door
const STREET_VIEW = { x0: 58, x1: 400, y0: 42, y1: 108 };  // the open garage doorway, seen through the windscreen

// A dial's needle at angle a (its face is wiped first, so it can be redrawn as it moves), and its label
function dialNeedle(cx, a) {
  disc(cx, DASH.y, Math.round(DASH.r * 0.75), hex('#0e0f11'));                                     // wipe the face inside the marks
  text(cx === DASH.mph ? 'MPH' : 'RPM', cx - 6, DASH.y + 12, C.dim);                                // its label
  const len = DASH.r * 0.72;                                                                         // the needle reaches nearly to the marks
  line(cx, DASH.y, cx + Math.cos(a) * len, DASH.y + Math.sin(a) * len, C.red);                      // the needle
  disc(cx, DASH.y, 3, C.steel2);                                                                     // its middle
}

// The hatch under the steering wheel: shut, or open on the diagnostic port
function obdHatch(open) {
  if (!open) {
    rbox(58, 220, 36, 30, 3, hex('#34363b'));                                                       // the panel
    rect(60, 221, 32, 1, hex('#44464c'));                                                           // its top edge catches the light
    rect(72, 245, 8, 2, hex('#1a1b1e'));                                                            // a notch to pull it off by
    return;
  }
  rect(58, 220, 36, 30, hex('#0c0c0e'));                                                            // the hole behind it
  rect(58, 250, 36, 5, hex('#34363b'));                                                             // the panel, hanging down
  poly([[64, 229], [88, 229], [85, 241], [67, 241]], hex('#26272b'));                               // the port: a flat D shape
  for (let k = 0; k < 8; k++) {
    px(67 + k * 2.6, 232, C.steel);                                                                  // its top row of pins
    px(68.5 + k * 2.2, 237, C.steel);                                                                // and its bottom row (16 in all)
  }
}

// The accelerator pedal in its footwell; down = being pressed
function accelPedal(down) {
  const d = down ? 4 : 0;                                                                            // pressed: it moves down a little
  rbox(246, 220, 40, 50, 6, hex('#1a1b1e'));                                                        // the footwell
  pipe(266, 220, 265, 236 + d, 3, C.steel2);                                                        // the pedal's arm
  rbox(254, 234 + d, 24, 30, 4, hex('#3a3c40'));                                                    // the pedal
  for (let y = 238 + d; y < 262 + d; y += 4) rect(257, y, 18, 1, hex('#26272b'));                   // its rubber ridges
}

// The driver's door, on the right: its window (the garage wall outside), the handle, the armrest, a speaker
function driverDoor() {
  poly([[404, 18], [428, 18], [440, 106], [420, 106]], hex('#2a2c30'));                             // the pillar between windscreen and door
  for (let k = 0; k < 3; k++) line(452 + k * 10, 24, 444 + k * 10, 98, shade(C.concrete, 0.72));   // streaks of light on the window
  rect(432, 98, 48, 8, hex('#1c1d20'));                                                             // the bottom of the window frame
  rect(420, 106, 60, H - 106, hex('#26282c'));                                                      // the door's trim panel
  grime(421, 106, 59, H - 106, hex('#26282c'), 0.1, 56);
  rect(420, 106, 1, H - 106, hex('#101012'));                                                       // the gap where the door shuts
  rbox(426, 110, 50, 12, 4, hex('#303236'));                                                        // the top of the door, under the window
  const [hx, hy, hw, hh] = DOOR_HANDLE;
  rbox(hx, hy, hw, hh, 5, hex('#141518'));                                                          // the handle's recess
  rbox(hx + 4, hy + 5, hw - 10, 7, 3, C.steel2);                                                    // the handle
  rect(hx + 6, hy + 6, hw - 14, 1, C.steel);                                                        // its shine
  rbox(424, 174, 56, 12, 4, hex('#333539'));                                                        // the armrest
  for (let y = 204; y < 246; y += 4) for (let x = 434; x < 472; x += 4) px(x, y, hex('#141518'));   // the speaker grille
  rect(424, 252, 56, 14, hex('#1e1f22'));                                                           // the door pocket
}

// The radio's screen
//   locked:   CODE, and under it the four places of the code (the one picked with ◀ ▶ lit up)
//   unlocked: the time (24 hour), or the station playing
function radioScreenHtml() {
  const R = radioState();
  if (!R.unlocked) {
    const places = R.digits.map((d, k) => {
      const shown = d === null ? '_' : String(d);                                                    // a place not set yet shows _
      if (k === R.pos) return `<span class="hi">${shown}</span>`;                                    // light up the picked one
      return shown;
    });
    return `<div class="top">CODE</div><div class="big">${places.join(' ')}</div>`;
  }
  if (!R.on) return `<div class="big">${hhmm(S.mins)}</div>`;                                        // off: just the clock
  const st = STATIONS[R.station];                                                                    // on: the station playing
  return `<div class="top">FM ${R.station + 1} ♪</div><div class="big">${st.name}</div>`;
}

// Out of the windscreen: the garage door is up, so you see the street (cars and people go by in life.js)
function dashStreet() {
  const V = STREET_VIEW;
  rect(0, 18, W, 92, hex('#b8c8d8'));                                                               // the sky
  for (let k = 0; k < 7; k++) {                                                                      // the terraced houses over the road
    const hx = V.x0 - 30 + k * 58;
    rect(hx + 44, 44, 6, 6, C.brickLine);                                                            // chimney
    poly([[hx, 58], [hx + 58, 58], [hx + 50, 48], [hx + 8, 48]], k % 2 ? C.roof : C.roofLine);      // slate roof
    rect(hx, 58, 58, 26, k % 2 ? C.brick : shade(C.brick, 0.9));                                     // brick front
    for (const wx of [6, 40]) { rect(hx + wx, 62, 12, 9, C.white); rect(hx + wx + 1, 63, 10, 7, C.winGlass); }   // windows
    rect(hx + 24, 69, 10, 15, [C.door, C.redDim, C.tree2][k % 3]);                                   // front door
  }
  rect(0, 84, W, 4, C.drive);                                                                        // the pavement over the road
  rect(0, 88, W, 1, C.steel2);                                                                       // its kerb
  rect(0, 89, W, 13, C.road);                                                                        // the road
  for (let x = 0; x < W; x += 16) rect(x, 95, 8, 1, C.white);                                        // the white line down the middle
  rect(0, 102, W, 8, C.drive);                                                                       // this side's pavement and the drive
  // inside the garage, either side of the doorway; the door rolled up into its drum at the top
  grime(0, 18, V.x0, 92, shade(C.concrete, 0.55), 0.12, 54);
  grime(V.x1, 18, W - V.x1, 92, shade(C.concrete, 0.55), 0.12, 55);
  rect(V.x0 - 3, V.y0, 3, V.y1 - V.y0, hex('#5a5c62')); rect(V.x1, V.y0, 3, V.y1 - V.y0, hex('#5a5c62'));   // the doorway's edges
  rect(0, 32, W, 10, hex('#4a4c52'));                                                                // the rolled-up door
  for (let x = 0; x < W; x += 6) rect(x, 33, 1, 8, hex('#3a3c42'));                                  // its slats
}

SCREENS.dash = {
  size: [480, 270],
  paint() {
    dashStreet();                                                                            // out of the windscreen: the open garage, the street
    // the car's roof lining and the left windscreen pillar (it leans in at the top)
    grime(0, 18, W, 14, hex('#3a3c40'), 0.1, 53);
    poly([[0, 18], [46, 18], [18, 106], [0, 106]], hex('#2a2c30'));
    // the rear-view mirror, hanging from the roof
    rect(198, 32, 4, 5, hex('#1c1d20')); rbox(174, 36, 52, 13, 4, hex('#1c1d20')); rect(178, 39, 44, 7, hex('#5a6878'));
    // the dashboard
    for (let x = 0; x < W; x++) { const top = 100 + Math.round(10 * Math.cos((x - 240) / 160)); rect(x, top, 1, H - top, hex('#2c2e33')); }
    grime(0, 112, W, 158, hex('#2c2e33'), 0.12, 52);
    // the instruments: two dials, the warning lights between them
    rbox(76, 112, 186, 78, 16, hex('#18191c'));
    for (const cx of [DASH.mph, DASH.rpm]) {
      disc(cx, DASH.y, DASH.r, hex('#0e0f11')); ring(cx, DASH.y, DASH.r, C.steel2);
      for (let a = 2.4; a < 7.1; a += 0.39) line(cx + Math.cos(a) * DASH.r * 0.83, DASH.y + Math.sin(a) * DASH.r * 0.83, cx + Math.cos(a) * DASH.r * 0.94, DASH.y + Math.sin(a) * DASH.r * 0.94, S.key >= 1 && carPowered() ? C.ui : C.dim);
      dialNeedle(cx, 2.5);
    }
    const on = S.key >= 2 && carPowered();                           // no power (a battery lead off): nothing lights
    const check = on && !S.flags.running;                            // key at II: every bulb lights to show it works; running: they go out
    warnLight(...DASH.gear, 'gear', C.red, on && !S.flags.fitted);   // …except the red one
    warnLight(...DASH.engine, 'engine', C.warm, check);
    warnLight(...DASH.battery, 'battery', C.red, check); warnLight(...DASH.oil, 'oil', C.red, check);
    warnLight(...DASH.abs, 'abs', C.warm, on && !!S.flags.fitted);
    // the steering wheel, the horn (a little trumpet) in the middle
    const [wx, wy] = WHEEL;
    for (let r = 64; r < 74; r++) ring(wx, wy, r, r < 66 || r > 71 ? hex('#121214') : hex('#1c1d20'));
    pipe(wx - 59, 252, wx + 59, 252, 10, hex('#1c1d20')); rbox(...HORN, 8, hex('#1c1d20')); disc(wx, 246, 6, C.steel2);
    poly([[wx - 9, 243], [wx - 3, 243], [wx + 7, 238], [wx + 7, 254], [wx - 3, 249], [wx - 9, 249]], C.dim);
    // the hatch under the steering wheel: shut, or open on the diagnostic port
    obdHatch(!!S.flags.hatch);
    // the accelerator pedal, down in the footwell
    accelPedal(false);
    // the key turned to its position
    const [kx, ky] = IGNITION;
    disc(kx, ky, 10, C.steel2); disc(kx, ky, 6, hex('#18191c')); ring(kx, ky, 13, C.dim);
    const ang = [-1.57, -0.9, -0.3, 0.2][S.key];
    pipe(kx, ky, kx + Math.cos(ang + 1.57) * 22, ky + Math.sin(ang + 1.57) * 22, 3, C.steel);
    text('0 I II III', kx - 18, ky - 18, C.dim);
    // the radio: its screen, and three buttons (the outside two are arrows)
    rbox(312, 114, 96, 62, 6, hex('#18191c')); rect(320, 120, 80, 30, hex('#0a2a20'));
    for (const x of RADIO_BUTTONS) disc(x, 160, 6, C.steel2);
    const [bl, bm, br] = RADIO_BUTTONS;
    poly([[bl - 4, 160], [bl + 3, 156], [bl + 3, 164]], hex('#18191c'));                    // ◀
    poly([[br + 4, 160], [br - 3, 156], [br - 3, 164]], hex('#18191c'));                    // ▶
    // the hazard lights switch, and the heater knobs
    rbox(344, 184, 34, 22, 4, hex('#18191c')); poly([[361, 188], [370, 202], [352, 202]], C.red); poly([[361, 193], [366, 200], [356, 200]], hex('#18191c'));
    for (const x of [330, 360, 390]) { disc(x, 232, 11, hex('#18191c')); ring(x, 232, 11, C.steel2); line(x, 232, x + 5, 224, C.white); }
    // the driver's door, on the right
    driverDoor();
    // the code reader, when it's plugged in: on its lead from the port
    if (S.flags.readerIn) {
      rbox(2, 160, 54, 96, 8, hex('#d0a020')); rect(7, 168, 44, 40, hex('#0a2a20'));
      for (const [x, y] of [[8, 216], [30, 216], [8, 234], [30, 234]]) rbox(x, y, 18, 12, 3, hex('#3a3a3a'));
      pipe(56, 226, 76, 236, 4, C.ink);                                                     // its lead, into the port
      LABELS.push(`<div class="scr" style="left:${8 / W * 100}%;top:${169 / H * 100}%;width:${42 / W * 100}%;height:${38 / H * 100}%">${S.key >= 2 && carPowered() ? '2 codes found<br><b>P0705</b> Trans. range sensor circ. malf.<br><b>P0706</b> Range/perf.' : 'NO POWER'}</div>`);
    }
    if (S.key >= 1 && carPowered()) LABELS.push(`<div class="scr radio" style="left:${321 / W * 100}%;top:${121 / H * 100}%;width:${78 / W * 100}%;height:${28 / H * 100}%">${radioScreenHtml()}</div>`);
    // what you can tap
    spot('Horn', HORN, 'act:horn');
    spot(S.flags.running ? 'Turn the key: switch off' : ['Turn the key to I', 'Turn the key to II', 'Turn the key: start it'][S.key] || 'Key', [kx - 16, ky - 16, 36, 32], 'act:turnkey');
    spot('Accelerator', [248, 222, 36, 46], 'act:pedal');
    spot(S.flags.hatch ? 'Diagnostic port' : 'Hatch under the wheel', [58, 220, 36, 30], 'act:hatch');
    const below = 'transform:translate(-50%,3.6cqw)';                                    // radio names show under the buttons, not over the code
    spot('Radio: left', [bl - 7, 153, 14, 14], 'act:radio:-1', null, below);
    spot(radioState().unlocked ? 'Radio: on / off' : 'Change the number', [bm - 7, 153, 14, 14], 'act:radio:0', null, below);
    spot('Radio: right', [br - 7, 153, 14, 14], 'act:radio:1', null, below);
    spot('Door handle: get out', DOOR_HANDLE, 'garage');
    tip("Driver's seat", S.flags.running ? 'Engine running.' : ['Key at 0: off. Tap the key to turn it.', 'Key at I: radio on.', 'Key at II: dash lights on. Tap again to start.', ''][S.key], 1, 8);
    hud();
  },
  actions() {
    const a = [];
    if (S.inv['reader-good']) a.push({ label: 'Plug in your code reader', act: 'plug:good' });
    if (S.inv['reader-old']) a.push({ label: "Plug in Gaz's reader", act: 'plug:old' });
    if (S.flags.codes) a.push({ label: 'Clear the codes', act: 'clear' });
    a.push({ label: 'Sit and think (1 hour)', act: 'think' });
    return a;
  }
};

// =====================================================================
// THE WORKBENCH: try the new part in the hole
// =====================================================================
// The 3 screws holding the old sensor in the box: where each sits on the box's top (iso x, y)
const BOX_SCREWS = { 1: [130, 118], 2: [128, 70], 3: [68, 122] };
// Is the box on the workbench? Only once it's off the car, and until it goes back on
const boxOnBench = () => !!S.flags.boxOff && !S.flags.fitted;
// Draw the box's screws: in (a slotted head, tap to undo), out (an empty hole) or snapped (a bright stub)
function benchScrews(f) {
  const out = f.screws || [];                                          // the screws undone so far
  for (const n of [1, 2, 3]) {
    const [x, y] = BOX_SCREWS[n];
    const c = P(x, y, 40);                                             // on the box's top face
    if (f.sheared === n) {                                             // snapped off: the stub, shiny where it broke
      disc(c[0], c[1], 2, C.white); ring(c[0], c[1], 3, C.greyDark);
      continue;
    }
    if (out.includes(n)) {                                             // out: just its hole
      disc(c[0], c[1], 2, C.ink);
      continue;
    }
    disc(c[0], c[1], 4, C.steel); ring(c[0], c[1], 4, C.greyDark);    // in: a screw head with its slot
    line(c[0] - 3, c[1] + 1, c[0] + 3, c[1] - 1, C.greyDark);
    if (!f.sensorOut) spot(`Screw ${n}`, isoArea(x - 5, y - 5, x + 5, y + 5, 38, 44), `act:screw:${n}`);
  }
}
// The hint at the top of the workbench: what's on it and what state it's in
function benchTip(f, boxHere, b) {
  if (!boxHere) return f.fitted ? 'Nothing to work on. The box is back on the car.' : 'Nothing to work on yet. The sensor is still on the car, in its box.';
  if (!f.sensorOut) return f.sheared ? 'Two screws out, one snapped off. Lift the old sensor out.' : 'The box, with the old sensor screwed into it. 3 screws.';
  if (!b) return 'The empty box. Pick a part to try in its hole.';
  return ({ over: 'Held over the hole.', stuck: 'Stuck halfway.', in: 'It\'s in!' })[b.state] + (b.rotated ? ' Pins lined up.' : '');
}
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
    const f = S.flags;
    const boxHere = boxOnBench();                                      // the box is only here once it's off the car (and until it goes back on)
    const b = boxHere ? S.bench : null;                                // the part being tried in the box's hole
    if (boxHere) {
      // the box the sensor sits in, with its round hole
      ibox(60, 60, 140, 130, 0, 40, C.steel2, C.steel);
      const h = P(100, 95, 40);
      ellipse(h[0], h[1], 20, 10, C.greyDark); ellipse(h[0], h[1] + 2, 17, 7, C.ink);
      rect(h[0] - 23, h[1] - 1, 5, 3, C.ink); rect(h[0] + 19, h[1] - 1, 5, 3, C.ink);
      benchScrews(f);                                                  // its 3 screws: in, out, or snapped off
      const lifting = ANIM && ANIM.kind === 'benchLift';               // the old sensor being lifted out draws itself
      if (!f.sensorOut && !lifting) benchPart({ part: 'old-sensor', rotated: true }, LIFT.in, 0);   // the old sensor, still screwed in
      if (!f.sensorOut) spot('The old sensor: lift it out', isoArea(86, 82, 114, 108, 40, 90), 'act:boxout');
      // the part being tried: held over the hole, stuck halfway, or in
      const moving = ANIM && ANIM.kind.startsWith('bench');            // while a moment moves the part, it draws it
      if (b && !moving) benchPart(b, LIFT[b.state], 0);
      ISO.ox = 240; ISO.oy = 64;
    }
    const holdingOld = b && b.part === 'old-sensor';                   // it's in your hand, over the box
    if (S.inv['old-sensor'] && !holdingOld) {                          // the old sensor, standing on the bench (just as it looked under the car): tap it to try it in the hole
      ISO.ox = 240; ISO.oy = 64;
      sensorUnit({ part: 'old-sensor', rotated: true }, P(190, 30, 0), 0);
      if (boxHere) spot('The old sensor: try it', isoArea(180, 20, 200, 40, 0, 44), 'act:pick:old-sensor');
    }
    tip('Workbench', benchTip(f, boxHere, b), 1, 8);
    hud();
  },
  actions() {
    const f = S.flags, a = [];
    const boxHere = boxOnBench();
    if (boxHere && !f.sensorOut) {                                     // the old sensor is still screwed into the box
      for (const n of [1, 2, 3]) if (!(f.screws || []).includes(n)) a.push({ label: `Undo screw ${n}`, act: `screw:${n}` });
      a.push({ label: 'Lift the old sensor out', act: 'boxout' });
    }
    if (boxHere && f.sensorOut) {                                      // the box is empty: try parts in its hole
      if (S.inv['old-sensor']) a.push({ label: 'Try the old sensor', act: 'pick:old-sensor' });
      if (S.inv['part-p4l']) a.push({ label: 'Try the Parts 4 Less sensor', act: 'pick:part-p4l' });
      if (S.inv['part-mega']) a.push({ label: 'Try the MegaMart sensor', act: 'pick:part-mega' });
    }
    const b = boxHere ? S.bench : null;
    if (b && b.state !== 'in') a.push({ label: 'Push', act: 'push' }, { label: 'Pull', act: 'pullpart' }, { label: 'Rotate', act: 'rotate' }, { label: 'Flip it over', act: 'flip' });
    if (b && b.state === 'stuck' && S.inv.hammer && !S.flags.tapped) a.push({ label: 'Tap it with the hammer', act: 'tapit' });
    if (brokeOpen('stay')) a.push({ label: 'Straighten the bonnet stay in the vice', act: 'straighten' });
    a.push({ label: 'Back to the garage', act: 'go:garage' });
    return a;
  }
};

// =====================================================================
// LOOKING UNDER SOMETHING IN THE GARAGE: lying on the floor; black, unless you've got a torch on
// =====================================================================
const UNDER_FINDS = {                                                 // what's down there: [x, y, what] on the floor
  'the car': [[150, 200, 'coin'], [300, 220, 'wrapper'], [240, 180, 'stain']],
  'the shelves': [[120, 210, 'dust'], [260, 190, 'dust'], [340, 220, 'dust']],
  'the parts boxes': [[180, 200, 'spider'], [300, 210, 'sandwich']],
  'the workbench': [[140, 200, 'screw'], [200, 220, 'screw'], [260, 190, 'screw'], [320, 215, 'screw'], [360, 200, 'screw']],
  'the tool chest': [[330, 168, 'nut'], [160, 210, 'dust']]
};
SCREENS.lookunder = {
  size: [480, 270],
  paint() {
    const where = S.under || 'the tool chest';
    const lit = S.flags.torchLit || S.flags.phoneTorch;
    rect(0, 0, W, H, hex('#08080a'));
    rect(0, 18, W, 120, hex('#1a1a1e'));                             // the underneath of it, just above your head
    for (const x of [40, 430]) rect(x, 18, 12, 150, hex('#222226'));    // its legs (or wheels)
    rect(0, 150, W, 120, hex('#141416'));                            // the floor, going back into the dark
    if (lit) {
      ellipse(240, 205, 210, 60, hex('#6a6450'));                    // the torch's pool of light
      ellipse(240, 205, 150, 42, hex('#8a826a'));
      for (const [x, y, k] of UNDER_FINDS[where] || []) underFind(k, x, y);
    }
    tip('Under ' + esc(where), lit ? 'Lying on the cold floor with a light.' : 'Pitch black. You need a light.', 1, 8);
    hud();
  },
  actions() { return [{ label: 'Get up', act: 'go:garage' }]; }
};
// One thing on the floor under there
function underFind(k, x, y) {
  if (k === 'nut') { if (!S.flags.n3lost || S.flags.n3found) return; nutAt(x, y, 6, 0.3, C.steel2); disc(x, y, 2, C.ink); px(x - 3, y - 4, C.white); px(x - 2, y - 5, C.white); return; }   // a glint
  if (k === 'coin') { ellipse(x, y, 5, 3, C.warm); return; }
  if (k === 'wrapper') { rect(x - 6, y - 3, 12, 6, C.red); rect(x - 2, y - 2, 4, 4, C.white); return; }
  if (k === 'stain') { ellipse(x, y, 18, 6, hex('#2a2620')); return; }
  if (k === 'spider') { disc(x, y, 2, C.ink); for (let n = 0; n < 8; n++) line(x, y, x + Math.cos(n * 0.8) * 6, y + Math.sin(n * 0.8) * 4, C.ink); return; }
  if (k === 'sandwich') { poly([[x - 8, y + 4], [x + 8, y + 4], [x, y - 6]], hex('#e8c890')); return; }
  if (k === 'screw') { line(x - 4, y + 1, x + 4, y - 1, C.steel); disc(x + 4, y - 1, 1, C.steel2); return; }
  ellipse(x, y, 7, 3, hex('#5a5650')); px(x - 2, y - 2, hex('#7a7670'));          // dust
}

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
  'A breaker bar, a bent wheel brace, the jack handle, and a hammer-shaped gap.'
];
// The tool chest: where it is, and where each drawer's front is
const CHEST = { x0: 140, x1: 340, top: 26 };
// How far to look down so an open drawer's front fits on the screen (only the bottom drawers need it)
function chestLift(d) {
  if (!d) return 0;
  const front = CHEST.top + 34 + (d - 1) * 28 + 6 + 96 + 18;                 // the bottom of its front, pulled out
  return Math.max(0, front - (H - 6));
}
const chestTop = () => CHEST.top - chestLift(S.drawer);
const drawerSlot = k => chestTop() + 34 + k * 28;
let DRAWER_MOVE = null;                                           // a drawer sliding: { d, opening } (drawn by the 'drawer' moment)
// Drawer d pulled out towards you: out = 0 (shut) to 1 (all the way out), seen from above, over the drawers below it
function pulledDrawer(d, out) {
  const { x0, x1 } = CHEST;
  const y = drawerSlot(d - 1) + 6 - (1 - out) * 96;               // the whole drawer slides down the screen as it comes out
  poly([[x0 - 6, y], [x1 + 6, y], [x1 + 40, y + 96], [x0 - 40, y + 96]], shade(C.red, 0.7));
  poly([[x0, y + 4], [x1, y + 4], [x1 + 32, y + 88], [x0 - 32, y + 88]], hex('#3a3c42'));
  rect(x0 - 40, y + 96, x1 - x0 + 80, 18, C.red); rect(x0 + 40, y + 102, x1 - x0 - 80, 4, C.steel);
  drawerContents(d, x0, y);
  if (out < 1 && BG) {                                            // the part still inside the chest is hidden: put the chest back over it
    const hide = (drawerSlot(d - 1) + 2) * W * 4;
    img.data.set(BG.subarray(0, hide), 0);
  }
}

SCREENS.toolbox = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, H, C.concrete, 0.08, 81);
    for (let y = 6; y < 230; y += 9) rect(0, y, W, 1, C.concreteDark);
    const { x0, x1 } = CHEST, top = chestTop(), lift = chestLift(S.drawer);   // a bottom drawer out: look down a bit
    rect(0, 230 - lift, W, 40 + lift, C.floor); rect(0, 230 - lift, W, 1, C.steel2);
    // the chest: top box with a lid, then six drawers, on wheels
    rbox(x0 - 4, top, x1 - x0 + 8, 30, 4, C.red); rect(x0, top + 22, x1 - x0, 3, C.redDim); rect(220, top + 8, 40, 4, C.steel);
    rect(x0 - 4, top + 30, x1 - x0 + 8, 176, shade(C.red, 0.85));
    const slot = drawerSlot;
    for (let k = 0; k < 6; k++) {
      rect(x0, slot(k), x1 - x0, 25, C.red); rect(x0, slot(k), x1 - x0, 2, shade(C.red, 1.2)); rect(x0, slot(k) + 23, x1 - x0, 2, C.redDim);
      rect(x0 + 60, slot(k) + 9, 80, 4, C.steel); rect(x0 + 60, slot(k) + 12, 80, 1, C.steel2);
      text(String(k + 1), x0 + 8, slot(k) + 9, C.redDim);
    }
    for (const wx of [x0 + 6, x1 - 18]) { disc(wx + 6, 236 - lift, 6, C.tyre); disc(wx + 6, 236 - lift, 2, C.steel); }
    // the open drawer: pulled out towards you, seen from above, over the drawers below it
    const d = S.drawer;
    const sliding = ANIM && ANIM.kind === 'drawer';               // while it slides, the moment draws it
    if (d && !sliding) pulledDrawer(d, 1);
    // tap a drawer's front to pull it out; tap the open one's front to push it back
    for (let k = 0; k < 6; k++) {
      if (d && k >= d - 1) continue;                              // the open drawer covers itself and the ones below
      spot(`Drawer ${k + 1}: ${esc(DRAWERS[k])}`, [x0, slot(k), x1 - x0, 25], 'act:drawer:' + (k + 1));
    }
    if (d) spot(`Push drawer ${d} shut`, [x0 - 40, slot(d - 1) + 102, x1 - x0 + 80, 18], 'act:drawer:' + d);
    tip('Toolbox', d ? `Drawer ${d}: ${esc(DRAWERS[d - 1])}.<br>${esc(DRAWER_NOTES[d - 1])}` : 'Six drawers. Tap one to pull it out.', 1, 8);
    hud();
  },
  actions() {
    const a = [];
    if (S.drawer === 1) a.push({ label: 'Look for the 10 mm', act: 'find10' });
    if (S.drawer === 2) a.push({ label: 'Find the right spanner', act: 'findspanner' });
    if (S.drawer === 5) a.push({ label: 'Test the multimeter', act: 'meter' }, { label: 'Take the torch', act: 'takeTorch' });
    if (S.drawer === 4 && brokeOpen('mirror')) a.push({ label: 'Tape the wing mirror back on', act: 'tapemirror' });
    if (S.drawer === 6 && leadOpen('hammer-box')) a.push({ label: 'Look for the hammer', act: 'hammerbox' });
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
    for (let k = 0; k < 20; k += 4) line(x0 + 20 + k * 4, y + 66 - k / 2, x0 + 30 + k * 4, y + 66 - k / 2, C.dim);   // the hammer-shaped gap (dotted)
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

// =====================================================================
// HOOK THE NUT OUT: a little game. Move the stick under the tool chest; the stick only pushes,
// so get its tip behind the nut and draw it towards you. Only the tip touches the floor
// (the shaft rides over the nut; when it pushed too, the nut could never be drawn out)
// =====================================================================
const FISH = { nut: [300, 92], tip: [240, 250], won: false };
const FISH_BASE = [240, 300];                                   // where your hand holds the stick (off the bottom of the picture)
const FISH_BOX = [44, 70, 436, 236];                            // the gap under the chest: left, back, right, front (out)
function fishStart() { FISH.nut = [300, 92]; FISH.tip = [240, 250]; FISH.won = false; }
// The pointer moved to x, y (picture pixels): move the stick's tip there; the tip pushes the nut out of its way
function fishMove(x, y) {
  if (FISH.won) return;
  const [l, b, r] = FISH_BOX;
  const tx = Math.max(l, Math.min(r, x)), ty = Math.max(b, Math.min(262, y));
  const steps = Math.ceil(Math.hypot(tx - FISH.tip[0], ty - FISH.tip[1]) / 3) || 1;
  for (let k = 1; k <= steps; k++) {                            // move in small steps, so a fast flick can't jump through the nut
    const px0 = FISH.tip[0] + (tx - FISH.tip[0]) * k / steps, py0 = FISH.tip[1] + (ty - FISH.tip[1]) * k / steps;
    pushNut(px0, py0, 12);                                      // the tip pushes the nut
  }
  FISH.tip = [tx, ty];
  const [nl, nb, nr] = FISH_BOX;
  FISH.nut[0] = Math.max(nl + 8, Math.min(nr - 8, FISH.nut[0]));
  FISH.nut[1] = Math.max(nb + 8, FISH.nut[1]);
  if (FISH.nut[1] > FISH_BOX[3]) fishWin();
}
function pushNut(x, y, reach) {
  const dx = FISH.nut[0] - x, dy = FISH.nut[1] - y, d = Math.hypot(dx, dy);
  if (d >= reach || d === 0) return;
  FISH.nut[0] += dx / d * (reach - d); FISH.nut[1] += dy / d * (reach - d);
  if (Math.random() < 0.05) sfx('plink');
}
function fishWin() {
  FISH.won = true;
  S.flags.n3found = true;
  closeLead('hook', 'ok');
  finishJob('nut3', 'Hooked nut 3 out from under the tool chest');
  sfx('ding');
  say('Got it!', 'The nut rolls out into the light. You grab it before it can go anywhere else, and put it somewhere safe.', [{ label: 'Back to the garage', run() { show('garage'); } }]);
}
// =====================================================================
// THE CAR DOOR, CLOSE UP: after a drink or three the key won't go in the lock
// =====================================================================
const KEYHOLE = [300, 150];                                       // the slot in the lock (picture pixels)
const KEY_FIT = 5;                                                // how close the tip has to be to go in
const KEY_WOBBLE = [0, 10, 18, 26];                               // how far the key drifts, by drinks today
const KEY = { aim: [420, 210], pos: [420, 210], drinks: 1, scratches: [] };
// The pointer moved: that's where his hand is trying to put the key
function keyAim(x, y) { KEY.aim = [x, y]; }
// Where the key's tip actually is now: where he's aiming, plus a drunken drift and a shake
function keyDrift(t) {
  const a = KEY_WOBBLE[Math.min(KEY.drinks, KEY_WOBBLE.length - 1)];
  const dx = Math.sin(t * 1.3) + Math.sin(t * 3.1 + 1) * 0.5 + (Math.random() - 0.5) * 0.3;
  const dy = Math.cos(t * 1.7) + Math.sin(t * 2.3 + 2) * 0.5 + (Math.random() - 0.5) * 0.3;
  return [KEY.aim[0] + dx * a, KEY.aim[1] + dy * a];
}
SCREENS.keyhole = {
  size: [480, 270],
  paint() {
    const night = darkness() > 0.3;
    rect(0, 0, W, H, shade(C.car, night ? 0.55 : 1));                          // the blue door
    rect(0, 0, W, 60, night ? hex('#141a28') : C.glass);                       // the window above
    rect(0, 58, W, 4, C.ink);                                                  // its rubber seal
    rect(0, 236, W, 3, shade(C.car, 0.7));                                     // a crease along the bottom
    rbox(170, 120, 100, 22, 6, C.steel2); rbox(176, 124, 88, 14, 4, C.ink);    // the door handle and its recess
    disc(KEYHOLE[0], KEYHOLE[1], 11, C.steel2); disc(KEYHOLE[0], KEYHOLE[1], 9, C.steel);   // the lock
    rect(KEYHOLE[0] - 1, KEYHOLE[1] - 6, 3, 12, C.ink);                         // its slot
    for (const [x, y] of KEY.scratches) line(x - 6, y - 2, x + 7, y + 3, shade(C.car, 1.5));   // where he missed
    spot('Try the key', [0, 18, W, H - 18], 'act:keytry');
    tip('Your car door', 'Get the key in the lock. It won\'t keep still. Tap when the tip is in the slot.', 1, 8);
    hud();
  },
  animate(t) {
    KEY.pos = keyDrift(t);
    const [x, y] = KEY.pos;
    rect(x, y - 2, 30, 4, C.steel); rect(x + 6, y + 2, 4, 2, C.steel); rect(x + 14, y + 2, 4, 2, C.steel);   // the blade, with its teeth
    disc(x + 40, y, 10, C.steel); disc(x + 40, y, 3, shade(C.car, 0.6));      // the bow (and its hole)
    rect(x + 44, y - 12, 26, 24, C.skin); rect(x + 46, y - 14, 20, 4, C.skin); // his hand holding it
  }
};
// =====================================================================
// THE BREATH TEST: hold to blow; the lights climb from green to red
// =====================================================================
const BREATH_BOX = [140, 70, 200, 150];                          // the breathalyser: x, y, w, h
const breathLedAt = k => [BREATH_BOX[0] + 22 + k * 16, BREATH_BOX[1] + 80];   // light k, left (green) to right (red)
const BREATH_COLOURS = [hex('#30c040'), hex('#30c040'), hex('#60d040'), hex('#a0d030'), hex('#d8d020'), hex('#f0b020'), hex('#f08020'), hex('#f05020'), hex('#e02020'), hex('#e02020')];
SCREENS.breath = {
  size: [480, 270],
  paint() {
    rect(0, 0, W, H, hex('#101420'));                                          // night, through the car window
    for (let k = 0; k < 6; k++) disc(40 + k * 80, 40, 3, k % 2 ? hex('#3050ff') : hex('#5070ff'));   // blue lights, out there
    const [x, y, w, h] = BREATH_BOX;
    rect(x + w / 2 - 8, y - 40, 16, 44, C.white);                              // the mouthpiece
    rbox(x, y, w, h, 12, hex('#e8c020')); rbox(x + 8, y + 8, w - 16, 50, 6, C.ink);   // the breathalyser and its screen
    text('BLOW', x + 70, y + 26, hex('#40c070'), 2);
    for (let k = 0; k < BREATH_LEDS; k++) { const [lx, ly] = breathLedAt(k); disc(lx, ly, 5, C.ink); disc(lx, ly, 4, shade(BREATH_COLOURS[k], 0.3)); }   // the lights, off
    rect(x + 30, y + h, 60, 40, C.skin); rect(x + 26, y + h + 30, 70, 30, hex('#202838'));   // the policeman's hand, his sleeve
    if (BREATH.ticket) {                                                       // the fine, on paper
      rect(344, 150, 130, 100, C.white); rect(344, 150, 130, 14, C.red);
      text('FIXED PENALTY', 352, 154, C.white);
      text('£' + BREATH_FINE, 372, 190, C.ink, 3);
    }
    const msg = BREATH.ticket ? 'You\'ve been fined.' : BREATH.short ? 'Not long enough! Press and hold to blow, and keep going.' : 'Press and hold to blow into it. Keep going till he says stop (about ' + BREATH_TIME.secs + ' seconds).';
    tip('The breath test', msg, 1, 8);
    hud();
  },
  animate() {
    breathTick();
    for (let k = 0; k < BREATH.lit; k++) { const [lx, ly] = breathLedAt(k); disc(lx, ly, 4, BREATH_COLOURS[k]); }   // lit, green to red
  }
};
// =====================================================================
// THE CAR HANDBOOK: found in the parts box. The cover, then its pages: no fuse diagram anywhere
// =====================================================================
const HANDBOOK_NAME = 'Car handbook';
const HANDBOOK_BLUE = hex('#1e3060');
const HANDBOOK_TITLE = 'Vauxhall Zafira 1.6 Life / Club Automatic';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const GAME_DAY0 = [2026, 10, 16];                                  // day 0 of the game: Monday 16 November 2026 (day 1 is a Tuesday)
// The date on game day d, written out ("15 November 2026")
function dateOfDay(d) {
  const [y, m, day] = GAME_DAY0;
  const when = new Date(y, m, day + d);
  return when.getDate() + ' ' + MONTHS[when.getMonth()] + ' ' + when.getFullYear();
}
// The pages after the cover: [heading, words]
function handbookPages() {
  return [
    ['Contents', 'Welcome to your new Vauxhall.\n\nYour warranty … page 2\nYour radio … page 3\nEverything else … see your dealer'],
    ['Your warranty', 'Warranty until ' + dateOfDay(S.day - 2) + '.\n\nThat was two days ago.'],
    ['Your radio', 'Radio security code: 1234\n\nKeep this book in a safe place.'],
    ['Notes', 'Nothing about fuses. Not a diagram, not a word. You look twice.']
  ];
}
SCREENS.handbook = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, H, C.bench, 0.1, 71);                                         // on the workbench
    const page = S.hbPage || 0;
    if (page === 0) {                                                            // the cover: the title, and a picture of the car
      rbox(150, 26, 180, 228, 6, HANDBOOK_BLUE); rect(156, 32, 168, 216, shade(HANDBOOK_BLUE, 1.15));
      rect(150, 26, 10, 228, shade(HANDBOOK_BLUE, 0.7));                         // the spine
      rect(170, 150, 140, 80, hex('#c8d8e8'));                                   // the photo's sky…
      rect(170, 205, 140, 25, C.drive);                                          // …and the road
      ISO.ox = 236; ISO.oy = 162;
      isoCar(0, 0, 1.25, C.car, { alongX: true, lampState: { left: false, right: false } });   // our blue car, new, with both headlights
      LABELS.push(`<div class="hbcover" style="left:${160 / W * 100}%;top:${46 / H * 100}%;width:${160 / W * 100}%">VAUXHALL<br><b>${esc(HANDBOOK_TITLE)}</b><br><i>Owner's Manual</i></div>`);
    }
    tip('The car handbook', page === 0 ? 'Turn the page to read it.' : 'Page ' + page + ' of ' + handbookPages().length + '.', 1, 8);
    hud();
  },
  overlay() {
    const page = S.hbPage || 0, pages = handbookPages();
    const prev = page > 0 ? '<button class="flip" data-act="hbpage:-1">◀</button>' : '<span class="flip"></span>';
    const next = page < pages.length ? '<button class="flip" data-act="hbpage:1">▶</button>' : '<span class="flip"></span>';
    if (page === 0) return `<div class="ov hbnav">${prev}<span>Cover</span>${next}</div>`;
    const [head, words] = pages[page - 1];
    return `<div class="ov book"><div class="pg"><h3>${esc(head)}</h3><p>${esc(words).replace(/\n/g, '<br>')}</p></div>`
      + `<div class="pg"><p class="faint">${'— '.repeat(30)}</p><div class="pgnav">${prev}<span>Page ${page} of ${pages.length}</span>${next}</div></div></div>`;
  },
  actions() { return [{ label: 'Put it down', act: 'hbclose' }]; }
};
SCREENS.fish = {
  size: [480, 270],
  paint() {
    rect(0, 0, W, H, hex('#141210'));
    // the floor under the chest, lit by the torch
    for (let y = FISH_BOX[1]; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - 240, (y - 170) * 1.6), lit = Math.max(0.18, 1 - d / 260);
      px(x, y, shade(C.floor, lit * (0.9 + hash(x, y) * 0.2)));
    }
    rect(0, FISH_BOX[3], W, 2, shade(C.floor, 1.3));                                 // the front edge of the chest: get it past here
    rect(0, 0, W, FISH_BOX[1], C.red); rect(0, FISH_BOX[1] - 6, W, 6, C.redDim);     // the bottom of the tool chest
    for (const x of [30, 450]) { rect(x - 10, FISH_BOX[1] - 4, 20, 14, C.greyDark); disc(x, FISH_BOX[1] + 12, 8, C.tyre); }   // its wheels
    for (let n = 0; n < 7; n++) { const x = 70 + hash(n, 4) * 340, y = 90 + hash(4, n) * 120; disc(x, y, 3 + (n % 3), shade(C.floor, 0.55)); }   // dust bunnies
    disc(380, 110, 4, C.warm);                                                         // a coin, not your nut
    tip('Under the tool chest', 'Move the stick. It only pushes: get behind the nut and draw it towards you, past the edge.', 1, 82);
    hud();
  },
  animate() {
    pipe(FISH_BASE[0], FISH_BASE[1], FISH.tip[0], FISH.tip[1], 5, hex('#7a5634'));      // the stick
    disc(FISH.tip[0], FISH.tip[1], 3, hex('#5a3c20'));
    nutAt(FISH.nut[0], FISH.nut[1], 8, 0.4, C.steel);
    ring(FISH.nut[0], FISH.nut[1], 10, C.light);
  },
  actions() { return [{ label: 'Give up for now', act: 'giveup' }]; }
};
