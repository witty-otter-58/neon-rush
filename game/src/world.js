// State, arcade physics, laps, collisions, win / lose.
import { CFG } from './config.js';
import { buildTrack, nearestSample } from './track.js';

export const PHASE = { TITLE: 'title', PLAY: 'play', PAUSE: 'pause', VICTORY: 'victory', DEFEAT: 'defeat' };

export function newState(seed) {
  const track = buildTrack();
  const start = track.at(0);
  return {
    seed,
    track,
    phase: PHASE.TITLE,
    prevPhase: PHASE.TITLE,
    time: 0,
    timeLeft: CFG.TIME_LIMIT,
    car: {
      x: start.x, y: start.y, angle: start.angle,
      speed: 0, spin: 0, boostT: 0, offTrack: false,
    },
    lap: 1,
    lapStart: 0,
    lapTimes: [],
    bestLap: null,
    progress: 0,
    prevIndex: 0,
    checkpoints: 0,
    crashes: 0,
    boostsHit: 0,
    oilsHit: 0,
    score: 0,
    best: 0,
    // Per-frame events the audio + render layers read, then cleared.
    events: [],
    oilCooldown: 0,
    boostCooldown: 0,
    barrierCooldown: 0,
    message: '',
    messageT: 0,
  };
}

export function startGame(state, seed) {
  const fresh = newState(seed);
  fresh.best = state.best;
  Object.assign(state, fresh);
  state.phase = PHASE.PLAY;
}

function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function pointInBarrier(car, b) {
  // Circle (car) vs rotated rectangle: rotate the car into the barrier's frame.
  const dx = car.x - b.x, dy = car.y - b.y;
  const c = Math.cos(-b.angle), s = Math.sin(-b.angle);
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  const hw = b.w / 2 + 9, hh = b.h / 2 + 9;
  return Math.abs(lx) < hw && Math.abs(ly) < hh;
}

