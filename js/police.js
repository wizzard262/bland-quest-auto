// Bland Quest Auto: the police station, letters in the mailbox, the fine, the clamp and the taxi.
// Fail the breath test and the fine comes by post the next morning: £300, pay within a week at the Post Office (fines
// have their own window there, with no queue). Day 4 unpaid: a final reminder, £450. A week unpaid: the car's clamped on
// the drive, with a note on the windscreen. Ring for a taxi (40 minutes, £15 each way), pay the lot at the Post Office in
// one visit, and when you get home a man's taking the clamp off.
//   S.fine: { day (the breath test), paid, clamped, unclamp (a man's coming to take it off) }
//   S.post: letters on their way [{ id, day }] (each comes at 8 in the morning); S.letters: in the mailbox [{ id, read }]

const POLICE = 'Police Station';
// The letter comes the next day; the reminder the day after that; two days from the letter, unpaid, the clamp (Steve)
const FINE_LATE_AFTER = 2, CLAMP_AFTER = 3;                             // days after the breath test
const FINE = 300, FINE_LATE = 450, CLAMP_FEE = 100;                    // the fine, the fine once it's late, taking the clamp off
const TAXI_FARE = 15;                                                  // each way

// ---------- what each letter says ----------
const LETTERS = {
  fine: () => ({ from: 'Police: Fixed Penalty Office', title: 'FIXED PENALTY NOTICE',
    body: `Driving over the limit, ${dateOfDay(S.fine.day)}.\n\nFixed penalty: £${FINE}.\n\nPay within 2 days, in person, at the Post Office (window 3).\n\nThe police cannot take payments.` }),
  finelate: () => ({ from: 'Police: Fixed Penalty Office', title: 'FINAL REMINDER',
    body: `Your fixed penalty has not been paid. It is now £${FINE_LATE}.\n\nPay today at the Post Office, or your vehicle will be immobilised.` }),
  junk: () => ({ from: 'We Buy Any Car (Probably)', title: 'WE WANT YOUR CAR!',
    body: 'Get a GREAT price for your Zafira today!*\n\n*£40. Collection extra. Red light, deduct £40.' }),
  mot: () => ({ from: 'Vehicle Testing', title: 'Your MOT has run out',
    body: 'Our records show your vehicle has no MOT. You must not drive it except to a booked test.\n\nYou drive it every day.' })
};
// How much you owe now (the fine, more once it's late, and the clamp on top)
function fineOwed() {
  if (!S.fine || S.fine.paid) return 0;
  const late = S.day >= S.fine.day + FINE_LATE_AFTER;
  return (late ? FINE_LATE : FINE) + (S.fine.clamped ? CLAMP_FEE : 0);
}
const carClamped = () => !!(S.fine && S.fine.clamped && !S.fine.paid);

// ---------- the post ----------
// Put a letter in the post: it comes on that day, at 8 in the morning
function post(id, day) {
  S.post = S.post || [];
  S.post.push({ id, day });
}
// Time has passed: the post comes (8am), and the fine moves on if it's unpaid (called from pass, in engine.js)
function postArrives() {
  S.post = S.post || [];
  S.letters = S.letters || [];
  for (const p of S.post.slice()) {
    if (p.day > S.day || (p.day === S.day && S.mins < 8 * 60)) continue;   // not yet
    S.post.splice(S.post.indexOf(p), 1);
    if ((p.id === 'finelate') && (!S.fine || S.fine.paid)) continue;     // paid: the reminder never comes
    S.letters.unshift({ id: p.id, read: false });
  }
  if (!S.flags.junkPosted && S.day >= 2) { S.flags.junkPosted = true; post('junk', S.day); post('mot', S.day + 1); }   // the usual post
  const carHome = typeof carAway !== 'function' || !carAway();      // (not while it's on Mill Lane or outside the pub: then it waits till it's back)
  if (S.fine && !S.fine.paid && !S.fine.clamped && carHome && S.day >= S.fine.day + CLAMP_AFTER) {   // the two days are up: clamped
    S.fine.clamped = true;
    if (findJob('fine')) note('fine', 'Two days, unpaid: the car is clamped on the drive', 'x');
  }
}
// The breath test failed: the fine's in the post (the money isn't taken there and then)
function fineIssued() {
  S.fine = { day: S.day, paid: false, clamped: false };
  post('fine', S.day + 1);
  post('finelate', S.day + FINE_LATE_AFTER);
  job('fine', 'Pay the drink-driving fine', null);
  lead('fine', 'fine-pay', 'Pay it at the Post Office (window 3)', 'the letter', 'sure', 'place:Post Office');
}

