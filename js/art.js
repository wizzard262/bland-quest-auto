// The Thankless Task: drawing kit. Everything is painted pixel by pixel into one image buffer, then scaled up with hard edges.
// Shared by every screen (screens.js). No game rules in here.

let W = 480, H = 270;                                    // picture size; some screens use a bigger one
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let img = ctx.createImageData(W, H);
let LABELS = [];                                         // real-text labels and tap areas a screen adds while it paints

// ---------- palette: bright daytime arcade colours ----------
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const C = {
  ink: hex('#101018'), grass: hex('#58b048'), grassDark: hex('#48a038'), grassLine: hex('#78c858'),
  hill1: hex('#8cc0b0'), hill2: hex('#6aa878'), tree1: hex('#3e9a40'), tree2: hex('#2e8034'),
  skin: hex('#e8b090'), hair: hex('#603818'), shirt: hex('#e04838'), shirtDark: hex('#a83020'), jeans: hex('#4060a8'), jeansDark: hex('#304a88'),
  ui: hex('#f4f4f0'), dim: hex('#a8b0a8'), mint: hex('#9ff3d0'), sun: hex('#fff4b0'),
  warm: hex('#f8d038'), warmDim: hex('#c8a030'), red: hex('#e04838'), redDim: hex('#a03028'),
  brick: hex('#c0583c'), brickLine: hex('#a04832'), cream: hex('#e8dcbc'), creamDark: hex('#c8b898'),
  roof: hex('#5a5a7a'), roofLine: hex('#46465e'), white: hex('#f4f4f0'), door: hex('#2860a0'), winGlass: hex('#78b0e8'),
  steel: hex('#b8bcc4'), steel2: hex('#8a909a'), grey: hex('#3a3a44'), greyDark: hex('#2a2a32'),
  car: hex('#3c78c8'), carDark: hex('#285094'), glass: hex('#203048'), tyre: hex('#222228'), rim: hex('#a8acb4'),
  concrete: hex('#c8c0a8'), concreteDark: hex('#aaa18a'), floor: hex('#9a927c'), drive: hex('#b4b4b0'), road: hex('#5a5a64'),
  bench: hex('#7a5634'), benchTop: hex('#b88a58'), wood: hex('#9a7048'), peg: hex('#c8a070'), pegHole: hex('#9a7048'),
  tool: hex('#5a5e68'), light: hex('#f8fff8'), rust: hex('#8a5028')
};

// ---------- pixel primitives ----------
function px(x, y, c) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
}
function rect(x, y, w, h, c) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px(xx, yy, c); }
function line(x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    px(x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function poly(points, c) {
  const ys = points.map(p => p[1]);
  for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(H - 1, Math.ceil(Math.max(...ys))); y++) {
    const cy = y + 0.5, xs = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if ((a[1] <= cy && b[1] > cy) || (b[1] <= cy && a[1] > cy)) xs.push(a[0] + (cy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) px(x, y, c);
  }
}
function disc(cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(cx + x, cy + y, c); }
function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
// Darken everything painted so far (used behind the phone)
function dim(f) { for (let i = 0; i < img.data.length; i += 4) { img.data[i] *= f; img.data[i + 1] *= f; img.data[i + 2] *= f; } }

// ---------- tiny 3 x 5 pixel font ----------
const FONT = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'], Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'],
  3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '##.'],
  '.': ['...', '...', '...', '...', '.#.'], ',': ['...', '...', '...', '.#.', '#..'], "'": ['.#.', '.#.', '...', '...', '...'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'], '?': ['##.', '..#', '.#.', '...', '.#.'], '&': ['.#.', '#.#', '.#.', '#.#', '.##'],
  '-': ['...', '...', '###', '...', '...'], ':': ['...', '.#.', '...', '.#.', '...'], '/': ['..#', '..#', '.#.', '#..', '#..'],
  '(': ['.#.', '#..', '#..', '#..', '.#.'], ')': ['.#.', '..#', '..#', '..#', '.#.'], '>': ['#..', '.#.', '..#', '.#.', '#..'],
  '+': ['...', '.#.', '###', '.#.', '...'], '£': ['.##', '#..', '###', '#..', '###'], ' ': ['...', '...', '...', '...', '...']
};
function text(str, x, y, c, s = 1) {
  x = Math.round(x); y = Math.round(y);
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const g = FONT[ch] || FONT[' '];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (g[r][k] === '#') rect(cx + k * s, y + r * s, s, s, c);
    cx += 4 * s;
  }
}
const textW = s => s.length * 4 - 1;
// A label with a small arrow pointing down at what you can tap
// go = the screen it opens when tapped (if any)
function hotspot(label, x, y, go) {
  const w = textW(label) + 6;
  rect(x - w / 2, y - 9, w, 9, C.ink);
  text(label, x - w / 2 + 3, y - 7, C.mint);
  px(x - 1, y, C.mint); px(x, y, C.mint); px(x + 1, y, C.mint); px(x, y + 1, C.mint);
  if (go) link(go, x - w / 2, y - 10, w, 12);
}
// An invisible tappable area over part of the picture that opens another screen
function link(go, x, y, w, h) {
  LABELS.push(`<a class="go" data-go="${go}" style="left:${x / W * 100}%;top:${y / H * 100}%;width:${w / W * 100}%;height:${h / H * 100}%"></a>`);
}
// A boxed panel with lines of pixel text
function panel(lines, x, y, colour = C.ui) {
  const w = Math.max(...lines.map(textW)) + 8, h = lines.length * 8 + 5;
  rect(x, y, w, h, C.ink); rect(x, y, w, 1, C.hill2); rect(x, y + h - 1, w, 1, C.hill2);
  rect(x, y, 1, h, C.hill2); rect(x + w - 1, y, 1, h, C.hill2);
  lines.forEach((ln, i) => text(ln, x + 4, y + 4 + i * 8, i === 0 ? C.mint : colour));
}

