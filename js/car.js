// Bland Quest Auto: the car itself, close up. The boot (spare wheel, jack, brace), under the bonnet (the battery
// leads, the fuse box), the driver's seat (dials, key, radio, the hatch and the diagnostic port, the ECU panel,
// the glove box). Loaded after screens.js; drawn with the kit in art.js.
// =====================================================================
// THE BOOT: lid up, looking in from behind; the spare wheel, the jack and the wheel brace (for a flat tyre)
// =====================================================================
SCREENS.boot = {
  size: [480, 270],
  paint() {
    const roadside = !!S.road;                                          // open on Mill Lane, with a puncture (road.js)
    if (roadside) {
      grime(0, 0, W, H, C.grassDark, 0.12, 43);                         // the verge behind
      rect(0, 236, W, 34, C.road);                                      // the road
    } else {
      grime(0, 0, W, H, C.concrete, 0.1, 41);                           // the garage wall behind
      rect(0, 236, W, 34, C.floor);                                     // the garage floor
    }
    // the lid, swung up, with its rear window
    rbox(60, 2, 360, 34, 8, C.car);
    rbox(80, 8, 320, 20, 4, C.glass);
    rect(96, 12, 120, 2, shade(C.glass, 1.6));                          // a shine on the glass
    // the back of the car round the opening, and the tail lights
    rbox(30, 30, 420, 214, 12, C.car);
    for (const x of [36, 424]) { rbox(x, 44, 20, 70, 4, C.red); rect(x + 4, 50, 12, 20, shade(C.red, 1.3)); }
    // inside: the boot floor lifted out, so you see the well underneath
    rbox(60, 42, 360, 190, 8, hex('#2a2a30'));
    grime(66, 48, 348, 178, hex('#2a2a30'), 0.25, 42);
    // the spare wheel, lying flat in its round well, bolted down in the middle (or not there: at Worn Out and Tired)
    disc(240, 136, 66, hex('#18181c'));                                 // the well
    const spareOut = S.spare === 'away' || S.spareOut || (S.road && S.road.spare);   // at Worn Out and Tired, or heaved out onto the verge
    if (!spareOut) {
      disc(240, 136, 60, C.tyre);                                       // the tyre
      for (let a = 0; a < 6.28; a += 0.2) px(240 + Math.cos(a) * 54, 136 + Math.sin(a) * 54, hex('#34343a'));   // tread
      disc(240, 136, 36, C.rim);                                        // the steel wheel
      ring(240, 136, 36, C.steel2);
      for (let k = 0; k < 4; k++) disc(240 + Math.cos(k * 1.571) * 20, 136 + Math.sin(k * 1.571) * 20, 3, C.steel2);   // its stud holes
      bolt(240, 136, 9, false);                                         // the big nut holding it down
      if (S.spare === 'flat') spareScrew(240 + 42, 136 + 32, 4);       // the screw in its tread
      if (S.flags.gloveGauge) tyreGauge();                              // the gauge, on its valve (its needle moves: animate)
    }
    // the jack: a scissor jack, folded flat in its foam tray (unless Paul's borrowed it: then just the tray)
    rbox(80, 92, 84, 96, 6, hex('#1e1e22'));
    if (!S.flags.jackLent) {
      for (const [x0, y0, x1, y1] of [[96, 170, 122, 120], [122, 120, 148, 170], [96, 110, 122, 140], [122, 140, 148, 110]]) pipe(x0, y0, x1, y1, 4, C.steel2);
      rect(92, 170, 60, 6, C.tool); rect(110, 102, 24, 6, C.tool);      // its foot and its saddle
      pipe(150, 140, 162, 140, 3, C.steel);                             // the screw it winds up on
    }
    // the wheel brace: an L-shaped bar, clipped down on the right
    rbox(324, 84, 88, 112, 6, hex('#1e1e22'));
    pipe(344, 100, 344, 176, 6, C.steel);
    pipe(344, 176, 392, 176, 6, C.steel);
    disc(344, 100, 6, C.steel2); disc(344, 100, 3, C.greyDark);         // its socket end
    // the bumper and the number plate
    rbox(24, 238, 432, 24, 6, C.carDark);
    rbox(196, 242, 88, 16, 2, C.warm);
    text('TT85 KIK', 210, 247, C.ink);
    const spareGo = S.road && !S.road.spare ? 'act:roadspare' : null;   // at the roadside: heave it out
    zoomZones([['Spare wheel', 172, 68, 136, 136, false, spareGo], ['Jack', 78, 88, 90, 104, false, S.flags.jackLent ? 'act:nojack' : null], ['Wheel brace', 320, 80, 96, 120]]);
    hud();
  },
  actions() { return []; }   // ◀ Back closes the boot (to the roadside, or the garage)
}
// THE TYRE PRESSURE GAUGE on the spare: pressed on its valve, a big dial. The first third is red; a black needle rides up
//   and settles: in the middle of the red if the tyre's poor, well clear of it if it's good. Nothing is said: you just see it (Steve)
const GAUGE = { valve: [266, 110], dial: [300, 72], r: 24 };          // the valve on the rim; the dial's middle and size
const GAUGE_SWEEP = [Math.PI * 0.75, Math.PI * 2.25];                 // the dial's arc: from bottom left, clockwise, to bottom right
let GAUGE_T0 = 0;                                                     // when the boot opened (the needle rides up from then)
const gaugeAngle = f => GAUGE_SWEEP[0] + (GAUGE_SWEEP[1] - GAUGE_SWEEP[0]) * f;   // f: 0 (nothing) to 1 (full)
const spareReading = () => (S.spare === 'good' ? 0.62 : 1 / 6);      // poor: the middle of the red third; good: well up
function tyreGauge() {
  const [vx, vy] = GAUGE.valve, [cx, cy] = GAUGE.dial, r = GAUGE.r;
  rect(vx - 2, vy - 2, 4, 5, C.ink);                                  // the valve, sticking out of the rim
  pipe(vx, vy - 2, cx - 10, cy + 14, 6, C.steel2);                    // the gauge's stick, pressed on it
  disc(cx, cy, r + 3, C.steel); disc(cx, cy, r, C.white);             // the bezel and the face
  for (let a = gaugeAngle(0); a <= gaugeAngle(1 / 3); a += 0.02) {   // the red third
    for (let k = 3; k < r - 1; k++) px(cx + Math.cos(a) * k, cy + Math.sin(a) * k, C.red);   // a red wedge, from the middle out
  }
  for (let k = 0; k <= 10; k++) {                                     // the ticks round the edge
    const a = gaugeAngle(k / 10), inner = k % 5 === 0 ? r - 7 : r - 4;
    line(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner, cx + Math.cos(a) * (r - 1), cy + Math.sin(a) * (r - 1), C.ink);
  }
}
// The needle: rides up from 0 over a second and a half after the boot opens, and settles on the reading
SCREENS.boot.animate = function () {
  if (!S.flags.gloveGauge || S.spare === 'away' || (S.road && S.road.spare)) return;   // no gauge, or no spare in the well
  const [cx, cy] = GAUGE.dial, r = GAUGE.r;
  const p = Math.min(1, (performance.now() - GAUGE_T0) / 1500);
  const ease = 1 - Math.pow(1 - p, 3);                                 // fast at first, settling
  const wobble = p < 1 ? Math.sin(p * 18) * 0.03 * (1 - p) : 0;       // a little shiver as it settles
  const a = gaugeAngle(spareReading() * ease + wobble);
  pipe(cx, cy, cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5), 2, C.ink);   // the black needle
  disc(cx, cy, 3, C.ink);                                              // its hub
};;

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
// A headlight seen from above, under the bonnet: whole (yellow), or smashed (dull, cracked, a bit missing). Tap it
const BONNET_LAMP = { left: [32, 222], right: [376, 222] };          // where each sits: the left one on your left, the same as when you kicked it (Steve)
function bonnetLamp(side) {
  const [x, y] = BONNET_LAMP[side], smashed = kickedLamps()[side];
  rbox(x, y, 72, 20, 5, C.ink);                                        // its housing
  rect(x + 3, y + 3, 66, 14, smashed ? shade(C.warm, 0.45) : C.warm);  // the lens
  rect(x + 8, y + 5, 14, 3, smashed ? shade(C.white, 0.5) : C.white);  // a shine
  if (smashed) {                                                        // the crack, and a bit missing
    line(x + 10, y + 16, x + 28, y + 6, C.white); line(x + 28, y + 6, x + 40, y + 14, C.white); line(x + 40, y + 14, x + 58, y + 4, C.white);
    rect(x + 44, y + 8, 10, 7, C.ink);
  }
  spot(`${side === 'left' ? 'Left' : 'Right'} headlight${smashed ? ': smashed' : ''}`, [x, y - 4, 72, 28], 'act:lamp:' + side);
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
    rect(110, 226, 260, 16, hex('#3a3c40')); for (let x = 112; x < 368; x += 3) rect(x, 228, 1, 12, hex('#55585c'));   // the radiator, between the headlights
    for (const side of ['left', 'right']) bonnetLamp(side);           // both headlights, from above (left on the left, as you kicked them)
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
    disc(360, 210, 7, C.car); ring(360, 210, 7, C.carDark);
    for (const [x0, y0, x1, y1] of [[160, 160, 340, 170], [330, 170, 352, 180], [322, 120, 354, 120]]) pipe(x0, y0, x1, y1, 4, C.ink);
    for (let x = 180; x < 330; x += 22) rect(x, 158, 3, 10, hex('#3a3a3a'));
    zoomZones([['Fuse box', 348, 148, 76, 64, true, 'fuseZoom'], ['Battery', 350, 106, 72, 40, false, 'act:look:Battery'], ['Engine', 170, 74, 154, 124, false, 'act:look:Engine'], ['Air filter', 58, 66, 106, 88, false, 'act:look:Air filter'], ['Coolant', 60, 160, 64, 60, false, 'act:look:Coolant'], ['Brake fluid', 326, 58, 34, 36, false, 'act:look:Brake fluid']]);
    for (const side of ['plus', 'minus']) {                                     // each lead comes off (and goes back on) by itself
      const [x, y] = BATTERY_POST[side], on = batteryLeadOn(side);
      spot((side === 'plus' ? '+ lead' : '− lead') + (on ? ': take it off' : ': put it back on'), [x - 4, y - 26, 22, 34], 'act:batlead:' + side);
    }
    hud();
  },
  actions() { return []; }   // tap the fuse box to zoom in; ◀ Back to close the bonnet (Steve)
};

