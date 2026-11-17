// The Thankless Task: sound effects, all made up in the browser (no sound files).
// sfx('clink') plays one; sfx('clink', 0.4) plays it 0.4 seconds from now.
// The browser only allows sound after the first tap, so the first sfx() call starts it up.

let AC = null, MASTER = null, NOISE = null;
let MUTED = false;
try { MUTED = localStorage.getItem('thankless-task-muted') === '1'; } catch (e) { /* no storage: sound on */ }

// Start the sound system (once), on the first tap
function audioStart() {
  if (AC) { if (AC.state === 'suspended') AC.resume().catch(() => {}); return true; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    MASTER = AC.createGain();
    MASTER.gain.value = MUTED ? 0 : 0.5;
    MASTER.connect(AC.destination);
    // once the browser lets sound play, start the background for wherever you are
    AC.onstatechange = () => { if (typeof S !== 'undefined') soundScene(S.screen, !!S.flags.running); };
    // two seconds of white noise, reused for every scrape, thud and hiss
    NOISE = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const d = NOISE.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  } catch (e) { AC = null; return false; }
}
function setMuted(m) {
  MUTED = m;
  try { localStorage.setItem('thankless-task-muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
  if (MASTER) MASTER.gain.value = m ? 0 : 0.5;
  if (typeof S !== 'undefined' && AC) soundScene(S.screen, !!S.flags.running);
}

// ---------- building blocks ----------
// A tone: frequency (or [from, to] for a slide), length, loudness, wave shape
function tone(at, freq, len, vol, type = 'sine') {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  const [f0, f1] = Array.isArray(freq) ? freq : [freq, freq];
  o.frequency.setValueAtTime(f0, at);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + len);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g); g.connect(MASTER);
  o.start(at); o.stop(at + len + 0.05);
}
// A burst of filtered noise: centre frequency (or [from, to]), length, loudness, filter type
function hiss(at, freq, len, vol, kind = 'bandpass', q = 1) {
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = NOISE;
  f.type = kind; f.Q.value = q;
  const [f0, f1] = Array.isArray(freq) ? freq : [freq, freq];
  f.frequency.setValueAtTime(f0, at);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + len);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  s.connect(f); f.connect(g); g.connect(MASTER);
  s.start(at, Math.random() * 1.5, len + 0.05);
}
// Metal hitting metal: a few bright, slightly out-of-tune partials
function metal(at, base, vol) {
  for (const k of [1, 2.76, 5.4]) tone(at, base * k, 0.25 / k + 0.05, vol / k, 'triangle');
  hiss(at, 6000, 0.03, vol * 0.6, 'highpass');
}

// ---------- the sounds ----------
const SOUNDS = {
  click(t) { tone(t, 900, 0.04, 0.08, 'square'); },
  clink(t) { metal(t, 1400, 0.25); },
  ratchet(t) { for (let i = 0; i < 6; i++) { hiss(t + i * 0.07, 3500, 0.025, 0.25, 'highpass'); tone(t + i * 0.07, 2200, 0.02, 0.05, 'square'); } },
  slip(t) { metal(t, 900, 0.3); hiss(t + 0.02, [2500, 800], 0.25, 0.3); tone(t + 0.05, [500, 180], 0.3, 0.08, 'sawtooth'); },
  drop(t) { [0, 0.28, 0.45, 0.56].forEach((d, i) => metal(t + d, 2200 - i * 150, 0.25 / (i + 1))); hiss(t + 0.6, 4000, 0.9, 0.05, 'highpass'); },
  snap(t) { hiss(t, 5000, 0.05, 0.6, 'highpass'); metal(t + 0.01, 700, 0.35); metal(t + 0.35, 1800, 0.15); },
  creak(t) { tone(t, [140, 90], 0.6, 0.12, 'sawtooth'); hiss(t, [600, 300], 0.6, 0.12, 'bandpass', 4); },
  pop(t) { tone(t, [600, 200], 0.12, 0.25); hiss(t, 2000, 0.05, 0.2); },
  screws(t) { for (let i = 0; i < 40; i++) metal(t + Math.random() * 1.2, 2500 + Math.random() * 3000, 0.06 + Math.random() * 0.06); },
  ding(t) { tone(t, 1046, 0.6, 0.18); tone(t + 0.12, 1568, 0.8, 0.15); },
  bell(t) { tone(t, 1318, 0.7, 0.15); tone(t + 0.18, 1046, 0.9, 0.12); },
  buzz(t) { for (let i = 0; i < 2; i++) tone(t + i * 0.35, 140, 0.22, 0.25, 'square'); },
  thud(t) { tone(t, [120, 50], 0.25, 0.5); hiss(t, 300, 0.12, 0.3, 'lowpass'); },
  kick(t) { tone(t, [160, 40], 0.3, 0.7); hiss(t, 900, 0.3, 0.5, 'lowpass'); metal(t + 0.05, 300, 0.3); hiss(t + 0.4, [3000, 500], 0.5, 0.25); thudLater(t + 0.9); },
  van(t) { tone(t, [55, 70], 1.6, 0.18, 'sawtooth'); hiss(t, [300, 500], 1.6, 0.12, 'lowpass'); tone(t + 1.6, [70, 40], 0.8, 0.15, 'sawtooth'); },
  start(t) { for (let i = 0; i < 5; i++) { tone(t + i * 0.13, [90, 60], 0.11, 0.3, 'sawtooth'); hiss(t + i * 0.13, 400, 0.1, 0.2, 'lowpass'); } tone(t + 0.7, [60, 38], 1.4, 0.2, 'sawtooth'); hiss(t + 0.7, 250, 1.4, 0.15, 'lowpass'); },
  beep(t) { tone(t, 1760, 0.08, 0.12, 'square'); tone(t + 0.12, 1760, 0.08, 0.12, 'square'); },
  pour(t) { hiss(t, [900, 1400], 1.0, 0.18, 'bandpass', 3); },
  drawer(t) { hiss(t, [500, 900], 0.35, 0.25, 'bandpass', 2); metal(t + 0.33, 600, 0.12); },
  door(t) { tone(t, [200, 80], 0.2, 0.3); hiss(t, 500, 0.1, 0.2, 'lowpass'); },
  car(t) { hiss(t, [200, 400], 0.6, 0.08, 'lowpass'); tone(t, [70, 90], 0.6, 0.06, 'sawtooth'); },
  sad(t) { tone(t, [440, 415], 0.3, 0.12, 'triangle'); tone(t + 0.3, [392, 370], 0.5, 0.12, 'triangle'); },
  fanfare(t) { [523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.12, f, 0.35, 0.15, 'triangle')); }
};
function thudLater(t) { tone(t, [100, 45], 0.25, 0.4); hiss(t, 300, 0.15, 0.3, 'lowpass'); }