// ---------- the same strip on every world screen: time, task, anger, phone ----------
// s = how big the pixels of the strip are (2 on the bigger city picture, so it reads the same)
function hud() {
  const info = hudInfo();                                  // from the game: clock, current job, anger 0-100, unread texts
  const s = W >= 640 ? 2 : 1;
  rect(0, 0, W, 18 * s, C.ink);
  text(info.clock, 4 * s, 3 * s, C.dim, s);
  text('JOB: ' + info.task, 4 * s, 10 * s, C.ui, s);
  text('ANGER', W - 74 * s, 3 * s, C.dim, s);
  rect(W - 50 * s, 3 * s, 46 * s, 5 * s, C.grey);
  rect(W - 49 * s, 4 * s, Math.round(44 * s * info.anger / 100), 3 * s, info.anger > 75 ? C.red : C.warm);
  link('act:calm', W - 76 * s, 0, 74 * s, 12 * s);                     // tap the anger bar: ways to calm down
  // phone in your pocket, with a red dot for unread texts
  const x = W - 18 * s, y = H - 23 * s;
  rect(x, y, 11 * s, 17 * s, C.ink); rect(x + s, y + s, 9 * s, 15 * s, C.ui); rect(x + 2 * s, y + 3 * s, 7 * s, 10 * s, C.glass);
  if (info.unread) { disc(x + 10 * s, y + s, 3 * s, C.red); text(String(Math.min(info.unread, 9)), x + 9 * s, y - s, C.white, s); }
  link('phone', x - s, y - 4 * s, 14 * s, 22 * s);
  // notebook in your other pocket: the list of jobs and leads
  const nx = W - 34 * s;
  rect(nx, y + s, 12 * s, 15 * s, C.ink); rect(nx + s, y + 2 * s, 10 * s, 13 * s, C.warm); rect(nx + s, y + 2 * s, 2 * s, 13 * s, C.redDim);
  for (let k = 0; k < 4; k++) rect(nx + 4 * s, y + (5 + k * 3) * s, 6 * s, s, C.bench);
  link('notebook', nx - s, y, 14 * s, 18 * s);
}

