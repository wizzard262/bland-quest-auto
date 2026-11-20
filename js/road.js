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
// Is your car away from home? (on a flat on Mill Lane, or left outside the pub)
const carAway = () => carStranded() || !!S.flags.carAt;
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
    nightShade(0, 0, W, H, 0.07 * rainLevel('roadside'));          // greyer as the rain sets in
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
// How hard it's raining (0 none … 4 a downpour): it starts with the puncture and gets worse with every setback
function rainLevel(screen) {
  if (screen === 'walkhome') return 4;                              // the walk home: chucking it down
  if (!S.road || S.road.walked) return 0;                           // no puncture (or home and dry)
  if (screen !== 'roadside' && screen !== 'boot') return 0;
  if (S.flags.phoneDead) return 3;                                  // the phone's died: heavy
  if (S.road.spare) return 2;                                       // the spare's flat: steady
  return 1;                                                         // the puncture: spitting
}
// The rain over the picture: more drops the harder it's raining
function rainDrops(t, level) {
  const n = [0, 30, 70, 110, 160][level];
  for (let k = 0; k < n; k++) {
    const x = (hash(k, 1) * W + t * 40) % W;
    const y = 18 + (hash(1, k) * (H - 18) + t * 300 + k * 7) % (H - 18);
    line(x, y, x - 2, y + 6, hex('#b8c4d0'));
  }
}
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
  rainDrops(t, rainLevel('roadside'));                              // the rain, getting heavier
  if (Math.floor(t * 2) % 2) return;                                // off half the time
  ISO.ox = ROAD_VIEW[0]; ISO.oy = ROAD_VIEW[1];
  const [x, y] = ROAD_CAR;
  for (const [dx, dy] of [[0, 1], [0, 23], [45, 1], [45, 23]]) {
    const q = P(x + dx, y + dy, 9);
    rect(q[0] - 1, q[1] - 1, 3, 2, hex('#ffa020'));
  }
};

// =====================================================================
// THE STREET, IN ISO: like outside the house. A terrace of houses, the pavement, the road (the walk home; pulled over)
// =====================================================================
const STREET_LAMPS = [-150, 50, 250];                               // the street lamps along the pavement (x)
const ROAD_STREET_VIEW = [240, 96];                                      // where the street sits on screen
function isoStreet() {
  [ISO.ox, ISO.oy] = ROAD_STREET_VIEW;
  streetFront();                                                    // grass, the road, the kerb and the pavement
  // a long terrace of red brick houses behind the pavement, each with a door and windows
  ibox(-340, -20, 540, 36, 0, 50, C.brick);
  bricks(-340, -20, 540, 36, 50, C.brickLine);
  gableRoof(-343, -23, 543, 39, 50, 18, C.brick, C.roof);
  for (let x = -330, n = 0; x < 530; x += 44, n++) {
    onLeft(36, x + 4, x + 14, 0, 26, C.white); onLeft(36, x + 5, x + 13, 0, 25, [C.door, C.red, hex('#2a6a3a')][n % 3]);   // a front door
    winLeft(36, x + 20, x + 36, 10, 24);                            // the front room window
    winLeft(36, x + 6, x + 14, 32, 44); winLeft(36, x + 24, x + 36, 32, 44);   // and upstairs
  }
  // street lamps at the kerb
  for (const lx of STREET_LAMPS) {
    ibox(lx, 60, lx + 3, 63, 0, 70, C.greyDark);
    ibox(lx - 4, 58, lx + 7, 66, 70, 73, C.greyDark);
    onLeft(66, lx - 2, lx + 5, 69, 70, C.warm);
  }
}

