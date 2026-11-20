// Bland Quest Auto: card declined, and the bank.
// Now and then (from day 2, once a game) your card is blocked as you pay: "Card declined", and a text from the bank about
// "unusual activity" (a code reader, a sensor and a headlight, all in one week). Every card payment is declined until you
// sort it out at the bank, which is open Monday to Wednesday, 10 till 2. There: three security questions, none of which you
// get right, and then they unblock it anyway.
//   S.flags.cardBlocked: blocked now; S.flags.cardWasBlocked: it's happened (once is plenty)

let CARD_BLOCK_CHANCE = window.NO_CARD_BLOCKS ? 0 : 1 / 8;           // the chance on each payment (the tests turn it off, or up to 1)
const BANK = 'Bank';
const DECLINED = 'Card declined. Go to the bank to fix it.';         // what a till says while your card's blocked

// Paying by card: blocked now? (and now and then, it gets blocked as you pay)
function cardDeclined(amount) {
  if (amount <= 0) return false;                                      // nothing to pay
  if (S.flags.cardBlocked) return true;
  if (S.flags.cardWasBlocked || S.day < 2) return false;
  if (Math.random() >= CARD_BLOCK_CHANCE) return false;
  S.flags.cardBlocked = true;                                         // blocked, just like that
  S.flags.cardWasBlocked = true;
  textMsg('Your Bank', 'We have noticed unusual activity on your card. For your security it has been blocked. Please visit a branch.');
  job('card', 'Get your card unblocked at the bank', null);
  lead('card', 'bank', 'Go to the bank (open Mon to Wed, 10 till 2)', 'a text from the bank', 'sure', 'place:' + BANK);
  return true;
}

// The bank's three security questions: whatever you say, it's not what they've got
const BANK_QUESTIONS = [
  ['"First, your mother\'s maiden name?"', ['Smith', 'Jones', 'I don\'t know, she\'s just Mum']],
  ['"The name of your first pet?"', ['Rover', 'Tiddles', 'We had a goldfish. It didn\'t have a name']],
  ['"And the first car you ever owned?"', ['An Escort', 'A Fiesta', 'This one. It\'s always been this one']]
];
// At the bank counter with a blocked card: the questions, one at a time; then they unblock it anyway
function bankQuestions(n = 0) {
  const [q, answers] = BANK_QUESTIONS[n];
  const lead = n === 0 ? '"Your card\'s been blocked for unusual activity: a code reader, a car sensor and a headlight, all in one week. Very unusual."\n\n"I just need to ask you some security questions."\n\n' : '"That\'s not what we\'ve got."\n\n';
  say(BANK, lead + q, answers.map(a => ({ label: a, run() {
    anger(4);
    SPEAKER = keeperHead();
    if (n + 1 < BANK_QUESTIONS.length) return bankQuestions(n + 1);
    S.flags.cardBlocked = false;                                        // they give up and unblock it
    finishJob('card', 'Unblocked at the bank, after three security questions (none right)');
    say(BANK, '"…That\'s not what we\'ve got either."\n\nA long pause. Some typing.\n\n"I\'ve unblocked it. Please don\'t buy any more car parts."');
  } })));
}
// A loan from the bank, once: when you're skint
const BANK_LOAN = 200;
function bankLoan() {
  say(BANK, `"A loan? Let me see… £${BANK_LOAN}, over five years, at 39.9 percent."\n\nShe slides a form across. It's eleven pages long.`, [
    { label: `Sign for £${BANK_LOAN}`, run() {
      S.flags.bankLoan = true;
      moneyIn(BANK_LOAN, `£${BANK_LOAN} loan from the bank (39.9 percent)`);
      say(BANK, '"Lovely. Your first payment\'s due next month. And every month. For five years."');
    } },
    { label: 'No thanks', run() {} }
  ]);
}
function bankTalk() {
  if (S.flags.cardBlocked) return bankQuestions(0);
  if (S.money < SKINT && !S.flags.bankLoan) return bankLoan();        // skint: a loan
  say(BANK, '"We\'re here for you." (Monday to Wednesday, 10 till 2.)');
}
