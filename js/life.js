// Bland Quest Auto: things that move.
//   animate(t): small things on each screen that keep moving (t = seconds)
//   MOMENTS:    short animations for the big events (p goes from 0 to 1); dialogs wait for them
// Drawn every frame over a copy of the screen's still picture (see drawFrame in engine.js).

// How high the part on the workbench sits above the hole, for each state
//   below 0 it's down inside the hole: the part of it below the hole's front edge is hidden by the box
const LIFT = { over: 56, stuck: 30, in: -8 };
// The part being tried on the workbench: lift = height above the hole, dx = a sideways judder
function benchPart(b, lift, dx) {
  ISO.ox = 240; ISO.oy = 64;
  const hole = P(100, 95, 40);                                        // the middle of the box's hole (40 is the box's top)
  const bot = P(100, 95, 40 + lift);
  if (lift >= 0) return sensorUnit(b, bot, dx);                       // above the hole: all of it shows
  hiddenBelow(hole[1] + 7, bot[0] - 40, bot[0] + 70, () => sensorUnit(b, bot, dx));   // in it: hidden below the hole's front edge
}
// Draw something, but keep the picture as it was below screen row yCut, between x0 and x1 (what's in front hides it)
function hiddenBelow(yCut, x0, x1, draw) {
  const y0 = Math.max(0, Math.round(yCut)), xa = Math.max(0, Math.round(x0)), xb = Math.min(W, Math.round(x1));
  const rows = [];
  for (let y = y0; y < H; y++) rows.push(IMG32.slice(y * W + xa, y * W + xb));   // what's there now
  draw();
  rows.forEach((row, k) => IMG32.set(row, (y0 + k) * W + xa));      // put it back
}
// A gearbox sensor standing with its bottom at bot (screen), nudged sideways by dx: body, face, pins, plug and wires
function sensorUnit(b, bot, dx) {
  drawSensor(b.part, b.rotated, bot, dx);                             // its own shape, colour, lug teeth and wires (sensors.js)
}
// A sensor's plug (dark, with a yellow tab) and its three coloured wires trailing off to the right
function sensorPlug(x, y) {
  rect(x, y - 4, 16, 9, hex('#30302c'));                              // the plug
  rect(x + 3, y - 7, 9, 3, C.warm);                                   // its tab
  SENSOR_WIRES.forEach((wire, k) => {
    const wy = y - 2 + k * 3;                                         // the three wires side by side
    pipe(x + 16, wy, x + 34, wy + 6, 2, wire);                        // out of the plug…
    pipe(x + 34, wy + 6, x + 46, wy + 22, 2, wire);                   // …and drooping down
  });
}

// ---------- helpers ----------
const ease = p => p * p * (3 - 2 * p);                               // smooth start and stop
const lerp = (a, b, p) => a + (b - a) * p;
// A car driving along x (down-right), for traffic; s = size
function isoCarX(x, y, s, col) { isoCar(x, y, s, col, { alongX: true }); }   // the same car shape as everywhere else, turned along the street
// A drip: a drop swells at x,y0, then falls to y1 and splashes; every `period` seconds
function drip(t, x, y0, y1, period, col) {
  const q = (t % period) / period;
  if (q < 0.75) { const r = Math.round(ease(q / 0.75) * 2); disc(x, y0 + r, r, col); return; }
  const f = (q - 0.75) / 0.2;
  if (f <= 1) { rect(x, Math.round(lerp(y0, y1, f * f)), 2, 3, col); return; }
  rect(x - 3, y1, 7, 1, col);
}
const PASSED = [];                                                   // where each passing car was last frame (for its whoosh)
// A drip that also goes "plink" when it lands
function dripSound(t, period, key) {
  const q = (t % period) / period, landed = q >= 0.95;
  if (landed && !DRIPPED[key]) sfx('plink');
  DRIPPED[key] = landed;
}
const DRIPPED = {};
// A strip light that flickers now and then
const flicker = t => Math.sin(t * 7) + Math.sin(t * 13.3) + Math.sin(t * 2.1) > 2.3;
// A nut or bolt head turned by angle a
function nutAt(x, y, r, a, col = C.steel2) {
  const pts = [];
  for (let k = 0; k < 6; k++) pts.push([x + Math.cos(a + k * 1.047) * r, y + Math.sin(a + k * 1.047) * r]);
  poly(pts, col);
  disc(x, y, Math.max(1, r - 3), shade(col, 0.8));
}
// Sparks flying out from a point (p = how far they've gone)
function sparks(x, y, n, p, seed) {
  for (let k = 0; k < n; k++) { const a = hash(k, seed) * 6.28, d = p * (10 + hash(seed, k) * 30); px(x + Math.cos(a) * d, y + Math.sin(a) * d, k % 2 ? C.warm : C.white); }
}
// The screw on the workbench box that was undone last (the one a moment is showing)
function lastScrew() {
  const out = S.flags.screws || [];
  return out[out.length - 1];
}
// A ring spanner on a bolt, handle at angle a
function spanner(x, y, a, len = 90) {
  pipe(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, 8, C.steel);
  ring(x, y, 10, C.steel); ring(x, y, 11, C.steel2);
}

