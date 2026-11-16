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

// =====================================================================
// TIME, MONEY, ANGER
// =====================================================================
// Minutes since the start of day 1
const now = () => (S.day - 1) * 1440 + S.mins;
const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const weekday = () => DAYS[S.day % 7];
function clockText() { return `${weekday()} ${hhmm(S.mins)}   DAY ${S.day}   £${Math.max(0, Math.floor(S.money))}`; }

// Let time pass; fires any timed events and parcel deliveries on the way
function pass(mins) {
  S.mins += mins;
  while (S.mins >= 1440) { S.mins -= 1440; S.day += 1; }
  deliverParcels();
  runEvents();
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
  S.anger = Math.max(0, Math.min(100, S.anger + n));
  if (S.anger >= 100) kickSomething();
}
function kickSomething() {
  const broken = ['the wheelie bin', 'the garage door', 'your toolbox', 'the recycling', 'your own foot'];
  const thing = broken[(S.day + S.mins) % broken.length];
  S.anger = 50;
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
function textMsg(from, body) { S.msgs.unshift({ from, body, when: clockText(), read: false }); }
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
  show(target);
}
// Show a screen, remembering where you came from
function show(screen) {
  if (screen !== S.screen) S.history.push(S.screen);
  if (S.history.length > 30) S.history.shift();
  if (screen === 'city' && S.screen !== 'city') travelFrom();
  if (screen === 'home' && S.place) { pass(20); S.place = null; }
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
  arriveAt(name);
  render();
}

// =====================================================================
// DIALOGS
// =====================================================================
// Show a dialog: options = [{ label, run }]; with no options there's an OK button
function say(title, body, options) {
  DIALOG = { title, body, options: options && options.length ? options : [{ label: 'OK', run: () => {} }] };
  render();
}
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
    if (raw) { S = Object.assign(freshState(), JSON.parse(raw)); return true; }
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

function render() {
  const scr = SCREENS[S.screen];
  // paint the picture
  [W, H] = scr.size || [480, 270];
  canvas.width = W; canvas.height = H;
  img = ctx.createImageData(W, H);
  LABELS = [];
  scr.paint();
  ctx.putImageData(img, 0, 0);
  // real-text labels, tap areas and any overlay (computer, phone, notebook)
  stage.querySelectorAll('.ov, .lbl, .tip, .zl, .go, .lid, .scr, .back, .dlg').forEach(el => el.remove());
  stage.insertAdjacentHTML('beforeend', LABELS.join(''));
  if (scr.overlay) stage.insertAdjacentHTML('beforeend', scr.overlay());
  if (S.screen !== 'home') stage.insertAdjacentHTML('beforeend', '<button class="back" data-back="1">◀ Back</button>');
  // the action buttons under the picture
  const acts = scr.actions ? scr.actions() : [];
  actsBar.innerHTML = acts.map(a => `<button data-act="${a.act}">${a.label}</button>`).join('');
  // a dialog, if one is open
  if (!DIALOG && QUEUE.length) { const q = QUEUE.shift(); DIALOG = { title: q.title, body: q.body, options: [{ label: 'OK', run: () => {} }] }; }
  if (DIALOG) {
    const opts = DIALOG.options.map((o, i) => `<button data-opt="${i}">${o.label}</button>`).join('');
    stage.insertAdjacentHTML('beforeend', `<div class="dlg"><b>${DIALOG.title}</b><p>${DIALOG.body.replace(/\n/g, '<br>')}</p><div>${opts}</div></div>`);
  }
  save();
}

// =====================================================================
// TAPS AND CLICKS
// =====================================================================
let dragFrom = null, dragged = false;

document.addEventListener('click', e => {
  if (dragged) { dragged = false; return; }                         // the end of a drag on the city map, not a tap
  const opt = e.target.closest('[data-opt]');
  if (opt) {                                                         // a dialog button
    const o = DIALOG.options[+opt.dataset.opt];
    DIALOG = null;
    o.run();
    save();
    render();
    return;
  }
  if (DIALOG) return;                                                // finish the dialog first
  if (e.target.closest('[data-back]')) return back();
  const a = e.target.closest('[data-act]');
  if (a) return act(a.dataset.act);
  const g = e.target.closest('[data-go]');
  if (g) return goTo(g.dataset.go);
  const app = e.target.closest('[data-app]');
  if (app) { S.app = app.dataset.app; render(); }
});

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

// =====================================================================
// START
// =====================================================================
if (!load()) { STORY_START(); }
render();
