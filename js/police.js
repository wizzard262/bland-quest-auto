// Bland Quest Auto: the police station, letters in the mailbox, the fine, the clamp and the taxi.
// Fail the breath test and the fine comes by post the next morning: £300, pay within a week at the Post Office (fines
// have their own window there, with no queue). Day 4 unpaid: a final reminder, £450. A week unpaid: the car's clamped on
// the drive, with a note on the windscreen. Ring for a taxi (40 minutes, £15 each way), pay the lot at the Post Office in
// one visit, and when you get home a man's taking the clamp off.
//   S.fine: { day (the breath test), paid, clamped, unclamp (a man's coming to take it off) }
//   S.post: letters on their way [{ id, day }] (each comes at 8 in the morning); S.letters: in the mailbox [{ id, read }]

const POLICE = 'Police Station';
const FINE = 300, FINE_LATE = 450, CLAMP_FEE = 100;                    // the fine, the fine once it's late, taking the clamp off
const TAXI_FARE = 15;                                                  // each way

// ---------- what each letter says ----------
const LETTERS = {
  fine: () => ({ from: 'Police: Fixed Penalty Office', title: 'FIXED PENALTY NOTICE',
    body: `Driving over the limit, ${dateOfDay(S.fine.day)}.\n\nFixed penalty: £${FINE}.\n\nPay within 7 days, in person, at the Post Office (window 3).\n\nThe police cannot take payments.` }),
  finelate: () => ({ from: 'Police: Fixed Penalty Office', title: 'FINAL REMINDER',
    body: `Your fixed penalty has not been paid. It is now £${FINE_LATE}.\n\nPay within 3 days at the Post Office, or your vehicle will be immobilised.` }),
  junk: () => ({ from: 'We Buy Any Car (Probably)', title: 'WE WANT YOUR CAR!',
    body: 'Get a GREAT price for your Zafira today!*\n\n*£40. Collection extra. Red light, deduct £40.' }),
  mot: () => ({ from: 'Vehicle Testing', title: 'Your MOT has run out',
    body: 'Our records show your vehicle has no MOT. You must not drive it except to a booked test.\n\nYou drive it every day.' })
};
// How much you owe now (the fine, more once it's late, and the clamp on top)
function fineOwed() {
  if (!S.fine || S.fine.paid) return 0;
  const late = S.day >= S.fine.day + 4;
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
  const carHome = typeof carStranded !== 'function' || !carStranded();   // (not while it's on a flat on Mill Lane: then it waits till it's back)
  if (S.fine && !S.fine.paid && !S.fine.clamped && carHome && S.day >= S.fine.day + 7) {   // a week, unpaid: clamped
    S.fine.clamped = true;
    if (findJob('fine')) note('fine', 'A week, unpaid: the car is clamped on the drive', 'x');
  }
}
// The breath test failed: the fine's in the post (the money isn't taken there and then)
function fineIssued() {
  S.fine = { day: S.day, paid: false, clamped: false };
  post('fine', S.day + 1);
  post('finelate', S.day + 4);
  job('fine', 'Pay the drink-driving fine', null);
  lead('fine', 'fine-pay', 'Pay it at the Post Office (window 3)', 'the letter', 'sure', 'place:Post Office');
}

// ---------- reading the post ----------
const unreadLetters = () => (S.letters || []).filter(l => !l.read).length;
SCREENS.letters = {
  size: [480, 270],
  paint() {
    paintBehind();                                                     // over the street, darkened
    rect(0, 0, W, H, hex('#14101e'));
    hud();
  },
  overlay() {
    const all = S.letters || [];
    const k = Math.max(0, Math.min(all.length - 1, S.letterPage || 0));
    const l = all[k];
    if (!l) return '';
    l.read = true;
    const { from, title, body } = LETTERS[l.id]();
    const nav = `<div class="pgnav">${bookFlip('letterpage', -1, k > 0)}<span>Letter ${k + 1} of ${all.length}</span>${bookFlip('letterpage', 1, k < all.length - 1)}</div>`;
    return `<div class="ov letter"><div class="lfrom">${esc(from)}</div><h3>${esc(title)}</h3><p>${esc(body).replace(/\n/g, '<br>')}</p>${nav}</div>`;
  },
  actions() { return [{ label: 'Put them down', act: 'go:home' }]; }
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
  if (S.fine && !S.fine.paid) return say(POLICE, `"A fine? Pay it at the Post Office, sir. We don't take money. Not since… the incident."`);
  S.flags.policeTalks = (S.flags.policeTalks || 0) + 1;
  say(POLICE, POLICE_LINES[(S.flags.policeTalks - 1) % POLICE_LINES.length]);
}