// =====================================================================
// LIFE ON EVERY SCREEN
// =====================================================================
SCREENS.home.animate = function (t) {
  ISO.ox = 250; ISO.oy = 96;
  // traffic, driving on the left: going right on the house side of the road, coming back on the far side
  const cols = [C.red, C.warm, hex('#40a060'), C.white];
  for (const k of [0, 2, 1, 3]) {                                                                                     // the far lane first, then the near one
    const goingRight = k % 2 === 0;
    const along = (t * (goingRight ? 50 : 58) + (k >> 1) * 600 + (goingRight ? 0 : 300)) % 1200;   // one speed per lane, 600 apart: no overtaking
    const x = goingRight ? along - 500 : 700 - along;
    isoCar(x, goingRight ? 150 : 171, 0.9, cols[k], { alongX: true, reverse: !goingRight });
    if (PASSED[k] !== undefined && (PASSED[k] + 60) * (x + 60) <= 0 && Math.abs(PASSED[k] - x) < 100) sfx('carpass');   // whoosh as it goes by
    PASSED[k] = x;
  }
  if (GARAGE_OPENING && S.screen === 'home') garageDoorDraw();                                                         // the garage door going up as he walks over
  if (wifeFollowing()) followDraw(t);                                                                                  // late: she's followed him out of the garage
  if (S.flags.wifeWalksIn) walkInDraw(t);                                                                              // home from the pub: she walks into the house
  ISO.ox = 250; ISO.oy = 96;
  for (let k = 0; k < 2; k++) {                                                                                        // two birds
    const x = ((t * 22 + k * 260) % 560) - 40, y = 34 + k * 14 + Math.sin(t * 2 + k) * 3, w = Math.floor(t * 6 + k) % 2 ? 2 : 1;
    px(x - 2, y - w, C.ink); px(x - 1, y, C.ink); px(x, y + 1, C.ink); px(x + 1, y, C.ink); px(x + 2, y - w, C.ink);
  }
};
// The wife walks round the house: from place to place, stopping a while at each; she stops to talk to you
const WIFE_ROUTE = [[128, 38], [150, 64], [104, 66], [60, 64], [11, 32, 'sit'], [52, 44], [104, 44]];   // 'sit': she sits on the sofa there
const WIFE = { k: 0, t0: null, last: 0, pos: [128, 38], walk: undefined, facing: 'front', sit: false, hip: false };
const WIFE_WAIT = 4, WIFE_SPEED = 14;                                // seconds at each place; how fast she walks
const BEDSIDE = [64, 92];                                             // where she goes when you both go to bed
const isBedtime = () => S.mins >= 19 * 60 || S.mins < 7 * 60;        // 7 in the evening till 7 in the morning
const isAsleep = () => S.mins >= 23 * 60 || S.mins < 7 * 60;         // 11 at night: she takes herself to bed, and sleeps till morning
const SLEEPING_HEAD = [10, 95];                                       // her head on the pillow (her side of the bed)
// Which way she faces, walking from a to b (world): towards you, away, or side on
function facingFor(a, b) {
  const sx = (b[0] - a[0]) - (b[1] - a[1]), sy = ((b[0] - a[0]) + (b[1] - a[1])) / 2;   // the move on screen
  if (Math.abs(sx) > Math.abs(sy) * 1.5) return sx > 0 ? 'right' : 'left';
  return sy > 0 ? 'front' : 'back';
}
function wifeMove(t) {
  if (WIFE.t0 === null) WIFE.t0 = t;
  const toBed = ANIM && ((ANIM.kind === 'night' && S.flags.bedLate) || (isBedtime() && ANIM.kind === 'walk' && ANIM.to && ANIM.to[0] === 70 && ANIM.to[1] === 104));
  if (toBed) {                                                       // late, in her nightie, and you're off to bed: she follows you
    WIFE.sit = false; WIFE.hip = false;
    const dt = Math.min(0.1, t - WIFE.last), dx = BEDSIDE[0] - WIFE.pos[0], dy = BEDSIDE[1] - WIFE.pos[1], d = Math.hypot(dx, dy);
    WIFE.last = t;
    if (d < 0.5) { WIFE.walk = undefined; WIFE.facing = 'front'; return; }
    const go = Math.min(d, 22 * dt);
    WIFE.facing = facingFor(WIFE.pos, BEDSIDE);
    WIFE.pos = [WIFE.pos[0] + dx / d * go, WIFE.pos[1] + dy / d * go];
    WIFE.walk = t * 9;
    return;
  }
  if (DIALOG || ANIM) WIFE.t0 += t - WIFE.last;                      // talking (or you walking over): she waits
  WIFE.last = t;
  const from = WIFE_ROUTE[WIFE.k], to = WIFE_ROUTE[(WIFE.k + 1) % WIFE_ROUTE.length];
  const wait = WIFE_WAIT * (from[2] ? 2.5 : 1);
  const walkT = Math.hypot(to[0] - from[0], to[1] - from[1]) / WIFE_SPEED, e = t - WIFE.t0;
  if (e < wait) {                                                    // stopped: facing you; a longer sit on the sofa; now and then a hand on her hip
    WIFE.pos = [from[0], from[1]]; WIFE.walk = undefined; WIFE.facing = 'front'; WIFE.sit = !!from[2];
    WIFE.hip = !WIFE.sit && WIFE.k % 2 === 1 && e > 1 && e < wait - 0.8;
    return;
  }
  WIFE.sit = false; WIFE.hip = false;
  if (e < wait + walkT) {                                            // walking: turned the way she's going, a proper stride
    const p = (e - wait) / walkT;
    WIFE.pos = [lerp(from[0], to[0], p), lerp(from[1], to[1], p)];
    WIFE.facing = facingFor(from, to);
    WIFE.walk = t * 9;
    return;
  }
  WIFE.k = (WIFE.k + 1) % WIFE_ROUTE.length; WIFE.t0 = t; WIFE.pos = [to[0], to[1]]; WIFE.walk = undefined;
}
SCREENS.room.animate = function (t) {
  ISO.ox = VIEW.room[0]; ISO.oy = VIEW.room[1];
  if (S.flags.onFloor && !(ANIM && ANIM.kind === 'collapse')) {       // asleep on the floor: Zs rising off him
    const [x, y] = manSpot('room'), m = P(x, y);
    sleepZs(t, m[0] + 2, m[1] - 10);
  }
  const goingToBed = ANIM && ANIM.kind === 'night';                  // the night passing after you go to bed: she's beside you as before
  if ((isAsleep() && !goingToBed) || (goingToBed && S.flags.bedAsleep)) {   // late (or already asleep when you came to bed): in bed, fast asleep
    sleepingWife(t);
    moveWifeTap([SLEEPING_HEAD[0] + 8, SLEEPING_HEAD[1]], [60, 10]);
    return;
  }
  wifeMove(t);
  const bedtime = isBedtime() || (ANIM && ANIM.kind === 'night' && S.flags.bedLate);   // from 7 in the evening (and all through the night) she's in her nightie
  wife(WIFE.pos[0], WIFE.pos[1], bedtime ? 'nightie' : (S.wifeLook || 'navy'), { walk: WIFE.walk, facing: WIFE.facing, sit: WIFE.sit, hip: WIFE.hip });
  moveWifeTap(WIFE.pos, [-18, 14]);
};
// Her asleep in bed: her head on the pillow, a lump under the duvet, and Zs rising off her
function sleepingWife(t) {
  const [hx, hy] = SLEEPING_HEAD;
  ibox(18, hy - 7, 50, hy + 7, 20, 23, shade(C.door, 1.12));         // her, under the duvet
  const head = P(hx, hy, 24);
  disc(head[0], head[1], 3, C.skin);                                  // her face, on the pillow
  rect(head[0] - 4, head[1] - 4, 8, 3, hex('#5a3a22'));               // her hair, spread on the pillow
  sleepZs(t, head[0] + 4, head[1] - 6);
}
// Zs rising from her: small z, then bigger and bigger, up and to the right at 45 degrees; each grows and fades away
const Z_COUNT = 4, Z_LIFE = 3.2;                                      // no more than 4 at once; how long each one lasts (seconds)
function sleepZs(t, x0, y0) {
  for (let k = 0; k < Z_COUNT; k++) {
    const age = (t + k * Z_LIFE / Z_COUNT) % Z_LIFE;                  // how far through its rise this one is
    const q = age / Z_LIFE;
    const size = 1 + Math.floor(q * 3);                               // small, medium, big
    const rise = q * 34;                                              // up and right, at 45 degrees
    drawZ(x0 + rise, y0 - rise - size * 4, size, hex('#3a5a9a'), q, k);
  }
}
// One Z, `size` pixels per dot (3 dots wide and tall, plus the diagonal); fade 0 = solid, 1 = gone (dots drop out)
function drawZ(x, y, size, col, fade, seed) {
  const dots = [[0, 0], [1, 0], [2, 0], [3, 0], [2, 1], [1, 2], [0, 3], [1, 3], [2, 3], [3, 3]];   // the Z: top, diagonal, bottom
  const gone = Math.max(0, (fade - 0.5) * 2);                         // it starts fading halfway up
  dots.forEach(([dx, dy], n) => {
    if (hash(n + seed * 17, Math.floor(fade * 20)) < gone) return;   // this dot has faded
    rect(Math.round(x + dx * size), Math.round(y + dy * size), size, size, col);
  });
}
// Move the "Talk to the wife" tap area (and its name) to where she is now; walkBy = where he walks to, beside her
function moveWifeTap(pos, walkBy) {
  const tapArea = stage.querySelector('.hs[data-go="act:wife"]');
  if (!tapArea) return;
  const [l, tp, w] = isoArea(pos[0] - 4, pos[1] - 4, pos[0] + 4, pos[1] + 4, 0, 40);
  tapArea.style.left = l / W * 100 + '%'; tapArea.style.top = tp / H * 100 + '%';
  tapArea.dataset.walk = Math.round(pos[0] + walkBy[0]) + ',' + Math.round(pos[1] + walkBy[1]);
  const label = tapArea.nextElementSibling;
  if (label) { label.style.left = (l + w / 2) / W * 100 + '%'; label.style.top = tp / H * 100 + '%'; }
}

