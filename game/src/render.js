// Canvas drawing: neon circuit, car, pads, oil, barriers, messages.
import { CFG } from './config.js';

function traceLoop(ctx, pts, close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

function drawTrack(ctx, state) {
  const track = state.track;
  const C = CFG.COLORS;
  // Asphalt: a thick stroke of the loop.
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.asphalt;
  ctx.lineWidth = CFG.TRACK_HALF * 2;
  traceLoop(ctx, track.pts);
  ctx.stroke();
  // Neon outer and inner edges.
  ctx.strokeStyle = C.edge;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  traceLoop(ctx, track.pts);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Centre dashes.
  ctx.strokeStyle = C.center;
  ctx.setLineDash([18, 26]);
  ctx.lineWidth = 3;
  traceLoop(ctx, track.pts);
  ctx.stroke();
  ctx.setLineDash([]);

  // Start / finish line: checkers across the road at sample 0.
  const s0 = track.at(0);
  ctx.save();
  ctx.translate(s0.x, s0.y);
  ctx.rotate(s0.angle);
  const half = CFG.TRACK_HALF;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? '#f5f5f5' : '#11131f';
      ctx.fillRect(-4 + j * 8, -half + i * (half * 2 / 8), 8, half * 2 / 8);
    }
  }
  ctx.restore();

  // Boost pads: glowing cyan strips across the road.
  for (const b of track.boosts) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = C.boost;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-13, -CFG.TRACK_HALF, 26, CFG.TRACK_HALF * 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e8fbff';
    ctx.fillRect(-4, -CFG.TRACK_HALF, 8, CFG.TRACK_HALF * 2);
    ctx.restore();
  }

  // Oil slicks: dark purple discs with a sheen.
  for (const o of track.oils) {
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fillStyle = C.oil;
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(o.x - 5, o.y - 5, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#b678ff';
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Barriers: orange striped blocks.
  for (const b of track.barriers) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = C.barrier;
    ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.fillStyle = '#1a1204';
    for (let i = -1; i <= 1; i++) ctx.fillRect(i * 10 - 3, -b.h / 2, 6, b.h);
    ctx.restore();
  }
}

function drawCar(ctx, state) {
  const car = state.car;
  const C = CFG.COLORS;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Glow.
  ctx.shadowColor = car.boostT > 0 ? '#39e6ff' : C.carGlow;
  ctx.shadowBlur = car.boostT > 0 ? 22 : 12;
  // Body: a wedge with a cockpit.
  ctx.fillStyle = car.boostT > 0 ? '#7df3ff' : C.car;
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(-10, -8);
  ctx.lineTo(-13, -4);
  ctx.lineTo(-13, 4);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0b0e22';
  ctx.beginPath();
  ctx.arc(2, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  // Headlights.
  ctx.fillStyle = '#fff7c0';
  ctx.fillRect(12, -6, 4, 3);
  ctx.fillRect(12, 3, 4, 3);
  ctx.restore();

  // Off-track dust.
  if (car.offTrack && Math.abs(car.speed) > 60) {
    ctx.fillStyle = 'rgba(139,147,184,0.5)';
    ctx.beginPath();
    ctx.arc(car.x - Math.cos(car.angle) * 14, car.y - Math.sin(car.angle) * 14, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function render(ctx, state) {
  const C = CFG.COLORS;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CFG.W, CFG.H);
  // Faint grid.
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= CFG.W; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CFG.H); ctx.stroke();
  }
  for (let y = 0; y <= CFG.H; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CFG.W, y); ctx.stroke();
  }
  // A few stars.
  ctx.fillStyle = '#2a2f52';
  const stars = [[60, 60], [900, 40], [60, 560], [920, 540], [480, 30], [480, 570], [30, 300], [930, 300]];
  for (const [x, y] of stars) { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); }

  drawTrack(ctx, state);
  drawCar(ctx, state);

  // Floating message (BOOST! / lap / crash).
  if (state.messageT > 0 && state.message) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.messageT);
    ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#39e6ff';
    ctx.shadowBlur = 16;
    ctx.fillText(state.message, CFG.W / 2, 84);
    ctx.restore();
  }

  // Spun-out flash.
  if (state.car.spin > 0) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ff4fd8';
    ctx.fillRect(0, 0, CFG.W, CFG.H);
    ctx.restore();
  }
}