// ---------- reading the post ----------
const unreadLetters = () => (S.letters || []).filter(l => !l.read).length;
const readLetters = () => (S.letters || []).filter(l => l.read).length;
// Which letters you're looking through: new ones from the mailbox, or ones you've read from the rack on the desk (Steve).
//   The list is fixed when you pick them up, so reading one doesn't move it out from under you
function pickUpLetters(fromRack) {
  S.letterList = (S.letters || []).map((l, i) => i).filter(i => !!S.letters[i].read === fromRack);
  S.letterPage = 0;
  sfx('click');
  show('letters');
}
SCREENS.letters = {
  size: [480, 270],
  paint() {
    paintBehind();                                                     // over the street, darkened
    rect(0, 0, W, H, hex('#14101e'));
    hud();
  },
  overlay() {
    const all = (S.letterList || []).map(i => S.letters[i]).filter(Boolean);   // the ones you picked up
    const k = Math.max(0, Math.min(all.length - 1, S.letterPage || 0));
    const l = all[k];
    if (!l) return '';
    l.read = true;
    const { from, title, body } = LETTERS[l.id]();
    const nav = `<div class="pgnav">${bookFlip('letterpage', -1, k > 0)}<span>Letter ${k + 1} of ${all.length}</span>${bookFlip('letterpage', 1, k < all.length - 1)}</div>`;
    return `<div class="ov letter"><div class="lfrom">${esc(from)}</div><h3>${esc(title)}</h3><p>${esc(body).replace(/\n/g, '<br>')}</p>${nav}</div>`;
  },
  actions() { return []; }   // ◀ Back puts them down (read ones go in the rack on the desk)
};

