// Bland Quest Auto: road snags.
// Now and then on the way home from town (once a game): BANG, a puncture on Mill Lane.
//   The spare in the boot is flat. You ring for help: the phone dies. You walk home: it rains, the sky
//   goes grey, and a car drives through a puddle and soaks you. At home the wife says get a wheel from the
//   Scrap Yard or a car shop (the Tyre Place), and lends you her car. You fit the wheel at the roadside.
//   S.road is set while your car is stuck on Mill Lane: { spare: tried it, walked: home on foot }

let PUNCTURE_CHANCE = window.NO_PUNCTURES ? 0 : 1 / 6;             // the chance on each drive home (the tests turn it off, or up to 1)
const ROADSIDE = 'Mill Lane';                                       // where it happens
const WIFE_CAR = hex('#9a5ac8');                                    // her little purple car, lent to you
const ROAD_VIEW = [250, 70];                                        // the roadside: the same street view as a shop front
// The screens that need your car to be at home (in the garage)
const CAR_SCREENS = ['dash', 'bonnet', 'fuseZoom', 'boot', 'under', 'underZoom', 'port', 'ecu', 'glovebox'];

// Is your car stuck at the roadside?
const carStranded = () => !!S.road;
// Driving her car about (you've walked home and she's lent you hers)
const inWifesCar = () => !!S.road && !!S.road.walked;

// =====================================================================
// THE PUNCTURE: on the way home from town, now and then
// =====================================================================
// Driving home from town: maybe a puncture. Returns true if it happened (it takes over from going home)
function punctureOnTheWayHome() {
  if (S.flags.punctured) return false;                              // once a game
  if (S.screen !== 'city' && S.screen !== 'place') return false;    // only driving home from town
  if (S.mins < 8 * 60 || S.mins >= 17 * 60) return false;           // by day, so she's up when you get home
  const opening = findJob('pickup');
  if (!opening || opening.status !== 'done') return false;          // not in the opening (driving home from the MOT)
  if (isDrunk()) return false;                                      // the police get you first
  if (Math.random() >= PUNCTURE_CHANCE) return false;
  puncture();
  return true;
}
// BANG: pulled over on Mill Lane, with a flat tyre
function puncture() {
  S.flags.punctured = true;
  S.road = { spare: false, walked: false };
  pass(10);
  job('tyre', 'Sort out the flat tyre', null);
  sfx('pop');
  sfx('thud', 0.1);
  show('roadside');
  say('BANG!', `Bang. Then flap-flap-flap-flap-flap.\n\nA puncture. You pull over on ${ROADSIDE}, halfway home.`);
}