// Testing the fuses with the multimeter: where each fuse is, and the marks it leaves
const FUSE_BLOWN = 17;                                              // the cigarette lighter: blown for years
const fuseAt = n => [50 + ((n - 1) % 6) * 40, 54 + Math.floor((n - 1) / 6) * 38];   // fuse n's top-left corner
const fuseEmpty = n => n === 27 || n === 28;                        // two empty slots
// A dot on a fuse that's been tested: green if it's good, red if it's blown
function fuseMark(n) {
  if (fuseEmpty(n)) return;
  const [x, y] = fuseAt(n);
  disc(x + 23, y + 3, 3, n === FUSE_BLOWN ? C.red : hex('#48c060'));
}
// The dots on every fuse up to n (the sweep, and once they've all been done)
function fuseMarks(upTo) {
  for (let n = 1; n <= upTo; n++) fuseMark(n);
}
// THE MULTIMETER, out on the fuse box (where the lid's paper was): yellow, its screen, its dial, two leads to the probes
const METER = { x: 328, y: 52, w: 116, h: 190 };
const meterOut = () => !!S.flags.meterOK && !!S.flags.meterOut;
// What its screen says with the probes on fuse n: a good fuse reads 0 (and beeps); the blown one reads 1; resting, dashes (Steve)
const meterReading = n => (!n || fuseEmpty(n) ? '- - -' : n === FUSE_BLOWN ? '1' : '0');
// The meter, with its probes on fuse n (0: resting on the box's edge); leads: draw the leads and probes too
function drawMeter(n, leads = true) {
  const { x, y, w, h } = METER;
  rbox(x, y, w, h, 12, hex('#d0a020'));                             // its yellow rubber case
  rbox(x + 6, y + 6, w - 12, h - 12, 8, hex('#e8b830'));
  rect(x + 14, y + 16, w - 28, 44, hex('#0a2a20'));                 // its screen
  text(meterReading(n), x + 22, y + 26, C.mint, 4);
  disc(x + w / 2, y + 104, 26, hex('#1c1c1c'));                     // the dial
  ring(x + w / 2, y + 104, 26, C.steel2);
  pipe(x + w / 2, y + 104, x + w / 2 - 14, y + 84, 4, C.white);      // set to Ω (continuity)
  text('V', x + 16, y + 74, C.ink); text('A', x + w - 22, y + 74, C.ink); text('BEEP', x + 30, y + 140, C.ink);
  disc(x + 34, y + h - 22, 7, C.red); disc(x + w - 34, y + h - 22, 7, C.ink);   // the two sockets
  if (!leads) return;
  const fuse = n && !fuseEmpty(n) ? fuseAt(n) : null;
  const tips = fuse ? [[fuse[0] + 6, fuse[1] + 24], [fuse[0] + 20, fuse[1] + 24]] : [[290, 248], [300, 252]];   // on its two legs, or resting
  [[x + 34, C.red], [x + w - 34, C.ink]].forEach(([sx, col], k) => {
    const [tx, ty] = tips[k];
    const sag = [(sx + tx) / 2, Math.max(y + h, ty) + 18];          // the lead hangs down between them
    pipe(sx, y + h - 22, sag[0], sag[1], 6, col);   // thick leads (Steve)
    pipe(sag[0], sag[1], tx + 6, ty + 14, 6, col);
    pipe(tx + 6, ty + 14, tx, ty, 6, col);                           // the probe itself
    disc(tx, ty, 2, C.steel);                                        // its point
  });
}
// The moment: the probes go along the fuses one by one, the screen reading each, a dot on each
function fuseTestDraw(p) {
  const n = Math.min(30, Math.floor(p * 30) + 1);                   // the fuse being tested now
  fuseMarks(n - 1);
  drawMeter(n);
}