// ---------- the clamp, on the drive ----------
// The clamp on the car's front wheel, and the note under the wiper (on the home screen, over the car)
// The car's front wheel on the side we see (the car's on the drive at 102, 72: its side 24 across, the wheel 4/5 along, 4 up)
const CLAMP_WHEEL = [126, 72 + 0.8 * 46, 4];
function drawClamp() {
  if (!carClamped()) return;                                           // (while it's coming off, the moment draws it)
  [ISO.ox, ISO.oy] = VIEW.home;
  clampOn(0);
  clampNote();
}
// The clamp on the front wheel: a yellow plate over the hub, claws over the tyre, and the lock bar sticking out
//   shake: how far it's jiggling as it comes off
function clampOn(shake) {
  const [wx, wy, wz] = CLAMP_WHEEL;
  const at = (dx, dy, dz) => { const p = P(wx + dx, wy + dy, wz + dz); return [p[0] + shake, p[1]]; };
  const yellow = C.warm, dark = C.warmDim;
  line(...at(0.5, 0, 0), ...at(0.5, 0, 4.8), yellow);                   // the arm up the wheel's face
  line(...at(0.5, 0, 4.8), ...at(-4, 0, 4.8), yellow);                  // and over the top of the tyre
  line(...at(0.5, -2.5, -3.6), ...at(0.5, 2.5, -3.6), dark);            // the foot along the bottom of the tyre
  const hub = at(0.5, 0, 0);
  disc(hub[0], hub[1], 2, yellow);                                      // the plate over the hub, so the wheel can't come off
  px(hub[0], hub[1], dark);
  pipe(...at(0.5, 0, 0), ...at(5, 0, 0), 2, yellow);                    // the bar sticking out, so you can't drive
  const lock = at(5, 0, 0);
  rect(lock[0] - 1, lock[1] - 1, 2, 3, C.ink);                          // the lock
}
// The note, tucked under the wiper
function clampNote() {
  const n = P(117, 106, 16);
  rect(n[0], n[1], 5, 4, C.white);
  rect(n[0] + 1, n[1] + 1, 3, 1, C.red);
  line(n[0] - 1, n[1] + 3, n[0] + 6, n[1] + 2, C.ink);                    // the wiper across it
}
// The clamp man's tow truck: parked in the road outside the house, nose to the right
const TOW_AT = [60, 160];                                            // its back-left corner (it's 90 long, 18 wide)
function towTruck(x, y, flash) {
  const white = hex('#e8e8e0'), stripe = C.warm, red = C.red;
  const x1 = x + 90, y1 = y + 18;
  ibox(x, y, x1, y1, 3, 7, C.ink);                                   // the chassis
  ibox(x, y, x + 62, y1, 7, 10, C.steel, C.steel2);                  // the flat bed
  ibox(x + 64, y, x1, y1, 7, 28, white);                             // the cab
  poly([P(x + 68, y1, 18), P(x + 86, y1, 18), P(x + 86, y1, 26), P(x + 68, y1, 26)], C.glass);   // its side window
  poly([P(x1, y + 2, 18), P(x1, y1 - 2, 18), P(x1, y1 - 2, 26), P(x1, y + 2, 26)], C.glass);     // its windscreen
  poly([P(x + 64, y1, 10), P(x1, y1, 10), P(x1, y1, 13), P(x + 64, y1, 13)], stripe);           // a hi-vis stripe down the side
  for (let k = 0; k < 6; k++) {                                      // red and yellow chevrons across the back
    poly([P(x, y + k * 3, 3), P(x, y + k * 3 + 3, 3), P(x, y + k * 3 + 3, 7), P(x, y + k * 3, 7)], k % 2 ? red : stripe);
  }
  ibox(x + 4, y + 7, x + 8, y + 11, 10, 26, C.steel2);               // the crane at the back
  line(...P(x + 6, y + 9, 26), ...P(x - 4, y + 9, 22), C.steel2);    // its boom
  line(...P(x - 4, y + 9, 22), ...P(x - 4, y + 9, 12), C.ink);       // the chain
  const hook = P(x - 4, y + 9, 12);
  rect(hook[0] - 1, hook[1], 2, 2, C.steel);                         // and the hook
  ibox(x + 74, y + 7, x + 80, y + 11, 28, 31, flash ? hex('#ffb020') : hex('#a06010'));   // the orange beacon on the roof
  for (const wx of [x + 12, x + 30, x + 80]) {                       // the wheels, on the side we see
    const w = P(wx, y1, 4);
    disc(w[0], w[1], 4, C.tyre);
    disc(w[0], w[1], 2, C.rim);
  }
}
// The man taking the clamp off (the moment, when you get home after paying)
MOMENTS.unclamp = function (p) {
  [ISO.ox, ISO.oy] = VIEW.home;
  towTruck(TOW_AT[0], TOW_AT[1], Math.floor(p * 26) % 2 === 0);      // his tow truck in the road, its beacon flashing
  const m = P(132, 118);
  man(m[0], m[1], p < 0.75 ? 'bend' : 'stand', 2, 0, { shirt: hex('#f8d038'), shirtDark: hex('#d8b028'), jeans: C.ink, jeansDark: C.ink, hair: C.ink });   // in a hi-vis vest
  if (p < 0.7) clampOn(Math.round(Math.sin(p * 40)));                 // the clamp, still on (coming loose)
  clampNote();                                                         // he leaves the note
};

