// Bland Quest Auto: the wife gives you a lift.
// While your car's on a flat on Mill Lane, or clamped on the drive, she drives you about in hers (S.lift.out: she's out with you in it).
//   She moans the whole way, from the car, on the town map and outside every shop; every few moans, she says what to do.
//   At home: tap her car; she walks out, says you'll have to hurry (a hair appointment), and you both get in.
//   In town she stays in the car. Back at your car with a wheel, she gets out and watches (S.road.watching).
//   Wheel on (S.road.fitted): "See you at home. Don't go to the pub", and she drives off; you drive your own car home.

// Is she out with you, in her car?
function lift() {
  if (!S.lift) S.lift = {};
  return S.lift;
}
const withWife = () => inWifesCar() && !!lift().out;
// What she's wearing to go out
const outfit = () => S.wifeLook || 'navy';

// Where she is while she's walking to her car at home (null: she isn't); not saved
const HER_RIDE = { at: null };
const LIFT_OUT = [[46, 66], [46, 98], [-6, 98]];                       // out of the front door, down the path, across to her car
const LIFT_IN = [[-6, 98], [-20, 112], [-66, 112], [-66, 92]];         // round the front of it, to the driver's side (behind it)
const LIFT_MS = { out: 3200, in: 3000, getOut: 3200, off: 6500 };
// At Mill Lane: her car, where she gets out of it (the road side), and where she stands to watch
const HER_CAR_AT = [-60, 72];
const WATCH_AT = [10, 56];
const GET_OUT = [[-40, 102], [-12, 102], [-12, 60], WATCH_AT];
const WATCH_LINES = [
  '"Is it meant to wobble like that?"',
  '"Dad could do that in five minutes, Husband."',
  '"My hair appointment, Husband."',
  '"You\'ve got oil on your face. And your shirt. And the pavement."'
];

// Somebody shouting out of the house, seen from outside: the bubble points at an upstairs window
function houseVoice() {
  [ISO.ox, ISO.oy] = VIEW.home;
  return P(72, 60, 40);
}

// ---------- getting in, at home ----------
// Tap her car: she comes out. (Late at night she's asleep: no lift)
function herLift() {
  const alarmLift = alarmWentOff() && S.mins < 7 * 60;                 // up at 5 with the alarm: she's up too, and not pleased
  if (isAsleep() && !alarmLift) return say("The wife's car", 'She\'s fast asleep. No lift till the morning.');
  sfx('door');
  moment('liftout', LIFT_MS.out);
  ANIM.then = () => {
    HER_RIDE.at = LIFT_OUT[LIFT_OUT.length - 1].slice();
    if (alarmLift) wifeWindsYouUp();
    const line = alarmLift ? '"It\'s five in the morning, Husband. FIVE. Get in."' : lift().hurried ? '"Come on, then. Quick. I\'ve still got that hair appointment."' : '"We\'ll have to hurry, Husband. I\'ve got a hair appointment."';
    lift().hurried = true;
    wifeSays(line, bothGetIn);
  };
}
// Round to the driver's door, and in; you get in the other side; off into town
function bothGetIn() {
  HER_RIDE.at = null;
  sfx('door', LIFT_MS.in * 0.8 / 1000);
  sfx('door', LIFT_MS.in * 0.9 / 1000);
  moment('liftin', LIFT_MS.in);
  ANIM.then = () => {
    sfx('car');
    show('city');
  };
  render();
}
// One step of her walking along a path (p: how far, 0 to 1)
function wifeWalks(path, p, t) {
  const here = alongPath(path, p), next = alongPath(path, Math.min(1, p + 0.03));
  const facing = p < 1 ? facingFor(here, next) : 'front';
  wife(here[0], here[1], outfit(), { walk: p < 1 ? t * 9 : undefined, facing });
  return here;
}
MOMENTS.liftout = function (p, t) {
  [ISO.ox, ISO.oy] = VIEW.home;
  wifeWalks(LIFT_OUT, p, t);
};
MOMENTS.liftin = function (p, t) {
  [ISO.ox, ISO.oy] = VIEW.home;
  if (p < 0.9) {                                                       // you, waiting by the passenger door, till you get in
    const [x, y] = manSpot('home'), m = P(x, y);
    man(m[0], m[1], 'stand', MAN_SIZE.home);
    inFront('home', x, y);
  }
  if (p >= 0.8) return;                                                // she's in
  const [hx, hy] = wifeWalks(LIFT_IN, p / 0.8, t);
  inFront('home', hx, hy);                                             // behind her car, it hides her
};
// Each frame at home: her, stood by her car while she has her say
function liftWaiting() {
  if (!HER_RIDE.at || ANIM) return;
  [ISO.ox, ISO.oy] = VIEW.home;
  wife(HER_RIDE.at[0], HER_RIDE.at[1], outfit(), { facing: 'front', hip: true });
}

