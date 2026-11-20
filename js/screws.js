// Bland Quest Auto: the screw jar.
// Screw 3 on the bench snapped; its stub has to come out with the stud extractor. Then the third hole needs a
// screw, and somewhere in the screw jar on the garage shelf there's one that matches. Take the jar down and the
// bottom falls out: hundreds of screws all over the garage floor. Sweep them up with the dustpan (move the
// pointer over them), then sort through a tray of them, trying each in the hole. Most are wrong; one is right.
//   S.flags.jarSwept: the floor's been swept up; S.flags.screw3: the third screw's found and in
//   S.flags.screwsTried: the tray screws you've tried (by number)

const SCREW_JAR = 'Screw jar';
// Do you need a screw for the third hole? (the stub's out, and you haven't found one yet)
const screwNeeded = () => !!S.flags.stubOut && !S.flags.screw3;

// ---------- the jar, on the garage shelf ----------
function shelfJar() {
  if (!screwNeeded()) return say(SCREW_JAR, 'An old coffee jar full of screws. Hundreds of them. None of them match anything.');
  if (S.flags.jarSwept) { S.screwPick = null; return show('screwtray'); }   // swept up already: sort through them
  say(SCREW_JAR, 'Somewhere in here there\'s a screw that matches. There\'s always one.', [
    { label: 'Take the jar down', run: jarSpill },
    { label: 'Leave it', run() {} }
  ]);
}
// You lift it down… and the bottom falls out. Then it's the dustpan
function jarSpill() {
  show('garage');
  moment('jarspill', 1600);
  sfx('glass', 0.2); sfx('screws', 0.3);
  stillAfter('snap');                                                  // (the comic-book flash of it going)
  S.flags.jarSpilt = true;                                             // (it's on the floor till you sweep it up)
  ANIM.then = () => {
    anger(10);
    SWEEP.got = new Set();
    show('sweep');
    say('CRASH', 'The bottom falls out of the jar. Hundreds of screws, all over the garage floor. In every corner. Under everything.\n\nThe dustpan, then.');
  };
}
// The moment: from the shelf, screws everywhere across the floor
MOMENTS.jarspill = function (p) {
  [ISO.ox, ISO.oy] = VIEW.garage;
  for (let k = 0; k < 160; k++) {
    const sx = 20 + hash(k, 2) * 20, sy = 4 + hash(2, k) * 4;             // from the jar, on the shelf
    const tx = 10 + hash(k, 5) * 150, ty = 14 + hash(5, k) * 110;         // to anywhere on the floor
    const q = Math.min(1, p * (1 + hash(k, 8))), z = 44 * (1 - q) + Math.sin(q * Math.PI) * 12;
    const pt = P(lerp(sx, tx, q), lerp(sy, ty, q), z);
    rect(pt[0], pt[1], 2, 1, C.steel);
  }
};

// ---------- sweeping up: move the dustpan over the screws ----------
const SWEEP_N = 150;                                                    // how many screws are on the floor
const SWEEP_PAN = [44, 24];                                             // the dustpan's mouth: wide, tall
const SWEEP_DONE = 0.95;                                                // swept up when this much is back
const SWEEP = { pos: [240, 150], got: new Set() };
// Where screw k lies, and which way it points
const sweepScrew = k => [24 + hash(k, 31) * 432, 40 + hash(31, k) * 214, hash(k, 7) * 3.1];
SCREENS.sweep = {
  size: [480, 270],
  paint() {
    grime(0, 18, W, H - 18, C.floor, 0.12, 77);                         // the garage floor, close up
    for (let k = 0; k < 10; k++) ellipse(40 + hash(k, 4) * 400, 60 + hash(4, k) * 190, 14 + hash(k, k) * 18, 5, shade(C.floor, 0.85));   // oil stains
    rect(0, 18, W, 14, C.cream);                                        // the bottom of the wall
    tip('Sweep them up', 'Move the dustpan over the screws to sweep them in.', 1, 8);
    hud();
  },
  animate(t) {
    for (let k = 0; k < SWEEP_N; k++) {                                  // the screws still on the floor
      if (SWEEP.got.has(k)) continue;
      const [x, y, a] = sweepScrew(k);
      pipe(x, y, x + Math.cos(a) * 10, y + Math.sin(a) * 4, 2, C.steel2);   // the shank
      disc(x, y, 2, hex('#e8ecf0'));                                    // the head, catching the light
    }
    const [px0, py0] = SWEEP.pos, [w, h] = SWEEP_PAN;
    rect(px0 - w / 2, py0 - h / 2, w, h, C.red);                        // the dustpan: red plastic
    rect(px0 - w / 2 + 2, py0 - h / 2 + 2, w - 4, h - 6, shade(C.red, 0.7));   // its scoop
    rect(px0 + w / 2, py0 - 3, 22, 6, shade(C.red, 0.85));              // its handle
    text(`SWEPT UP ${SWEEP.got.size} OF ${SWEEP_N}`, 330, 24, C.ink);
  },
  actions() { return [{ label: 'Leave them for now', act: 'go:garage' }]; }
};
// The pointer moved: the dustpan goes there and takes in any screws under it
function sweepMove(x, y) {
  if (S.flags.jarSwept) return;
  SWEEP.pos = [Math.max(24, Math.min(W - 24, x)), Math.max(40, Math.min(H - 12, y))];
  const [w, h] = SWEEP_PAN, before = SWEEP.got.size;
  for (let k = 0; k < SWEEP_N; k++) {
    if (SWEEP.got.has(k)) continue;
    const [sx, sy] = sweepScrew(k);
    if (Math.abs(sx - SWEEP.pos[0]) < w / 2 && Math.abs(sy - SWEEP.pos[1]) < h / 2) SWEEP.got.add(k);
  }
  if (SWEEP.got.size > before) sfx('clink');
  if (SWEEP.got.size >= SWEEP_N * SWEEP_DONE) sweptUp();
}
// Most of them back in the jar: now sort through them
function sweptUp() {
  S.flags.jarSwept = true;
  pass(30);
  closeLead('jar', 'ok');
  S.screwPick = null;
  show('screwtray');
  say('Swept up', 'Half an hour on your knees. Most of them are back in a jar. The rest are under the fridge for ever.\n\nNow: one of these will fit. Tip a handful in the tray and try them.');
}

