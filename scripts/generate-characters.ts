import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageToBraille } from '../src/characters/converter.js';
import type { BrailleFrame } from '../src/characters/types.js';
import type { Phase } from '../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPRITES_DIR = path.join(__dirname, '..', 'src', 'characters', 'builtin', 'sprites');
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'characters', 'builtin', 'generated');
const PHASES: Phase[] = ['running', 'idle', 'heavy', 'crushed', 'expensive', 'rateLimited'];

async function generateCharacter(name: string, displayName: Record<string, string>): Promise<void> {
  const spriteDir = path.join(SPRITES_DIR, name);
  if (!fs.existsSync(spriteDir)) { console.log(`  Skipping ${name}: no sprites directory`); return; }
  const frames: Record<string, BrailleFrame[]> = {};
  const compactFrames: Record<string, string[]> = {};
  for (const phase of PHASES) {
    frames[phase] = []; compactFrames[phase] = [];
    let i = 0;
    while (true) {
      const file = path.join(spriteDir, `${phase}-${i}.png`);
      if (!fs.existsSync(file)) break;
      const braille = await imageToBraille(fs.readFileSync(file));
      const lines = braille.split('\n');
      frames[phase].push({ lines });
      // Pick the most distinctive trimmed line for compact mode
      let bestLine = '⠀';
      let bestScore = -1;
      for (const line of lines) {
        const trimmed = line.replace(/^⠀+|⠀+$/g, '').trim();
        const unique = new Set([...trimmed].filter(c => c !== '⠀')).size;
        const score = unique * trimmed.length;
        if (score > bestScore) { bestScore = score; bestLine = trimmed; }
      }
      compactFrames[phase].push(bestLine || '⠀');
      i++;
    }
    if (frames[phase].length === 0 && phase !== 'running') { frames[phase] = frames.running || []; compactFrames[phase] = compactFrames.running || []; }
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `${name}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ name, displayName, frames, compactFrames }, null, 2));
  console.log(`  Generated ${outPath}`);
}

async function main() {
  console.log('Generating character data from sprites...');
  await generateCharacter('cat', { en: 'Cat', ko: '고양이', ja: '猫', zh: '猫' });
  console.log('Done!');
}
main().catch(console.error);