// ---------- isometric drawing ----------
// World x runs down-right, world y runs down-left, z is straight up. ISO is where world 0,0,0 lands on screen
const ISO = { ox: 0, oy: 0 };
const P = (x, y, z = 0) => [ISO.ox + x - y, ISO.oy + (x + y) / 2 - z];
const shade = (c, f) => c.map(v => Math.max(0, Math.min(255, Math.round(v * f))));
// A box: the left wall (facing down-left), the right wall (facing down-right) and the top
function ibox(x0, y0, x1, y1, z0, z1, col, top) {
  poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], shade(col, 0.78));
  poly([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], col);
  poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], top || shade(col, 1.18));
}
// A patch painted on a wall that faces down-left (at y = yf) or down-right (at x = xf)
function onLeft(yf, a, b, c, d, col) { poly([P(a, yf, c), P(b, yf, c), P(b, yf, d), P(a, yf, d)], col); }
function onRight(xf, a, b, c, d, col) { poly([P(xf, a, c), P(xf, b, c), P(xf, b, d), P(xf, a, d)], col); }
// A flat patch on the ground (z = 0 unless given)
function ground(x0, y0, x1, y1, col, z = 0) { poly([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], col); }
// A pitched roof with its ridge running along x, from wall height h up r more
function gableRoof(x0, y0, x1, y1, h, r, wallCol, roofCol) {
  const ym = (y0 + y1) / 2;
  poly([P(x0, y0, h), P(x1, y0, h), P(x1, ym, h + r), P(x0, ym, h + r)], shade(roofCol, 0.8));
  poly([P(x0, y1, h), P(x1, y1, h), P(x1, ym, h + r), P(x0, ym, h + r)], roofCol);
  for (let t = 0.2; t < 1; t += 0.2) line(...P(x0, y1 + (ym - y1) * t, h + r * t), ...P(x1, y1 + (ym - y1) * t, h + r * t), shade(roofCol, 0.8));
  poly([P(x1, y0, h), P(x1, y1, h), P(x1, ym, h + r)], wallCol);
  line(...P(x0, y1, h), ...P(x1, y1, h), C.white); line(...P(x1, y1, h), ...P(x1, ym, h + r), C.white);
  line(...P(x0, ym, h + r), ...P(x1, ym, h + r), C.white);
}
// Brick lines across both walls of a box
function bricks(x0, y0, x1, y1, h, col) {
  for (let z = 4; z < h; z += 4) { line(...P(x0, y1, z), ...P(x1, y1, z), col); line(...P(x1, y0, z), ...P(x1, y1, z), shade(col, 1.1)); }
}
// A window with a white frame on a wall facing down-left or down-right
function winLeft(yf, a, b, c, d) { onLeft(yf, a - 1, b + 1, c - 1, d + 1, C.white); onLeft(yf, a, b, c, d, C.winGlass); onLeft(yf, (a + b) / 2, (a + b) / 2 + 1, c, d, C.white); }
function winRight(xf, a, b, c, d) { onRight(xf, a - 1, b + 1, c - 1, d + 1, C.white); onRight(xf, a, b, c, d, C.winGlass); onRight(xf, (a + b) / 2, (a + b) / 2 + 1, c, d, C.white); }
// A filled ellipse (a circle lying flat looks like this in isometric)
function ellipse(cx, cy, rx, ry, c) {
  for (let y = -ry; y <= ry; y++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); rect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1, c); }
}
// A round tree: trunk and a ball of leaves
function tree(x, y) {
  const [sx, sy] = P(x, y);
  rect(sx - 1, sy - 10, 3, 10, C.wood);
  disc(sx, sy - 18, 10, C.tree2); disc(sx - 3, sy - 21, 6, C.tree1);
}

