// The Thankless Task: the story. Branch 1: the red light on the dash.
// Who says what, what each action does, what's for sale, and the leads each thing gives.
// Lead targets: a screen ('garage', 'under', 'underZoom', 'dash', 'fuseZoom', 'bench', 'city'),
// a place in town ('place:Motor Factors') or a computer app ('app:Forum').

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
  { id: 'mum-text', day: 1, mins: 15 * 60, run() { textMsg('Mum', 'Are you still coming Sunday? Bring the car x'); } },
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
  'new-sensor'() { lead('new-sensor', 'motor-factors', 'A proper parts shop', 'a hunch', 'vague', 'place:Motor Factors'); }
};

// =====================================================================
// THE CODES
// =====================================================================
function readCodes(how) {
  if (S.flags.codes) return say('The codes', 'Same two codes as before:\n\nP0705 Transmission range sensor circuit malfunction\nP0706 Range / performance');
  S.flags.codes = true;
  finishJob('codes', 'Codes: P0705 and P0706 (' + how + ')');
  job('meaning', 'What does P0705 mean?', 'light');
  lead('meaning', 'forum', 'Look it up on the forum', 'you', 'hopeful', 'app:Forum');
  lead('meaning', 'techdocs', 'The official technical pages', "the reader's booklet", 'sure', 'app:TechDocs');
  lead('meaning', 'gurus', 'Ask the gearbox people', 'the man at Main Dealer', 'very sure', 'place:Gearbox Gurus');
  say('Two codes', 'P0705 Transmission range sensor circuit malfunction\nP0706 Range / performance\n\nWhatever that means. New job in the notebook.');
}

// =====================================================================
// PLACES IN TOWN
// =====================================================================
// open = [from, to] in minutes; closedDays = days it's shut; shop = things for sale
const PLACE_INFO = {
  'Spanner & Son': { open: [8 * 60, 17 * 60 + 30], person: 'Mr Spanner' },
  'Post Office': { open: [9 * 60, 17 * 60 + 30], person: 'the woman behind the glass' },
  'Quickfix Motors': { open: [8 * 60, 17 * 60 + 30], person: 'a mechanic' },
  "Sparky's Auto Electrics": { open: [9 * 60, 16 * 60 + 30], lunch: true, person: 'Sparky' },
  'Main Dealer': { open: [9 * 60, 17 * 60], person: 'the service desk' },
  'Gearbox Gurus': { open: [9 * 60, 17 * 60], person: 'a man in overalls' },
  'Voltz Auto Electric': { open: [9 * 60, 17 * 60], person: 'a man with a meter' },
  "Mate Gaz's": { open: [10 * 60, 22 * 60], person: 'Gaz' },
  'Tool Shop': { open: [8 * 60, 17 * 60], person: 'the man at the till', shop: ['extractor-cheap', 'socket-9'] },
  'Hardware Shop': { open: [9 * 60, 17 * 60 + 30], person: 'an old man in a brown coat', shop: ['extractor-good', 'fuses'] },
  'Motor Factors': { open: [8 * 60 + 30, 17 * 60 + 30], person: 'the counter man' },
  'Parts 4 Less': { open: [9 * 60, 16 * 60 + 30], person: 'a woman on the phone' },
  'Breakers Yard': { open: [9 * 60, 16 * 60], person: 'a man with a dog' },
  'MOT Test Centre': { open: [8 * 60, 17 * 60 + 30], person: 'the tester' },
  'Trusty Autos': { gone: true },
  "Dave's Garage": { holiday: true },
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
  'part-p4l': { name: 'Gearbox selector sensor', price: 31.5 }
};

