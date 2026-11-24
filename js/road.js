// Bland Quest Auto: road snags.
// Now and then on the way home from town (once a game): BANG, a puncture on Mill Lane.
//   The spare in the boot is flat. You ring for help: the phone dies. You walk home: it rains, the sky
//   goes grey, and a car drives through a puddle and soaks you. At home the wife says get a wheel from the
//   Scrap Yard or a car shop (Worn Out and Tired), and lends you her car. You fit the wheel at the roadside.
//   S.road is set while your car is stuck on Mill Lane: { spare: tried it, walked: home on foot }

let PUNCTURE_CHANCE = window.NO_PUNCTURES ? 0 : 1 / 3;             // the chance on each drive home (the tests turn it off, or up to 1)
const PUNCTURE_BY = 4;                                               // …and it's sure to happen by the 4th daytime drive home from town (Steve)
const ROADSIDE = 'Mill Lane';                                       // where it happens
const TYRE_SHOP = 'Worn Out and Tired';                             // the tyre shop (Steve's name for it)
const WIFE_CAR = hex('#9a5ac8');                                    // her little purple car (lent to you while yours is stuck)
// Is her car on its drive? Not when you need the bus to fetch yours: she's gone out in it (Steve). (Just fetched home drunk: it's there)
const wifesCarHome = () => !S.flags.carAt || !!S.flags.drunkHome || !!S.flags.wifeWalksIn;
const WIFE_DRIVE = [-58, 70];                                         // where it lives: its own drive, the other side of the house
const ROAD_VIEW = [250, 70];                                        // the roadside: the same street view as a shop front
// The screens that need your car to be at home (in the garage)
const CAR_SCREENS = ['dash', 'bonnet', 'fuseZoom', 'boot', 'under', 'underZoom', 'port', 'ecu', 'glovebox'];

