// Bland Quest Auto: the paperboy (our own lad on a bike).
// One day, just home from town and stood on the drive, he cycles past along the pavement and throws a paper. It hits you on
// the head: down you go, flat on your back, a ring of stars going round above you, and birds twittering. Once a game.
//   S.flags.paperboy: he's been; S.flags.driveHomes: daytime arrivals on the drive so far

let PAPERBOY_CHANCE = window.NO_PAPERBOY ? 0 : 1 / 3;                  // the chance on each arrival (the tests turn it off, or up to 1)
const PAPERBOY_BY = 3;                                                 // he's been by this many, whatever the luck
const PAPERBOY_WAIT = 1500;                                            // ms after you get home
const PAPERBOY_Y = 147;                                                // the pavement's edge, where he rides
const PAPERBOY_SPEED = 105;                                            // how fast he rides (world units a second)
const PAPERBOY_BEHIND = 34;                                            // how far short of you along the street he is as he throws
// When each thing happens (seconds in)
const PAPERBOY_AT = { bell: 0.6, throw: 2.1, hit: 2.6, down: 3.1, up: 7.6, end: 8.6 };
const PAPERBOY_LOOK = { cap: hex('#2a8a5a'), top: hex('#f09030'), topDark: hex('#c06a18'), shorts: hex('#4a3a7a'), bag: hex('#e8dcb8'), bike: hex('#c02878') };
let PAPERBOY_DUE = null;                                               // when he's coming (performance.now()), if he is

// ---------- when he comes ----------
// Are you stood on the drive?
function onTheDrive() {
  const [x, y] = manSpot('home');
  return x > 86 && x < 142 && y > 58 && y < 140;
}
// Home from town (called as you arrive outside the house): is he coming this time?
function paperboyMaybe() {
  if (S.flags.paperboy || PAPERBOY_CHANCE === 0) return;               // been already, or turned off
  if (darkness() > 0 || !onTheDrive()) return;                         // by day, and only on the drive
  S.flags.driveHomes = (S.flags.driveHomes || 0) + 1;
  const longEnough = S.flags.driveHomes >= PAPERBOY_BY;
  if (longEnough || Math.random() < PAPERBOY_CHANCE) PAPERBOY_DUE = performance.now() + PAPERBOY_WAIT;
}
// Every frame outside the house: off he goes, once it's time and nothing else is happening
function paperboyTick() {
  if (PAPERBOY_DUE === null || performance.now() < PAPERBOY_DUE) return;
  if (S.flags.paperboy) { PAPERBOY_DUE = null; return; }
  if (S.screen !== 'home' || ANIM || DIALOG || CALL || GARAGE_OPENING) return;   // busy: he waits
  if (!onTheDrive() || darkness() > 0 || soakedAtHome() || wifeFollowing()) return;
  PAPERBOY_DUE = null;
  paperboyRides();
}
function paperboyRides() {
  S.flags.paperboy = true;
  moment('paperboy', PAPERBOY_AT.end * 1000);
  ANIM.then = paperboyAfter;
  sfx('bikebell', PAPERBOY_AT.bell);
  sfx('whoosh', PAPERBOY_AT.throw);
  sfx('bonk', PAPERBOY_AT.hit);
  sfx('thud', PAPERBOY_AT.down - 0.1);
  sfx('twitter', PAPERBOY_AT.down + 0.2);
  renderSoon();                                                        // repaint without you standing there (the moment draws you)
}
// You come round
function paperboyAfter() {
  pass(10);
  anger(5);
  say('The paper', "You pick it up. You're on the front page: LOCAL MAN STILL FIXING CAR.");
}

