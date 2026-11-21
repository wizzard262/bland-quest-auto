// Bland Quest Auto: every gearbox sensor you can try in the box's hole on the workbench, and the soldering game.
// Lots of them are wrong, each in its own way: square, octagonal, hexagonal, too fat (they touch the hole and won't go in),
// too thin (rattles), too long (sticks up), too short (sinks), or the two lug teeth in the wrong place.
// One from the Thee Bay job lot is the right shape but its wires are cut: solder the old sensor's plug onto it.
// Loaded after story.js and extras.js (it adds to ACTIONS and TALK).

// =====================================================================
// THE SENSORS
//   name:   what it's called (the bench's button says "Try the …")
//   no:     its part number, printed on a label (nearly the same as the right one's, never quite)
//   shape:  how it's drawn: round, hex, square, octagon, thin, fat, long, short, lugs (lug teeth in the wrong place), cut (wires cut off)
//   fit:    what happens when you push it: right, old, no (touches the hole, won't go in), thin, long, short, lugs, cut
//   col:    its colour (also on the car, once fitted)
//   says:   what you find when you push it
// =====================================================================
const SENSORS = {
  'old-sensor': { name: 'old sensor', no: '55-352-10?-ZF-TRS/0705-A', shape: 'round', fit: 'old', col: BLACKPART },
  'part-p4l': { name: 'Parts 4 Less sensor', no: 'GM-55352-107-ZF-TRS/0705-A', shape: 'round', fit: 'right', col: hex('#3c4c64') },
  'part-mega': { name: 'Zamanon sensor', no: 'UNV-55352-1O7-ZF-TRS/0705-A', shape: 'hex', fit: 'no', col: C.car,
    says: 'It\'s hexagonal. The hole is round. It\'s not going in.' },
  'lot-square': { name: 'square sensor (job lot)', no: 'GM-55352-107-ZF-TR5/0705-A', shape: 'square', fit: 'no', col: hex('#6a6a40'),
    says: 'It\'s square. The hole is round. Square peg, round hole: it\'s a saying for a reason.' },
  'lot-octagon': { name: 'octagonal sensor (job lot)', no: 'GM-55352-701-ZF-TRS/0705-A', shape: 'octagon', fit: 'no', col: hex('#7a4a3a'),
    says: 'Eight sides. The hole has none. It sits on the rim and goes no further.' },
  'lot-thin': { name: 'thin sensor (job lot)', no: 'GM-55352-107-ZF-TRS/0750-A', shape: 'thin', fit: 'thin', col: hex('#4a6a5a'),
    says: 'It drops straight in and rattles about like a pencil in a mug. Far too thin. You fish it back out.' },
  'lot-long': { name: 'long sensor (job lot)', no: 'GM-55352-107-ZF-TRS/0705-AA', shape: 'long', fit: 'long', col: hex('#5a5a6a'),
    says: 'It goes in… and bottoms out with a third of it still sticking up. The screw holes are nowhere near.' },
  'lot-cut': { name: 'job lot sensor with the cut wires', no: 'GM-55352-107-ZF-TRS/0705-A', shape: 'cut', fit: 'cut', col: hex('#3a4a5c') },
  'yard-sensor': { name: 'Scrap Yard sensor (1999 Zafira)', no: 'GM-90523-107-ZF-TRS/0705-A', shape: 'lugs', fit: 'lugs', col: hex('#4a4038'),
    says: 'Right size, right shape. It starts to go in… and stops. Its two lug teeth are in the wrong place. Rotate it all you like: they never line up.' },
  'csd-sensor': { name: 'Car Spares Direct sensor', no: 'GM-55352-107-2F-TRS/0705-A', shape: 'short', fit: 'short', col: hex('#6a3a5a'),
    says: 'It drops in and keeps going. It\'s down there somewhere. Far too short: the screws can\'t reach it. You tip the box up to get it back.' },
  'box-sensor': { name: 'old sensor from the parts box', no: 'GM-55532-107-ZF-TRS/0705-A', shape: 'fat', fit: 'no', col: hex('#5a5048'),
    says: 'Round, at least. Round and far too fat. It sits on the rim like a lid.' }
};
// The order they're offered on the bench
const SENSOR_ORDER = ['old-sensor', 'part-p4l', 'part-mega', 'lot-square', 'lot-octagon', 'lot-thin', 'lot-long', 'lot-cut', 'yard-sensor', 'csd-sensor', 'box-sensor'];
// How each one fits now (the cut one fits properly once the old plug's soldered on)
function sensorFit(id) {
  if (id === 'lot-cut' && S.flags.soldered) return 'right';
  return (SENSORS[id] || {}).fit;
}
// Its colour on the bench and, once fitted, on the car
const sensorColour = id => (SENSORS[id] || {}).col || C.greyDark;
// Its name, as the bench's button says it ("Try the …")
function sensorName(id) {
  if (id === 'lot-cut' && S.flags.soldered) return 'job lot sensor with the old plug';
  return SENSORS[id].name;
}