// Home from the pub: she gets out of the car and walks into the house (and waits while a message is up)
const WALK_IN = { from: [94, 78], to: [46, 60], t0: null, last: 0 };
function walkInDraw(t) {
  if (WALK_IN.t0 === null) { WALK_IN.t0 = t; WALK_IN.last = t; }
  if (DIALOG) WALK_IN.t0 += t - WALK_IN.last;                          // she waits till you've read it
  WALK_IN.last = t;
  const { from, to } = WALK_IN;
  const q = (t - WALK_IN.t0) * WIFE_SPEED / Math.hypot(to[0] - from[0], to[1] - from[1]);   // how far she's got
  if (q >= 1) { delete S.flags.wifeWalksIn; WALK_IN.t0 = null; return; }   // in through the front door
  ISO.ox = VIEW.home[0]; ISO.oy = VIEW.home[1];
  wife(lerp(from[0], to[0], q), lerp(from[1], to[1], q), S.wifeLook || 'navy', { walk: t * 9, facing: facingFor(from, to) });
}
// Late at night she came to fetch you from the garage; walk out and she follows you outside
const FOLLOW = { pos: null, last: 0, walk: undefined, facing: 'front' };
const FOLLOW_FROM = [115, 62];                                        // the garage door, on the home screen
const FOLLOW_GAP = [10, -8];                                          // where she stops: just behind him, towards the house
const FOLLOW_SPEED = 22;                                              // how fast she walks after him
const wifeFollowing = () => isBedtime() && !isAsleep() && S.flags.wifeOut === nightOf();
// Where he is on the home screen right now (part way across if he's walking)
function manNowHome() {
  if (ANIM && ANIM.kind === 'walk' && ANIM.screen === 'home') {
    const p = Math.min(1, (performance.now() - ANIM.t0) / ANIM.dur);
    return [lerp(ANIM.from[0], ANIM.to[0], p), lerp(ANIM.from[1], ANIM.to[1], p)];
  }
  return manSpot('home');
}
// Where she's heading: just behind him
function followTarget() {
  const [mx, my] = manNowHome();
  return [mx + FOLLOW_GAP[0], my + FOLLOW_GAP[1]];
}
// Each frame: she walks towards him, and stops when she's caught up
function followMove(t) {
  const target = followTarget();
  if (!FOLLOW.pos) FOLLOW.pos = target.slice();                       // reloaded the game: she's already beside him
  const dt = Math.min(0.1, t - FOLLOW.last);
  FOLLOW.last = t;
  const dx = target[0] - FOLLOW.pos[0], dy = target[1] - FOLLOW.pos[1];
  const d = Math.hypot(dx, dy);
  if (d < 1) {                                                        // caught up: she stands and waits, facing you
    FOLLOW.walk = undefined;
    FOLLOW.facing = 'front';
    return;
  }
  const step = Math.min(d, FOLLOW_SPEED * dt);
  FOLLOW.facing = facingFor(FOLLOW.pos, target);                      // turned the way she's walking
  FOLLOW.pos = [FOLLOW.pos[0] + dx / d * step, FOLLOW.pos[1] + dy / d * step];
  FOLLOW.walk = t * 9;
}
// She comes out of the garage after him (called as he leaves the garage)
function wifeFollowsOut() {
  S.flags.wifeOut = nightOf();
  FOLLOW.pos = FOLLOW_FROM.slice();
}
// Draw her following him round the front of the house
function followDraw(t) {
  followMove(t);
  ISO.ox = VIEW.home[0]; ISO.oy = VIEW.home[1];
  wife(FOLLOW.pos[0], FOLLOW.pos[1], 'nightie', { walk: FOLLOW.walk, facing: FOLLOW.facing, hip: !FOLLOW.walk });
  moveWifeTap(FOLLOW.pos, [-12, 10]);
}
SCREENS.city.night = d => SCREENS.city_night(d);
SCREENS.place.night = function (d) { if (!S.inside) nightShade(0, 18, W, H, d); };
SCREENS.city.animate = function (t) {
  ISO.ox = S.cam.ox; ISO.oy = S.cam.oy;
  const cols = [C.red, C.warm, hex('#40a060'), C.white, C.steel2];          // never blue: blue is your car
  for (let k = 0; k < 8; k++) {                                                                                        // traffic on the streets
    const along = (t * (18 + k * 4) + k * 170) % (7 * BLOCK + STREET);
    if (k % 2) isoCarX(along - 20, (k % 7) * BLOCK + 6, 0.42, cols[k % 5]);
    else isoCar((k % 8) * BLOCK + 6, (along % (6 * BLOCK + STREET)) - 20, 0.42, cols[k % 5]);
  }
  keepHud(36);                                                                                                        // cars never drive over the top bar
};
SCREENS.place.animate = function (t) {
  if (S.inside && placeStyle(S.place) === 'pub') {                   // the pub: the fruit machine's lights
    for (let k = 0; k < 4; k++) rect(406 + k * 10, 150, 6, 4, Math.floor(t * 4 + k) % 2 ? C.warm : C.red);
    return;
  }
  const q = tillLightAt();
  if (q) rect(q[0], q[1], 2, 1, Math.floor(t * 2) % 2 ? C.red : hex('#40a060'));                                    // the card machine's light, blinking
};
// Where the card machine's light is: inside an open shop, on the card machine by the till (none on the pavement or at a house)
const TILL_LIGHT = [78, 61, 24];
function tillLightAt() {
  if (S.screen !== 'place' || !S.inside) return null;
  if (placeStyle(S.place) === 'house' || closedReason(S.place)) return null;
  ISO.ox = SHOP_VIEW[0]; ISO.oy = SHOP_VIEW[1];
  return P(...TILL_LIGHT);
}
SCREENS.garage.animate = function (t) {
  ISO.ox = 230; ISO.oy = 106;
  if (flicker(t)) onLeft(0, 30, 90, 74, 77, C.steel2);                                                                 // the strip light
  const a = P(62, 86, 5), b = P(62, 86, 0);
  drip(t, a[0], a[1], b[1], 3.1, C.ink); dripSound(t, 3.1, 'garage');                                                 // oil dripping from the car
  if (wifeInGarage()) wife(WIFE_IN_GARAGE[0], WIFE_IN_GARAGE[1], 'nightie', { hip: true });                                          // late: she's come to fetch you
};
const wifeInGarage = () => isBedtime() && !isAsleep() && S.flags.wifeCalled === nightOf();
SCREENS.under.animate = function (t) { drip(t, 404, 132, 250, 2.7, C.ink); dripSound(t, 2.7, 'under'); drip(t + 1.3, 250, 160, 250, 3.9, hex('#2a2010')); };
SCREENS.underZoom.animate = function (t) { drip(t, 250, 176, 262, 2.9, hex('#2a2010')); };
SCREENS.bench.animate = function (t) {
  for (let k = 0; k < 10; k++) {                                                                                      // dust in the light
    const x = (hash(k, 1) * W + t * (4 + k)) % W, y = 30 + hash(1, k) * 150 + Math.sin(t + k) * 8;
    px(x, y, C.light);
  }
};
// The street out of the windscreen: people walking by on the far pavement, cars both ways
const PASSERS = [{ speed: 14, off: 0, shirt: C.shirt }, { speed: -11, off: 170, shirt: C.door }, { speed: 9, off: 320, shirt: C.warm }];
const TRAFFIC = [{ speed: -45, off: 250, y: 96, col: C.white }, { speed: 60, off: 0, y: 100, col: C.red }, { speed: 75, off: 560, y: 100, col: C.tree2 }];
function streetLife(t) {
  const V = STREET_VIEW;
  for (const p of PASSERS) {                                                                         // people, behind the traffic
    const d = (Math.abs(p.speed) * t + p.off) % (V.x1 - V.x0 + 40);                                  // how far along they've walked
    const x = p.speed > 0 ? V.x0 - 20 + d : V.x1 + 20 - d;                                           // which way they're going
    passer(x, 87, t, p.shirt);
  }
  for (const c of TRAFFIC) {                                                                         // cars: the far lane first, then the near one
    const d = (Math.abs(c.speed) * t + c.off) % (V.x1 - V.x0 + 400);                                 // with gaps between them
    const x = c.speed > 0 ? V.x0 - 60 + d : V.x1 + 10 - d;
    sideCar(x, c.y, c.speed > 0 ? 1 : -1, c.col);
  }
  keepInDoorway();
}
// A person walking, seen from the side; feet at y
function passer(x, y, t, shirt) {
  const step = Math.floor(t * 6 + x) % 2;                                                            // legs apart, then together
  rect(x - step, y - 4, 1, 4, C.jeans); rect(x + 2 + step, y - 4, 1, 4, C.jeansDark);                // legs
  rect(x - 1, y - 10, 5, 6, shirt);                                                                  // body
  rect(x, y - 13, 3, 3, C.skin); rect(x, y - 14, 3, 1, C.hair);                                      // head and hair
}
// A car driving by, seen from the side; dir 1 = going right; base = where its wheels touch the road
function sideCar(x, base, dir, col) {
  const at = u => dir > 0 ? x + u : x + 46 - u;                                                       // measured from its back
  rbox(Math.min(at(0), at(46)), base - 10, 46, 7, 2, col);                                           // the body
  poly([[at(6), base - 10], [at(10), base - 16], [at(28), base - 16], [at(34), base - 10]], shade(col, 0.9));   // the cabin
  poly([[at(9), base - 10], [at(12), base - 15], [at(26), base - 15], [at(31), base - 10]], C.glass);           // its windows
  rect(Math.min(at(18), at(19)), base - 15, 1, 5, shade(col, 0.9));                                  // the door pillar
  for (const u of [10, 36]) { disc(at(u), base - 3, 3, C.tyre); px(at(u), base - 3, C.rim); }        // wheels
  rect(Math.min(at(44), at(46)), base - 8, 2, 2, C.warm);                                            // headlight
  rect(Math.min(at(0), at(2)), base - 8, 2, 2, C.red);                                               // tail light
}
// Put back the garage walls either side of the doorway, so the street only shows through it
function keepInDoorway() {
  const V = STREET_VIEW;
  for (let y = V.y0; y < V.y1; y++) {
    const row = y * W * 4;
    img.data.set(BG.subarray(row, row + V.x0 * 4), row);                                             // left of the doorway
    img.data.set(BG.subarray(row + V.x1 * 4, row + W * 4), row + V.x1 * 4);                          // right of it
  }
}
SCREENS.dash.animate = function (t) {
  streetLife(t);
  const d = darkness();
  if (d > 0) {                                                       // night through the windscreen: dark, and a street light over the road
    const V = STREET_VIEW;
    nightShade(V.x0, V.y0, V.x1, V.y1, d);
    lampGlow(300, 64, 12, d); lampGlow(300, 96, 30, d * 0.5);
  }
  if (!S.flags.running) return;
  dialNeedle(DASH.rpm, 3.05 + Math.sin(t * 23) * 0.03 + Math.sin(t * 5) * 0.02);                    // engine ticking over: the rev needle trembles
};

