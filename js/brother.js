// Bland Quest Auto: your brother comes round to help.
// Ring him and he says he'll come round tomorrow (or he turns up on day 4 anyway). Go into the garage in the day and he's
// there: he brings back your hammer (borrowed in 2019), gives advice with total confidence, and "helps": he takes a battery
// lead off to reset the computer, clears the codes with an app (the light comes straight back), and borrows your jack.
// Then he leaves you to it.
//   S.brother: { here, from (when he came), talks, helps }; S.flags.brotherDay: the day he said he'd come

const BROTHER_SPOT = [146, 56];                                        // in the garage, in front of the workbench
const BROTHER_STAYS = 180;                                             // he stays three hours at most
const BROTHER_LOOK = { shirt: hex('#3a8a4a'), shirtDark: hex('#2a6a38'), jeans: hex('#2a3a5a'), jeansDark: hex('#1c2a44'), hair: hex('#c86a30') };
// What he says when you talk to him (after he's given the hammer back), round and round
const BROTHER_LINES = [
  '"It\'ll be the timing belt. It\'s always the timing belt."',
  '"Have you tried turning it off and on again? Not you. The car."',
  '"My mate had a Zafira. Scrapped it. Best thing he ever did."',
  '"You want WD-40 on that. On everything, really."',
  '"Mum says are you still coming Sunday."'
];

// Is he in the garage now? (he leaves after three hours, or once he's done all his helping)
function brotherHere() {
  const b = S.brother;
  if (!b || !b.here) return false;
  if (nowAbs() - b.from > BROTHER_STAYS) { b.here = false; return false; }
  return true;
}
// Going into the garage: on the day he said (or day 4 anyway), by day, he's there waiting. Returns true if he turns up now
function brotherArrives() {
  if (S.brother) return false;                                         // he's been (once is plenty)
  const due = S.flags.brotherDay || 4;
  if (S.day < due || S.mins < 9 * 60 || S.mins >= 17 * 60) return false;
  S.brother = { here: true, from: nowAbs(), talks: 0, helps: 0 };
  sfx('van');
  SPEAKER = brotherHead();
  say('Your brother', '"Alright! Door was open. Thought I\'d give you a hand."');
  return true;
}
// Where his head is on screen (for his speech bubbles)
function brotherHead() {
  [ISO.ox, ISO.oy] = VIEW.garage;
  const p = P(...BROTHER_SPOT);
  return [p[0] + 2, p[1] - 42];
}
// Draw him, in the garage
function drawBrother() {
  if (!brotherHere()) return;
  [ISO.ox, ISO.oy] = VIEW.garage;
  const m = P(...BROTHER_SPOT);
  man(m[0], m[1], 'stand', MAN_SIZE.garage, 0, BROTHER_LOOK);
  spot('Talk to your brother', isoArea(BROTHER_SPOT[0] - 4, BROTHER_SPOT[1] - 4, BROTHER_SPOT[0] + 4, BROTHER_SPOT[1] + 4, 0, 40), 'act:brother', [BROTHER_SPOT[0] - 12, BROTHER_SPOT[1] + 10]);
}

// What he does when you let him help: each once, in this order
const BROTHER_HELPS = [
  // the battery lead off, "to reset the computer": no power, and the radio wants its code again
  () => {
    S.battery = S.battery || { plus: true, minus: true };
    S.battery.minus = false;
    S.flags.running = false;
    radioForgets();
    return '"Old trick: take the battery off, it resets the computer."\n\nHe takes the − lead off and leaves it off. "Give it an hour."\n\n(No power now. And the radio will want its code.)';
  },
  // the codes cleared with an app on his phone: the light goes off, and comes straight back
  () => {
    anger(5);
    return 'He plugs his phone into the diagnostic port with a lead from a petrol station. "There. Codes cleared. Light\'s off."\n\nIt is. For four seconds. Then the red light comes back on.\n\n"Huh."';
  },
  // he borrows your jack
  () => {
    S.flags.jackLent = true;
    return '"Can I borrow your jack? Back Tuesday." He doesn\'t say which Tuesday.\n\nThen he looks at his watch. "Right, I\'ll leave you to it. Good luck, mate!" And he\'s gone.';
  }
];

Object.assign(ACTIONS, {
  // talk to him: the first time he gives your hammer back; then advice, round and round
  brother() {
    if (!brotherHere()) return;
    const b = S.brother;
    pass(10);
    SPEAKER = brotherHead();
    if (!b.talks++) return brotherHammer();
    say('Your brother', BROTHER_LINES[(b.talks - 2) % BROTHER_LINES.length]);
  },
  // let him help: he does one of his things
  brotherhelp() {
    if (!brotherHere()) return;
    const b = S.brother;
    const help = BROTHER_HELPS[b.helps++];
    if (!help) return;
    pass(30);
    anger(5);
    sfx('ratchet');
    const words = help();
    if (b.helps >= BROTHER_HELPS.length) b.here = false;               // that's him done: off he goes
    SPEAKER = b.here ? brotherHead() : null;
    say('Your brother', words);
  }
});
// The hammer he borrowed in 2019: back at last (just when you've bought one, probably)
function brotherHammer() {
  const had = !!S.inv.hammer;
  S.inv.hammer = true;
  if (findJob('hammer') && findJob('hammer').status === 'open') finishJob('hammer', 'Your brother brought it back. After four years');
  closeLead('hammer-box', 'skip'); closeLead('hammer-shop', 'skip'); closeLead('hammer-shelf', 'skip');
  const tail = had ? '\n\nYou bought one last week. Now you\'ve got two.' : '';
  say('Your brother', '"Oh, before I forget: your hammer. Had it since 2019. Cheers for that."' + tail);
}
// Ringing him: before he's been, he says he'll come round tomorrow
function ringBrother() {
  if (S.brother) return say('Ringing your brother', '"Did I leave my sunglasses round yours? And I\'ve still got your jack, by the way."');
  if (!S.flags.brotherDay) S.flags.brotherDay = S.day + 1;
  say('Ringing your brother', '"Can\'t talk, in the van. Tell you what, I\'ll come round tomorrow and give you a hand. I\'m good with cars."');
}