// =====================================================================
// DRAWING A SENSOR: its body, face, lug teeth, and its plug and wires (or the cut ends, or the soldered joints)
// =====================================================================
// How wide (half) and tall each shape is
function sensorSize(shape) {
  if (shape === 'thin') return { w: 7, h: 38 };
  if (shape === 'fat') return { w: 21, h: 38 };
  if (shape === 'long') return { w: 14, h: 56 };
  if (shape === 'short') return { w: 14, h: 22 };
  return { w: 14, h: 38 };
}
// The flat end of a sensor, seen from above at an angle: round, square (a diamond), octagonal or hexagonal
function sensorFace(shape, x, y, w, col) {
  if (shape === 'square') return poly([[x - w, y], [x, y - w / 2], [x + w, y], [x, y + w / 2]], col);
  if (shape === 'octagon' || shape === 'hex') {
    const sides = shape === 'octagon' ? 8 : 6;
    const pts = [];
    for (let k = 0; k < sides; k++) { const a = (k + 0.5) / sides * 6.283; pts.push([x + Math.cos(a) * w, y + Math.sin(a) * w / 2]); }
    return poly(pts, col);
  }
  ellipse(x, y, w, Math.round(w / 2), col);
}
// A sensor standing with its bottom at bot (screen), nudged sideways by dx
function drawSensor(id, rotated, bot, dx) {
  const s = SENSORS[id] || SENSORS['old-sensor'];
  const { w, h } = sensorSize(s.shape);
  const col = sensorColour(id);
  const x = bot[0] + dx;
  const topY = bot[1] - h;
  const faceShape = ['square', 'octagon', 'hex'].includes(s.shape) ? s.shape : 'round';
  sensorFace(faceShape, x, bot[1], w, shade(col, 0.7));              // its bottom
  rect(x - w, topY, w * 2 + 1, h, col);                               // its body
  rect(x - w + 4, topY + 2, 3, h - 2, shade(col, 1.6));               // a shine down its side
  if (faceShape !== 'round') {                                        // flat sides: a darker edge each side
    rect(x - w - 1, topY, 2, h, shade(col, 0.6));
    rect(x + w - 1, topY, 2, h, shade(col, 0.6));
  }
  sensorFace(faceShape, x, topY, w, col);                             // its face: a lighter ring and a dot, as under the car
  sensorFace(faceShape, x, topY, Math.max(3, w - 4), shade(col, 1.6));
  sensorFace(faceShape, x, topY, Math.max(2, w - 6), col);
  rect(x - 4, topY - 2, 3, 2, shade(col, 1.5));
  // the two lug teeth: either side (lined up when it's been rotated), or, on the 1999 one, in the wrong place
  if (s.shape === 'lugs') {
    rect(x - 9, topY + 6, 6, 3, C.tool);
    rect(x + 5, bot[1] - 6, 6, 3, C.tool);
  } else {
    const py = rotated ? bot[1] - 10 : bot[1] - Math.min(18, h - 4);
    rect(x - w - 6, py, 6, 3, C.tool);
    rect(x + w + 1, py, 6, 3, C.tool);
  }
  // its plug and wires; the job lot one has only cut-off wires (until the old plug's soldered on)
  if (s.shape === 'cut' && !S.flags.soldered) return cutWires(x + 10, topY + 4);
  sensorPlug(x + 10, topY + 4);
  if (s.shape === 'cut') for (let k = 0; k < 3; k++) disc(x + 26 + k * 2, topY + 4 + k * 3, 2, C.steel);   // the soldered joints
}
// Three short wires, snipped off: copper showing at the ends
function cutWires(x, y) {
  CUT_WIRES.forEach((col, k) => {
    const wy = y - 2 + k * 3;
    pipe(x, wy, x + 14, wy + 3, 2, col);
    rect(x + 14, wy + 2, 2, 2, hex('#d08040'));                        // bare copper
  });
}

