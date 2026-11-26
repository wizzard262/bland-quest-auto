// Bland Quest Auto: the game engine.
// Holds the game state (time, money, anger, jobs, leads, things you own), moves between screens,
// shows dialogs and the action buttons, and saves the game in the browser.
// The story itself (who says what, what each action does) lives in story.js.

// =====================================================================
// STATE
// =====================================================================
const VERSION = 'v115';                                                // shown after the tagline, at the top and on the title screen: one more with every commit (Steve)
const START_MONEY = 140;                                              // it runs out part way, so you have to go and see Mum & Dad, or Paul (Steve)
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const SAVE_KEY = 'thankless-task-save-v1';                         // (the game's old name: kept, so saved games still load)

// A brand-new game
function freshState() {
  return {
    day: 1, mins: 8 * 60,              // day 1 is a Tuesday; minutes since midnight
    money: START_MONEY, anger: 10,
    screen: 'home', place: null,       // where you are; place = the city place you're at
    app: 'Forum',                      // the app open on the computer
    key: 0,                            // ignition: 0 off, 1, 2 (lights on), 3 start
    cam: { ox: 520, oy: -175 },        // where the city map is scrolled to (near home)
    inv: {},                           // things you own
    flags: {},                         // what has happened
    jobs: [],                          // the notebook
    msgs: [],                          // texts on the phone
    mails: [],                         // emails on the computer
    parcels: [],                       // on their way: { item, dueDay }
    doorstep: [],                      // parcels waiting by the front door
    events: {},                        // timed events already fired
    hunches: {},                       // hunches already given
    history: []                        // screens visited, for Back
  };
}
let S = freshState();
let DIALOG = null;                     // the dialog box on screen (not saved)
let SPEAKER_FOR = null;               // whose next line SPEAKER is for (null: whoever says the next thing)
let SPEAKER = null;                    // [x, y] picture position of whoever is talking: the next dialog is their speech bubble
const PHONE_VOICE = [240, 104];        // on the phone screen, where their voice comes out: the phone

// =====================================================================
// TIME, MONEY, ANGER
// =====================================================================
// Minutes since the start of day 1
const now = () => (S.day - 1) * 1440 + S.mins;
const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const weekday = () => DAYS[S.day % 7];
// The car radio: the code typed so far, which place is picked, unlocked yet, on or off, which station
const RADIO_CODE = '1234';
function radioState() {
  if (!S.radio) S.radio = { digits: [null, null, null, null], pos: 0, unlocked: false, on: false, station: 0 };   // older saves didn't have one
  return S.radio;
}
function clockText() { return `${weekday()} ${hhmm(S.mins)}   DAY ${S.day}   £${Math.max(0, Math.floor(S.money))}${S.cash > 0 ? `  CASH £${Math.floor(S.cash)}` : ''}`; }

