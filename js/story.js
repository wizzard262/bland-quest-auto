// Bland Quest Auto: the story. Branch 1: the red light on the dash.
// Who says what, what each action does, what's for sale, and the leads each thing gives.
// Lead targets: a screen ('garage', 'under', 'underZoom', 'dash', 'fuseZoom', 'bench', 'city'),
// a place in town ('place:Halfords Car Parts') or a computer app ('app:Forum').

// =====================================================================
// THE START
// =====================================================================
function STORY_START() {
  job('pickup', 'Pick up the car from the MOT Test Centre', null);
  // you start inside the MOT Test Centre, where your car has just been tested
  S.screen = 'place';
  S.place = 'MOT Test Centre';
  arriveAt(S.place);
  S.inside = true;
  lead('pickup', 'tester', 'Talk to the tester', 'you', 'obviously', 'place:MOT Test Centre');
}
// The tester gives the verdict: great car, but the red light is a fail. Then the real job starts
function motVerdict() {
  S.flags.motDone = true;
  S.inv['mot-sheet'] = 1;                                           // the failure sheet
  finishJob('pickup', 'Picked up the car. It FAILED: a red light on the dash');
  job('light', 'Get the red light off the dash', null);
  note('light', 'The car failed its test: a red light on the dash.', 'info');
  note('light', 'The tester only tests cars. He has no idea what the problem is.', 'x');
  job('codes', 'Find out what the red light means', 'light');
  lead('codes', 'ask-mech', 'Ask a mechanic', 'the tester (sort of)', 'obviously', 'city');
}
// Everything you can ask the MOT tester, and his answers (nearly always the same one)
const TESTER_QUESTIONS = [
  ['Can you fix it?', '"Me? I don\'t fix cars, mate. I only test them. No idea what\'s wrong with it."'],
  ['What does the red light mean?', '"No idea, mate."'],
  ['Who should I take it to?', '"No idea, mate."'],
  ['Is it safe to drive?', '"No idea, mate. It passed the brakes."'],
  ['Could it just be a bulb?', '"No idea, mate."'],
  ['Have you seen one like it before?', '"Every day, mate. No idea what it is, though."'],
  ['Can I rebook for tomorrow?', '"No idea, mate. You\'ll have to ring."']
];
// The questions you haven't asked yet, then Drive home. Each one: you say it, then he answers
function testerQuestions() {
  S.flags.asked = S.flags.asked || {};
  const left = TESTER_QUESTIONS.filter(([q]) => !S.flags.asked[q]).slice(0, 3);     // three at a time, so the bubble stays small
  const options = left.map(([q, answer]) => ({ label: q, run() {
    S.flags.asked[q] = true;
    anger(2);
    sayMe(q, () => {                                                  // you ask, in your own bubble…
      SPEAKER = keeperHead();                                         // …and he answers in his
      say('MOT Test Centre', answer, testerQuestions());
    });
  } }));
  options.push({ label: 'Drive home', run() { show('home'); } });
  return options;
}

// =====================================================================
// THINGS THAT HAPPEN AT A SET TIME (each once)
// =====================================================================
const EVENTS = [
  { id: 'gaz-text', day: 1, mins: 11 * 60, run() {
    textMsg('Mate Gaz', "heard ur car's knackered. got a code reader somewhere, come round");
    lead('codes', 'gaz-reader', "Borrow Gaz's code reader", 'Gaz', 'maybe', "place:Mate Gaz's");
  } },
  { id: 'mum-text', day: 1, mins: 15 * 60, run() { textMsg('Mum & Dad', 'Hope the car is ok love. Come over any time x'); } },
  { id: 'call-mumdad', day: 2, mins: 18 * 60, run() { ringWhenFree('mumdad'); } },
  { id: 'call-wrong', day: 2, mins: 20 * 60 + 30, run() { ringWhenFree('wrong'); } },
  { id: 'call-cold', day: 3, mins: 10 * 60 + 30, run() { ringWhenFree('cold'); } },
  { id: 'call-dealer', day: 4, mins: 11 * 60, run() { ringWhenFree('dealer'); } },
  { id: 'call-jack', day: 1, mins: 0, when: () => !!S.flags.jackLentDay && S.day > S.flags.jackLentDay && S.mins >= 9 * 60, run() { ringWhenFree('jack'); } },   // the day after Paul borrowed it
  { id: 'scam-text', day: 2, mins: 9 * 60, run() { textMsg('Unknown', 'Your parcel is held. Pay £1.45 to release: parcel-helddd.example'); } }
];

// =====================================================================
// HUNCHES: what sitting and thinking gives you when a job has no leads
// =====================================================================
const HUNCHES = {
  codes() { lead('codes', 'dealer', 'The main dealer can read the codes', 'a hunch', 'vague', 'place:Main Dealer'); },
  meaning() { lead('meaning', 'sensor', 'Something on the gearbox?', 'a hunch', 'vague', 'underZoom'); },
  bolt2() { lead('bolt2', 'extractor2', 'A better extractor', 'a hunch', 'vague', 'place:Hardware Shop'); },
  nut3() { lead('nut3', 'torch', 'A torch: there was one in the toolbox', 'a hunch', 'vague', 'toolbox'); },
  'new-sensor'() { lead('new-sensor', 'motor-factors', 'A proper parts shop', 'a hunch', 'vague', 'place:Halfords Car Parts'); }
};

// ---------- skint: Mum & Dad (every few days) or Paul (once) help out ----------
const SKINT = 30;                                                       // less than this: you're skint
const MUM_MONEY = 50, MUM_EVERY = 3, PAUL_MONEY = 20;
// Running out of money: a job, with where you might get some
function skintJob() {
  if (S.money >= SKINT) return;
  const j = findJob('money');
  if (j && j.status === 'open') return;
  if (j) j.status = 'open';
  job('money', 'Get some money (you\'re skint)', null);
  lead('money', 'mum-money', 'Ask Mum & Dad', 'you', 'fairly sure', 'place:Mum & Dad\'s');
  lead('money', 'paul-money', 'Ask Paul (ring him)', 'you', 'maybe', 'phone');
  lead('money', 'bank-loan', 'A loan from the bank (Mon to Wed, 10 till 2)', 'you', 'maybe', 'place:Bank');
}
// Money in again: off the list, if that's enough
function moneyIn(amount, how) {
  S.money += amount;
  sfx('kerching');
  if (S.money >= SKINT && findJob('money') && findJob('money').status === 'open') finishJob('money', how);
}
function askMumForMoney(title) {
  if (S.money >= SKINT) return false;
  if (S.flags.mumMoneyDay !== undefined && S.day < S.flags.mumMoneyDay + MUM_EVERY) return false;   // not again so soon
  S.flags.mumMoneyDay = S.day;
  moneyIn(MUM_MONEY, `£${MUM_MONEY} from Mum`);
  say(title, `"You sound skint, love. I'll put £${MUM_MONEY} in your account. Don't tell your father."\n\nIn the background: "I HEARD THAT."`);
  return true;
}
function askPaulForMoney() {
  if (S.money >= SKINT || S.flags.paulLent) return false;
  S.flags.paulLent = true;
  moneyIn(PAUL_MONEY, `£${PAUL_MONEY} from Paul`);
  say('Ringing Paul', `"Skint again? Here, I'll send you twenty. Don't tell Mum."\n\n£${PAUL_MONEY}. He'll mention it every Christmas for the rest of your life.`);
  return true;
}
// The town map, centred on a place (its block): where your car's parked
function camOnPlace(name) {
  const i = placeIndex(name);
  if (i < 0) return;
  ACTIONS.cam(`${i % 7},${Math.floor(i / 7)}`);
}
// =====================================================================
// THE CODES
// =====================================================================
// Someone (or something) tells you what P0705 is: the selector sensor, on the side of the gearbox. Then the gearbox
// close-up shows it. Who answers: the forum, Old Ron at the pub, the German manual, a hunch. Who doesn't: TechDocs,
// Tameside Transmissions and Voltz (round and round), Dodgy Dave, Paul. Returns true if this is how you found out
function sensorFound(who, how) {
  if (!S.flags.codes || leadExists('sensor')) return false;         // no codes to ask about, or you know already
  lead('meaning', 'sensor', "It's the gearbox selector sensor", who, how, 'underZoom');
  return true;
}
function readCodes(how) {
  if (S.flags.codes) return say('The codes', 'Same two codes as before:\n\nP0705 Transmission range sensor circuit malfunction\nP0706 Range / performance');
  S.flags.codes = true;
  finishJob('codes', 'Codes: P0705 and P0706 (' + how + ')');
  job('meaning', 'What does P0705 mean?', 'light');
  lead('meaning', 'forum', 'Look it up on the forum', 'you', 'hopeful', 'app:Forum');
  lead('meaning', 'techdocs', 'The official technical pages', "the reader's booklet", 'sure', 'app:TechDocs');
  lead('meaning', 'gurus', 'Ask the gearbox people', 'the man at Main Dealer', 'very sure', 'place:Tameside Transmissions');
  say('Two codes', 'P0705 Transmission range sensor circuit malfunction\nP0706 Range / performance\n\nWhatever that means. New job in the notebook.');
}

// =====================================================================
// PLACES IN TOWN
// =====================================================================
// open = [from, to] in minutes; closedDays = days it's shut; shop = things for sale
const PLACE_INFO = {
  'The Hesketh Tavern': { open: [11 * 60, 24 * 60], person: 'the barman' },      // the pub: open late, shuts at midnight
  'Spanner & Son': { open: [8 * 60, 17 * 60 + 30], person: 'Mr Spanner' },
  'Post Office': { open: [9 * 60, 17 * 60 + 30], person: 'the woman behind the glass' },
  'Bank': { open: [10 * 60, 14 * 60], closedDays: ['THU', 'FRI', 'SAT', 'SUN'], person: 'the cashier' },   // as its poster says: Mon to Wed, 10 till 2
  'Quickfix Motors': { open: [8 * 60, 17 * 60 + 30], person: 'a mechanic' },
  "Sparky's Auto Electrics": { open: [9 * 60, 16 * 60 + 30], lunch: true, person: 'Sparky' },
  'Main Dealer': { open: [9 * 60, 17 * 60], person: 'the service desk' },
  'Tameside Transmissions': { open: [9 * 60, 17 * 60], person: 'a man in overalls' },
  'Voltz Auto Electric': { open: [9 * 60, 17 * 60], person: 'a man with a meter' },
  "Mate Gaz's": { open: [10 * 60, 22 * 60], person: 'Gaz' },
  'Tool Shop': { open: [8 * 60, 17 * 60], person: 'the man at the till', shop: ['extractor-cheap', 'socket-9'] },
  'Hardware Shop': { open: [9 * 60, 17 * 60 + 30], person: 'an old man in a brown coat', shop: ['extractor-good', 'fuses'] },
  'Halfords Car Parts': { open: [8 * 60 + 30, 17 * 60 + 30], person: 'the counter man' },
  'Parts 4 Less': { open: [9 * 60, 16 * 60 + 30], person: 'a woman on the phone' },
  'Scrap Yard': { open: [9 * 60, 16 * 60], person: 'a man with a dog', byAppointment: true },   // only in a slot you've booked by phone
  'MOT Test Centre': { open: [8 * 60, 17 * 60 + 30], person: 'the tester' },
  'Trusty Autos': { gone: true },
  'Police Station': { person: 'the police' },
  'Petrol Station': { open: [0, 24 * 60] },                           // open all day and all night (Steve)                         // "Talk to the police" (Steve)
  'BustBlockers': { gone: true },                                        // the video shop that went bust: boarded up (the bank's in the grand building with the columns)
  'E & D Motors': { holiday: true },
  'Clutch & Co': { closedDays: ['TUE', 'WED'] }
};
// Things you can buy: price, what it is, and where it goes
const ITEMS = {
  'mot-sheet': { name: 'MOT failure sheet', price: 0, none: true },
  'extractor-cheap': { name: 'Bolt extractor (cheap)', price: 8.99 },
  'extractor-good': { name: 'Bolt extractor (proper one)', price: 14.5 },
  'socket-9': { name: '9 mm socket', price: 0, none: true },
  'fuses': { name: 'Box of fuses (wrong amps)', price: 3.5 },
  'reader-cheap': { name: 'Code reader, "fits all cars*"', price: 12.99 },
  'reader-good': { name: 'Handheld code reader (used)', price: 15 },
  'part-mega': { name: 'Gearbox sensor, "fits all models*"', price: 17.49 },
  'part-p4l': { name: 'Gearbox selector sensor', price: 31.5 },
  'headlight-bay': { name: 'Zafira headlight (used)', price: 18 },
  'headlight-zam': { name: 'Headlight unit, "fits Zafira*"', price: 39.99 },
  'battery-23a': { name: '23A 12V battery (pack of 5)', price: 3.49 }
};

// Spare headlights you own (on the garage shelf): how many left ones and right ones
function spareLamps() {
  S.lamps = S.lamps || { left: 0, right: 0 };
  return S.lamps;
}
function addLamp(side) { spareLamps()[side] += 1; }
// The headlight you still need: a smashed side you haven't got a spare for ('left', 'right' or null)
function needHeadlight() {
  const have = spareLamps();
  if (brokeOpen('headlight') && !have.left) return 'left';
  if (brokeOpen('headlight2') && !have.right) return 'right';
  return null;
}
// From the Scrap Yard: one for the side you need (or a left one, if nothing's smashed)
function gotHeadlight() { addLamp(needHeadlight() || 'left'); }
// Which night it is (after midnight still counts as the evening before)
const nightOf = () => S.mins < 7 * 60 ? S.day - 1 : S.day;
// Late, and you're in the garage: she comes in, in her nightie, and wants you in bed (once a night)
const WIFE_IN_GARAGE = [172, 36];                                    // over on the right by the workbench, so her bubble is up in the top right
function wifeComesIn() {
  S.flags.wifeCalled = nightOf();
  SPEAKER = wifeHead();
  say('The wife', '"Come to bed, Husband."', [
    { label: 'Go to bed', run() { show('room'); ACTIONS.bed(); } },
    { label: 'Five more minutes', run() { SPEAKER = wifeHead(); say('The wife', '"Five minutes, Husband. I\'m counting."', [{ label: 'OK', run() { S.flags.wifeWentIn = nightOf(); sfx('door'); render(); } }]); } }   // and off she goes, back in
  ]);
}

// =====================================================================
// THE CAR HANDBOOK: the wife says look in it; it isn't on the shelf; it's at the bottom of a parts box
// =====================================================================
function handbookTip() {
  S.flags.handbookTip = true;
  job('handbook', 'Find the car handbook', null);
  lead('handbook', 'handbook-shelf', 'Look on the manuals shelf', 'the wife', 'obviously', 'shelf');
}
// At the manuals shelf, looking for it: every book but that one
function handbookNotOnShelf() {
  const looking = leadOpen('handbook-shelf') || leadOpen('fusebook');
  if (S.inv.handbook || !looking || S.flags.handbookNotShelf) return;
  S.flags.handbookNotShelf = true;
  job('handbook', 'Find the car handbook', null);
  closeLead('handbook-shelf', 'x', 'Not on the manuals shelf');
  lead('handbook', 'handbook-box', 'Try the parts boxes', 'you', 'hopeful', 'partsbox');
  say('The manuals shelf', 'Every car manual but yours. The handbook isn\'t here.');
}
// Found it, under everything in the parts box
function takeHandbook(j) {
  S.inv.handbook = true;
  PILE.splice(PILE.indexOf(j), 1);
  sfx('pop');
  closeLead('handbook-shelf', 'x');
  closeLead('handbook-box', 'ok');
  finishJob('handbook', 'Found it at the bottom of a parts box');
  say('The car handbook', 'There it is, under half a sandwich: the car\'s handbook, in its plastic wallet.', [
    { label: 'Read it', run: openHandbook },
    { label: 'Later (it goes on the manuals shelf)', run() { render(); } }
  ]);
}
// Open it at the cover; reading it, you find there's nothing about fuses
function openHandbook() {
  const lookingForFuses = leadOpen('fusebook');                    // the fuse box lid sent you here: straight to the fuse page
  S.hbPage = lookingForFuses ? HANDBOOK_FUSE_PAGE : 0;
  S.hbFrom = S.screen === 'shelf' ? 'shelf' : 'garage';           // put it down: back to the manuals shelf if that's where it came from
  pass(5);
  show('handbook');
  handbookFusePageSeen();
}
// The fuse page: ripped out. The diagram must be online; copy it into the notebook from there
function handbookFusePageSeen() {
  if (S.hbPage !== HANDBOOK_FUSE_PAGE || !leadOpen('fusebook')) return;
  anger(5);
  closeLead('fusebook', 'x', 'Owner\'s handbook: the fuse page has been ripped out');
  lead('meaning', 'fusediagram', 'Find the fuse box diagram online, and copy it into the notebook', 'you', 'hopeful', 'app:TechDocs');
}
// Turn a page (the radio page: the code goes in the notebook)
function handbookPage(d) {
  S.hbPage = Math.max(0, Math.min(handbookPages().length, (S.hbPage || 0) + d));
  sfx('click');
  if (S.hbPage === 3) radioCodeNoted('it\'s in the handbook');
  handbookFusePageSeen();                                          // the fuse page: ripped out
}

