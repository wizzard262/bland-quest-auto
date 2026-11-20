// Bland Quest Auto: drawing kit. Everything is painted pixel by pixel into one image buffer, then scaled up with hard edges.
// Shared by every screen (screens.js). No game rules in here.

let W = 480, H = 270;                                    // picture size; some screens use a bigger one
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let img = ctx.createImageData(W, H);
let IMG32 = new Uint32Array(img.data.buffer);           // the same pixels, one 32-bit number each: much faster to fill
let LABELS = [];                                         // real-text labels and tap areas a screen adds while it paints
// Start painting into a new image (a new screen): keep the 32-bit view of it in step
function useImage(next) {
  img = next;
  IMG32 = new Uint32Array(img.data.buffer);
}

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
// Pixels are written as one 32-bit number each (red, green, blue, and alpha 255), in the byte order this machine uses
const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
const byte = v => Math.max(0, Math.min(255, Math.round(v)));   // a colour part, kept to 0–255
function pack32(r, g, b) {
  if (LITTLE_ENDIAN) return ((255 << 24) | (byte(b) << 16) | (byte(g) << 8) | byte(r)) >>> 0;   // >>> 0: unsigned, as the pixels read back
  return ((byte(r) << 24) | (byte(g) << 16) | (byte(b) << 8) | 255) >>> 0;
}
// A colour [r, g, b] as one 32-bit pixel; worked out once and kept on the colour (the palette's colours are used over and over)
function colour32(c) {
  if (c.u32 === undefined) c.u32 = pack32(c[0], c[1], c[2]);
  return c.u32;
}
function px(x, y, c) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  IMG32[y * W + x] = colour32(c);
}
// A filled rectangle: whole rows at a time (same pixels as plotting each one: x and y rounded, clipped to the picture)
function rect(x, y, w, h, c) {
  if (!(w > 0 && h > 0)) return;
  const v = colour32(c);
  const x0 = Math.round(x), y0 = Math.round(y);
  const xa = Math.max(0, x0), xb = Math.min(W, x0 + Math.ceil(w));   // the columns it covers, inside the picture
  if (xa >= xb) return;
  const rows = Math.ceil(h);
  for (let r = 0; r < rows; r++) {
    const yy = y0 + r;
    if (yy < 0 || yy >= H) continue;
    IMG32.fill(v, yy * W + xa, yy * W + xb);
  }
}
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
  '+': ['...', '.#.', '###', '.#.', '...'], '£': ['.##', '.#.', '###', '.#.', '###'], ' ': ['...', '...', '...', '...', '...']
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