// Each fuse lights up as you point at it; with the multimeter out, pointing at it tests it (engine.js)
function fuseSpots(testing) {
  for (let n = 1; n <= 30; n++) {
    if (fuseEmpty(n)) continue;                                       // the two empty slots
    const [x, y] = fuseAt(n);
    spot('F' + n, [x - 2, y - 2, 30, 30], testing ? 'act:testfuse:' + n : 'act:fuselook:' + n);
  }
}
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
    const testing = ANIM && ANIM.kind === 'fusetest';                 // being tested now: the marks go on one by one (the moment)
    if (S.flags.fusesTested && !testing) fuseMarks(30);              // tested: a green dot on each good one, red on F17
    if (!testing) (S.fusesChecked || []).forEach(fuseMark);           // the ones tested one at a time
    rbox(316, 34, 140, 222, 8, hex('#1c1c1c'));
    if (meterOut() || testing) {                                     // the multimeter's out, on the box where the lid's paper was
      rect(326, 46, 120, 196, hex('#24241f'));
      if (!testing) drawMeter(S.meterFuse || 0);                     // (while testing, the moment draws it)
      if (!testing) fuseSpots(true);                                 // point at a fuse: the probes go on it and it's tested
      hud();
      return;
    }
    fuseSpots(false);                                                 // point at a fuse: it lights up
    rect(326, 46, 120, 196, hex('#d8d4c4'));
    for (let n = 0; n < 2000; n++) px(326 + hash(n, 5) * 120, 46 + hash(5, n) * 196, hex('#b8b4a4'));
    const fuses = [['F21', 'Radio'], ['F22', '▒▒▒ ▒▒'], ['F23', 'Instr. (see note 7)'], ['F24', '—'], ['F25', 'Spare?'], ['F26', 'ABS / ESP / ???'], ['F27', 'Spare'], ['F28', 'Spare'], ['F29', 'Not used*'], ['F30', '*see F29']];
    LABELS.push(`<div class="lid" style="left:${330 / W * 100}%;top:${52 / H * 100}%;width:${112 / W * 100}%">${fuses.map(([fn, t]) => `<div><b>${fn}</b> ${esc(t)}</div>`).join('')}<div class="note">Note 7: see owner's manual</div></div>`);
    hud();
  },
  actions() {
    const a = [{ label: 'Check every fuse', act: 'fuses' }];
    if (S.flags.meterOK) a.push(meterOut() ? { label: 'Put the multimeter away', act: 'meterout:0' } : { label: 'Get the multimeter out', act: 'meterout:1' });
    return a;
  }
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