// =====================================================================
// THE MAN, standing where he last walked to on the home and garage screens
// =====================================================================
const SPOT_HOME = { room: [100, 110], home: [46, 84], garage: [110, 74], place: [105, 140], outside: [100, 52], yard: [100, 150] };
const MAN_SIZE = { room: 2, home: 2, garage: 2, place: 2, outside: 2, yard: 2 };
const VIEW = { room: [230, 100], home: [250, 96], garage: [230, 106], place: [230, 96], outside: [250, 70], yard: [240, 70] };
// A place in town has two views: outside (the shop front) and inside
function spotKey(screen) { return screen === 'place' ? (S.inside ? 'place' : 'outside') : screen; }
function manSpot(screen) { const k = spotKey(screen); return (S.spot && S.spot[k]) || SPOT_HOME[k]; }
// Where his head is on screen (for the arrow of his own speech bubble)
function meHead() {
  const k = spotKey(S.screen);
  if (!VIEW[k]) return null;                                         // a screen he isn't drawn on: a box along the bottom instead
  if (S.screen === 'place' && atCounter()) return [W * 0.22, H - 2];   // up at a counter (the close-up of them): you're not in it, so low down on the left, clear of them
  if (S.screen === 'place' && S.inside && placeStyle(S.place) === 'pub') { const [x, y] = pubMe(); return [x + PUB.size, y - 20 * PUB.size]; }   // the pub is drawn flat
  ISO.ox = VIEW[k][0]; ISO.oy = VIEW[k][1];
  const [x, y] = manSpot(S.screen), p = P(x, y);
  return [p[0], p[1] - 44];
}
// Draw him standing (not while he's walking: the walk draws him)
function standingMan(screen) {
  if (ANIM && ['walk', 'collapse'].includes(ANIM.kind)) return;
  const [x, y] = manSpot(screen), m = P(x, y);
  if (screen === 'room' && S.flags.onFloor) return man(m[0], m[1], 'lie', MAN_SIZE.room);   // asleep on the floor
  man(m[0], m[1], 'stand', MAN_SIZE[spotKey(screen)]);
  inFront(spotKey(screen), x, y);                                     // behind the car: it hides him
}
// ---------- solid things on the floor: he walks round them, and goes behind them ----------
// On each screen: { box: [x0, y0, x1, y1] (world, on the floor), draw (to draw it again, over him, when he's behind it) }
function solidsFor(key) {
  const out = [];
  if (key === 'garage' && !carAway()) out.push({ box: [40, 46, 70, 104], draw: () => isoCar(40, 46, 1.25) });   // your car (1.25 size: 30 wide, 57 long)
  if (key === 'home') {
    if (!carAway()) out.push({ box: [102, 72, 126, 118], draw() { isoCar(102, 72); drawClamp(); } });         // your car on the drive (and the clamp on it)
    else if (inWifesCar()) out.push({ box: [102, 72, 126, 72 + CAR_SHAPES.city.L], draw: () => isoCar(102, 72, 1, WIFE_CAR, { shape: 'city' }) });   // or hers
  }
  if (key === 'yard') WRECKS.forEach(([x, y, , , , shape], i) => out.push({ box: [x, y, x + 24, y + CAR_SHAPES[shape].L], draw: () => drawWreck(i) }));   // the wrecks
  if (key === 'place' && S.inside && hasCounter(S.place)) out.push({ box: COUNTER.slice() });   // the shop counter (he stays this side of it)
  return out;
}
// He's drawn at (x, y) on this screen: draw again anything he's behind, so it hides him
function inFront(key, x, y) {
  const view = VIEW[key];
  if (!view) return;
  const m = P(x, y);
  for (const s of solidsFor(key)) {
    const [x0, y0, x1, y1] = s.box;
    if (!s.draw || !(x < x1 && y < y1)) continue;                     // he's in front of it (or past it)
    const near = P(x1, y1), far = P(x0, y0);                          // does it cover him on screen at all?
    const left = P(x0, y1)[0], right = P(x1, y0)[0];
    if (m[0] + 6 < left || m[0] - 6 > right || m[1] < far[1] || m[1] - 40 > near[1]) continue;
    [ISO.ox, ISO.oy] = view;
    s.draw();
    [ISO.ox, ISO.oy] = view;
  }
}
// A way from a to b that doesn't go through anything solid: [a, …corners, b]
const SOLID_GAP = 6;                                                  // how far he keeps off them
function routeAround(key, a, b) {
  const boxes = solidsFor(key).map(s => [s.box[0] - SOLID_GAP, s.box[1] - SOLID_GAP, s.box[2] + SOLID_GAP, s.box[3] + SOLID_GAP])
    .filter(bx => !inBox(a, bx));                                     // (if he's somehow inside one, let him out)
  for (const bx of boxes) if (inBox(b, bx)) b = nearestEdge(b, bx);   // a target inside one: the nearest point outside it
  const clear = (p, q) => boxes.every(bx => !segmentCrosses(p, q, bx));
  if (clear(a, b)) return [a, b];
  const nodes = [a, b, ...boxes.flatMap(([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x0, y1], [x1, y1]])];
  const dist = nodes.map(() => Infinity), prev = nodes.map(() => -1), done = nodes.map(() => false);
  dist[0] = 0;
  for (;;) {                                                          // the shortest way, corner to corner
    let u = -1;
    for (let i = 0; i < nodes.length; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === 1) break;
    done[u] = true;
    for (let v = 0; v < nodes.length; v++) {
      if (done[v] || !clear(nodes[u], nodes[v])) continue;
      const d = dist[u] + Math.hypot(nodes[v][0] - nodes[u][0], nodes[v][1] - nodes[u][1]);
      if (d < dist[v]) { dist[v] = d; prev[v] = u; }
    }
  }
  if (prev[1] < 0) return [a, b];                                     // no way round: straight there
  const path = [];
  for (let i = 1; i >= 0; i = prev[i]) path.unshift(nodes[i]);
  return path;
}
const inBox = (p, [x0, y0, x1, y1]) => p[0] > x0 && p[0] < x1 && p[1] > y0 && p[1] < y1;
// Does the line from p to q pass through the box? (touching its corners and edges is fine)
function segmentCrosses(p, q, bx) {
  for (let k = 1; k < 24; k++) {
    const t = k / 24, pt = [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
    if (inBox(pt, [bx[0] + 0.5, bx[1] + 0.5, bx[2] - 0.5, bx[3] - 0.5])) return true;
  }
  return false;
}
// The nearest point just outside a box
function nearestEdge([x, y], [x0, y0, x1, y1]) {
  const options = [[x0, y, x - x0], [x1, y, x1 - x], [x, y0, y - y0], [x, y1, y1 - y]];
  options.sort((m, n) => m[2] - n[2]);
  return [options[0][0], options[0][1]];
}
// Where he is along a path, a share p of the way
function alongPath(path, p) {
  const legs = path.slice(1).map((q, i) => Math.hypot(q[0] - path[i][0], q[1] - path[i][1]));
  let go = p * legs.reduce((s, d) => s + d, 0);
  for (let i = 0; i < legs.length; i++) {
    if (go <= legs[i] || i === legs.length - 1) { const t = legs[i] ? Math.min(1, go / legs[i]) : 1; return [lerp(path[i][0], path[i + 1][0], t), lerp(path[i][1], path[i + 1][1], t)]; }
    go -= legs[i];
  }
  return path[path.length - 1];
}
// Walk from where he is to a spot, then do `then` (open the screen he walked to)
// In the house: keep him on the floor (not on the sofa or the bed) and walk round the bed, not over it
const BED_AREA = [-2, 76, 62, 134];                                   // x0, y0, x1, y1 (with a little room round it)
function crossesBed(a, b) {
  for (let k = 1; k < 20; k++) {
    const x = lerp(a[0], b[0], k / 20), y = lerp(a[1], b[1], k / 20);
    if (x > BED_AREA[0] && x < BED_AREA[2] && y > BED_AREA[1] && y < BED_AREA[3]) return true;
  }
  return false;
}
function walkTo(x, y, then, steady) {
  const screen = S.screen, key = spotKey(screen), from = manSpot(screen);
  if (key === 'home' && isDrunk() && !steady) {                     // drunk outside: he wanders off somewhere else first
    const wx = Math.max(-10, Math.min(150, x + (Math.random() - 0.5) * 60));
    const wy = Math.max(66, Math.min(120, y + 10 + (Math.random() - 0.5) * 40));
    return walkTo(wx, wy, () => walkTo(x, y, then, true), true);
  }
  if (key === 'room') {
    x = Math.max(22, Math.min(176, x)); y = Math.max(26, Math.min(136, y));   // on the floor
    if (x < BED_AREA[2] && y > BED_AREA[1] && y < BED_AREA[3]) x = BED_AREA[2];   // beside the bed, not on it
    if (crossesBed(from, [x, y])) return walkTo(66, 70, () => walkTo(x, y, then));   // round the end of the bed
  }
  if (!from || !VIEW[key]) return then();                            // a screen he isn't drawn on: no walk, just go
  const path = routeAround(key, from, [x, y]);                       // round anything in the way
  [x, y] = path[path.length - 1];
  const dist = path.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - path[i][0], q[1] - path[i][1]), 0);
  if (dist < 3) return then();
  ANIM = { kind: 'walk', t0: performance.now(), dur: Math.max(500, dist * 28), from, to: [x, y], path, screen: key, then() {
    S.spot = S.spot || {};
    S.spot[key] = [x, y];
    then();
  } };
  const mine = ANIM;
  setTimeout(() => { if (ANIM === mine) finishMoment(); }, ANIM.dur + 300);   // he gets there even if the window is hidden
  render();                                                         // repaint without him standing still, so only the walking man shows
}