// =====================================================================
// THE ROADSIDE: your car at the kerb, a flat front tyre, its hazards flashing
// =====================================================================
// Where the car stands: along the kerb, like outside a shop
const ROAD_CAR = [40, 72];
SCREENS.roadside = {
  size: [480, 270],
  paint() {
    ISO.ox = ROAD_VIEW[0]; ISO.oy = ROAD_VIEW[1];
    streetFront();                                                  // the verge, the road, the kerb, the pavement
    // a long brick wall behind the pavement, and a field gate in it
    ibox(-200, 30, 400, 40, 0, 20, C.brick, C.brickLine);
    bricks(-200, 30, 400, 40, 20, C.brickLine);
    ibox(150, 30, 190, 40, 0, 18, C.wood);
    // the lane's name on a sign
    ibox(-40, 44, -37, 47, 0, 34, C.greyDark);
    onLeft(47, -60, -16, 26, 36, C.white);
    { const t = P(-58, 47, 34); text('MILL LANE', t[0] + 1, t[1] + 2, C.ink); }
    // your car (or, once you've walked home, still here; you come back in hers)
    isoCar(ROAD_CAR[0], ROAD_CAR[1], 1, C.car, { alongX: true, flatFront: true });
    if (inWifesCar()) isoCar(-60, 72, 1, WIFE_CAR, { alongX: true, shape: 'city' });   // hers, parked behind
    if (S.road && S.road.spare) roadsideSpare();                    // the flat spare on the verge
    const m = P(96, 56);
    man(m[0], m[1], 'stand', 2);                                    // you, on the pavement
    // what you can tap
    if (S.road) {
      spot('Boot: open it', isoArea(ROAD_CAR[0] - 4, 72, ROAD_CAR[0] + 8, 96, 4, 20), 'act:roadboot', [ROAD_CAR[0] - 6, 66]);
      spot('The flat tyre', isoArea(ROAD_CAR[0] + 30, 92, ROAD_CAR[0] + 42, 98, 0, 10), 'act:roadtyre', [ROAD_CAR[0] + 36, 100]);
    }
    tip(ROADSIDE, roadsideTip(), 1, 8);
    hud();
  },
  actions() {
    const a = [];
    if (!S.road) return [{ label: 'Drive home', act: 'roadhome' }];
    if (S.inv.wheel) a.push({ label: 'Fit the wheel', act: 'fitwheel' });
    if (!S.road.walked) {
      if (!S.road.spare) a.push({ label: 'Open the boot', act: 'roadboot' });
      else if (!S.flags.phoneDead) a.push({ label: 'Ring for help', act: 'roadring' });
      else a.push({ label: 'Walk home', act: 'walkhome' });
    } else a.push({ label: "Drive home (in her car)", act: 'roadhome' });
    return a;
  }
};
// What the note at the top says, step by step
function roadsideTip() {
  if (!S.road) return 'Your car, with four good tyres. For now.';
  if (S.inv.wheel) return 'You\'ve got a wheel. Fit it.';
  if (S.road.walked) return 'Your car, still on a flat. Get a wheel from the Scrap Yard or a car shop.';
  if (!S.road.spare) return 'A flat front tyre. There\'s a spare in the boot: open it.';
  if (!S.flags.phoneDead) return 'The spare\'s flat too. Ring for help?';
  return 'No spare, no phone. It\'s a long walk home.';
}
// The spare lying flat on the verge, beside the car
function roadsideSpare() {
  const w = P(124, 50);                                            // on the pavement, past the car
  ellipse(w[0], w[1], 12, 6, C.tyre);
  ellipse(w[0], w[1] - 1, 6, 3, C.rim);
  spareScrew(w[0] + 9, w[1] + 2, 1);                                // the screw in it
}
// A screw head stuck in a tyre: a steel disc with a slot across it (s: how big)
function spareScrew(x, y, s) {
  disc(x, y, 1 + s, C.steel);
  rect(x - s, y, 2 * s + 1, 1, C.ink);
}
// The car's hazard lights: all four corners flash orange (twice a second)
SCREENS.roadside.animate = function (t) {
  if (!S.road) return;
  if (Math.floor(t * 2) % 2) return;                                // off half the time
  ISO.ox = ROAD_VIEW[0]; ISO.oy = ROAD_VIEW[1];
  const [x, y] = ROAD_CAR;
  for (const [dx, dy] of [[0, 1], [0, 23], [45, 1], [45, 23]]) {
    const q = P(x + dx, y + dy, 9);
    rect(q[0] - 1, q[1] - 1, 3, 2, hex('#ffa020'));
  }
};