// ---------- at your car, on Mill Lane ----------
// You've arrived with a wheel: she gets out to watch
function sheGetsOut() {
  S.road.watching = false;
  if (!withWife() || !S.inv.wheel) return;                             // nothing to watch: she stays in the car
  sfx('door');
  moment('liftgetout', LIFT_MS.getOut);
  ANIM.then = () => { S.road.watching = true; };
}
MOMENTS.liftgetout = function (p, t) {
  [ISO.ox, ISO.oy] = ROAD_VIEW;
  wifeWalks(GET_OUT, p, t);
};
// Her and her car on the roadside (called as it's painted, before your car is drawn)
function herOnTheRoadside() {
  const drivingOff = ANIM && ANIM.kind === 'liftoff';                  // (the moment draws them)
  if (!strandedLift() || drivingOff) return;
  isoCar(HER_CAR_AT[0], HER_CAR_AT[1], 1, WIFE_CAR, { alongX: true, shape: 'city' });   // hers, parked behind yours
  if (!S.road.watching) return;
  wife(WATCH_AT[0], WATCH_AT[1], outfit(), { facing: 'front', hip: true });
  spot('Talk to the wife', isoArea(WATCH_AT[0] - 4, WATCH_AT[1] - 4, WATCH_AT[0] + 4, WATCH_AT[1] + 4, 0, 40), 'act:wifewatch');
}
// The wheel's on: she has her last word, gets back in, and off she goes
function sheDrivesOff() {
  S.road.watching = true;
  wifeWindsYouUp();
  wifeSays('"See you at home, Husband. Don\'t go to the pub."', () => {
    sfx('door', LIFT_MS.off * 0.45 / 1000);
    sfx('car', LIFT_MS.off * 0.5 / 1000);
    moment('liftoff', LIFT_MS.off);
    ANIM.then = () => {                                                // your own car again: get in, and drive it home
      S.road = null;
      lift().out = false;
    };
    render();
  });
}
MOMENTS.liftoff = function (p, t) {
  [ISO.ox, ISO.oy] = ROAD_VIEW;
  const walking = Math.min(1, p / 0.45);                               // back to her car…
  const driving = Math.max(0, (p - 0.5) / 0.5);                        // …and away
  const out = Math.min(1, driving / 0.25);                             // pulling out round your car
  const carX = HER_CAR_AT[0] + driving * driving * 520;
  const carY = HER_CAR_AT[1] + out * 28;
  isoCar(carX, carY, 1, WIFE_CAR, { alongX: true, shape: 'city' });
  if (walking < 1) wifeWalks(GET_OUT.slice().reverse(), walking, t);
};

