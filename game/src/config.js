// Neon Rush — every tuning number lives here.
export const CFG = {
  W: 960,
  H: 600,
  LAPS: 3,
  TIME_LIMIT: 75,
  MAX_CRASHES: 5,
  // Track: a closed loop, 44 px half-width of asphalt.
  TRACK_HALF: 44,
  SAMPLES: 480,
  CHECKPOINTS: 8,
  CAR: {
    w: 26, h: 14,
    accel: 300, brake: 480, reverseMax: 140,
    maxSpeed: 310, boostSpeed: 500, boostTime: 1.1,
    onTrackDrag: 55, offTrackDrag: 300,
    offTrackCap: 150,
    steer: 2.9, spinTime: 0.8,
  },
  // Score: laps + time bonus - crash penalty.
  SCORE: { lap: 1000, timeBonusPerSec: 25, crashPenalty: 100 },
  COLORS: {
    bg: '#05060f', grid: '#0d1024',
    asphalt: '#171a2e', edge: '#39e6ff', center: '#2a2f52',
    start: '#f5f5f5', boost: '#39e6ff', oil: '#7a2fd0',
    barrier: '#ff9f1c', car: '#ff4fd8', carGlow: '#ff4fd8',
    text: '#dfe6ff', dim: '#8b93b8', amber: '#ffb347',
  },
};