// =====================================================================
// THE BATTERY LEADS: each comes off by itself; with either off there's no power at all,
// the engine dies, and the radio forgets its code
// =====================================================================
function batteryLead(side) {
  S.battery = S.battery || { plus: true, minus: true };
  const name = side === 'plus' ? 'the + (red)' : 'the − (black)';
  pass(5);
  sfx('ratchet');
  if (batteryLeadOn(side)) {                                          // take it off
    S.battery[side] = false;
    S.flags.running = false;                                          // the engine stops dead
    radioForgets();
    return say('The battery', `You undo ${name} lead and lift it off the post.`);
  }
  S.battery[side] = true;                                             // put it back
  const other = side === 'plus' ? 'minus' : 'plus';
  const rest = batteryLeadOn(other) ? 'Both leads are on. There should be power again.' : 'The other lead is still off.';
  say('The battery', `You put ${name} lead back on and tighten it. ${rest}`);
}
// No power: the radio loses its code, and asks for it again
function radioForgets() {
  const R = radioState();
  R.unlocked = false; R.on = false; R.digits = [null, null, null, null]; R.pos = 0;
  const j = findJob('radio');
  if (j && j.status === 'done') { j.status = 'open'; note('radio', 'The battery was off: it wants the code again', 'info'); }
}

// The radio code: once you know it, it goes in the notebook (under a job to get the radio working)
function radioJob() { if (!findJob('radio')) job('radio', 'Get the radio working (it wants a code)', null); }
function radioCodeNoted(how) {
  radioJob();
  if (S.flags.radioCode) return;
  S.flags.radioCode = true;
  note('radio', 'Radio code: 1234 (' + how + ')', 'ok');
}

// Still in the pub after ten: the wife texts (once a night)
function pubLate() {
  if (S.mins < 22 * 60 || S.flags.wifeTexted === S.day) return;
  S.flags.wifeTexted = S.day;
  textMsg('The wife', 'Husband. Where are you? It\'s gone ten. Come home. x');
}

// =====================================================================
// TOO MANY DRINKS: more than three and you're off your stool, thrown out, sick in the street,
// and the wife comes in her sister's car to fetch you. No driving till the morning.
// =====================================================================
const PUB_LIMIT = 3;                                                   // the most the barman puts up with
const SOBER_AT = 7 * 60;                                               // you're fit to drive again at 7 the next morning
const nowAbs = () => S.day * 1440 + S.mins;                            // the time, counted from the start of the game
// One more drink today: returns how many that makes
function haveADrink() {
  if (!S.drinks || S.drinks.day !== S.day) S.drinks = { day: S.day, n: 0 };   // a new day: start counting again
  S.drinks.n += 1;
  boozeAdd(1);                                                         // and it goes on the BOOZE meter
  return S.drinks.n;
}
// ---------- the BOOZE meter: each drink puts one on; one wears off an hour; a night's sleep clears it ----------
//   S.booze: { level (drinks' worth when last topped up), at (when, counted from the start of the game) }
const BOOZE_WEARS = 60;                                                // minutes for one drink to wear off
const BOOZE_FULL = PUB_LIMIT + 1;                                      // the meter's full: off your stool
// How much is in you now (drinks' worth, wearing off as the time goes by)
function boozeNow() {
  if (!S.booze) return 0;                                              // not had a drink
  const worn = (nowAbs() - S.booze.at) / BOOZE_WEARS;                  // how many have worn off since
  return Math.max(0, S.booze.level - worn);
}
// A drink (or more) on top of what's still in you
function boozeAdd(n) {
  const level = boozeNow() + n;
  S.booze = { level, at: nowAbs() };
}
// Sober again: slept it off
function soberUp() { S.booze = null; }
// How many drinks' worth is still in you, rounded up (half a drink still counts)
const boozeDrinks = () => Math.ceil(boozeNow() - 0.001);
// How full the meter is, 0 to 100
const boozePercent = () => Math.min(100, Math.round(boozeNow() / BOOZE_FULL * 100));
// How many drinks you've had today
const drinksToday = () => (S.drinks && S.drinks.day === S.day ? S.drinks.n : 0);
// Still drunk? (from being thrown out until 7 the next morning, or a night's sleep)
const isDrunk = () => !!S.flags.drunkTill && nowAbs() < S.flags.drunkTill;
// The fourth drink: you slide off your bar stool onto the floor
function fallOffStool() {
  S.flags.pubSat = false;                                              // off the stool…
  S.flags.pubFloor = true;                                             // …and on the floor
  moment('stoolFall', 1800); sfx('thud');
  stillAfter('pubfloor');                                              // flat on the pub floor
  SPEAKER = keeperHead();
  say('The Hesketh Tavern', '"Right. That\'s your fourth, and you\'re on my floor. Out."', [{ label: 'OK', run: thrownOut }]);
}
// The barman warns you with every drink, firmer each time; if you've been thrown out before, he brings it up
const BARMAN_WARNS = [
  '"Go steady, mate. Three\'s the limit in here. Any more and you\'re out."',
  '"That\'s two. Easy does it, mate. I\'m counting."',
  '"That\'s your third, and your last. One more and you\'re out on your ear. I mean it."'
];
const BARMAN_LAST_TIME = [
  '"And none of what happened last time. Off my stool, sick on my step, and your missus fetching you home."',
  '"I\'ve still got the mop out from last time."',
  '"Remember last time? Your missus does."'
];
function barmanWarning(drinks) {
  const k = Math.min(drinks, PUB_LIMIT) - 1;                           // first, second or third
  const before = S.flags.thrownOutDay !== undefined && S.flags.thrownOutDay < S.day;   // thrown out on an earlier day
  const warning = BARMAN_WARNS[k];
  if (!before) return warning;
  return warning + '\n\n' + BARMAN_LAST_TIME[k];
}
// Out on the pavement, and sick in the gutter
function thrownOut() {
  S.flags.pubFloor = false;
  S.inside = false;                                                    // outside the pub
  S.spot.outside = [150, 52];                                          // by the door, where he landed
  const tomorrow = S.mins >= SOBER_AT ? S.day + 1 : S.day;             // the next 7am
  S.flags.drunkTill = tomorrow * 1440 + SOBER_AT;
  S.flags.sick = S.day;                                                // the puddle stays on the pavement all day
  S.flags.thrownOutDay = S.day;                                        // the barman won't forget
  anger(10);
  sfx('door');
  moment('sick', 2600);
  stillAfter('sick');                                                  // sick in the gutter
  say('Outside the pub', 'The door slams behind you. The pavement comes up to meet you, and you\'re sick in the gutter.\n\nA man walking his dog crosses the road.', [{ label: 'OK', run: wifePicksUp }]);
}
// The barman rings her; twenty minutes later she's there, by your car, in her dress
function wifePicksUp() {
  pass(20);
  S.flags.pickup = S.day;                                              // she stands by the car while she has her say
  SPEAKER = wifeHead();
  say('The wife', '"NOT AGAIN, GET IN!"', [{ label: 'OK', run: takenHome }]);
}
// She drives you home in your car; she goes in, and all you can manage is to follow her
function takenHome() {
  delete S.flags.pickup;
  S.flags.drunkHome = true;                                            // too drunk to do anything but go in
  S.flags.wifeWalksIn = true;                                          // she walks into the house ahead of you
  S.spot.home = [96, 96];                                              // out of the car, on the drive
  visit('Home');
  say('Home', 'She drives you home in your car, in silence. She doesn\'t need to say a word.\n\nShe goes in, and takes the car keys with her.');
}
// Through the door: he staggers halfway across the room and folds up on the floor, asleep
const COLLAPSE_AT = [100, 78];                                         // halfway across the room
function drunkCollapse() {
  delete S.flags.drunkHome;
  S.spot.room = [105, 130];                                            // in through the door
  walkTo(COLLAPSE_AT[0], COLLAPSE_AT[1], () => {
    S.flags.onFloor = true;                                            // flat out on the carpet
    moment('collapse', 1400); sfx('thud');
    stillAfter('asleep');                                              // face down on the carpet
    say('Zzzz', 'You stagger halfway across the room… and fold up on the carpet, fast asleep.', [{ label: 'OK', run: sleepItOff }]);
  });
}
// The night goes by on the floor; the morning is not kind
function sleepItOff() {
  sleepUntilMorning();
  anger(15);                                                           // a hangover
  moment('night', 3200);
  say('Next morning', `It's ${weekday()} morning. You wake up face down on the carpet. Your head is pounding, and your mouth tastes of the pub floor.`, [{ label: 'OK', run() { delete S.flags.onFloor; } }]);
}

// ---------- the wife rings you at the pub (once a day) ----------
//   It rings for 10 seconds. Answer: she talks from the phone in your hand. Leave it: a missed call, then a text 10 seconds later
const CALL_TIMES = { after: 4000, ring: 10000, text: 10000 };         // ms: how long after you go in she rings; how long it rings; the text after a missed call
const WIFE_PUB_CALL = 'Where are you? Are you at the pub again? Don\'t drink too much!';
let CALL = null;                                                       // the call ringing now: { who, bell, timer }
let ON_PHONE = false;                                                  // he's holding the phone to his ear (drawn in the pub)
const inPub = () => S.screen === 'place' && S.inside && placeStyle(S.place) === 'pub';
// Going into the pub: she'll ring in a moment (once a day; not once she's asleep)
function pubCallLater() {
  if (S.flags.pubCall === S.day || isAsleep()) return;
  S.flags.pubCall = S.day;
  setTimeout(tryRinging, CALL_TIMES.after);
}
// Ring now, unless he's left (no call) or something's on screen (try again in a second)
function tryRinging() {
  if (!inPub()) return;
  if (DIALOG || ANIM) return setTimeout(tryRinging, 1000);
  incomingCall();
}
// The phone rings: it glows and rattles in your pocket (bottom right). Tap it to answer, or leave it
//   who: who's ringing; words: what they say if you answer; text: what they text if you don't
function incomingCall(who = 'The wife', words = '"' + WIFE_PUB_CALL + '"', text = WIFE_PUB_CALL + ' x') {
  const ring = () => { sfx('ringtone'); sfx('buzz'); };                // the ringtone, and the buzz of it vibrating
  ring();
  const bell = setInterval(ring, 1500);                                // it keeps ringing
  CALL = { who, words, text, bell, timer: setTimeout(missedCall, CALL_TIMES.ring) };
  render();                                                            // the still phone comes out of the picture: the ringing one moves
}
// Stop the ringing (answered, or rung off)
function stopRinging() {
  if (!CALL) return;
  clearInterval(CALL.bell);
  clearTimeout(CALL.timer);
  CALL = null;
  render();                                                            // the phone goes still again
}
// Answered: phone to his ear, and their voice comes out of it (in the pub you see him holding it)
function answerCall() {
  const { who, words } = CALL;
  stopRinging();
  if (inPub()) { ON_PHONE = true; SPEAKER = phoneInHand(); }
  say(who, words, [{ label: 'OK', run() { ON_PHONE = false; } }]);
}
// Not answered: a missed call, and then they text
function missedCall() {
  const { who, text } = CALL;
  stopRinging();
  S.msgs.unshift({ from: who, body: 'Missed call', when: clockText(), read: false });
  sfx('buzz');
  save(); render();
  setTimeout(() => { textMsg(who, text); save(); render(); }, CALL_TIMES.text);
}
// ---------- other people ring you now and then (each once): Mum, a wrong number, a cold caller, the dealer, Paul ----------
//   [id, who, what they say if you answer, what they text if you don't]
const PHONE_CALLS = {
  mumdad: ['Mum & Dad', '"Hello love, it\'s Mum. Your dad says come over any time and he\'ll have a look at the car. He knows cars."\n\nIn the background: "I DO KNOW CARS."',
    'Come over any time love. Dad says bring the car, he\'ll have a look x'],
  wrong: ['Unknown number', '"Is that Kebab Kingdom? Large doner, extra chilli, and a—"\n\nYou tell him it isn\'t.\n\n"…Are you sure?"',
    'large doner extra chilli. 20 mins?'],
  cold: ['Unknown number', '"Hello! We understand you\'ve been in an accident that wasn\'t your fault."\n\nYou haven\'t.\n\n"Are you sure? Your car sounds very upset."',
    'You may be entitled to compensation. Reply STOP to stop. Reply START to start.'],
  dealer: ['Main Dealer', '"Hi, it\'s the Main Dealer! Your Zafira\'s due a service. We can fit you in on the 14th of next month. That\'s £299. Shall I put you down?"\n\nYou say you\'ll think about it. You won\'t.',
    'Your Zafira is due a service. Call us to book (from £299).'],
  jack: ['Paul', '"Mate. Your jack. Funny story. I lent it to Dodgy Dave."\n\n"No, I don\'t know where he lives either."',
    'got ur jack. sort of. long story']
};
let NO_CALLS = !!window.NO_CALLS;                                      // the tests turn the calls off (a test turns them on)
// Someone rings: as soon as the phone's on screen and nothing else is going on (not while the phone's dead)
function ringWhenFree(id) {
  if (NO_CALLS) return;
  const [who, words, text] = PHONE_CALLS[id];
  const tryNow = () => {
    if (S.flags.phoneDead) return setTimeout(tryNow, 5000);           // dead: they'll get through once it's charged
    if (!HUD_SHOWN || DIALOG || ANIM || CALL) return setTimeout(tryNow, 1000);   // busy: try again in a second
    incomingCall(who, words, text);
  };
  setTimeout(tryNow, 1500);
}
// At your car outside the pub with a drink in you: ring a taxi, or try to drive (the key game, then the police)
function drunkAtCar() {
  say('Your car', "You've had a drink. You know you have.", [
    { label: `Ring for a taxi home (£${TAXI_FARE})`, run: taxiFromPub },
    { label: 'Drive anyway', run: keyStart },
    { label: 'Not yet', run() {} }
  ]);
}
// After a drink or three: the key in the car door (a little game: the key wobbles and drifts about)
function keyStart() {
  KEY.drinks = boozeDrinks();                                          // how much is still in you
  KEY.scratches = [];
  KEY.aim = [KEYHOLE[0] + 120, KEYHOLE[1] + 60];                       // his hand starts off to one side
  show('keyhole');
}
// Tap: is the tip of the key in the lock?
function keyTry() {
  const [kx, ky] = KEY.pos;
  const inLock = Math.hypot(kx - KEYHOLE[0], ky - KEYHOLE[1]) <= KEY_FIT;
  if (!inLock) {                                                       // missed: a scratch on the paintwork
    KEY.scratches.push([kx, ky]);
    sfx('slip');
    anger(2);
    if (KEY.scratches.length >= KEY_GIVE_UP) return keyStuck();        // that's enough: you're not getting in
    return render();
  }
  sfx('click');
  const tries = KEY.scratches.length;
  const scratched = tries ? ` (and ${tries} new scratch${tries > 1 ? 'es' : ''} round the lock)` : '';
  say('The car door', `Click. It goes in at last${scratched}. You get in and sit very still for a minute.`, [{ label: 'OK', run: pullOver }]);
}
// How many misses before you give up on the lock
const KEY_GIVE_UP = 8;
// You can't get the key in: you're stuck here until it wears off
function keyStuck() {
  const n = KEY.scratches.length;
  const scratches = n ? `${n} new scratch${n > 1 ? 'es' : ''} round the lock, and ` : '';
  const hours = Math.max(1, Math.ceil(boozeNow() * BOOZE_WEARS / 60));  // how long it'll take to wear off
  say('The car door', `${scratches}the key still won't go in. You're not driving anywhere like this.\n\nYou're stuck here till it wears off: about ${hours} hour${hours > 1 ? 's' : ''}. Or get a taxi.`, [
    { label: `Ring for a taxi home (£${TAXI_FARE})`, run: taxiFromPub },
    { label: 'Sit on the wall till it wears off', run: waitItOff },
    { label: 'Leave it for now', run() { show('place'); } }
  ]);
}
// Sitting on the wall outside till the drink wears off: then you can drive
function waitItOff() {
  const mins = Math.max(15, Math.ceil(boozeNow() * BOOZE_WEARS / 15) * 15);   // to the next quarter of an hour
  pass(mins);
  soberUp();
  anger(5);
  KEY.scratches = [];
  show('place');                                                       // back outside, by the car
  say('The wall', `You sit on the wall by the car for ${mins >= 60 ? Math.round(mins / 60 * 10) / 10 + ' hours' : mins + ' minutes'}. It wears off.\n\nYou're cold and you need the loo, but you're fit to drive.`);
}
// A new headlight in on this side: the smashed one comes out (into the parts box)
function fitLamp(side) {
  const have = spareLamps();
  pass(30); sfx('ratchet');
  have[side] -= 1;
  finishJob(side === 'left' ? 'broke-headlight' : 'broke-headlight2', `New ${side} headlight fitted`);
  junkIt(side === 'left' ? 'lamp-left' : 'lamp-right');               // the smashed one goes in the parts box
  say('The headlight', 'Four clips, two screws and one skinned knuckle later, it works.\n\nThe smashed one goes in the parts box.');
}
// The spare on the shelf is for the other side
function wrongLamp(side) {
  const got = side === 'left' ? 'right' : 'left';
  pass(15); anger(10);
  say('The headlight', `You try the one off the shelf. It doesn't go. It's a ${got} one, and the smashed one is the ${side}.\n\nIt goes back on the shelf. One day that side will need it.`);
}
// The code reader out of the port: back on the garage shelf
function unplugReader() {
  S.flags.readerIn = false;
  sfx('click');
  say('Code reader', 'You unplug it. It goes back on the garage shelf.');
}
// Driving off after a drink: first the police car behind you, pulling you over (road.js); then the knock on the window
function pullOver() {
  sfx('policesiren');                                                  // the two-tone, all the way through
  show('pullover');
  moment('pullover', PULLOVER_MS);
  ANIM.then = policeStop;
}
// Driving off after a drink: you always get pulled over
function policeStop() {
  say('Blue lights', 'You get as far as the end of the road. Blue lights in the mirror.\n\nA policeman taps on your window. "Evening, sir. Had a drink tonight, have we? Blow into this, please."', [{ label: 'OK', run: breathStart }]);
}
// The breath test: hold to blow for about 6 seconds; the lights climb from green to red
//   1 drink: half way, a pass. 2 or 3: all the way to red, three beeps, a fail; blow again, fail again, and a £300 fine
const BREATH_TIME = { secs: 6 };                                       // how long you have to blow for
const BREATH_LEDS = 10;                                                // the row of lights on the breathalyser
const BREATH_FINE = 300;
const BREATH = { drinks: 1, t0: null, lit: 0, tries: 0, beeped: false, ticket: false };
function breathStart() {
  BREATH.drinks = boozeDrinks();                                       // what's still in you
  BREATH.tries = 0;
  BREATH.ticket = false;
  breathReset();
  show('breath');
}
// Ready for a (fresh) blow
function breathReset() { BREATH.t0 = null; BREATH.lit = 0; BREATH.beeped = false; BREATH.short = false; }
// How far up the lights go for him (1 drink: half; more: all the way)
const breathTop = () => (BREATH.drinks <= 1 ? BREATH_LEDS / 2 : BREATH_LEDS);
// Press and hold: he starts blowing
function breathDown() {
  if (BREATH.ticket) return;
  breathReset();
  BREATH.t0 = performance.now();
  blowSound(true);                                                     // you hear him blowing into it (sound.js)
}
// Each frame while blowing: light the row up to how long he's blown for
function breathTick() {
  if (BREATH.t0 === null) return;
  const held = (performance.now() - BREATH.t0) / 1000 / (BREATH_TIME.secs * 0.5);   // the lights climb in half the time you blow for (Steve: faster)
  const lit = Math.min(breathTop(), Math.floor(held * breathTop() + 0.001));
  for (let k = BREATH.lit; k < lit; k++) breathBeep(k);                // each light that comes on beeps, each a bit higher (sound.js)
  BREATH.lit = lit;
  if (BREATH.lit >= BREATH_LEDS && !BREATH.beeped) { BREATH.beeped = true; sfx('beep3'); }   // red: beep beep beep
}
// Let go: long enough? then the result; too short, blow again
function breathUp() {
  if (BREATH.t0 === null) return;
  breathTick();
  blowSound(false);                                                    // he stops blowing
  const held = (performance.now() - BREATH.t0) / 1000;
  BREATH.t0 = null;
  if (held < BREATH_TIME.secs) {                                        // stopped too soon
    BREATH.short = true; BREATH.lit = 0;
    return render();
  }
  if (BREATH.drinks <= 1) {                                             // half way: under the limit
    flashStill('breathpass');                                           // green and amber: a pass
    return say('The policeman', '"Green and amber. Just under, sir. Drive carefully now."', [{ label: 'OK', run() { show('city'); } }]);
  }
  BREATH.tries += 1;
  anger(10);
  if (BREATH.tries < 2) {                                               // a fail: they make you do it again
    flashStill('breath');                                               // all the way to red
    return say('The policeman', '"All the way to red, sir. That\'s a fail. We\'ll do it again, just to be sure."', [{ label: 'OK', run() { breathReset(); render(); } }]);
  }
  // failed again: the fine, on paper
  BREATH.ticket = true;
  fineIssued();                                                        // the fine comes in the post (police.js)
  anger(15);
  render();
  say('The policeman', `"Red again, sir." He writes you up. "A £${BREATH_FINE} fixed penalty. It'll come in the post."\n\n"Leave the car here and walk home. And don't let me see you behind the wheel tonight."`, [{ label: 'OK', run: walkHomeFined }]);
}
// After the fine: you walk home; the car's left where they stopped you, until the morning
function walkHomeFined() {
  pass(40);
  S.flags.drunkTill = (S.mins >= SOBER_AT ? S.day + 1 : S.day) * 1440 + SOBER_AT;   // no driving till morning
  visit('Home');
  say('Home', 'A long walk home, with the ticket in your pocket.');
}