export function step(state, input, dt) {
  if (state.phase !== PHASE.PLAY) return;
  const car = state.car;
  const cfg = CFG.CAR;
  state.time += dt;
  state.timeLeft = Math.max(0, CFG.TIME_LIMIT - state.time);
  state.oilCooldown = Math.max(0, state.oilCooldown - dt);
  state.boostCooldown = Math.max(0, state.boostCooldown - dt);
  state.barrierCooldown = Math.max(0, state.barrierCooldown - dt);
  state.messageT = Math.max(0, state.messageT - dt);
  state.events.length = 0;

  // --- steering & throttle ---
  const spinning = car.spin > 0;
  if (spinning) car.spin = Math.max(0, car.spin - dt);
  const steer = spinning ? 0 : (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const throttle = spinning ? 0 : (input.up ? 1 : 0);
  const brake = spinning ? 0 : (input.down ? 1 : 0);

  // Nearest point on the loop, for on/off-track and progress.
  const near = nearestSample(state.track, car.x, car.y, state.prevIndex);
  car.offTrack = near.dist > CFG.TRACK_HALF;

  // Continuous progress (sample units), only while near the asphalt.
  if (near.dist < CFG.TRACK_HALF + 40) {
    const n = state.track.pts.length;
    let delta = ((near.index - state.prevIndex) % n + n * 1.5) % n - n / 2;
    if (delta < -n / 4) delta = 0; // a jump backwards is a teleport, ignore it
    state.progress += delta;
  }
  state.prevIndex = near.index;

  // Checkpoints then the start line complete a lap.
  const cpEvery = state.track.pts.length / CFG.CHECKPOINTS;
  const cps = Math.floor(state.progress / cpEvery);
  if (cps > state.checkpoints) {
    state.checkpoints = cps;
    if (cps < CFG.CHECKPOINTS) state.events.push('checkpoint');
  }
  if (state.progress >= state.track.pts.length) {
    const lapTime = state.time - state.lapStart;
    state.lapTimes.push(lapTime);
    if (state.bestLap === null || lapTime < state.bestLap) state.bestLap = lapTime;
    state.progress -= state.track.pts.length;
    state.checkpoints = 0;
    state.lap++;
    state.lapStart = state.time;
    state.events.push('lap');
    state.message = `Lap ${Math.min(state.lap, CFG.LAPS)}/${CFG.LAPS}`;
    state.messageT = 1.2;
    if (state.lap > CFG.LAPS) {
      finish(state, true, 'Finished all 3 laps.');
      return;
    }
  }

  // --- speed ---
  const cap = car.boostT > 0 ? cfg.boostSpeed : cfg.maxSpeed;
  if (throttle) car.speed += cfg.accel * dt;
  if (brake) car.speed -= cfg.brake * dt;
  const drag = car.offTrack ? cfg.offTrackDrag : cfg.onTrackDrag;
  car.speed -= Math.sign(car.speed) * drag * dt * Math.min(1, Math.abs(car.speed) / 60 + 0.2);
  if (car.speed > cap) car.speed = Math.max(cap, car.speed - 600 * dt);
  if (car.speed < -cfg.reverseMax) car.speed = -cfg.reverseMax;
  if (Math.abs(car.speed) < 4 && !throttle) car.speed = 0;
  if (car.offTrack && car.speed > cfg.offTrackCap) car.speed = cfg.offTrackCap;
  if (car.boostT > 0) car.boostT = Math.max(0, car.boostT - dt);

  // --- heading & position ---
  const steerAuthority = Math.min(1, Math.abs(car.speed) / 150);
  car.angle += steer * cfg.steer * steerAuthority * Math.sign(car.speed || 1) * dt;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // Keep the car inside the canvas.
  car.x = Math.max(12, Math.min(CFG.W - 12, car.x));
  car.y = Math.max(12, Math.min(CFG.H - 12, car.y));

  // --- boost pads ---
  if (state.boostCooldown === 0) {
    for (const b of state.track.boosts) {
      if (Math.hypot(car.x - b.x, car.y - b.y) < 30) {
        car.boostT = cfg.boostTime;
        car.speed = Math.min(cfg.boostSpeed, car.speed + 130);
        state.boostsHit++;
        state.boostCooldown = 1.0;
        state.events.push('boost');
        state.message = 'BOOST!';
        state.messageT = 0.8;
        break;
      }
    }
  }

  // --- oil slicks: spin the car ---
  if (state.oilCooldown === 0 && !spinning) {
    for (const o of state.track.oils) {
      if (Math.hypot(car.x - o.x, car.y - o.y) < o.r + 8) {
        car.spin = cfg.spinTime;
        car.speed *= 0.45;
        state.oilsHit++;
        state.oilCooldown = 1.2;
        state.events.push('oil');
        state.message = 'Oil slick! Spun out';
        state.messageT = 1.0;
        break;
      }
    }
  }

  // --- barriers: a hard hit at speed is a crash ---
  if (state.barrierCooldown === 0) {
    for (const b of state.track.barriers) {
      if (pointInBarrier(car, b)) {
        state.barrierCooldown = 1.0;
        if (Math.abs(car.speed) > 170) {
          state.crashes++;
          car.spin = cfg.spinTime;
          car.speed *= 0.25;
          state.events.push('crash');
          state.message = `Crash! ${state.crashes}/${CFG.MAX_CRASHES}`;
          state.messageT = 1.2;
          if (state.crashes >= CFG.MAX_CRASHES) {
            finish(state, false, `Too many crashes (${CFG.MAX_CRASHES}).`);
            return;
          }
        } else {
          // A slow nudge: bounce off instead of crashing.
          car.speed = -car.speed * 0.4;
          state.events.push('bump');
        }
        break;
      }
    }
  }

  // --- time out ---
  if (state.timeLeft <= 0) {
    finish(state, false, 'Time ran out.');
  }
}

function finish(state, won, line) {
  const total = state.time;
  const timeBonus = Math.max(0, Math.round((CFG.TIME_LIMIT - total) * CFG.SCORE.timeBonusPerSec));
  state.score = (won ? CFG.LAPS : state.lap - 1) * CFG.SCORE.lap
    + timeBonus - state.crashes * CFG.SCORE.crashPenalty + state.boostsHit * 50;
  state.score = Math.max(0, state.score);
  state.phase = won ? PHASE.VICTORY : PHASE.DEFEAT;
  state.endLine = line;
  state.endStats = `Time ${total.toFixed(2)}s · best lap ${state.bestLap ? state.bestLap.toFixed(2) + 's' : '—'} · crashes ${state.crashes} · boosts ${state.boostsHit}`;
  state.events.push(won ? 'win' : 'lose');
}