// =====================================================================
// THE WALK HOME: grey sky, rain, and a car through a puddle
// =====================================================================
const WALK = { ground: 214, puddle: [250, 234], from: 20, to: 470, size: 4 };
// The street side-on: a terrace of houses, the pavement, the kerb and the road (the walk home; being pulled over)
//   dim: how dark it is (1 = day; lower at night)
function sideStreet(dim) {
  for (let y = 0; y < 150; y++) rect(0, y, W, 1, shade(hex('#7a8088'), (0.8 + y / 600) * dim));   // the sky, lighter low down
  for (let k = 0; k < 6; k++) disc(40 + k * 90, 30 + (k % 2) * 14, 40, shade(hex('#6a7078'), dim));   // heavy clouds
  for (let k = 0; k < 8; k++) {                                     // the terrace of houses over the road
    const x = k * 64 - 10;
    rect(x, 96, 62, 104, shade(C.brick, 0.75 * dim));
    rect(x, 90, 62, 8, shade(C.roof, 0.8 * dim));
    const lit = dim < 0.8 && hash(k, 3) > 0.5;                      // at night, some windows are lit
    rect(x + 8, 110, 14, 14, lit ? hex('#e8c870') : shade(C.winGlass, 0.6 * dim));
    rect(x + 40, 110, 14, 14, shade(C.winGlass, 0.6 * dim));
    rect(x + 26, 150, 12, 50, shade(C.door, 0.6 * dim));
  }
  rect(0, 200, W, 18, shade(C.drive, 0.75 * dim));                  // the pavement
  rect(0, 218, W, 2, shade(C.steel2, dim));                         // the kerb
  rect(0, 220, W, 50, shade(C.road, 0.8 * dim));                    // the road
}
SCREENS.walkhome = {
  size: [480, 270],
  paint() {
    sideStreet(1);                                                  // the street, in the grey daylight
    const [px0, py0] = WALK.puddle;
    ellipse(px0, py0, 34, 6, hex('#4a5a68'));                       // the puddle by the kerb
    ellipse(px0 - 6, py0 - 1, 18, 2, hex('#6a7a88'));
    tip('The walk home', 'It starts to rain.', 1, 8);
    hud();
  },
  animate(t) {
    for (let k = 0; k < 140; k++) {                                 // the rain, slanting down
      const x = (hash(k, 1) * W + t * 40) % W;
      const y = (hash(1, k) * H + t * 300 + k * 7) % H;
      line(x, y, x - 2, y + 6, hex('#b8c4d0'));
    }
  }
};
// A car seen side-on, driving right (for the walk home, and being pulled over)
//   s: how big (2 is to scale with him on the walk home: a car's about two and a half of him long)
//   opts.estate: our Zafira's long roof, right to the back; opts.police: a police car (white, a yellow and blue check
//   down the side, a light bar on the roof); opts.flash: which of its blue lights is lit
function sideCar(x, y, col, s = 1, opts = {}) {
  const X = v => x + v * s, Y = v => y - v * s;                     // the car's own units, scaled from its back wheel's road line
  rbox(X(0), Y(20), 96 * s, 16 * s, 5 * s, col);                    // the body
  if (opts.estate) {                                                // the estate: the roof runs back, the tailgate slopes a little
    poly([[X(2), Y(20)], [X(6), Y(36)], [X(66), Y(36)], [X(78), Y(20)]], col);
    poly([[X(7), Y(21)], [X(9), Y(33)], [X(30), Y(33)], [X(30), Y(21)]], C.glass);   // the back side window
    poly([[X(33), Y(21)], [X(33), Y(33)], [X(49), Y(33)], [X(49), Y(21)]], C.glass);
    poly([[X(52), Y(21)], [X(52), Y(33)], [X(65), Y(33)], [X(73), Y(21)]], C.glass);
  } else {                                                          // a saloon
    poly([[X(22), Y(20)], [X(34), Y(34)], [X(66), Y(34)], [X(78), Y(20)]], col);   // the cabin
    poly([[X(27), Y(21)], [X(36), Y(31)], [X(49), Y(31)], [X(49), Y(21)]], C.glass);
    poly([[X(52), Y(21)], [X(52), Y(31)], [X(64), Y(31)], [X(73), Y(21)]], C.glass);
  }
  const police = opts.police ? { flash: opts.flash } : null;
  if (police) {
    for (let k = 0; k < 12; k++) rect(X(2 + k * 7.6), Y(14), 7.6 * s, 5 * s, k % 2 ? hex('#f0d020') : hex('#2050d0'));   // the check down the side
    rect(X(40), Y(37), 20 * s, 3 * s, C.ink);                       // the light bar
    rect(X(41), Y(37), 8 * s, 3 * s, police.flash ? hex('#4080ff') : hex('#203060'));   // blue, flashing
    rect(X(51), Y(37), 8 * s, 3 * s, police.flash ? hex('#203060') : hex('#4080ff'));
    if (police.flash) disc(X(45), Y(36), 10 * s, hex('#2848a0'));   // its glow
  }
  for (const wx of [20, 76]) { disc(X(wx), Y(3), 8 * s, C.tyre); disc(X(wx), Y(3), 4 * s, C.rim); }
  rect(X(92), Y(16), 4 * s, 4 * s, C.warm);                         // its headlight
  rect(X(0), Y(16), 2 * s, 4 * s, C.red);                           // its tail light
}
// =====================================================================
// PULLED OVER: driving off after a drink, the police car comes up behind you, blue lights, and you pull in
// =====================================================================
const PULLOVER_MS = 5000;
SCREENS.pullover = {
  size: [480, 270],
  paint() {
    sideStreet(0.45);                                               // the street, at night
    for (let k = 0; k < 4; k++) {                                   // street lamps along the pavement
      const x = 40 + k * 130;
      rect(x, 120, 3, 82, C.greyDark);
      rect(x - 4, 116, 12, 4, C.greyDark);
      disc(x + 2, 121, 6, hex('#5a5030'));
      rect(x - 1, 120, 6, 2, hex('#f0d080'));
    }
    tip('Driving home', 'Blue lights in the mirror.', 1, 8);
    hud();
  }
};
MOMENTS.pullover = function (p) {
  const yours = lerp(-120, 240, ease(Math.min(1, p / 0.8)));         // your Zafira: along the road, slowing, pulling in
  const theirs = lerp(-420, 16, ease(Math.min(1, p / 0.85)));        // the police car, catching up and pulling in behind
  const inY = 262 - Math.round(Math.max(0, p - 0.45) / 0.55 * 10);  // both drift in towards the kerb
  const flash = Math.floor(p * PULLOVER_MS / 180) % 2 === 0;         // the blue lights
  sideCar(theirs, inY, C.white, 2, { police: true, flash });
  sideCar(yours, inY, C.car, 2, { estate: true });
  if (flash) for (let x = 0; x < W; x += 6) rect(x, 219, 3, 1, hex('#4060c0'));   // blue on the wet road
};