// ---------- the car, isometric, nose pointing down-left (towards +y) ----------
// x, y = the back-left corner of where it stands; s = size (1 = full size); col = paint
// opts.broken: a wreck for the breakers yard (no wheels, no glass, rust, bonnet gone); opts.dz: lifts it (to stack wrecks)
// Shape from the side, front at y = 46: sloping hatch at the back, roof, raked windscreen, bonnet sloping down to the nose
function isoCar(x, y, s = 1, col = C.car, opts = {}) {
  const broken = !!opts.broken, dz = opts.dz || 0;
  // opts.alongX: the same car turned to drive along x (for parking at the kerb and traffic)
  const Q = opts.alongX ? (a, b, c) => P(x + b * s, y + a * s, (broken ? c - 3 : c) * s + dz)
                        : (a, b, c) => P(x + a * s, y + b * s, (broken ? c - 3 : c) * s + dz);
  const F = pts => pts.map(([a, b, c]) => Q(a, b, c));
  const glass = broken ? C.ink : C.glass;
  if (!dz) poly(F([[-2, 2, 0], [26, 2, 0], [26, 48, 0], [-2, 48, 0]]), shade(C.floor, 0.6));          // shadow
  poly(F([[2, 1, 14], [22, 1, 14], [22, 9, 22], [2, 9, 22]]), shade(col, 0.7));                       // back hatch
  poly(F([[24, 0, 4], [24, 0, 14], [24, 36, 15], [24, 46, 11], [24, 46, 4]]), col);                   // side
  poly(F([[24, 0, 4], [24, 46, 4], [24, 46, 6], [24, 0, 6]]), shade(col, 0.7));                       // sill
  poly(F([[22, 1, 14], [22, 9, 22], [22, 28, 22], [22, 36, 15]]), col);                              // side above the doors
  poly(F([[22, 3, 15], [22, 10, 21], [22, 27, 21], [22, 34, 15.5]]), glass);                         // side windows
  if (!broken) poly(F([[22, 18, 15], [22, 18, 21], [22, 19.5, 21], [22, 19.5, 15]]), col);           // door pillar
  poly(F([[0, 46, 4], [24, 46, 4], [24, 46, 11], [0, 46, 11]]), shade(col, 0.8));                     // nose
  poly(F([[0, 36, 15], [24, 36, 15], [24, 46, 11], [0, 46, 11]]), broken ? C.greyDark : shade(col, 1.15));   // bonnet (gone on a wreck)
  poly(F([[0, 0, 14], [24, 0, 14], [24, 1, 14], [0, 1, 14]]), shade(col, 1.15));
  poly(F([[2, 9, 22], [22, 9, 22], [22, 28, 22], [2, 28, 22]]), shade(col, 1.2));                     // roof
  poly(F([[2, 28, 22], [22, 28, 22], [24, 36, 15], [0, 36, 15]]), glass);                             // windscreen
  if (broken) {                                                                                         // rust patches
    for (let n = 0; n < 7; n++) { const p = Q(24, 4 + hash(n, x) * 38, 6 + hash(x, n) * 8); rect(p[0], p[1], 2 + (n % 2), 2, C.rust); }
    return;
  }
  poly(F([[2, 46, 7], [6, 46, 7], [6, 46, 10], [2, 46, 10]]), C.warm); poly(F([[18, 46, 7], [22, 46, 7], [22, 46, 10], [18, 46, 10]]), C.warm);   // headlights
  if (s >= 1) { const d = Q(15, 31, 19); rect(d[0], d[1], 2, 2, C.red); }                            // the red light on the dash
  for (const wy of [9, 37]) {                                                                          // wheels
    const [wx, wz] = Q(24, wy, 4);
    ellipse(wx, wz, Math.max(1, Math.round((opts.alongX ? 4 : 3) * s)), Math.max(1, Math.round((opts.alongX ? 4 : 4.5) * s)), C.tyre);
    if (s >= 0.8) ellipse(wx, wz, Math.round(1.5 * s), Math.round(2.2 * s), C.rim);
  }
}