// Trying to drive while drunk: no keys
function noKeys() {
  anger(3);
  say('The car', "Not tonight. You're in no state to drive, and you know it. Best sleep it off.");
}

// The barman's advice (no help at all)
const BARMAN = [
  '"Have you tried turning it off and on again?"',
  '"Sounds like the big end, mate. It\'s always the big end."',
  '"My cousin had a Zafira. Sold it to a man in a pub. Might have been you."',
  '"You want a bit of WD-40 on that."',
  '"Last orders at midnight, mind."'
];

// What your wife says about the car (mostly: scrap it)
const WIFE_SCRAP = [
  '"Just scrap it, Husband. Get a little Fiesta."',
  '"The man at the scrapyard said he\'d give us £150 for it."',
  '"You\'ve spent more on that car than we spent on the wedding."',
  '"My sister\'s husband scrapped his. He\'s never been happier."',
  '"Is it fixed yet, Husband? No? Scrap it."',
  '"I\'ve found a lovely little Micra. One owner. A vicar."'
];
// What she says, in person or on the phone (the same either way)
//   late: come to bed; otherwise mostly "scrap it", and every third time something useful
// What she says on her sun lounger, not looking up from her magazine
const GARDEN_LINES = [
  '"You\'re in my sun, Husband."',
  '"It says here a man in Leeds fixed his car with a hairdryer. Have you tried a hairdryer?"',
  '"This is my martini. Get your own. Then scrap the car."',
  '"Shh. I\'m reading about a woman whose husband sold his car and took her to Spain."',
  '"Is it fixed? No? Then why are you out here?"'
];
function gardenLine() {
  S.gardenTalks = (S.gardenTalks || 0) + 1;                            // she goes through them in turn
  return GARDEN_LINES[(S.gardenTalks - 1) % GARDEN_LINES.length];
}
function wifeLine() {
  S.wifeTalks = (S.wifeTalks || 0) + 1;
  if (isBedtime()) return S.wifeTalks % 2 ? '"Come to bed, Husband. The car will still be broken in the morning."' : '"Leave the car, Husband. Come to bed."';   // in her nightie: bed
  const n = S.wifeTalks;
  if (n >= 3 && n % 4 !== 0) {                                          // after the first couple of moans: what's going on (now and then a moan again)
    if (n % 2 === 1) return wifeTip();                                  // something that might actually help
    const remark = wifeRemark();                                        // or just a remark about it
    if (remark) return remark;
    return wifeTip();
  }
  if (S.flags.wifePaid && n % 3 === 1) { anger(5); return '"I paid for that, Husband. Again. For a car I told you to scrap."'; }   // she's paid out: she's not happy
  anger(5);                                                            // "scrap it" again: that winds you up
  return WIFE_SCRAP[Math.floor(S.wifeTalks / 3 * 2) % WIFE_SCRAP.length];
}
// What's going on, as she sees it: not always helpful, just about what's happened (null if nothing much)
function wifeRemark() {
  const k = kickedLamps();
  if (S.road && !S.road.walked) return '"Where IS the car, Husband?"';
  if (S.road) return '"Look after my car, Husband. It\'s the only one that works."';
  if (S.flags.carAt) return `"Where's the car? Still outside the pub? Of course it is."`;
  if (S.fine && S.fine.clamped && !S.fine.paid) return '"There\'s a yellow thing on your car, Husband. The neighbours are looking."';
  if (boozeNow() > 0) return '"Have you been at the pub? You have. I can smell it."';
  if (k.left && k.right) return '"Both headlights, Husband. Both."';
  if (k.left || k.right) return '"You kicked the headlight in. I saw. Ken saw."';
  if (S.flags.jarSpilt && !S.flags.jarSwept) return '"Why are there screws all over the garage floor?"';
  if (S.flags.boxOff && !S.flags.fitted) return '"What\'s that metal box doing on your workbench? Is that off the car?"';
  if (S.flags.screwsTried && S.flags.screwsTried.length) return '"Have you been through every screw in that jar? You have, haven\'t you."';
  if (S.flags.mumMoneyDay !== undefined) return '"Your mother rang. She says you sounded skint."';
  if (S.flags.paulLent) return '"Paul says you owe him twenty pounds. He said it twice."';
  if (S.brother) return '"Was that Paul? Did he take something? He always takes something."';
  if (S.flags.thrownOutDay !== undefined) return '"The barman rang me again, Husband. Again."';
  if (S.junked && S.junked.length > 3) return '"Your parts boxes are full of broken things. Like the car."';
  if (S.flags.codes) return '"You and your codes. P-whatever. It\'s still broken."';
  return null;
}
// …and now and then, something that actually helps (whatever you're stuck on)
function wifeTip() {
  if (S.flags.cardBlocked) return '"Go to the bank about your card, Husband. They\'re only open Monday to Wednesday, ten till two."';
  if (S.fine && !S.fine.paid) return '"Pay that fine at the Post Office, Husband. Before they clamp the car."';
  if (S.money < SKINT) return '"Ring your mum. She\'ll help. She always helps."';
  if (S.flags.nutSeen && !S.inv.stick) return '"Use a stick, Husband. Snap one off the hedge. Or there\'s that golf club in your boxes."';
  if (S.flags.n3lost && !S.flags.n3found && !S.flags.torchLit) return '"There\'s a torch in your toolbox, Husband. Your phone\'s one is broken."';
  if (S.flags.b2round && !S.flags.b2 && !S.inv['extractor-cheap'] && !S.inv['extractor-good']) return '"Ken next door says you want a bolt extractor. The Tool Shop."';
  if (S.flags.sheared && !S.flags.stubOut) return '"That snapped screw: same as the bolt. The extractor."';
  if (S.flags.stubOut && !S.flags.screw3) return '"There\'s a whole jar of screws on your shelf, Husband."';
  if (S.flags.codes && !leadExists('sensor')) return '"Old Ron at the pub knows about cars. So he says."';
  if (!S.inv.handbook && !S.flags.handbookTip) { handbookTip(); return '"Have you looked in the car handbook, Husband? It\'ll all be in the handbook."'; }
  if (!S.flags.codes) return '"Can\'t you plug something into it? Gaz had a gadget that reads the codes."';
  if (S.flags.needHammer && !S.inv.hammer) return '"Paul never gave your hammer back. The Hardware Shop will have one, whatever they tell you."';
  if (leadOpen('fusebook') || leadOpen('fusediagram')) return '"Have you checked the fuses? My dad always checked the fuses first."';
  if (S.radio && !S.radio.unlocked) { radioCodeNoted('your wife says it\'s always 1234'); return '"The radio code\'s in the handbook. Or it\'s 1234. It\'s always 1234."'; }
  return '"Have a cup of tea first, Husband. Then scrap it."';
}

// =====================================================================
// THE BREAKERS YARD: by appointment only. The number's on a card on the gate;
// ring it and book a 2-hour slot, and only in that slot will they let you in
// =====================================================================
const YARD = 'Scrap Yard';
const YARD_PHONE = '01632 960451';                                 // a made-up number (01632 960 numbers are kept for drama)
const YARD_SLOT = 120;                                             // a slot lasts 2 hours
// Is your booked slot on right now?
function yardSlotNow() {
  const slot = S.yardSlot;                                         // the slot you booked, if any: { day, from }
  if (!slot || slot.day !== S.day) return false;                   // none, or not today
  return S.mins >= slot.from && S.mins < slot.from + YARD_SLOT;    // inside its two hours?
}
// Has your booked slot been and gone?
function yardSlotMissed() {
  const slot = S.yardSlot;
  if (!slot) return false;                                         // nothing booked
  if (slot.day < S.day) return true;                               // it was on an earlier day
  return slot.day === S.day && S.mins >= slot.from + YARD_SLOT;    // it was earlier today
}
// A slot's day in words: today, tomorrow, yesterday, or the day's name
function slotDay(slot) {
  if (slot.day === S.day) return 'today';
  if (slot.day === S.day + 1) return 'tomorrow';
  if (slot.day === S.day - 1) return 'yesterday';
  return DAYS[slot.day % 7];
}
// A slot written out: "tomorrow 09:00–11:00" (or, for the notebook, "WED 09:00–11:00", which doesn't go out of date)
function slotText(slot, byName) {
  const day = byName ? DAYS[slot.day % 7] : slotDay(slot);
  return `${day} ${hhmm(slot.from)}–${hhmm(slot.from + YARD_SLOT)}`;
}
// Why the yard won't let you in (null: your slot is on, so it's open)
function yardShut() {
  if (yardSlotNow()) return null;                                  // your slot: in you go
  if (yardSlotMissed()) return `By appointment only. Your slot was ${slotText(S.yardSlot)}. You missed it. Ring ${YARD_PHONE} to book another.`;
  if (S.yardSlot) return `By appointment only. Your slot is ${slotText(S.yardSlot)}. Not before.`;
  return `By appointment only. A card on the gate says: "Ring ${YARD_PHONE} to book."`;
}
// At the gate: the number goes in your phone (the first time), and a job to get in
function yardGate() {
  if (S.flags.yardNumber) return '';                               // you've already got it
  S.flags.yardNumber = true;                                       // it's in the phone now
  job('yard', 'Get into the Scrap Yard (by appointment only)', null);
  lead('yard', 'yard-ring', 'Ring the Scrap Yard to book a slot', 'the card on the gate', 'sure', 'phone');
  return '\n\nYou put the number in your phone.';
}
// The slots he offers: today's next one (if there's time), and tomorrow morning and afternoon
function yardSlotsOffered() {
  const [open, shut] = PLACE_INFO[YARD].open;                      // the yard's hours: slots fit inside them
  const offered = [];
  const soonest = Math.ceil((S.mins + 60) / 60) * 60;              // today: on the hour, an hour from now at the earliest
  const today = Math.max(open, soonest);
  if (today + YARD_SLOT <= shut) offered.push({ day: S.day, from: today });
  offered.push({ day: S.day + 1, from: open });                    // tomorrow morning
  offered.push({ day: S.day + 1, from: shut - YARD_SLOT });        // tomorrow afternoon
  return offered;
}
// Ringing the yard: an answerphone out of hours; otherwise pick a slot
function ringYard() {
  const [open, shut] = PLACE_INFO[YARD].open;
  if (S.mins < open || S.mins >= shut) {                           // out of hours: nobody's there
    return say('Ringing the Scrap Yard', `An answerphone: "Scrap Yard. Office ${hhmm(open)} till ${hhmm(shut)}. Strictly by appointment." Beep.`);
  }
  const slots = yardSlotsOffered().map(slot => ({ label: 'Book ' + slotText(slot), run() { bookYard(slot); } }));
  say('Ringing the Scrap Yard', '"Yard. Appointment, is it? Two-hour slots. When d\'you want?"\n\nA dog barks the whole time.', slots.concat([{ label: 'Never mind', run() {} }]));
}
// Book a slot (a new one replaces the old one)
function bookYard(slot) {
  S.yardSlot = slot;
  job('yard', 'Get into the Scrap Yard (by appointment only)', null);
  closeLead('yard-ring', 'ok');                                     // rang them
  note('yard', 'Booked a slot: ' + slotText(slot, true), 'ok');     // in the notebook, by the day's name
  lead('yard', 'yard-go', 'Go to the Scrap Yard in your slot', 'the man at the yard', 'sure', 'place:' + YARD);
  say('Ringing the Scrap Yard', `"${slotText(slot)}. Don't be late. The dog doesn't like late."`);
}
// In through the gate in your slot
function yardIn() {
  if (S.place !== YARD) return;
  closeLead('yard-go', 'ok');
  finishJob('yard', 'In through the gate, in my slot');
}