// Where the phone sits in the strip (bottom right)
function phoneIconAt(s) { return [W - 18 * s, H - 23 * s]; }
// The phone icon at x, y; unread = how many texts you haven't read (a red dot)
function phoneIcon(x, y, s, unread, screenCol = C.glass) {
  rect(x, y, 11 * s, 17 * s, C.ink);                                // the case
  rect(x + s, y + s, 9 * s, 15 * s, C.ui);                          // the bezel
  rect(x + 2 * s, y + 3 * s, 7 * s, 10 * s, screenCol);             // the screen
  if (unread) { disc(x + 10 * s, y + s, 3 * s, C.red); text(String(Math.min(unread, 9)), x + 9 * s, y - s, C.white, s); }
}
// The phone ringing: it glows, rattles about in bursts (in time with the ringtone), and says who it is
function ringingPhone(t) {
  const s = W > 500 ? 2 : 1;                                        // the town map is drawn twice size
  const [x, y] = phoneIconAt(s);
  const buzzing = (t % 1.5) < 0.7;                                  // a burst of rattling with each ring
  const dx = buzzing ? Math.round(Math.sin(t * 70) * 2) * s : 0;    // shaking side to side…
  const dy = buzzing ? Math.round(Math.cos(t * 53)) * s : 0;        // …and a little up and down
  const glow = (2 + Math.round((Math.sin(t * 8) + 1) * 1.5)) * s;   // the glow round it pulses in and out (2 to 5 pixels)
  rect(x - glow, y - glow, 11 * s + glow * 2, 17 * s + glow * 2, C.warm);   // a warm glow behind it…
  rect(x - s, y - s, 13 * s, 19 * s, shade(C.warm, 1.3));                   // …brightest close to it
  phoneIcon(x + dx, y + dy, s, 0, (t % 0.5) < 0.25 ? C.warm : C.white);     // the phone, rattling; its screen flashes
  if (buzzing) for (const ty of [4, 9]) {                           // little rattle marks either side
    rect(x - 4 * s, y + ty * s, 2 * s, s, C.warm);
    rect(x + 13 * s, y + ty * s, 2 * s, s, C.warm);
  }
  const who = CALL.who.toUpperCase();                               // who's ringing: above it, kept on screen
  text(who, W - 3 * s - textW(who) * s, y - 12 * s, C.warm, s);
}
// The anger bar: green, then orange, then red; it shakes when it goes up, and all the time over half (faster the angrier)
let ANGER_UP = 0;                                           // when anger last went up (performance.now())
function angerBar(anger, x, y, w, h) {
  const colour = anger < 40 ? 'calm' : anger < 70 ? 'cross' : 'furious';
  const bump = performance.now() - ANGER_UP < 700 ? ' bump' : '';
  const shake = anger > 50 ? ` shaking" style="--speed:${(0.5 - (anger - 50) / 50 * 0.42).toFixed(2)}s;` : '" style="';
  LABELS.push(`<div class="anger ${colour}${bump}${shake}left:${x / W * 100}%;top:${y / H * 100}%;width:${w / W * 100}%;height:${h / H * 100}%"><i style="width:${anger}%"></i></div>`);
}
// The BOOZE bar, under the anger bar: amber, filling with each drink, emptying as it wears off
function boozeBar(pct, x, y, w, h) {
  LABELS.push(`<div class="anger booze" style="left:${x / W * 100}%;top:${y / H * 100}%;width:${w / W * 100}%;height:${h / H * 100}%"><i style="width:${pct}%"></i></div>`);
}
// ---------- the same strip on every world screen: time, task, anger, phone ----------
// s = how big the pixels of the strip are (2 on the bigger city picture, so it reads the same)
let HUD_SHOWN = false;                                      // does the screen now showing have the strip (and so the phone)?
function hud() {
  HUD_SHOWN = true;
  const info = hudInfo();                                  // from the game: clock, current job, anger 0-100, unread texts
  const s = W > 500 ? 2 : 1;                               // the town map is bigger: draw the strip twice size there
  rect(0, 0, W, 18 * s, C.ink);
  text(info.clock, 4 * s, 3 * s, C.dim, s);
  text('JOB: ' + info.task, 4 * s, 10 * s, C.ui, s);
  text('ANGER', W - 74 * s, 3 * s, C.dim, s);
  angerBar(info.anger, W - 50 * s, 3 * s, 46 * s, 5 * s);           // the anger bar (it shakes when you're wound up)
  text('BOOZE', W - 74 * s, 10 * s, C.dim, s);
  boozeBar(info.booze || 0, W - 50 * s, 10 * s, 46 * s, 5 * s);     // under it, how drunk you are (it wears off)
  // phone in your pocket, with a red dot for unread texts (while it rings, it's drawn moving instead: ringingPhone)
  const [x, y] = phoneIconAt(s);
  if (!CALL) phoneIcon(x, y, s, info.unread);
  link('phone', x - s, y - 4 * s, 14 * s, 22 * s);
  // notebook in your other pocket: the list of jobs and leads
  const nx = W - 34 * s;
  rect(nx, y + s, 12 * s, 15 * s, C.ink); rect(nx + s, y + 2 * s, 10 * s, 13 * s, C.warm); rect(nx + s, y + 2 * s, 2 * s, 13 * s, C.redDim);
  for (let k = 0; k < 4; k++) rect(nx + 4 * s, y + (5 + k * 3) * s, 6 * s, s, C.bench);
  link('notebook', nx - s, y, 14 * s, 18 * s);
  watchFace(s, y);                                         // the watch, bottom left: the only way to wait
}
// The watch: a round face showing the game's time; point at it for "Wait 1 hour", tap it to wait
function watchFace(s, y) {
  const r = 8 * s, cx = 4 * s + r, cy = y + r;                    // where it sits: bottom left
  rect(cx - 3 * s, cy - r - 3 * s, 6 * s, 3 * s, C.ink); rect(cx - 3 * s, cy + r, 6 * s, 3 * s, C.ink);   // the strap, top and bottom
  disc(cx, cy, r, C.ink); disc(cx, cy, r - s, C.white);          // the case and the face
  for (let h = 0; h < 12; h += 3) {                                // marks at 12, 3, 6 and 9
    const a = h / 12 * 6.283;
    px(cx + Math.sin(a) * (r - 2 * s), cy - Math.cos(a) * (r - 2 * s), C.ink);
  }
  const mins = typeof S === 'object' ? S.mins : 0;                 // the game's clock
  const hourA = ((mins / 60) % 12) / 12 * 6.283, minA = (mins % 60) / 60 * 6.283;
  line(cx, cy, cx + Math.sin(hourA) * (r - 4 * s), cy - Math.cos(hourA) * (r - 4 * s), C.ink);   // the hour hand
  line(cx, cy, cx + Math.sin(minA) * (r - 2 * s), cy - Math.cos(minA) * (r - 2 * s), C.red);     // the minute hand
  spot('Wait 1 hour', [cx - r - s, cy - r - 3 * s, 2 * r + 2 * s, 2 * r + 6 * s], 'act:wait');
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
  zafira:    { L: 46, tz: 17, hy: 2, ry0: 6,  rz: 22, ry1: 28, sy: 36, sz: 15, nz: 11 },            // ours: an estate back, gently sloped
  zafiraOld: { L: 44, tz: 15, hy: 1, ry0: 5,  rz: 23, ry1: 27, sy: 34, sz: 15.5, nz: 12 },          // 1999: upright and boxy
  zafiraNew: { L: 48, tz: 13, hy: 2, ry0: 13, rz: 21, ry1: 27, sy: 38, sz: 14, nz: 10 },            // 2006: sleeker, more raked
  astra:     { L: 40, tz: 13, hy: 1, ry0: 8,  rz: 19, ry1: 22, sy: 30, sz: 13, nz: 10 },            // a small hatchback
  saloon:    { L: 48, tz: 14, hy: 9, ry0: 16, rz: 20, ry1: 28, sy: 35, sz: 14, nz: 11, rearGlass: true },
  city:      { L: 34, tz: 13, hy: 1, ry0: 5,  rz: 20, ry1: 19, sy: 25, sz: 13, nz: 10 },            // tiny
  van:       { L: 52, tz: 30, hy: 0, ry0: 0,  rz: 30, ry1: 39, sy: 44, sz: 17, nz: 13, inset: 0, win: [[38, 18], [38, 28], [40, 28], [43, 18]] }
};
// opts.shape: one of CAR_SHAPES (ours if not given); opts.alongX: turned to drive along x (parking at the kerb, traffic)
// opts.broken: a wreck (rust, dark empty windows, a smashed headlight); opts.noWheels: down on its axles;
// opts.noBonnet: the bonnet's gone (you see the engine bay); opts.flat: flat tyres; opts.flatFront: just the front one flat; opts.dz: lifts it (to stack wrecks)
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
  const ours = !broken && !opts.shape && col === C.car;                                  // your car (the only blue one)
  const kicked = opts.lampState || (ours ? kickedLamps() : { left: false, right: false });   // which of its headlights you've kicked in (the kick scene says for itself)
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
      headlamp(nose([[2, 7], [6, 7], [6, 10], [2, 10]]), kicked.left, 1, null, ours);   // small: just the lamp, cracked or not
      headlamp(nose([[18, 7], [22, 7], [22, 10], [18, 10]]), kicked.right, 2, null, ours);
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
  carDetails(K, Q, side, nose, col, broken, pillar, i1, kicked, ours);
  if (s >= 1 && !broken && !opts.shape) { const d = Q(15, 31, 19); rect(d[0], d[1], 2, 2, C.red); }               // the red light on our dash
  carWheels(K, Q, side, col, broken, opts);
  if (opts.police) policeLivery(K, side, F, opts.flash);                                // a police car: the check down the side, the light bar
  if (broken) rustOn(Q, L, x);
}
// A police car's livery: a yellow and blue check down the side, and the blue light bar on the roof (flash: which half's lit)
let POLICE_BAR = null;                                                // where the last police car's light bar is on screen (for its glow)
function policeLivery(K, side, F, flash) {
  const L = K.L, n = 10;
  for (let k = 0; k < n; k++) {                                      // the check, along the side
    const b0 = 2 + k * (L - 4) / n, b1 = b0 + (L - 4) / n;
    poly(side([[b0, 7], [b1, 7], [b1, 11], [b0, 11]]), k % 2 ? hex('#f0d020') : hex('#2050d0'));
  }
  const mid = (K.ry0 + K.ry1) / 2, z = K.rz;                         // the middle of the roof
  const lamp = (a0, a1, lit) => {                                    // one half of the bar: its top and its side towards us
    const col = lit ? hex('#60a0ff') : hex('#203070');
    poly(F([[a0, mid - 2, z + 2], [a1, mid - 2, z + 2], [a1, mid + 2, z + 2], [a0, mid + 2, z + 2]]), col);
    poly(F([[a1, mid - 2, z], [a1, mid + 2, z], [a1, mid + 2, z + 2], [a1, mid - 2, z + 2]]), shade(col, 0.75));
  };
  lamp(5, 12, flash); lamp(12, 19, !flash);
  const c = F([[flash ? 8 : 16, mid, z + 2]])[0];                   // the lit half
  POLICE_BAR = [Math.round(c[0]), Math.round(c[1])];
  disc(POLICE_BAR[0], POLICE_BAR[1], 2, C.white);                   // its hot centre
}
// A blue light washing over everything near it, fading out to radius r
function blueGlow(x, y, r) {
  const dd = img.data;
  for (let yy = Math.max(18, Math.floor(y - r)); yy <= Math.min(H - 1, y + r); yy++) for (let xx = Math.max(0, Math.floor(x - r)); xx <= Math.min(W - 1, x + r); xx++) {
    const f = 1 - Math.hypot(xx - x, yy - y) / r;
    if (f <= 0) continue;
    const i = (yy * W + xx) * 4, a = f * f * 0.7;
    dd[i] += (60 - dd[i]) * a * 0.5; dd[i + 1] += (120 - dd[i + 1]) * a * 0.5; dd[i + 2] += (255 - dd[i + 2]) * a;
  }
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
// ---------- your car's headlights: kicked in when you lose it; cracked in every view ----------
// When the lights are on, a whole one is full on and a cracked one flickers (each on its own)
let OUR_LAMPS = [];                                                   // where your car's headlights are on this screen: { pts, seed, cracked, crack } (render empties it)
const LAMP_ON = hex('#fff4b8');                                       // a headlight, lit
// Which of your headlights you've kicked in (and not replaced yet)
function kickedLamps() {
  const known = typeof brokeOpen === 'function';                      // (the anger code is loaded after the drawing kit)
  return { left: known && brokeOpen('headlight'), right: known && brokeOpen('headlight2') };
}
// One headlight: whole (yellow), or cracked (dim, with a white crack across it); seed: so each flickers on its own
//   ours: it's your car's (only yours has its lights on at night)
function headlamp(pts, cracked, seed, crack, ours) {
  if (!pts.length) return;                                            // facing away: no front to see
  if (ours) OUR_LAMPS.push({ pts, seed, cracked, crack });            // lit each frame when the lights are on
  if (!cracked) { poly(pts, C.warm); return; }
  poly(pts, shade(C.warm, 0.45));                                     // the dull, broken lens
  if (crack) { line(...crack[0], ...crack[1], C.white); line(...crack[1], ...crack[2], C.white); }   // the crack, zig-zag
}
// Are the car's lights on? When it's getting dark
const lightsOn = () => typeof darkness === 'function' && darkness() > 0.15;
// Is this headlight lit at time t (seconds)? A whole one: always. A cracked one: a jumpy on-off, its own (not in step with the other)
function lampLit(l, t) {
  if (!l.cracked) return true;
  const k = l.seed * 7.3;
  return Math.sin(t * 17 + k) + Math.sin(t * 5.1 + k * 2) + Math.sin(t * 31 + k * 3) > 0.4;
}
// Each frame, while the lights are on: light up your car's headlights (the cracked ones flicker)
function flickerLamps(t) {
  if (!lightsOn()) return;
  for (const l of OUR_LAMPS) {
    if (!lampLit(l, t)) continue;                                     // a cracked one, off just now
    poly(l.pts, LAMP_ON);
    if (l.cracked && l.crack) { line(...l.crack[0], ...l.crack[1], C.white); line(...l.crack[1], ...l.crack[2], C.white); }   // the crack still shows
  }
}
// Bumpers, grille, number plate, lights (one smashed on a wreck), door handles, mirror
function carDetails(K, Q, side, nose, col, broken, pillar, i1, kicked, ours) {
  const L = K.L;
  poly(nose([[0, 4], [24, 4], [24, 6], [0, 6]]), shade(col, 0.55));                                                 // front bumper
  poly(nose([[8, 7], [16, 7], [16, 9.5], [8, 9.5]]), C.ink);                                                          // grille
  poly(nose([[9, 4.4], [15, 4.4], [15, 5.8], [9, 5.8]]), C.white);                                                    // number plate
  const lamp = broken ? shade(C.warm, 0.55) : C.warm;
  const leftLamp = nose([[1, 7], [6, 7], [6, K.nz - 1], [1, K.nz - 1]]);                                           // left headlight
  const rightLamp = nose([[18, 7], [23, 7], [23, K.nz - 1], [18, K.nz - 1]]);                                        // right headlight
  if (broken) {                                                                                                        // a wreck: the left one smashed, the right one dull
    poly(leftLamp, C.ink); const c = Q(3, L, 8.5); px(c[0], c[1], C.white); px(c[0] + 1, c[1] - 1, C.white);
    poly(rightLamp, lamp);
  } else {
    headlamp(leftLamp, kicked.left, 1, [Q(1.5, L, K.nz - 1.5), Q(3.5, L, 8.5), Q(5.5, L, 7.5)], ours);                  // cracked if you kicked it
    headlamp(rightLamp, kicked.right, 2, [Q(18.5, L, 7.5), Q(20.5, L, 8.8), Q(22.5, L, K.nz - 1.5)], ours);
  }
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
    const flat = opts.flat || (opts.flatFront && wy > 0.5);                                                         // all flat, or just the front one
    const zc = flat ? 3.4 : 4;
    poly(circle(wc, 4.2, zc, flat ? 0.3 : -9), C.tyre);                                                               // tyre (squashed if flat)
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
  if (pose === 'kick') {                                 // a flying kick: one leg out straight in front (to the right), arms flung back
    R(0, -19, 2, 3, K.skin); R(0, -19, 2, 1, K.hair); D(0, -16, K.skin); if (K.beard) R(0, -17, 2, 2, K.beard);   // a beard
    R(0, -15, 2, 5, K.shirt); D(0, -10, K.jeans);
    L(0, -9, -1, -1, K.jeansDark);
    L(1, -9, 6, -8, K.jeans);
    L(0, -14, -3, -12, K.shirtDark); L(1, -14, -2, -16, K.shirt);
    return;
  }
  if (pose === 'sit') {                                  // on a stool: knees bent, feet on the rung (hips where his feet would be, 9 up)
    R(0, -19, 2, 3, K.skin); R(0, -19, 2, 1, K.hair); D(0, -16, K.skin); if (K.beard) R(0, -17, 2, 2, K.beard);   // a beard
    R(0, -15, 2, 5, K.shirt); D(0, -10, K.jeans);
    L(0, -9, -1, -7, K.jeansDark); L(-1, -7, -1, -4, K.jeansDark);
    L(1, -9, 2, -7, K.jeans); L(2, -7, 2, -4, K.jeans);
    L(0, -14, -1, -11, K.shirtDark); D(-1, -10, K.skin);
    L(1, -14, 2, -11, K.shirt); D(2, -10, K.skin);
    return;
  }
  if (pose === 'bend') {                                 // bent double, head down to the right (being sick)
    L(0, -9, -1, -1, K.jeansDark); L(1, -9, 2, -1, K.jeans);           // his legs, as standing
    R(0, -10, 2, 1, K.jeans);
    R(1, -12, 5, 2, K.shirt); R(1, -11, 5, 1, K.shirtDark);           // his back, flat across
    R(6, -11, 2, 3, K.skin); R(6, -11, 1, 2, K.hair);                 // his head, hanging down
    L(4, -10, 4, -6, K.shirt); D(4, -5, K.skin);                       // an arm, hand on his knee
    return;
  }
  if (pose === 'trudge') {                               // head down, shoulders slumped, a short dragging step; phase = how far through it
    const sw = Math.round(Math.sin(phase)), up = 1;
    R(1, -17 + up, 2, 3, K.skin); R(1, -17 + up, 2, 2, K.hair); D(1, -15 + up, K.hair);   // his head, hanging forward and down (you see the top of it)
    R(0, -14 + up, 2, 4, K.shirt); D(0, -10, K.jeans);              // his back, rounded and lower
    L(0, -9, -1 - sw, -1, K.jeansDark); L(1, -9, 2 + sw, -1, K.jeans);
    L(0, -13 + up, 0 + sw, -8, K.shirtDark); D(0 + sw, -7, K.skin);  // arms hanging straight down, barely swinging
    L(1, -13 + up, 1 - sw, -8, K.shirt); D(1 - sw, -7, K.skin);
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
  R(0, -19, 2, 3, K.skin); R(0, -19, 2, 1, K.hair); D(0, -16, K.skin); if (K.beard) R(0, -17, 2, 2, K.beard);   // a beard
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
// How she's moving: { walk: the stride's phase (or leave it out to stand), facing: 'front', 'back', 'left' or 'right',
//   sit: sitting on the sofa (its seat 10 up), hip: a hand on her hip }
function wife(wx, wy, lookId, motion = {}) {
  const K = WIFE_LOOKS[lookId] || WIFE_LOOKS.pinup;
  const facing = motion.facing || 'front', side = facing === 'left' || facing === 'right', dir = facing === 'left' ? -1 : 1;
  const skin = C.skin, dress = K.dress, dressDark = shade(K.dress, 0.75);
  const covers = ['full', 'gown', 'wiggle', 'trousers'].includes(K.cut);  // does the dress come down over her thighs?
  if (motion.sit) {                                                        // sitting: legs crossed, turned side-on towards them, her face half to us
    const thigh = covers ? dress : skin;                                   // a long dress covers her thighs
    sitLeg(K, [wx, wy - 1, 10], [wx + 9, wy - 1, 10], [wx + 10, wy - 1, 0], thigh);   // the far leg: knee forward, foot on the floor
    sitLeg(K, [wx, wy + 1, 10], [wx + 8, wy - 1, 12], [wx + 12, wy - 2, 4], thigh);   // the near leg, crossed over it: the foot dangles
    const hip = P(wx, wy, 10);
    return wifeTop(K, Math.round(hip[0]), Math.round(hip[1]) + 21, 'right', motion.hip, true, undefined, 'quarter');
  }
  const [fx, fy] = P(wx, wy), x = Math.round(fx), y = Math.round(fy);
  // legs: a proper stride when she walks (knees bend, a foot lifts and swings through), together when she stands
  const ph = motion.walk;
  for (const sgn of [1, -1]) {
    const swing = ph === undefined ? 0 : Math.sin(ph) * sgn;               // -1 back … 1 forward
    const lift = ph === undefined ? 0 : Math.max(0, Math.cos(ph) * sgn) * 2;   // the leg coming through lifts its foot
    let hx, fxp;
    if (side) { hx = x - (sgn > 0 ? 1 : 0); fxp = x + Math.round(dir * swing * 3) - (sgn > 0 ? 1 : 0); }   // side on: legs scissor
    else { hx = sgn > 0 ? x - 2 : x + 1; fxp = hx + Math.round(swing * 0.6); }                              // front or back: a smaller shuffle
    const footY = y - 1 - Math.round(lift);
    const kx = Math.round((hx + fxp) / 2 + (side ? dir * lift * 0.8 : 0)), ky = Math.round((y - 18 + footY) / 2) - Math.round(lift / 2);
    pipe(hx + 0.5, y - 18, kx + 0.5, ky, 2, skin);                          // thigh to knee
    pipe(kx + 0.5, ky, fxp + 0.5, footY - 1, 2, skin);                      // knee to ankle
    if (K.barefoot) rect(fxp - (side && dir < 0 ? 1 : 0), footY, 2 + (side ? 1 : 0), 1, skin);
    else if (K.slippers) rect(fxp - 1, footY - 1, 3, 2, K.shoes);
    else { rect(fxp - 1, footY, 3, 1, K.shoes); rect(fxp + (side ? -dir : 1), footY - 1, 1, 1, K.shoes); }   // a heel
    if (K.cut === 'trousers') { pipe(hx + 0.5, y - 19, kx + 0.5, ky, 2, dress); pipe(kx + 0.5, ky, fxp + 0.5, footY - 2, 2, dress); }
  }
  // the skirt, from the hips down
  if (K.cut === 'full') {
    for (let k = 0; k < 10; k++) rowAt(x, y - 22 + k, 8 + Math.round(k * 1.1), k === 9 ? dressDark : dress);
    if (K.dots && facing !== 'back') for (const [dx, dy] of [[-4, -19], [1, -20], [4, -16], [-2, -15], [-6, -14], [3, -13], [0, -17], [6, -14]]) rect(x + dx, y + dy, 1, 1, K.dots);
  }
  if (K.cut === 'gown') for (let k = 0; k < 22; k++) rowAt(x, y - 22 + k, 9 + Math.floor(k / 5), k % 6 === 3 ? dressDark : dress);
  if (K.cut === 'short') { for (let k = 0; k < 8; k++) rowAt(x, y - 22 + k, 10 - (k > 5 ? 1 : 0), k === 7 ? dressDark : dress); if (K.dots) for (let k = 0; k < 8; k += 2) rowAt(x, y - 21 + k, 9, K.dots); }
  if (K.cut === 'baby') for (let k = 0; k < 5; k++) rowAt(x, y - 22 + k, 10 + (k > 2 ? 1 : 0), k === 4 ? K.dots : dress);
  if (K.cut === 'shorts') { rowAt(x, y - 22, 8, dress); rowAt(x, y - 21, 8, dress); rowAt(x, y - 20, 7, dress); }
  if (K.cut === 'trousers') { rowAt(x, y - 22, 8, dress); rowAt(x, y - 21, 8, dress); }
  if (K.cut === 'wiggle') for (let k = 0; k < 11; k++) rowAt(x, y - 22 + k, (side ? 8 : 10) - Math.floor(k / 4), k === 10 ? dressDark : dress);
  wifeTop(K, x, y, facing, motion.hip, false, ph);
}
// Her top half, standing at x, y (her waist is 23 up): the bodice, arms, head and hair, turned the way she's facing
// One leg as she sits: hip, knee and foot (iso points), the thigh in its own colour
function sitLeg(K, hipAt, kneeAt, footAt, thighCol) {
  const h = P(...hipAt), k = P(...kneeAt), f = P(...footAt);
  pipe(h[0], h[1] - 1, k[0], k[1] - 1, 2, thighCol);                     // thigh
  pipe(k[0], k[1] - 1, f[0], f[1] - 1, 2, C.skin);                       // shin
  rect(f[0] - 1, f[1] - 1, 3, 1, K.barefoot ? C.skin : K.shoes);         // foot
}
// head: which way her head faces, if not the same way as her body ('quarter': half turned to us, looking right)
function wifeTop(K, x, y, facing, hip, sitting, ph, head) {
  const skin = C.skin, dress = K.dress, top = K.top || dress, side = facing === 'left' || facing === 'right', back = facing === 'back', dir = facing === 'left' ? -1 : 1;
  if (sitting && side) for (let k = 0; k < 3; k++) rowAt(x + 2 * dir, y - 22 + k, 7, dress);   // her lap, towards her knees
  else if (sitting) for (let k = 0; k < 3; k++) rowAt(x, y - 22 + k, 10, dress);
  rowAt(x, y - 23, 6, K.crop ? skin : top); rowAt(x, y - 24, 6, K.crop ? skin : top); rowAt(x, y - 25, 7, top);
  if (K.cut === 'full') rowAt(x, y - 24, 6, C.ink);
  if (K.belt) rowAt(x, y - 24, 6, K.belt);
  for (const [dy, w] of [[-26, 8], [-27, 9], [-28, 9], [-29, 8]]) rowAt(x + (side ? dir : 0), y + dy, side ? w - 2 : w, top);   // the bust (narrower side on)
  if (!back) { rowAt(x, y - 28, side ? 7 : 9, shade(top, 0.75)); }
  rowAt(x, y - 29, 7, top);
  if (K.halter) { rect(x - 2, y - 32, 1, 3, dress); rect(x + 1, y - 32, 1, 3, dress); }
  for (const [dy, w] of [[-30, side ? 7 : 9], [-31, side ? 6 : 8]]) rowAt(x, y + dy, w, skin);   // shoulders
  if (K.tee) for (const sx of [x - 6, x + 4]) rect(sx, y - 30, 2, 4, dress);
  // arms: swinging as she walks; one hand on her hip now and then
  const swing = ph === undefined ? 0 : Math.round(Math.sin(ph) * 2);
  const arm = (sx, s, onHip) => {
    if (onHip) { rect(sx, y - 30, 1, 3, skin); rect(sx + s, y - 28, 1, 3, skin); rect(sx, y - 25, 1, 1, skin); rect(sx - s, y - 24, 1, 1, skin); return; }   // elbow out, hand on hip
    line(sx, y - 30, sx + (side ? swing * s * dir : 0), y - 20, skin);   // a straight arm, swinging as she walks
  };
  if (side) arm(x + (dir > 0 ? 1 : -2), 1, false);                          // side on: the near arm
  else { arm(x - 5, -1, false); arm(x + 4, 1, !!hip); }
  if (K.pearls && !back) for (let k = -2; k <= 1; k++) rect(x + k, y - 30 + (k === -2 || k === 1 ? 0 : 1), 1, 1, C.white);
  // the head: its own way, or the same way as her body
  const hf = head || facing, quarter = hf === 'quarter';
  const hside = hf === 'left' || hf === 'right', hback = hf === 'back', hdir = hf === 'left' ? -1 : 1;
  // neck and face (turned; from behind you see her hair)
  rect(x - 1, y - 33, 2, 2, skin);
  for (const [dy, w] of [[-34, 4], [-35, 5], [-36, 5], [-37, 5], [-38, 5], [-39, 4]]) rowAt(x, y + dy, w, skin);
  if (!hback) {
    if (hside) { rect(x + hdir * 1, y - 37, 1, 1, C.ink); rect(x + hdir * 1, y - 35, 1, 1, C.red); rect(x + hdir * 3, y - 36, 1, 1, skin); }   // profile: one eye, lips, nose
    else if (quarter) { rect(x - 1, y - 37, 1, 1, C.ink); rect(x + 1, y - 37, 1, 1, C.ink); rect(x, y - 35, 2, 1, C.red); rect(x - 2, y - 36, 1, 3, shade(skin, 0.85)); }   // half turned: eyes and lips nudged over, the far cheek in shadow
    else { rect(x - 2, y - 37, 1, 1, C.ink); rect(x + 1, y - 37, 1, 1, C.ink); rect(x - 1, y - 35, 2, 1, C.red); }
  }
  // hair
  const h = K.hair, hd = shade(K.hair, 0.8), bx = hside ? x - hdir * 2 : x;  // hside on, her hair sits towards the hback of her head
  if (hback) for (const [dy, w] of [[-34, 4], [-35, 5], [-36, 5], [-37, 5], [-38, 5]]) rowAt(x, y + dy, w, h);   // the hback of her head
  if (K.style === 'curls') { rowAt(x, y - 40, 6, h); rowAt(x, y - 41, 4, h); for (const sx of [x - 4, x + 3]) { rect(sx, y - 39, 2, 6, h); rect(sx, y - 35, 1, 1, hd); } }
  if (K.style === 'long') { rowAt(x, y - 40, 6, h); rowAt(x, y - 41, 4, h); if (hside) rect(bx - 1, y - 39, 3, 14, h); else for (const sx of [x - 4, x + 3]) rect(sx, y - 39, 2, 13, h); if (hback) rowAt(x, y - 30, 6, h), rowAt(x, y - 28, 6, h); }
  if (K.style === 'bob') { rowAt(x, y - 40, 7, h); rowAt(x, y - 41, 5, h); if (hside) rect(bx - 1, y - 39, 3, 6, h); else for (const sx of [x - 4, x + 3]) rect(sx, y - 39, 2, 6, h); }
  if (K.style === 'ponytail') { rowAt(x, y - 40, 6, h); rowAt(x, y - 41, 4, h); rect(bx + (hside ? -hdir * 2 : 4), y - 39, 2, 7, h); rect(bx + (hside ? -hdir * 2 : 5), y - 32, 1, 2, hd); }
  if (K.style === 'updo') { rowAt(x, y - 40, 6, h); rowAt(x, y - 41, 5, h); rowAt(bx, y - 42, 3, h); if (!hside) { rect(x - 3, y - 39, 1, 3, h); rect(x + 2, y - 39, 1, 3, h); } else rect(bx - hdir, y - 39, 2, 4, h); }
  if (K.style === 'perm') { for (const [dy, w] of [[-42, 6], [-41, 9], [-40, 10], [-39, 10], [-38, 10]]) rowAt(x, y + dy, w, h); for (const sx of [x - 5, x + 4]) rect(sx, y - 37, 2, 5, h); if (!hback) { rowAt(x, y - 39, 5, skin); rowAt(x, y - 38, 5, skin); } }
  if (hside) {                                                            // hside on: her hair covers the hback half of her head, down to the nape
    const backX = hdir > 0 ? x - 3 : x;
    for (let dy = -41; dy <= -33; dy++) rect(backX, y + dy, 3, 1, h);
    rect(hdir > 0 ? x - 3 : x + 2, y - 38, 1, 5, hd);                     // a little shading at the hback
    rect(x - 1 + hdir, y - 41, 3, 1, h);                                  // over the top, to her forehead
    if (K.style === 'updo') { rect(hdir > 0 ? x - 6 : x + 3, y - 42, 3, 4, h); rect(hdir > 0 ? x - 5 : x + 3, y - 43, 2, 1, h); }   // the bun at the hback
  }
  if (K.band) rowAt(x, y - 39, 6, K.band);
  if (K.scarf) rowAt(x, y - 40, 6, K.scarf);
  if (K.earrings && !hback) { if (hside) rect(x - hdir, y - 35, 1, 1, K.earrings); else { rect(x - 3, y - 35, 1, 1, K.earrings); rect(x + 2, y - 35, 1, 1, K.earrings); } }
}
// Where her head is on screen (for her speech bubble's arrow)
function wifeHead() {
  if (S.screen === 'place' && S.flags.pickup === S.day) {             // outside the pub, by the car, come to fetch him
    [ISO.ox, ISO.oy] = OUTSIDE_VIEW;
    const q = P(...PICKUP_AT);
    return [q[0] + 2, q[1] - 42];
  }
  if (S.screen === 'home' && FOLLOW.pos) {                             // she's followed him outside
    [ISO.ox, ISO.oy] = VIEW.home;
    const q = P(...FOLLOW.pos);
    return [q[0] + 2, q[1] - 42];
  }
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
// A patch of col with a speckle of lighter and darker pixels (amt: how strong); the same speckle every time for a seed
function grime(x, y, w, h, col, amt = 0.18, seed = 1) {
  const [r, g, b] = col;
  for (let yy = y; yy < y + h; yy++) {
    const ry = Math.round(yy);
    if (ry < 0 || ry >= H) continue;                                  // off the picture
    for (let xx = x; xx < x + w; xx++) {
      const rx = Math.round(xx);
      if (rx < 0 || rx >= W) continue;
      const f = 1 + (hash(xx * 3 + seed, yy * 7) - 0.5) * amt;        // this pixel: a touch lighter or darker
      IMG32[ry * W + rx] = pack32(r * f, g * f, b * f);               // (no new colour made for each pixel)
    }
  }
}
// The whole picture in grass, with darker flecks: worked out once for each picture size, then copied in
let GRASS = null;                                                     // { w, h, pixels }
function grassField() {
  if (!GRASS || GRASS.w !== W || GRASS.h !== H) {
    const pixels = new Uint32Array(W * H);
    const light = colour32(C.grass), dark = colour32(C.grassDark);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) pixels[y * W + x] = hash(x, y) < 0.1 ? dark : light;
    GRASS = { w: W, h: H, pixels };
  }
  IMG32.set(GRASS.pixels);
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
// Each gearbox sensor's colour: the same on the workbench as under the car
// The sensor's wires (the same three colours as the loom under the car)
const SENSOR_WIRES = [C.red, C.warm, hex('#40a060')];
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