// Play a sound now, or `delay` seconds from now
function sfx(name, delay = 0) {
  if (MUTED || !audioStart() || !SOUNDS[name]) return;
  try { SOUNDS[name](AC.currentTime + 0.01 + delay); } catch (e) { /* a sound failing never stops the game */ }
}

// ---------- muffled chatter when someone talks: syllables of "mwah-mwuh-mwa", no real words ----------
// n = how many syllables (longer speeches chatter longer), pitch = the voice (low for some, higher for others)
function chatter(n, pitch = 140) {
  if (MUTED || !audioStart()) return;
  try {
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;   // muffled, as if through a wall
    lp.connect(MASTER);
    let t = AC.currentTime + 0.02;
    for (let i = 0; i < n; i++) {
      const len = 0.07 + Math.random() * 0.09, f = pitch * (0.85 + Math.random() * 0.35);
      const o = AC.createOscillator(), bp = AC.createBiquadFilter(), g = AC.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (0.9 + Math.random() * 0.2), t + len);
      bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(500 + Math.random() * 700, t);   // a different vowel each time
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(bp); bp.connect(g); g.connect(lp);
      o.start(t); o.stop(t + len + 0.02);
      t += len + (Math.random() < 0.2 ? 0.12 : 0.025);                                 // little gaps between words
    }
  } catch (e) { /* never stop the game for a sound */ }
}

