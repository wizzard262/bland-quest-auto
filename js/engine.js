// The Thankless Task: the game engine.
// Holds the game state (time, money, anger, jobs, leads, things you own), moves between screens,
// shows dialogs and the action buttons, and saves the game in the browser.
// The story itself (who says what, what each action does) lives in story.js.

// =====================================================================
// STATE
// =====================================================================
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const SAVE_KEY = 'thankless-task-save-v1';

// A brand-new game
function freshState() {
  return {
    day: 1, mins: 8 * 60,              // day 1 is a Tuesday; minutes since midnight
    money: 250, anger: 10,
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
function clockText() { return `${weekday()} ${hhmm(S.mins)}   DAY ${S.day}   £${Math.max(0, Math.floor(S.money))}`; }

// Let time pass; fires any timed events and parcel deliveries on the way
function pass(mins) {
  S.mins += mins;
  while (S.mins >= 1440) { S.mins -= 1440; S.day += 1; }
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
function sleepUntilMorning() {
  S.day += 1;
  S.mins = 8 * 60;
  S.anger = Math.max(0, S.anger - 20);
  deliverParcels();
  runEvents();
}
// Spend money; false if you can't afford it
function spend(amount) {
  if (S.money < amount) return false;
  S.money -= amount;
  return true;
}
// Change anger; at 100 you kick something and break it
function anger(n) {
  if (n > 0) { ANGER_UP = performance.now(); sfx('angerup'); }  // going up: a rising tone, and the bar shakes
  S.anger = Math.max(0, Math.min(100, S.anger + n));
  if (S.anger >= 100) kickSomething();
}
function kickSomething() {
  if (typeof breakSomething === 'function') return breakSomething();   // you break something on the car (extras.js)
  const broken = ['the wheelie bin', 'the garage door', 'your toolbox', 'the recycling', 'your own foot'];
  const thing = broken[(S.day + S.mins) % broken.length];
  S.anger = 50;
  moment('kick', 1300); sfx('kick');
  const id = 'kicked-' + now();
  job(id, 'Fix ' + thing + ' (you kicked it)', null);
  note(id, 'It broke. Of course it did.', 'x');
  queueDialog('You kick ' + thing, `You've had enough. You kick ${thing}. It breaks.\n\nThat's a new job in the notebook.`);
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
// Order something: it arrives at 10:00, `days` days from now
function order(item, days, from) {
  S.parcels.push({ item, dueDay: S.day + days, from });
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
// GETTING STUCK: sit and think for a hunch
// =====================================================================
// Find an open job with no open leads and no open jobs beneath it, and give its hunch
function think() {
  pass(60);
  anger(-10);
  const open = S.jobs.filter(j => j.status === 'open');
  const stuck = open.filter(j => !j.leads.some(l => l.status === 'open') && !open.some(k => k.parent === j.id));
  stuck.sort((a, b) => b.at - a.at);
  for (const j of stuck) {
    const h = HUNCHES[j.id];
    if (!h || S.hunches[j.id]) continue;
    S.hunches[j.id] = true;
    h();
    return say('You sit and think', 'An hour goes by. Then a hunch: it\'s in the notebook.');
  }
  if (!stuck.length) return say('You sit and think', 'An hour goes by. You calm down a bit.\n\nYou\'ve got things to try: look in the notebook.');
  say('You sit and think', 'An hour goes by. You calm down a bit, but nothing comes to you.\n\nMaybe ring someone, or wait for something to turn up.');
}

// =====================================================================
// MOVING ROUND: screens, places in town, apps on the computer
// =====================================================================
// Where a lead or a tap can take you: 'garage', 'place:Name', 'app:Forum'
function goTo(target) {
  if (target.startsWith('act:')) return act(target.slice(4));
  if (target.startsWith('place:')) return visit(target.slice(6));
  if (target.startsWith('app:')) { S.app = target.slice(4); return show('pc'); }
  if (target === 'garage' && S.screen === 'home') return garageDoorUp();   // from outside: the roller door goes up first
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
  if (screen === 'city' && S.screen !== 'city') travelFrom();
  if (screen === 'home' && S.place) { pass(20); S.place = null; }
  if (['city', 'room', 'garage'].includes(screen)) delete S.flags.wifeOut;   // she only follows him round the front of the house
  S.screen = screen;
  if (SCREEN_ENTER[screen]) SCREEN_ENTER[screen]();
  render();
}
function back() {
  const prev = S.history.pop() || 'home';
  S.screen = prev;
  render();
}
// Leaving the house or garage for town
function travelFrom() { /* the car is always ready; the trip is charged when you pick a place */ }
// Go to a place in town: the trip costs 20 minutes
function visit(name) {
  if (name === 'Home') { S.place = 'Home'; return show('home'); }
  pass(20);
  S.place = name;
  if (S.screen !== 'place') S.history.push(S.screen);
  S.screen = 'place';
  sfx('car');
  arriveAt(name);
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
  DIALOG = { title, body, at, options: options && options.length ? options : [{ label: 'OK', run: () => {} }] };
  if (at) chatter(Math.min(28, 4 + Math.round(body.length / 7)), 95 + hash(title.length, title.charCodeAt(0)) * 120);   // muffled chatter in their voice
  render();
}
// Something you say: a speech bubble from your own head; tap anywhere to carry on, then `then` runs (their answer)
function sayMe(line, then) {
  DIALOG = { title: 'You', body: line, at: meHead(), options: [{ label: 'OK', run: then || (() => {}) }] };
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
      S = Object.assign(freshState(), JSON.parse(raw));
      if (S.flags.sensorOut) S.flags.boxOff = true;                    // saved before the sensor came off in its box: the box is off too
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
  img = ctx.createImageData(W, H);
  LABELS = [];
  scr.paint();
  BG = img.data.slice();
  drawFrame(performance.now());
  // real-text labels, tap areas and any overlay (computer, phone, notebook)
  stage.querySelectorAll('.ov, .lbl, .tip, .zl, .go, .hs, .lab, .front, .spine, .lid, .scr, .back, .dlg, .basket, .anger').forEach(el => el.remove());
  stage.insertAdjacentHTML('beforeend', LABELS.join(''));
  if (scr.overlay) stage.insertAdjacentHTML('beforeend', scr.overlay());
  if (scr.after) scr.after();                                     // anything that needs the page laid out first (the notebook's pages)
  const atPlace = ['place', 'room', 'garage', 'pc', 'dash', 'rage', 'phone'].includes(S.screen);   // shops, house, garage, computer, car: you leave by a door (or Get up); no Back button
  if (S.screen !== 'home' && !atPlace) stage.insertAdjacentHTML('beforeend', '<button class="back" data-back="1">◀ Back</button>');
  // the action buttons under the picture
  const acts = scr.actions ? scr.actions() : [];
  actsBar.innerHTML = acts.map(a => `<button data-act="${a.act}">${a.label}</button>`).join('');
  // a dialog, if one is open
  if (!DIALOG && !ANIM && QUEUE.length) { const q = QUEUE.shift(); DIALOG = { title: q.title, body: q.body, options: [{ label: 'OK', run: () => {} }] }; }
  if (DIALOG && !ANIM) {                  // a dialog waits until a moment has finished playing
    const opts = justCarryOn(DIALOG)
      ? '<span class="more">tap to carry on ▸</span>'                // nothing to choose: tap anywhere
      : DIALOG.options.map((o, i) => `<button data-opt="${i}">${o.label}</button>`).join('');
    const body = `<b>${DIALOG.title}</b><p>${DIALOG.body.replace(/\n/g, '<br>')}</p><div>${opts}</div>`;
    if (DIALOG.at) {                                                 // a speech bubble above the speaker, its arrow pointing at them
      const [x, y] = DIALOG.at, cx = x / W * 100, left = Math.max(22, Math.min(78, cx));
      const tail = 50 + (cx - left) / 40 * 100;
      stage.insertAdjacentHTML('beforeend', `<div class="dlg bubble" style="left:${left}%;top:${y / H * 100}%;--tail:${tail}%">${body}</div>`);
    } else {
      stage.insertAdjacentHTML('beforeend', `<div class="dlg note">${body}</div>`);   // anything else: a box along the bottom
    }
  }
  save();
  soundScene(S.screen, !!S.flags.running);
}

// =====================================================================
// MOVING PICTURES: life on every screen, and short animated moments
// =====================================================================
let ANIM = null;                        // the moment playing now: { kind, t0, dur }
// Play a moment (an animation in MOMENTS, screens.js) for `dur` milliseconds; dialogs wait for it
function moment(kind, dur) {
  ANIM = { kind, t0: performance.now(), dur };
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
  if (scr.animate) scr.animate(t);
  if (ANIM) {
    const p = Math.min(1, (nowMs - ANIM.t0) / ANIM.dur);
    if (MOMENTS[ANIM.kind]) MOMENTS[ANIM.kind](p, t);
  }
  const dark = darkness();
  if (dark > 0 && scr.night) scr.night(dark);                     // evening: outside gets dark and the lights come on
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

document.addEventListener('click', e => {
  if (dragged) { dragged = false; return; }                         // the end of a drag on the city map, not a tap
  if (e.target.closest('#stage button, #acts button, #stage [data-go], #stage [data-act], .lead')) { audioStart(); sfx('click'); }
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
  render();
});
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
if (!load()) { STORY_START(); }
render();