// ---------- the tray: try screws in the third hole ----------
// [what it looks like: length, head, thread, colour] and what happens when you try it
const TRAY = [
  [[30, 'flat', 'coarse', C.steel], 'A wood screw. It goes in three turns and starts chewing the alloy. Out it comes.'],
  [[14, 'round', 'fine', C.steel2], 'Too short. It doesn\'t reach the thread.'],
  [[40, 'hex', 'fine', C.steel], 'Far too long. It bottoms out with the sensor still rocking.'],
  [[22, 'round', 'fine', hex('#c8a048')], 'Brass, and the thread\'s too fine. It spins and spins and never bites.'],
  [[22, 'flat', 'coarse', C.steel2], 'A self-tapper. It\'d go in, once. Then never come out. You put it back.'],
  [[24, 'hex', 'fine', C.steel], 'Imperial. Close, so close. It crosses the thread and binds.'],
  [[18, 'round', 'fine', C.steel2], 'Nearly. One turn short. The sensor still wobbles.'],
  [[24, 'round', 'fine', C.steel], null],                               // the one that's right
  [[26, 'flat', 'fine', hex('#2a2a2a')], 'A black one off something else entirely. The head\'s too big to sit flat.'],
  [[20, 'hex', 'coarse', C.steel2], 'A coach bolt, really. Not a chance.'],
  [[24, 'round', 'fine', C.rust], 'The right size! Rusted solid. The thread\'s gone.'],
  [[12, 'flat', 'fine', C.steel], 'A tiny one from a pair of glasses. Why is that in here?']
];
const TRAY_RIGHT = 7;
const trayAt = k => [60 + (k % 4) * 100, 76 + Math.floor(k / 4) * 60];   // where each lies in the tray
SCREENS.screwtray = {
  size: [480, 270],
  paint() {
    rect(0, 18, W, H - 18, C.bench);                                    // the workbench
    rbox(30, 50, 420, 190, 10, C.steel2); rbox(36, 56, 408, 178, 8, hex('#4a4c50'));   // the magnetic tray
    const tried = S.flags.screwsTried || [];
    TRAY.forEach(([[len, head, thread, col]], k) => {
      const [x, y] = trayAt(k);
      const c = tried.includes(k) ? shade(col, 0.45) : col;           // tried ones, dulled
      rect(x, y - 2, len * 2, 4, c);                                    // the shank
      for (let i = 4; i < len * 2; i += thread === 'coarse' ? 5 : 3) line(x + i, y - 2, x + i - 1, y + 2, shade(c, 0.7));   // its thread
      if (head === 'hex') rect(x - 8, y - 6, 8, 12, c);
      else if (head === 'flat') poly([[x - 6, y - 7], [x, y - 2], [x, y + 2], [x - 6, y + 7]], c);
      else disc(x - 4, y, 6, c);
      if (tried.includes(k)) { line(x - 8, y - 8, x + len * 2, y + 8, C.red); return; }   // tried: crossed out
      spot(`Try screw ${k + 1}`, [x - 12, y - 14, len * 2 + 16, 28], 'act:trayscrew:' + k);
    });
    tip('The screw tray', 'Tap a screw to try it in the third hole.', 1, 8);
    hud();
  },
  actions() { return [{ label: 'Back to the workbench', act: 'go:bench' }]; }
};
// Try screw k in the third hole
function trayScrew(k) {
  S.flags.screwsTried = S.flags.screwsTried || [];
  if (S.flags.screwsTried.includes(k)) return;
  pass(5);
  if (k === TRAY_RIGHT) {                                               // the one
    S.flags.screw3 = true;
    sfx('ratchet'); sfx('ding', 0.6);
    finishJob('screw3', `Screw ${k + 1} from the jar: a perfect match`);
    show('bench');
    return say('Screw ' + (k + 1), 'It winds in. Snug. Not too long, not too short, the right thread.\n\nAll four screws. The sensor doesn\'t move. Now the box can go back on the car.');
  }
  S.flags.screwsTried.push(k);
  anger(3);
  sfx('creak');
  say('Screw ' + (k + 1), TRAY[k][1]);
}

// The third screw: a job once the stub's out
function screwJob() {
  job('screw3', 'Find a screw to match for the third hole', null);
  lead('screw3', 'jar', 'The screw jar on the garage shelf', 'you', 'hopeful', 'stores');
}

Object.assign(ACTIONS, {
  trayscrew(k) { trayScrew(+k); }                                       // the tray: try one in the hole
});