// =====================================================================
// MOMENTS
// =====================================================================
const MOMENTS = {
  walk(p) {                                                           // the man walks across to what you tapped
    const a = ANIM, [vx, vy] = VIEW[a.screen];
    ISO.ox = vx; ISO.oy = vy;
    let [x, y] = a.path ? alongPath(a.path, p) : [lerp(a.from[0], a.to[0], p), lerp(a.from[1], a.to[1], p)];
    if (isDrunk()) { x += Math.sin(p * 22) * 4; y += Math.cos(p * 17) * 3; }   // drunk: he weaves about
    const m = P(x, y);
    man(m[0], m[1], 'walk', MAN_SIZE[a.screen], p * a.dur / 90);
    inFront(a.screen, x, y);                                          // behind the car (or a wreck): it hides him
  },
  bolt1Out(p) {                                                       // the bolt winds out and comes free
    spanner(194, 120, -2.4 + p * 4, 80);
    if (p > 0.6) nutAt(lerp(194, 150, (p - 0.6) / 0.4), lerp(120, 100, (p - 0.6) / 0.4), 8, p * 12);
  },
  boltRound(p) {                                                      // the spanner slips round the bolt head
    const slip = p > 0.55 ? (p - 0.55) * 6 : 0;
    spanner(298, 164, -2.6 + Math.min(p, 0.55) * 1.4 + slip, 90);
    if (p > 0.55 && p < 0.8) sparks(298, 164, 14, (p - 0.55) / 0.25, 3);
  },
  nutDrop(p) {                                                        // the nut drops, then bounces out from under the car
    const x = 194 + p * 340;
    const hop = [[0, 0.25, 70], [0.25, 0.5, 46], [0.5, 0.7, 28], [0.7, 0.85, 16], [0.85, 1, 8]].find(([a, b]) => p >= a && p <= b) || [0, 1, 0];
    const q = (p - hop[0]) / (hop[1] - hop[0]);
    const y = 232 - Math.sin(q * Math.PI) * hop[2] - (p < 0.25 ? (1 - q) * 70 : 0);
    nutAt(x, y, 7, p * 30);
  },
  nutEscape(p) {                                                      // in the garage: out from under the car, bouncing, and gone under the tool chest
    ISO.ox = 230; ISO.oy = 106;
    if (p > 0.9) return;
    const q = p / 0.9, wx = lerp(80, 74, q), wy = lerp(86, 10, q);
    const bounce = Math.abs(Math.sin(q * Math.PI * 5)) * 14 * (1 - q);
    const m = P(wx, wy, bounce);
    nutAt(m[0], m[1], 3, p * 25, C.white);
  },
  extractSnap(p) {                                                    // the cheap extractor twists… and snaps
    if (p < 0.6) {
      const turn = p * 3;
      pipe(298, 164, 340, 120, 5, C.tool);
      pipe(340 - Math.cos(turn) * 22, 120 - Math.sin(turn) * 8, 340 + Math.cos(turn) * 22, 120 + Math.sin(turn) * 8, 5, C.steel2);
      return;
    }
    const q = (p - 0.6) / 0.4, fx = lerp(330, 470, q), fy = lerp(130, 40, q) + q * q * 60;
    pipe(298, 164, 312, 150, 5, C.tool);                              // the stub left in the bolt
    pipe(fx - 12, fy, fx + 12, fy - 6, 5, C.steel2);                  // the rest, flying off
    sparks(312, 150, 18, q, 9);
  },
  extractOk(p) {                                                      // the proper extractor bites and the bolt comes out
    const turn = p * 9, out = Math.max(0, (p - 0.5) / 0.5);
    const x = lerp(298, 360, ease(out)), y = lerp(164, 110, ease(out));
    nutAt(x, y, 8, turn, C.steel);
    pipe(x, y, x + 42, y - 44, 5, C.tool);
    pipe(x + 42 - Math.cos(turn) * 22, y - 44 - Math.sin(turn) * 8, x + 42 + Math.cos(turn) * 22, y - 44 + Math.sin(turn) * 8, 5, C.steel2);
  },
  sensorPull(p) {                                                     // the old sensor twists out of its hole
    const q = ease(p), x = lerp(246, 520, q), y = lerp(140, 170, q);
    disc(x, y, 30, BLACKPART); ring(x, y, 30, C.greyDark); ring(x, y, 22, shade(BLACKPART, 1.6));
    disc(x - 6 + Math.cos(p * 8) * 3, y - 6, 6, shade(BLACKPART, 1.5));
  },
  sensorFit(p) {                                                      // the new sensor goes in, and the nut goes on
    const q = ease(Math.min(1, p / 0.7)), x = lerp(-40, 246, q), y = lerp(170, 140, q);
    disc(x, y, 30, C.car); ring(x, y, 30, C.greyDark); ring(x, y, 22, C.carDark);
    if (p > 0.7) spanner(194, 162, -2.4 + (p - 0.7) * 10, 70);
  },
  screws(p) {                                                         // a box of hundreds of screws goes everywhere
    ISO.ox = 230; ISO.oy = 106;
    for (let k = 0; k < 120; k++) {
      const sx = 104 + hash(k, 2) * 70, sy = 10 + hash(2, k) * 16, tx = 90 + hash(k, 5) * 90, ty = 30 + hash(5, k) * 50;
      const q = Math.min(1, p * (1 + hash(k, 8))), z = 28 * (1 - q) + Math.sin(q * Math.PI) * 10;
      const pt = P(lerp(sx, tx, q), lerp(sy, ty, q), z);
      px(pt[0], pt[1], C.steel);
    }
  },
  found(p) {                                                          // a glint: the nut!
    ISO.ox = 230; ISO.oy = 106;
    const pt = P(150, 40), r = Math.round(4 + p * 10);
    line(pt[0] - r, pt[1], pt[0] + r, pt[1], C.white); line(pt[0], pt[1] - r, pt[0], pt[1] + r, C.white);
    nutAt(pt[0], pt[1], 4, p * 6, C.steel);
  },
  screwOut(p) {                                                       // a screwdriver turns a screw, and it rises out of the box
    ISO.ox = 240; ISO.oy = 64;
    const n = lastScrew(); if (!n) return;
    const [x, y] = BOX_SCREWS[n], rise = ease(p) * 14;               // how far it's come up
    const c = P(x, y, 40 + rise);
    disc(c[0], c[1], 4, C.steel); ring(c[0], c[1], 4, C.greyDark);
    const a = p * 12;                                                 // the slot turning
    line(c[0] - Math.cos(a) * 3, c[1] - Math.sin(a) * 1.5, c[0] + Math.cos(a) * 3, c[1] + Math.sin(a) * 1.5, C.greyDark);
    pipe(c[0], c[1] - 2, c[0] + 10, c[1] - 30, 3, C.steel2); pipe(c[0] + 10, c[1] - 30, c[0] + 16, c[1] - 44, 6, C.red);   // the screwdriver
  },
  screwShear(p) {                                                     // it turns, stiffens… and the head snaps off and flies away
    ISO.ox = 240; ISO.oy = 64;
    const n = lastScrew(); if (!n) return;
    const [x, y] = BOX_SCREWS[n], c = P(x, y, 40);
    if (p < 0.55) {                                                   // straining: the screwdriver shakes
      const shake = Math.round(Math.sin(p * 120) * (p * 3));
      disc(c[0], c[1], 4, C.steel); ring(c[0], c[1], 4, C.greyDark);
      pipe(c[0] + shake, c[1] - 2, c[0] + 10 + shake, c[1] - 30, 3, C.steel2); pipe(c[0] + 10 + shake, c[1] - 30, c[0] + 16 + shake, c[1] - 44, 6, C.red);
      return;
    }
    const q = (p - 0.55) / 0.45;                                      // SNAP: the head flies off
    const hx = c[0] + q * 120, hy = c[1] - Math.sin(q * Math.PI) * 50 + q * 40;
    disc(Math.round(hx), Math.round(hy), 4, C.steel);
    sparks(c[0], c[1], 14, q, 11);
  },
  benchLift(p) {                                                      // the old sensor lifts out of the box and off to the side
    const q = ease(p);
    benchPart({ part: 'old-sensor', rotated: true }, lerp(LIFT.in, LIFT.over + 30, q), Math.round(q * 90));
  },
  benchStuck(p) {                                                     // it goes in halfway, then judders
    const b = S.bench; if (!b) return;
    benchPart(b, p < 0.5 ? lerp(LIFT.over, LIFT.stuck, ease(p / 0.5)) : LIFT.stuck, p > 0.5 ? Math.round(Math.sin(p * 80) * 2) : 0);
  },
  benchPull(p) {                                                      // pulled out, with a lot of wiggling
    const b = S.bench; if (!b) return;
    benchPart(b, lerp(LIFT.stuck, LIFT.over, ease(p)), p < 0.7 ? Math.round(Math.sin(p * 90) * 3) : 0);
  },
  benchFit(p) {                                                       // it slides in, and clicks
    const b = S.bench; if (!b) return;
    benchPart(b, lerp(LIFT.over, LIFT.in, ease(Math.min(1, p / 0.7))), 0);
    if (p > 0.7) { const h = P(100, 95, 40); ring(h[0], h[1], Math.round(20 + (p - 0.7) * 60), C.white); }
  },
  kick(p) {                                                           // THUD! Something flies across the screen
    if (p < 0.35) {
      const r = 40 + p * 120, cx = W / 2, cy = H / 2, pts = [];
      for (let k = 0; k < 16; k++) { const a = k * 0.3927, rr = k % 2 ? r : r * 0.55; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7]); }
      poly(pts, C.warm);
      text('THUD!', cx - 38, cy - 9, C.red, 4);
    }
    const q = ease(p), x = lerp(-30, W + 40, q), y = H * 0.7 - Math.sin(q * Math.PI) * H * 0.55, a = p * 12;
    const c = Math.cos(a), s = Math.sin(a);
    poly([[-10, -14], [10, -14], [10, 14], [-10, 14]].map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]), C.tree2);
  },
  van(p) {                                                            // the courier's van pulls up, then drives off
    ISO.ox = 250; ISO.oy = 96;
    const x = p < 0.4 ? lerp(-420, 40, ease(p / 0.4)) : p < 0.65 ? 40 : lerp(40, 700, ease((p - 0.65) / 0.35)), y = 152;
    ibox(x, y, x + 60, y + 24, 4, 30, C.white, hex('#dcdcd4'));
    onRight(x + 60, y + 3, y + 21, 18, 27, C.glass);
    onLeft(y + 24, x + 10, x + 44, 12, 20, C.red);
    for (const wx of [12, 48]) { const [a, b] = P(x + wx, y + 24, 4); ellipse(a, b, 4, 3, C.tyre); }
  },
  tea(p) {                                                            // a mug of tea, steaming (for now)
    const inRoom = S.screen === 'room';                               // made at the kettle; or (anywhere else) in his hand
    [ISO.ox, ISO.oy] = inRoom ? VIEW.room : VIEW.home;
    const m = inRoom ? P(KETTLE[0] - 6, KETTLE[1] + 4, 8) : P(46, 84), x = m[0] + 6, y = m[1] - 22;
    rect(x, y, 5, 5, C.white); rect(x + 5, y + 1, 2, 3, C.white);
    for (let k = 0; k < 6; k++) { const q = (p * 2 + k / 6) % 1; px(x + 2 + Math.sin(q * 8 + k) * 2, y - q * 18, C.steel); }
  },
  start(p) {                                                          // crank, catch, rev; then the lights
    const rev = p < 0.3 ? Math.sin(p * 60) * 0.1 : p < 0.55 ? lerp(0, 1.6, (p - 0.3) / 0.25) : lerp(1.6, 0.55, ease((p - 0.55) / 0.45));
    dialNeedle(DASH.rpm, 2.5 + rev);
    if (S.flags.fitted) {
      warnLight(...DASH.gear, 'gear', C.red, p < 0.45);                                                                  // the red light goes OFF…
      warnLight(...DASH.abs, 'abs', C.warm, p > 0.62 && (p > 0.9 || Math.floor(p * 30) % 2 === 0));                     // …and the ABS light flicks ON
    }
  },
  clear(p) { warnLight(...DASH.gear, 'gear', C.red, p > 0.78); },
  rev(p) {                                                            // the accelerator pressed: the rev needle jumps and falls back
    const up = p < 0.22 ? p / 0.22 : Math.max(0, 1 - (p - 0.22) / 0.78);
    accelPedal(p < 0.5);
    dialNeedle(DASH.rpm, 3.05 + up * 2.2);
  },
  pedal() { accelPedal(true); },
  plugtry(p) { plugTryDraw(p); },                                     // a reader's plug goes up to the port: in, or a jiggle and back
  fusetest(p) { fuseTestDraw(p); },                                   // the meter's probes along the fuses, a dot on each
  garagedoor() { garageDoorDraw(); },                                 // the garage's roller door rolling up
};
// The roller door, part way up (from when you tapped the garage)
function garageDoorDraw() {
  if (!GARAGE_OPENING) return;
  ISO.ox = 250; ISO.oy = 96;
  const up = 28 * ease(Math.min(1, (performance.now() - GARAGE_OPENING) / 1100));   // how far up it has gone
  onLeft(60, 96, 134, 0, 28, hex('#1a1a20'));                          // dark inside
  onLeft(60, 96, 134, up, 28, C.steel);                                // what's left of the door, rolling into its drum
  for (let z = up + 3; z < 28; z += 3) line(...P(96, 60, z), ...P(134, 60, z), C.steel2);
  standingMan('home');                                                 // he's in front of the door: draw him again over it
}
const MOMENTS_MORE = {
  book(p) {                                                           // a book lifted off the shelf (or slid back on)
    if (!BOOK_MOVE) return;
    const e = ease(p);
    bookSpine(BOOK_MOVE.i, Math.round((BOOK_MOVE.out ? e : 1 - e) * 140));
  },
  night(p) {                                                          // going to bed: it gets dark, goes black, then it's day again
    let light;
    if (p < 0.4) light = 1 - p / 0.4;                                 // dusk…
    else if (p < 0.6) light = 0;                                      // …night…
    else light = (p - 0.6) / 0.4;                                     // …and morning
    const blue = Math.pow(light, 0.6);                                // blue fades last: it looks like dusk, not just dim
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) { d[i] *= light; d[i + 1] *= light; d[i + 2] *= blue; }
  },
  drawer(p) {                                                         // a tool chest drawer sliding out, or back in
    if (!DRAWER_MOVE) return;
    const e = ease(p);
    pulledDrawer(DRAWER_MOVE.d, DRAWER_MOVE.opening ? e : 1 - e);
  },                                      // pressed with the engine off: nothing happens
  horn(p) {                                                           // the middle of the wheel pressed in, and PARP!
    rbox(...HORN, 8, hex('#121316'));
    if (p < 0.8) text('PARP!', HORN[0], HORN[1] - 18, C.warm, 2);
  }        // the light goes out… then comes back
};
MOMENTS.rage = function (p) {                                        // he runs at the car, kicks the headlight, glass flies
  const ground = RAGE_CAR[1], hit = 0.62;
  const { size, kickX, standX } = RAGE_MAN;
  if (p < 0.55) man(lerp(20, kickX, ease(p / 0.55)), ground, 'walk', size, p * 60);      // running at it
  else if (p < 0.78) man(kickX, ground, 'kick', size);                                     // the kick
  else man(standX, ground, 'stand', size);                                                 // stood there, breathing hard
  if (p < hit) return;
  rageCar(true);                                                                           // the headlight's gone
  if (!RAGE.shook) { RAGE.shook = true; stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); }
  const tt = (p - hit) * 2.4;                                                              // seconds since the kick
  for (let k = 0; k < 18; k++) {                                                           // bits of glass flying out
    const vx = -30 - hash(k, 5) * 90, vy = -50 - hash(5, k) * 70;
    const x = RAGE_LAMP[0] + vx * tt, y = Math.min(ground - 1, RAGE_LAMP[1] + vy * tt + 160 * tt * tt);
    rect(x, y, 2, 1 + (k % 2), k % 3 ? hex('#c8e0f0') : C.white);
  }
};
// ----- too many drinks -----
MOMENTS.stoolFall = function (p) {                                   // he sways on his stool, tips over, and lands flat on the floor
  const seat = [PUB.stools[0], PUB_SEAT_Y], floor = PUB_FLOOR_AT;
  if (p < 0.45) {                                                     // swaying, more and more
    const sway = Math.round(Math.sin(p * 40) * p * 8);
    return man(seat[0] + sway, seat[1], 'sit', PUB.size);
  }
  if (p < 0.7) {                                                      // going over: down and back
    const q = ease((p - 0.45) / 0.25);
    return man(lerp(seat[0], floor[0], q), lerp(seat[1], floor[1], q * q), q < 0.5 ? 'sit' : 'lie', PUB.size);
  }
  man(floor[0], floor[1], 'lie', PUB.size);                           // flat out
};
MOMENTS.sick = function (p) {                                        // bent double on the pavement, and sick in the gutter
  ISO.ox = OUTSIDE_VIEW[0]; ISO.oy = OUTSIDE_VIEW[1];
  const [x, y] = manSpot('place'), m = P(x, y);
  man(m[0], m[1], p < 0.85 ? 'bend' : 'stand', 2);
  if (p > 0.25 && p < 0.75) {                                         // it comes up, and down onto the pavement
    for (let k = 0; k < 8; k++) {
      const q = ((p - 0.25) * 6 + k / 8) % 1;                         // each drop, part way down
      rect(m[0] + 15 + Math.round(q * 2), m[1] - 18 + Math.round(q * 18), 2, 2, k % 2 ? SICK : SICK_DARK);
    }
  }
  sickPuddle(Math.max(0, Math.min(1, (p - 0.3) / 0.45)));             // the puddle grows
};
MOMENTS.collapse = function (p) {                                    // he sways, folds in half, and goes down flat
  ISO.ox = VIEW.room[0]; ISO.oy = VIEW.room[1];
  const [x, y] = manSpot('room'), m = P(x, y);
  if (p < 0.4) return man(m[0] + Math.round(Math.sin(p * 30) * 2), m[1], 'stand', MAN_SIZE.room);
  if (p < 0.7) return man(m[0], m[1], 'bend', MAN_SIZE.room);
  man(m[0], m[1], 'lie', MAN_SIZE.room);
};
let SPIDER_RUN = { x: 400, y: 214 };                                  // where the spider was when the beam caught it
const SPIDER_FREEZE = 0.3;                                            // how long it sits frozen in the beam before it runs
MOMENTS.spider = function (p) {                                      // under something: a spider caught in the torch beam freezes, then scurries off
  if (p < SPIDER_FREEZE) return spiderAt(SPIDER_RUN.x, SPIDER_RUN.y, 0, true);   // frozen in the light: there it is
  const q = (p - SPIDER_FREEZE) / (1 - SPIDER_FREEZE);
  const run = ease(q);                                                 // how far it has run (quick start, slowing as it goes)
  const x = lerp(SPIDER_RUN.x, SPIDER_RUN.x + 140, run);               // from where it sat, off to the right…
  const y = lerp(SPIDER_RUN.y, SPIDER_RUN.y - 40, run) + Math.sin(q * 18) * 2;   // …and back into the dark, zig-zagging a little
  spiderAt(x, y, q * 40, true);                                        // you see it all the way: your eyes follow it
};
Object.assign(MOMENTS, MOMENTS_MORE);                                  // the rest of the moments