// =====================================================================
// THE WALK HOME: grey and gloomy, rain, and a car through a puddle
// =====================================================================
const WALK = { y: 54, from: -130, to: 380, puddle: [120, 70], size: 2 };   // along the pavement (x), and the puddle in the gutter
SCREENS.walkhome = {
  size: [480, 270],
  paint() {
    isoStreet();
    const [px0, py0] = WALK.puddle;                                 // the puddle by the kerb
    poly([P(px0 - 16, py0 - 3), P(px0 + 16, py0 - 3), P(px0 + 16, py0 + 6), P(px0 - 16, py0 + 6)], hex('#5a7088'));   // grey sky in it
    line(...P(px0 - 10, py0), ...P(px0 + 8, py0), hex('#a8c0d8'));   // a shine across it
    line(...P(px0 - 4, py0 + 3), ...P(px0 + 10, py0 + 3), hex('#8aa0b8'));
    nightShade(0, 0, W, H, 0.3);                                    // a grey, gloomy day
    tip('The walk home', 'It starts to rain.', 1, 8);
    hud();
  },
  animate(t) { rainDrops(t, 4); }                                   // chucking it down
};
// The moment: he walks home in the rain; halfway, a car hits the puddle and soaks him
const SOAKED = { shirt: hex('#8a3028'), shirtDark: hex('#6a2018'), jeans: hex('#283a68'), jeansDark: hex('#1c2a50'), hair: hex('#402810') };
const WALK_MS = 7000;                                                  // the whole walk home
const WALK_SPLASH = 0.6;                                               // how far through it: the water has hit him (it lands at 0.5)
const WALK_AFTER_MS = 7500;                                            // after the splash: a sigh, then on at half pace
const WALK_SIGH = 0.12, WALK_SINK = 0.22;                              // how far through the rest of it: the sigh ends; the sinking ends
let WALK_PART = [0, 1];                                                // the part of the walk this moment plays
MOMENTS.walkhome = function (part) {
  [ISO.ox, ISO.oy] = ROAD_STREET_VIEW;
  const after = WALK_PART[0] >= WALK_SPLASH;                           // the rest of the walk, after the splash
  const p = after ? WALK_SPLASH + part * WALK_AFTER_MS / WALK_MS : lerp(WALK_PART[0], WALK_PART[1], part);   // the time so far, as a share of the plain walk (the car and the splash go by it)
  const hit = 0.5;                                                  // when the car hits the puddle
  const wet = p > hit;
  const look = wet ? SOAKED : null;
  let wx = lerp(WALK.from, WALK.to, Math.min(p, WALK_SPLASH));       // him, along the pavement (stopped where the splash got him)
  let pose = 'walk', phase = p * 90;
  if (after && part < WALK_SIGH) pose = 'stand';                     // he stands there, dripping, and sighs
  else if (after && part < WALK_SINK) pose = 'trudge';               // his shoulders drop
  else if (after) {                                                 // and trudges on home, head down, at half his pace
    wx = lerp(wx, WALK.to, (part - WALK_SINK) / (1 - WALK_SINK));
    pose = 'trudge'; phase = part * 45;
  }
  const m = P(wx, WALK.y);
  man(m[0], m[1], pose, WALK.size, phase, look);
  if (wet) for (let k = 0; k < 4; k++) rect(m[0] + 1 + k * 2, m[1] - 4 + ((p * 400 + k * 13) % 8), 1, 2, hex('#b8c4d0'));   // dripping
  // the car: along the road from the left, through the puddle, off to the right
  const carX = lerp(-400, 566, (p - 0.35) / 0.3);                    // its front wheel (37 along it) reaches the puddle at 0.5, as the water goes up
  if (p > 0.35 && p < 0.65) isoCar(carX, 70, 1, hex('#c8c8c0'), { alongX: true, shape: 'saloon' });
  // the splash: a wall of water, up over the pavement and him
  if (p > hit && p < hit + 0.16) {                                  // a huge wave of it: a sheet of water and a spray of drops, up and over him
    const q = (p - hit) / 0.16, rise = Math.sin(q * 3.1);
    const c = P(WALK.puddle[0], WALK.puddle[1]);
    for (let k = 0; k < 14; k++) {                                   // the sheet: a fan of thick streaks off the wheel
      const a = -0.5 - k * 0.16, r = rise * (40 + hash(k, 3) * 30);
      pipe(c[0], c[1] - 2, c[0] + Math.cos(a) * r, c[1] - 2 + Math.sin(a) * r * 1.3, 3, k % 2 ? hex('#a8c0d8') : hex('#d8e8f4'));
    }
    for (let k = 0; k < 260; k++) {                                  // the spray: drops flung far and wide
      const a = -0.3 - hash(k, 7) * 2.6, r = rise * (20 + hash(7, k) * 95);
      const s2 = k % 5 ? 2 : 3;
      rect(c[0] + Math.cos(a) * r, c[1] - 2 + Math.sin(a) * r * 1.3 + q * q * 30 * hash(k, 9), s2, s2, k % 3 ? hex('#a8c0d8') : C.white);   // falling back as it goes
    }
  }
};