// ---------- the man: tall, thin, 1-pixel limbs, no face; red shirt, jeans ----------
// s = pixel size (2 draws him twice as big, still with chunky 1-pixel-wide limbs)
function man(x, y, pose, s = 1, phase = 0, look) {
  // look: other clothes for other people, e.g. { shirt, shirtDark, jeans, jeansDark, hair, skin }
  const K = Object.assign({ skin: C.skin, hair: C.hair, shirt: C.shirt, shirtDark: C.shirtDark, jeans: C.jeans, jeansDark: C.jeansDark }, look || {});
  x = Math.round(x); y = Math.round(y);
  const R = (dx, dy, w, h, c) => rect(x + dx * s, y + dy * s, w * s, h * s, c);
  const D = (dx, dy, c) => R(dx, dy, 1, 1, c);
  const L = (x0, y0, x1, y1, c) => {                     // a 1-pixel line, each pixel s x s
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (true) { D(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  };
  if (pose === 'lie') {                                  // on his back on a creeper, head on the left, knees up, arm up
    R(0, -3, 3, 2, K.skin); D(0, -3, K.hair); R(4, -3, 6, 2, K.shirt);
    L(10, -3, 13, -7, K.jeansDark); L(13, -7, 16, -2, K.jeansDark);
    L(10, -2, 14, -6, K.jeans); L(14, -6, 18, -2, K.jeans);
    L(6, -4, 7, -9, K.shirt); D(7, -10, K.skin); return;
  }
  if (pose === 'walk') {                                 // mid-stride: legs and arms swing opposite ways; phase = how far through the step
    const sw = Math.round(Math.sin(phase) * 2), up = Math.abs(Math.sin(phase)) < 0.4 ? 0 : 1;
    const Y = d => d - up;                               // a little bob on each step
    R(0, Y(-19), 2, 3, K.skin); R(0, Y(-19), 2, 1, K.hair); D(0, Y(-16), K.skin);
    R(0, Y(-15), 2, 5, K.shirt); D(0, Y(-10), K.jeans);
    L(0, Y(-9), -1 - sw, -1, K.jeansDark); L(1, Y(-9), 2 + sw, -1, K.jeans);
    L(0, Y(-14), -1 + sw, Y(-9), K.shirtDark); D(-1 + sw, Y(-8), K.skin);
    L(1, Y(-14), 2 - sw, Y(-9), K.shirt); D(2 - sw, Y(-8), K.skin);
    return;
  }
  R(0, -19, 2, 3, K.skin); R(0, -19, 2, 1, K.hair); D(0, -16, K.skin);
  R(0, -15, 2, 5, K.shirt); D(0, -10, K.jeans);
  L(0, -9, -1, -1, K.jeansDark); L(1, -9, 2, -1, K.jeans);
  L(0, -14, -1, -9, K.shirtDark); D(-1, -8, K.skin);
  L(1, -14, 2, -9, K.shirt); D(2, -8, K.skin);
}

// ---------- things you can point at: invisible until the pointer is over them ----------
// The screen box round an isometric box (for a hover area over an object)
// Also gives the box's outline (its six-sided silhouette), so only the object itself lights up and can be tapped
function isoArea(x0, y0, x1, y1, z0, z1) {
  const outline = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0), P(x0, y1, z1)];
  const xs = outline.map(p => p[0]), ys = outline.map(p => p[1]);
  const l = Math.min(...xs), t = Math.min(...ys), w = Math.max(...xs) - l, h = Math.max(...ys) - t;
  return [l, t, w, h, outline.map(([x, y]) => [(x - l) / Math.max(w, 1) * 100, (y - t) / Math.max(h, 1) * 100])];
}
// A thing you can tap: area = [x, y, w, h] in picture pixels; it lights up and shows its name when pointed at.
// walk = [x, y] world spot the man walks to first (home and garage); style = extra colours for the name
function spot(label, area, go, walk, style = '') {
  const [x, y, w, h, outline] = area;
  const walkAttr = walk ? ` data-walk="${walk[0]},${walk[1]}"` : '';
  const clip = outline ? `;clip-path:polygon(${outline.map(([a, b]) => `${a.toFixed(1)}% ${b.toFixed(1)}%`).join(',')})` : '';
  const box = `left:${x / W * 100}%;top:${y / H * 100}%;width:${w / W * 100}%;height:${h / H * 100}%`;
  // the shape you point at, then its name (a separate piece, so the shape's outline doesn't cut the name off)
  LABELS.push(`<a class="hs${outline ? ' shaped' : ''}" data-go="${go}"${walkAttr} style="${box}${clip}"></a><span class="lab" style="left:${(x + w / 2) / W * 100}%;top:${y / H * 100}%${style ? ';' + style : ''}">${label}</span>`);
}


