// Bland Quest Auto: the taxi and the bus, seen outside your house.
//   rideFromHome(kind, then): it comes along, stops, you walk over and get in, and off it goes with you in it; then `then`
//   rideToHome(kind, then):   it comes along, stops, you get out and walk up the drive, and off it goes; then `then`
//   kind: 'taxi' or 'bus'

const RIDE_LANE = 151;                                                 // the near lane, at the kerb
const TAXI_COLOUR = hex('#f8d038');
// ms: the whole thing; stops, leaves: how far through it's stopped, and sets off again
// stopX: where it stops (its back end); door: how far along it the door is
// waiting: he's at the stop by the time it comes, so he's straight on (the bus: Steve); otherwise he walks over once it's stopped
const RIDES = {
  taxi: { ms: 8500, stops: 0.3, leaves: 0.66, stopX: 64, door: 24 },
  bus: { ms: 3800, stops: 0.42, leaves: 0.58, stopX: -58, door: 84, waiting: true }
};
const DRIVE_END = [96, 96];                                            // where he ends up: on the drive
let RIDE = null;                                                       // the one happening now: { kind, home: is it bringing him home? }

// The taxi: a yellow saloon, its lights on at night
function drawTaxi(x, y, s = 1) {
  isoCar(x, y, s, TAXI_COLOUR, { alongX: true, shape: 'saloon', lights: true });
}
// A single-decker bus, pointing along x
function isoBus(x, y) {
  const len = 96, wide = 20, red = hex('#c83030');
  for (const wx of [18, 76]) { const w = P(x + wx, y + wide, 4); ellipse(w[0], w[1], 5, 6, C.tyre); ellipse(w[0], w[1], 2, 3, C.steel); }
  ibox(x, y, x + len, y + wide, 4, 38, red);
  onLeft(y + wide, x, x + len, 4, 8, shade(red, 0.6));                  // its skirt
  for (let k = 0; k < 6; k++) onLeft(y + wide, x + 5 + k * 15, x + 17 + k * 15, 19, 32, C.glass);   // the windows down its side
  onRight(x + len, y + 2, y + wide - 2, 16, 30, C.glass);               // the windscreen
  onRight(x + len, y + 4, y + wide - 4, 31, 36, C.ink);                 // where it's going: town
  onRight(x + len, y + 6, y + wide - 6, 32, 35, C.warm);
  for (const ly of [y + 1, y + wide - 4]) {                             // its headlights, on at night
    onRight(x + len, ly, ly + 3, 8, 11, C.white);
    OUR_LAMPS.push({ pts: [P(x + len, ly, 8), P(x + len, ly + 3, 8), P(x + len, ly + 3, 11), P(x + len, ly, 11)], seed: 1, cracked: false });
  }
}
function rideVehicle(kind, x) {
  if (kind === 'bus') return isoBus(x, RIDE_LANE);
  drawTaxi(x, RIDE_LANE);
}
// The way between where he is and its door: out through the gap in the hedge, along the pavement
function rideWalk(spotAt, kind) {
  const door = [RIDES[kind].stopX + RIDES[kind].door, 147];
  if (spotAt[1] > 138) return [spotAt, door];                          // on the pavement already
  const gap = spotAt[0] > 73 ? 100 : 49;                                // down the drive, or down the path
  return [spotAt, [gap, Math.max(spotAt[1], 118)], [gap, 146], door];
}
function rideStart(kind, home, then) {
  RIDE = { kind, home };
  sfx('car');
  const { ms, stops, leaves } = RIDES[kind];
  sfx('door', ms * (stops + 0.1) / 1000);
  sfx('car', ms * leaves / 1000);
  moment('homeride', ms);
  ANIM.then = then;
  show('home');
}
const rideFromHome = (kind, then) => rideStart(kind, false, then);
function rideToHome(kind, then) {
  S.spot.home = DRIVE_END.slice();
  rideStart(kind, true, then);
}
MOMENTS.homeride = function (p) {
  [ISO.ox, ISO.oy] = VIEW.home;
  const { kind, home } = RIDE, { stopX, stops, leaves, waiting } = RIDES[kind];
  let x = stopX;                                                       // stopped
  if (p < stops) { const q = p / stops; x = lerp(-520, stopX, 1 - (1 - q) * (1 - q)); }   // coming, and slowing down
  else if (p > leaves) { const q = (p - leaves) / (1 - leaves); x = stopX + q * q * 800; }   // and away
  const walkFrom = waiting ? 0 : stops + 0.04, walkTill = waiting ? stops : leaves - 0.04;   // his walk: to the stop as it comes, or over to it while it's stopped
  const walked = Math.max(0, Math.min(1, (p - walkFrom) / (walkTill - walkFrom)));
  const path = rideWalk(home ? DRIVE_END : manSpot('home'), kind);
  const route = home ? path.slice().reverse() : path;
  const stoppedYet = p > stops + 0.04;
  const inIt = home ? !stoppedYet : walked >= 1 && stoppedYet;         // you can't see him: he's in it
  if (!inIt) {
    const m = P(...alongPath(route, walked));
    man(m[0], m[1], walked > 0 && walked < 1 ? 'walk' : 'stand', MAN_SIZE.home, p * 90);
    inFront('home', ...alongPath(route, walked));                      // behind your car: it hides him
  }
  rideVehicle(kind, x);                                                // at the kerb, in front of him
};