// ---------- moaning, from the car ----------
// What she says when it's the flat tyre, and when it's the clamp
const MOANS_TYRE = [
  '"I\'m not a taxi, Husband."', '"My appointment\'s at two. It\'s gone two."', '"There\'s mud on my mats. Is that your mud?"',
  '"You\'re not putting that tyre on my seats."', '"My sister\'s husband can change a tyre."', '"How long does it take to buy a wheel?"',
  '"I told you to scrap it. I told you on Tuesday."', '"This is my day off."', '"Don\'t touch my radio."'
];
const MOANS_CLAMP = [
  '"Clamped. On our own drive."', '"The whole street saw that clamp. Ken took a photo."', '"You wouldn\'t have a fine if you\'d stayed out of the pub."',
  '"My mother warned me about you."', '"I\'m not a taxi, Husband."', '"That fine was the holiday."', '"My hair, Husband. Look at it."', '"I could have married a plumber."'
];
// Every few moans: what you should be doing
function whatToDo() {
  if (S.road && S.inv.wheel) return `"You\'ve got your wheel. Your car\'s the one flashing on ${ROADSIDE}. Go and fit it."`;
  if (S.road) return S.flags.yardNumber && !S.yardSlot ? `"Get a wheel. ${TYRE_SHOP}. Or ring the Scrap Yard and book a slot."` : `"Get a wheel, Husband. ${TYRE_SHOP}, or the Scrap Yard."`;
  if (S.fine && !S.fine.paid) {
    if (S.place === 'Post Office' && S.mins < PO_OPENS) return '"Stay in that queue till it opens at nine. Then straight to window three."';
    return '"Pay that fine at the Post Office. Set the alarm for five and be in the queue before it opens, or you\'ll be there all day."';
  }
  return '"It\'s paid. Take me home, Husband. They\'ll take the clamp off."';
}
const MOAN_EVERY = 3;                                                  // every third one is what to do
const MOAN_TIMES = { first: 2500, gap: 6000, stays: 5000 };            // ms: before the first; between them; how long each stays up
let MOAN = { text: null, at: 0 };                                      // the one up now, and when it went up (or came down)
// Can she be heard now? In her car, on the town map or parked outside somewhere, with nothing else going on
function canMoan() {
  if (window.NO_MOANS || !withWife() || DIALOG || ANIM || document.hidden) return false;
  return S.screen === 'city' || (S.screen === 'place' && !S.inside);
}
// Where her car is on the screen (for the bubble's arrow)
function herCarOnScreen() {
  if (S.screen === 'place') {
    [ISO.ox, ISO.oy] = OUTSIDE_VIEW;
    return P(62, 84, 20);
  }
  const here = Math.max(0, placeIndex(S.place || 'Home'));
  [ISO.ox, ISO.oy] = [S.cam.ox, S.cam.oy];
  return P((here % 7) * BLOCK + STREET + 30, Math.floor(here / 7) * BLOCK + STREET + 78, 10);
}
function nextMoan() {
  const l = lift();
  l.moans = (l.moans || 0) + 1;
  if (l.moans % MOAN_EVERY === 0) return whatToDo();                   // helpful, for once
  wifeWindsYouUp();
  const list = S.road ? MOANS_TYRE : MOANS_CLAMP;
  return list[(l.moans - 1 - Math.floor(l.moans / MOAN_EVERY)) % list.length];
}
// The bubble on the page (you don't have to tap it: it goes on its own, and doesn't get in the way)
function moanHtml() {
  if (!MOAN.text || !canMoan()) return '';
  const [x, y] = herCarOnScreen();
  if (x < 0 || x > W || y < 30 || y > H) return '';                    // her car's off the screen
  const left = Math.max(18, Math.min(82, x / W * 100)), tail = 50 + (x / W * 100 - left) / 32 * 100;
  return `<div class="moan" style="left:${left}%;top:${y / H * 100}%;--tail:${tail}%">${MOAN.text}</div>`;
}
// Twice a second: time for another, or time this one went?
function moanTick() {
  const now = performance.now();
  if (!canMoan()) {
    if (MOAN.text) { MOAN = { text: null, at: now }; stage.querySelectorAll('.moan').forEach(el => el.remove()); }
    else if (!withWife()) MOAN.at = now - MOAN_TIMES.gap + MOAN_TIMES.first;   // the first one comes soon after you set off
    return;
  }
  if (MOAN.text && now - MOAN.at > MOAN_TIMES.stays) { MOAN = { text: null, at: now }; return render(); }
  if (MOAN.text || now - MOAN.at < MOAN_TIMES.gap) return;
  MOAN = { text: nextMoan(), at: now };
  speakChatter('The wife', MOAN.text);
  render();
}
setInterval(moanTick, 500);