// The moment: he walks home in the rain; halfway, a car hits the puddle and soaks him
const SOAKED = { shirt: hex('#8a3028'), shirtDark: hex('#6a2018'), jeans: hex('#283a68'), jeansDark: hex('#1c2a50'), hair: hex('#402810') };
const WALK_MS = 7000;                                                  // the whole walk home
const WALK_SPLASH = 0.6;                                               // how far through it: the water has hit him (it lands at 0.5)
const WALK_AFTER_MS = 7500;                                            // after the splash: a shrug, then on at half pace
const WALK_SHRUG = 0.12, WALK_SINK = 0.22;                             // how far through the rest of it: the shrug ends; the sinking ends
let WALK_PART = [0, 1];                                                // the part of the walk this moment plays
MOMENTS.walkhome = function (part) {
  const after = WALK_PART[0] >= WALK_SPLASH;                           // the rest of the walk, after the splash
  const p = after ? WALK_SPLASH + part * WALK_AFTER_MS / WALK_MS : lerp(WALK_PART[0], WALK_PART[1], part);   // the time so far, as a share of the plain walk (the car and the splash go by it)
  const hit = 0.5;                                                  // when the car hits the puddle
  const wet = p > hit;
  const look = wet ? SOAKED : null;
  let x = lerp(WALK.from, WALK.to, Math.min(p, WALK_SPLASH));        // him, along the pavement (stopped where the splash got him)
  if (!after) man(x, WALK.ground, 'walk', WALK.size, p * 90, look);
  else if (part < WALK_SHRUG) man(x, WALK.ground, 'shrug', WALK.size, 0, look);   // a shrug: what else can you do
  else if (part < WALK_SINK) man(x, WALK.ground, 'trudge', WALK.size, 0, look);   // he sinks
  else {                                                            // and trudges on home, head down, at half his pace
    const q = (part - WALK_SINK) / (1 - WALK_SINK);
    x = lerp(x, WALK.to, q);
    man(x, WALK.ground, 'trudge', WALK.size, part * 45, look);
  }
  if (wet) for (let k = 0; k < 6; k++) rect(x + 4 + k * 3, WALK.ground + ((p * 400 + k * 13) % 14), 1, 2, hex('#b8c4d0'));   // dripping
  // the car: in from the left, through the puddle, off to the right
  const carX = lerp(-360, 556, (p - 0.35) / 0.3);                    // its front wheel (152 along it) reaches the puddle at 0.5, as the water goes up
  if (p > 0.35 && p < 0.65) sideCar(carX, 262, hex('#c8c8c0'), 2);   // a full-size car, to scale with him
  // the splash: a wall of water over him
  if (p > hit && p < hit + 0.12) {
    const q = (p - hit) / 0.12;
    for (let k = 0; k < 90; k++) {
      const a = -0.3 - hash(k, 7) * 2.4, r = Math.sin(q * 3.1) * (50 + hash(7, k) * 90);
      rect(WALK.puddle[0] + Math.cos(a) * r, WALK.puddle[1] - 4 + Math.sin(a) * r * 1.3, 3, 3, k % 3 ? hex('#a8c0d8') : C.white);
    }
  }
};