// =====================================================================
// TRYING ONE IN THE HOLE: it comes down and touches the hole; then it goes in, or it doesn't, its own way
// =====================================================================
// How far down each kind gets before it stops (LIFT: over 56; 0 is the rim; the right one sits at LIFT.in, -8)
const TRY_STOP = { no: 2, thin: -14, long: -4, short: -26, lugs: 4, cut: LIFT.in };   // below 0: down inside the hole
let BENCH_TRY = null;                                                // the try playing now: { stop, rattle }
// Push the part in your hand into the hole (not the right one, not the old one: those are in story.js)
function tryWrongSensor(b) {
  const fit = sensorFit(b.part);
  const s = SENSORS[b.part];
  BENCH_TRY = { stop: TRY_STOP[fit], rattle: fit === 'thin' };
  moment('benchTry', 1300);
  sfx('thud', 0.45);
  if (fit === 'thin') { sfx('clink', 0.6); sfx('clink', 0.8); }        // rattling about
  closeLead('try-' + b.part, 'x');
  if (fit === 'cut') return cutSensorTried();
  anger(10);
  ANIM.then = () => {                                                  // no good: out of your hand and into the parts box
    S.inv[b.part] = false;
    S.bench = null;
    junkIt(b.part);
  };
  note('new-sensor', `${sensorName(b.part)} (${s.no}): ${({ no: 'won\'t go in', thin: 'too thin', long: 'too long', short: 'too short', lugs: 'lug teeth in the wrong place' })[fit]}`, 'x');
  say('Push', `Part no. ${s.no}.\n\n${s.says}\n\nIt goes in the parts box.`);
}
// The job lot one with the cut wires: it fits! And then you see the wires
function cutSensorTried() {
  S.flags.cutSeen = true;
  anger(5);
  note('new-sensor', 'The job lot sensor fits the hole… but its wires have been cut off. No plug', 'x');
  lead('new-sensor', 'solder', 'Solder the old sensor\'s plug onto it', 'you', 'hopeful', 'bench');
  say('Push', `Part no. ${SENSORS['lot-cut'].no}. The same as the right one!\n\nClick. It fits. It actually fits…\n\n…and then you see the wires. Cut off, an inch from the sensor. No plug. Nothing to connect it to the car.\n\nThe old sensor has a perfectly good plug, though.`);
}
// The moment: down to the hole, a jiggle (or a rattle), and back up
function benchTryDraw(p) {
  const b = S.bench;
  if (!b || !BENCH_TRY) return;
  const { stop, rattle } = BENCH_TRY;
  let lift = LIFT.over, dx = 0;
  if (p < 0.4) lift = lerp(LIFT.over, stop, ease(p / 0.4));           // down to the hole…
  else if (p < 0.7) {                                                 // …it stops: a bump, or a rattle about
    lift = stop + (rattle ? 0 : Math.abs(Math.sin((p - 0.4) * 30)) * 3);
    dx = rattle ? Math.round(Math.sin(p * 120) * 4) : 0;
  } else lift = lerp(stop, LIFT.over, ease((p - 0.7) / 0.3));         // …and back out
  benchPart(b, lift, dx);
}