// Let time pass; fires any timed events and parcel deliveries on the way
function pass(mins) {
  const dayBefore = S.day;
  S.mins += mins;
  while (S.mins >= 1440) { S.mins -= 1440; S.day += 1; }
  if (S.day !== dayBefore) poStayedOvernight();                   // a night outside the post office: first in the queue
  postArrives();                                                   // the post comes at 8; an unpaid fine moves on (police.js)
  deliverParcels();
  runEvents();
}
// The phone and the notebook show over the screen you were on (darkened), not a screen of their own
function paintBehind() {
  const prev = [...(S.history || [])].reverse().find(k => k !== 'phone' && k !== 'notebook');
  if (!prev || !SCREENS[prev]) return rect(0, 0, W, H, C.greyDark);
  try { SCREENS[prev].paint(); }                                  // the picture you were looking at…
  catch (e) { rect(0, 0, W, H, C.greyDark); }                     // (or plain grey if it can't be drawn now)
  LABELS = [];                                                    // …but nothing on it can be tapped
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) { d[i] *= 0.4; d[i + 1] *= 0.4; d[i + 2] *= 0.45; }   // …and dimmed
}
// Jump to tomorrow morning (going to bed)
//   wake: when (8 in the morning, unless the alarm's set)
function sleepUntilMorning(wake = 8 * 60) {
  soberUp();                                                       // slept it off (story.js)
  const laterTonight = wake < 8 * 60 && S.mins < wake;            // in bed after midnight, with the alarm set: it goes off the same night
  if (!laterTonight) S.day += 1;
  S.mins = wake;
  const calmer = comforted();                                      // a night's sleep calms you (not when only a pint will do: extras.js)
  if (calmer) S.anger = Math.max(0, S.anger - 20);
  postArrives();                                                   // the morning post (police.js)
  deliverParcels();
  runEvents();
  return calmer;                                                    // did it help?
}
// Not enough money: the wife pays it (so you're never stuck), with a text; she keeps count. Returns true: it's paid
function wifeBailsOut(amount) {
  S.flags.wifePaid = (S.flags.wifePaid || 0) + 1;                  // how many times she's had to
  anger(10);
  const lines = [`Your card didn't have it, so I've paid the £${amount.toFixed(2).replace('.00', '')}. Again.`, `I've paid the £${amount.toFixed(2).replace('.00', '')}. That was for the holiday.`, `Paid. Again. We're a team, Husband. A team with no money.`];
  textMsg('The wife', lines[(S.flags.wifePaid - 1) % lines.length]);   // you're a team: she doesn't keep count, but she's not happy
  return true;
}
// Spend money; false if the card's blocked, or there isn't enough and Mum & Dad or Paul could help (go and see them: Steve).
// Once they've helped all they can, the wife pays (so you're never stuck)
//   treat: something you only want (a pint): she won't pay for that
//   must: it has to be paid now (a fine, a taxi, the bus): she pays straight away
function spend(amount, treat = false, must = false) {
  const paid = takeMoney(amount, treat, must);                     // did it go through?
  if (paid) sfx('kerching');                                       // every purchase: kerching (Steve)
  return paid;
}
// The same, with no sound (spend plays the kerching)
function takeMoney(amount, treat = false, must = false) {
  if (cardDeclined(amount)) return payCash(amount);                // the card's blocked (bank.js): cash, if you've got enough on you
  if (S.money < amount) {                                          // not enough in the account
    if (treat) return false;                                       // (not for beer)
    const familyCanHelp = mumCanHelp() || !S.flags.paulLent;
    if (must || !familyCanHelp) return wifeBailsOut(amount);
    S.flags.shortOf = amount;                                      // you need this much
    skintJob();                                                    // it goes on the list: who to see
    return false;
  }
  S.money -= amount;
  if (typeof skintJob === 'function') skintJob();                  // running low: it goes on the list (story.js)
  return true;
}
// Change anger; at 100 you kick something and break it
function anger(n) {
  if (n > 0) { ANGER_UP = performance.now(); sfx('angerup'); }  // going up: a rising tone, and the bar shakes
  S.anger = Math.max(0, Math.min(100, S.anger + n));
}
// Angry enough to lose it? You do, as soon as nothing else is going on (called at the end of every render): never in the
// middle of something, or the two would trip over each other and leave you stuck
function loseItIfDue() {
  if (S.anger < 100 || ANIM || DIALOG || STILL || QUEUE.length) return;
  kickSomething();
}
// Something that gets you nowhere: no answer, no help, no use, no light (Steve)
const FRUSTRATION = 4;
function frustrated() { anger(FRUSTRATION); }
// Somebody says something that's no help: it winds you up, and up it comes (Steve)
function noHelp(title, body, options) {
  frustrated();
  say(title, body, options);
}
// A journey for nothing: the shop's shut, or the Post Office queue's out of the door (Steve)
const WASTED_TRIP = 8;
// The wife says something that's no help: that winds you up (Steve)
const WIFE_NO_HELP = 5;
function wifeWindsYouUp() { anger(WIFE_NO_HELP); }
function kickSomething() {
  if (typeof breakSomething === 'function') return breakSomething();   // you break something on the car (extras.js)
  const broken = ['the wheelie bin', 'the garage door', 'your toolbox', 'the recycling', 'your own foot'];
  const thing = broken[(S.day + S.mins) % broken.length];
  S.anger = 50;
  moment('kick', 1300); sfx('kick');
  queueDialog('You kick ' + thing, `You've had enough. You kick ${thing}. It doesn't help.`);
}

// =====================================================================
// THE NOTEBOOK: jobs, notes and leads
// =====================================================================
// Find a job by id
const findJob = id => S.jobs.find(j => j.id === id);
// Add a job (once); parent = the job it belongs under
function job(id, title, parent) {
  if (findJob(id)) return findJob(id);
  const j = { id, title, parent: parent || null, status: 'open', notes: [], leads: [], at: now() };
  S.jobs.push(j);
  return j;
}
// Write a line under a job: kind = 'ok' (worked), 'x' (dead end) or 'info'
function note(jobId, textLine, kind = 'info') {
  const j = findJob(jobId);
  if (j) j.notes.push({ text: textLine, kind });
}
// Add a lead (once): something to try, who said it, how sure they were, and where it takes you
function lead(jobId, id, textLine, who, sure, go) {
  const j = findJob(jobId);
  if (!j || j.leads.some(l => l.id === id)) return;
  j.leads.push({ id, text: textLine, who, sure, go, status: 'open' });
}
// Close a lead: 'ok' it helped, 'x' dead end, 'skip' no longer needed; adds a note saying how it went
function closeLead(id, outcome, noteText) {
  for (const j of S.jobs) {
    const l = j.leads.find(x => x.id === id);
    if (!l || l.status !== 'open') continue;
    l.status = outcome;
    if (noteText) note(j.id, noteText, outcome === 'ok' ? 'ok' : 'x');
  }
}
const leadOpen = id => S.jobs.some(j => j.leads.some(l => l.id === id && l.status === 'open'));
const leadExists = id => S.jobs.some(j => j.leads.some(l => l.id === id));
// Finish a job; its other open leads aren't needed any more
function finishJob(id, noteText) {
  const j = findJob(id);
  if (!j || j.status !== 'open') return;
  j.status = 'done';
  if (noteText) note(id, noteText, 'ok');
  for (const l of j.leads) if (l.status === 'open') l.status = 'skip';
}
// The job shown at the top of the screen: the newest open job with nothing open beneath it
function topJob() {
  const open = S.jobs.filter(j => j.status === 'open');
  const leaves = open.filter(j => !open.some(k => k.parent === j.id));
  leaves.sort((a, b) => b.at - a.at);
  return leaves[0] || open[0] || null;
}

