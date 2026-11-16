// The Thankless Task: things that move.
//   animate(t): small things on each screen that keep moving (t = seconds)
//   MOMENTS:    short animations for the big events (p goes from 0 to 1); dialogs wait for them
// Drawn every frame over a copy of the screen's still picture (see drawFrame in engine.js).

// How high the part on the workbench sits above the hole, for each state
const LIFT = { over: 56, stuck: 30, in: 12 };
// The part being tried on the workbench: lift = height above the hole, dx = a sideways judder
function benchPart(b, lift, dx) {
  ISO.ox = 240; ISO.oy = 64;
  const hex6 = b.part === 'part-mega', col = hex6 ? C.car : C.greyDark;
  const top = P(100, 95, 40 + lift + 38), bot = P(100, 95, 40 + lift);
  const x = bot[0] + dx;
  ellipse(x, bot[1], 14, 7, shade(col, 0.7));
  rect(x - 14, top[1], 29, bot[1] - top[1], col);
  rect(x - 10, top[1] + 2, 3, bot[1] - top[1] - 2, C.winGlass);
  ellipse(x, top[1], 14, 7, shade(col, 1.25));
  if (hex6) { rect(x - 15, top[1], 2, bot[1] - top[1], C.carDark); rect(x + 13, top[1], 2, bot[1] - top[1], C.carDark); }
  const py = b.rotated ? bot[1] - 10 : bot[1] - 18;
  rect(x - 20, py, 6, 3, C.tool); rect(x + 15, py, 6, 3, C.tool);
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
  const cols = [C.red, C.warm, hex('#40a060')];
  for (let k = 0; k < 3; k++) {                                                                                        // traffic
    const x = ((t * (50 + k * 12) + k * 380) % 1200) - 500;
    isoCarX(x, k % 2 ? 172 : 154, 0.9, cols[k]);
    if (PASSED[k] !== undefined && PASSED[k] < -60 && x >= -60) sfx('carpass');                                           // whoosh as it goes by
    PASSED[k] = x;
  }
  for (let k = 0; k < 2; k++) {                                                                                        // two birds
    const x = ((t * 22 + k * 260) % 560) - 40, y = 34 + k * 14 + Math.sin(t * 2 + k) * 3, w = Math.floor(t * 6 + k) % 2 ? 2 : 1;
    px(x - 2, y - w, C.ink); px(x - 1, y, C.ink); px(x, y + 1, C.ink); px(x + 1, y, C.ink); px(x + 2, y - w, C.ink);
  }
};
SCREENS.city.animate = function (t) {
  ISO.ox = S.cam.ox; ISO.oy = S.cam.oy;
  const cols = [C.red, C.warm, hex('#40a060'), C.white, C.steel2];          // never blue: blue is your car
  for (let k = 0; k < 8; k++) {                                                                                        // traffic on the streets
    const along = (t * (18 + k * 4) + k * 170) % (7 * BLOCK + STREET);
    if (k % 2) isoCarX(along - 20, (k % 7) * BLOCK + 6, 0.42, cols[k % 5]);
    else isoCar((k % 8) * BLOCK + 6, (along % (6 * BLOCK + STREET)) - 20, 0.42, cols[k % 5]);
  }
};
SCREENS.place.animate = function (t) {
  ISO.ox = 230; ISO.oy = 96;
  const i = placeIndex(S.place), cat = i >= 0 ? PLACES[i][1] : 'other';
  if (cat !== 'people' && !closedReason(S.place)) { const q = P(150, 56, 23); rect(q[0], q[1], 3, 2, Math.floor(t * 2) % 2 ? C.red : hex('#40a060')); }   // the till light
};
SCREENS.garage.animate = function (t) {
  ISO.ox = 230; ISO.oy = 106;
  if (flicker(t)) onLeft(0, 30, 90, 74, 77, C.steel2);                                                                 // the strip light
  const a = P(62, 86, 5), b = P(62, 86, 0);
  drip(t, a[0], a[1], b[1], 3.1, C.ink); dripSound(t, 3.1, 'garage');                                                 // oil dripping from the car
};
SCREENS.under.animate = function (t) { drip(t, 404, 132, 250, 2.7, C.ink); dripSound(t, 2.7, 'under'); drip(t + 1.3, 250, 160, 250, 3.9, hex('#2a2010')); };
SCREENS.underZoom.animate = function (t) { drip(t, 250, 176, 262, 2.9, hex('#2a2010')); };
SCREENS.bench.animate = function (t) {
  for (let k = 0; k < 10; k++) {                                                                                      // dust in the light
    const x = (hash(k, 1) * W + t * (4 + k)) % W, y = 30 + hash(1, k) * 150 + Math.sin(t + k) * 8;
    px(x, y, C.light);
  }
};
SCREENS.dash.animate = function (t) {
  if (!S.flags.running) return;
  disc(264, 152, 27, hex('#0e0f11'));                                                                                  // engine ticking over:
  const a = 3.05 + Math.sin(t * 23) * 0.03 + Math.sin(t * 5) * 0.02;                                                   // the rev needle trembles
  line(264, 152, 264 + Math.cos(a) * 26, 152 + Math.sin(a) * 26, C.red); disc(264, 152, 3, C.steel2);
};