// =====================================================================
// PULLED OVER: driving off after a drink, a police car comes up behind you, blue lights and siren, and you pull in
// =====================================================================
const PULLOVER_MS = 5000;
SCREENS.pullover = {
  size: [480, 270],
  paint() {
    isoStreet();
    nightShade(0, 0, W, H, 0.62);                                   // night
    for (const lx of STREET_LAMPS) { const g = P(lx + 2, 62, 68); lampGlow(g[0], g[1], 26, 0.62); }   // the street lamps, lit
    for (let x = -330; x < 530; x += 88) { const w = P(x + 28, 36, 17); lampGlow(w[0], w[1], 10, 0.62); }   // a lit window here and there
    tip('Driving home', 'Blue lights in the mirror.', 1, 8);
    hud();
  }
};
MOMENTS.pullover = function (p) {
  [ISO.ox, ISO.oy] = ROAD_STREET_VIEW;
  const yours = lerp(-160, 150, ease(Math.min(1, p / 0.8)));          // your Zafira: along the road, slowing, pulling in to the kerb
  const theirs = lerp(-420, 60, ease(Math.min(1, p / 0.85)));        // the police car, catching up and pulling in behind
  const inY = 76 - Math.round(Math.max(0, p - 0.45) / 0.55 * 6);      // both drift in towards the kerb
  const flash = Math.floor(p * PULLOVER_MS / 160) % 2 === 0;         // the blue lights, left and right in turn
  isoCar(theirs, inY, 1, shade(C.white, 0.78), { alongX: true, shape: 'saloon', police: true, flash });
  const bar = POLICE_BAR;                                            // where its light bar is on screen (isoCar sets it)
  isoCar(yours, inY, 1, shade(C.car, 0.7), { alongX: true });
  if (bar) blueGlow(bar[0], bar[1], 60);                             // blue light washing over the street
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
    sfx('splash', WALK_MS * 0.5 / 1000);                               // SPLOOSH, as the wheel hits the puddle
    WALK_PART = [0, WALK_SPLASH];                                      // up to the splash…
    moment('walkhome', WALK_MS * WALK_SPLASH);
    ANIM.then = () => flashStill('splash', () => {                      // …the splash, big, as it hits him…
      WALK_PART = [WALK_SPLASH, 1];                                    // …then on home, dripping
      moment('walkhome', WALK_AFTER_MS);                              // (a sigh, then slower)
      sfx('sigh');
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
    const jack = S.flags.jackLent ? 'No jack: Paul\'s still got it. A man across the road lends you his, and watches the whole time.\n\n' : '';   // Paul borrowed it
    say('The new wheel', jack + 'Jack up. The short brace, a lot of swearing, and the nuts come off. Flat one off, new one on.\n\nYou drive your car home. She walks down for hers. She is not happy.\n\n(The spare is still flat, with a screw in it. It needs replacing.)');
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