// =====================================================================
// PHONE AND EMAIL
// =====================================================================
function textMsg(from, body) { S.msgs.unshift({ from, body, when: clockText(), read: false }); sfx('buzz'); sfx('msgtone', 0.05); }
function mail(from, subject) { S.mails.unshift({ from, subject, when: `${weekday()} ${hhmm(S.mins)}` }); }

// =====================================================================
// PARCELS AND TIMED EVENTS
// =====================================================================
// When an order turns up, in words: 'tomorrow (Wed), about 10am'
function arrivesWhen(days) {
  const day = DAYS[(S.day + days) % 7];
  return days === 1 ? `tomorrow (${day}), about 10am` : `in ${days} days (${day}), about 10am`;
}
// Order something: it arrives at 10:00, `days` days from now
function order(item, days, from) {
  S.parcels.push({ item, dueDay: S.day + days, from });
  textMsg(from, `Thanks for your order: ${ITEMS[item].name}. It arrives ${arrivesWhen(days)}.`);   // every order: a text to say when (Steve)
  mail(from, `Your order has been dispatched — estimated delivery ${DAYS[(S.day + days) % 7]}`);
}
function deliverParcels() {
  for (const p of S.parcels.slice()) {
    const due = (p.dueDay - 1) * 1440 + 10 * 60;
    if (now() < due) continue;
    S.parcels.splice(S.parcels.indexOf(p), 1);
    S.doorstep.push(p);
    textMsg('Courier', `Your parcel from ${p.from} has been delivered: left by the front door.`);
  }
}
// Fire story events whose time has come (each once)
function runEvents() {
  for (const ev of EVENTS) {
    if (S.events[ev.id]) continue;
    if (now() < (ev.day - 1) * 1440 + ev.mins) continue;
    if (ev.when && !ev.when()) continue;
    S.events[ev.id] = true;
    ev.run();
  }
}

// =====================================================================
// GETTING STUCK: waiting an hour (the watch) gives you a hunch
// =====================================================================
// Find an open job with no open leads and no open jobs beneath it, and give its hunch (once each). Returns true if there was one
function giveHunch() {
  const open = S.jobs.filter(j => j.status === 'open');
  const stuck = open.filter(j => !j.leads.some(l => l.status === 'open') && !open.some(k => k.parent === j.id));
  stuck.sort((a, b) => b.at - a.at);
  for (const j of stuck) {
    const h = HUNCHES[j.id];
    if (!h || S.hunches[j.id]) continue;
    S.hunches[j.id] = true;
    h();
    return true;
  }
  return false;
}