// Fluffy dice, hanging from the rear-view mirror on their strings
const DICE_SPOT = [182, 48, 36, 32];
function drawDice() {
  line(196, 49, 192, 62, C.white); line(204, 49, 208, 64, C.white);   // the strings
  for (const [x, y] of [[186, 62], [202, 64]]) {
    rbox(x, y, 12, 12, 3, hex('#f080b8'));                          // a fluffy pink die
    px(x + 3, y + 3, C.ink); px(x + 6, y + 6, C.ink); px(x + 8, y + 8, C.ink);   // its spots
  }
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
    // the glove box, on the far left
    gloveBoxLid();
    // the panel low down under the dashboard, with the ECU behind it
    ecuPanel();
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
      pipe(56, 226, 76, 236, 8, C.ink);                                                     // its thick lead, into the port
      spot('Code reader: unplug it', [2, 160, 54, 96], 'act:unplug');
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
    spot('Glove box', GLOVE_BOX, 'act:glovebox');
    spot('Panel under the dash', ECU_PANEL, 'act:ecu');
    if (diceUp()) {                                                  // fluffy dice on the mirror (extras.js)
      drawDice();
      spot('Fluffy dice: take them down', DICE_SPOT, 'act:dicedown');
    }
    tip("Driver's seat", S.flags.running ? 'Engine running.' : ['Key at 0: off. Tap the key to turn it.', 'Key at I: radio on.', 'Key at II: dash lights on. Tap again to start.', ''][S.key], 1, 8);
    hud();
  },
  actions() {
    const a = [];
    if (!S.flags.readerIn && ownedPlugs().length) a.push({ label: 'Try a reader in the port', act: 'port' });   // got a reader: try its plug
    if (S.flags.readerIn) a.push({ label: 'Unplug the code reader', act: 'unplug' });   // out of the port, back on the shelf
    if (S.flags.codes) a.push({ label: 'Clear the codes', act: 'clear' });
    return a;
  }
};

