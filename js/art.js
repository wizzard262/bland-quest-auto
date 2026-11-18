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

// The anger bar: green, then orange, then red; it shakes when it goes up, and all the time over half (faster the angrier)
let ANGER_UP = 0;                                           // when anger last went up (performance.now())
function angerBar(anger, x, y, w, h) {
  const colour = anger < 40 ? 'calm' : anger < 70 ? 'cross' : 'furious';
  const bump = performance.now() - ANGER_UP < 700 ? ' bump' : '';
  const shake = anger > 50 ? ` shaking" style="--speed:${(0.5 - (anger - 50) / 50 * 0.42).toFixed(2)}s;` : '" style="';
  LABELS.push(`<div class="anger ${colour}${bump}${shake}left:${x / W * 100}%;top:${y / H * 100}%;width:${w / W * 100}%;height:${h / H * 100}%"><i style="width:${anger}%"></i></div>`);
}
// ---------- the same strip on every world screen: time, task, anger, phone ----------
// s = how big the pixels of the strip are (2 on the bigger city picture, so it reads the same)
function hud() {
  const info = hudInfo();                                  // from the game: clock, current job, anger 0-100, unread texts
  const s = W > 500 ? 2 : 1;                               // the town map is bigger: draw the strip twice size there
  rect(0, 0, W, 18 * s, C.ink);
  text(info.clock, 4 * s, 3 * s, C.dim, s);
  text('JOB: ' + info.task, 4 * s, 10 * s, C.ui, s);
  text('ANGER', W - 74 * s, 3 * s, C.dim, s);
  angerBar(info.anger, W - 50 * s, 3 * s, 46 * s, 5 * s);           // the anger bar (it shakes when you're wound up)
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
// Each body shape is its side view, from the back (y = 0) to the nose (y = L), as heights:
//   tz = top of the back, hy = end of the back deck, ry0..ry1 = the roof (at height rz),
//   sy, sz = the bottom of the windscreen, nz = the top of the nose; inset = how much narrower the cabin is
// rearGlass: the slope at the back is a window (a saloon's), not a solid hatch; win: the side window's own outline
const CAR_SHAPES = {
  zafira:    { L: 46, tz: 14, hy: 1, ry0: 9,  rz: 22, ry1: 28, sy: 36, sz: 15, nz: 11 },            // ours (the 2005 shape)
  zafiraOld: { L: 44, tz: 15, hy: 1, ry0: 5,  rz: 23, ry1: 27, sy: 34, sz: 15.5, nz: 12 },          // 1999: upright and boxy
  zafiraNew: { L: 48, tz: 13, hy: 2, ry0: 13, rz: 21, ry1: 27, sy: 38, sz: 14, nz: 10 },            // 2006: sleeker, more raked
  astra:     { L: 40, tz: 13, hy: 1, ry0: 8,  rz: 19, ry1: 22, sy: 30, sz: 13, nz: 10 },            // a small hatchback
  saloon:    { L: 48, tz: 14, hy: 9, ry0: 16, rz: 20, ry1: 28, sy: 35, sz: 14, nz: 11, rearGlass: true },
  city:      { L: 34, tz: 13, hy: 1, ry0: 5,  rz: 20, ry1: 19, sy: 25, sz: 13, nz: 10 },            // tiny
  van:       { L: 52, tz: 30, hy: 0, ry0: 0,  rz: 30, ry1: 39, sy: 44, sz: 17, nz: 13, inset: 0, win: [[38, 18], [38, 28], [40, 28], [43, 18]] }
};
// opts.shape: one of CAR_SHAPES (ours if not given); opts.alongX: turned to drive along x (parking at the kerb, traffic)
// opts.broken: a wreck (rust, dark empty windows, a smashed headlight); opts.noWheels: down on its axles;
// opts.noBonnet: the bonnet's gone (you see the engine bay); opts.flat: flat tyres; opts.dz: lifts it (to stack wrecks)
// opts.reverse: facing the other way, so you see its back (traffic coming the other way)
function isoCar(x, y, s = 1, col = C.car, opts = {}) {
  const K = CAR_SHAPES[opts.shape] || CAR_SHAPES.zafira;
  const broken = !!opts.broken, dz = opts.dz || 0;
  const sink = opts.noWheels ? 3 : 0;                                                    // no wheels: it sits lower
  const rev = !!opts.reverse;                                                            // facing the other way: front to back
  const flip = b => rev ? K.L - b : b;
  const Q = opts.alongX ? (a, b, c) => P(x + flip(b) * s, y + a * s, (c - sink) * s + dz)
                        : (a, b, c) => P(x + a * s, y + flip(b) * s, (c - sink) * s + dz);
  const F = pts => pts.map(([a, b, c]) => Q(a, b, c));
  const side = pts => F(pts.map(([b, c]) => [24, b, c]));                                // a shape on the side we see
  const nose = pts => rev ? [] : F(pts.map(([a, c]) => [a, K.L, c]));                    // a shape on the front (hidden when it faces away)
  const tail = pts => F(pts.map(([a, c]) => [a, 0, c]));                                 // a shape on the back (seen when it faces away)
  const i0 = K.inset === undefined ? 2 : K.inset;                                        // the cabin is a little narrower than the body
  const i1 = 24 - i0;
  const L = K.L;
  const glass = broken ? C.ink : C.glass;
  if (!dz) poly(F([[-2, 2, sink], [26, 2, sink], [26, L + 2, sink], [-2, L + 2, sink]]), shade(C.floor, 0.6));     // shadow
  // the back: a solid hatch, or a saloon's rear window, and the flat deck behind it
  poly(F([[i0, K.hy, K.tz], [i1, K.hy, K.tz], [i1, K.ry0, K.rz], [i0, K.ry0, K.rz]]), K.rearGlass || rev ? glass : shade(col, 0.7));
  poly(F([[0, 0, K.tz], [24, 0, K.tz], [24, Math.max(1, K.hy), K.tz], [0, Math.max(1, K.hy), K.tz]]), shade(col, 1.15));
  // the side: below the windows, the sill, then the cabin above
  poly(side([[0, 4], [0, K.tz], [K.sy, K.sz], [L, K.nz], [L, 4]]), col);
  poly(side([[0, 4], [L, 4], [L, 6], [0, 6]]), shade(col, 0.7));
  if (rev) carBack(K, tail, col, broken);                                               // facing away: its back, lights and plate
  poly(F([[i1, K.hy, K.tz], [i1, K.ry0, K.rz], [i1, K.ry1, K.rz], [i1, K.sy, K.sz]]), col);
  const win = K.win || [[K.hy + 2, K.tz + 1], [K.ry0 + 1, K.rz - 1], [K.ry1 - 1, K.rz - 1], [K.sy - 2, K.sz + 0.5]];
  poly(F(win.map(([b, c]) => [i1, b, c])), glass);                                                                 // side windows
  const pillar = (K.ry0 + K.ry1) / 2;
  if (!K.win) poly(F([[i1, pillar - 0.5, K.sz], [i1, pillar - 0.5, K.rz], [i1, pillar + 1, K.rz], [i1, pillar + 1, K.sz]]), col);   // door pillar
  // the front: nose, bonnet (or the engine bay), roof, windscreen
  poly(nose([[0, 4], [24, 4], [24, K.nz], [0, K.nz]]), shade(col, 0.8));
  if (opts.noBonnet) {
    poly(F([[0, K.sy, K.sz - 3], [24, K.sy, K.sz - 3], [24, L, K.nz - 3], [0, L, K.nz - 3]]), C.greyDark);
    poly(F([[6, K.sy + 2, K.sz - 2], [18, K.sy + 2, K.sz - 2], [18, L - 3, K.nz - 2], [6, L - 3, K.nz - 2]]), C.steel2);   // what's left of the engine
  } else {
    poly(F([[0, K.sy, K.sz], [24, K.sy, K.sz], [24, L, K.nz], [0, L, K.nz]]), shade(col, 1.15));
  }
  poly(F([[0, 0, K.tz], [24, 0, K.tz], [24, 1, K.tz], [0, 1, K.tz]]), shade(col, 1.15));
  poly(F([[i0, K.ry0, K.rz], [i1, K.ry0, K.rz], [i1, K.ry1, K.rz], [i0, K.ry1, K.rz]]), shade(col, 1.2));         // roof
  poly(F([[i0, K.ry1, K.rz], [i1, K.ry1, K.rz], [24, K.sy, K.sz], [0, K.sy, K.sz]]), glass);                       // windscreen
  // small (on the map, in traffic): just lights and wheels
  if (s < 0.8) {
    if (!broken) {
      poly(nose([[2, 7], [6, 7], [6, 10], [2, 10]]), C.warm);
      poly(nose([[18, 7], [22, 7], [22, 10], [18, 10]]), C.warm);
    }
    if (!opts.noWheels) {
      for (const wy of [0.2, 0.8]) {
        const [wx, wz] = Q(24, wy * L, 4);
        ellipse(wx, wz, Math.max(1, Math.round((opts.alongX ? 4 : 3) * s)), Math.max(1, Math.round((opts.alongX ? 4 : 4.5) * s)), C.tyre);
      }
    }
    if (broken) rustOn(Q, L, x);
    return;
  }
  carDetails(K, Q, side, nose, col, broken, pillar, i1);
  if (s >= 1 && !broken && !opts.shape) { const d = Q(15, 31, 19); rect(d[0], d[1], 2, 2, C.red); }               // the red light on our dash
  carWheels(K, Q, side, col, broken, opts);
  if (broken) rustOn(Q, L, x);
}
// A car's back (when it's facing away): the tailgate, bumper, number plate, rear lights
function carBack(K, tail, col, broken) {
  poly(tail([[0, 4], [24, 4], [24, K.tz], [0, K.tz]]), shade(col, 0.8));                     // the tailgate
  poly(tail([[0, 4], [24, 4], [24, 6], [0, 6]]), shade(col, 0.55));                          // the bumper
  poly(tail([[9, 6.5], [15, 6.5], [15, 8.5], [9, 8.5]]), C.warm);                            // the number plate (yellow at the back)
  const tl = Math.max(8, K.tz - 5), red = broken ? C.redDim : C.red;
  poly(tail([[1, tl], [5, tl], [5, K.tz - 1], [1, K.tz - 1]]), red);                         // rear lights
  poly(tail([[19, tl], [23, tl], [23, K.tz - 1], [19, K.tz - 1]]), red);
}
// Bumpers, grille, number plate, lights (one smashed on a wreck), door handles, mirror
function carDetails(K, Q, side, nose, col, broken, pillar, i1) {
  const L = K.L;
  poly(nose([[0, 4], [24, 4], [24, 6], [0, 6]]), shade(col, 0.55));                                                 // front bumper
  poly(nose([[8, 7], [16, 7], [16, 9.5], [8, 9.5]]), C.ink);                                                          // grille
  poly(nose([[9, 4.4], [15, 4.4], [15, 5.8], [9, 5.8]]), C.white);                                                    // number plate
  const lamp = broken ? shade(C.warm, 0.55) : C.warm;
  poly(nose([[1, 7], [6, 7], [6, K.nz - 1], [1, K.nz - 1]]), broken ? C.ink : lamp);                                  // left headlight (smashed on a wreck)
  if (broken) { const c = Q(3, L, 8.5); px(c[0], c[1], C.white); px(c[0] + 1, c[1] - 1, C.white); }                  // its crack
  poly(nose([[18, 7], [23, 7], [23, K.nz - 1], [18, K.nz - 1]]), lamp);                                               // right headlight
  poly(side([[L - 1.5, 7.5], [L, 7.5], [L, K.nz - 1], [L - 1.5, K.nz - 1]]), hex('#f0901c'));                        // indicator, round the corner
  const tl = Math.max(8, K.tz - 5);
  poly(side([[0, tl], [2, tl], [2, K.tz - 1], [0, K.tz - 1]]), broken ? C.redDim : C.red);                            // tail light, round the corner
  poly(side([[0, 4], [3, 4], [3, 6], [0, 6]]), shade(col, 0.55));                                                     // back bumper
  const handles = K.win ? [K.ry1 + 1] : [pillar - 4, (pillar + K.sy) / 2];
  for (const hy of handles) poly(side([[hy, K.tz - 2.5], [hy + 2.5, K.tz - 2.5], [hy + 2.5, K.tz - 1.8], [hy, K.tz - 1.8]]), C.ink);   // door handles
  const m = K.sy - 1;
  poly([Q(i1, m, K.sz), Q(i1 + 3, m + 1, K.sz), Q(i1 + 3, m + 1, K.sz + 2), Q(i1, m, K.sz + 2)], shade(col, 0.7));   // door mirror
}
// Wheel arches, then the wheels in them (or empty arches on a car down on its axles)
function carWheels(K, Q, side, col, broken, opts) {
  const L = K.L;
  const circle = (wc, r, zc, floor) => side(Array.from({ length: 16 }, (_, k) => {
    const a = k / 16 * 6.283;
    return [wc + r * Math.cos(a), Math.max(floor, zc + r * Math.sin(a))];
  }));
  for (const wy of [0.2, 0.8]) {
    const wc = wy * L;
    poly(circle(wc, 5.4, 4, 4), shade(col, 0.4));                                                                     // the arch (dark, above the sill)
    if (opts.noWheels) { poly(side([[wc - 1, 0], [wc + 1, 0], [wc + 1, 4], [wc - 1, 4]]), C.rust); continue; }       // just a rusty hub
    const zc = opts.flat ? 3.4 : 4;
    poly(circle(wc, 4.2, zc, opts.flat ? 0.3 : -9), C.tyre);                                                          // tyre (squashed if flat)
    poly(circle(wc, 2.2, zc + 0.3, -9), broken ? shade(C.rim, 0.6) : C.rim);                                         // rim
    const h = Q(24, wc, zc + 0.3);
    px(h[0], h[1], C.ink);                                                                                             // wheel nut
  }
}
// Rust patches down a wreck's side
function rustOn(Q, L, seed) {
  for (let n = 0; n < 9; n++) {
    const p = Q(24, 2 + hash(n, seed) * (L - 4), 5 + hash(seed, n) * 7);
    rect(p[0], p[1], 2 + (n % 2), 2, C.rust);
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
  if (pose === 'sit') {                                  // on a stool: knees bent, feet on the rung (hips where his feet would be, 9 up)
    R(0, -19, 2, 3, K.skin); R(0, -19, 2, 1, K.hair); D(0, -16, K.skin);
    R(0, -15, 2, 5, K.shirt); D(0, -10, K.jeans);
    L(0, -9, -1, -7, K.jeansDark); L(-1, -7, -1, -4, K.jeansDark);
    L(1, -9, 2, -7, K.jeans); L(2, -7, 2, -4, K.jeans);
    L(0, -14, -1, -11, K.shirtDark); D(-1, -10, K.skin);
    L(1, -14, 2, -11, K.shirt); D(2, -10, K.skin);
    return;
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

// ---------- his wife: a choice of glamorous looks, drawn in fine (1-pixel) detail, about as tall as him ----------
// x, y = the ground point in world units. Each look: the dress (full, gown, short or wiggle), colours, hair and its style, extras
const WIFE_LOOKS = {
  pinup: { name: '1950s pin-up', cut: 'full', dress: hex('#c8203a'), dots: C.white, hair: hex('#f0d070'), style: 'curls', shoes: hex('#c8203a'), halter: true },
  gown: { name: 'Film star', cut: 'gown', dress: hex('#1e8a5a'), hair: hex('#b04a20'), style: 'long', shoes: hex('#d8b040'), earrings: hex('#f0d050') },
  lbd: { name: 'Little black dress', cut: 'short', dress: hex('#1a1a22'), hair: hex('#2a1810'), style: 'bob', shoes: hex('#1a1a22'), pearls: true },
  diner: { name: '1960s wiggle dress', cut: 'wiggle', dress: hex('#f090b8'), hair: hex('#5a3418'), style: 'ponytail', shoes: C.white, scarf: C.white },
  cocktail: { name: 'Gold cocktail dress', cut: 'short', dress: hex('#d8b040'), hair: hex('#f0d070'), style: 'bob', shoes: hex('#d8b040'), earrings: C.white },
  redcarpet: { name: 'Red carpet gown', cut: 'gown', dress: hex('#b01020'), hair: hex('#1a1210'), style: 'long', shoes: C.ink, earrings: C.white },
  sundress: { name: 'Summer sundress', cut: 'full', dress: hex('#f0c830'), dots: C.white, hair: hex('#7a4a28'), style: 'curls', shoes: hex('#c8a070'), halter: true },
  office: { name: 'Navy pencil dress', cut: 'wiggle', dress: hex('#203a7a'), hair: hex('#f0d070'), style: 'updo', shoes: C.ink, pearls: true },
  jeans: { name: 'Jeans and a crop top', cut: 'trousers', dress: hex('#3a5aa0'), top: C.white, crop: true, hair: hex('#e8c060'), style: 'long', shoes: C.white },
  rock: { name: 'Rock chick', cut: 'trousers', dress: hex('#1a1a22'), top: hex('#c8203a'), hair: hex('#101010'), style: 'bob', shoes: C.ink, earrings: C.steel },
  flapper: { name: '1920s flapper', cut: 'short', dress: hex('#c8c8d0'), dots: hex('#f0f0f8'), hair: hex('#101010'), style: 'bob', band: hex('#c8203a'), shoes: C.ink, pearls: true },
  disco: { name: 'Disco jumpsuit', cut: 'trousers', flare: true, dress: hex('#8a3ac0'), hair: hex('#7a4a28'), style: 'perm', shoes: hex('#d8b040'), earrings: hex('#f0d050') },
  tennis: { name: 'Tennis whites', cut: 'short', dress: C.white, hair: hex('#f0d070'), style: 'ponytail', shoes: C.white, scarf: hex('#40a060') },
  navy: { name: 'Navy pencil dress, dark updo', cut: 'wiggle', dress: hex('#203a7a'), hair: hex('#3a2010'), style: 'updo', shoes: C.ink, pearls: true, earrings: C.white },   // Steve's pick (H's dress, N's hair)
  nightie: { name: 'Nightie (at night)', cut: 'baby', dress: hex('#f4c8d8'), dots: hex('#fbe4ec'), hair: hex('#3a2010'), style: 'long', barefoot: true },   // Steve's pick: short, bare feet, hair down
  slip: { name: 'Satin slip (night)', cut: 'gown', dress: hex('#f0e0c0'), hair: hex('#3a2010'), style: 'long', shoes: hex('#f0e0c0'), slippers: true },
  pjs: { name: 'Silk pyjamas (night)', cut: 'shorts', dress: hex('#203a7a'), hair: hex('#3a2010'), style: 'long', shoes: hex('#203a7a'), slippers: true },
  tee: { name: 'Big T-shirt (night)', cut: 'short', dress: hex('#8a8a90'), tee: true, hair: hex('#3a2010'), style: 'long', shoes: hex('#e8e0d0'), slippers: true },
  robe: { name: 'Silk dressing gown (night)', cut: 'gown', dress: hex('#b01020'), belt: hex('#f0c040'), hair: hex('#3a2010'), style: 'long', shoes: hex('#b01020'), slippers: true },
  velvet: { name: 'Velvet evening gown', cut: 'gown', dress: hex('#5a2070'), hair: hex('#3a2010'), style: 'updo', shoes: C.ink, earrings: C.white }
};
// One row of pixels, centred on cx (w wide; an odd width sits one pixel to the right)
function rowAt(cx, y, w, col) { rect(Math.round(cx - w / 2), y, w, 1, col); }
// step: 0 standing, or 1 / -1 mid-stride (walking round the house)
// sit: sitting down (on the sofa): she's lower, with her knees bent towards you
function wife(wx, wy, lookId, step = 0, sit = false) {
  const K = WIFE_LOOKS[lookId] || WIFE_LOOKS.pinup;
  const [fx, fy] = P(wx, wy), x = Math.round(fx), floor = Math.round(fy), y = floor + (sit ? 7 : 0);
  const skin = C.skin, skinDark = shade(C.skin, 0.85), dress = K.dress, dressDark = shade(K.dress, 0.75);
  const lean = step ? 1 : 0;
  // legs and heels (a little apart; one forward when she walks)
  const legL = x - 2 - (step > 0 ? 1 : 0), legR = x + 1 + (step < 0 ? 1 : 0);
  for (const lx of [legL, legR]) {
    if (sit) { rect(lx, y - 18, 2, floor - (y - 18) - 1, skin); rect(lx - 1, floor - 1, 3, 1, K.barefoot ? skin : K.shoes); continue; }   // knees up, feet on the floor
    rect(lx, y - 18, 2, 14, skin); rect(lx, y - 4, 1, 3, skin);          // thigh to calf (the dress covers the top), then a slim ankle
    rect(lx + 1, y - 9, 1, 3, skinDark);                                  // a touch of shadow down the calf
    if (K.barefoot) rect(lx - 1, y - 1, 3, 1, C.skin);                    // bare feet
    else if (K.slippers) rect(lx - 1, y - 1, 3, 2, K.shoes);              // fluffy slippers
    else { rect(lx - 1, y - 1, 3, 1, K.shoes); rect(lx + 1, y - 2, 1, 1, K.shoes); rect(lx - 1, y, 1, 1, K.shoes); }   // a heel
  }
  // the dress, from the hips down
  if (K.cut === 'full') {                                                 // a full, swirling skirt to the knee
    for (let k = 0; k < 10; k++) rowAt(x, y - 22 + k, 8 + Math.round(k * 1.1), k === 9 ? dressDark : dress);
    if (K.dots) for (const [dx, dy] of [[-4, -19], [1, -20], [4, -16], [-2, -15], [-6, -14], [3, -13], [0, -17], [6, -14]]) rect(x + dx, y + dy, 1, 1, K.dots);
  }
  if (K.cut === 'gown') {                                                 // to the floor, with a slit up one side
    for (let k = 0; k < 22; k++) rowAt(x, y - 22 + k, 9 + Math.floor(k / 5), k % 6 === 3 ? dressDark : dress);
    rect(legR, y - 12, 2, 11, skin); rect(legR + 1, y - 9, 1, 3, skinDark);   // the leg through the slit
    rect(legR - 1, y - 1, 3, 1, K.shoes);
  }
  if (K.cut === 'short') {                                                // above the knee, fitted
    for (let k = 0; k < 8; k++) rowAt(x, y - 22 + k, 10 - (k > 5 ? 1 : 0), k === 7 ? dressDark : dress);
    if (K.dots) for (let k = 0; k < 8; k += 2) rowAt(x, y - 21 + k, 9, K.dots);   // rows of fringe
  }
  if (K.cut === 'baby') { for (let k = 0; k < 5; k++) rowAt(x, y - 22 + k, 10 + (k > 2 ? 1 : 0), k === 4 ? K.dots : dress); }   // a short babydoll nightie, frilled hem
  if (K.cut === 'shorts') { rowAt(x, y - 22, 8, dress); rowAt(x, y - 21, 8, dress); for (const lx of [legL, legR]) rect(lx, y - 20, 2, 4, dress); }   // short pyjama shorts
  if (K.cut === 'trousers') {                                             // trousers or jeans, to the ankle (flared for the jumpsuit)
    rowAt(x, y - 22, 8, dress); rowAt(x, y - 21, 8, dress); rowAt(x, y - 20, 7, dress);
    for (const lx of [legL, legR]) { rect(lx, y - 19, 2, 17, dress); rect(lx + 1, y - 15, 1, 6, dressDark); if (K.flare) rect(lx - 1, y - 4, 4, 2, dress); }
  }
  if (K.cut === 'wiggle') { for (let k = 0; k < 11; k++) rowAt(x, y - 22 + k, 10 - Math.floor(k / 4), k === 10 ? dressDark : dress); }   // hugging, to just below the knee
  // the waist (cinched), the bodice, the shoulders and arms
  const top = K.top || dress;
  rowAt(x, y - 23, 6, K.crop ? skin : top); rowAt(x, y - 24, 6, K.crop ? skin : top); rowAt(x, y - 25, 7, top);
  if (K.cut === 'full') rowAt(x, y - 24, 6, C.ink);                       // a thin belt
  if (K.belt) rowAt(x, y - 24, 6, K.belt);
  for (const [dy, w] of [[-26, 8], [-27, 9], [-28, 9], [-29, 8]]) rowAt(x, y + dy, w, top);   // the bust
  rowAt(x, y - 28, 9, shade(top, 0.75)); rowAt(x, y - 29, 7, top);       // the line of the neckline
  if (K.halter) { rect(x - 2, y - 32, 1, 3, dress); rect(x + 1, y - 32, 1, 3, dress); }   // halter straps
  for (const [dy, w] of [[-30, 9], [-31, 8]]) rowAt(x, y + dy, w, skin);  // bare shoulders
  if (K.halter) { rect(x - 2, y - 31, 1, 2, dress); rect(x + 1, y - 31, 1, 2, dress); }
  if (K.tee) for (const sx of [x - 6, x + 4]) rect(sx, y - 30, 2, 4, dress);   // baggy T-shirt sleeves
  for (const sx of [x - 5, x + 4]) { rect(sx, y - 30, 1, 7, skin); rect(sx + (sx < x ? 1 : -1) * lean, y - 23, 1, 4, skin); }   // arms, hands by her hips
  if (K.pearls) { for (let k = -2; k <= 1; k++) rect(x + k, y - 30 + (k === -2 || k === 1 ? 0 : 1), 1, 1, C.white); }
  // neck and face
  rect(x - 1, y - 33, 2, 2, skin);
  for (const [dy, w] of [[-34, 4], [-35, 5], [-36, 5], [-37, 5], [-38, 5], [-39, 4]]) rowAt(x, y + dy, w, skin);
  rect(x - 2, y - 37, 1, 1, C.ink); rect(x + 1, y - 37, 1, 1, C.ink);    // eyes
  rect(x - 1, y - 35, 2, 1, C.red);                                       // red lips
  // hair
  const h = K.hair, hd = shade(K.hair, 0.8);
  if (K.style === 'curls') { rowAt(x, y - 40, 6, h); rowAt(x, y - 41, 4, h); for (const sx of [x - 4, x + 3]) { rect(sx, y - 39, 2, 6, h); rect(sx, y - 35, 1, 1, hd); } rect(x - 3, y - 39, 2, 2, h); }
  if (K.style === 'long') { rowAt(x, y - 40, 6, h); rowAt(x, y - 41, 4, h); for (const sx of [x - 4, x + 3]) rect(sx, y - 39, 2, 13, h); rect(x + 4, y - 28, 1, 4, hd); rect(x - 4, y - 32, 1, 3, hd); rect(x - 3, y - 39, 2, 2, h); }
  if (K.style === 'bob') { rowAt(x, y - 40, 7, h); rowAt(x, y - 41, 5, h); for (const sx of [x - 4, x + 3]) rect(sx, y - 39, 2, 6, h); rowAt(x, y - 39, 6, h); }
  if (K.style === 'ponytail') { rowAt(x, y - 40, 6, h); rowAt(x, y - 41, 4, h); rect(x - 4, y - 39, 1, 4, h); rect(x + 3, y - 39, 1, 3, h); rect(x + 4, y - 40, 2, 2, h); rect(x + 5, y - 38, 2, 7, h); rect(x + 6, y - 32, 1, 2, hd); }
  if (K.style === 'updo') { rowAt(x, y - 40, 6, h); rowAt(x, y - 41, 5, h); rowAt(x, y - 42, 3, h); rect(x - 3, y - 39, 1, 3, h); rect(x + 2, y - 39, 1, 3, h); }
  if (K.style === 'perm') { for (const [dy, w] of [[-42, 6], [-41, 9], [-40, 10], [-39, 10], [-38, 10]]) rowAt(x, y + dy, w, h); for (const sx of [x - 5, x + 4]) rect(sx, y - 37, 2, 5, h); rowAt(x, y - 39, 5, skin); rowAt(x, y - 38, 5, skin); }
  if (K.band) rowAt(x, y - 39, 6, K.band);
  if (K.scarf) rowAt(x, y - 40, 6, K.scarf);
  if (K.earrings) { rect(x - 3, y - 35, 1, 1, K.earrings); rect(x + 2, y - 35, 1, 1, K.earrings); }
}
// Where her head is on screen (for her speech bubble's arrow)
function wifeHead() {
  const inGarage = S.screen === 'garage';                              // she comes to the garage at night
  [ISO.ox, ISO.oy] = inGarage ? VIEW.garage : VIEW.room;
  const p = P(...(inGarage ? WIFE_IN_GARAGE : WIFE.pos));
  return [p[0] + 2, p[1] - 42];
}

// ---------- night: how dark it is outside, the picture darkened, and lights that glow ----------
// 0 by day; dusk from 18:00 to 20:30; night (0.72) until 5:30; light again by 7:30
function darkness() {
  const m = S.mins, night = 0.72;
  if (m >= 20.5 * 60 || m < 5.5 * 60) return night;
  if (m >= 18 * 60) return night * (m - 18 * 60) / 150;
  if (m < 7.5 * 60) return night * (1 - (m - 5.5 * 60) / 120);
  return 0;
}
// The sky's colour now (for windows that look out)
function skyColour() {
  const d = darkness() / 0.72;
  return [Math.round(lerpN(120, 18, d)), Math.round(lerpN(176, 26, d)), Math.round(lerpN(232, 64, d))];
}
const lerpN = (a, b, p) => a + (b - a) * p;
// Darken a part of the picture for the night: red and green go first, so it turns blue
function nightShade(x0, y0, x1, y1, d) {
  const dd = img.data;
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
    const i = (y * W + x) * 4;
    dd[i] *= 1 - d; dd[i + 1] *= 1 - d * 0.92; dd[i + 2] *= 1 - d * 0.7;
  }
}
// A light glowing at x, y: warm, fading out to radius r (brighter the darker it is)
function lampGlow(x, y, r, d) {
  const dd = img.data, k = Math.min(1, d / 0.5);
  for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) {
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    const f = 1 - Math.hypot(xx - x, yy - y) / r;
    if (f <= 0) continue;
    const i = (yy * W + xx) * 4, a = f * f * 0.8 * k;
    dd[i] += (255 - dd[i]) * a; dd[i + 1] += (220 - dd[i + 1]) * a; dd[i + 2] += (140 - dd[i + 2]) * a * 0.6;
  }
}
// A lit window (warm yellow), on a wall facing left (y = yf) or right (x = xf)
const LIT = hex('#f8d870');
// Put the top bar back as it was (lights and glows mustn't spill over it)
function keepHud(rows) { img.data.set(BG.subarray(0, rows * W * 4), 0); }

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
