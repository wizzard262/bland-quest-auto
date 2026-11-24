// Bland Quest Auto: charging your flat phone (Steve).
// At the computer desk there's a box of chargers, wires hanging out of the top. Tap it and you're close up on the dead
// phone with five plugs to try, like the diagnostic port in the car: HDMI, DisplayPort, USB (the right one), eyeFone, and
// one for a 1996 Nokia. The right one in: the battery fills up bar by bar, in about five seconds. Then tap off the phone.

// ---------- the box on the desk (on the computer's screen, bottom right) ----------
const CHARGER_BOX = [372, 228, 70, 38];                               // x, y, w, h
function chargerBox([x, y, w, h]) {
  const wires = [C.ink, C.white, C.ink, hex('#8a909a'), C.red];
  wires.forEach((col, k) => {                                        // wires, up out of the top and hanging down the front
    const wx = x + 8 + k * 13, drop = 8 + hash(k, 41) * 16;
    pipe(wx, y, wx + 3, y - 7 - (k % 2) * 3, 2, col);                // up…
    pipe(wx + 3, y - 7 - (k % 2) * 3, wx + 8, y - 2, 2, col);        // …over…
    pipe(wx + 8, y - 2, wx + 8, y + drop, 2, col);                   // …and down
    rect(wx + 6, y + drop, 5, 5, col);                               // the plug on its end
  });
  rect(x, y + 6, w, h - 6, CARDBOARD);                               // the box
  rect(x, y + 6, w, 2, shade(CARDBOARD, 1.15));                      // its top edge
  rect(x, y + h - 2, w, 2, shade(CARDBOARD, 0.8));
  text('CHARGERS', x + (w - textW('CHARGERS')) / 2, y + 20, C.ink);
  wires.forEach((col, k) => {                                        // the ends hanging over the front of it
    const wx = x + 8 + k * 13, drop = 8 + hash(k, 41) * 16;
    if (k % 2) return;
    pipe(wx + 8, y + 4, wx + 8, y + Math.min(drop, 13), 2, col);
    rect(wx + 6, y + Math.min(drop, 13), 5, 4, col);
  });
}
// On the desk: the box, and tapping it
function chargerBoxOnDesk() {
  chargerBox(CHARGER_BOX);
  const [x, y, w, h] = CHARGER_BOX;
  spot('A box of chargers', [x, y - 10, w, h + 10], 'act:chargers');
}
// While the phone's flat, the box pulses
SCREENS.pc.animate = function (t) {
  if (!S.flags.phoneDead) return;
  const [x, y, w, h] = CHARGER_BOX;
  pulseGlow(t, x, y + 6, w, h - 6);
  chargerBox(CHARGER_BOX);
};

// ---------- close up: the phone, and five plugs ----------
// Each plug: [id, its name, where it lies, what you say when it doesn't fit]
const CHARGER_PLUGS = [
  ['hdmi', 'HDMI', 44, 'HDMI. Wide as a letterbox. That\'s for the telly.'],
  ['dp', 'DisplayPort', 120, 'DisplayPort. Like HDMI, but nobody has ever asked for one.'],
  ['eyefone', 'eyeFone', 196, 'An eyeFone plug. So close. It doesn\'t fit anything that isn\'t an eyeFone, or last year\'s eyeFone.'],
  ['usb', 'USB', 272, null],
  ['nokia', '1996 Nokia', 348, 'A little round one, for a 1996 Nokia. The Nokia is in a drawer somewhere. It\'s still on 80%.']
];
const CHARGE_PHONE = [196, 26, 88, 134];                            // the phone: x, y, w, h (its socket is in the bottom edge)
const CHARGE_REST = 192;                                             // how far down the plugs lie (their tips)
const CHARGE_IN = CHARGE_PHONE[1] + CHARGE_PHONE[3] - 8;             // a plug's tip, pushed home
const CHARGE_TOUCH = CHARGE_PHONE[1] + CHARGE_PHONE[3] + 1;          // a plug's tip, up against the socket
const CHARGE_MIDDLE = CHARGE_PHONE[0] + CHARGE_PHONE[2] / 2;
const CHARGE_BOX = [400, 214, 76, 50];                               // the box, bottom right: every lead runs back into it
const CHARGE_MS = 5000, CHARGE_BARS = 10;                            // how long it takes to fill, in this many bars
const CHARGE_DESK = hex('#9a7048');
let CHARGE_TRY = null;                                               // the plug being tried now: { id, x, fits }
let CHARGE_T0 = null;                                                // when it started charging (performance.now())
let CHARGE_SHOWN = 0;                                                // how many bars you've seen fill up