// =====================================================================
// THE GLOVE BOX: on the far left of the dashboard. Open it: useless car things, each with a line when you tap it
// =====================================================================
const GLOVE_BOX = [4, 116, 50, 40];                                 // its lid, on the dashboard: x, y, w, h
// What's inside: [name, what you find, where it lies in the close-up (x, y, w, h)]
const GLOVE_THINGS = [
  ['Ice scraper', 'An ice scraper, snapped clean in half. Both halves are here. Neither half scrapes.', [84, 112, 92, 60]],
  ['Tyre pressure gauge', 'A tyre pressure gauge. You press it on a tyre: 0 PSI. You press it on your thumb: 0 PSI.', [190, 104, 84, 50]],
  ['Torch', 'A torch. Click. Nothing. Click click. The batteries inside have gone furry.', [286, 116, 92, 40]]
];
const GAUGE_NAME = 'Tyre pressure gauge';
// The tyre pressure gauge in the glove box: it can go on the garage shelf (then it's on the spare whenever you open the boot)
function gloveGauge() {
  say('Tyre pressure gauge', 'A tyre pressure gauge. A dial on a stick.', [
    { label: 'Put it on the garage shelf', run() { S.flags.gloveGauge = true; sfx('click'); render(); } },
    { label: 'Leave it', run() {} }
  ]);
}
// The torch in the glove box: dead, but it can go on the garage shelf
const GLOVE_TORCH = 'Torch (from the glove box)';
function gloveTorch() {
  const [, words] = GLOVE_THINGS.find(t => t[0] === 'Torch');
  say('Torch', words, [
    { label: 'Put it on the garage shelf', run() { S.flags.gloveTorch = true; sfx('click'); say('Torch', 'It goes on the garage shelf. Furry batteries and all.'); } },
    { label: 'Leave it', run() {} }
  ]);
}
// The glove box's lid on the dashboard, shut
function gloveBoxLid() {
  const [x, y, w, h] = GLOVE_BOX;
  rbox(x, y, w, h, 4, hex('#24262a'));                              // the lid
  rect(x + 2, y + 2, w - 4, 2, hex('#34363b'));                     // a shine along its top edge
  rbox(x + w / 2 - 9, y + 8, 18, 6, 2, hex('#121214'));             // the catch
}
SCREENS.glovebox = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, H, hex('#2c2e33'), 0.12, 57);                    // the dashboard round it
    rbox(60, 70, 360, 150, 8, hex('#101113'));                      // the inside, dark
    rect(66, 76, 348, 6, hex('#1a1b1e'));                           // its top edge, in shadow
    rbox(50, 214, 380, 40, 6, hex('#24262a'));                      // the lid, dropped open towards you
    rbox(230, 222, 20, 8, 2, hex('#121214'));                       // its catch
    // the snapped ice scraper: two blue halves
    poly([[90, 150], [130, 128], [138, 140], [98, 162]], hex('#3070c0'));
    poly([[140, 146], [170, 120], [176, 130], [148, 158]], hex('#3070c0'));
    rect(128, 132, 4, 6, hex('#e8e0c0'));                           // the broken edges
    rect(142, 142, 4, 6, hex('#e8e0c0'));
    // the tyre pressure gauge: a silver stick with a little dial (until it goes on the garage shelf)
    if (!S.flags.gloveGauge) {
      pipe(200, 140, 262, 116, 6, C.steel2);
      disc(264, 115, 10, C.white); ring(264, 115, 10, C.steel);
      line(264, 115, 258, 119, C.ink);                              // the needle, resting on 0
    }
    // the torch with dead batteries (until you take it to the garage shelf)
    if (!S.flags.gloveTorch) {
      pipe(296, 136, 356, 136, 12, hex('#1c1c1c'));
      rect(354, 128, 16, 16, hex('#d0a020'));                       // its head
      rect(368, 131, 3, 10, hex('#5a5a40'));                        // the glass, no light
      rect(318, 130, 6, 3, C.red);                                  // the switch
    }
    GLOVE_THINGS.forEach(([name, , area], k) => {
      if (name === 'Torch' && S.flags.gloveTorch) return;            // the torch, once it's on the garage shelf
      if (name === 'Tyre pressure gauge' && S.flags.gloveGauge) return;   // the gauge, likewise
      spot(name, area, 'act:glove:' + k);
    });
    tip('The glove box', 'Tap a thing to look at it.', 1, 8);
    hud();
  },
  actions() { return []; }   // ◀ Back shuts it
};