// =====================================================================
// GETTING YOUR CAR BACK: a wheel from the Scrap Yard or the Tyre Place, fitted at the roadside
// =====================================================================
// Do you still need a wheel? (home, and not got one yet)
const wheelWanted = () => inWifesCar() && !S.inv.wheel;
// Buy a wheel at a place: the Scrap Yard's cheap and on a wreck; the Tyre Place's part-worn
function buyWheel(place) {
  const yard = place === 'Scrap Yard';
  const price = yard ? 10 : 35;
  if (!spend(price)) { anger(10); return say(place, 'Card declined.'); }
  S.inv.wheel = place;
  sfx('beep');
  closeLead(yard ? 'wheel-yard' : 'wheel-shop', 'ok', `A wheel from the ${place}: £${price}`);
  closeLead(yard ? 'wheel-shop' : 'wheel-yard', 'skip');
  lead('tyre', 'fitwheel', `Fit the wheel on ${ROADSIDE}`, 'you', 'sure', 'act:toroad');
  if (yard) return say(place, '"A Zafira wheel? Off that one there. The tyre\'s legal. Just. Tenner."\n\nYou roll it to her car.');
  say(place, '"A part-worn on a steel wheel. Thirty-five quid. Fitted? We only fit here, mate. Bring the car in."\n\nThe car is on a flat on Mill Lane.');
}

// =====================================================================
// WHAT YOU DO
// =====================================================================
Object.assign(ACTIONS, {
  // the boot: the spare. It's flat
  roadspare() {
    if (!S.road || S.road.walked) return;
    if (S.road.spare) return say('The spare', 'Still flat.');
    S.road.spare = true;
    S.spare = 'flat';                                                   // punctured: a screw in it
    pass(20);
    anger(15);
    sfx('ratchet');
    note('tyre', 'The spare is flat too (probably since 2019)', 'x');
    say('The spare wheel', 'You empty the boot onto the verge, undo the spare and heave it out.\n\nIt\'s flat. Completely flat. There\'s a screw in it. It has probably been flat since 2019.');
  },
  roadboot() { sfx('click'); show('boot'); },                          // open the boot: the spare, the jack, the brace
  roadtyre() { say('The flat tyre', 'Front left. Flat as a pancake, with a screw in it. Of course there\'s a screw in it.'); },
  // ring for help: the phone dies
  roadring() {
    if (S.flags.phoneDead) return say('Your phone', 'Still dead.');
    S.flags.phoneDead = true;
    anger(10);
    note('tyre', 'Phone dead', 'x');
    say('Your phone', 'You get your phone out to ring for help. 1%.\n\nYou tap the first name. The screen goes black.');
  },
  // walk home: the rain, the puddle; then home, soaked
  walkhome() {
    show('walkhome');
    sfx('carpass', 3.2);
    WALK_PART = [0, WALK_SPLASH];                                      // up to the splash…
    moment('walkhome', WALK_MS * WALK_SPLASH);
    ANIM.then = () => flashStill('splash', () => {                      // …the splash, big, as it hits him…
      WALK_PART = [WALK_SPLASH, 1];                                    // …then on home, dripping
      moment('walkhome', WALK_AFTER_MS);                              // (a shrug, then slower)
      ANIM.then = homeSoaked;
    });
  },
  // back to the car (her car, with the wheel)
  toroad() {
    if (!S.road) return;
    pass(15);
    sfx('car');
    show('roadside');
  },
  roadhome() { pass(15); sfx('car'); show('home'); },
  // fit the wheel: your car's back on four good tyres
  fitwheel() {
    if (!S.road || !S.inv.wheel) return;
    const from = S.inv.wheel;
    pass(30);
    anger(5);
    sfx('ratchet');
    delete S.inv.wheel;
    S.road = null;
    finishJob('tyre', `Wheel from the ${from} fitted on ${ROADSIDE}. The spare is still flat`);
    spareJob();                                                         // next: the spare, with its screw
    show('home');
    say('The new wheel', 'Jack up. The short brace, a lot of swearing, and the nuts come off. Flat one off, new one on.\n\nYou drive your car home. She walks down for hers. She is not happy.\n\n(The spare is still flat, with a screw in it. It needs replacing.)');
  }
});