// ---------- 5. Under the car: lying underneath, looking straight up (back of the car on the left) ----------
// Detail helpers: grimy fills, rounded boxes, rings, bolts, dashed zoom boxes
function grime(x, y, w, h, col, amt = 0.18, seed = 1) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px(xx, yy, shade(col, 1 + (hash(xx * 3 + seed, yy * 7) - 0.5) * amt));
}
function rbox(x, y, w, h, r, col) {
  for (let yy = 0; yy < h; yy++) {
    const dy = yy < r ? r - yy : yy >= h - r ? yy - (h - r - 1) : 0;
    const inset = dy ? Math.round(r - Math.sqrt(Math.max(0, r * r - dy * dy))) : 0;
    rect(x + inset, y + yy, w - inset * 2, 1, col);
  }
}
function ring(cx, cy, r, col) { for (let a = 0; a < 6.283; a += 0.5 / Math.max(r, 1)) px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, col); }
// A hex bolt head seen end-on; a stripped one is rounded off and shiny
function bolt(cx, cy, r, stripped) {
  disc(cx, cy, r + 1, C.greyDark);
  if (stripped) { disc(cx, cy, r, C.steel); disc(cx - 1, cy - 1, r - 2, C.light); return; }
  const pts = []; for (let k = 0; k < 6; k++) pts.push([cx + Math.cos(k * 1.047) * r, cy + Math.sin(k * 1.047) * r]);
  poly(pts, C.steel2); line(pts[3][0], pts[3][1], pts[4][0], pts[4][1], C.steel); line(pts[4][0], pts[4][1], pts[5][0], pts[5][1], C.steel);
  disc(cx, cy, Math.max(1, r - 3), shade(C.steel2, 0.85));
}
function dashBox(x, y, w, h, col) {
  for (let k = 0; k < w; k += 4) { rect(x + k, y, 2, 1, col); rect(x + k, y + h - 1, 2, 1, col); }
  for (let k = 0; k < h; k += 4) { rect(x, y + k, 1, 2, col); rect(x + w - 1, y + k, 1, 2, col); }
}
// A pipe from one point to another, w wide, with a light edge and a dark edge
function pipe(x0, y0, x1, y1, w, col) {
  const len = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
  for (let k = -w / 2; k <= w / 2; k += 0.5) {
    const c = k < -w / 2 + 1 ? shade(col, 1.35) : k > w / 2 - 1 ? shade(col, 0.6) : col;
    line(x0 + nx * k, y0 + ny * k, x1 + nx * k, y1 + ny * k, c);
  }
}
// A real-text label on a zoom box
function zoomLabel(name, x, y, hot, go) {
  LABELS.push(`<div class="zl${hot ? ' hot' : ''}"${go ? ` data-go="${go}"` : ''} style="left:${x / W * 100}%;top:${y / H * 100}%">🔍 ${name}</div>`);
}
// Dashed zoom boxes with their labels; a box with a screen to go to can be tapped
function zoomZones(zones) {
  for (const [name, x, y, w, h, hot, go] of zones) spot('🔍 ' + name, [x, y, w, h], go || 'act:look:' + name);
}
const UNDERSIDE = hex('#4a4540'), BLACKPART = hex('#24221f'), ALLOY = hex('#a4a6a0'), RUSTPIPE = hex('#7a6656');
const CARDBOARD = hex('#c09060');
const FUSECOLS = [[C.red, '10A'], [C.car, '15A'], [C.warm, '20A'], [hex('#e8e8e0'), '25A'], [hex('#40a060'), '30A']];

// A small warning-light icon, lit (bright) or not (dark)
function warnLight(x, y, kind, col, lit) {
  const c = lit ? col : hex('#2a2c30');
  if (kind === 'gear') { disc(x, y, 5, c); for (let a = 0; a < 6.28; a += 0.785) rect(Math.round(x + Math.cos(a) * 6) - 1, Math.round(y + Math.sin(a) * 6) - 1, 2, 2, c); disc(x, y, 2, hex('#101012')); }
  if (kind === 'engine') { rect(x - 6, y - 3, 12, 7, c); rect(x - 3, y - 6, 6, 3, c); rect(x + 6, y - 1, 2, 3, c); }
  if (kind === 'battery') { rect(x - 6, y - 4, 12, 8, c); rect(x - 4, y - 6, 2, 2, c); rect(x + 2, y - 6, 2, 2, c); }
  if (kind === 'oil') { rect(x - 7, y - 1, 10, 5, c); rect(x + 3, y - 3, 4, 2, c); px(x + 6, y + 3, c); }
  if (kind === 'abs') { ring(x, y, 6, c); text('ABS', x - 5, y - 2, c); }
}