// =====================================================================
// MOVING ROUND: screens, places in town, apps on the computer
// =====================================================================
// Where a lead or a tap can take you: 'garage', 'place:Name', 'app:Forum'
function goTo(target) {
  if (target.startsWith('act:')) return act(target.slice(4));
  if (S.road && !S.road.walked && S.screen === 'city' && target === 'home') return show('roadside');   // stranded, and somehow in town: back to the car on Mill Lane
  const stuck = strandedReason(target);                               // your car's on a flat on Mill Lane
  if (stuck) return say('Your car', stuck);
  if (S.flags.carAt && CAR_SCREENS.includes(target)) return say('Your car', `Your car's still outside ${S.flags.carAt}.`);   // left at the pub (police.js)
  if (S.flags.drunkHome && target === 'city') return say('The bus', 'You\'d never make it up the step. Best go in and sleep it off.');   // just home from the pub, drunk
  if (S.flags.carAt && target === 'city' && S.screen !== 'city' && !S.flags.taxi) return busToCar();   // into town on the bus, to fetch it
  if (target === 'city' && S.screen === 'home' && inWifesCar()) return herLift();   // her car: she comes out and drives you (lift.js)
  const clamped = clampedReason(target);                              // clamped on the drive: not going anywhere in it (police.js)
  if (clamped) return say('Your car', clamped);
  if (target === 'home' && S.flags.taxi) { S.place = 'Home'; show('home'); return taxiHome(); }   // home in the taxi
  if (S.screen === 'place' && (target === 'city' || target === 'home' || target.startsWith('place:')) && spareJinxed()) return;   // the spare's just been mended: bang (road.js)
  if (target === 'home' && punctureOnTheWayHome()) return;           // now and then, on the way home: a puncture
  if (target.startsWith('place:')) return visit(target.slice(6));
  if (target.startsWith('app:')) { S.app = target.slice(4); return show('pc'); }
  if (target === 'phone' && CALL) return answerCall();                // the phone's ringing: tapping it answers
  if (target === 'garage' && S.screen === 'home') return garageDoorUp();   // from outside: the roller door goes up first
  if (target === 'city' && S.screen !== 'city' && !inWifesCar() && !carPowered()) return say('The car', 'Nothing. It will not start. Not a light, not a click. A battery lead is still off.');   // no power: going nowhere
  if (target === 'city' && S.screen !== 'city' && isDrunk() && !inWifesCar()) return noKeys();   // too drunk to drive: she's hidden the keys
  if (target === 'city' && S.screen === 'place' && !S.inside && placeStyle(S.place) === 'pub' && boozeNow() > 0 && !inWifesCar()) return drunkAtCar();   // had a drink: a taxi, or try to drive (story.js)   // had a drink or three: get the key in the door first
  show(target);
}
// The garage's roller door rattles up, then you're inside
let GARAGE_OPENING = null;                                         // when the garage door started going up (performance.now())
function garageDoorStart() { if (!GARAGE_OPENING) { GARAGE_OPENING = performance.now(); sfx('rollerdoor'); } }
function garageDoorUp() {
  garageDoorStart();
  const left = 1150 - (performance.now() - GARAGE_OPENING);         // it started as you tapped; you go in once it's up
  const goIn = () => { GARAGE_OPENING = null; show('garage'); };
  if (left < 40) return goIn();
  moment('garagedoor', left);
  ANIM.then = goIn;
}
// Show a screen, remembering where you came from
function show(screen) {
  if (screen !== S.screen) S.history.push(S.screen);
  if (S.history.length > 30) S.history.shift();
  if (screen === 'city' && S.screen !== 'city') { travelFrom(); camOnPlace(S.place || 'Home'); }   // into town: the map centred on where your car is
  if (screen === 'home' && S.place) { pass(20); S.place = null; }
  if (['city', 'room', 'garage'].includes(screen)) delete S.flags.wifeOut;   // she only follows him round the front of the house
  if (inWifesCar() && screen === 'city') lift().out = true;         // she's driving you about (lift.js)…
  const backHome = ['home', 'room', 'garage', 'garden'].includes(screen);
  const droppedOff = backHome && lift().out;                        // …till you're home
  if (backHome) { lift().out = false; if (S.road) S.road.watching = false; }
  S.screen = screen;
  if (SCREEN_ENTER[screen]) SCREEN_ENTER[screen]();
  render();
  if (droppedOff && S.fine && S.fine.unclamp) clampComesOff('');    // the fine's paid: the clamp's coming off (police.js)
  tellWifeNow();                                                  // come in soaked from the walk home: she has something to say (road.js)
}
function back() {
  const prev = S.history.pop() || 'home';
  const outFromUnder = S.screen === 'under' && prev === 'garage';  // out from under the car, into the garage
  S.screen = prev;
  if (outFromUnder && nutGetsAway()) return;                        // the dropped nut gets away (story.js)
  render();
}
// Leaving the house or garage for town
function travelFrom() { /* the car is always ready; the trip is charged when you pick a place */ }
// Go to a place in town: the trip costs 20 minutes
function visit(name) {
  if (name === 'Home') {
    if (S.flags.taxi) { S.place = 'Home'; show('home'); return taxiHome(); }   // home in the taxi (police.js)
    if (punctureOnTheWayHome()) return;                              // now and then, on the way home: a puncture
    S.place = 'Home';
    return show('home');
  }
  const jam = name === 'Post Office' ? poJam() : null;             // the post office in the morning: the roadworks
  if (inWifesCar() && name !== 'Home') lift().out = true;          // she's driving you (lift.js)
  pass(jam ? jam.mins : 20);
  S.place = name;
  if (S.screen !== 'place') S.history.push(S.screen);
  S.screen = 'place';
  sfx('car');
  arriveAt(name);
  if (jam) {                                                       // held up: cross, and told why
    anger(10);
    sfx('hornnear', 0.3);
    return say('Traffic', jam.words);
  }
  render();
}