// ---------- fetching you from the pub ----------
// Her car turns up behind yours, she gets out and has her say, and you both leave in it. Yours stays outside the pub: you
// have to fetch it later (the bus). IF she'd driven you there (yours on Mill Lane), it's her car that's already outside.
const FETCH_MS = { come: 7000, wait: 3500, go: 8000 };
const fetchCarAt = () => inWifesCar() ? [40, 72] : [-6, 72];            // where her car stands
// Round from the driver's door (the road side), behind her car, along the pavement to him
function fetchPath() {
  const [fx] = fetchCarAt();
  return [[fx + 14, 104], [fx - 10, 104], [fx - 10, 58], PICKUP_AT];
}
function wifePicksUp() {
  pass(20);
  const here = inWifesCar();                                           // sat outside in it already
  if (!here) sfx('car');
  sfx('door', (here ? 0.2 : FETCH_MS.come * 0.5) / 1000);
  moment('pubfetch', here ? FETCH_MS.wait : FETCH_MS.come);
  ANIM.then = () => {
    S.flags.pickup = S.day;                                            // she stands by him while she has her say
    SPEAKER = wifeHead();
    say('The wife', '"NOT AGAIN, GET IN!"', [{ label: 'OK', run: bothLeavePub }]);
  };
  render();
}
// You both get into her car, and off
function bothLeavePub() {
  sfx('door', FETCH_MS.go * 0.5 / 1000);
  sfx('door', FETCH_MS.go * 0.55 / 1000);
  sfx('car', FETCH_MS.go * 0.58 / 1000);
  moment('publeave', FETCH_MS.go);
  ANIM.then = takenHome;
  render();
}
// The cars at the kerb (hers at x, y), with anyone on the pavement behind them drawn first
function pubKerb(x, y, behind, inFrontOf) {
  if (behind) behind();
  isoCar(x, y, 1, WIFE_CAR, { alongX: true, shape: 'city' });
  if (!inWifesCar()) drivenCar(40, 72, 1);                             // yours, parked
  if (y > 80) isoCar(x, y, 1, WIFE_CAR, { alongX: true, shape: 'city' });   // hers is out in the road: in front of yours
  if (inFrontOf) inFrontOf();
}
MOMENTS.pubfetch = function (p, t) {
  [ISO.ox, ISO.oy] = OUTSIDE_VIEW;
  const [fx, fy] = fetchCarAt();
  const arriving = inWifesCar() ? 1 : Math.min(1, p / 0.45);            // along the road, slowing…
  const pullIn = Math.max(0, (arriving - 0.7) / 0.3);                   // …and in to the kerb
  const x = lerp(-420, fx, ease(arriving)), y = lerp(fy + 24, fy, pullIn);
  const walked = inWifesCar() ? p : (p - 0.5) / 0.5;
  if (walked <= 0) return pubKerb(x, y);
  const her = () => wifeWalks(fetchPath(), Math.min(1, walked), t);
  const onPavement = alongPath(fetchPath(), Math.min(1, walked))[1] < 72;
  pubKerb(fx, fy, onPavement ? her : null, onPavement ? null : her);
};
MOMENTS.publeave = function (p, t) {
  [ISO.ox, ISO.oy] = OUTSIDE_VIEW;
  const [fx, fy] = fetchCarAt();
  const walked = Math.min(1, p / 0.5), off = Math.max(0, (p - 0.58) / 0.42);   // to the car; then away
  if (walked >= 1) {
    const out = Math.min(1, off / 0.3);                                // pulling out round yours
    return pubKerb(fx + off * off * 620, fy + out * 26);
  }
  const herPath = fetchPath().reverse();
  const him = alongPath([manSpot('place'), [fx + 16, 58], [fx + 16, 64]], walked);   // to the passenger door (the kerb side), weaving
  const drawHim = () => {
    const m = P(him[0] + Math.sin(p * 40) * 3, him[1]);
    man(m[0], m[1], 'walk', 2, p * 60);
  };
  const onPavement = alongPath(herPath, walked)[1] < 72;
  const her = () => wifeWalks(herPath, walked, t);
  pubKerb(fx, fy, () => { drawHim(); if (onPavement) her(); }, onPavement ? null : her);
};
// Your car's been left somewhere: it goes on the list, till you've fetched it
function carLeftAt(place) {
  S.flags.carAt = place;
  const j = job('fetch-car', 'Fetch the car', null);
  j.status = 'open';
  j.title = `Fetch the car (it's outside ${place})`;
  lead('fetch-car', 'fetch-bus', 'The bus into town', 'you', 'sure', 'city');
  j.leads.forEach(l => { l.status = 'open'; });
}

Object.assign(ACTIONS, {
  // she's watching you change the wheel: tap her
  wifewatch() {
    S.road.watchTalks = (S.road.watchTalks || 0) + 1;
    wifeWindsYouUp();
    wifeSays(WATCH_LINES[(S.road.watchTalks - 1) % WATCH_LINES.length]);
  }
});
