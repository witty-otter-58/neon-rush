// Neon Rush entrypoint (Node 22, standard library only).
//
// The game itself is plain static files under game/ — index.html and its ES
// modules, no libraries, no network requests — so any desktop browser plays
// it straight off disk. This program only hands the game in: it copies
// game/ and screenshots/ from beside this file into the output directory
// and writes dossier.json, the summary the judge reads, with the vendored
// make.fun library. The grader runs it twice and the two runs must write
// identical bytes, so it performs no I/O beyond those copies and the one
// dossier write, and reads nothing that changes between runs.
//
// Try it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's caps (reference/gate.json): text_max_bytes is the only cap
// that shapes the dossier. The rest refuse an entry the scorer would
// refuse anyway — more than 4 screenshots, one over 256 KiB, more than 993
// game files or 48 MiB of game files in all, or a game path over 1000 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
