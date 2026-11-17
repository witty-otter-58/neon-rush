# Neon Rush

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/witty-otter-58/neon-rush/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/witty-otter-58/neon-rush/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Neon Rush is a top-down racing game: 3 laps around a neon circuit against
a 75-second clock. Steer with the arrow keys or WASD, hit the cyan boost
pads for speed, and dodge the orange barriers and purple oil slicks — a
hard crash spins you out, and 5 crashes end the race. Best lap and best
score are kept between runs.

Open `game/index.html` in a desktop browser — it plays fully offline, no
network requests, no build step. Sound is synthesized with WebAudio, and
the engine hum follows your speed.

## How to play

- **Steer** left / right or A / D, **throttle** up or W, **brake** down or S
- **P** pause, **M** mute, **R** restart

## Files

- `game/index.html` — page, HUD and overlays
- `game/src/config.js` — every tuning number
- `game/src/random.js` — seeded RNG
- `game/src/track.js` — the circuit loop, checkpoints, pads, oil, barriers
- `game/src/world.js` — state, arcade physics, laps, collisions, win/lose
- `game/src/input.js` — keyboard/mouse and the screenshot autopilot
- `game/src/render.js` — canvas drawing
- `game/src/audio.js` — synthesized sound effects and engine hum
- `game/src/shots.js` — `?shot=` staging (title/play/victory/defeat)
- `game/src/main.js` — shell, loop, HUD, overlays