// ---------- drawing it ----------
// 0 before `from`, 1 after `from + lasts`, and in between on the way
function partWay(now, from, lasts) {
  const q = (now - from) / lasts;
  return Math.max(0, Math.min(1, q));
}
MOMENTS.paperboy = function (p, t) {
  [ISO.ox, ISO.oy] = VIEW.home;
  const now = p * PAPERBOY_AT.end;
  const [mx, my] = manSpot('home');
  const feet = P(mx, my);
  // you: standing, going over, flat out, then getting up
  const fallen = partWay(now, PAPERBOY_AT.hit, PAPERBOY_AT.down - PAPERBOY_AT.hit);
  const risen = partWay(now, PAPERBOY_AT.up, 0.7);
  const over = fallen - risen;                                         // 0 = upright, 1 = flat on your back
  if (over <= 0) man(feet[0], feet[1], 'stand', MAN_SIZE.home);
  else felledMan(feet[0], feet[1], over * over * Math.PI / 2);         // slow at first, then down with a bump
  inFront('home', mx, my);                                             // behind your car: it hides you
  const outCold = now > PAPERBOY_AT.down && now < PAPERBOY_AT.up;
  if (outCold) starRing(feet[0] - 34, feet[1] - 16, t);
  // him, riding by
  const bx = mx - PAPERBOY_BEHIND + (now - PAPERBOY_AT.throw) * PAPERBOY_SPEED;
  const throwing = Math.abs(now - PAPERBOY_AT.throw) < 0.3;
  drawPaperboy(bx, PAPERBOY_Y, t, throwing);
  for (const k of NEAR_LANE) drawTraffic(k, t);                        // the cars on the near side of the road are in front of him
  paperFlies(now, mx, feet);
};
// The paper: end over end through the air, off your head, and down beside you
function paperFlies(now, mx, feet) {
  const hand = P(mx - PAPERBOY_BEHIND + 5, PAPERBOY_Y, 36);
  const head = [feet[0] + 2, feet[1] - 36];
  if (now < PAPERBOY_AT.throw) return;                                 // still in his bag
  if (now < PAPERBOY_AT.hit) {
    const q = partWay(now, PAPERBOY_AT.throw, PAPERBOY_AT.hit - PAPERBOY_AT.throw);
    const arc = Math.sin(q * Math.PI) * 16;
    return rolledPaper(lerp(hand[0], head[0], q), lerp(hand[1], head[1], q) - arc, q * 14);
  }
  const q = partWay(now, PAPERBOY_AT.hit, 0.45);                       // it bounces off, onto the grass (not onto the car)
  rolledPaper(head[0] - q * 30, lerp(head[1], feet[1] + 12, q * q), 0.46 + (1 - q) * 6);
  if (q > 0.4) return;
  for (let k = 0; k < 8; k++) {                                        // BONK: a burst round your head
    const a = k / 8 * Math.PI * 2, r = 5 + q * 24;
    rect(Math.round(head[0] + Math.cos(a) * r), Math.round(head[1] + Math.sin(a) * r), 2, 2, k % 2 ? C.warm : C.white);
  }
}
// Him going over backwards: the standing man, turned about his feet (angle 0 = upright, a quarter turn = flat, head to the left)
function felledMan(x, y, angle) {
  const s = MAN_SIZE.home, cos = Math.cos(angle), sin = Math.sin(angle);
  const at = (dx, up) => [x + (dx * cos - up * sin) * s, y - (dx * sin + up * cos) * s - sin * 2];   // dx = across him, up = how high it is when he's stood
  const limbTo = (a, b, w, col) => pipe(...at(...a), ...at(...b), w, col);
  limbTo([0.2, 9], [-0.8, 0.5], 3, C.jeansDark);                       // legs
  limbTo([1.4, 9], [2, 0.5], 3, C.jeans);
  limbTo([0.8, 15], [0.8, 9.5], 5, C.shirt);                           // body
  const fling = sin * 3;                                               // his arms fly out as he goes
  limbTo([0, 14], [-1 - fling, 9 + fling], 2, C.shirtDark);
  limbTo([1.6, 14], [2 + fling, 9 + fling], 2, C.shirt);
  disc(...at(0.8, 17).map(Math.round), 3, C.skin);                     // head, and his hair at the top of it
  disc(...at(0.8, 18.4).map(Math.round), 2, C.hair);
}
// The ring of stars going round above his head: five, the ones at the back smaller and dimmer
const STAR_COUNT = 5;
function starRing(x, y, t) {
  for (let k = 0; k < STAR_COUNT; k++) {
    const a = t * 4 + k / STAR_COUNT * Math.PI * 2;
    const front = Math.sin(a) > 0;
    const col = front ? C.warm : shade(C.warm, 0.75);
    smallStar(x + Math.cos(a) * 18, y + Math.sin(a) * 6, front ? 3 : 2, col);
  }
}
function smallStar(x, y, r, col) {
  x = Math.round(x); y = Math.round(y);
  rect(x - r, y, r * 2 + 1, 1, col);                                   // its points…
  rect(x, y - r, 1, r * 2 + 1, col);
  if (r > 1) rect(x - 1, y - 1, 3, 3, col);                            // …and its middle
  px(x, y, C.white);
}
// A rolled-up newspaper, turned by a
function rolledPaper(x, y, a) {
  const dx = Math.cos(a) * 5, dy = Math.sin(a) * 5;
  pipe(x - dx, y - dy, x + dx, y + dy, 4, C.white);
  pipe(x - dx * 0.2, y - dy * 0.2, x + dx * 0.2, y + dy * 0.2, 4, C.steel2);   // the band round it
}
// The paperboy on his bike, riding along x (down-right). x, y: the ground under his pedals
function drawPaperboy(x, y, t, throwing) {
  const L = PAPERBOY_LOOK, at = (dx, z) => P(x + dx, y, z);
  const bar = (a, b, w, col) => pipe(...at(...a), ...at(...b), w, col);
  const middle = at(0, 0)[0];
  if (middle < -60 || middle > W + 60) return;                         // off the picture
  for (const wx of [-10, 10]) bikeWheel(at, wx, t);
  // his legs: the far one behind the frame; the pedals go round
  const spin = -t * 9, hip = [-5, 17];
  const leg = (turn, col) => {
    const foot = [Math.cos(turn) * 3, 6 + Math.sin(turn) * 3];
    const knee = [(hip[0] + foot[0]) / 2 + 5, (hip[1] + foot[1]) / 2 + 2];
    bar(hip, knee, 4, col);                                            // shorts to the knee…
    bar(knee, foot, 2, C.skin);                                        // …then bare leg
    bar(foot, [foot[0] + 2, foot[1]], 2, C.white);                     // his trainer
  };
  leg(spin + Math.PI, shade(L.shorts, 0.75));
  // the frame, handlebars and seat
  const frame = [[[-10, 6], [-5, 14]], [[-5, 14], [7, 14]], [[-10, 6], [0, 6]], [[0, 6], [7, 14]], [[-5, 14], [0, 6]]];
  for (const [a, b] of frame) bar(a, b, 2, L.bike);
  bar([7, 18], [10, 6], 2, C.steel);                                   // the forks
  bar([6, 20], [9, 20], 2, C.ink);                                     // the bars
  bar([-8, 16], [-3, 16], 2, C.ink);                                   // the seat
  leg(spin, L.shorts);
  // his body, leaning forward; the bag of papers on his back
  bar([-5, 18], [-1, 29], 6, L.top);
  bar([-9, 20], [-6, 25], 9, L.bag);
  bar([-9, 22], [-6, 24], 2, C.red);                                   // a red stripe on it
  bar([-7, 26], [0, 28], 1, shade(L.bag, 0.8));                        // its strap
  const elbow = throwing ? [4, 35] : [4, 23], hand = throwing ? [6, 37] : [8, 20];   // an arm flung up and over, or on the bars
  bar([-1, 28], elbow, 2, L.topDark);
  bar(elbow, hand, 2, C.skin);
  // his head, his cap on back to front
  const h = at(1, 34).map(Math.round);
  disc(h[0], h[1], 4, C.skin);
  rect(h[0] - 4, h[1] - 5, 9, 4, L.cap);
  rect(h[0] - 8, h[1] - 2, 5, 2, shade(L.cap, 0.75));                  // its peak, behind
  px(h[0] + 2, h[1], C.ink); px(h[0] + 4, h[1], C.ink);                // eyes
  rect(h[0] + 2, h[1] + 2, 2, 1, C.red);                               // a grin
}
// A bike wheel, its spokes turning (at = where a point of the bike is on screen; wx = how far along it the wheel is)
function bikeWheel(at, wx, t) {
  for (let k = 0; k < 28; k++) {                                       // the tyre
    const a = k / 28 * Math.PI * 2, c = at(wx + Math.cos(a) * 6, 6 + Math.sin(a) * 6);
    rect(Math.round(c[0]), Math.round(c[1]), 2, 2, C.tyre);
  }
  const turn = -t * PAPERBOY_SPEED / 6;
  for (const a of [turn, turn + Math.PI / 2]) {                        // two spokes, right across
    const dx = Math.cos(a) * 5, dz = Math.sin(a) * 5;
    line(...at(wx + dx, 6 + dz), ...at(wx - dx, 6 - dz), C.steel);
  }
}

// ---------- its sounds ----------
Object.assign(SOUNDS, {
  bikebell(t) {                                                        // dring dring
    for (let i = 0; i < 2; i++) for (let k = 0; k < 4; k++) tone(t + i * 0.35 + k * 0.05, 2300, 0.12, 0.07, 'triangle');
  },
  whoosh(t) { hiss(t, [500, 2200], 0.45, 0.15, 'bandpass', 2); },
  bonk(t) { tone(t, [420, 180], 0.16, 0.45, 'triangle'); hiss(t, 1200, 0.05, 0.35); },
  // birds twittering round his head: quick chirps, sliding up and down, in little runs
  twitter(t) {
    const gap = 0.55;                                                  // seconds from run to run
    const runs = Math.floor((PAPERBOY_AT.up - PAPERBOY_AT.down - 0.4) / gap);
    for (let run = 0; run < runs; run++) {
      const chirps = 3 + run % 3;
      for (let k = 0; k < chirps; k++) {
        const pitch = 2400 + hash(run, k) * 1400;
        const slide = (run + k) % 2 ? 1.35 : 0.75;
        tone(t + run * gap + k * 0.1, [pitch, pitch * slide], 0.08, 0.09);
      }
    }
  }
});