// Is a place open right now? Returns null if open, or the reason it isn't
function closedReason(name) {
  const info = PLACE_INFO[name] || {};
  if (info.gone) return 'Boarded up. OUT OF BUSINESS. The website still takes bookings.';
  if (info.holiday) return 'A sign on the door: "On holiday. Back in 3 weeks. Sorry for any inconvenience."';
  if (info.byAppointment) return yardShut();                       // the yard: only in a slot you've booked
  if (placeStyle(name) === 'house') {                               // someone's house: not "closed", but they're in bed or not up yet
    if (S.mins < 6 * 60) return "The lights are all off and the curtains are drawn. They've gone to bed.";   // midnight till 6
    if (S.mins < 8 * 60) return 'The curtains are still drawn. Too early.';                                 // 6 till 8
    return null;
  }
  if (info.closedDays && info.closedDays.includes(weekday())) return `Closed on ${weekday()}s.`;
  const [from, to] = info.open || [9 * 60, 17 * 60 + 30];
  if (S.mins < from) return `Closed. Opens at ${hhmm(from)}.`;
  if (S.mins >= to) return `Closed. Shut at ${hhmm(to)}. It's ${hhmm(S.mins)}.`;
  if (info.lunch && S.mins >= 12 * 60 && S.mins < 14 * 60) return 'A sign on the door: "Back in 10 minutes." (It\'s been there since 12:00.)';
  return null;
}
// Arriving at a place: open, or closed (with a reason)
function arriveAt(name) {
  S.spot = S.spot || {};
  S.counter = null;                                                // not up at anyone's counter yet
  S.spot.place = [105, 140];                                       // you come in at the door
  S.spot.outside = [100, 52];                                       // and get out of the car on the pavement
  S.inside = placeStyle(name) === 'house';                         // shops: you see the outside first; houses: you're on the doorstep
  if (name === MUM_DAD) S.spot.place = MUM_DAD_YOU;                 // Mum & Dad's: you're out at the car with Dad
  if (name === 'Post Office') {                                     // the post office: when you got here decides your place in the queue
    S.po = { day: S.day, arrived: S.mins };
    if (poInQueue()) S.spot.outside = poSlot(poAhead());              // before 9: you join the back of the queue outside
  }
}
// Talking at the counter (or on the doorstep)
// THE CAFÉ: buy a coffee. Like the bank, he asks question after question (ten); then he calls out its whole name (Steve)
const COFFEE_PRICE = 6.85;
const COFFEE_QUESTIONS = [
  ['"What size?"', ['Tall', 'Grande', 'Venti']],
  ['"What milk?"', ['whole milk', 'nonfat', 'oat milk']],
  ['"Any syrup?"', ['sugar-free vanilla', 'hazelnut', 'pumpkin spice']],
  ['"And what drink is it?"', ['caramel macchiato', 'flat white', 'cappuccino']],
  ['"How many shots?"', ['double shot', 'quad shot', 'decaf']],
  ['"Temperature?"', ['extra hot', 'iced', 'kids\' temperature']],
  ['"Foam?"', ['extra foam', 'no foam', 'light foam']],
  ['"Whipped cream?"', ['add whip', 'no whip', 'double whip']],
  ['"Sweetener?"', ['add 3 Splenda', 'add 2 sugars', 'no sweetener']],
  ['"And on top?"', ['extra caramel drizzle', 'mocha drizzle', 'a cinnamon dusting']]
];
function coffeeOrder(n = 0, picks = []) {
  const [q, answers] = COFFEE_QUESTIONS[n];
  const intro = n === 0 ? '"Hiya! What can I get you?"\n\nYou: "Just a coffee, please."\n\n"Lovely."\n\n' : '';
  say('Café', intro + q, answers.map(a => ({ label: a, run() {
    SPEAKER = keeperHead();
    const chosen = picks.concat([a]);
    if (n + 1 < COFFEE_QUESTIONS.length) return coffeeOrder(n + 1, chosen);   // the next question
    return coffeeServed(chosen);
  } })));
}
// All ten answered: he makes it, and calls out its full name
function coffeeServed(picks) {
  if (!spend(COFFEE_PRICE, true)) return say('Café', '"Card\'s been declined, love."\n\n(She won\'t pay for coffee.)');   // a treat: the wife won't pay
  pass(15); anger(-8); sfx('pour');
  const name = picks.slice(0, -1).join(', ') + ', and ' + picks[picks.length - 1];   // every choice, in order
  say('Café', `He makes it. It takes a while.\n\n"A ${name}!"\n\nHe's written "DAVE" on the cup. You're not Dave. It's £${COFFEE_PRICE.toFixed(2)}. It tastes of coffee.`);
}
// Ringing someone between midnight and six in the morning: woken up, and they let you know it
const LATE_CALLS = {
  Gaz: ['Ringing Gaz', `"Mate. MATE. It's gone midnight. Is the car on fire? No? Then ring me tomorrow." Click.`],
  Mum: ['Dad', `Dad answers. "Who's died?"\n\n"Nobody? Then why are you ringing at this time? You've woken your mother." Click.`],
  Brother: ['Ringing Paul', `"It's the middle of the night! I'm up at five for work!" He hangs up.`],
  Wife: ['Ringing the wife', `Her phone buzzes on the bedside table. "WHAT. It's past midnight, Husband. I'm asleep. Come to bed."`],
  Yard: ['Ringing the Scrap Yard', `It rings and rings. Then the dog starts barking somewhere in the yard. Nobody answers. It's the middle of the night.`]
};
// THE FRUIT MACHINE in the pub: £1, £5 or £10 a go; three the same on the win line pays ten times your stake (Steve).
//   It mostly doesn't: about one go in twelve wins
const FRUIT_STAKES = [1, 5, 10];
const FRUIT_SYMBOLS = ['cherry', 'bell', 'seven', 'lemon', 'bar'];
const FRUIT_WIN_CHANCE = 1 / 12;
function fruitOffer() {
  say('Fruit machine', 'JACKPOT £100, it says. It flashes and plays a little tune at you.\n\nThree the same pays ten times what you put in.', FRUIT_STAKES.map(st => ({ label: `Play for £${st}`, run() { fruitPlay(st); } })).concat([{ label: 'Leave it', run() {} }]));
}
// Put the money in and pull: the reels spin, stop one by one, and then you know
function fruitPlay(stake) {
  if (!spend(stake, true)) return say('Fruit machine', 'Your card won\'t go in. It\'s a fruit machine. It takes coins. You get some change from the bar… which your card won\'t pay for either.');   // a treat: the wife won't pay
  const win = Math.random() < FRUIT_WIN_CHANCE;
  const pick = () => FRUIT_SYMBOLS[Math.floor(Math.random() * FRUIT_SYMBOLS.length)];
  let result;
  if (win) { const s = pick(); result = [s, s, s]; }                   // three the same
  else {                                                               // anything but three the same
    result = [pick(), pick(), pick()];
    if (result[0] === result[1] && result[1] === result[2]) result[2] = FRUIT_SYMBOLS[(FRUIT_SYMBOLS.indexOf(result[2]) + 1) % FRUIT_SYMBOLS.length];   // all the same by chance: nudge the last one off
  }
  FRUIT.spinTo = result;
  sfx('pop');                                                          // the coin drops
  moment('reels', 1800);
  ANIM.then = () => fruitResult(stake, result, win);
}
// The reels have stopped: a win pays out ten times the stake; otherwise nothing
function fruitResult(stake, result, win) {
  FRUIT.show = result;
  pass(5);
  const says = result.map(r => (r === 'bar' ? 'BAR' : r === 'seven' ? '7' : 'a ' + r)).join(', ');
  if (win) {
    moneyIn(stake * 10, `£${stake * 10} off the fruit machine`);
    anger(-10);
    return say('Fruit machine', `${says}. Three the same!\n\nIt rattles and clanks and pays out £${stake * 10}. The regulars look over. Old Ron says it's never paid out before.`, [{ label: 'Play again', run: fruitOffer }, { label: 'Quit while you\'re ahead', run() {} }]);
  }
  anger(3);
  say('Fruit machine', `${says}. Nothing.\n\nIt plays a sad little tune.`, [{ label: 'Play again', run: fruitOffer }, { label: 'Leave it', run() {} }]);
}
// The reels spinning: each a blur of symbols, the first stopping, then the second, then the third
MOMENTS.reels = function (p) {
  for (let k = 0; k < 3; k++) {
    const stopAt = 0.45 + k * 0.22;                                    // when this reel stops
    if (p >= stopAt) { fruitReel(k, FRUIT.spinTo[k]); continue; }
    const tick = Math.floor(performance.now() / 70 + k * 3);          // fast, then a symbol at a time
    fruitReel(k, FRUIT_SYMBOLS[tick % FRUIT_SYMBOLS.length]);
  }
};
function talk(name) {
  pass(10);
  SPEAKER = keeperHead();                                          // what they say comes in a speech bubble from them
  const fn = TALK[name];
  if (fn) return fn();
  // everywhere else: friendly, sure of itself, and no help
  const lines = [
    "Not us, mate. Try round the corner.",
    "We don't do that. Never have.",
    "Twenty years I've done this and I've never heard of that.",
    "You want the main dealer for that. Or don't. They're useless.",
    "Ooh. No. Couldn't tell you.",
    "We had one of those last week. Can't remember what it was.",
    "Sounds electrical. Or mechanical. One of the two."
  ];
  const i = Math.floor(hash(name.length * 7, name.charCodeAt(0)) * lines.length);
  say(name, lines[i]);
}
const TALK = {
  // the pub: the barman takes your order (or gives you advice you didn't need)
  'The Hesketh Tavern'() {
    const name = 'The Hesketh Tavern';
    const pour = (drink, price, taste) => ({ label: `${drink} (£${price.toFixed(2)})`, run() {
      SPEAKER = keeperHead();
      if (!spend(price, true)) return say(name, '"Card machine says no, mate."\n\n(Skint. Mum & Dad might help you out. Or Paul.)');   // (she won't pay for beer)
      pass(30); anger(-12); sfx('pour'); S.flags.pint = true; pubLate();
      const cured = pintCures();                                       // were you past tea and sleep? (extras.js)
      if (cured) anger(-30);                                           // then this is the one that works
      const relief = cured ? 'The first sip. Oh, that\'s better. That\'s MUCH better.\n\n' : '';
      const drinks = haveADrink();                                     // how many you've had today, this one included
      if (drinks > PUB_LIMIT) return say(name, `He pulls you a ${drink}. ${taste}\n\nYou drink it far too fast. The bar starts to tilt.`, [{ label: 'OK', run: fallOffStool }]);
      say(name, `He pulls you a ${drink}. ${taste}\n\n${relief}${barmanWarning(drinks)}`);   // every drink: a warning, firmer each time
    } });
    S.flags.pubSat = true;                                              // you sit up at the bar to order
    say(name, '"Evening. What\'ll it be?"', [
      pour('Hazy DIPA', 6.2, 'It tastes of grapefruit and regret. 8.2%.'),
      pour('Cider', 4.8, 'Cloudy. Possibly made this morning.'),
      pour('Lager', 4.9, 'Cold. Fizzy. Fine.'),
      pour('Bitter', 4.2, 'Flat, brown and perfect.'),
      { label: 'Just some advice', run() { SPEAKER = keeperHead(); say(name, BARMAN[(S.pubTalks = (S.pubTalks || 0) + 1) % BARMAN.length]); } }
    ]);
  },
  'MOT Test Centre'() {
    // the first time: his verdict, and he hands over the failure sheet
    if (!S.flags.motDone) {
      closeLead('tester', 'ok');
      motVerdict();                                                   // the real job starts here
      return say('MOT Test Centre', '"Lovely car, this. Brakes are good, tyres are good, lights are good. Not a spot of rust."\n\n"But there\'s a red light on the dashboard. That\'s a fail."\n\nHe hands you the failure sheet.', [{ label: 'OK', run() {
        SPEAKER = keeperHead();                                       // tap to carry on: then he waits for your questions
        say('MOT Test Centre', '"Anything else, mate?"', testerQuestions());
      } }]);
    }
    // after that: ask him whatever you like
    say('MOT Test Centre', '"Rebook when it\'s fixed, mate. If it\'s ever fixed."', testerQuestions());
  },
  'Police Station'() { policeTalk(); },                                  // no help (police.js)
  'Bank'() { bankTalk(); },
  'Café'() { coffeeOrder(); },                                         // ten questions, then a coffee with a very long name
                                             // a blocked card: security questions (bank.js)
  'Post Office'() {
    if (payFineAtPost()) return;                                        // a fine to pay: window 3, no queue (police.js)
    if (postFirst()) return say('Post Office', '"Next!"\n\nYou\'re first. You\'ve been waiting outside since before nine for this.\n\n"What are you posting?"\n\nYou haven\'t got anything to post yet.');
    anger(5);
    say('Post Office', 'You join the back of the queue. Ten people. Nobody moves.');   // waiting in it: the watch
  },
  'Spanner & Son'() {
    if (S.flags.spanner) return say('Spanner & Son', '"Still three months, mate."');
    S.flags.spanner = true;
    anger(5);
    closeLead('ask-mech', 'x', 'Spanner & Son: earliest is 3 months');
    lead('codes', 'quickfix', 'Try Quickfix Motors', "Spanner's son", 'sure', 'place:Quickfix Motors');
    say('Spanner & Son', '"Ooh, not good. Earliest I can look at it is three months, mate."\n\nHis son leans out of the office: "Try Quickfix."');
  },
  'Quickfix Motors'() {
    if (S.flags.quickfix) return say('Quickfix Motors', '"Like I said: we don\'t do autos."');
    S.flags.quickfix = true;
    closeLead('quickfix', 'x', "Quickfix: they don't do autos");
    closeLead('ask-mech', 'x');
    lead('codes', 'sparkys', "Get the codes read at Sparky's", 'Quickfix', 'very sure', "place:Sparky's Auto Electrics");
    lead('codes', 'dealer', 'The main dealer can read the codes', 'Quickfix', 'sure, but dear', 'place:Main Dealer');
    say('Quickfix Motors', '"We don\'t do autos. You want the codes read first. Sparky\'s has a reader. Or the main dealer, if you\'re made of money."');
  },
  "Sparky's Auto Electrics"() {
    if (S.flags.sparky) return say("Sparky's", '"Still broken, mate."');
    S.flags.sparky = true;
    closeLead('sparkys', 'x', "Sparky's: their reader's broken");
    lead('codes', 'mega-reader', 'Buy your own code reader on Zamanon', 'Sparky', 'fairly sure', 'app:MegaMart');
    say("Sparky's Auto Electrics", '"Reader\'s broken, mate. Waiting on a part. Get your own: Zamanon do one for a tenner."');
  },
  'Main Dealer'() {
    if (S.flags.codes) return say('Main Dealer', '"Anything else? That\'ll be £120."');
    say('Main Dealer', '"We can plug it in, sir. That\'s £120 for the diagnostic."', [
      { label: 'Pay £120', run() {
        if (!spend(120)) { anger(10); return say('Main Dealer', DECLINED); }
        pass(30);
        closeLead('dealer', 'ok', 'Main dealer read the codes (£120)');
        readCodes('main dealer, £120');
      } },
      { label: 'Too dear', run() { anger(5); say('Main Dealer', '"Suit yourself."'); } }
    ]);
  },
  'Tameside Transmissions'() {
    closeLead('gurus', 'x', 'Tameside Transmissions: "that\'s electrics"');
    if (S.flags.codes) lead('meaning', 'voltz', 'Next door: Voltz Auto Electric', 'Tameside Transmissions', 'very sure', 'place:Voltz Auto Electric');
    say('Tameside Transmissions', '"P0705? That\'s electrics, mate. Nothing to do with the gearbox. Go next door to Voltz Auto Electric."');
  },
  'Voltz Auto Electric'() {
    anger(10);
    closeLead('voltz', 'x', 'Voltz: "that\'s the gearbox" (round and round)');
    say('Voltz Auto Electric', '"P0705? That\'s the gearbox, mate. Go next door to Tameside Transmissions."');
  },
  "Mum & Dad's"() {                                                   // Mum on the doorstep
    if (askMumForMoney('Mum')) return;                                  // skint: she slips you some
    S.flags.mumTalks = (S.flags.mumTalks || 0) + 1;
    const lines = ['"Come in, love! Have you eaten? You look thin."', '"Your dad\'s been looking forward to this all week."', '"Is Paul coming? He never comes."', '"Do you want a cup of tea? I\'ll put the kettle on."'];
    anger(-8);                                                          // Mum: it helps, a bit
    say('Mum', lines[(S.flags.mumTalks - 1) % lines.length]);
  },
  "Mate Gaz's"() {
    if (S.inv['reader-old'] || !leadExists('gaz-reader')) return say("Gaz's", '"Alright? Did my reader work?"');
    if (!S.flags.gazTried) {
      S.flags.gazTried = S.day;
      return say("Gaz's", '"Can\'t find it. Might\'ve lent it to the brother-in-law. Come back tomorrow."');
    }
    if (S.flags.gazTried === S.day) return say("Gaz's", '"Still looking, mate. Tomorrow."');
    S.inv['reader-old'] = true;
    note('codes', "Got Gaz's code reader (old type)", 'info');
    say("Gaz's", '"Found it! It\'s the old type, mind."\n\nTry it in the car: the port is under the dash.');
  },
  'Tool Shop'() { shopCounter('Tool Shop', '"What are you after?"'); },
  'Pound Shop'() {
    if (askForBattery('Pound Shop')) return;                         // after a battery for the meter: no luck
    say('Pound Shop', '"Yes, the Pound Shop. Everything is priced in pounds."');
  },
  'Hardware Shop'() {
    if (askForBattery('Hardware Shop')) return;                      // after a battery for the meter: no luck
    if (S.flags.needHammer && !S.inv.hammer && !S.flags.hammerAsked) {   // they say they haven't got one; they have
      S.flags.hammerAsked = true;
      closeLead('hammer-shop', 'x', 'Hardware Shop: "no hammers"');
      lead('hammer', 'hammer-shelf', 'Look along their shelves yourself', 'you', 'hopeful', 'place:Hardware Shop');
      return say('Hardware Shop', '"A hammer? Not got any, mate. Sold the last one Tuesday."');
    }
    shopCounter('Hardware Shop', '"Yes?"');
  },
  'Car Spares Direct'() {
    if (csdSensor()) return;                                            // after a sensor: "we can order it in" (sensors.js)
    return say('Car Spares Direct', '"Car spares? Direct? That\'s us. What do you want?"');
  },
  'Halfords Car Parts'() {
    if (S.inv['part-p4l'] || S.flags.p4lReady) return say('Halfords Car Parts', '"It\'s at the other branch, like I said."');
    if (!findJob('new-sensor')) return say('Halfords Car Parts', '"What part do you need? No part number, no part."');
    S.flags.p4lReady = now() + 120;
    closeLead('motor-factors', 'ok', 'Halfords Car Parts: ordered, ready in 2 hours at the other branch');
    lead('new-sensor', 'p4l', 'Collect it at Parts 4 Less', 'Halfords Car Parts', 'sure', 'place:Parts 4 Less');
    say('Halfords Car Parts', '"Got one. Ready in two hours… at our other branch. Parts 4 Less. They shut at half four."');
  },
  'Parts 4 Less'() {
    if (S.inv['part-p4l']) return say('Parts 4 Less', '"You\'ve already got it."');
    if (!S.flags.p4lReady) return say('Parts 4 Less', '"Nothing here for you, love."');
    if (now() < S.flags.p4lReady) return say('Parts 4 Less', '"Not come over yet. Try later."');
    say('Parts 4 Less', '"Here it is. £31.50."', [
      { label: 'Pay £31.50', run() {
        if (!spend(31.5)) return say('Parts 4 Less', DECLINED);
        S.inv['part-p4l'] = true;
        closeLead('p4l', 'ok', 'Bought a sensor at Parts 4 Less');
        lead('new-sensor', 'try-p4l', 'Try the new sensor on the bench', 'you', 'hopeful', 'bench');
        say('Parts 4 Less', 'It looks right. It looks… nearly right.');
      } },
      { label: 'Not now', run() {} }
    ]);
  },
  // the Tyre Place: a part-worn wheel when your car's on a flat (road.js); otherwise, tyres you don't need
  'Tyre Place'() {
    if (wheelWanted()) return buyWheel('Tyre Place');
    if (spareAt('Tyre Place')) return;                                  // the flat spare: a new tyre on it (road.js)
    say('Tyre Place', '"Tyres? Your tyres are fine, mate. For now."');
  },
  'Scrap Yard'() {
    if (wheelWanted()) return buyWheel('Scrap Yard');                   // your car's on a flat: a wheel off a wreck
    if (spareAt('Scrap Yard')) return;                                  // the flat spare: one off a wreck (road.js)
    if (!findJob('new-sensor')) return say('Scrap Yard', '"Got all sorts. What are you after?"\n\nRows of dead cars. Any of them might be good for parts one day.');
    say('Scrap Yard', '"A Zafira automatic? Don\'t think I\'ve got one, mate. Have a look round if you like. Mind the dog."\n\nRows of dead cars. Any of them might be good for other parts one day.', [
      { label: 'Look round the yard', run() { S.spot.yard = [100, 150]; show('yard'); } },
      { label: 'Not today', run() {} }
    ]);
  },
  'Home'() { show('home'); }
};
// A shop counter with things for sale
function shopCounter(place, greeting) {
  const items = (PLACE_INFO[place].shop || []).map(id => ({
    label: ITEMS[id].none ? `${ITEMS[id].name}?` : `Buy ${ITEMS[id].name} (£${ITEMS[id].price.toFixed(2)})`,
    run() { buy(id, place); }
  }));
  say(place, greeting, items.concat([{ label: 'Nothing, thanks', run() {} }]));
}
// Buying something at a counter
function buy(id, place) {
  const item = ITEMS[id];
  if (item.none) { anger(5); return say(place, '"A 9? There\'s no such thing as a 9, mate."'); }
  if (!spend(item.price)) { anger(10); return say(place, DECLINED); }
  S.inv[id] = true;
  sfx('kerching');                                                     // the till
  if (id === 'extractor-cheap') closeLead('extractor', 'ok');
  if (id === 'extractor-good') closeLead('extractor2', 'ok');
  if (id === 'fuses') note('meaning', 'Bought fuses: all the wrong amps', 'x');
  say(place, `You buy: ${item.name}.`);
}