// =====================================================================
// DIALOGS
// =====================================================================
// Show a dialog: options = [{ label, run }]; with no options there's an OK button
function say(title, body, options) {
  const at = SPEAKER && (!SPEAKER_FOR || SPEAKER_FOR === title) ? SPEAKER : null;   // a speech bubble from the person talking (not for narration)
  SPEAKER_FOR = null;
  SPEAKER = null;
  const spoken = !!at || saidAloud(title, body);                       // someone talking: they chatter when it comes up (voiceDialog)
  const from = at || (spoken ? voiceAt() : null);                      // all speech is a bubble: from them, or where their voice comes from (Steve)
  DIALOG = { title, body, at: from, spoken, options: options && options.length ? options : [{ label: 'OK', run: () => {} }] };
  render();
}
// Where you are, when you're not drawn on this screen (a counter close-up, a shelf, the phone): low down on the left
const offScreenMe = () => [W * 0.22, H - 2];
// Where someone else's voice comes from, when nobody has said: the phone, the shopkeeper, or someone off to the right
function voiceAt() {
  if (S.screen === 'phone') return PHONE_VOICE;                        // on the phone: out of the phone
  const inShop = S.screen === 'place' && S.inside;                     // in a shop, the pub, or at someone's door
  if (inShop) return keeperHead();                                     // whoever's behind the counter
  return [W * 0.78, H - 2];                                            // somebody not drawn here: low down on the right, clear of you
}
// Messages that tell you what happens and then have someone speak, part of the way through
const TELL_THEN_TALK = ['The taxi', 'Home', 'Blue lights', 'Dad', 'Café'];
// Is somebody talking in this message (with no bubble)? Their words are in quotes
function saidAloud(title, body) {
  if (title === 'The posters') return false;                          // quotes, but nobody's talking
  if (body.trim().startsWith('"')) return true;                       // it opens with what they say
  const talkLater = title.startsWith('Ringing') || TELL_THEN_TALK.includes(title);   // on the phone, or one of those above
  return talkLater && body.includes('"');
}
// The message now on screen: if somebody's talking, their chatter, once
function voiceDialog() {
  if (!DIALOG.spoken || DIALOG.voiced) return;
  DIALOG.voiced = true;
  speakChatter(DIALOG.title, DIALOG.body);
}
// Two voices: a man's (everyone, by default) and a woman's (Steve)
const MALE_VOICE = 120, FEMALE_VOICE = 290;
// Who talks in the woman's voice: by the name over what they say
const FEMALE_SPEAKERS = ['The wife', 'Ringing the wife', 'Mum', 'Mum & Dad', 'Ringing Mum', 'Ringing Mum & Dad', 'Post Office', 'Parts 4 Less', "Auntie Jean", 'Fleengrag Car Recovery'];   // (the Post Office and Parts 4 Less: a woman behind the counter)
function voicePitch(who) {
  const female = FEMALE_SPEAKERS.includes(who);                       // one of the women?
  return female ? FEMALE_VOICE : MALE_VOICE;                           // otherwise the man's voice
}
// The garbled speech sound for someone saying `body` (longer speeches chatter longer)
function speakChatter(who, body) {
  const syllables = Math.min(28, 4 + Math.round(body.length / 7));
  chatter(syllables, voicePitch(who));
}
// Something you say: a speech bubble from your own head; tap anywhere to carry on, then `then` runs (their answer)
function sayMe(line, then) {
  DIALOG = { title: 'You', body: line, at: meHead() || offScreenMe(), spoken: true, options: [{ label: 'OK', run: then || (() => {}) }] };   // (you talk in the man's voice too)
  render();
}
// A dialog with nothing to choose (just OK) carries on with a tap anywhere: no OK button needed
const justCarryOn = d => d.options.length === 1 && d.options[0].label === 'OK';
// A dialog to show after the current one (e.g. kicking something)
const QUEUE = [];
function queueDialog(title, body) { QUEUE.push({ title, body }); }

// =====================================================================
// ACTIONS: everything you can do is an action id; story.js says what each does
// =====================================================================
function act(id) {
  const cut = id.indexOf(':');
  const name = cut < 0 ? id : id.slice(0, cut);           // the action
  const arg = cut < 0 ? undefined : id.slice(cut + 1);    // what it acts on (may contain ':')
  const fn = ACTIONS[name];
  if (!fn) return say('Hmm', 'Nothing happens.');
  fn(arg);
  save();
  render();
}

// =====================================================================
// SAVE AND LOAD (in this browser only)
// =====================================================================
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* private window: no saving */ } }
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const renamed = raw.split('Breakers Yard').join('Scrap Yard');   // saved before the Breakers Yard was renamed the Scrap Yard
      const tyres = renamed.split('the Tyre Place').join(TYRE_SHOP).split('Tyre Place').join(TYRE_SHOP);   // …and before the Tyre Place was renamed
      S = Object.assign(freshState(), JSON.parse(tyres));
      delete S.flags.onFloor;                                          // reloaded while asleep on the floor: he's up
      if (S.road && S.road.spareOn) S.road = { spare: false, walked: false, second: true };   // reloaded as you drove off on the spare: the second flat
      if (S.road && S.road.fitted) S.road = null;                      // reloaded as the wife was driving off (lift.js): she's gone
      if (S.flags.sensorOut) S.flags.boxOff = true;                    // saved before the sensor came off in its box: the box is off too
      if (S.inv.headlight) { addLamp('left'); delete S.inv.headlight; }  // saved before spare headlights went on the shelf
      if (S.inv['headlight-r']) { addLamp('right'); delete S.inv['headlight-r']; }
      for (const j of S.jobs) if (j.status === 'open' && /^(broke-(mirror|lens|stay|wiper)|kicked-)/.test(j.id)) j.status = 'done';   // saved when anger broke more than the headlights
      return true;
    }
  } catch (e) { /* nothing saved or storage blocked */ }
  return false;
}
function newGame() {
  S = freshState();
  DIALOG = null;
  STORY_START();
  save();
  render();
}

// =====================================================================
// DRAWING THE PAGE
// =====================================================================
const stage = document.getElementById('stage');
const actsBar = document.getElementById('acts');

// What the strip along the top shows
function hudInfo() {
  const j = topJob();
  return {
    clock: clockText(),
    task: j ? j.title.toUpperCase().slice(0, 64) : 'NOTHING… FOR NOW',
    anger: S.anger,
    booze: boozePercent(),                                         // how drunk: 0 to 100 (story.js)
    unread: S.msgs.filter(m => !m.read).length
  };
}

let BG = null;                          // the still picture of this screen; moving things are drawn on a copy of it