// A sensor's part number on a little label by the part on the bench
function sensorLabel(id) {
  const [x, y] = P(100, 95, 40 + LIFT.over);                         // the bottom of the part, held over the hole
  LABELS.push(`<div class="partno" style="left:${(x + 50) / W * 100}%;top:${(y - 30) / H * 100}%">Part no. ${esc(SENSORS[id].no)}</div>`);
}
// The buttons on the bench: try each sensor you've got
function benchSensorButtons() {
  return SENSOR_ORDER.filter(id => S.inv[id]).map(id => ({ label: 'Try the ' + sensorName(id), act: 'pick:' + id }));
}

// =====================================================================
// WHERE THE WRONG ONES COME FROM
//   Thee Bay: a job lot of 300 sensors (five look about right, one of them with its wires cut)
//   the Scrap Yard: the 1999 Zafira still has its sensor (lugs wrong)
//   Car Spares Direct: "we can order it in" (too short)
//   the parts box: an old sensor, not yours (too fat)
// =====================================================================
const JOB_LOT = ['lot-square', 'lot-octagon', 'lot-thin', 'lot-long', 'lot-cut'];
// The job lot's parcel
function openJobLot() {
  for (const id of JOB_LOT) S.inv[id] = true;
  closeLead('ebuy-lot', 'ok');
  lead('new-sensor', 'try-lot', 'Try the job lot sensors on the bench', 'you', 'hopeful', 'bench');
  say('A parcel', 'A box of about 300 sensors. Most of them are off washing machines. Five look about right.\n\nTry them on the bench.');
}
// The 1999 Zafira at the Scrap Yard: its sensor is still in
function yardSensorOffer(text) {
  if (!findJob('new-sensor') || S.inv['yard-sensor'] || S.flags.fits) return false;
  say('A wreck', text + '\n\nIts sensor is still in, though.', [
    { label: 'Take its sensor (£5 to the man)', run() {
      if (!spend(5)) return say('The yard', '"Cash only, mate." You haven\'t got it.');
      S.inv['yard-sensor'] = true; sfx('ratchet');
      lead('new-sensor', 'try-yard-sensor', 'Try the Scrap Yard sensor on the bench', 'you', 'maybe', 'bench');
      say('The sensor', 'Twenty minutes on your back in the mud and it\'s yours.');
    } },
    { label: 'Leave it', run() {} }
  ]);
  return true;
}
// Car Spares Direct: "we can order it in"; ready the day after tomorrow
function csdSensor() {
  if (!findJob('new-sensor') || S.flags.fits || S.inv['csd-sensor']) return false;
  const shop = 'Car Spares Direct';
  if (!S.flags.csdReady) {
    say(shop, '"A gearbox sensor? We can order it in. Day after tomorrow. Twenty-two quid."', [
      { label: 'Order it (£22)', run() {
        if (!spend(22)) return say(shop, DECLINED);
        S.flags.csdReady = S.day + 2;
        closeLead('csd', 'ok');
        lead('new-sensor', 'csd-collect', 'Collect the sensor from Car Spares Direct (the day after tomorrow)', shop, 'sure', 'place:' + shop);
        say(shop, '"Day after tomorrow, then."');
      } },
      { label: 'Not now', run() {} }
    ]);
    return true;
  }
  if (S.day < S.flags.csdReady) { anger(5); say(shop, '"Day after tomorrow, I said. That\'s not today."'); return true; }
  S.inv['csd-sensor'] = true;
  closeLead('csd-collect', 'ok');
  lead('new-sensor', 'try-csd-sensor', 'Try the Car Spares Direct sensor on the bench', 'you', 'hopeful', 'bench');
  say(shop, '"Here you go. Says Zafira on the box." It says Zafira on the box.');
  return true;
}
// The old sensor in the parts box (not yours): take it
function takeBoxSensor(j) {
  if (!findJob('new-sensor') || S.inv['box-sensor'] || S.flags.fits) return false;
  S.inv['box-sensor'] = true;
  PILE.splice(PILE.indexOf(j), 1);
  sfx('pop');
  lead('new-sensor', 'try-box-sensor', 'Try the old sensor from the parts box', 'you', 'vague', 'bench');
  say('An old sensor (not yours)', 'An old sensor. Not yours. Probably. Worth a try?');
  return true;
}