// ---------- the police station ----------
const POLICE_LINES = [
  '"Lost something? Fill in a form. The forms are lost."',
  '"A screw in your tyre? That\'s not a crime, sir. Not yet."',
  '"Your sensor was stolen from a scrapyard car? Was it your car, sir? Then it isn\'t."',
  '"Have you seen this cat? No? Nobody has."'
];
function policeTalk() {
  if (S.fine && !S.fine.paid) return noHelp(POLICE, `"A fine? Pay it at the Post Office, sir. We don't take money. Not since… the incident."`);
  S.flags.policeTalks = (S.flags.policeTalks || 0) + 1;
  noHelp(POLICE, POLICE_LINES[(S.flags.policeTalks - 1) % POLICE_LINES.length]);
}

// ---------- paying, at the Post Office ----------
// At the Post Office with a fine to pay: window 3, no queue. Returns true if that's what happened
function payFineAtPost() {
  if (!S.fine || S.fine.paid || S.place !== 'Post Office') return false;
  const owed = fineOwed();
  const clamp = S.fine.clamped ? ` and £${CLAMP_FEE} to take the clamp off` : '';
  say('Post Office', `"Fines? Window 3, love."\n\nThat's £${owed}: the fine${clamp}.`, [
    { label: `Pay £${owed}`, run() {
      if (!spend(owed, false, true)) { anger(10); return say('Post Office', declinedWords() + '\n\n"Your bank\'s blocked it, love. Not us."'); }   // blocked: the bank can sort that (short of money, the wife pays)
      S.fine.paid = true;
      finishJob('fine', `Paid: £${owed}`);
      if (S.fine.clamped) { S.fine.unclamp = true; S.fine.clamped = false; }   // someone's on his way to take it off
      say('Post Office', '"That\'s paid. Don\'t do it again."' + (S.fine.unclamp ? '\n\n"Someone\'s on their way to take the clamp off."' : ''));
    } },
    { label: 'Not today', run() {} }
  ]);
  return true;
}