// =====================================================================
// WHEN YOU OPEN CERTAIN SCREENS
// =====================================================================
const SCREEN_ENTER = {
  boot() { GAUGE_T0 = performance.now(); },                            // the boot opens: the gauge's needle rides up from 0 (car.js)
  garage() {
    if (isBedtime() && !isAsleep() && S.flags.wifeCalled !== nightOf() && !(S.flags.n3lost && !S.flags.nutEscaped)) return wifeComesIn();
    if (brotherArrives()) return;                                       // your brother, come to help (brother.js)
    if (!S.flags.n3lost || S.flags.nutEscaped) return;
    S.flags.nutEscaped = true;
    moment('nutEscape', 2200); sfx('drop');
    say('Nut 3', 'There it goes: out from under the car, bouncing across the floor… and gone. Somewhere.');
  },
  home() {
    const cameFrom = S.history[S.history.length - 1];                 // the screen he's just left
    if (cameFrom === 'garage' && wifeInGarage()) wifeFollowsOut();    // she came to fetch him: she follows him out
    const fresh = S.doorstep.filter(p => !p.seen);
    if (!fresh.length) return;
    fresh.forEach(p => { p.seen = true; });
    moment('van', 2600); sfx('van'); sfx('thud', 1.2);
  },
  underZoom() {
    // once you know what P0705 is (a book, someone who knows, or online), a look at the gearbox finds the sensor
    if (!S.flags.codes || S.flags.sensorJob) return;
    if (!leadExists('sensor')) return;                                // you don't know what you're looking for yet
    S.flags.sensorJob = true;
    closeLead('sensor', 'ok', 'Found the sensor on the gearbox');
    finishJob('meaning', 'Probably the gearbox sensor');
    job('sensor-off', 'Get the old sensor off', 'light');
    note('sensor-off', 'It\'s fixed into a box. 2 bolts and a nut hold the box on.', 'info');
  },
  room() {
    delete S.flags.wifeWalksIn;                                       // she's in ahead of you
    if (S.flags.drunkHome) drunkCollapse();                            // home from the pub: he doesn't get far
  },
  shelf() { handbookNotOnShelf(); },                                // looking for the handbook: not here
  pc() { pass(5); },
  phone() { for (const m of S.msgs) m.read = true; }
};