function render() {
  if (S.screen !== 'shelf') S.book = null;                         // leaving the shelf puts any book back
  if (S.screen !== 'toolbox') S.drawer = 0;                        // and leaving the tool chest pushes its drawer shut
  const scr = SCREENS[S.screen];
  // paint the still picture, and keep a copy for the moving things to be drawn over
  [W, H] = scr.size || [480, 270];
  canvas.width = W; canvas.height = H;
  useImage(ctx.createImageData(W, H));                             // a fresh picture (and its fast 32-bit view)
  LABELS = [];
  OUR_LAMPS = [];
  HUD_SHOWN = false;                                                // the screen's paint says if it has the strip                                                   // the car's cracked headlights on this screen (the paint finds them)
  canvas.style.transform = S.screen === 'rage' && RAGE.mirror ? 'scaleX(-1)' : '';   // kicking the right headlight: the whole scene mirrored
  scr.paint();
  showSky();                                                       // the garden's sky and sun, behind the picture (screens.js)
  BG = img.data.slice();
  drawFrame(performance.now());
  // real-text labels, tap areas and any overlay (computer, phone, notebook)
  stage.querySelectorAll('.ov, .moan, .lbl, .tip, .zl, .go, .hs, .lab, .front, .spine, .lid, .scr, .back, .dlg, .basket, .anger, .hbcover, .partno').forEach(el => el.remove());
  stage.insertAdjacentHTML('beforeend', LABELS.join(''));
  if (scr.overlay) stage.insertAdjacentHTML('beforeend', scr.overlay());
  stage.insertAdjacentHTML('beforeend', moanHtml());               // the wife, moaning from her car (lift.js)
  if (STILL) stage.insertAdjacentHTML('beforeend', stillHtml());   // a big still, flashed up over everything
  if (scr.after) scr.after();                                     // anything that needs the page laid out first (the notebook's pages)
  const atPlace = ['place', 'room', 'garden', 'garage', 'dash', 'rage', 'phone', 'breath', 'roadside', 'notebook'].includes(S.screen);   // (the notebook: tap off it)   // (no Back from the roadside: it led into town, stuck)   // shops, house, garage, computer, car: you leave by a door (or Get up); no Back button
  const ownBack = scr.backAct ? scr.backAct() : null;            // a screen's own way back, on the same ◀ Back button (the counter: back into the shop)
  if (ownBack) stage.insertAdjacentHTML('beforeend', `<button class="back" data-act="${ownBack}">◀ Back</button>`);
  else if (S.screen !== 'home' && !atPlace) stage.insertAdjacentHTML('beforeend', '<button class="back" data-back="1">◀ Back</button>');   // one ◀ Back everywhere (Steve: no "Step back")
  // the action buttons under the picture
  const acts = scr.actions ? scr.actions() : [];
  actsBar.innerHTML = acts.map(a => `<button data-act="${a.act}"${a.pulse ? ' class="pulse"' : ''}>${a.label}</button>`).join('');
  // a dialog, if one is open
  if (!DIALOG && !ANIM && QUEUE.length) { const q = QUEUE.shift(); DIALOG = { title: q.title, body: q.body, options: [{ label: 'OK', run: () => {} }] }; }
  if (DIALOG && !ANIM) {                  // a dialog waits until a moment has finished playing
    voiceDialog();                                                   // …and so do the words
    const carryOn = justCarryOn(DIALOG);                             // nothing to choose: tap anywhere, no words saying so (Steve)
    const buttons = DIALOG.options.map((o, i) => `<button data-opt="${i}"${o.pulse ? ' class="pulse"' : ''}>${o.label}</button>`).join('');   // the choices, as buttons
    const opts = carryOn ? '' : `<div>${buttons}</div>`;            // no button row when there's nothing to choose
    const carry = carryOn ? ' carry' : '';                           // marks it as tap-anywhere (the pointer cursor)
    const body = `<b>${DIALOG.title}</b><p>${DIALOG.body.replace(/\n/g, '<br>')}</p>${opts}`;
    if (DIALOG.at) {                                                 // a speech bubble above the speaker, its arrow pointing at them
      const [x, y] = DIALOG.at, cx = x / W * 100, left = Math.max(22, Math.min(78, cx));
      const tail = 50 + (cx - left) / 40 * 100;
      stage.insertAdjacentHTML('beforeend', `<div class="dlg bubble${carry}" style="left:${left}%;top:${y / H * 100}%;--tail:${tail}%">${body}</div>`);
    } else {
      stage.insertAdjacentHTML('beforeend', `<div class="dlg note${carry}">${body}</div>`);   // anything else: a box along the bottom
    }
  }
  save();
  soundScene(S.screen, !!S.flags.running);
  loseItIfDue();
}

// =====================================================================
// MOVING PICTURES: life on every screen, and short animated moments
// =====================================================================
let ANIM = null;                        // the moment playing now: { kind, t0, dur }
// =====================================================================
// THE STILLS: a big picture (stills/<name>.svg) flashed up after a big moment, like a comic-book cut:
// a white flash, it punches in small and tilted, then slowly zooms and turns. Dialogs wait for it
// =====================================================================
let STILL = null;                                                  // the still showing now: { name, mirror }
const STILL_MS = 1800;                                             // how long it stays up
// Flash a still up now; then carry on (then: what happens next, if anything)
function flashStill(name, then, mirror = false) {
  STILL = { name, mirror };
  moment('still', STILL_MS);
  ANIM.then = () => {
    STILL = null;
    if (then) then();
  };
}
// Flash a still up once the moment playing now has finished (or straight away, if nothing is playing)
function stillAfter(name, mirror = false) {
  if (!ANIM) return flashStill(name, null, mirror);
  const before = ANIM.then;                                        // whatever the moment was going to do when it ends
  ANIM.then = () => {
    if (before) before();
    flashStill(name, null, mirror);
  };
}
// The still's HTML (flipped when the scene is mirrored)
function stillHtml() {
  const flip = STILL.mirror ? ' mirror' : '';
  return `<div class="ov still${flip}"><img src="stills/${STILL.name}.svg" alt=""></div>`;
}

