// The circuit: a closed Catmull-Rom loop through control points, sampled
// densely. Progress is a continuous value (sample units) that only advances
// while the car is near the asphalt, so cutting across the infield gains
// nothing. Checkpoints sit every 1/8 of the loop; a lap counts when the
// car has passed all eight and crosses the start line.
import { CFG } from './config.js';

// Control points of the loop (canvas space, clockwise from the top-left).
const PTS = [
  [190, 130], [330, 105], [470, 122], [600, 105], [770, 130],
  [845, 230], [828, 320], [845, 400], [770, 480],
  [600, 500], [520, 458], [420, 518], [330, 500],
  [190, 480], [115, 390], [130, 300], [115, 210],
];

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [
    0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ];
}

export function buildTrack() {
  const n = PTS.length;
  const samples = [];
  const per = Math.max(4, Math.floor(CFG.SAMPLES / n));
  for (let i = 0; i < n; i++) {
    const p0 = PTS[(i - 1 + n) % n], p1 = PTS[i], p2 = PTS[(i + 1) % n], p3 = PTS[(i + 2) % n];
    for (let k = 0; k < per; k++) samples.push(catmull(p0, p1, p2, p3, k / per));
  }
  // Resample to exactly CFG.SAMPLES evenly spaced points.
  const total = samples.length;
  const pts = [];
  for (let i = 0; i < CFG.SAMPLES; i++) {
    pts.push(samples[Math.floor((i * total) / CFG.SAMPLES)]);
  }
  // Heading of the loop at each sample (from the next point).
  const headings = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return Math.atan2(q[1] - p[1], q[0] - p[0]);
  });
  // Cumulative length, for lap-distance readouts.
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1], b = pts[i % pts.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const length = cum[pts.length];

  const at = (frac) => {
    const i = Math.floor(frac * pts.length) % pts.length;
    return { x: pts[i][0], y: pts[i][1], angle: headings[i], index: i };
  };
  // Boost pads: glowing strips across the whole road.
  const boosts = [0.16, 0.44, 0.70].map((f) => ({ ...at(f), len: 26 }));
  // Oil slicks: dark circles, offset to one side of the road.
  const oils = [0.30, 0.57, 0.84].map((f, k) => {
    const s = at(f);
    const side = k % 2 === 0 ? 1 : -1;
    return {
      x: s.x + Math.cos(s.angle + Math.PI / 2) * 20 * side,
      y: s.y + Math.sin(s.angle + Math.PI / 2) * 20 * side,
      r: 17,
    };
  });
  // Barriers: striped blocks covering half the road, alternating sides,
  // so the driver must steer around them.
  const barriers = [0.24, 0.62, 0.90].map((f, k) => {
    const s = at(f);
    const side = k % 2 === 0 ? 1 : -1;
    const nx = Math.cos(s.angle + Math.PI / 2), ny = Math.sin(s.angle + Math.PI / 2);
    return {
      x: s.x + nx * 22 * side, y: s.y + ny * 22 * side,
      w: 30, h: 20, angle: s.angle,
    };
  });

  return { pts, headings, length, boosts, oils, barriers, at };
}

// Nearest sample index to (x, y), searching a window around `hint` first
// (the car moves a little each step) and falling back to a full scan.
export function nearestSample(track, x, y, hint) {
  const n = track.pts.length;
  let best = hint, bestD = Infinity;
  const scan = (i) => {
    const p = track.pts[i];
    const d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y);
    if (d < bestD) { bestD = d; best = i; }
  };
  for (let k = -48; k <= 48; k++) scan(((hint + k) % n + n) % n);
  // If the window found nothing close, the car may have teleported: scan all.
  if (bestD > 120 * 120) {
    for (let i = 0; i < n; i++) scan(i);
  }
  return { index: best, dist: Math.sqrt(bestD) };
}