// =====================================================================
// THE MAN, standing where he last walked to on the home and garage screens
// =====================================================================
const SPOT_HOME = { home: [46, 84], garage: [110, 74], place: [105, 140], outside: [100, 52], yard: [100, 150] };
const MAN_SIZE = { home: 2, garage: 2, place: 2, outside: 2, yard: 2 };
const VIEW = { home: [250, 96], garage: [230, 106], place: [230, 96], outside: [250, 70], yard: [240, 70] };
// A place in town has two views: outside (the shop front) and inside
function spotKey(screen) { return screen === 'place' ? (S.inside ? 'place' : 'outside') : screen; }
function manSpot(screen) { const k = spotKey(screen); return (S.spot && S.spot[k]) || SPOT_HOME[k]; }
// Draw him standing (not while he's walking: the walk draws him)
function standingMan(screen) {
  if (ANIM && ANIM.kind === 'walk') return;
  const [x, y] = manSpot(screen), m = P(x, y);
  man(m[0], m[1], 'stand', MAN_SIZE[spotKey(screen)]);
}
// Walk from where he is to a spot, then do `then` (open the screen he walked to)
function walkTo(x, y, then) {
  const screen = S.screen, key = spotKey(screen), from = manSpot(screen);
  const dist = Math.hypot(x - from[0], y - from[1]);
  if (dist < 3) return then();
  ANIM = { kind: 'walk', t0: performance.now(), dur: Math.max(500, dist * 28), from, to: [x, y], screen: key, then() {
    S.spot = S.spot || {};
    S.spot[key] = [x, y];
    then();
  } };
  render();                                                         // repaint without him standing still, so only the walking man shows
}

// =====================================================================
// MOMENTS
// =====================================================================
const MOMENTS = {
  walk(p) {                                                           // the man walks across to what you tapped
    const a = ANIM, [vx, vy] = VIEW[a.screen];
    ISO.ox = vx; ISO.oy = vy;
    const x = lerp(a.from[0], a.to[0], p), y = lerp(a.from[1], a.to[1], p), m = P(x, y);
    man(m[0], m[1], 'walk', MAN_SIZE[a.screen], p * a.dur / 90);
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
  nutDrop(p) {                                                        // the nut drops, bounces and rolls away
    let x = 194, y = 162;
    if (p < 0.3) y = 162 + ease(p / 0.3) * 70;
    else if (p < 0.45) y = 232 - Math.sin((p - 0.3) / 0.15 * Math.PI) * 18;
    else { y = 232; x = 194 + ease((p - 0.45) / 0.55) * 320; }
    nutAt(x, y, 7, p * 30);
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
  benchNo(p) {                                                        // the hexagonal one bangs on the round hole
    const b = S.bench; if (!b) return;
    benchPart(b, p < 0.4 ? lerp(LIFT.over, 40, ease(p / 0.4)) : 40 + Math.abs(Math.sin((p - 0.4) * 12)) * 6 * (1 - p), 0);
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
    ISO.ox = 250; ISO.oy = 96;
    const m = P(46, 84), x = m[0] + 6, y = m[1] - 22;
    rect(x, y, 5, 5, C.white); rect(x + 5, y + 1, 2, 3, C.white);
    for (let k = 0; k < 6; k++) { const q = (p * 2 + k / 6) % 1; px(x + 2 + Math.sin(q * 8 + k) * 2, y - q * 18, C.steel); }
  },
  start(p) {                                                          // crank, catch, rev; then the lights
    const rev = p < 0.3 ? Math.sin(p * 60) * 0.1 : p < 0.55 ? lerp(0, 1.6, (p - 0.3) / 0.25) : lerp(1.6, 0.55, ease((p - 0.55) / 0.45));
    disc(264, 152, 27, hex('#0e0f11'));
    line(264, 152, 264 + Math.cos(2.5 + rev) * 26, 152 + Math.sin(2.5 + rev) * 26, C.red); disc(264, 152, 3, C.steel2);
    if (S.flags.fitted) {
      warnLight(209, 126, 'gear', C.red, p < 0.45);                                                                    // the red light goes OFF…
      warnLight(209, 184, 'abs', C.warm, p > 0.62 && (p > 0.9 || Math.floor(p * 30) % 2 === 0));                       // …and the ABS light flicks ON
    }
  },
  clear(p) { warnLight(209, 126, 'gear', C.red, p > 0.78); },
  rev(p) {                                                            // a blip of the accelerator: the rev needle jumps and falls back
    const up = p < 0.22 ? p / 0.22 : Math.max(0, 1 - (p - 0.22) / 0.78);
    disc(264, 152, 27, hex('#0e0f11'));
    const a = 3.05 + up * 2.2;
    line(264, 152, 264 + Math.cos(a) * 26, 152 + Math.sin(a) * 26, C.red); disc(264, 152, 3, C.steel2);
  }        // the light goes out… then comes back
};