// Every animation plays to its end: a tap doesn't skip it (Steve). Only a walk (life.js), and these quick ones you do over and over, can be tapped past
const TAP_PAST = ['drawer', 'book', 'pedal', 'horn', 'rev', 'garagedoor'];
// Play a moment (an animation in MOMENTS, screens.js) for `dur` milliseconds; dialogs wait for it
function moment(kind, dur) {
  ANIM = { kind, t0: performance.now(), dur, noSkip: !TAP_PAST.includes(kind) };
  const mine = ANIM;
  setTimeout(() => { if (ANIM === mine) finishMoment(); }, dur + 300);   // ends even if the window is hidden (no animation frames then)
  if (kind === 'kick') { stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); }
}
// Draw one frame: the still picture, then the screen's moving things, then the moment
function drawFrame(nowMs) {
  if (!BG) return;
  const scr = SCREENS[S.screen];
  img.data.set(BG);
  const t = nowMs / 1000;
  const parkedLamps = OUR_LAMPS.length;                            // the headlights in the still picture; a moving car's are added each frame
  if (scr.animate) scr.animate(t);
  if (ANIM) {
    const p = Math.min(1, (nowMs - ANIM.t0) / ANIM.dur);
    if (MOMENTS[ANIM.kind]) MOMENTS[ANIM.kind](p, t);
  }
  const dark = darkness();
  if (dark > 0 && scr.night) scr.night(dark);                     // evening: outside gets dark and the lights come on
  flickerLamps(t);                                                // a kicked headlight flickers while the lights are on
  OUR_LAMPS.length = parkedLamps;                                  // (forget the moving ones, or they'd leave a trail)
  if (!CALL && HUD_SHOWN && brokenDown()) pulsingPhone(t);          // on a flat: it pulses, to say ring for help
  if (CALL && HUD_SHOWN) ringingPhone(t);                          // the phone's ringing: it glows and rattles in the strip
  ctx.putImageData(img, 0, 0);
}
// About 30 frames a second; when a moment ends, show what it was holding back (its dialog)
let lastFrame = 0;
function loop(nowMs) {
  requestAnimationFrame(loop);
  if (nowMs - lastFrame < 33) return;
  lastFrame = nowMs;
  const scr = SCREENS[S.screen];
  if (!scr.animate && !ANIM) return;
  drawFrame(nowMs);
  if (ANIM && nowMs - ANIM.t0 >= ANIM.dur) finishMoment();
}
// End the moment playing now; a walk then opens what was tapped
function finishMoment() {
  const done = ANIM;
  ANIM = null;
  if (done && done.then) done.then();
  render();
}
requestAnimationFrame(loop);

// =====================================================================
// TAPS AND CLICKS
// =====================================================================
let dragFrom = null, dragged = false;

// Any tap or key, anywhere: the sound system is awake before anybody speaks
for (const kind of ['pointerup', 'click', 'keydown']) document.addEventListener(kind, () => { if (AC) audioStart(); }, true);

document.addEventListener('click', e => {
  if (dragged) { dragged = false; return; }                         // the end of a drag on the city map, not a tap
  if (e.target.closest('#stage button, #acts button, #stage [data-go], #stage [data-act], .lead')) { audioStart(); sfx('click'); }
  const onPhone = S.screen === 'phone' && e.target.closest('.ph [data-act], .phoneoff');
  if (onPhone) {                                                     // the phone's own buttons (the torch, ringing someone, putting it away) always work:
    if (ANIM && ANIM.noSkip) return;
    if (ANIM) finishMoment();                                        //   not swallowed by a moment ending…
    DIALOG = null;                                                   //   …or by a message still up behind the phone
    return act(onPhone.dataset.act);
  }
  if (ANIM && ANIM.noSkip) return;                                    // this one has to be seen: taps do nothing till it's over
  if (ANIM) { finishMoment(); return; }                               // a tap during a moment skips to its end
  const opt = e.target.closest('[data-opt]');
  if (opt) return pickOption(+opt.dataset.opt);                      // a dialog button
  if (DIALOG && justCarryOn(DIALOG)) return pickOption(0);            // nothing to choose: a tap anywhere carries on
  if (DIALOG && !e.target.closest('.dlg')) { DIALOG = null; render(); return; }   // a choice: tapping away from it walks off
  if (DIALOG) return;                                                // a tap inside a choice (not on a button): nothing
  if (e.target.closest('[data-back]')) return back();
  const a = e.target.closest('[data-act]');
  if (a) return act(a.dataset.act);
  const g = e.target.closest('[data-go]');
  if (g && g.dataset.go === 'garage' && S.screen === 'home') garageDoorStart();   // the garage door starts up as soon as you tap it
  if (g && g.dataset.walk) {                                         // walk over there first, then go
    const [x, y] = g.dataset.walk.split(',').map(Number);
    return walkTo(x, y, () => goTo(g.dataset.go));
  }
  if (g) return goTo(g.dataset.go);
  const app = e.target.closest('[data-app]');
  if (app) { S.app = app.dataset.app; render(); }
});

