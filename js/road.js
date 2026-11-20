// The Thankless Task: road snags.
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
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) px(x, y, hash(x, y) < 0.1 ? C.grassDark : C.grass);   // the verge
    // the road, the kerb, the pavement
    ground(-400, 66, 600, 120, C.road);
    for (let x = -400; x < 600; x += 24) line(...P(x, 94), ...P(x + 12, 94), C.white);
    ground(-400, 40, 600, 66, C.drive);
    line(...P(-400, 66), ...P(600, 66), C.white);
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
      spot('Boot: the spare wheel', isoArea(ROAD_CAR[0] - 4, 72, ROAD_CAR[0] + 8, 96, 4, 20), 'act:roadspare', [ROAD_CAR[0] - 6, 66]);
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
      if (!S.road.spare) a.push({ label: 'Put the spare on', act: 'roadspare' });
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
  if (!S.road.spare) return 'A flat front tyre. There\'s a spare in the boot.';
  if (!S.flags.phoneDead) return 'The spare\'s flat too. Ring for help?';
  return 'No spare, no phone. It\'s a long walk home.';
}
// The spare lying flat on the verge, beside the car
function roadsideSpare() {
  const w = P(124, 50);                                            // on the pavement, past the car
  ellipse(w[0], w[1], 12, 6, C.tyre);
  ellipse(w[0], w[1] - 1, 6, 3, C.rim);
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
// A flat, side-on street: grey sky, a terrace of houses, the pavement and the road
SCREENS.walkhome = {
  size: [480, 270],
  paint() {
    for (let y = 0; y < 150; y++) rect(0, y, W, 1, shade(hex('#7a8088'), 0.8 + y / 600));   // a grey sky, lighter low down
    for (let k = 0; k < 6; k++) disc(40 + k * 90, 30 + (k % 2) * 14, 40, hex('#6a7078'));     // heavy clouds
    for (let k = 0; k < 8; k++) {                                   // the terrace of houses over the road
      const x = k * 64 - 10;
      rect(x, 96, 62, 104, shade(C.brick, 0.75));
      rect(x, 90, 62, 8, shade(C.roof, 0.8));
      rect(x + 8, 110, 14, 14, shade(C.winGlass, 0.6));
      rect(x + 40, 110, 14, 14, shade(C.winGlass, 0.6));
      rect(x + 26, 150, 12, 50, shade(C.door, 0.6));
    }
    rect(0, 200, W, 18, shade(C.drive, 0.75));                      // the pavement he walks along
    rect(0, 218, W, 2, C.steel2);                                   // the kerb
    rect(0, 220, W, 50, shade(C.road, 0.8));                        // the road
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
// A car seen side-on, driving right (for the walk home)
function sideCar(x, y, col) {
  rbox(x, y - 20, 96, 16, 5, col);                                  // the body
  poly([[x + 22, y - 20], [x + 34, y - 34], [x + 66, y - 34], [x + 78, y - 20]], col);   // the cabin
  poly([[x + 27, y - 21], [x + 36, y - 31], [x + 49, y - 31], [x + 49, y - 21]], C.glass);
  poly([[x + 52, y - 21], [x + 52, y - 31], [x + 64, y - 31], [x + 73, y - 21]], C.glass);
  for (const wx of [x + 20, x + 76]) { disc(wx, y - 3, 8, C.tyre); disc(wx, y - 3, 4, C.rim); }
  rect(x + 92, y - 16, 4, 4, C.warm);                               // its headlight
}
// The moment: he walks home in the rain; halfway, a car hits the puddle and soaks him
const SOAKED = { shirt: hex('#8a3028'), shirtDark: hex('#6a2018'), jeans: hex('#283a68'), jeansDark: hex('#1c2a50'), hair: hex('#402810') };
MOMENTS.walkhome = function (p) {
  const x = lerp(WALK.from, WALK.to, p);                            // him, along the pavement
  const hit = 0.5;                                                  // when the car hits the puddle
  const wet = p > hit;
  man(x, WALK.ground, 'walk', WALK.size, p * 90, wet ? SOAKED : null);
  if (wet) for (let k = 0; k < 6; k++) rect(x + 4 + k * 3, WALK.ground + ((p * 400 + k * 13) % 14), 1, 2, hex('#b8c4d0'));   // dripping
  // the car: in from the left, through the puddle, off to the right
  const carX = lerp(-140, W + 40, (p - 0.35) / 0.3);
  if (p > 0.35 && p < 0.65) sideCar(carX, 254, hex('#c8c8c0'));
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
    pass(20);
    anger(15);
    sfx('ratchet');
    note('tyre', 'The spare is flat too (probably since 2019)', 'x');
    say('The spare wheel', 'You empty the boot onto the verge, undo the spare and heave it out.\n\nIt\'s flat. Completely flat. It has probably been flat since 2019.');
  },
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
    moment('walkhome', 7000);
    ANIM.then = homeSoaked;
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
    show('home');
    say('The new wheel', 'Jack up. The short brace, a lot of swearing, and the nuts come off. Flat one off, new one on.\n\nYou drive your car home. She walks down for hers. She is not happy.\n\n(The spare is still flat.)');
  }
});
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