// =====================================================================
// ACTIONS (from the buttons under the picture and the dialogs)
// =====================================================================
const ACTIONS = {
  // ----- moving round -----
  go(target) { goTo(target); },
  keytry() { keyTry(); },                                               // the car door: try the key in the lock
  keygiveup() { keyStuck(); },
  blowhere() {},                                                        // the breath test's BLOW box: the press itself does the blowing
  dicedown() { takeDiceDown(); },
  unplug() { unplugReader(); },                                         // the driver's seat: the code reader out of the port                                       // the driver's seat: the dice off the mirror (extras.js)                                          // the car door: give up on the lock
  handbook() { if (S.inv.handbook) return openHandbook(); show('shelf'); },   // a lead: read it (or go and look for it)
  hbpage(d) { handbookPage(+d); },                                      // the handbook: turn a page
  hbclose() { show(S.hbFrom || 'garage'); },                            // put it down: back to the manuals shelf, or the garage
  batlead(side) { batteryLead(side); },
  glovebox() { sfx('click'); show('glovebox'); },                       // the driver's seat: open the glove box
  glove(k) {                                                            // look at a thing in it
    if (GLOVE_THINGS[+k][0] === 'Torch') return gloveTorch();           // the torch: take it to the garage shelf
    if (GLOVE_THINGS[+k][0] === 'Tyre pressure gauge') return gloveGauge();   // the gauge: likewise
    lookAtThing(GLOVE_THINGS, k);
  },
  gloveshut() { sfx('click'); show('dash'); },                          // shut it, back in the driver's seat                                 // under the bonnet: a battery lead off, or back on
  // the shopkeeper: you go up to the counter (a close-up of him), then he talks
  talk() {
    const queueing = S.place === 'Post Office' && !postFirst();       // at the back of the post office queue: you shout from there
    if (hasCounter(S.place) && !queueing) S.counter = S.place;        // up to the counter
    talk(S.place);
  },
  counteroff() { S.counter = null; },                                  // step back from the counter, into the shop
  // a regular at the bar: their advice, round and round
  dad() { dadTalk(); },                                                 // Mum & Dad's: Dad under the bonnet with you (interiors.js)
  punter(k) {
    const p = PUNTERS[+k];
    if (+k === 0 && sensorFound('Old Ron, at the pub', 'sure')) {        // Old Ron, once you've the codes: he actually knows
      pass(10); pubLate();
      SPEAKER = punterHead(0);
      return say(p.name, '"P0705? That\'s your selector sensor, son. Little box on the side of the gearbox. Had the same on a Cavalier."\n\nHe goes back to his pint as if nothing happened.');
    }
    S.punterTalks = S.punterTalks || [0, 0];
    const line = p.lines[S.punterTalks[+k]++ % p.lines.length];
    pass(10); pubLate();
    SPEAKER = punterHead(+k);
    say(p.name, line);
  },
  // the phone's torch: on (so you can see under things) or off; then put the phone away
  // a spare headlight off the garage shelf: fit it on the side it's for, if that one's smashed
  fitlight() {
    const have = spareLamps();
    if (brokeOpen('headlight') && have.left > 0) return fitLamp('left');
    if (brokeOpen('headlight2') && have.right > 0) return fitLamp('right');
    const need = brokeOpen('headlight') ? 'left' : 'right';
    return wrongLamp(need);
  },
  // tap a headlight under the bonnet: smashed and you've a spare for that side, it goes in
  lamp(side) {
    const id = side === 'left' ? 'headlight' : 'headlight2', have = spareLamps(), other = side === 'left' ? 'right' : 'left';
    if (!brokeOpen(id)) return say(`The ${side} headlight`, 'Whole. For now.');
    if (have[side] > 0) return fitLamp(side);
    if (have[other] > 0) return wrongLamp(side);
    say(`The ${side} headlight`, `Smashed. You need a new ${side} one: a parts shop, Zamanon or Thee Bay online, or one off a wreck at the Scrap Yard.`);
  },
  nbclose() { back(); },
  menuclose() { back(); },
  fruit() { fruitOffer(); },                                            // the fruit machine in the pub                                              // put the café menu down: back in the café
  wifecar() {                                                           // her car: only when yours is stuck (then: where to?)
    if (!inWifesCar()) return say('The wife', '"That\'s my car, Husband. I need it. Use your own."');
    say("Wife's car", 'Her little purple car. Where to?', [
      { label: 'Into town', run() { goTo('city'); } },
      { label: `To your car (${ROADSIDE})`, run() { ACTIONS.toroad(); } },
      { label: 'Not yet', run() {} }
    ]);
  },                                                // the notebook: put it away
  nbpage(d) { S.nbPage = (S.nbPage || 0) + +d; sfx('click'); },          // leaf through the notebook
  phoneaway() { back(); },                                              // tap off the phone: put it away
  phonetorch() {
    sfx('click');                                                      // broken: the phone stays open (Steve)
    say('Your phone', 'The torch is broken. It has been since you dropped the phone in the engine bay.\n\nYou need a proper torch.');
  },
  msgdel(i) { S.msgs.splice(+i, 1); },                                   // delete a message or a missed call
  // your wife: she wants the car scrapped; every third time, something useful
  wife() {
    if (isAsleep()) return say('The wife', 'Zzzz… She\'s fast asleep. Best not.');   // in bed: she doesn't wake
    pass(5);
    SPEAKER = wifeHead();                                              // in person: a speech bubble from her
    if (S.screen === 'garden') return say('The wife', gardenLine());   // on her lounger: she doesn't look up
    say('The wife', wifeLine());
  },
  // through the back door into the garden, and back in
  garden() { S.spot.garden = SPOT_HOME.garden.slice(); show('garden'); },
  backin() { S.spot.room = [38, 12]; show('room'); },
  // the watch (bottom left, on every screen): wait an hour, wherever you are
  wait() {
    anger(5);                                                           // waiting about: it winds you up
    pass(60);
    if (S.screen === 'place' && S.place === 'Post Office' && S.inside && !postFirst()) {   // in the queue: it doesn't move
      return say('The queue', `It's ${hhmm(S.mins)}. The queue hasn't moved. The man at the front is posting forty parcels to Peru, one at a time.\n\nTip: be standing outside before it opens at 9:00. Good luck with the traffic.`);
    }
    const where = S.screen === 'place' && !S.inside ? ' on the pavement' : '';
    say('You wait', `An hour goes by${where}. It's ${hhmm(S.mins)}.`);
  },
  // outside the post office at night: sleep in the car, and wake at 5:45 first in the queue
  carsleep() {
    if (!poCanSleep()) return;
    const toWake = (PO_WAKE - S.mins + 1440) % 1440;                     // minutes until 5:45 (tomorrow, or later tonight)
    pass(toWake);                                                       // overnight, you're first in the queue (poStayedOvernight)
    if (!poInQueue()) S.po = { day: S.day, arrived: 0 };                // slept here after midnight: still here before anyone
    S.spot.outside = poSlot(0);                                         // by the door
    anger(5);                                                           // a terrible night's sleep
    textMsg('The wife', 'Where ARE you?? Are you asleep in the car outside the POST OFFICE??');
    moment('night', 3200);                                              // dark, black, then the morning (the message waits for it)
    say('5:45 am', "You wake with a stiff neck and the handbrake in your ribs. Your breath has fogged up every window.\n\nNobody else here yet. You're first in the queue!\n\nIt opens at 9. Tap the watch to wait.");
  },
  // look at another part of town on the map (centre it on that block)
  cam(arg) {
    const [bi, bj] = arg.split(',').map(Number);
    const cx = bi * BLOCK + STREET + 35, cy = bj * BLOCK + STREET + 35;
    S.cam.ox = 291 - (cx - cy);                                         // the middle of the town map (582 x 328)
    S.cam.oy = 172 - (cx + cy) / 2;
  },
  // ----- home -----
  tea() {
    pass(10); moment('tea', 1400); stillAfter('tea'); sfx('pour');
    if (fedUp()) return say('A cup of tea', 'You make a tea. You look at it.\n\nTea? TEA? Sod the tea. You pour it down the sink.\n\nYou need a pint.');   // past tea now: the pub
    anger(-15);                                                        // it helps
    say('A cup of tea', (S.mins % 3) ? 'You make a tea. You calm down a bit.' : 'You make a tea. It goes cold before you drink it.');
  },
  bed() {
    sfx('door');
    S.flags.bedLate = isBedtime();                                     // late: she's in her nightie and comes too (it's morning by the time you wake)
    S.flags.bedAsleep = isAsleep();                                    // she's already asleep: she stays in bed
    sleepUntilMorning();
    moment('night', 3200);                                           // dusk, black, then morning (the message waits for it)
    const morning = fedUp() ? 'You lay awake all night, fuming about the bloody car. You need a pint.' : 'You feel a bit better.';   // past sleep: the pub
    say('Next morning', `It's ${weekday()} morning. ${morning}`);
  },
  parcel() {
    const p = S.doorstep.shift();
    if (!p) return say('The doorstep', 'Nothing there.');
    sfx('pop');
    openParcel(p.item);
  },
  // ----- garage -----
  // ----- finding nut 3: a torch to look under things, then a stick to hook it out -----
  // look under something in the garage (any time); while nut 3 is lost, it's a hunt for it
  search(where) {
    pass(10);
    S.under = where;
    show('lookunder');                                                  // down on the floor, looking under it
    const hunting = S.flags.n3lost && !S.flags.n3found;                // is nut 3 lost somewhere down here?
    if (!S.flags.torchLit) {                                          // no light: black (the phone's torch is broken)
      if (hunting) lead('nut3', 'torch', 'A torch: there was one in the toolbox', 'you', 'fairly sure', 'toolbox');
      return say('Under ' + where, 'Pitch black under there. You need a torch. The one on your phone is broken.');
    }
    if (hunting) { closeLead('search', 'ok'); anger(3); }
    BEAM = { x: BEAM_START.x, y: BEAM_START.y };                       // the torch starts pointing down by your hand
    UNDER_SEEN = {};
    const spider = !S.flags.spiderSeen || Math.random() < SPIDER_CHANCE;   // the first time, always; then now and then
    UNDER_SPIDER = spider ? { x: 250 + Math.random() * 180, y: 172 + Math.random() * 50 } : null;   // a spider somewhere in the dark
    render();
    if (SCREWS_SPILL && where === 'the workbench' && !S.flags.screwsSpilt) {   // (saved for later: off for now)
      S.flags.screwsSpilt = true; anger(10); moment('screws', 1500); sfx('screws');
      return say('Under the workbench', 'You lean on the bench to look underneath and knock a box of hundreds of screws off it. They go everywhere.');
    }
  },
  // tap a thing on the floor: what it is, if the beam's on it
  underlook(n) {
    const where = S.under || 'the tool chest';
    const finds = (UNDER_FINDS[where] || []).filter(([, , k]) => k !== 'nut' || (S.flags.n3lost && !S.flags.n3found));
    const f = finds[+n];
    if (!f) return;
    if (!haveLight()) return say('Under ' + where, 'Pitch black under there. You need a light.');
    if (!inTorchLight(f[0], f[1])) return say('Under ' + where, 'Too dark to see what that is. Point the torch at it.');
    if (f[2] === 'nut') return nutSpotted();
    say('Under ' + where, UNDER_LINES[f[2]] || 'Nothing much.');
  },
  hooknut() { fishStart(); show('fish'); },                             // with the stick: hook the nut out
  takeTorch() {
    if (S.inv.torch) return say('The torch', 'You\'ve got it.');
    S.inv.torch = true; sfx('click');
    closeLead('torch', 'ok');
    lead('nut3', 'batteries', 'Batteries for the torch', 'you', 'sure', 'home');
    say('The torch', 'You click it on. Nothing. You shake it. Nothing. Flat batteries.');
  },
  batteries() {
    pass(15); S.flags.torchLit = true; sfx('click');
    closeLead('batteries', 'ok', 'Batteries from the kitchen drawer: the torch works');
    lead('nut3', 'search', 'Search the garage floor (with the torch)', 'you', 'hopeful', 'garage');
    say('The kitchen drawer', 'Takeaway menus, string, a key to nothing, three dead batteries… and two good ones. The torch works!');
  },
  stick() {
    if (S.inv.stick) return say('The hedge', 'A privet hedge. Slightly fewer sticks than it had.');
    if (!S.flags.nutSeen) return say('The hedge', 'A privet hedge. Full of sticks. You don\'t need a stick. Yet.');
    pass(5); S.inv.stick = true; sfx('click');
    closeLead('stick', 'ok', 'A long stick from the hedge');
    lead('nut3', 'hook', 'Hook the nut out from under the tool chest', 'you', 'hopeful', 'garage');
    say('A stick', 'You snap a long, thin stick off the hedge. Perfect. Probably.');
  },
  giveup() { anger(10); show('garage'); },
  // ----- in a shop -----
  enter() {
    const shut = closedReason(S.place);
    if (shut) {
      sfx('door'); anger(3);
      const gate = (PLACE_INFO[S.place] || {}).byAppointment ? yardGate() : '';   // by appointment: the number goes in your phone
      return say(S.place, shut + gate);
    }
    // the post office: queued outside since before 9? you go in when it's your turn (9 if you were first, else 10), and you're served
    if (S.place === 'Post Office' && poInQueue()) {
      if (S.mins < poServedAt()) { anger(3); return say('Post Office', 'The queue is shuffling in, one at a time. Not your turn yet: about ' + hhmm(poServedAt()) + '.'); }
      S.flags.poFirst = S.day;
    }
    S.inside = true; S.spot.place = S.place === 'Post Office' ? (postFirst() ? [104, 76] : [118, 146]) : [105, 140]; sfx('bell');
    if (placeStyle(S.place) === 'pub') pubCallLater();                  // the pub: the wife will ring
    yardIn();                                                           // the yard: in, in your slot
  },
  leave() {
    S.flags.pubSat = false;                                             // off your bar stool
    S.counter = null;                                                   // and away from the counter
    const unpaid = basketHere().length;
    S.basket = (S.basket || []).filter(b => b.place !== S.place);     // you can't walk out with it
    S.inside = false; S.spot.outside = [162, 52]; sfx('bell');
    if (unpaid) say('The basket', 'You leave the basket by the door. You haven\'t paid for it.');
  },
  browse() { pass(5); say('The stock', BROWSE[placeStyle(S.place)]); },
  posters() { const [a, b] = POSTERS[placeStyle(S.place)] || ['', '']; pass(2); say('The posters', `"${a}" (${b}). And one that just says SALE. It's from 2017.`); },
  // ----- the scrap yard: look at each wreck -----
  wreck(n) {
    const i = +n;
    pass(10);
    S.flags['wreck' + i] = true;
    if (i === 4) { anger(10); sfx('sad'); } else { anger(3); sfx('clink'); }
    const seen = WRECKS.slice(0, MAYBE_YOURS).filter((w, k) => S.flags['wreck' + k]).length;   // only the six that might be yours count
    const allSeen = i < MAYBE_YOURS && seen === MAYBE_YOURS;
    if (allSeen) closeLead('breakers', 'x', 'Scrap Yard: six Zafiras (nearly), not one sensor');
    const text = WRECKS[i][4] + (allSeen ? '\n\nThat\'s all six that might have been yours.' : '');
    const side = needHeadlight();                                     // which headlight you still need (if any)
    if (i === 2 && side) {                                            // a Zafira just like yours: its headlights are fine
      return say('A wreck', text + `\n\nIts ${side} headlight is perfect, though.`, [
        { label: 'Take its headlight (£10 to the man)', run() { if (!spend(10)) return say('The yard', '"Cash only, mate." You haven\'t got it.'); gotHeadlight(); sfx('ratchet'); say('The headlight', 'Ten minutes with a screwdriver and it\'s yours. A bit scratched.'); } },
        { label: 'Leave it', run() {} }
      ]);
    }
    if (i === 0 && yardSensorOffer(text)) return;                     // the 1999 Zafira: its sensor's still in (sensors.js)
    say('A wreck', text);
  },
  // ----- the dashboard: tap the key to turn it one click -----
  rev() { if (!S.flags.running) return; engineRev(); moment('rev', 1600); },
  // parp! (the horn works with the key off, like a real car; not with a battery lead off)
  horn() {
    if (!carPowered()) { sfx('click'); return say('The horn', 'Nothing. Not a squeak.'); }   // no power
    sfx('hornnear'); moment('horn', 500);
  },
  turnkey() {
    if (S.flags.running) {                                               // running: switch it all off
      S.flags.running = false;
      S.key = 0;
      radioState().on = false;                                           // the key off turns the radio off too
      sfx('click');
      return;
    }
    ACTIONS.key(String(S.key + 1));
  },
  // the accelerator: revs the engine if it's running; otherwise the pedal just goes down
  pedal() {
    if (S.flags.running) return ACTIONS.rev();
    sfx('click');
    moment('pedal', 400);
  },
  // the hatch under the steering wheel: open it; then the port behind it takes a code reader
  hatch() {
    if (!S.flags.hatch) {                                                // shut: pop it open
      S.flags.hatch = true;
      sfx('click');
      return say('Under the steering wheel', 'You pop the little hatch off. Behind it: a flat socket with 16 pins. The diagnostic port.');
    }
    if (S.flags.readerIn) return say('Diagnostic port', 'Your code reader is plugged in.', [
      { label: 'Unplug it', run: unplugReader },
      { label: 'Leave it in', run() {} }
    ]);
    if (ownedPlugs().length) return show('port');                        // got a reader or two: close up on the port, to try them
    S.flags.hatch = false;                                               // nothing to plug in: put the hatch back
    sfx('click');
  },
  // the button under the picture: open the hatch and close up on the port
  port() {
    S.flags.hatch = true;
    show('port');
  },
  portback() { show('dash'); },                                          // back to the driver's seat
  // try a reader's plug in the port: it goes up to the port; then it fits, or it doesn't
  tryplug(id) {
    if (!S.inv[id] || ANIM) return;                                      // not yours, or one already on its way up
    const slot = PLUGS.find(([pid]) => pid === id);                      // where it lies
    const fits = id === 'reader-good';                                   // only the used one from Thee Bay is the right shape
    PLUG_TRY = { id, x: slot[2], fits };
    sfx('click');
    moment('plugtry', 900);
    ANIM.then = () => { PLUG_TRY = null; plugTried(id); };              // when it's been tried: what happened
  },
  // the panel under the dashboard: unscrew it, and the ECU is behind it
  ecu() {
    sfx('click');
    show('ecu');
    if (S.flags.ecuSeen) return;
    S.flags.ecuSeen = true;                                              // the first time: the screws take a while
    pass(5);
    say('The panel under the dash', "Four screws. You undo them and the panel drops into the footwell.\n\nBehind it: a silver box covered in stickers. The ECU, the car's computer.");
  },
  ecuthing(k) { lookAtThing(ECU_THINGS, k); },                         // look at a thing behind the panel
  ecushut() { sfx('click'); show('dash'); },                             // screw the panel back on, back in the seat
  // the radio's three buttons: dir -1 = ◀, 0 = the middle one, 1 = ▶
  radio(dir) {
    if (!carPowered()) return say('Radio', 'Nothing. Not even the clock. No power.');
    if (S.key < 1) return say('Radio', 'Nothing. The radio needs the key at I.');
    const R = radioState();
    const d = +dir;
    sfx('click');
    if (!R.unlocked) {                                                   // locked: put the code in
      radioJob();                                                        // a job in the notebook: get the radio working
      if (d !== 0) { R.pos = (R.pos + d + 4) % 4; return; }              // ◀ ▶ pick a place
      const now = R.digits[R.pos];
      R.digits[R.pos] = now === null ? 0 : (now + 1) % 10;               // the middle one turns it 0, 1 … 9, 0
      if (R.digits.join('') === RADIO_CODE) {                            // the right code: it unlocks, and it's written down
        R.unlocked = true;
        sfx('beep');
        radioCodeNoted('it worked');
        finishJob('radio', 'Radio unlocked with 1234');
      }
      return;
    }
    if (d === 0) { R.on = !R.on; return; }                               // unlocked: the middle one turns it on or off
    if (R.on) R.station = (R.station + d + STATIONS.length) % STATIONS.length;   // on: ◀ ▶ change the station
  },
  // ----- the toolbox -----
  drawer(n) {
    const d = +n;
    const closing = S.drawer === d;
    DRAWER_MOVE = { d, opening: !closing };                       // the moment slides it out or back in
    S.drawer = closing ? 0 : d;
    sfx('drawer');
    moment('drawer', 320);
  },
  find10() { pass(10); anger(5); sfx('clink'); sfx('clink', 0.3); say('The 10 mm', "It's not there. It's never there. There's a 10-shaped gap in the foam."); },
  findspanner() { pass(15); anger(5); sfx('screws'); say('The right spanner', 'You dig through dozens of spanners. Three 13s, two 17s, a 7/16 from somewhere… and not the one you need.'); },
  meter() { testMeter(); },
  // ----- dashboard -----
  key(pos) {
    S.key = +pos;
    S.flags.running = false;
    if (S.key === 0) radioState().on = false;                            // the key off turns the radio off
    if (S.key === 3 && !carPowered()) {                                  // no power: the starter doesn't even click
      S.key = 2;
      sfx('click');
      return say('Start it', 'Nothing. No lights, no starter, no nothing.');
    }
    if (S.key === 3) {
      S.key = 2;
      S.flags.running = true;
      moment('start', 1800); sfx('start');
      if (S.flags.fitted) { sfx('fanfare', 0.9); sfx('sad', 1.4); }
      if (S.flags.fitted) return finishBranch();
      return say('Start it', S.flags.codesCleared ? 'It starts. The red light stays off… for two seconds. Then it comes back on.' : 'It starts. The red light stays on.');
    }
    render();
  },
  // the right reader, plugged into the port: it needs power and the key at II to read the codes
  plug() {
    S.flags.hatch = true;                                                // the port is behind the hatch: open it
    if (!carPowered()) return say('Code reader', 'It fits! Click. But nothing: there\'s no power anywhere in the car.');
    if (S.key < 2) return say('Code reader', 'It fits! Click. But the screen stays blank: the key needs to be at II for the reader to wake up.');
    pass(10);
    sfx('beep');
    S.flags.readerIn = true;
    closeLead('plug-in', 'ok');
    readCodes('own reader');
  },
  clear() {
    if (!S.flags.codes) return;
    pass(5);
    S.flags.codesCleared = true;
    anger(5);
    moment('clear', 1500); sfx('beep');
    say('Clear the codes', 'The red light goes out. Then you start the car, and it comes back on.');
  },
  think() { think(); },
  // ----- under the car: the gearbox -----
  bolt1() { pass(10); S.flags.b1 = true; moment('bolt1Out', 1200); sfx('ratchet'); sfx('clink', 0.9); note('sensor-off', 'Bolt 1 out', 'ok'); say('Bolt 1', 'It comes out. Just like that. Suspicious.'); },
  // tap bolt 2: the first time, the spanner; once it's rounded off, try whatever you've got
  boltmenu() {
    if (!S.flags.b2round) return ACTIONS.bolt2();
    const opts = [{ label: 'The spanner', run: ACTIONS.bolt2 }];
    if (S.inv['extractor-cheap']) opts.push({ label: 'The cheap extractor', run() { ACTIONS.extract('cheap'); } });
    if (S.inv['extractor-good']) opts.push({ label: 'The proper extractor', run() { ACTIONS.extract('good'); } });
    opts.push({ label: 'Leave it', run() {} });
    say('Bolt 2', 'Rounded off. What do you try on it?', opts);
  },
  bolt2() {
    pass(10);
    if (S.flags.b2round) { anger(5); moment('boltSpin', 1200); sfx('slip'); sfx('slip', 0.5); return say('Bolt 2', 'Your spanner just spins round and round on it. It\'s rounded off.'); }
    S.flags.b2round = true;
    anger(15);
    moment('boltRound', 1200); sfx('ratchet'); sfx('slip', 0.65);
    job('bolt2', 'Get the rounded bolt out', 'sensor-off');
    lead('bolt2', 'extractor', 'Buy a bolt extractor', 'you', 'sure', 'place:Tool Shop');
    say('Bolt 2', 'The spanner slips. The bolt head is rounded off. Brilliant.');
  },
  nut3() {
    pass(10);
    S.flags.n3lost = true;
    anger(10);
    moment('nutDrop', 1700); sfx('drop');
    job('nut3', 'Find nut 3', 'sensor-off');
    lead('nut3', 'search', 'Search the garage floor', 'you', 'hopeful', 'garage');
    say('Nut 3', 'It comes off, drops, bounces off your face… and bounces out from under the car. You hear it skitter across the garage floor. Then nothing.');
  },
  extract(kind) {
    pass(20);
    const good = kind ? kind === 'good' : !!S.inv['extractor-good'];   // which one you used (the proper one if you don't say)
    if (good) {
      S.flags.b2 = true;
      moment('extractOk', 1400); sfx('creak'); sfx('pop', 1.0);
      finishJob('bolt2', 'The proper extractor got it out');
      return say('Bolt 2', 'The proper extractor bites… and the bolt turns. It\'s out!');
    }
    delete S.inv['extractor-cheap']; junkIt('extractor-cheap');   // what's left of it goes in the parts box
    anger(20);
    moment('extractSnap', 1300); sfx('creak'); sfx('snap', 0.75);
    note('bolt2', 'The cheap extractor snapped off inside the bolt', 'x');
    lead('bolt2', 'extractor2', 'A better extractor from the Hardware Shop', 'the man at the Tool Shop (who sold you the first)', 'very sure', 'place:Hardware Shop');
    say('Bolt 2', 'The cheap extractor snaps. Half of it is now stuck in the bolt as well.');
  },
  wiring() { pass(15); closeLead('loom', 'x', 'The wiring looks fine (as far as you can tell)'); say('The wiring', 'You follow the wires. They look fine. As far as you can tell.'); },
  // take the box off the car: the sensor is fixed into it, so the whole box comes off, sensor and all
  pull() {
    if (!(S.flags.b1 && S.flags.b2 && S.flags.n3lost)) return say('Take the box off', 'It won\'t budge. Something\'s still holding it.');
    pass(10);
    S.flags.boxOff = true;                                             // the box is on the workbench now, the old sensor still in it
    moment('sensorPull', 1100); sfx('pop', 0.15);
    finishJob('sensor-off', 'The box is off, with the old sensor still in it');
    job('sensor-out', 'Get the old sensor out of the box', 'light');   // the next job: on the workbench
    note('sensor-out', '4 screws hold the sensor in the box.', 'info');
    lead('sensor-out', 'box-bench', 'Unscrew it on the workbench', 'you', 'sure', 'bench');
    say('The box', 'You pull, and the sensor won\'t come out on its own: it\'s fixed into a box. With a twist and a heave, the whole box comes off, sensor and all.\n\nOff to the workbench with it.');
  },
  fit() {
    if (!S.flags.fits) return say('Fit it', S.flags.boxOff ? 'The box is on the workbench, and there\'s no sensor in it that fits yet.' : 'You haven\'t got one that fits yet.');
    if (!S.flags.n3found) return say('Fit it', 'Two bolts… and nut 3 is still lost.');
    if (S.flags.sheared && !S.flags.stubOut) return say('Fit it', 'Not with the snapped screw\'s stub still in the box: the sensor\'s only held by three. Get the stub out with the extractor first.');
    if (S.flags.sheared && !S.flags.screw3) return say('Fit it', 'The sensor\'s only held by three screws. Find a fourth that matches: the screw jar on the garage shelf.');
    pass(30);
    S.flags.fitted = true;
    moment('sensorFit', 1300); sfx('clink', 0.8); sfx('ratchet', 0.95);
    closeLead('fit', 'ok', 'New sensor fitted and plugged in');
    lead('light', 'test', 'Start the car and see', 'you', 'hopeful', 'dash');
    say('Fit it', 'The box goes back on: bolt, bolt, nut. Plug the connector in (gently: the tab). Done.\n\nNow the moment of truth: start it.');
  },
  // ----- under the bonnet -----
  fuses() {
    pass(10);
    sfx('click'); sfx('click', 0.3);
    if (!S.flags.knowF23) {                                         // which one is it? the lid says see the manual; the manual's not much help
      lead('meaning', 'fusebook', 'Note 7: the owner\'s handbook', 'the fuse box lid', 'sure', 'act:handbook');
      return say('The fuses', 'Thirty fuses. Which one is the gearbox? The lid says F23 "Instr. (see note 7)". Note 7 says "see owner\'s manual".');
    }
    if (!S.flags.f23Checked) {                                      // F23 first: it looks fine, but you can't tell by looking
      S.flags.f23Checked = true;
      closeLead('checkf23', 'x', 'Fuse F23 looks fine');
      lead('meaning', 'meter', 'Test every fuse with the multimeter (toolbox, drawer 5)', 'you', 'sure', 'toolbox');
      if (S.flags.meterFlat) meterBatteryJob();                     // you already know its battery's flat
      return say('Fuse F23', 'You pull F23 and hold it up to the light. It looks fine.\n\nBut you can\'t always tell by looking. The only way to be sure: test every fuse with a multimeter. There\'s one in the toolbox.');
    }
    if (S.flags.fusesTested) return say('The fuses', 'You\'ve tested all thirty. All fine, except the cigarette lighter.');
    if (!S.flags.meterOK) {                                         // nothing to test them with yet
      if (S.flags.meterFlat) return say('The fuses', 'Thirty fuses, and nothing to test them with. The multimeter\'s battery is flat.');
      return say('The fuses', 'Thirty fuses. You need the multimeter from the toolbox to test them.');
    }
    testAllFuses();
  },
  look(what) { pass(5); say(what, (what === 'Spare wheel' ? spareLook() : LOOKS[what]) || 'Looks fine. Probably.'); },   // the spare: as it is now (road.js)
  // ----- the workbench -----
  // a screw holding the old sensor in the box: the first two come out; the last one always shears off
  screw(n) {
    const f = S.flags;
    f.screws = f.screws || [];                                         // the screws out so far (of 4)
    if (f.screws.includes(+n)) return;                                 // already out
    pass(5);
    f.screws.push(+n);
    const back = +n === 4 ? 'The one at the back, behind the sensor. You can\'t see it: you find it with the screwdriver by feel.\n\n' : '';
    if (f.screws.length < SENSOR_SCREWS) {                             // not the last one: out it comes
      moment('screwOut', 900); sfx('ratchet');
      note('sensor-out', `Screw ${n} out`, 'ok');
      return say(`Screw ${n}`, back + ['It comes out. Nice and easy.', 'That one too. This is going well.', 'And that one. Suspiciously well.'][f.screws.length - 1]);
    }
    f.sheared = +n;                                                    // the last one: the head snaps off, the stub stays in the box
    anger(15);
    moment('screwShear', 1100); sfx('creak'); sfx('snap', 0.6);
    stillAfter('snap');                                                // the screw head flying off
    note('sensor-out', `Screw ${n} sheared off: its stub is stuck in the box`, 'x');
    job('stub', 'Get the snapped screw\'s stub out of the box', null);   // it'll have to come out before the box goes back on
    lead('stub', 'stub-extractor', 'The stud extractor (like bolt 2)', 'you', 'sure', 'bench');
    say(`Screw ${n}`, (+n === 4 ? 'The one at the back, behind the sensor. You can\'t see it: you find it by feel. ' : '') + 'It turns… stiffer… stiffer… SNAP. The head shears clean off. The rest of the screw is stuck in the box.');
  },
  // the snapped screw's stub: the proper extractor gets it out; the cheap one snaps (as on bolt 2)
  // tap the snapped screw: try what you've got on it
  stubmenu() {
    const opts = [{ label: 'The screwdriver', run() { anger(3); say('The snapped screw', 'There\'s nothing for a screwdriver to grip: the head\'s gone. It needs an extractor.'); } }];
    if (S.inv['extractor-cheap']) opts.push({ label: 'The cheap extractor', run() { ACTIONS.stubout('cheap'); } });
    if (S.inv['extractor-good']) opts.push({ label: 'The proper extractor', run() { ACTIONS.stubout('good'); } });
    opts.push({ label: 'Leave it', run() {} });
    say('The snapped screw', 'Its stub is stuck in the box. What do you try on it?', opts);
  },
  stubout(kind) {
    pass(10);
    const good = kind ? kind === 'good' : !!S.inv['extractor-good'];
    if (good) {
      S.flags.stubOut = true;
      moment('stubExtract', 1400); sfx('creak'); sfx('pop', 1.1);    // the extractor in, a slow turn, and out comes the stub
      finishJob('stub', 'The proper extractor got the stub out');
      screwJob();                                                       // now the hole needs a screw (screws.js)
      return say('The stub', 'Tap the extractor in, a slow quarter turn… and the stub winds out. A clean hole.\n\nNow it needs a screw that matches. There\'s a jar of them on the garage shelf.');
    }
    delete S.inv['extractor-cheap']; junkIt('extractor-cheap');   // what's left of it goes in the parts box
    anger(15);
    STUB_SNAP = true;
    moment('stubExtract', 1300); sfx('creak'); sfx('snap', 0.8);      // it twists… and snaps
    ANIM.then = () => { STUB_SNAP = false; };
    note('stub', 'The cheap extractor snapped off in the stub', 'x');
    lead('stub', 'stub-extractor2', 'A proper extractor from the Hardware Shop', 'you', 'very sure', 'place:Hardware Shop');
    say('The stub', 'The cheap extractor twists… and snaps. Now there\'s a bit of extractor in the stub as well.');
  },
  // lift the old sensor out of the box (once all three screws are out, or snapped)
  boxout() {
    if ((S.flags.screws || []).length < SENSOR_SCREWS) return say('The old sensor', 'It won\'t come out. There are still screws holding it in.');
    pass(5);
    S.flags.sensorOut = true;                                          // the box is empty: parts can be tried in its hole
    S.inv['old-sensor'] = true;
    moment('benchLift', 1000); sfx('pop', 0.3);
    closeLead('box-bench', 'ok');
    finishJob('sensor-out', 'The old sensor is out of the box');
    job('new-sensor', 'Find a sensor that fits', 'light');
    note('new-sensor', 'Part number on the old one: 55 352 10? (the last digit is worn off)', 'info');
    lead('new-sensor', 'mega-sensor', 'Zamanon: "fits all models*"', 'Zamanon', 'very sure', 'app:MegaMart');
    lead('new-sensor', 'motor-factors', 'A proper parts shop', 'the forum', 'fairly sure', 'place:Halfords Car Parts');
    lead('new-sensor', 'breakers', 'The Scrap Yard has a Zafira', 'Gaz', 'maybe', 'place:Scrap Yard');
    lead('new-sensor', 'ebuy-lot', 'Thee Bay: a job lot of sensors', 'you', 'hopeful', 'app:eBuy');
    lead('new-sensor', 'csd', 'Car Spares Direct', 'you', 'maybe', 'place:Car Spares Direct');
    say('The old sensor', 'With that screw head gone, nothing\'s holding it. It lifts straight out of the box, leaving a hole where it was.\n\nNow you need one that fits.');
  },
  // try a sensor in the box's hole: lined up and pushed in, in one go
  pick(id) {
    const b = S.bench;
    if (b && b.state === 'stuck') return say('The workbench', 'The other one\'s stuck in the hole. Pull it out first.');
    if (b && b.state === 'in' && b.part === 'old-sensor') return say('The workbench', 'The old one\'s back in the hole. Pull it out first.');
    const rotated = id === 'part-p4l' ? !!S.flags.linedUp : true;       // the Parts 4 Less one: the first time, you don't line the pins up (and it jams)
    S.bench = { part: id, rotated, state: 'over' };
    ACTIONS.push();
  },
  push() {
    const b = S.bench;
    if (!b) return say('The workbench', 'Pick a part to try first.');
    pass(5);
    const fit = sensorFit(b.part);                                     // how this one fits (sensors.js)
    if (b.part === 'part-mega') closeLead('try-mega', 'x', 'Zamanon sensor: wrong shape (hex, not round)');
    if (fit !== 'right' && fit !== 'old') return tryWrongSensor(b);    // touches the hole, and fails its own way
    if (b.part === 'old-sensor') {                                     // the old one came out of here, so it goes back in (once lined up)
      if (!b.rotated) return say('Push', 'The pins don\'t line up. Rotate it.');
      b.state = 'in';
      moment('benchFit', 1000); sfx('clink', 0.65);
      return say('Push', 'Click. The old one goes straight back in. Of course it does. It\'s the old one.');
    }
    if (b.state === 'stuck') return say('Push', 'It won\'t go any further.');
    if (!b.rotated) { b.state = 'stuck'; anger(10); moment('benchStuck', 1100); sfx('creak'); return say('Push', 'It goes in halfway… and sticks. Now it won\'t come out either.'); }
    b.state = 'in';
    S.flags.fits = true;
    S.flags.fittedPart = b.part;                                       // the one that fits (the Parts 4 Less one, or the soldered one)
    moment('benchFit', 1000); sfx('clink', 0.65); sfx('ding', 0.8);
    stillAfter('click');                                               // it fits!
    finishJob('new-sensor', `The ${sensorName(b.part)} fits!`);
    closeLead('try-p4l', 'ok'); closeLead('try-soldered', 'ok');
    lead('light', 'fit', 'Fit the box (new sensor and all) back on the car', 'you', 'sure', 'underZoom');
    const stub = S.flags.sheared && !S.flags.stubOut ? '\n\nThree screws hold it in. The fourth hole still has the stub of the snapped screw in it: get that out with the extractor, then find a screw for it.'
      : S.flags.sheared && !S.flags.screw3 ? '\n\nThree screws hold it in. The fourth hole needs a screw that matches: the jar on the garage shelf.' : '\n\nAll four screws hold it in.';
    say('Push', 'Click. It fits. It actually fits.' + stub + '\n\nThen fit the box back on the car.');
  },
  pullpart() {
    const b = S.bench;
    if (!b) return;
    pass(5);
    if (b.state === 'stuck' && !S.flags.tapped) {                  // jammed: it needs a tap with a hammer first
      anger(8); sfx('creak');
      if (!S.flags.needHammer) {
        S.flags.needHammer = true;
        job('hammer', 'Find a hammer', 'new-sensor');
        lead('hammer', 'hammer-box', 'The hammer in the toolbox (drawer 6)', 'you', 'sure', 'toolbox');
      }
      return say('Pull', 'It won\'t budge. It\'s jammed solid. A tap with a hammer might free it.');
    }
    if (b.state === 'stuck') { b.state = 'over'; S.flags.tapped = false; S.flags.linedUp = true; anger(5); moment('benchPull', 1000); sfx('creak'); return say('Pull', 'With a lot of wiggling, it comes out. Eventually.\n\nNext time, line the pins up first.'); }
    if (b.state === 'in' && b.part === 'old-sensor') { S.bench = null; sfx('creak'); return say('Pull', 'You pull the old one back out.'); }
    say('Pull', 'It\'s not in.');
  },
  // ----- the phone -----
  ring(who) {
    pass(5);
    if (S.mins < 6 * 60 && LATE_CALLS[who]) { anger(3); return say(LATE_CALLS[who][0], LATE_CALLS[who][1]); }   // past midnight: they're not happy (Steve)
    if (who === 'Yard') return ringYard();                              // the Scrap Yard: book a slot
    if (who === 'Brother' && askPaulForMoney()) return;                 // skint: Paul lends you twenty (once)
    if (who === 'Brother') return ringBrother();                        // your brother: he'll come round (brother.js)
    if (who === 'Mum' && askMumForMoney('Ringing Mum & Dad')) return;    // skint: Mum sends some (now and then)
    if (who === 'Wife') {                                              // she says just what she'd say to your face
      if (isAsleep()) return say('Ringing the wife', 'It rings and rings. She\'s asleep.');
      const line = wifeLine();
      return say('Ringing the wife', line);                            // in her own voice, down the phone (say() chatters it: 'Ringing the wife' is a woman's voice)
    }
    const lines = {
      Gaz: S.flags.gazTried ? '"Still looking for it, mate."' : '"Come round, I\'ll have a look for that reader."',
      Mum: '"Come over any time, love. Your dad\'ll have a look at the car." In the background: "I KNOW CARS."',
      Brother: '"Can\'t talk, in the van. Ring you back." (He doesn\'t.)'
    };
    say('Ringing ' + who, lines[who] || 'No answer.');
  },
  // ----- the computer -----
  buy(id) {
    const item = ITEMS[id];
    if (S.flags['ordered-' + id]) return say('Already ordered', 'It\'s on its way.');
    if (!spend(item.price)) { anger(10); return say('Payment', DECLINED); }
    S.flags['ordered-' + id] = true;
    const fromBay = ['reader-good', 'headlight-bay', 'sensor-lot'].includes(id);   // Thee Bay: used, 2 days; Zamanon: next day
    order(id, fromBay ? 2 : 1, fromBay ? 'Thee Bay' : 'Zamanon');
    if (id === 'reader-cheap') closeLead('mega-reader', 'ok', 'Ordered a code reader from Zamanon (due tomorrow)');
    if (id === 'reader-good') closeLead('ebuy-reader', 'ok', 'Ordered a used code reader on Thee Bay (2 days)');
    if (id === 'part-mega') { closeLead('mega-sensor', 'ok', 'Ordered the Zamanon sensor (due tomorrow)'); }
    if (id === 'sensor-lot') closeLead('ebuy-lot', 'ok', 'Ordered a job lot of 300 sensors on Thee Bay (2 days)');
    if (id === 'battery-23a') {
      closeLead('bat-online', 'ok', 'Ordered 23A batteries on Zamanon (due tomorrow)');
      for (const shop of ['bat-pound', 'bat-hardware']) if (leadOpen(shop)) closeLead(shop, 'skip');   // ordered: no need to try the shops now (Steve)
    }
    say('Order placed', `${item.name}: £${item.price.toFixed(2)}. It'll be left by the front door.`);
  },
  readforum() {
    if (!S.flags.codes) return say('The forum', 'Without the error codes you don\'t know what to search for.');
    if (S.flags.forumRead) return say('The forum', 'You\'ve read it. Three times.');
    S.flags.forumRead = true;
    pass(30);
    closeLead('forum', 'ok', 'The forum has three ideas');
    sensorFound('forum, 2009', 'fairly sure');
    lead('meaning', 'loom', "It's the wiring loom", 'MrTorque', 'sure', 'underZoom');
    lead('meaning', 'fuses', 'Check your fuses first', 'MrTorque', '"tbh"', 'fuseZoom');
    say('The forum', 'Half an hour of reading. Three ideas: the sensor, the wiring, or the fuses. All posted with total confidence.');
  },
  readdocs() {
    pass(20);
    anger(5);
    closeLead('techdocs', 'x', 'TechDocs: every word is real, none of it helps');
    say('TechDocs', 'You read it twice. Step 2 sends you back to step 2. The diagram didn\'t load.');
  },
  watch() {
    pass(15);
    if (S.flags.codes) note('meaning', 'ViewTube: a video for the Excite. Yours is the Plus.', 'x');
    say('ViewTube', '"Right lads, first get the car on a ramp…" It\'s for the Excite. Yours is the Plus.');
  }
};
// =====================================================================
// THE MULTIMETER AND THE FUSES: test every fuse; the meter's battery is flat, and it's an odd one
// (a tiny 12 volt 23A). The Pound Shop and the Hardware Shop haven't got one; only Zamanon online has.
// =====================================================================
// The multimeter, in drawer 5 of the toolbox
function testMeter() {
  pass(5);
  sfx('beep');
  if (S.flags.meterOK) return say('The multimeter', 'It works. Touch the probes together and it beeps. Very satisfying.');
  const boughtAAs = S.bought && S.bought['Batteries'];              // batteries off a shop shelf: the wrong ones
  if (S.flags.meterFlat && boughtAAs && !S.flags.triedAAs) {
    S.flags.triedAAs = true;
    anger(5);
    return say('The multimeter', 'You try the batteries from the shop. They\'re AAs. The meter takes one tiny battery the size of your little finger.\n\nNo.');
  }
  S.flags.meterFlat = true;
  if (leadExists('meter')) meterBatteryJob();                       // you need it for the fuses: a job to get a battery
  say('The multimeter', 'You turn it on. The screen fades, flickers and dies. Its battery is flat.\n\nYou open the back: one tiny 12 volt battery, type 23A. You\'ve never seen one in a shop.');
}
// A job in the notebook: get a battery for the multimeter (once), with three places to try
function meterBatteryJob() {
  if (findJob('meter-battery')) return;
  if (S.flags.meterOK) return;                                       // it's got its new battery already: nothing to get (Steve)
  job('meter-battery', 'Get a battery for the multimeter', 'meaning');
  lead('meter-battery', 'bat-pound', 'The Pound Shop sells batteries', 'you', 'hopeful', 'place:Pound Shop');
  lead('meter-battery', 'bat-hardware', 'The Hardware Shop might have one', 'you', 'maybe', 'place:Hardware Shop');
  lead('meter-battery', 'bat-online', 'Order one online', 'you', 'fairly sure', 'app:MegaMart');
}
// Asking for a 23A in a shop: they haven't got one. Returns true if it was asked (the shop said its piece)
function askForBattery(place) {
  const id = place === 'Pound Shop' ? 'bat-pound' : 'bat-hardware';
  if (!leadOpen(id)) return false;
  anger(5);
  if (place === 'Pound Shop') {
    closeLead(id, 'x', 'Pound Shop: AA, AAA and watch batteries. No 23A');
    say(place, '"Batteries are on aisle 3, love. AA, AAA, and them flat ones for watches.\n\nTwelve volt? In a battery that small? Don\'t be daft."');
    return true;
  }
  closeLead(id, 'x', 'Hardware Shop: no 23A ("try online")');
  say(place, '"A 23A? Ooh. We used to get them in for garage door remotes. Not for years, mate. Try the internet."');
  return true;
}
// Test all thirty fuses with the working meter: a beep for each, and they're all fine (bar one nobody cares about)
function testAllFuses() {
  pass(45);
  S.flags.fusesTested = true;
  S.flags.meterOut = true;                                             // the multimeter, out on the box
  S.meterFuse = 0;
  moment('fusetest', 3600);
  for (let k = 0; k < 28; k++) sfx('beep', 0.1 + k * 0.12);         // a beep for each fuse (F27 and F28 are empty)
  closeLead('testfuses', 'ok');
  closeLead('fuses', 'x', 'Every fuse tested: all fine (bar F17, the cigarette lighter)');
  say('Every fuse', 'Forty-five minutes. Twenty-eight fuses, twenty-eight beeps.\n\nAll fine. Except F17, the cigarette lighter, which has probably been blown since 2011.\n\nSo it\'s not the fuses.');
}