// =====================================================================
// THE SOLDERING GAME: join the sensor's three cut wires to the old plug's three, in the right order; then the iron
//   The first time you look: the colours don't match (brown, blue, white against red, yellow, green). Find out on TechDocs
//   You need a soldering iron (the Tool Shop) and solder (the old reel runs out after one joint; the Hardware Shop)
// =====================================================================
const CUT_WIRES = [hex('#7a4a24'), hex('#3060c0'), hex('#e8e8e0')];    // the sensor's: brown, blue, white
const CUT_NAMES = ['brown', 'blue', 'white'];
const PLUG_NAMES = ['red', 'yellow', 'green'];                          // the old plug's (SENSOR_WIRES): red, yellow, green
const WIRE_MAP = [0, 2, 1];                                            // the right joins: brown→red, blue→green, white→yellow
const SOLDER_L = 170, SOLDER_R = 310, SOLDER_Y = [90, 135, 180];       // where the wire ends are: left (the sensor's), right (the plug's)
// The soldering state: which left wire is picked, what's joined to what, and how many joints are soldered
function solderState() {
  S.solder = S.solder || { pick: null, pairs: [null, null, null], joints: 0 };
  return S.solder;
}
// Where the joint between left wire k and right wire j is: each left wire's joint a little further across, so crossed ones never meet
const jointAt = (k, j) => [SOLDER_L + 40 + k * 30, (SOLDER_Y[k] + SOLDER_Y[j]) / 2];
SCREENS.solder = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, H, C.benchTop, 0.12, 61);                          // the workbench top
    const st = solderState();
    // the sensor on the left, its three cut wires; the old plug on the right, its three wires
    rbox(30, 100, 60, 70, 8, sensorColour('lot-cut'));
    ellipse(60, 100, 30, 10, shade(sensorColour('lot-cut'), 1.4));
    CUT_WIRES.forEach((col, k) => {
      pipe(88, 120 + k * 12, SOLDER_L, SOLDER_Y[k], 4, col);
      rect(SOLDER_L - 2, SOLDER_Y[k] - 2, 6, 4, hex('#d08040'));       // bare copper
      if (st.pick === k) ring(SOLDER_L, SOLDER_Y[k], 9, C.warm);        // picked: ready to join
    });
    rbox(400, 112, 50, 46, 6, hex('#30302c'));                         // the old plug
    rect(410, 104, 30, 8, C.warm);                                     // its tab
    SENSOR_WIRES.forEach((col, j) => {
      pipe(402, 124 + j * 10, SOLDER_R, SOLDER_Y[j], 4, col);
      rect(SOLDER_R - 4, SOLDER_Y[j] - 2, 6, 4, hex('#d08040'));
    });
    // the joins made so far: a twist of the two wires in the middle, and a blob of solder once it's soldered
    st.pairs.forEach((j, k) => {
      if (j === null) return;
      const [mx, my] = jointAt(k, j);
      pipe(SOLDER_L, SOLDER_Y[k], mx, my, 3, CUT_WIRES[k]);
      pipe(mx, my, SOLDER_R, SOLDER_Y[j], 3, SENSOR_WIRES[j]);
      for (let t = -6; t <= 6; t += 3) px(mx + t, my + (t % 2 ? -1 : 1), hex('#d08040'));   // the twist
    });
    const animating = ANIM && ANIM.kind === 'solder';                 // the iron is going: its joints get their blobs as it goes
    solderBlobs(animating ? SOLDER_FROM : st.joints);
    // what you can tap: each wire end (only once you know which goes where)
    if (S.flags.wireColours && st.joints < 3) {
      CUT_NAMES.forEach((name, k) => spot('The ' + name + ' wire', [SOLDER_L - 10, SOLDER_Y[k] - 10, 20, 20], 'act:wirepick:' + k));
      PLUG_NAMES.forEach((name, j) => spot('The plug\'s ' + name + ' wire', [SOLDER_R - 12, SOLDER_Y[j] - 10, 20, 20], 'act:wirejoin:' + j));
    }
    tip('Soldering', solderTip(st), 1, 8);
    hud();
  },
  actions() {
    const st = solderState(), a = [];
    const allJoined = st.pairs.every(j => j !== null);
    if (allJoined && st.joints < 3) a.push({ label: 'Solder the joints', act: 'soldernow' });
    return a;
  }
};
// The blobs of solder on the first n joints (in the order they were joined, top first)
function solderBlobs(n) {
  const st = solderState();
  st.pairs.forEach((j, k) => {
    if (j === null || k >= n) return;
    const [mx, my] = jointAt(k, j);
    disc(mx, my, 6, C.steel); disc(mx - 2, my - 2, 2, C.light);      // a shiny blob
  });
}
function solderTip(st) {
  if (!S.flags.wireColours) return 'Brown, blue and white on the sensor. Red, yellow and green on the plug. Which goes where?';
  if (ANIM && ANIM.kind === 'solder') return 'Soldering…';
  if (st.joints >= 3) return 'Soldered. Three shiny blobs.';
  if (st.pairs.every(j => j !== null)) return 'All three twisted together. Solder them.';
  return 'Tap a wire on the left, then the one it joins on the right. Tap a joined one to undo it.';
}
// The moment: the iron comes in to each joint in turn, smoke curls up, and it seals with a blob
let SOLDER_FROM = 0;                                                 // the joint this moment starts at
function solderDraw(p) {
  const st = solderState();
  const todo = st.joints - SOLDER_FROM;                              // how many joints this moment solders
  if (todo <= 0) return;
  const step = Math.min(todo - 1, Math.floor(p * todo));              // which of them is being done now
  const k = SOLDER_FROM + step;
  const q = p * todo - step;                                         // how far through this joint, 0 to 1
  solderBlobs(k);                                                    // the ones finished so far
  const [mx, my] = jointAt(k, st.pairs[k]);
  const reach = ease(Math.min(1, q / 0.3));                          // the iron comes in from the top right
  const tipX = lerp(470, mx + 4, reach), tipY = lerp(10, my - 4, reach);
  pipe(tipX, tipY, tipX + 50, tipY - 40, 4, C.steel2);               // its shaft
  pipe(tipX + 40, tipY - 32, tipX + 90, tipY - 72, 10, C.red);       // its handle
  if (q > 0.3) {                                                     // smoke curling up off the joint
    for (let n = 0; n < 10; n++) {
      const r = ((q - 0.3) * 3 + n / 10) % 1;                          // each puff, part way up
      const size = 2 + Math.round(r * 3);                               // growing as it rises
      rect(mx + Math.sin(r * 9 + n) * (4 + r * 8), my - 6 - r * 50, size, size, shade(C.white, 0.9 - r * 0.3));
    }
  }
  if (q > 0.6) disc(mx, my, Math.round((q - 0.6) * 15), C.steel);   // the blob forms
}