// ---------- background sound for each screen, and the engine ----------
let AMB = { name: null, nodes: [], timers: [] };
let ENGINE = null;                       // the running engine: { oscs, filter, gain }
// A looping hum or hiss that runs until the screen changes
function loopNoise(freq, vol, kind = 'lowpass') {
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = NOISE; s.loop = true; f.type = kind; f.frequency.value = freq; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(MASTER); s.start();
  AMB.nodes.push(s);
}
function loopTone(freq, vol, type = 'sine') {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq; g.gain.value = vol;
  o.connect(g); g.connect(MASTER); o.start();
  AMB.nodes.push(o);
}
// Every so often, play a sound (birds, a distant horn…)
function every(minS, maxS, name) {
  const next = () => { AMB.timers.push(setTimeout(() => { sfx(name); next(); }, (minS + Math.random() * (maxS - minS)) * 1000)); };
  next();
}
function stopAmbience() {
  AMB.nodes.forEach(n => { try { n.stop(); } catch (e) { /* already stopped */ } });
  AMB.timers.forEach(clearTimeout);
  AMB = { name: null, nodes: [], timers: [] };
}
// Start the background for a screen (only changes when the screen does)
const AMBIENCE = {
  home() { loopNoise(400, 0.02); every(2, 5, 'bird'); },
  city() { loopNoise(250, 0.05); every(4, 9, 'horn'); },
  place() { loopNoise(600, 0.015, 'bandpass'); },
  garage() { loopTone(100, 0.012); loopTone(200, 0.006); },
  toolbox() { loopTone(100, 0.01); },
  under() { loopTone(100, 0.008); },
  underZoom() { loopTone(100, 0.008); },
  bonnet() { loopTone(100, 0.01); },
  bench() { loopTone(100, 0.01); },
  yard() { loopNoise(500, 0.03); every(5, 10, 'bark'); }
};
// Called after every repaint: the right background, and the engine running or not
function soundScene(screen, engineRunning) {
  if (!AC || AC.state !== 'running' || MUTED) { stopAmbience(); engineOff(); return; }
  if (AMB.name !== screen) { stopAmbience(); AMB.name = screen; if (AMBIENCE[screen]) AMBIENCE[screen](); }
  const near = ['dash', 'garage', 'bonnet', 'under', 'underZoom', 'toolbox', 'bench'].includes(screen);
  if (engineRunning && near) engineOn(screen === 'dash' ? 0.22 : 0.1); else engineOff();
}
// The engine ticking over: two low buzzes, muffled, pulsing with each firing
function engineOn(vol) {
  if (ENGINE) { ENGINE.gain.gain.setTargetAtTime(vol, AC.currentTime, 0.2); return; }
  const g = AC.createGain(), f = AC.createBiquadFilter(), am = AC.createGain(), lfo = AC.createOscillator(), lfoGain = AC.createGain();
  f.type = 'lowpass'; f.frequency.value = 260;
  g.gain.value = 0.0001; g.gain.setTargetAtTime(vol, AC.currentTime, 0.3);
  am.gain.value = 0.7; lfo.frequency.value = 13; lfoGain.gain.value = 0.3;
  lfo.connect(lfoGain); lfoGain.connect(am.gain);
  const oscs = [36, 72, 108].map((fr, i) => { const o = AC.createOscillator(); o.type = i ? 'sawtooth' : 'square'; o.frequency.value = fr; o.connect(am); o.start(); return o; });
  am.connect(f); f.connect(g); g.connect(MASTER); lfo.start();
  ENGINE = { oscs, lfo, filter: f, gain: g };
}
function engineOff() {
  if (!ENGINE) return;
  const e = ENGINE; ENGINE = null;
  e.gain.gain.setTargetAtTime(0.0001, AC.currentTime, 0.15);
  setTimeout(() => { e.oscs.forEach(o => o.stop()); e.lfo.stop(); }, 800);
}
// A blip of the accelerator: the engine note rises and falls
function engineRev() {
  if (!ENGINE) return;
  const t = AC.currentTime;
  ENGINE.oscs.forEach((o, i) => { const base = [36, 72, 108][i]; o.frequency.cancelScheduledValues(t); o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * 3.2, t + 0.35); o.frequency.exponentialRampToValueAtTime(base, t + 1.6); });
  ENGINE.filter.frequency.cancelScheduledValues(t); ENGINE.filter.frequency.setValueAtTime(260, t);
  ENGINE.filter.frequency.linearRampToValueAtTime(1200, t + 0.35); ENGINE.filter.frequency.exponentialRampToValueAtTime(260, t + 1.6);
  ENGINE.lfo.frequency.setValueAtTime(13, t); ENGINE.lfo.frequency.linearRampToValueAtTime(40, t + 0.35); ENGINE.lfo.frequency.exponentialRampToValueAtTime(13, t + 1.6);
}
// More one-off sounds for the backgrounds
SOUNDS.bird = t => { const f = 2800 + Math.random() * 1200; for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) tone(t + i * 0.11, [f, f * 1.35], 0.08, 0.05); };
SOUNDS.hornnear = t => { tone(t, 330, 0.45, 0.16, 'square'); tone(t, 415, 0.45, 0.13, 'square'); };   // our own horn, right here
SOUNDS.horn = t => { tone(t, 330, 0.35, 0.025, 'square'); tone(t, 415, 0.35, 0.02, 'square'); };
SOUNDS.bark = t => { for (let i = 0; i < 2; i++) { tone(t + i * 0.22, [420, 260], 0.12, 0.12, 'sawtooth'); hiss(t + i * 0.22, 900, 0.1, 0.1); } };
SOUNDS.carpass = t => { hiss(t, [180, 700], 0.9, 0.12, 'lowpass'); hiss(t + 0.9, [700, 150], 0.9, 0.12, 'lowpass'); tone(t, [55, 75], 0.9, 0.05, 'sawtooth'); tone(t + 0.9, [75, 48], 0.9, 0.05, 'sawtooth'); };
SOUNDS.plink = t => { tone(t, [1900, 1300], 0.09, 0.06); };