// Is a place open right now? Returns null if open, or the reason it isn't
function closedReason(name) {
  const info = PLACE_INFO[name] || {};
  if (info.gone) return 'Boarded up. OUT OF BUSINESS. The website still takes bookings.';
  if (info.holiday) return 'A sign on the door: "On holiday. Back in 3 weeks. Sorry for any inconvenience."';
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
  S.spot.place = [105, 140];                                       // you come in at the door
  S.spot.outside = [100, 52];                                       // and get out of the car on the pavement
  S.inside = placeStyle(name) === 'house';                         // shops: you see the outside first; houses: you're on the doorstep
  if (name === 'Post Office' && S.mins < 9 * 60) S.flags.poEarly = S.day;   // here before it opens: you'll be first in
}
// Talking at the counter (or on the doorstep)
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
  'Post Office'() {
    if (postFirst()) return say('Post Office', '"Next!"\n\nYou\'re first. You\'ve been waiting outside since before nine for this.\n\n"What are you posting?"\n\nYou haven\'t got anything to post yet.');
    anger(5);
    say('Post Office', 'You join the back of the queue. Ten people. Nobody moves.', [
      { label: 'Wait in the queue (30 minutes)', run() {
        pass(30); anger(5);
        say('The queue', `It's ${hhmm(S.mins)}. The queue hasn't moved. The man at the front is posting forty parcels to Peru, one at a time.\n\nTip: be standing outside when it opens at 9:00.`);
      } },
      { label: 'Give up', run() {} }
    ]);
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
    lead('codes', 'mega-reader', 'Buy your own code reader on MegaMart', 'Sparky', 'fairly sure', 'app:MegaMart');
    say("Sparky's Auto Electrics", '"Reader\'s broken, mate. Waiting on a part. Get your own: MegaMart do one for a tenner."');
  },
  'Main Dealer'() {
    if (S.flags.codes) return say('Main Dealer', '"Anything else? That\'ll be £120."');
    say('Main Dealer', '"We can plug it in, sir. That\'s £120 for the diagnostic."', [
      { label: 'Pay £120', run() {
        if (!spend(120)) { anger(10); return say('Main Dealer', 'Card declined.'); }
        pass(30);
        closeLead('dealer', 'ok', 'Main dealer read the codes (£120)');
        readCodes('main dealer, £120');
      } },
      { label: 'Too dear', run() { anger(5); say('Main Dealer', '"Suit yourself."'); } }
    ]);
  },
  'Gearbox Gurus'() {
    closeLead('gurus', 'x', 'Gearbox Gurus: "that\'s electrics"');
    if (S.flags.codes) lead('meaning', 'voltz', 'Ask an auto electrician', 'Gearbox Gurus', 'very sure', 'place:Voltz Auto Electric');
    say('Gearbox Gurus', '"P0705? That\'s electrics, mate. Nothing to do with the gearbox. Try Voltz."');
  },
  'Voltz Auto Electric'() {
    anger(10);
    closeLead('voltz', 'x', 'Voltz: "that\'s the gearbox" (round and round)');
    say('Voltz Auto Electric', '"P0705? That\'s the gearbox, mate. You want the gearbox people."');
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
  'Hardware Shop'() {
    if (S.flags.needHammer && !S.inv.hammer && !S.flags.hammerAsked) {   // they say they haven't got one; they have
      S.flags.hammerAsked = true;
      closeLead('hammer-shop', 'x', 'Hardware Shop: "no hammers"');
      lead('hammer', 'hammer-shelf', 'Look along their shelves yourself', 'you', 'hopeful', 'place:Hardware Shop');
      return say('Hardware Shop', '"A hammer? Not got any, mate. Sold the last one Tuesday."');
    }
    shopCounter('Hardware Shop', '"Yes?"');
  },
  'Car Spares Direct'() {
    if (!brokeOpen('lens')) return say('Car Spares Direct', '"Car spares? Direct? That\'s us. What do you want?"');
    say('Car Spares Direct', '"Indicator lens? Got one in the back. £4."', [
      { label: 'Pay £4', run() { if (!spend(4)) return say('Car Spares Direct', 'Card declined.'); finishJob('broke-lens', 'New indicator lens: £4'); closeLead('lens', 'ok'); say('Car Spares Direct', '"Mind how you go."'); } },
      { label: 'Not now', run() {} }
    ]);
  },
  'Motor Factors'() {
    if (S.inv['part-p4l'] || S.flags.p4lReady) return say('Motor Factors', '"It\'s at the other branch, like I said."');
    if (!findJob('new-sensor')) return say('Motor Factors', '"What part do you need? No part number, no part."');
    S.flags.p4lReady = now() + 120;
    closeLead('motor-factors', 'ok', 'Motor Factors: ordered, ready in 2 hours at the other branch');
    lead('new-sensor', 'p4l', 'Collect it at Parts 4 Less', 'Motor Factors', 'sure', 'place:Parts 4 Less');
    say('Motor Factors', '"Got one. Ready in two hours… at our other branch. Parts 4 Less. They shut at half four."');
  },
  'Parts 4 Less'() {
    if (S.inv['part-p4l']) return say('Parts 4 Less', '"You\'ve already got it."');
    if (!S.flags.p4lReady) return say('Parts 4 Less', '"Nothing here for you, love."');
    if (now() < S.flags.p4lReady) return say('Parts 4 Less', '"Not come over yet. Try later."');
    say('Parts 4 Less', '"Here it is. £31.50."', [
      { label: 'Pay £31.50', run() {
        if (!spend(31.5)) return say('Parts 4 Less', 'Card declined.');
        S.inv['part-p4l'] = true;
        closeLead('p4l', 'ok', 'Bought a sensor at Parts 4 Less');
        lead('new-sensor', 'try-p4l', 'Try the new sensor on the bench', 'you', 'hopeful', 'bench');
        say('Parts 4 Less', 'It looks right. It looks… nearly right.');
      } },
      { label: 'Not now', run() {} }
    ]);
  },
  'Breakers Yard'() {
    if (brokeOpen('wiper')) {
      finishJob('broke-wiper', 'A wiper arm from the Breakers Yard: £2'); closeLead('wiper', 'ok'); spend(2);
      return say('Breakers Yard', '"A wiper arm? Help yourself, they\'re all the same. Two quid."\n\nThey\'re not all the same, but this one fits.');
    }
    if (!findJob('new-sensor')) return say('Breakers Yard', '"Got all sorts. What are you after?"');
    say('Breakers Yard', '"A Zafira automatic? Don\'t think I\'ve got one, mate. Have a look round if you like. Mind the dog."', [
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
  if (!spend(item.price)) { anger(10); return say(place, 'Card declined.'); }
  S.inv[id] = true;
  sfx('beep');
  if (id === 'extractor-cheap') closeLead('extractor', 'ok');
  if (id === 'extractor-good') closeLead('extractor2', 'ok');
  if (id === 'fuses') note('meaning', 'Bought fuses: all the wrong amps', 'x');
  say(place, `You buy: ${item.name}.`);
}

// =====================================================================
// WHEN YOU OPEN CERTAIN SCREENS
// =====================================================================
const SCREEN_ENTER = {
  garage() {
    if (!S.flags.n3lost || S.flags.nutEscaped) return;
    S.flags.nutEscaped = true;
    moment('nutEscape', 2200); sfx('drop');
    say('Nut 3', 'There it goes: out from under the car, bouncing across the floor… and gone. Somewhere.');
  },
  home() {
    const fresh = S.doorstep.filter(p => !p.seen);
    if (!fresh.length) return;
    fresh.forEach(p => { p.seen = true; });
    moment('van', 2600); sfx('van'); sfx('thud', 1.2);
  },
  underZoom() {
    // having found the codes, a look at the gearbox makes it the sensor (probably)
    if (!S.flags.codes || S.flags.sensorJob) return;
    if (!leadExists('sensor')) return;
    S.flags.sensorJob = true;
    closeLead('sensor', 'ok', 'Found the sensor on the gearbox');
    finishJob('meaning', 'Probably the gearbox sensor');
    job('sensor-off', 'Get the old sensor off', 'light');
    note('sensor-off', '2 bolts and a nut hold it on.', 'info');
  },
  pc() { pass(5); },
  phone() { for (const m of S.msgs) m.read = true; }
};

// =====================================================================
// ACTIONS (from the buttons under the picture and the dialogs)
// =====================================================================
const ACTIONS = {
  // ----- moving round -----
  go(target) { goTo(target); },
  talk() { talk(S.place); },
  // wait outside until it opens (you're there, ready, when the door unlocks)
  waitopen() {
    const [from] = (PLACE_INFO[S.place] || {}).open || [9 * 60];
    if (S.mins >= from) return;
    if (S.place === 'Post Office') S.flags.poEarly = S.day;
    pass(from - S.mins);
    say('You wait', `You wait on the pavement. At ${hhmm(S.mins)} the door unlocks.`);
  },
  wait() {
    const early = S.place === 'Post Office' && S.mins < 9 * 60;
    pass(30);
    if (early && !S.inside) S.flags.poEarly = S.day;                  // still outside when it opens
    say('You wait', `Half an hour${S.inside ? '' : ' on the pavement'}. It's ${hhmm(S.mins)}.`);
  },
  // look at another part of town on the map (centre it on that block)
  cam(arg) {
    const [bi, bj] = arg.split(',').map(Number);
    const cx = bi * BLOCK + STREET + 35, cy = bj * BLOCK + STREET + 35;
    S.cam.ox = 320 - (cx - cy);
    S.cam.oy = 190 - (cx + cy) / 2;
  },
  // ----- home -----
  tea() { pass(10); anger(-15); moment('tea', 1400); sfx('pour'); say('A cup of tea', (S.mins % 3) ? 'You make a tea. You calm down a bit.' : 'You make a tea. It goes cold before you drink it.'); },
  bed() { sfx('door'); sleepUntilMorning(); say('Next morning', `It's ${weekday()} morning. You feel a bit better.`); },
  parcel() {
    const p = S.doorstep.shift();
    if (!p) return say('The doorstep', 'Nothing there.');
    sfx('pop');
    openParcel(p.item);
  },
  // ----- garage -----
  // ----- finding nut 3: a torch to look under things, then a stick to hook it out -----
  search(where) {
    pass(10);
    if (!S.flags.torchLit) {
      lead('nut3', 'torch', 'A torch: there was one in the toolbox', 'you', 'fairly sure', 'toolbox');
      return say('Under ' + where, 'Pitch black under there. You need a torch.');
    }
    closeLead('search', 'ok');
    if (where === 'the workbench' && !S.flags.screwsSpilt) {
      S.flags.screwsSpilt = true; anger(10); moment('screws', 1500); sfx('screws');
      return say('Under the workbench', 'You lean on the bench to look underneath and knock a box of hundreds of screws off it. They go everywhere. No nut, though.');
    }
    if (where !== 'the tool chest') {
      const found = { 'the car': 'A 1996 coin, a sweet wrapper and an oil stain shaped like France. No nut.', 'the parts boxes': 'Old parts, a dead spider and half a sandwich. No nut.', 'the shelves': 'Dust. A lot of dust. No nut.', 'the workbench': 'Screws, everywhere. Still no nut.' };
      anger(3);
      return say('Under ' + where, found[where] || 'No nut.');
    }
    S.flags.nutSeen = true;
    if (!S.inv.stick) {
      lead('nut3', 'stick', 'Something long and thin to hook it out', 'you', 'hopeful', 'home');
      return say('Under the tool chest', 'THERE. A glint, right at the back under the tool chest. Your fingers don\'t reach. Not even close.');
    }
    say('Under the tool chest', 'You lie on the floor with the torch in your teeth and the stick in your hand…', [{ label: 'Hook it out', run() { fishStart(); show('fish'); } }]);
  },
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
    pass(5); S.inv.stick = true; sfx('click');
    closeLead('stick', 'ok', 'A long stick from the hedge');
    lead('nut3', 'hook', 'Hook the nut out from under the tool chest', 'you', 'hopeful', 'garage');
    say('A stick', 'You snap a long, thin stick off the hedge. Perfect. Probably.');
  },
  giveup() { anger(10); show('garage'); },
  // ----- in a shop -----
  enter() {
    const shut = closedReason(S.place);
    if (shut) { sfx('door'); anger(3); return say(S.place, shut); }
    // the post office: if you were outside before it opened and you go in by 9:10, you're first in the queue
    if (S.place === 'Post Office' && S.flags.poEarly === S.day && S.mins <= 9 * 60 + 10) S.flags.poFirst = S.day;
    S.inside = true; S.spot.place = S.place === 'Post Office' ? (postFirst() ? [104, 76] : [118, 146]) : [105, 140]; sfx('bell');
  },
  leave() { S.inside = false; S.spot.outside = [162, 52]; sfx('bell'); },
  browse() { pass(5); say('The stock', BROWSE[placeStyle(S.place)]); },
  posters() { const [a, b] = POSTERS[placeStyle(S.place)] || ['', '']; pass(2); say('The posters', `"${a}" (${b}). And one that just says SALE. It's from 2017.`); },
  // ----- the breakers yard: look at each wreck -----
  wreck(n) {
    const i = +n;
    pass(10);
    S.flags['wreck' + i] = true;
    if (i === 4) { anger(10); sfx('sad'); } else { anger(3); sfx('clink'); }
    const seen = WRECKS.slice(0, MAYBE_YOURS).filter((w, k) => S.flags['wreck' + k]).length;   // only the six that might be yours count
    const allSeen = i < MAYBE_YOURS && seen === MAYBE_YOURS;
    if (allSeen) closeLead('breakers', 'x', 'Breakers Yard: six Zafiras (nearly), not one sensor');
    say('A wreck', WRECKS[i][4] + (allSeen ? '\n\nThat\'s all six that might have been yours.' : ''));
  },
  // ----- the dashboard: tap the key to turn it one click -----
  rev() { if (!S.flags.running) return; engineRev(); moment('rev', 1600); },
  horn() { sfx('hornnear'); moment('horn', 500); },                    // parp! (the horn works with the key off, like a real car)
  turnkey() {
    if (S.flags.running) { S.flags.running = false; S.key = 0; sfx('click'); return; }
    ACTIONS.key(String(S.key + 1));
  },
  // ----- the toolbox -----
  drawer(n) { S.drawer = S.drawer === +n ? 0 : +n; sfx('drawer'); },
  find10() { pass(10); anger(5); sfx('clink'); sfx('clink', 0.3); say('The 10 mm', "It's not there. It's never there. There's a 10-shaped gap in the foam."); },
  findspanner() { pass(15); anger(5); sfx('screws'); say('The right spanner', 'You dig through dozens of spanners. Three 13s, two 17s, a 7/16 from somewhere… and not the one you need.'); },
  meter() { pass(5); sfx('beep'); say('The multimeter', 'You turn it on. The screen fades, flickers and dies. Its battery is flat.'); },
  // ----- dashboard -----
  key(pos) {
    S.key = +pos;
    S.flags.running = false;
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
  plug(which) {
    if (S.key < 2) return say('Code reader', 'Nothing. The key needs to be at II for the reader to wake up.');
    pass(10);
    sfx('beep');
    if (which === 'old') {
      anger(10);
      closeLead('gaz-reader', 'x', "Gaz's reader: wrong plug (from 1994)");
      return say('Code reader', "Gaz's reader has a round plug. Your car's port is flat. It's from 1994.");
    }
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
  bolt2() {
    pass(10);
    if (S.flags.b2round) return say('Bolt 2', 'Your spanner just spins on it. It\'s rounded off.');
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
  extract() {
    pass(20);
    if (S.inv['extractor-good']) {
      S.flags.b2 = true;
      moment('extractOk', 1400); sfx('creak'); sfx('pop', 1.0);
      finishJob('bolt2', 'The proper extractor got it out');
      return say('Bolt 2', 'The proper extractor bites… and the bolt turns. It\'s out!');
    }
    delete S.inv['extractor-cheap'];
    anger(20);
    moment('extractSnap', 1300); sfx('creak'); sfx('snap', 0.75);
    note('bolt2', 'The cheap extractor snapped off inside the bolt', 'x');
    lead('bolt2', 'extractor2', 'A better extractor from the Hardware Shop', 'the man at the Tool Shop (who sold you the first)', 'very sure', 'place:Hardware Shop');
    say('Bolt 2', 'The cheap extractor snaps. Half of it is now stuck in the bolt as well.');
  },
  wiring() { pass(15); closeLead('loom', 'x', 'The wiring looks fine (as far as you can tell)'); say('The wiring', 'You follow the wires. They look fine. As far as you can tell.'); },
  pull() {
    if (!(S.flags.b1 && S.flags.b2 && S.flags.n3lost)) return say('Pull the sensor', 'It won\'t budge. Something\'s still holding it.');
    pass(10);
    S.flags.sensorOut = true;
    S.inv['old-sensor'] = true;
    moment('sensorPull', 1100); sfx('pop', 0.15);
    finishJob('sensor-off', 'The old sensor is out');
    job('new-sensor', 'Find a sensor that fits', 'light');
    note('new-sensor', 'Part number on the old one: 55 352 10? (the last digit is worn off)', 'info');
    lead('new-sensor', 'mega-sensor', 'MegaMart: "fits all models*"', 'MegaMart', 'very sure', 'app:MegaMart');
    lead('new-sensor', 'motor-factors', 'A proper parts shop', 'the forum', 'fairly sure', 'place:Motor Factors');
    lead('new-sensor', 'breakers', 'The Breakers Yard has a Zafira', 'Gaz', 'maybe', 'place:Breakers Yard');
    say('The sensor', 'With a twist and a pull, the old sensor comes out. There\'s a hole where it was.\n\nNow you need one that fits.');
  },
  fit() {
    if (!S.flags.fits) return say('Fit it', 'You haven\'t got one that fits yet.');
    if (!S.flags.n3found) return say('Fit it', 'Two bolts… and nut 3 is still lost.');
    pass(30);
    S.flags.fitted = true;
    moment('sensorFit', 1300); sfx('clink', 0.8); sfx('ratchet', 0.95);
    closeLead('fit', 'ok', 'New sensor fitted and plugged in');
    lead('light', 'test', 'Start the car and see', 'you', 'hopeful', 'dash');
    say('Fit it', 'Bolt, bolt, nut. Plug the connector in (gently: the tab). Done.\n\nNow the moment of truth: start it.');
  },
  // ----- under the bonnet -----
  fuses() {
    pass(10);
    sfx('click'); sfx('click', 0.3);
    if (!S.flags.knowF23) {                                         // which one is it? the lid says see the manual; the manual's not much help
      lead('meaning', 'fusebook', 'Note 7: the owner\'s manual on the shelf', 'the fuse box lid', 'sure', 'shelf');
      return say('The fuses', 'Thirty fuses. Which one is the gearbox? The lid says F23 "Instr. (see note 7)". Note 7 says "see owner\'s manual".');
    }
    closeLead('fuses', 'x', 'Fuse F23 is fine'); closeLead('checkf23', 'x');
    say('Fuse F23', 'You pull F23 and hold it up to the light. It\'s fine.');
  },
  look(what) { pass(5); say(what, LOOKS[what] || 'Looks fine. Probably.'); },
  // ----- the workbench -----
  pick(id) { S.bench = { part: id, rotated: false, state: 'over' }; },
  push() {
    const b = S.bench;
    if (!b) return say('The workbench', 'Pick a part to try first.');
    pass(5);
    if (b.part === 'part-mega') {
      anger(10);
      moment('benchNo', 1000); sfx('thud', 0.35); sfx('thud', 0.6);
      closeLead('try-mega', 'x', 'MegaMart sensor: wrong shape (hex, not round)');
      return say('Push', 'It\'s hexagonal. The hole is round. It\'s not going in.');
    }
    if (b.state === 'stuck') return say('Push', 'It won\'t go any further.');
    if (!b.rotated) { b.state = 'stuck'; anger(10); moment('benchStuck', 1100); sfx('creak'); return say('Push', 'It goes in halfway… and sticks. Now it won\'t come out either.'); }
    b.state = 'in';
    S.flags.fits = true;
    moment('benchFit', 1000); sfx('clink', 0.65); sfx('ding', 0.8);
    finishJob('new-sensor', 'The Parts 4 Less sensor fits!');
    closeLead('try-p4l', 'ok');
    lead('light', 'fit', 'Fit the new sensor to the car', 'you', 'sure', 'underZoom');
    say('Push', 'Click. It fits. It actually fits.\n\nNow fit it to the car.');
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
    if (b.state === 'stuck') { b.state = 'over'; S.flags.tapped = false; anger(5); moment('benchPull', 1000); sfx('creak'); return say('Pull', 'With a lot of wiggling, it comes out. Eventually.'); }
    say('Pull', 'It\'s not in.');
  },
  rotate() { const b = S.bench; if (!b) return; b.rotated = true; sfx('ratchet'); say('Rotate', 'You turn it until the pins line up with the slots.'); },
  flip() { const b = S.bench; if (!b) return; b.rotated = false; sfx('thud'); say('Flip', 'You turn it the other way up. Now the pins don\'t line up at all.'); },
  // ----- the phone -----
  ring(who) {
    pass(5);
    const lines = {
      Gaz: S.flags.gazTried ? '"Still looking for it, mate."' : '"Come round, I\'ll have a look for that reader."',
      Mum: '"Are you still coming Sunday? Bring the car."',
      Brother: '"Can\'t talk, in the van. Ring you back." (He doesn\'t.)'
    };
    say('Ringing ' + who, lines[who] || 'No answer.');
  },
  // ----- the computer -----
  buy(id) {
    const item = ITEMS[id];
    if (S.flags['ordered-' + id]) return say('Already ordered', 'It\'s on its way.');
    if (!spend(item.price)) { anger(10); return say('Payment', 'Card declined.'); }
    S.flags['ordered-' + id] = true;
    const shop = id === 'reader-good' ? 'eBuy' : 'MegaMart';
    order(id, id === 'reader-good' ? 2 : 1, shop);
    if (id === 'reader-cheap') closeLead('mega-reader', 'ok', 'Ordered a code reader from MegaMart (due tomorrow)');
    if (id === 'reader-good') closeLead('ebuy-reader', 'ok', 'Ordered a used code reader on eBuy (2 days)');
    if (id === 'part-mega') { closeLead('mega-sensor', 'ok', 'Ordered the MegaMart sensor (due tomorrow)'); }
    say('Order placed', `${item.name}: £${item.price.toFixed(2)}. It'll be left by the front door.`);
  },
  readforum() {
    if (!S.flags.codes) return say('The forum', 'Without the error codes you don\'t know what to search for.');
    if (S.flags.forumRead) return say('The forum', 'You\'ve read it. Three times.');
    S.flags.forumRead = true;
    pass(30);
    closeLead('forum', 'ok', 'The forum has three ideas');
    lead('meaning', 'sensor', "It's the gearbox selector sensor", 'forum, 2009', 'fairly sure', 'underZoom');
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
// Opening a parcel at the front door
function openParcel(item) {
  pass(5);
  if (item === 'reader-cheap') {
    anger(10);
    note('codes', 'MegaMart reader: wrong plug (it\'s for lorries)', 'x');
    lead('codes', 'ebuy-reader', 'Get a proper one on eBuy', 'a MegaMart review', 'fairly sure', 'app:eBuy');
    return say('A parcel', 'A code reader! …for lorries. The plug is nothing like the port in your car.');
  }
  if (item === 'reader-good') {
    S.inv['reader-good'] = true;
    lead('codes', 'plug-in', 'Plug the reader in (key to II)', 'you', 'sure', 'dash');
    return say('A parcel', 'A used code reader. The plug looks right!\n\nThe port is under the dash.');
  }
  if (item === 'part-mega') {
    S.inv['part-mega'] = true;
    lead('new-sensor', 'try-mega', 'Try the MegaMart sensor on the bench', 'you', 'hopeful', 'bench');
    return say('A parcel', 'The MegaMart sensor. It\'s blue. The old one was black. Does that matter?');
  }
  say('A parcel', 'Something you didn\'t order.');
}
// Looking at things under the car and the bonnet
const LOOKS = {
  'Rear suspension': 'Springs, rust, a spider. Not the problem. Probably.',
  'Fuel tank': 'Black plastic. A strap. Not the problem.',
  'Exhaust': 'Rusty, held on by a rubber hanger and hope. Not today\'s problem.',
  'Brake lines': 'Crusty but dry. Leave them alone.',
  'Engine': 'An engine. It looks like an engine.',
  'Battery': 'It reads 12.6 volts on the dash. Fine.',
  'Air filter': 'Full of leaves. Not the problem, but you feel judged.',
  'Coolant': 'Pink, at MAX. Fine.',
  'Brake fluid': 'Fine.',
  'Manuals': 'Haynes-style manuals: the diesel, the old model, one in German. The page you need is stuck to the next one with oil.',
  'Parts boxes': 'Old parts, wrong parts, returns you never sent back, and a box of hundreds of screws.'
};
// The end of branch 1: the red light goes off, and another one comes on
function finishBranch() {
  finishJob('light', 'THE RED LIGHT IS OFF!');
  closeLead('test', 'ok');
  job('abs', 'Get the ABS light off', null);
  note('abs', 'It came on the moment the red one went off.', 'x');
  say('It starts…', 'The red light goes OFF.\n\nYou punch the air.\n\nThen the orange ABS light comes ON.\n\n(That\'s the end of branch 1. More branches next.)');
}