// The multimeter out (or away) on the fuse box
ACTIONS.meterout = on => {
  S.flags.meterOut = on === '1';
  S.meterFuse = 0;
  sfx('click');
};
// Looking at a fuse without the multimeter out: you can't tell
ACTIONS.fuselook = n => say('F' + n, S.flags.meterOK ? 'You can\'t tell by looking. Get the multimeter out and point the probes at it.' : 'You can\'t tell by looking. You need something to test it with.');
// The probes on one fuse (you point at it): the screen reads 0 and gives a tone if it's good; 1, and no tone, if it's blown (Steve)
ACTIONS.testfuse = n => {
  const k = +n;
  if (!meterOut() || fuseEmpty(k)) return;
  pass(1);
  S.meterFuse = k;
  S.fusesChecked = S.fusesChecked || [];
  if (!S.fusesChecked.includes(k)) S.fusesChecked.push(k);
  if (k === FUSE_BLOWN && !S.flags.f17Seen) note('meaning', 'F17 (the cigarette lighter) reads 1: blown. Probably since 2011', 'x');   // once, in the notebook (no message in the way)
  if (k === FUSE_BLOWN) S.flags.f17Seen = true;
  else sfx('beep');                                                    // a good one: 0, and the tone
  const all = S.fusesChecked.length >= 28;                             // every fuse (bar the two empty slots)
  if (all && !S.flags.fusesTested) {
    S.flags.fusesTested = true;
    closeLead('testfuses', 'ok');
    closeLead('fuses', 'x', 'Every fuse tested: all fine (bar F17, the cigarette lighter)');
    say('Every fuse', 'That\'s the lot. Twenty-eight fuses, one at a time. All fine, bar the cigarette lighter.\n\nSo it\'s not the fuses.');
  }
};
// Look at thing k in a close-up's list of [name, what you find, where it is]: its name, and what you find
function lookAtThing(list, k) {
  const [name, words] = list[+k] || [];
  if (name) say(name, words);
}
// Knocking the box of screws off the workbench when you look under it: saved for later, not used yet
const SCREWS_SPILL = false;
// The torch beam has moved (the pointer, under something): a spider in it runs; the lost nut in it glints
function underBeamMoved() {
  if (S.screen !== 'lookunder' || !haveLight() || ANIM || DIALOG) return;
  const hunting = S.flags.n3lost && !S.flags.n3found;
  if (S.under === 'the tool chest' && hunting && !UNDER_SEEN.nut) {   // the lost nut first: it's what you're after
    const [nx, ny] = UNDER_FINDS['the tool chest'][0];
    if (inTorchLight(nx, ny)) { UNDER_SEEN.nut = true; nutSpotted(); return; }
  }
  if (UNDER_SPIDER && inTorchLight(UNDER_SPIDER.x, UNDER_SPIDER.y)) {   // caught in the light: it runs for the dark
    SPIDER_RUN = UNDER_SPIDER;
    UNDER_SPIDER = null;
    S.flags.spiderSeen = true;
    sfx('creak');
    moment('spider', 2600);                                           // it freezes in the light, then runs for it
    say('Under ' + S.under, 'Something in the beam moves. A spider. A big one. It scurries off into the dark.');
  }
}
// The beam's on the lost nut: there it is
function nutSpotted() {
  S.flags.nutSeen = true;
  if (!S.inv.stick) {
    lead('nut3', 'stick', 'Something long and thin to hook it out: the hedge, or something in the parts boxes', 'you', 'hopeful', 'home');
    return say('Under the tool chest', 'THERE. A glint, right at the back under the tool chest. Your fingers don\'t reach. Not even close.');
  }
  say('Under the tool chest', 'THERE it is. You lie on the floor with the torch in your teeth and the stick in your hand…', [{ label: 'Hook it out', run() { fishStart(); show('fish'); } }]);
}
// A reader's plug tried in the port (after its moment): the wrong ones don't fit; the right one goes in
function plugTried(id) {
  const first = !S.flags['tried-' + id];                               // the first go makes you cross; after that you knew
  if (id === 'reader-good') {
    show('dash');                                                      // it's in: back in the seat, the reader on its lead
    return ACTIONS.plug();
  }
  S.flags['tried-' + id] = true;
  S.inv[id] = false;                                                   // no good: it goes in the parts box
  junkIt(id);
  sfx('clink');
  if (first) anger(10);
  if (id === 'reader-old') {                                           // Gaz's: from 1994
    closeLead('gaz-reader', 'x', "Gaz's reader: wrong plug (from 1994)");
    return say("Gaz's reader", "A little round plug with five pins. Your car's port is flat, with sixteen. Gaz's reader is from 1994.");
  }
  // the Zamanon one: it's for lorries
  closeLead('try-cheap', 'x', 'Zamanon reader: wrong plug (it\'s for lorries)');
  lead('codes', 'ebuy-reader', 'Get a proper one on Thee Bay', 'a Zamanon review', 'fairly sure', 'app:eBuy');
  say('Zamanon reader', 'A round plug the size of a jam jar lid, with nine fat pins. It goes nowhere near the port.\n\nThe small print on the box: "*fits all lorries".');
}
// Opening a parcel at the front door
function openParcel(item) {
  pass(5);
  if (item === 'reader-cheap') {                                       // the Zamanon one: kept, to try in the port
    S.inv['reader-cheap'] = true;
    lead('codes', 'try-cheap', 'Try the Zamanon reader in the port', 'you', 'hopeful', 'dash');
    return say('A parcel', 'A code reader! "Fits all cars*". Its plug looks… big.\n\nThe port is under the dash.');
  }
  if (item === 'battery-23a') {                                         // the meter's battery, at last
    S.inv['battery-23a'] = true;
    S.flags.meterOK = true;
    finishJob('meter-battery', 'A pack of five 23A batteries from Zamanon. Needed one');
    closeLead('meter', 'ok', 'The multimeter works');
    lead('meaning', 'testfuses', 'Test every fuse with the multimeter', 'you', 'sure', 'fuseZoom');
    return say('A parcel', 'Five tiny 12 volt batteries in a blister pack. You needed one.\n\nOne goes in the multimeter. It beeps! Now test the fuses.');
  }
  if (item === 'reader-good') {
    S.inv['reader-good'] = true;
    lead('codes', 'plug-in', 'Plug the reader in (key to II)', 'you', 'sure', 'dash');
    return say('A parcel', 'A used code reader. The plug looks right!\n\nThe port is under the dash.');
  }
  if (item === 'sensor-lot') return openJobLot();                     // 300 sensors (sensors.js)
  if (item === 'part-mega') {
    S.inv['part-mega'] = true;
    lead('new-sensor', 'try-mega', 'Try the Zamanon sensor on the bench', 'you', 'hopeful', 'bench');
    return say('A parcel', 'The Zamanon sensor. It\'s blue. The old one was black. Does that matter?');
  }
  if (item === 'headlight-bay') {                                      // posted: always a right one
    addLamp('right');                                                   // on the shelf, whatever happens
    delete S.flags['ordered-headlight-bay'];                            // you can order another
    if (brokeOpen('headlight2')) return say('A parcel', 'A headlight. A right one. Which, since you kicked that one in, is exactly right.\n\nFit it under the bonnet.');
    if (!brokeOpen('headlight')) return say('A parcel', 'A headlight. A right one. Nothing\'s smashed just now. It goes on the shelf in the garage, just in case.');
    anger(10);
    note('broke-headlight', 'Thee Bay headlight: the wrong side (it\'s a right one; yours is the left)', 'x');
    return say('A parcel', 'A headlight! …for the other side. Yours is the left one. This is a right one.');
  }
  if (item === 'headlight-zam') { addLamp('left'); delete S.flags['ordered-headlight-zam']; return say('A parcel', 'A headlight. The left one. It actually looks right.\n\nFit it under the bonnet.'); }
  say('A parcel', 'Something you didn\'t order.');
}
// Looking at things under the car and the bonnet
const LOOKS = {
  'Shed': 'Locked. The key is somewhere in the garage. Probably in the parts box.',   // the back garden
  'Rear suspension': 'Springs, rust, a spider. Not the problem. Probably.',
  'Fuel tank': 'Black plastic. A strap. Not the problem.',
  'Exhaust': 'Rusty, held on by a rubber hanger and hope. Not today\'s problem.',
  'Brake lines': 'Crusty but dry. Leave them alone.',
  'Engine': 'An engine. It looks like an engine.',
  'Battery': 'It reads 12.6 volts on the dash. Fine.',
  'Spare wheel': 'A spare wheel, bolted down in its well. The tyre feels a bit soft. Good to know it\'s there for a flat tyre. Probably.',
  'Jack': 'The scissor jack, folded flat in its foam tray. It winds up very, very slowly.',
  'Breaker bar': 'A breaker bar: a long, heavy spanner handle for shifting stuck bolts. Too short and too fat to hook anything out from under anything.',
  'Dog poo': 'Dog poo. Lots of it, all over the yard. Every scrap yard you\'ve ever been to: a dog, and this.\n\nThe dog watches you look at it.',
  'Wheel brace': 'The wheel brace, for the wheel nuts. It\'s the short one, so it won\'t shift a nut that\'s on tight.',
  'Air filter': 'Full of leaves. Not the problem, but you feel judged.',
  'Coolant': 'Pink, at MAX. Fine.',
  'Brake fluid': 'Fine.',
  'Manuals': 'Haynes-style manuals: the diesel, the old model, one in German. The page you need is stuck to the next one with oil.',
  'Parts boxes': 'Old parts, wrong parts, returns you never sent back, and a box of hundreds of screws.'
};
// The end of branch 1: the red light goes off, and another one comes on
function finishBranch() {
  stillAfter('abs');                                                   // the red light off… the ABS light on
  finishJob('light', 'THE RED LIGHT IS OFF!');
  closeLead('test', 'ok');
  job('abs', 'Get the ABS light off', null);
  note('abs', 'It came on the moment the red one went off.', 'x');
  say('It starts…', 'The red light goes OFF.\n\nYou punch the air.\n\nThen the orange ABS light comes ON.\n\n(That\'s the end of branch 1. More branches next.)');
}