// A spider running to the right at x, y; each part is lit only where it's in the torchlight, so at the edge it's half lit
//   seen: drawn lit wherever it is (once the beam's found it, you can see it)
function spiderAt(x, y, phase, seen = false) {
  const litCol = hex('#6a5038'), darkCol = hex('#0c0c0e');             // brown in the light, nearly black outside it
  const lit = (px_, py_) => seen || inTorchLight(px_, py_);
  const colAt = (px_, py_) => (lit(px_, py_) ? litCol : darkCol);
  // seen from the side, low down on the floor: its body held up on its legs, the knees high, the feet on the floor (y)
  const by = y - 7;                                                    // its body, up off the floor
  const farCol = (px_, py_) => (lit(px_, py_) ? shade(litCol, 0.6) : darkCol);   // the legs on the far side, in its shadow
  for (const [far, col] of [[true, farCol], [false, colAt]]) {
    for (let n = 0; n < 4; n++) {                                      // 4 legs a side, scuttling back and forth (a big one)
      const step = Math.sin(phase + n * 1.6 + (far ? 1.2 : 0)) * 3;    // each leg swings out of step with the next
      const hip = [x - 4 + n * 2.5, by];                               // where the leg leaves the body
      const foot = [x - 13 + n * 8 + step + (far ? 2 : 0), y - (far ? 1 : 0)];   // where its foot lands, spread out front to back
      const knee = [(hip[0] + foot[0]) / 2 + (n < 2 ? -2 : 2), by - 6 - (n === 1 || n === 2 ? 2 : 0)];   // the knee, up above the body
      line(hip[0], hip[1], knee[0], knee[1], col(hip[0], hip[1]));
      line(knee[0], knee[1], foot[0], foot[1], col(foot[0], foot[1]));
    }
    if (far) {                                                         // the body between the two sides of legs
      ellipse(x - 4, by, 6, 4, colAt(x - 4, by));                      // its fat abdomen
      ellipse(x + 4, by + 1, 3, 3, colAt(x + 4, by));                  // its head
    }
  }
  if (lit(x - 4, by - 2)) { px(x - 5, by - 3, hex('#a08a68')); px(x - 3, by - 3, hex('#a08a68')); }   // a shine on its back, only in the light
  if (lit(x + 5, by)) { px(x + 6, by, C.white); px(x + 6, by - 1, C.white); }   // the glint of its eyes, only in the light
  rect(x - 10, y + 1, 20, 1, hex('#08080a'));                          // its shadow on the floor
}