// One plug, its metal end pointing up: cx, its tip's top; homeX: where its lead lies on the desk
function chargerPlug(id, cx, top, homeX) {
  const metal = hex('#c8ccd4'), k = CHARGER_PLUGS.findIndex(p => p[0] === id);
  const body = id === 'eyefone' ? C.white : id === 'nokia' ? hex('#4a4a52') : C.ink;
  const tipH = 12, bodyTop = top + tipH, bodyH = 24;
  const leadY = 238 + k * 5;                                         // each lead has its own line along the desk
  pipe(cx, bodyTop + bodyH, homeX, leadY, 2, body);                  // the lead, down to the desk…
  pipe(homeX, leadY, CHARGE_BOX[0] + 2, leadY, 2, body);             // …and along it, back into the box
  if (id === 'hdmi') poly([[cx - 15, top], [cx + 15, top], [cx + 15, top + 7], [cx + 11, bodyTop], [cx - 11, bodyTop], [cx - 15, top + 7]], metal);   // wide, its bottom corners cut off
  if (id === 'dp') poly([[cx - 13, top], [cx + 13, top], [cx + 13, bodyTop], [cx - 8, bodyTop], [cx - 13, top + 6]], metal);   // wide, one corner cut off
  if (id === 'usb') { rbox(cx - 8, top, 16, tipH, 3, metal); rect(cx - 5, top + 2, 10, 2, C.greyDark); }   // narrow, rounded, hollow
  if (id === 'eyefone') { rect(cx - 5, top, 10, tipH, C.white); for (let n = 0; n < 4; n++) rect(cx - 4 + n * 2, top + 2, 1, 7, C.warmDim); }   // a thin tongue with gold lines
  if (id === 'nokia') { rect(cx - 2, top, 5, tipH, metal); disc(cx, top + 1, 2, metal); }   // a round pin
  const bw = id === 'hdmi' ? 38 : id === 'dp' ? 34 : id === 'usb' ? 24 : 18;
  rbox(cx - bw / 2, bodyTop, bw, bodyH, 3, body);                    // the plastic you hold
  rect(cx - bw / 2 + 3, bodyTop + 3, bw - 6, 1, shade(body.map(v => v + 30), 1));
}
// The phone, face up: black, its socket in the bottom edge
function chargerPhone() {
  const [x, y, w, h] = CHARGE_PHONE;
  rbox(x - 2, y - 2, w + 4, h + 4, 8, C.greyDark);
  rbox(x, y, w, h, 6, C.ink);
  rect(x + w / 2 - 14, y + 5, 28, 2, C.grey);                        // the speaker
  rect(x + 8, y + 14, w - 16, h - 32, hex('#06080c'));               // the screen
  rbox(CHARGE_MIDDLE - 9, y + h - 6, 18, 8, 3, hex('#5a5e68'));      // the socket: narrow and rounded, like the USB plug
  rbox(CHARGE_MIDDLE - 7, y + h - 5, 14, 5, 2, hex('#000004'));
}
// The battery on its screen, so many bars full
function chargerBattery(bars) {
  const [x, y, w] = CHARGE_PHONE, bx = x + 20, by = y + 40, bw = w - 40, bh = 66;
  const col = bars ? hex('#40d060') : C.red;
  rect(bx + bw / 2 - 8, by - 5, 16, 5, C.ui);                        // its terminal
  rect(bx, by, bw, bh, C.ui); rect(bx + 2, by + 2, bw - 4, bh - 4, hex('#06080c'));   // its outline
  for (let k = 0; k < bars; k++) rect(bx + 4, by + bh - 9 - k * 6, bw - 8, 5, col);   // the bars, from the bottom up
  const words = bars * 10 + '%';
  text(words, x + w / 2 - textW(words), y + 18, bars ? col : C.red, 2);
}
// How many bars it's got to now
function chargerBars() {
  if (!S.flags.phoneDead) return CHARGE_BARS;                        // done
  if (CHARGE_T0 === null) return 0;                                  // not plugged in
  return Math.min(CHARGE_BARS, Math.floor((performance.now() - CHARGE_T0) / CHARGE_MS * CHARGE_BARS));
}
const usbIn = () => CHARGE_T0 !== null;                              // the right one's pushed home
SCREENS.charger = {
  size: [480, 270],
  paint() {
    grime(0, 0, W, H, CHARGE_DESK, 0.08, 71);                        // the desk
    LABELS.push('<div class="ov phoneoff" data-act="chargeraway"></div>');   // tap off the phone to leave
    chargerPhone();
    chargerBattery(chargerBars());
    for (const [id, name, x] of CHARGER_PLUGS) {
      if (CHARGE_TRY && CHARGE_TRY.id === id) continue;              // being tried: the moment draws it
      const home = id === 'usb' && usbIn();
      chargerPlug(id, home ? CHARGE_MIDDLE : x, home ? CHARGE_IN : CHARGE_REST, x);
      if (!usbIn()) spot(name + ': try it', [x - 34, CHARGE_REST - 4, 68, 44], 'act:trycharger:' + id);
    }
    if (usbIn()) chargerPhoneEdge();
    chargerBox(CHARGE_BOX);
    const words = !S.flags.phoneDead ? 'Charged. Tap anywhere off the phone to put it in your pocket.' : usbIn() ? 'That\'s the one. Charging…' : 'Dead. Which of these fits? Tap a plug to try it.';
    tip('Your phone', words, 1, 4);
    LABELS.push(`<a class="go" data-act="nothing" style="left:${CHARGE_PHONE[0] / W * 100}%;top:${CHARGE_PHONE[1] / H * 100}%;width:${CHARGE_PHONE[2] / W * 100}%;height:${CHARGE_PHONE[3] / H * 100}%"></a>`);   // tapping the phone itself does nothing
  },
  animate() {
    if (!usbIn()) return;
    const bars = chargerBars();
    if (bars > CHARGE_SHOWN) { CHARGE_SHOWN = bars; sfx('click'); }  // a click for each bar
    chargerPhone();
    chargerBattery(bars);
    chargerPlug('usb', CHARGE_MIDDLE, CHARGE_IN, 272);
    chargerPhoneEdge();
    chargerBox(CHARGE_BOX);
  },
  backAct() { return 'chargeraway'; },
  actions() { return []; }
};
// The phone's bottom edge, over the end of a plug that's in
function chargerPhoneEdge() {
  const [x, y, w, h] = CHARGE_PHONE;
  rect(x + 8, y + h - 8, w - 16, 5, C.ink);
}
// The moment: the plug goes up to the phone. The right one slides in; a wrong one won't go, jiggles, and drops back
MOMENTS.chargertry = function (p) {
  if (!CHARGE_TRY) return;
  const { id, x, fits } = CHARGE_TRY;
  let cx = CHARGE_MIDDLE, top = CHARGE_TOUCH;
  if (p < 0.45) {                                                    // up to the socket
    const q = ease(p / 0.45);
    cx = lerp(x, CHARGE_MIDDLE, q); top = lerp(CHARGE_REST, CHARGE_TOUCH, q);
  } else if (fits) top = lerp(CHARGE_TOUCH, CHARGE_IN, ease(Math.min(1, (p - 0.45) / 0.3)));   // and in
  else if (p < 0.75) cx += Math.sin(p * 90) * 4;                     // it won't go: a jiggle
  else {                                                             // and back down where it was
    const q = ease((p - 0.75) / 0.25);
    cx = lerp(CHARGE_MIDDLE, x, q); top = lerp(CHARGE_TOUCH, CHARGE_REST, q);
  }
  chargerPlug(id, cx, top, x);
  if (fits) chargerPhoneEdge();
  chargerBox(CHARGE_BOX);
};
SCREEN_ENTER.charger = () => { CHARGE_TRY = null; CHARGE_T0 = null; CHARGE_SHOWN = 0; };