// Is your car stuck at the roadside?
const carStranded = () => !!S.road;
// Is your car away from home? (on a flat on Mill Lane, or left outside the pub)
const carAway = () => carStranded() || !!S.flags.carAt;
// Driving her car about (you've walked home and she's lent you hers)
const strandedLift = () => !!S.road && !!S.road.walked && !S.road.tellHer;   // yours is on Mill Lane, and she knows
const inWifesCar = () => {
  if (S.flags.taxi) return false;
  return strandedLift() || carClamped() || !!lift().out;              // …or clamped; or you're still out in hers (lift.js)
};
// Home on foot, soaked, and the wife doesn't know yet (you haven't been to find her)
const soakedAtHome = () => !!S.road && !!S.road.tellHer;

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
  if (S.spare === 'away') return false;                             // the spare's being mended: it waits till you've got it back (spareJinxed)
  S.flags.drivesHome = (S.flags.drivesHome || 0) + 1;              // daytime drives home from town so far
  const due = PUNCTURE_CHANCE > 0 && S.flags.drivesHome >= PUNCTURE_BY;   // it's had long enough: now (unless the tests have turned punctures off)
  if (!due && Math.random() >= PUNCTURE_CHANCE) return false;
  puncture();
  return true;
}
// Had the spare mended before you ever needed it? You drive off, and straight into a puncture (Steve). Returns true if it's happened
function spareJinxed() {
  if (!S.flags.spareJinx || S.flags.punctured || S.road || S.flags.taxi) return false;
  delete S.flags.spareJinx;
  S.spareOut = false;                                               // the mended spare, back in the boot
  puncture(`Bang. Then flap-flap-flap-flap-flap.\n\nA puncture. You're barely round the corner. You pull over on ${ROADSIDE}.\n\nNever mind. For once in your life, you've got a good spare.`);
  return true;
}
// BANG: pulled over on Mill Lane, with a flat tyre
function puncture(words) {
  S.flags.punctured = true;
  S.road = { spare: false, walked: false };
  pass(10);
  job('tyre', 'Sort out the flat tyre', null);
  sfx('pop');
  sfx('thud', 0.1);
  show('roadside');
  say('BANG!', words || `Bang. Then flap-flap-flap-flap-flap.\n\nA puncture. You pull over on ${ROADSIDE}, halfway home.`);
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
    const bare = walkHomeNow() ? IMG32.slice() : null;              // the street with nothing on it yet (for the pavement's glow)
    // a long brick wall behind the pavement, and a field gate in it
    ibox(-200, 30, 400, 40, 0, 20, C.brick, C.brickLine);
    bricks(-200, 30, 400, 40, 20, C.brickLine);
    ibox(150, 30, 190, 40, 0, 18, C.wood);
    // the lane's name on a sign
    ibox(10, 44, 13, 47, 0, 34, C.greyDark);                         // clear of the note in the top left corner
    onLeft(47, -10, 34, 26, 36, C.white);
    boardText('MILL LANE', 47, -10, 34, 26, 36, C.ink);              // sloping with the sign
    // your car (or, once you've walked home, still here; you come back in hers)
    herOnTheRoadside();                                             // her and her car, if she's brought you (lift.js)
    const flat = !!S.road && !S.road.fitted;                        // till the new wheel's on
    isoCar(ROAD_CAR[0], ROAD_CAR[1], 1, C.car, { alongX: true, flatFront: flat });
    if (S.road && !S.road.fitted && S.road.spare && S.spare !== 'away') roadsideSpare();                    // the flat spare on the verge
    const m = P(...ROAD_MAN);
    man(m[0], m[1], 'stand', 2);                                    // you, on the pavement
    PAVEMENT_GLOW = bare ? pavementPixels(bare) : [];
    // what you can tap (the pavement first, so the car's own things are on top of it)
    if (walkHomeNow()) for (const [x0, x1, labelX] of WALK_HOME_WAYS) {
      const label = P(labelX, 53);                                   // its name, over the part you can see
      spot('Walk home', walkHomeArea(x0, x1), 'act:walkhome', null, `left:${label[0] / W * 100}%;top:${label[1] / H * 100}%`);
    }
    if (S.road) {
      spot('Boot: open it', isoArea(ROAD_CAR[0] - 4, 72, ROAD_CAR[0] + 8, 96, 4, 20), 'act:roadboot', [ROAD_CAR[0] - 6, 66]);
      spot('The flat tyre', isoArea(ROAD_CAR[0] + 30, 92, ROAD_CAR[0] + 42, 98, 0, 10), 'act:roadtyre', [ROAD_CAR[0] + 36, 100]);
    }
    if (!S.road) spot('Your car: drive home', isoArea(ROAD_CAR[0], ROAD_CAR[1], ROAD_CAR[0] + 46, ROAD_CAR[1] + 24, 0, 20), 'act:roadhome');   // fixed: get in
    nightShade(0, 0, W, H, 0.07 * rainLevel('roadside'));          // greyer as the rain sets in
    tip(ROADSIDE, roadsideTip(), 1, 8);
    const street = IMG32.slice();
    hud();
    PAVEMENT_GLOW = PAVEMENT_GLOW.filter(i => IMG32[i] === street[i]);   // not over the strip along the top, or the watch and the phone
  },
  actions() {
    const a = [];
    if (!S.road || S.road.fitted) return [];                         // fixed: tap your car to drive it home (no button)
    if (!S.road.walked) {
      if (!S.road.spare) a.push({ label: 'Open the boot', act: 'roadboot', pulse: !!S.flags.phoneDead });
    } else {
      a.push({ label: 'Into town (in her car)', act: 'roadtown' });
      a.push({ label: 'Drive home (in her car)', act: 'roadhome' });
    }
    return a;
  }
};
// Tried the boot and the phone: nothing else for it but to walk home. The pavement glows both ways; tap it (no button: Steve)
const ROAD_MAN = [96, 56];                                          // where you stand on the pavement
const walkHomeNow = () => !!S.road && !S.road.walked && !!S.road.spare && !!S.flags.phoneDead;
// The two ways along the pavement, from two slabs either side of you: [from x, to x, where its name goes]
const WALK_HOME_WAYS = [[-400, 68, -10], [128, 600, 172]];
// Where you tap to go that way: that end of the pavement, less the bit hidden behind the car
function walkHomeArea(x0, x1) {
  if (x0 > ROAD_MAN[0]) return isoArea(x0, 40, x1, 66, 0, 0);       // past the car: all of it
  const carBack = 20, hidden = 50;                                  // from about here, only the back of the pavement shows over the car
  return tapShape([P(x0, 40), P(x1, 40), P(x1, hidden), P(carBack, hidden), P(carBack, 66), P(x0, 66)]);
}
let PAVEMENT_GLOW = [];                                             // the pixels of it that glow
// Which pixels are pavement, with nothing standing on it (bare: the picture before anything was drawn on the street)
function pavementPixels(bare) {
  const drawn = IMG32.slice();                                      // the picture as it is
  const marker = hex('#ff00fe');                                    // a colour nothing else has
  for (const [x0, x1] of WALK_HOME_WAYS) ground(x0, 40, x1, 66, marker);
  const marked = pack32(...marker);
  const found = [];
  for (let i = 0; i < drawn.length; i++) {
    const onPavement = IMG32[i] === marked;
    const uncovered = drawn[i] === bare[i];
    if (onPavement && uncovered) found.push(i);
  }
  IMG32.set(drawn);                                                 // put the picture back
  return found;
}
// Each frame: the pavement swells and fades, like anything else that pulses
function pavementGlow(t) {
  if (!walkHomeNow()) return;
  const strength = 0.08 + 0.42 * pulseSwell(t);
  const d = img.data;
  for (const i of PAVEMENT_GLOW) {
    for (let c = 0; c < 3; c++) d[i * 4 + c] += (C.mint[c] - d[i * 4 + c]) * strength;
  }
}
// How hard it's raining (0 none … 4 a downpour, 5 even worse): it starts with the puncture and gets worse with every setback
function rainLevel(screen) {
  if (screen === 'walkhome') return 4;                              // the walk home: chucking it down
  if (screen === 'home' && soakedAtHome()) return 5;               // outside your own house: heavier still (Steve)
  if (!S.road || S.road.walked) return 0;                           // no puncture (or home and dry)
  if (screen !== 'roadside' && screen !== 'boot') return 0;
  if (S.flags.phoneDead) return 3;                                  // the phone's died: heavy
  if (S.road.spare) return 2;                                       // the spare's flat: steady
  return 1;                                                         // the puncture: spitting
}
// The rain over the picture: more drops the harder it's raining
function rainDrops(t, level) {
  const n = [0, 30, 70, 110, 160, 320][level];
  for (let k = 0; k < n; k++) {
    const x = (hash(k, 1) * W + t * 40) % W;
    const y = 18 + (hash(1, k) * (H - 18) + t * 300 + k * 7) % (H - 18);
    line(x, y, x - 2, y + 6, hex('#b8c4d0'));
  }
}
// What the note at the top says, step by step
function roadsideTip() {
  if (!S.road || S.road.fitted) return 'Your car, with four good tyres. For now. Tap it to drive home.';
  if (S.inv.wheel) return 'You\'ve got a wheel. Tap the flat tyre to change it.';
  if (S.road.walked) return 'Your car, still on a flat. Get a wheel from the Scrap Yard or a car shop.';
  if (!S.road.spare) return 'A flat front tyre. There\'s a spare in the boot: open it.';
  if (!S.flags.phoneDead) return 'The spare\'s flat too. Your phone\'s flashing: ring for help.';
  return 'No spare, no phone. It\'s a long walk home, along the pavement.';
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
  if (!S.road || S.road.fitted) return;
  pavementGlow(t);                                                  // nothing left to try: the way home
  rainDrops(t, rainLevel('roadside'));                              // the rain, getting heavier
  ISO.ox = ROAD_VIEW[0]; ISO.oy = ROAD_VIEW[1];
  hazardLights(t, ROAD_CAR[0], ROAD_CAR[1], 1, true);
};
const HAZARD = hex('#ffa020');
const hazardsLit = t => Math.floor(t * 2) % 2 === 0;                 // on, off, on, off: twice a second
// Your car's four hazard lights, at each corner (x, y: where it's parked; s: its size; alongX: which way it points)
function hazardLights(t, x, y, s, alongX) {
  if (!hazardsLit(t)) return;                                       // off half the time
  for (const [along, across] of [[0, 1], [0, 23], [45, 1], [45, 23]]) {
    const dx = alongX ? along : across, dy = alongX ? across : along;
    const q = P(x + dx * s, y + dy * s, 9 * s);
    rect(q[0] - 1, q[1] - 1, 3, 2, HAZARD);
  }
}