// =====================================================================
// THE DIAGNOSTIC PORT, CLOSE UP: behind the hatch under the steering wheel.
// Every code reader you own lies below it on its lead; tap one to try its plug in the port
// =====================================================================
// The port: a flat D shape with 16 pins (two rows of 8)
const PORT_SOCKET = [[192, 52], [288, 52], [280, 86], [200, 86]];
const PORT_MIDDLE = 240;                                            // the middle of the port, across
const PLUG_TOP = 160;                                               // where each plug's top edge rests, below the port
const PLUG_TRAY = hex('#141518');                                   // the dark footwell the plugs lie in
// Each reader you can own, always in the same place: [id, name, x of its middle]
const PLUGS = [
  ['reader-old', "Gaz's reader (old type)", 110],
  ['reader-cheap', 'Zamanon reader', 240],
  ['reader-good', 'The used reader from Thee Bay', 370]
];
// The readers you own just now
const ownedPlugs = () => PLUGS.filter(([id]) => S.inv[id]);
// The plug being tried in the port, while its moment plays: { id, x, fits }
let PLUG_TRY = null;

// The port itself, big, in the hole behind the hatch
function portSocket() {
  rect(150, 30, 180, 80, hex('#0c0c0e'));                           // the hole behind the hatch
  poly(PORT_SOCKET, hex('#26272b'));                                // the socket
  for (let k = 0; k < 8; k++) {
    rect(204 + k * 10.5, 59, 4, 5, hex('#0a0a0c'));                 // a top-row pin hole
    rect(205 + k * 10.5, 60, 2, 3, C.steel);                        // the pin inside it
    rect(208 + k * 9.4, 73, 4, 5, hex('#0a0a0c'));                  // a bottom-row pin hole
    rect(209 + k * 9.4, 74, 2, 3, C.steel);                         // and its pin
  }
}