// ---------- the taxi ----------
// Drunk and locked out of your car at the pub: a taxi home. The car stays outside the pub till you fetch it (on the bus)
function taxiFromPub() {
  const paid = spend(TAXI_FARE, false, true);                                       // your card, or (blocked) the wife pays
  if (!paid) { wifeBailsOut(TAXI_FARE); sfx('kerching'); }
  carLeftAt(S.place);                                                  // the car's left where it is (lift.js)
  KEY.scratches = [];
  pass(10);                                                            // it turns up quick
  S.inside = false;                                                    // outside the pub, by the car
  moment('taxipub', TAXI_PUB_MS);                                      // the taxi pulls up, you get in, off it goes, and it all goes dark
  show('place');
  sfx('car'); sfx('door', TAXI_PUB_MS * 0.5 / 1000); sfx('car', TAXI_PUB_MS * 0.6 / 1000);
  ANIM.then = () => {                                                  // …then home
    pass(30);
    S.place = null;
    rideToHome('taxi', () => {                                         // you see it drop you off (rides.js)
      const who = paid ? '' : ' Your card was declined; the wife paid it. She said nothing. Loudly.';
      say('The taxi', `Home. £${TAXI_FARE}.${who}

"Been out celebrating, have we?"

Your car's still outside ${S.flags.carAt}. You'll have to fetch it.`);
    });
  };
}
// The taxi outside the pub: it pulls up in the far lane, he crosses to it and gets in, it drives off; then black
const TAXI_PUB_MS = 5200;
const TAXI_LANE = 98;                                                  // the far lane (your car's parked at the kerb)
MOMENTS.taxipub = function (p) {
  [ISO.ox, ISO.oy] = OUTSIDE_VIEW;
  const tx = p < 0.3 ? lerp(-320, 110, ease(p / 0.3)) : p < 0.6 ? 110 : lerp(110, 560, ease(Math.min(1, (p - 0.6) / 0.25)));   // in, wait, off (and gone)
  if (p < 0.5) {                                                       // him: stood there, then over to the taxi
    const [sx, sy] = manSpot('place');
    const q = Math.max(0, (p - 0.32) / 0.18);
    const m = P(lerp(sx, 128, q), lerp(sy, TAXI_LANE - 4, q));
    man(m[0], m[1], q > 0 && q < 1 ? 'walk' : 'stand', 2, p * 60);
  }
  drawTaxi(tx, TAXI_LANE);                                             // the taxi (rides.js)
  if (p > 0.8) fadeToBlack((p - 0.8) / 0.2);                            // and it all goes dark
};
MOMENTS.fadein = function (p) { fadeToBlack(1 - p); };                 // home: out of the dark
// Darken the whole picture: k = 0 (as it is) to 1 (black)
function fadeToBlack(k) {
  const d = img.data, keep = 1 - Math.min(1, Math.max(0, k));
  for (let i = 0; i < d.length; i += 4) { d[i] *= keep; d[i + 1] *= keep; d[i + 2] *= keep; }
}
// Your car's still outside the pub: into town on the bus to fetch it (40 minutes, £2.50)
const BUS_FARE = 2.5;
function busToCar() {
  if (S.screen === 'home') return rideFromHome('bus', busIntoTown);    // it comes, you get on, and off (rides.js)
  busIntoTown();
}
function busIntoTown() {
  spend(BUS_FARE, false, true);                                                     // (short of money, the wife pays)
  pass(40);
  const where = S.flags.carAt;
  S.place = where;                                                     // in town, where the car is
  delete S.flags.carAt;
  finishJob('fetch-car', 'Fetched the car');
  show('city');
  say('The bus', `The bus into town: £${BUS_FARE.toFixed(2)}, forty minutes, and a man eating an egg sandwich next to you.\n\nYour car's where you left it, outside ${where}.`);
}
// Home in the taxi: another £15; and if you've paid, a man's taking the clamp off
function taxiHome() {
  S.flags.taxi = false;
  spend(TAXI_FARE, false, true);
  rideToHome('taxi', droppedHome);                                     // you see it drop you off (rides.js)
}
function droppedHome() { clampComesOff(`The taxi drops you home. £${TAXI_FARE}.`); }
// Home again: if the fine's paid, a man's taking the clamp off. words: how you got home ('' says nothing if there's nothing to see)
function clampComesOff(words) {
  if (S.fine && S.fine.unclamp) {
    moment('unclamp', 2600);
    sfx('ratchet', 0.4); sfx('clink', 1.8);
    ANIM.then = () => { S.fine.unclamp = false; };
    return say('Home', `${words ? words + '\n\n' : ''}A man in a hi-vis vest is taking the clamp off. "All yours, mate." He leaves the note.`);
  }
  if (words) say('Home', words);
}
// Going somewhere while clamped: not in your car. Returns a reason, or null to go
function clampedReason(target) {
  if (!carClamped() || S.flags.taxi || withWife()) return null;
  if (target === 'city' && S.screen !== 'city') return 'It\'s clamped. A yellow clamp on the front wheel, and a note under the wiper. The wife\'s car isn\'t.';
  return null;
}

Object.assign(ACTIONS, {
  letters() { pickUpLetters(false); },                                   // the mailbox: the new post
  rack() { pickUpLetters(true); },                                       // the letter rack on the desk: the ones you've read
  letterpage(d) { S.letterPage = (S.letterPage || 0) + +d; sfx('click'); },
  clampnote() {
    say('A note under the wiper', `PENALTY UNPAID. THIS VEHICLE HAS BEEN IMMOBILISED.\n\nPay £${fineOwed()} at the Post Office, window 3.`);
  },

});