// =====================================================================
// THE FLAT SPARE: a screw in it, so it can't be pumped up; it has to be replaced.
//   S.spare: undefined (never looked), 'flat' (the screw), 'away' (at the Tyre Place till S.spareReady), 'good'
// =====================================================================
// A job for it, with two places to get one
function spareJob() {
  if (findJob('spare')) return;
  job('spare', 'Replace the flat spare (a screw in it)', null);
  lead('spare', 'spare-yard', 'A spare off a wreck at the Scrap Yard', 'you', 'fairly sure', 'place:Scrap Yard');
  lead('spare', 'spare-shop', 'A new tyre on it at the Tyre Place', 'you', 'sure', 'place:Tyre Place');
}
// Do you still need one? (the spare's flat, and your car's back home)
const spareWanted = () => S.spare === 'flat' && !S.road;
// What you see when you look at it in the boot
function spareLook() {
  if (S.spare === 'flat') return 'The spare. Flat, with a screw in the tread. It won\'t pump up with a hole in it. It needs replacing.';
  if (S.spare === 'away') return 'An empty well. The spare is at the Tyre Place till ' + (S.spareReady > S.day ? 'tomorrow' : 'today') + '.';
  if (S.spare === 'good') return 'A good spare, at last, bolted down in its well. Touch wood.';
  return LOOKS['Spare wheel'];                                         // before the puncture: it just feels a bit soft
}
// At the Scrap Yard or the Tyre Place, about the spare. Returns true if that's what you talked about
function spareAt(place) {
  if (place === 'Tyre Place' && S.spare === 'away') {                  // come to collect it
    if (S.day < S.spareReady) { anger(5); say(place, '"Tomorrow, mate. I said tomorrow."'); return true; }
    S.spare = 'good';
    closeLead('spare-collect', 'ok');
    finishJob('spare', 'New tyre on the spare, from the Tyre Place');
    say(place, '"There you go. New tyre on it, pumped up."\n\nYou put it back in the boot.');
    return true;
  }
  if (!spareWanted()) return false;
  const yard = place === 'Scrap Yard';
  const price = yard ? 10 : 35;
  if (!spend(price)) { anger(10); say(place, 'Card declined.'); return true; }
  sfx('beep');
  if (yard) {                                                           // off a wreck: straight in the boot
    S.spare = 'good';
    closeLead('spare-yard', 'ok');
    closeLead('spare-shop', 'skip');
    finishJob('spare', 'A spare off a wreck at the Scrap Yard: £10');
    say(place, '"A spare? Off that one. It\'s got a bit of tread left. Tenner."\n\nYou swap it for the one with the screw in. He keeps that one. He seems pleased.');
    return true;
  }
  S.spare = 'away';                                                     // the Tyre Place: a new tyre on it, tomorrow
  S.spareReady = S.day + 1;
  closeLead('spare-shop', 'ok', 'Tyre Place: a new tyre on the spare, £35, ready tomorrow');
  closeLead('spare-yard', 'skip');
  lead('spare', 'spare-collect', 'Collect the spare from the Tyre Place (tomorrow)', 'the Tyre Place', 'sure', 'place:Tyre Place');
  say(place, '"A screw? Can\'t plug that, it\'s in the shoulder. New tyre on your wheel: thirty-five quid. Ready tomorrow."\n\nYou leave the spare with him.');
  return true;
}
// Home at last, soaked: the phone goes on charge, and the wife has a plan
function homeSoaked() {
  pass(80);
  anger(15);
  S.road.walked = true;
  S.flags.phoneDead = false;                                        // on charge, at home
  note('tyre', 'Walked home in the rain. Splashed by a car', 'x');
  lead('tyre', 'wheel-yard', 'A wheel from the Scrap Yard', 'the wife', 'sure', 'place:Scrap Yard');
  lead('tyre', 'wheel-shop', 'A wheel from the Tyre Place', 'the wife', 'fairly sure', 'place:Tyre Place');
  show('room');
  SPEAKER = wifeHead();
  say('The wife', '"Husband! You\'re SOAKED. Where\'s the car?"\n\n"A puncture. And the spare\'s flat. And your phone died. Of course it did."\n\n"Get a wheel from the Scrap Yard, or one of the car shops. Take my car. And put that phone on charge."');
}

// Where your car is drawn: yours, or (while yours is stuck on Mill Lane) her little purple one
function drivenCar(x, y, s) {
  if (S.flags.taxi) return isoCar(x, y, s, hex('#f8d038'), { alongX: true, shape: 'saloon' });   // the taxi (police.js)
  if (inWifesCar()) return isoCar(x, y, s, WIFE_CAR, { alongX: true, shape: 'city' });
  isoCarX(x, y, s, C.car);
}
// Going somewhere while your car is stuck: before you've walked home you can't go anywhere;
// after, you can drive her car, but not work on yours. Returns a reason, or null to go
function strandedReason(target) {
  if (!S.road) return null;
  if (target === 'phone' || target === 'notebook' || target === 'roadside' || target.startsWith('act:')) return null;
  if (!S.road.walked) return `You're stuck on ${ROADSIDE} with a flat tyre.`;
  if (CAR_SCREENS.includes(target)) return `Your car is on ${ROADSIDE}, on a flat tyre.`;
  return null;
}