Object.assign(ACTIONS, {
  nothing() {},
  // the box on the desk
  chargers() {
    if (!S.flags.phoneDead) return say('A box of chargers', 'Every charger you\'ve ever owned, and several you haven\'t, in one knot. Your phone doesn\'t need charging.');
    show('charger');
  },
  // try a plug in the phone
  trycharger(id) {
    if (usbIn()) return;
    const plug = CHARGER_PLUGS.find(k => k[0] === id);
    if (!plug) return;
    const [, name, x, wrong] = plug;
    CHARGE_TRY = { id, x, fits: !wrong };
    pass(2);
    moment('chargertry', 1400);
    sfx('slip', 0.7);
    ANIM.then = () => {
      CHARGE_TRY = null;
      if (wrong) { anger(3); return say(name, wrong); }
      chargeStart();
    };
  },
  // off the phone: away from the desk's box, back to the computer (not while it's charging)
  chargeraway() {
    if (usbIn() && S.flags.phoneDead) return;
    back();
  }
});
// The right one's in: five seconds to full
function chargeStart() {
  const began = performance.now();
  CHARGE_T0 = began;
  CHARGE_SHOWN = 0;
  sfx('ding');
  setTimeout(() => { if (CHARGE_T0 === began) chargeDone(); }, CHARGE_MS);
  render();
}
function chargeDone() {
  S.flags.phoneDead = false;
  finishJob('phone', 'Charged at the computer desk. The fourth plug');
  pass(30);
  sfx('bell');
  render();
}