// One reader's plug, facing up, its top edge at `top`, on its lead running down out of the picture
// leadX: where its lead runs out of the picture (it stays by where the plug lay, even while the plug is up at the port)
function plugDraw(id, cx, top, leadX = cx) {
  if (id === 'reader-old') {                                        // Gaz's: a little round plug, from 1994
    pipe(cx, top + 40, leadX, H, 8, C.ink);                            // its thick lead
    rect(cx - 9, top + 28, 18, 14, hex('#4a4a4a'));                 // the grip
    disc(cx, top + 16, 16, hex('#4a4a4a'));                         // the round plug
    disc(cx, top + 16, 11, hex('#1c1c1c'));                         // its face
    rect(cx - 2, top + 2, 4, 4, hex('#4a4a4a'));                    // the notch that lines it up
    for (let k = 0; k < 5; k++) {                                   // five pins in a ring
      const a = -1.57 + k * 1.2566;
      rect(cx + Math.cos(a) * 6 - 1, top + 16 + Math.sin(a) * 6 - 1, 2, 2, C.steel);
    }
    return;
  }
  if (id === 'reader-cheap') {                                      // Zamanon's: a lorry plug the size of a jam jar lid
    pipe(cx, top + 66, leadX, H, 11, C.ink);                           // its fat lead
    rect(cx - 15, top + 52, 30, 16, hex('#2e5a34'));                // the grip
    disc(cx, top + 28, 30, hex('#2e5a34'));                         // the round plug
    ring(cx, top + 28, 30, hex('#1e3a22'));                         // its twist-lock collar
    rect(cx - 34, top + 24, 6, 8, hex('#1e3a22'));                  // the collar's lugs, left…
    rect(cx + 28, top + 24, 6, 8, hex('#1e3a22'));                  // …and right
    disc(cx, top + 28, 22, hex('#16241a'));                         // its face
    disc(cx, top + 28, 2, C.steel);                                 // nine fat pins: one in the middle…
    for (let k = 0; k < 8; k++) disc(cx + Math.cos(k * 0.785) * 13, top + 28 + Math.sin(k * 0.785) * 13, 2, C.steel);   // …and eight round it
    return;
  }
  // the right one: a flat D, the same shape as the port, 16 pins
  pipe(cx, top + 52, leadX, H, 9, C.ink);                              // its thick lead
  rbox(cx - 30, top + 32, 60, 22, 4, hex('#1c1c1c'));               // the grip
  poly([[cx - 48, top], [cx + 48, top], [cx + 40, top + 34], [cx - 40, top + 34]], hex('#1c1c1c'));   // the plug
  poly([[cx - 44, top + 3], [cx + 44, top + 3], [cx + 37, top + 31], [cx - 37, top + 31]], hex('#2a2a2a'));   // its face
  for (let k = 0; k < 8; k++) {
    rect(cx - 35 + k * 10.5, top + 8, 2, 3, C.steel);               // the top row of pins
    rect(cx - 31 + k * 9.4, top + 22, 2, 3, C.steel);               // and the bottom row
  }
}

SCREENS.port = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, 120, hex('#2c2e33'), 0.12, 58);                  // under the dashboard, round the port
    rect(0, 120, W, H - 120, PLUG_TRAY);                            // the footwell below, where the plugs lie
    portSocket();
    for (const [id, name, cx] of ownedPlugs()) {
      plugDraw(id, cx, PLUG_TOP);                                   // each reader's plug, on its lead (one that doesn't fit goes in the parts box)
      spot(name + ': try it', [cx - 50, PLUG_TOP - 4, 100, 80], 'act:tryplug:' + id);
    }
    tip('The diagnostic port', 'A flat socket with 16 pins. Tap a plug to try it in the port.', 1, 8);
    hud();
  },
  actions() { return []; }   // ◀ Back to the seat
};

// The moment: the plug goes up to the port. The right one slides in; a wrong one won't go, jiggles, and drops back
function plugTryDraw(p) {
  if (!PLUG_TRY) return;
  const { id, x, fits } = PLUG_TRY;
  rect(x - 50, PLUG_TOP - 16, 100, H - PLUG_TOP + 16, PLUG_TRAY);  // lift it from where it lay
  let cx = x;
  let top = PLUG_TOP;
  if (fits) {                                                       // the right one: up and in
    const q = ease(Math.min(1, p / 0.7));
    cx = lerp(x, PORT_MIDDLE, q);
    top = lerp(PLUG_TOP, PORT_SOCKET[0][1], q);
  } else if (p < 0.45) {                                            // a wrong one: up to the port…
    const q = ease(p / 0.45);
    cx = lerp(x, PORT_MIDDLE, q);
    top = lerp(PLUG_TOP, 92, q);
  } else if (p < 0.75) {                                            // …it won't go in: a jiggle…
    cx = PORT_MIDDLE + Math.sin(p * 90) * 4;
    top = 92;
  } else {                                                          // …and back down where it was
    const q = ease((p - 0.75) / 0.25);
    cx = lerp(PORT_MIDDLE, x, q);
    top = lerp(92, PLUG_TOP, q);
  }
  plugDraw(id, cx, top, x);                                         // its lead still runs down to where it lay
}

