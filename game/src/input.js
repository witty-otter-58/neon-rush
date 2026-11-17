// Keyboard / mouse input, plus the autopilot that plays by the real rules
// (used by the ?shot= screenshots and by the local play-through test).
import { CFG } from './config.js';
import { nearestSample } from './track.js';

export function createInput(canvas) {
  const input = {
    up: false, down: false, left: false, right: false,
    mouseX: CFG.W / 2, mouseY: CFG.H / 2,
    onKey: null,
  };
  const keys = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  window.addEventListener('keydown', (e) => {
    if (keys[e.code] !== undefined) { input[keys[e.code]] = true; e.preventDefault(); }
    if (input.onKey) input.onKey(e.code);
  });
  window.addEventListener('keyup', (e) => {
    if (keys[e.code] !== undefined) input[keys[e.code]] = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = (e.clientX - r.left) * (CFG.W / r.width);
    input.mouseY = (e.clientY - r.top) * (CFG.H / r.height);
  });
  return input;
}

function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Drive the car toward a point ~30 samples ahead on the loop, braking for
// sharp bends and steering around barriers in the way.
export function autopilot(state, input) {
  const car = state.car;
  const track = state.track;
  const n = track.pts.length;
  const near = nearestSample(track, car.x, car.y, state.prevIndex);
  const look = 30;
  let target = track.pts[(near.index + look) % n];

  // If a barrier sits near the racing line ahead, aim to the far side of it.
  for (const b of track.barriers) {
    const d = Math.hypot(b.x - car.x, b.y - car.y);
    if (d < 110) {
      const ahead = (b.x - car.x) * Math.cos(car.angle) + (b.y - car.y) * Math.sin(car.angle);
      if (ahead > 0) {
        const side = Math.sign((b.x - car.x) * Math.sin(car.angle) - (b.y - car.y) * Math.cos(car.angle)) || 1;
        const tx = target[0] - Math.sin(car.angle) * 46 * side;
        const ty = target[1] + Math.cos(car.angle) * 46 * side;
        target = [tx, ty];
        break;
      }
    }
  }

  const want = Math.atan2(target[1] - car.y, target[0] - car.x);
  const diff = normAngle(want - car.angle);
  input.left = diff < -0.08;
  input.right = diff > 0.08;
  // Brake for a hard turn at speed; otherwise full throttle.
  const sharp = Math.abs(diff) > 0.55 && Math.abs(car.speed) > 190;
  input.up = !sharp;
  input.down = sharp;
}