// =====================================================================
// ON THE TOWN MAP: your car, broken down on Mill Lane (a street near home), its hazards flashing. Tap it to go to it
// =====================================================================
const MAP_LANE = { at: [106, 440], s: 0.5, mini: [10, 4 * 13 + 4] };   // where it stands, its size, and its dot on the little map
function brokenCarOnMap() {
  if (!S.road) return;
  const [x, y] = MAP_LANE.at;
  isoCar(x, y, MAP_LANE.s, C.car, { flatFront: true });
}
function brokenCarSpot() {
  if (!S.road) return;
  const [x, y] = MAP_LANE.at;
  spot(`Your car (flat tyre, ${ROADSIDE}): go to it`, isoArea(x, y, x + 12, y + 23, 0, 11), 'act:toroad');
}
// Each frame: its hazards, and a flashing dot on the little map
function brokenCarFlash(t) {
  if (!S.road) return;
  hazardLights(t, MAP_LANE.at[0], MAP_LANE.at[1], MAP_LANE.s, false);
  const [mx, my] = minimapCorner();
  rect(mx + MAP_LANE.mini[0], my + MAP_LANE.mini[1], 3, 3, hazardsLit(t) ? HAZARD : C.car);
}

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
const WALK = { y: 54, from: -130, to: 380, puddle: [125, 70], size: 2 };   // along the pavement (x), and the puddle in the gutter, right beside where he is at the hit
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
const WALK_AFTER_MS = 8500;                                            // after the splash: a sigh, then on at half pace
const WALK_HIT = 0.5;                                                  // how far through the walk the car hits the puddle (he's level with it)
const WALK_SIGH = 0.12, WALK_SINK = 0.22;                              // how far through the rest of it: the sigh ends; the sinking ends
let WALK_PART = [0, 1];                                                // the part of the walk this moment plays
MOMENTS.walkhome = function (part) {
  [ISO.ox, ISO.oy] = ROAD_STREET_VIEW;
  const after = WALK_PART[0] >= WALK_SPLASH;                           // the rest of the walk, after the splash
  const p = after ? WALK_SPLASH + part * WALK_AFTER_MS / WALK_MS : lerp(WALK_PART[0], WALK_PART[1], part);   // the time so far, as a share of the plain walk (the car and the splash go by it)
  const hit = WALK_HIT;                                              // when the car hits the puddle
  const wet = p > hit;
  const look = wet ? SOAKED : null;
  let wx = lerp(WALK.from, WALK.to, Math.min(p, hit));               // him, along the pavement: he stops dead where the splash gets him
  let pose = p > hit && !after ? 'stand' : 'walk', phase = p * 90;   // (stood in it, being drenched)
  if (after && part < WALK_SIGH) pose = 'stand';                     // he stands there, dripping, and sighs
  else if (after && part < WALK_SINK) pose = 'trudge';               // his shoulders drop
  else if (after) {                                                 // and trudges on home, head down, at half his pace
    wx = lerp(wx, WALK.to, (part - WALK_SINK) / (1 - WALK_SINK));
    pose = 'trudge'; phase = part * 45;
  }
  const m = P(wx, WALK.y);
  man(m[0], m[1], pose, WALK.size, phase, look);
  if (wet) soakedDrips(m, p * 400);                                  // dripping
  // the car: along the road from the left, through the puddle, off to the right
  const carX = lerp(-395, 571, (p - 0.35) / 0.3);                    // its front wheel (37 along it) reaches the puddle at 0.5, as the water goes up
  if (p > 0.35 && p < 0.65) isoCar(carX, 70, 1, hex('#c8c8c0'), { alongX: true, shape: 'saloon' });
  // the splash: a wall of water, up over the pavement and him
  if (p > hit && p < hit + 0.16) {                                  // a huge wave of it: a sheet of water and a spray of drops, up and over him
    const q = (p - hit) / 0.16;
    const rise = q < 0.5 ? Math.sin(q * Math.PI) : 1 + (q - 0.5) * 0.5;   // up to its peak, then on outwards (never back into the puddle)
    const fade = q < 0.5 ? 0 : (q - 0.5) / 0.5;                       // past the peak it thins out to nothing
    const c = P(WALK.puddle[0], WALK.puddle[1]);
    if (q < 0.7) for (let k = 0; k < 14; k++) {                      // the sheet: a fan of thick streaks off the wheel (it breaks up into drops)
      const a = 0.1 - k * 0.13, r = rise * (40 + hash(k, 3) * 34);   // up and towards the pavement (up and to the right): at him
      pipe(c[0], c[1] - 2, c[0] + Math.cos(a) * r, c[1] - 2 + Math.sin(a) * r * 1.3, 3, k % 2 ? hex('#a8c0d8') : hex('#d8e8f4'));
    }
    for (let k = 0; k < 260; k++) {                                  // the spray: drops flung far and wide
      const a = 0.2 - hash(k, 7) * 2.0, r = rise * (20 + hash(7, k) * 95);   // mostly up and over him, some back over the road
      if (hash(k, 11) < fade) continue;                              // thinning out
      const s2 = k % 5 ? 2 : 3;
      rect(c[0] + Math.cos(a) * r, c[1] - 2 + Math.sin(a) * r * 1.3 - q * q * 16 * hash(k, 9), s2, s2, k % 3 ? hex('#a8c0d8') : C.white);   // drifting up and out as it goes
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
// GETTING YOUR CAR BACK: a wheel from the Scrap Yard or Worn Out and Tired, fitted at the roadside
// =====================================================================
// Do you still need a wheel? (home, and not got one yet)
const wheelWanted = () => strandedLift() && !S.inv.wheel;
// Buy a wheel at a place: the Scrap Yard's cheap and on a wreck; Worn Out and Tired's part-worn
function buyWheel(place) {
  const yard = place === 'Scrap Yard';
  const price = yard ? 10 : 35;
  if (!spend(price)) { anger(10); return say(place, declinedWords()); }
  S.inv.wheel = place;
  sfx('kerching');                                                     // the till
  closeLead(yard ? 'wheel-yard' : 'wheel-shop', 'ok', `A wheel from the ${place}: £${price}`);
  closeLead(yard ? 'wheel-shop' : 'wheel-yard', 'skip');
  lead('tyre', 'fitwheel', `Fit the wheel on ${ROADSIDE}`, 'you', 'sure', 'act:toroad');
  S.wheelOut = true;                                                    // he hands it over; in your arms, out to her car (at either place: Steve)
  handTyre(false);
  if (yard) return say(place, '"A Zafira wheel? Off that one there. The tyre\'s legal. Just. Tenner."\n\nHe passes it over the counter. It can go in her car.');
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
    const before = S.spare;                                             // what you knew about it
    S.road.spare = true;
    S.spare = 'flat';                                                   // punctured: a screw in it
    pass(20);
    anger(15);
    sfx('ratchet');
    if (before === 'good') {                                            // you've only just had it mended
      note('tyre', 'The spare has been punctured as well. The one you just had mended', 'x');
      return say('The spare wheel', 'You empty the boot onto the verge, undo your lovely mended spare and heave it out.\n\nIt\'s flat. Now the spare has been punctured too.\n\nThere\'s a screw in it. You\'d left the old screw lying in the well, point up, and bolted the spare down on top of it.');
    }
    if (before === 'flat') {                                            // you knew, and never got it mended
      note('tyre', 'The spare is flat too. You knew that', 'x');
      return say('The spare wheel', 'You empty the boot onto the verge, undo the spare and heave it out.\n\nIt\'s flat, with a screw in it. You knew it was flat. You were going to get it mended.');
    }
    note('tyre', 'The spare is flat too (probably since 2019)', 'x');
    say('The spare wheel', 'You empty the boot onto the verge, undo the spare and heave it out.\n\nIt\'s flat. Completely flat. There\'s a screw in it. It has probably been flat since 2019.');
  },
  roadboot() { sfx('click'); show('boot'); },                          // open the boot: the spare, the jack, the brace
  roadtyre() {                                                          // the flat tyre: with a wheel to hand, change it
    if (S.inv.wheel) return ACTIONS.fitwheel();
    say('The flat tyre', 'Front left. Flat as a pancake, with a screw in it. Of course there\'s a screw in it.');
  },
  // the one big button on the phone: ring the recovery company; half way through, the phone dies
  recovery() {
    if (!brokenDown() || ON_RECOVERY) return;
    ON_RECOVERY = true;                                                // on the line
    sfx('buzz');
    pass(5);
    const them = (line, then) => say(RECOVERY, line, [{ label: 'OK', run: then }]);
    them('"Thank you for calling Fleengrag Car Recovery. You are number one in the queue. What\'s the problem?"', () => {   // (she never asks where you are: Steve)
      sayMe('"I\'ve got a puncture."', () => {
        them('"A puncture. Have you tried the spare?"', () => {
          sayMe(S.road && S.road.spare ? '"The spare\'s flat too."' : '"Not yet."', () => {
            them('"Not to worry. I\'ve got a truck free right now. I only need your policy num—"', phoneDies);
          });
        });
      });
    });
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
    if (inWifesCar() && !withWife() && isAsleep()) return say("The wife's car", 'She\'s fast asleep. No lift till the morning.');
    pass(15);
    sfx('car');
    if (inWifesCar()) lift().out = true;                               // she's driving (lift.js)
    show('roadside');
    sheGetsOut();                                                      // with a wheel to fit, she gets out to watch
  },
  roadtown() { pass(15); sfx('car'); show('city'); },                  // her car: from yours into town
  roadhome() { pass(15); sfx('car'); show('home'); },
  // fit the wheel: your car's back on four good tyres
  fitwheel() {
    if (!S.road || !S.inv.wheel) return;
    const from = S.inv.wheel;
    pass(30);
    anger(5);
    sfx('ratchet');
    delete S.inv.wheel;
    S.road.fitted = true;
    finishJob('tyre', `Wheel from ${from === TYRE_SHOP ? from : 'the ' + from} fitted on ${ROADSIDE}. The spare is still flat`);
    spareJob();                                                         // next: the spare, with its screw
    if (S.screen !== 'roadside') show('roadside');
    const jack = S.flags.jackLent ? 'No jack: Paul\'s still got it. A man across the road lends you his, and watches the whole time.\n\n' : '';   // Paul borrowed it
    say('The new wheel', jack + 'Jack up. The short brace, a lot of swearing, and the nuts come off. Flat one off, new one on.\n\n(The spare is still flat, with a screw in it. It needs replacing.)', [{ label: 'OK', run: sheDrivesOff }]);   // then she's off, and you drive yours home (lift.js)
  }
});

// =====================================================================
// THE FLAT SPARE: a screw in it, so it can't be pumped up; it has to be replaced.
//   S.spare: undefined (never looked), 'flat' (the screw), 'away' (at Worn Out and Tired till S.spareReady), 'good'
// =====================================================================
// A job for it, with two places to get one
function spareJob() {
  const had = findJob('spare');
  if (had && had.status === 'open') return;                             // already on the list
  if (had) { had.status = 'open'; had.leads = []; }                     // mended once already, and punctured again: the same leads, afresh
  job('spare', 'Replace the flat spare (a screw in it)', null);
  lead('spare', 'spare-yard', 'A spare off a wreck at the Scrap Yard', 'you', 'fairly sure', 'place:Scrap Yard');
  lead('spare', 'spare-shop', 'A new tyre on it at Worn Out and Tired', 'you', 'sure', 'place:Worn Out and Tired');
}
// Do you still need one? (the spare's flat, and your car's back home)
const spareWanted = () => S.spare === 'flat' && !S.road;
// Looking at it in the boot, before you've ever needed it: it's flat already. You could get it mended (Steve)
function findFlatSpare() {
  if (S.spare || S.road) return;                                        // you know about it already (or you're on the verge)
  S.spare = 'flat';
  spareJob();
}
// The tyre in your arms: held against your chest (m: his feet on screen)
//   S.spareOut: the spare, to be mended or just mended; S.wheelOut: a wheel you've bought for the one that went flat
const carryingTyre = () => !!S.spareOut || !!S.wheelOut;
function carriedTyre(m) { wheelAt(m[0] + 8, m[1] - 20, !!S.spareOut && S.spare === 'flat'); }
function wheelAt(x, y, screw) {
  disc(x, y, 9, C.tyre);
  disc(x, y, 5, C.rim);
  disc(x, y, 1, C.steel2);
  if (screw) spareScrew(x + 6, y + 4, 1);                  // the screw in it
}
// Outside the tyre shop in your own car, the flat spare still in the boot: you can get it out and bring it in
function canFetchSpare() {
  return S.place === TYRE_SHOP && S.spare === 'flat' && !S.spareOut && !S.road && !S.flags.taxi;
}
function fetchSpare() {
  if (!canFetchSpare()) return;
  pass(5);
  sfx('ratchet');
  S.spareOut = true;
  say('The spare', 'You undo it and heave it out of the boot. It\'s heavier than it looks, and filthy.');
}
// Over the counter: handed to him (give), or handed back to you. You're stood there, so you see it go (Steve)
const TYRE_HAND = { you: [104, 80], ms: 1800, give: true };
function handTyre(give) {
  S.counter = null;                                                     // the whole shop, not the close-up of him
  S.spot.place = TYRE_HAND.you.slice();
  TYRE_HAND.give = give;
  moment('tyrehand', TYRE_HAND.ms);
  sfx('thud', TYRE_HAND.ms * 0.85 / 1000);                              // it lands in their arms
  SPEAKER = keeperHead();                                               // what he says next comes from him
}
MOMENTS.tyrehand = function (p) {
  [ISO.ox, ISO.oy] = SHOP_VIEW;
  const you = P(...TYRE_HAND.you), him = P(...KEEPER_AT);
  const yours = [you[0] + 8, you[1] - 20], his = [him[0] + 2, him[1] - 24];
  const [a, b] = TYRE_HAND.give ? [yours, his] : [his, yours];
  const q = ease(Math.max(0, Math.min(1, (p - 0.2) / 0.6)));            // held a moment, across, held a moment
  wheelAt(Math.round(lerp(a[0], b[0], q)), Math.round(lerp(a[1], b[1], q) - Math.sin(q * Math.PI) * 14), TYRE_HAND.give);   // (the one you hand over has the screw in) lifted over the counter
};
// What you see when you look at it in the boot
function spareLook() {
  if (S.spare === 'flat' && !S.flags.punctured) return 'The spare, for if you ever get a flat tyre. It\'s flat. There\'s a screw in the tread.\n\nIt won\'t pump up with a hole in it. You could get it mended before you need it.';
  if (S.spare === 'flat') return 'The spare. Flat, with a screw in the tread. It won\'t pump up with a hole in it. It needs replacing.';
  if (S.spare === 'away') return 'An empty well. The spare is at Worn Out and Tired till ' + (S.spareReady > S.day ? 'tomorrow' : 'today') + '.';
  if (S.spare === 'good') return 'A good spare, at last, bolted down in its well. Touch wood.';
  return LOOKS['Spare wheel'];                                         // before the puncture: it just feels a bit soft
}
// At the Scrap Yard or Worn Out and Tired, about the spare. Returns true if that's what you talked about
function spareAt(place) {
  if (place === TYRE_SHOP && S.spare === 'away') {                      // come to collect it
    if (S.day < S.spareReady) { anger(5); say(place, '"New tyre on your wheel, like I said. Tomorrow, mate. I said tomorrow."'); return true; }
    spareMended('New tyre on the spare, from ' + TYRE_SHOP);
    S.spareOut = true;                                                   // in your arms, till you're back in the car
    closeLead('spare-collect', 'ok');
    handTyre(false);
    say(place, '"There you go. New tyre on it, pumped up."\n\nHe passes it back over the counter. It can go back in the boot.');
    return true;
  }
  if (!spareWanted()) return false;
  const yard = place === 'Scrap Yard';
  const price = yard ? 10 : 35;
  if (!yard && !S.spareOut) {                                           // you haven't brought it in: the same every time, till you come back with it
    say(place, '"A screw in your spare? Can\'t plug that, it\'s in the shoulder. New tyre on your wheel: thirty-five quid."\n\n"So where is it? In your boot? Go and get it, mate. You\'ve got to bring it in."');
    return true;
  }
  if (!spend(price)) { anger(10); say(place, declinedWords()); return true; }
  sfx('kerching');                                                     // the till
  if (yard) {                                                           // off a wreck: he hands it over, and you carry it out
    closeLead('spare-yard', 'ok');
    closeLead('spare-shop', 'skip');
    spareMended('A spare off a wreck at the Scrap Yard: £10');
    S.spareOut = true;                                                   // in your arms, till you're back in the car
    handTyre(false);
    say(place, '"A spare? Off that one. It\'s got a bit of tread left. Tenner."\n\nHe passes it over the counter. The one with the screw in is his now. He seems pleased.');
    return true;
  }
  handTyre(true);                                                       // over the counter it goes
  S.spareOut = false;
  S.spare = 'away';                                                     // a new tyre on it, tomorrow
  S.spareReady = S.day + 1;
  closeLead('spare-shop', 'ok', 'Worn Out and Tired: a new tyre on the spare, £35, ready tomorrow');
  closeLead('spare-yard', 'skip');
  lead('spare', 'spare-collect', 'Collect the spare from Worn Out and Tired (tomorrow)', 'Worn Out and Tired', 'sure', 'place:Worn Out and Tired');
  say(place, '"That\'s the one. New tyre on your wheel: thirty-five quid. Ready tomorrow."\n\nYou hand the spare over the counter.');
  return true;
}
// The spare's good again. Never had a puncture yet? Then the moment you drive off… (spareJinxed)
function spareMended(how) {
  S.spare = 'good';
  finishJob('spare', how);
  if (!S.flags.punctured) S.flags.spareJinx = true;
}
// On a flat, stuck by your car, with a little life left in the phone: all it's good for is ringing for help
const RECOVERY = 'Fleengrag Car Recovery';
let ON_RECOVERY = false;                                             // talking to them now (not saved: reload, and you can ring again)
const brokenDown = () => !!S.road && !S.road.walked && !S.flags.phoneDead;
// Mid-sentence, the screen goes black
function phoneDies() {
  S.flags.phoneDead = true;
  ON_RECOVERY = false;
  anger(10);
  sfx('nowin');
  note('tyre', `Rang ${RECOVERY}. The phone died`, 'x');
  job('phone', 'Flat battery: charge your phone', null);                // on the list
  lead('phone', 'charge', 'Charge it at your computer desk', 'the phone', 'sure', 'room');
  render();
}
// Home at last, soaked, in even heavier rain: along the pavement, up the path, and you stop outside the front door (Steve)
//   The wife's in the garden, where the sun's been out all day; she finds out when you go and find her (tellWife)
const WALKUP_MS = 6500;
const WALKUP_PATH = [[-120, 146], [49, 146], [49, 100], SPOT_HOME.home];   // along the pavement, in at the gap in the hedge, up the path
function homeSoaked() {
  pass(80);
  anger(15);
  S.road.walked = true;
  S.road.tellHer = true;
  note('tyre', 'Walked home in the rain. Splashed by a car', 'x');
  lead('tyre', 'tell-wife', 'Tell the wife about the car', 'you', 'reluctant', 'room');
  if (!isBedtime()) S.flags.sunDay = { day: S.day, till: 19 * 60 };   // (after 7 at night she's indoors in her nightie)
  S.place = null;
  S.spot.home = SPOT_HOME.home.slice();                             // where he stops: where he always stands
  moment('walkup', WALKUP_MS);
  show('home');
}
// Trudging up to the house, dripping
MOMENTS.walkup = function (p) {
  [ISO.ox, ISO.oy] = VIEW.home;
  const [x, y] = alongPath(WALKUP_PATH, p), m = P(x, y);
  man(m[0], m[1], 'trudge', MAN_SIZE.home, p * 36, SOAKED);
  soakedDrips(m, p * 260);
  inFront('home', x, y);
};
// Water running off him (n: how far it's run)
function soakedDrips(m, n) {
  for (let k = 0; k < 4; k++) rect(m[0] + 1 + k * 2, m[1] - 4 + ((n + k * 13) % 8), 1, 2, hex('#b8c4d0'));
}
// You've come to where she is, soaked: she has something to say about it
function tellWifeNow() {
  if (!soakedAtHome() || DIALOG || isAsleep()) return;
  const inGarden = S.screen === 'garden' && wifeSunbathing();
  const indoors = S.screen === 'room' && !wifeSunbathing();
  if (inGarden || indoors) tellWife();
}
function tellWife() {
  const inTheSun = S.screen === 'garden';
  if (inTheSun) S.flags.sunDay = { day: S.day, till: Math.min(S.mins + 60, 19 * 60) };   // out there for another hour
  const wet = inTheSun ? 'You\'re dripping on my lounger.' : 'You\'re dripping on the carpet.';
  const sunny = inTheSun ? 'I\'ve been out here in the sun all day.' : 'I was out in the garden in the sun all day.';
  wifeSays(`"Husband! You're SOAKED. ${wet}"`, () => {
    sayMe('"It rained. All the way home. And a car went through a puddle."', () => {
      wifeWindsYouUp();
      wifeSays(`"Rained? It has NOT rained, Husband. ${sunny} Where's the car?"`, () => {
        sayMe('"A puncture. And the spare\'s flat. And my phone died."', () => {
          wifeSays('"Of course it did."\n\n"Get a wheel from the Scrap Yard, or one of the car shops. Take my car. And put that phone on charge."\n\n"Rain. Honestly."', lendsHerCar);
        });
      });
    });
  });
}
// …and lends you her car
function lendsHerCar() {
  S.road.tellHer = false;
  closeLead('tell-wife', 'ok');
  lead('tyre', 'wheel-yard', 'A wheel from the Scrap Yard', 'the wife', 'sure', 'place:Scrap Yard');
  lead('tyre', 'wheel-shop', 'A wheel from Worn Out and Tired', 'the wife', 'fairly sure', 'place:Worn Out and Tired');
}
// The wife says something in person: a bubble from her; tap to carry on, then `then` runs
function wifeSays(line, then) {
  SPEAKER = wifeHead();
  say('The wife', line, [{ label: 'OK', run: then || (() => {}) }]);
}
// Just back from the walk home: she's out in the garden, whatever the day (only that afternoon)
function sunnyAfterTheWalk() {
  const sun = S.flags.sunDay;
  return !!sun && sun.day === S.day && S.mins < sun.till;
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
  const intoTown = target === 'city' || target.startsWith('place:');
  if (intoTown && inWifesCar() && !withWife() && isAsleep()) return 'It\'s her car, and she\'s fast asleep. No lift till the morning.';
  if (soakedAtHome() && intoTown) return `Your car is on ${ROADSIDE}, on a flat tyre. You'll have to tell the wife.`;
  return null;
}
