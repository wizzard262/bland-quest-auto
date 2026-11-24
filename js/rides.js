// Bland Quest Auto: the taxi and the bus, seen outside your house.
//   rideFromHome(kind, then): it comes along, stops, you walk over and get in, and off it goes with you in it; then `then`
//   rideToHome(kind, then):   it comes along, stops, you get out and walk up the drive, and off it goes; then `then`
//   kind: 'taxi' or 'bus'

const RIDE_MS = 8500;                                                  // the whole thing
const RIDE_IN = 0.3, RIDE_OFF = 0.66;                                  // how far through: it's stopped; it sets off again
const RIDE_LANE = 151;                                                 // the near lane, at the kerb
const TAXI_COLOUR = hex('#f8d038');
const RIDES = {
  taxi: { stopX: 64, door: 24 },                                       // where it stops (its back end), and how far along it the door is
  bus: { stopX: -58, door: 84 }
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
  sfx('door', RIDE_MS * 0.4 / 1000);
  sfx('car', RIDE_MS * RIDE_OFF / 1000);
  moment('homeride', RIDE_MS);
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
  const { kind, home } = RIDE, { stopX } = RIDES[kind];
  let x = stopX;                                                       // stopped
  if (p < RIDE_IN) { const q = p / RIDE_IN; x = lerp(-520, stopX, 1 - (1 - q) * (1 - q)); }   // coming, and slowing down
  else if (p > RIDE_OFF) { const q = (p - RIDE_OFF) / (1 - RIDE_OFF); x = stopX + q * q * 800; }   // and away
  const walked = Math.max(0, Math.min(1, (p - RIDE_IN - 0.04) / (RIDE_OFF - RIDE_IN - 0.08)));   // his walk, while it's stopped
  const path = rideWalk(home ? DRIVE_END : manSpot('home'), kind);
  const route = home ? path.slice().reverse() : path;
  const inIt = home ? p < RIDE_IN + 0.04 : walked >= 1;                 // you can't see him: he's in it
  if (!inIt) {
    const m = P(...alongPath(route, walked));
    man(m[0], m[1], walked > 0 && walked < 1 ? 'walk' : 'stand', MAN_SIZE.home, p * 90);
    inFront('home', ...alongPath(route, walked));                      // behind your car: it hides him
  }
  rideVehicle(kind, x);                                                // at the kerb, in front of him
};