Object.assign(ACTIONS, {
  // from the bench: to the soldering (cut the old sensor's plug off first)
  soldergo() {
    if (!S.flags.cutSeen) return;
    if (!S.flags.plugCut) {
      S.flags.plugCut = true;
      S.inv['old-sensor'] = false;                                    // the old sensor, without its plug, is no good now
      junkIt('old-sensor');
      sfx('snap');
      note('new-sensor', 'Cut the plug off the old sensor (there\'s no going back now)', 'info');
    }
    show('solder');
    if (!S.flags.wireColours && !S.flags.colourMismatch) {         // the first look: the colours don't match
      S.flags.colourMismatch = true;
      anger(5);
      lead('new-sensor', 'wire-colours', 'Find out which wire goes where (the wiring diagram on TechDocs)', 'you', 'sure', 'app:TechDocs');
      say('The wires', 'The sensor\'s wires are brown, blue and white. The old plug\'s are red, yellow and green.\n\nWhich goes where? Get it wrong and who knows what it\'ll do. You\'ll have to find out first.');
    }
  },
  // the wire colours, off TechDocs
  wirenote() {
    if (S.flags.wireColours) return;
    pass(10);
    S.flags.wireColours = true;
    closeLead('wire-colours', 'ok', 'Wiring: brown to red, blue to green, white to yellow');
    say('The wiring diagram', 'Brown to red. Blue to green. White to yellow. Of course.\n\nYou write it on your hand.');
  },
  // tap a wire on the left (or a joined one, to undo it)
  wirepick(k) {
    const st = solderState(), i = +k;
    if (st.joints > 0) return say('Soldering', 'That one\'s soldered now.');
    if (st.pairs[i] !== null) { st.pairs[i] = null; sfx('click'); return; }   // undo a join
    st.pick = i;
    sfx('click');
  },
  // then a wire on the right: twist the two together
  wirejoin(j) {
    const st = solderState(), i = +j;
    if (st.pick === null) return say('Soldering', 'Pick one of the sensor\'s wires on the left first.');
    st.pairs = st.pairs.map(x => (x === i ? null : x));              // a wire joins only one other
    st.pairs[st.pick] = i;
    st.pick = null;
    sfx('clink');
  },
  // solder: check the order against your hand first; then the iron, and the solder
  soldernow() {
    const st = solderState();
    const wrong = st.pairs.map((j, k) => j !== WIRE_MAP[k]);
    if (wrong.some(Boolean)) {
      st.pairs = st.pairs.map((j, k) => (wrong[k] ? null : j));
      anger(5);
      return say('Hang on', 'You check against what\'s written on your hand. Some are crossed. You untwist those.');
    }
    if (!S.inv.iron) {
      lead('new-sensor', 'iron', 'A soldering iron: the Tool Shop', 'you', 'sure', 'place:Tool Shop');
      return say('Soldering', 'Everything is twisted together, ready. And there\'s no soldering iron. The toolbox has everything else.');
    }
    SOLDER_FROM = st.joints;
    if (!S.inv.solder) {                                              // the old reel in the drawer: enough for one joint
      if (st.joints >= 1) return say('Soldering', 'Out of solder. The Hardware Shop will have some.');
      st.joints = 1;
      lead('new-sensor', 'solder-reel', 'More solder: the Hardware Shop', 'you', 'sure', 'place:Hardware Shop');
      moment('solder', 1500);
      sfx('pour');
      return say('Soldering', 'The iron hisses. Smoke. A lovely shiny blob on the first joint…\n\n…and the reel of solder from the drawer runs out. That\'s all there was.');
    }
    st.joints = 3;
    moment('solder', 1500 * (3 - SOLDER_FROM));
    sfx('pour');
    S.flags.soldered = true;
    closeLead('solder', 'ok', 'The old plug soldered onto the job lot sensor');
    closeLead('iron', 'ok'); closeLead('solder-reel', 'ok');
    lead('new-sensor', 'try-soldered', 'Try the soldered sensor in the box', 'you', 'hopeful', 'bench');
    say('Soldering', 'Hiss. Smoke. Blob. Hiss. Smoke. Blob. Three shiny joints, wrapped in tape.\n\nThe job lot sensor has a plug again. Try it in the box.');
  }
});
MOMENTS.solder = solderDraw;
MOMENTS.benchTry = benchTryDraw;
// The iron and the solder, from the shops
ITEMS.iron = { name: 'Soldering iron', price: 12.99 };
ITEMS.solder = { name: 'Reel of solder', price: 3.99 };
PLACE_INFO['Tool Shop'].shop.push('iron');
PLACE_INFO['Hardware Shop'].shop.push('solder');
ITEMS['sensor-lot'] = { name: 'Job lot of car sensors (approx 300) no idea what from', price: 45 };
