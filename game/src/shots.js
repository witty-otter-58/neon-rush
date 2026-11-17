// ?shot=title|play|victory|defeat — stage a real scene for screenshots.
// The autopilot drives by the real rules; nothing is faked, only driven faster.
import { CFG } from './config.js';
import { PHASE, newState, startGame, step } from './world.js';
import { autopilot } from './input.js';

export function applyShot(state, input, shot) {
  const params = new URLSearchParams(location.search);
  const seed = Number(params.get('seed') || 7);
  if (shot === 'title') {
    Object.assign(state, newState(seed));
    state.phase = PHASE.TITLE;
    startGame(state, seed);
    // Park on the title screen with a live lap running behind the overlay.
    state.phase = PHASE.TITLE;
    state.drift = true;
    return;
  }
  if (shot === 'play') {
    startGame(state, seed);
    // Fast-forward: real racing, a boost pad crossed, lap 1 in progress.
    runAutopilot(state, input, 14);
    return;
  }
  if (shot === 'victory') {
    startGame(state, seed);
    runAutopilot(state, input, 1800);
    return;
  }
  if (shot === 'defeat') {
    startGame(state, seed);
    // Park the car: no throttle, the clock runs out.
    runParked(state, input, 200);
    return;
  }
}

// Drive the autopilot for up to maxSeconds of game time, several steps per
// call so a full race finishes in well under a second of wall time.
function runAutopilot(state, input, maxSeconds) {
  const dt = 1 / 60;
  let guard = 0;
  const maxSteps = maxSeconds * 60;
  while (guard++ < maxSteps) {
    if (state.phase === PHASE.VICTORY || state.phase === PHASE.DEFEAT) break;
    if (state.phase !== PHASE.PLAY) break;
    autopilot(state, input);
    step(state, input, dt);
  }
}

// Park: hold no keys, so the car sits still and the timer expires.
function runParked(state, input, maxSeconds) {
  const dt = 1 / 60;
  let guard = 0;
  const maxSteps = maxSeconds * 60;
  while (guard++ < maxSteps) {
    if (state.phase === PHASE.VICTORY || state.phase === PHASE.DEFEAT) break;
    if (state.phase !== PHASE.PLAY) break;
    input.up = false; input.down = false; input.left = false; input.right = false;
    step(state, input, dt);
  }
}

// Gentle title-screen drift: the car cruises the loop on its own behind the overlay.
export function driftTitle(state, dt) {
  if (!state.drift) return;
  const fake = { up: true, down: false, left: false, right: false };
  autopilot(state, fake);
  // step() only runs in PLAY, so borrow that phase for one tick.
  state.phase = PHASE.PLAY;
  step(state, fake, dt);
  if (state.phase === PHASE.VICTORY || state.phase === PHASE.DEFEAT) {
    // A drifted race ending would hide the title: restart it.
    startGame(state, state.seed);
    state.phase = PHASE.TITLE;
    state.drift = true;
  } else {
    state.phase = PHASE.TITLE;
  }
}