// Run a dialog's option (its button, or a tap to carry on)
function pickOption(i) {
  const o = DIALOG.options[i];
  if (DIALOG.at && DIALOG.title !== 'You') { SPEAKER = DIALOG.at; SPEAKER_FOR = DIALOG.title; }   // their next line comes from them too (only theirs)
  DIALOG = null;
  o.run();
  if (!DIALOG) { SPEAKER = null; SPEAKER_FOR = null; }              // nobody spoke next: don't keep their bubble for later
  save();
  render();
}

// The car door: the pointer aims the key (which won't keep still)
stage.addEventListener('pointermove', e => {
  if (S.screen !== 'keyhole' || DIALOG) return;
  const r = canvas.getBoundingClientRect();
  keyAim((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H);
});
// The breath test: press and hold to blow; let go and it reads (after the click, so the click doesn't close what it says)
stage.addEventListener('pointerdown', e => { if (S.screen === 'breath' && !DIALOG && !ANIM && !e.target.closest('button, .dlg')) breathDown(); });
addEventListener('pointerup', () => { if (S.screen === 'breath') setTimeout(breathUp, 0); });
// Looking under something: the pointer aims the torch beam
stage.addEventListener('pointermove', e => {
  if (S.screen !== 'lookunder' || DIALOG) return;
  const [x, y] = picturePoint(e);
  BEAM = { x: Math.max(0, Math.min(W, x)), y: Math.max(150, Math.min(H, y)) };   // on the floor
  underBeamMoved();
});
// Sweeping up the screws: the pointer moves the dustpan (screws.js)
stage.addEventListener('pointermove', e => {
  if (S.screen !== 'sweep' || DIALOG || ANIM) return;
  const [x, y] = picturePoint(e);
  sweepMove(x, y);
});
// The fuse box with the multimeter out: point at a fuse and the probes go on it (no tap needed: Steve)
stage.addEventListener('pointermove', e => {
  if (S.screen !== 'fuseZoom' || DIALOG || ANIM || !meterOut()) return;
  const spotEl = e.target.closest('.hs[data-go^="act:testfuse:"]');  // the fuse under the pointer
  if (!spotEl) return;
  const n = +spotEl.dataset.go.split(':')[2];
  if (n === S.meterFuse) return;                                      // already on it
  act('testfuse:' + n);
});
// Under the tool chest: the pointer moves the stick
stage.addEventListener('pointermove', e => {
  if (S.screen !== 'fish' || DIALOG) return;
  const r = canvas.getBoundingClientRect();
  fishMove((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H);
});
// The parts boxes: press and drag to rummage
stage.addEventListener('pointerdown', e => { if (S.screen === 'partsbox' && !DIALOG && !ANIM) rummageStart(e); });
stage.addEventListener('pointermove', e => { if (S.screen === 'partsbox') rummageMove(e); });
addEventListener('pointerup', () => { if (S.screen === 'partsbox') setTimeout(rummageEnd, 0); });   // after the click, so the click doesn't close what it says
// Drag the city map to look round town
stage.addEventListener('pointerdown', e => {
  if (S.screen !== 'city' || DIALOG) return;
  dragFrom = { x: e.clientX, y: e.clientY, ox: S.cam.ox, oy: S.cam.oy };
  dragged = false;
});
stage.addEventListener('pointermove', e => {
  if (!dragFrom) return;
  const scale = W / stage.clientWidth;
  const dx = (e.clientX - dragFrom.x) * scale, dy = (e.clientY - dragFrom.y) * scale;
  if (Math.abs(dx) + Math.abs(dy) > 6) dragged = true;
  if (!dragged) return;
  S.cam.ox = Math.round(dragFrom.ox + dx);
  S.cam.oy = Math.round(dragFrom.oy + dy);
  renderSoon();                                                       // the mouse moves far more often than the screen can redraw
});
// Redraw at the next frame, at most once a frame however often it's asked for (while dragging the map)
let RENDER_QUEUED = false;
function renderSoon() {
  if (RENDER_QUEUED) return;
  RENDER_QUEUED = true;
  requestAnimationFrame(() => { RENDER_QUEUED = false; render(); });
}
addEventListener('pointerup', () => { dragFrom = null; setTimeout(() => { dragged = false; }, 0); });

document.getElementById('new').addEventListener('click', () => { if (confirm('Start a new game? This one will be lost.')) newGame(); });
// Sound on and off (remembered in this browser)
const muteBtn = document.getElementById('mute');
const showMute = () => { muteBtn.textContent = MUTED ? 'Sound: off' : 'Sound: on'; };
muteBtn.addEventListener('click', () => { audioStart(); setMuted(!MUTED); showMute(); });
showMute();

// =====================================================================
// START
// =====================================================================
for (const el of document.querySelectorAll('.ver')) el.textContent = VERSION;   // the version, after the tagline
if (!load()) { STORY_START(); }
render();
