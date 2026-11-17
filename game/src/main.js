// Shell: game loop, HUD, overlays, pause, best time, screenshot staging.
import { CFG } from './config.js';
import { PHASE, newState, startGame, step } from './world.js';
import { render } from './render.js';
import { createInput, autopilot } from './input.js';
import { applyShot, driftTitle } from './shots.js';
import { ensureAudio, startPad, toggleMute, updateEngine, playEvent } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const state = newState(7);
state.best = Number(localStorage.getItem('neon-rush-best') || 0);

const $ = (id) => document.getElementById(id);
const overlays = {
  title: $('ov-title'), victory: $('ov-victory'),
  defeat: $('ov-defeat'), pause: $('ov-pause'),
};

function show(name) {
  for (const [k, el] of Object.entries(overlays)) el.classList.toggle('show', k === name);
}

function fmt(t) {
  if (t === null || t === undefined) return '—';
  return `${t.toFixed(2)}s`;
}

function syncHud() {
  $('hud-lap').textContent = `${Math.min(state.lap, CFG.LAPS)}/${CFG.LAPS}`;
  $('hud-time').textContent = `${state.time.toFixed(1)}s`;
  $('hud-left').textContent = `${Math.ceil(state.timeLeft)}s`;
  $('hud-bestlap').textContent = fmt(state.bestLap);
  $('hud-speed').textContent = `${Math.round(Math.abs(state.car.speed) * 0.9)}`;
  $('hud-crashes').textContent = `${state.crashes}/${CFG.MAX_CRASHES}`;
  $('hud-score').textContent = state.score.toLocaleString();
  $('hud-best').textContent = state.best > 0 ? state.best.toLocaleString() : '—';
}

function afterPhaseChange() {
  if (state.phase === PHASE.PLAY) { show(null); }
  else if (state.phase === PHASE.VICTORY) {
    saveBest();
    $('vic-line').textContent = state.endLine || 'You finished the race.';
    $('vic-stats').textContent = `${state.endStats} · score ${state.score.toLocaleString()} · best ${state.best.toLocaleString()}`;
    show('victory');
  } else if (state.phase === PHASE.DEFEAT) {
    saveBest();
    $('def-line').textContent = state.endLine || 'Race over.';
    $('def-stats').textContent = `${state.endStats} · score ${state.score.toLocaleString()} · reached lap ${Math.min(state.lap, CFG.LAPS)}/${CFG.LAPS}`;
    show('defeat');
  }
}

function saveBest() {
  if (state.score > state.best) {
    state.best = state.score;
    try { localStorage.setItem('neon-rush-best', String(state.best)); } catch { /* private mode */ }
  }
}

function launch() {
  ensureAudio();
  startPad();
  startGame(state, 7);
  show(null);
}

$('btn-start').addEventListener('click', launch);
$('btn-again-v').addEventListener('click', launch);
$('btn-again-d').addEventListener('click', launch);
$('btn-resume').addEventListener('click', () => {
  state.phase = state.prevPhase;
  show(null);
});

input.onKey = (code) => {
  if (code === 'KeyM') {
    const m = toggleMute();
    document.querySelector('.sub').textContent = m ? 'muted — press M to unmute' : 'top-down racing · 3 laps · beat the clock';
  }
  if (code === 'KeyP') {
    if (state.phase === PHASE.PLAY) { state.prevPhase = PHASE.PLAY; state.phase = PHASE.PAUSE; show('pause'); }
    else if (state.phase === PHASE.PAUSE) { state.phase = state.prevPhase; show(null); }
  }
  if (code === 'KeyR' && state.phase !== PHASE.TITLE) launch();
  if (code === 'Enter' && state.phase === PHASE.TITLE) launch();
};

// Screenshot staging: ?shot=title|play|victory|defeat runs the real game fast.
const shot = new URLSearchParams(location.search).get('shot');
let staged = false;
if (shot) {
  try {
    applyShot(state, input, shot);
    staged = true;
    if (state.phase === PHASE.VICTORY || state.phase === PHASE.DEFEAT) afterPhaseChange();
    else if (state.phase === PHASE.TITLE) show('title');
    else show(null);
  } catch (err) {
    console.error('shot staging failed', err);
  }
}

let last = performance.now();
let prevPhase = state.phase;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!staged) {
    if (state.phase === PHASE.TITLE) driftTitle(state, dt);
    else if (state.phase === PHASE.PLAY) {
      step(state, input, dt);
      for (const ev of state.events) playEvent(ev);
      updateEngine(state.car.speed, state.car.boostT);
    }
  } else if (state.phase === PHASE.PLAY) {
    // Keep a staged play scene alive: the autopilot keeps racing.
    autopilot(state, input);
    step(state, input, dt);
  }
  if (state.phase !== prevPhase) { afterPhaseChange(); prevPhase = state.phase; }
  render(ctx, state);
  syncHud();
  requestAnimationFrame(frame);
}
syncHud();
requestAnimationFrame(frame);
