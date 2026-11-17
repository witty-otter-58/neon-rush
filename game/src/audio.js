// Synthesized sound: no audio files, everything is WebAudio oscillators.
let ctx = null;
let muted = false;
let engineOsc = null;
let engineGain = null;
let padOsc = null;

export function ensureAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch { ctx = null; }
}

export function toggleMute() {
  muted = !muted;
  if (engineGain) engineGain.gain.value = muted ? 0 : 0.05;
  return muted;
}

function blip(freq, dur, type = 'sine', vol = 0.12, when = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function startPad() {
  if (!ctx || padOsc) return;
  padOsc = ctx.createOscillator();
  padOsc.type = 'triangle';
  padOsc.frequency.value = 55;
  const g = ctx.createGain();
  g.gain.value = 0.02;
  padOsc.connect(g).connect(ctx.destination);
  padOsc.start();
}

// Engine hum follows the car's speed; call every frame.
export function updateEngine(speed, boostT) {
  if (!ctx) return;
  if (!engineOsc) {
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineGain = ctx.createGain();
    engineGain.gain.value = muted ? 0 : 0.05;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    engineOsc.connect(f).connect(engineGain).connect(ctx.destination);
    engineOsc.start();
  }
  const target = 60 + Math.abs(speed) * 0.45 + (boostT > 0 ? 90 : 0);
  engineOsc.frequency.setTargetAtTime(target, ctx.currentTime, 0.06);
}

export function playEvent(name) {
  if (!ctx || muted) return;
  if (name === 'boost') {
    blip(220, 0.35, 'sawtooth', 0.10);
    blip(440, 0.35, 'sawtooth', 0.08, 0.05);
    blip(880, 0.3, 'sine', 0.10, 0.1);
  } else if (name === 'crash') {
    blip(90, 0.4, 'square', 0.16);
    blip(55, 0.5, 'sawtooth', 0.14, 0.05);
  } else if (name === 'bump') {
    blip(140, 0.15, 'square', 0.10);
  } else if (name === 'oil') {
    blip(600, 0.25, 'sine', 0.10);
    blip(300, 0.35, 'sine', 0.10, 0.08);
  } else if (name === 'checkpoint') {
    blip(660, 0.12, 'sine', 0.10);
  } else if (name === 'lap') {
    blip(523, 0.15, 'sine', 0.12);
    blip(784, 0.25, 'sine', 0.12, 0.12);
  } else if (name === 'win') {
    [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.3, 'sine', 0.12, i * 0.13));
  } else if (name === 'lose') {
    [392, 330, 262].forEach((f, i) => blip(f, 0.35, 'sine', 0.11, i * 0.16));
  }
}