// ---------- paying, at the Post Office ----------
// At the Post Office with a fine to pay: window 3, no queue. Returns true if that's what happened
function payFineAtPost() {
  if (!S.fine || S.fine.paid || S.place !== 'Post Office') return false;
  const owed = fineOwed();
  const clamp = S.fine.clamped ? ` and £${CLAMP_FEE} to take the clamp off` : '';
  say('Post Office', `"Fines? Window 3, love. Nobody's ever in this queue."\n\nThat's £${owed}: the fine${clamp}.`, [
    { label: `Pay £${owed}`, run() {
      if (!spend(owed)) { anger(10); return say('Post Office', 'Card declined.\n\n"Your bank\'s blocked it, love. Not us."'); }   // blocked: the bank can sort that (short of money, the wife pays)
      S.fine.paid = true;
      sfx('beep');
      finishJob('fine', `Paid: £${owed}`);
      if (S.fine.clamped) { S.fine.unclamp = true; S.fine.clamped = false; }   // someone's on his way to take it off
      say('Post Office', '"That\'s paid. Don\'t do it again."' + (S.fine.unclamp ? '\n\n"Someone\'s on their way to take the clamp off."' : ''));
    } },
    { label: 'Not today', run() {} }
  ]);
  return true;
}

// ---------- the taxi ----------
// Clamped: ring for a taxi. 40 minutes, then it takes you into town
function ringTaxi() {
  if (!carClamped()) return say('Ringing for a taxi', '"Where are you going? Your car\'s right there."');
  const paid = spend(TAXI_FARE);                                      // your card, if it works…
  if (!paid) wifeBailsOut(TAXI_FARE);                                  // …or, blocked, the wife pays (so you're never stuck at home)
  pass(40);
  S.flags.taxi = true;
  S.place = null;
  show('city');
  const chat = S.flags.taxiChat ? '' : '\n\n"Zafira? My brother-in-law had one. Gearbox went. Never again."';
  S.flags.taxiChat = true;
  const who = paid ? '' : ' Your card\'s declined; the wife pays it, and says nothing. Loudly.';
  say('The taxi', `Forty minutes later, a taxi. £${TAXI_FARE}.${who}` + chat);
}

// Home in the taxi: another £15; and if you've paid, a man's taking the clamp off
function taxiHome() {
  S.flags.taxi = false;
  spend(TAXI_FARE);
  if (S.fine && S.fine.unclamp) {
    moment('unclamp', 2600);
    sfx('ratchet', 0.4); sfx('clink', 1.8);
    ANIM.then = () => { S.fine.unclamp = false; };
    return say('Home', `The taxi drops you home. £${TAXI_FARE}.\n\nA man in a hi-vis vest is taking the clamp off. "All yours, mate." He leaves the note.`);
  }
  say('Home', `The taxi drops you home. £${TAXI_FARE}.`);
}
// Going somewhere while clamped: not in your car. Returns a reason, or null to go
function clampedReason(target) {
  if (!carClamped() || S.flags.taxi) return null;
  if (target === 'city' && S.screen !== 'city') return 'It\'s clamped. A yellow clamp on the front wheel, and a note under the wiper. Ring for a taxi.';
  return null;
}

Object.assign(ACTIONS, {
  letters() { S.letterPage = 0; sfx('click'); show('letters'); },
  letterpage(d) { S.letterPage = (S.letterPage || 0) + +d; sfx('click'); },
  clampnote() {
    say('A note under the wiper', `PENALTY UNPAID. THIS VEHICLE HAS BEEN IMMOBILISED.\n\nPay £${fineOwed()} at the Post Office, window 3.`);
  },
  taxi() { ringTaxi(); }
});