// =====================================================================
// THE ECU: behind the panel low down under the dashboard. The car's computer, covered in stickers
// =====================================================================
const ECU_PANEL = [300, 248, 108, 20];                              // the panel on the dashboard: x, y, w, h
// What you can look at: [name, what you find, where it is in the close-up (x, y, w, h)]
const ECU_THINGS = [
  ['The ECU', "The car's computer. It knows exactly what's wrong with the car. It isn't saying.", [150, 70, 230, 136]],
  ['Warranty sticker', 'WARRANTY VOID IF REMOVED.\n\nThe warranty ran out two days ago.', [256, 86, 104, 30]],
  ['Part number label', 'A label: ECU, part no. 09 391 263.\n\nUnder it, in tiny print: "Must be coded to the vehicle by an approved dealer."', [176, 144, 104, 40]],
  ['The plugs', 'Two fat plugs, about 150 pins between them. Not one of them is labelled "red light".', [96, 92, 58, 92]],
  ['A sweet wrapper', 'A sweet wrapper, from a brand they stopped making in 2008. Someone has been in here before you.', [298, 222, 60, 26]]
];
// The panel on the dashboard, screwed shut
function ecuPanel() {
  const [x, y, w, h] = ECU_PANEL;
  rbox(x, y, w, h, 3, hex('#24262a'));                              // the panel
  rect(x + 2, y + 1, w - 4, 1, hex('#34363b'));                     // its top edge catches the light
  const screws = [[x + 5, y + 5], [x + w - 6, y + 5], [x + 5, y + h - 6], [x + w - 6, y + h - 6]];
  for (const [sx, sy] of screws) disc(sx, sy, 2, C.steel2);         // its four screws
}
SCREENS.ecu = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, H, hex('#1a1b1e'), 0.14, 59);                    // the dark space behind the panel
    // the wiring loom: a bundle of wires from the left, into the two plugs
    const wires = [C.red, hex('#6a4a2a'), C.door, C.warm, C.ink, hex('#3a8a3a')];
    wires.forEach((col, k) => {
      pipe(0, 104 + k * 3, 96, 104 + k * 2, 2, col);                // into the top plug
      pipe(0, 156 + k * 3, 96, 152 + k * 2, 2, col);                // into the bottom plug
    });
    // the ECU: a silver box with cooling fins, bolted on by its tabs
    rect(140, 84, 14, 18, hex('#7a8086'));                          // the left mounting tab
    rect(376, 84, 14, 18, hex('#7a8086'));                          // the right one
    disc(147, 93, 3, C.steel);                                      // their bolts
    disc(383, 93, 3, C.steel);
    rbox(150, 70, 230, 136, 6, hex('#8c9298'));                     // the box
    rect(156, 76, 218, 124, hex('#a4aab0'));                        // its face
    for (let y = 124; y < 196; y += 8) rect(300, y, 68, 2, hex('#7a8086'));   // cooling fins, bottom right
    // the two plugs into it, each with its locking lever
    for (const y of [92, 140]) {
      rbox(96, y, 58, 44, 4, hex('#1c1c1c'));
      rect(100, y + 4, 50, 4, hex('#3a3a3a'));
    }
    // the warranty sticker: red on white
    rect(256, 86, 104, 30, hex('#e8e4d8'));
    rect(256, 86, 104, 2, C.red);
    rect(256, 114, 104, 2, C.red);
    text('WARRANTY VOID', 262, 92, C.red);
    text('IF REMOVED', 262, 104, C.red);
    // the part number label, with a barcode
    rect(176, 144, 104, 40, hex('#e8e4d8'));
    text('ECU', 182, 149, C.ink);
    text('09 391 263', 182, 158, C.ink);
    for (let k = 0; k < 40; k++) if (hash(k, 9) > 0.4) rect(182 + k * 2, 168, 1, 11, C.ink);
    // a sweet wrapper, on the floor
    poly([[312, 229], [298, 223], [302, 235], [298, 247], [312, 241]], hex('#8a3aa0'));   // its twisted left end
    poly([[342, 229], [356, 223], [352, 235], [356, 247], [342, 241]], hex('#8a3aa0'));   // its twisted right end
    rect(312, 229, 30, 12, hex('#9a4ab0'));                     // the middle
    rect(316, 232, 22, 2, hex('#d8b8e8'));                          // its shine
    ECU_THINGS.forEach(([name, , area], k) => spot(name, area, 'act:ecuthing:' + k));
    tip('Behind the panel', "The ECU: the car's computer. Tap a thing to look at it.", 1, 8);
    hud();
  },
  actions() { return [{ label: 'Put the panel back', act: 'ecushut' }]; }
};
