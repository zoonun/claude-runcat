import { parseStdin } from './parser.js';
import { loadConfig } from './config.js';
import { determineState } from './state.js';
import { isIdle, isIdleFromData } from './idle-cache.js';
import { selectFrame } from './animation.js';
import { getCharacter, initCustomCharacters } from './characters/registry.js';
import { detectLocale, createTranslator } from './i18n/index.js';
import { render } from './render/index.js';
import { resolveTheme } from './themes/resolve.js';
import { loadCustomThemes } from './themes/registry.js';
import type { Config } from './types.js';
import type { Phase } from './types.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const CONFIG_PATH = path.join(os.homedir(), '.claude-runcat', 'config.json');
const IDLE_CACHE_PATH = path.join(os.tmpdir(), 'claude-runcat-idle-cache');

export function run(stdinRaw: string, overrides?: Partial<Config>): string {
  const config = loadConfig(CONFIG_PATH, overrides);
  const data = parseStdin(stdinRaw);
  const idleByCache = isIdle(data.cost.total_api_duration_ms, IDLE_CACHE_PATH, config.animation.idleTimeoutMs);
  const idleByData = isIdleFromData(data.cost.total_duration_ms, data.cost.total_api_duration_ms, config.animation.idleTimeoutMs);
  const idle = idleByCache || idleByData;
  const state = determineState(data, config.thresholds, idle);
  initCustomCharacters(config.customCharactersDir);
  const character = getCharacter(config.character) || getCharacter('cat')!;
  const locale = detectLocale(config.locale);
  const t = createTranslator(locale);
  const frame = config.animation.enabled ? selectFrame(character, state.phase, state.intensity, config.displayMode, config.animation.speedMultiplier) : { lines: [''] };
  loadCustomThemes(path.join(os.homedir(), '.claude-runcat', 'themes'));
  const theme = resolveTheme({
    theme: config.theme,
    colors: config.colors,
    bars: config.bars,
    icons: config.icons,
    lineLayout: config.lineLayout,
    showSeparators: config.showSeparators,
  });
  return render(config.displayMode, data, state, frame, t, theme).join('\n');
}

async function convertCommand(args: string[]) {
  const spritePath = args[0];
  const nameIdx = args.indexOf('--name');
  const name = nameIdx >= 0 ? args[nameIdx + 1] : path.basename(spritePath || '');
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx >= 0 ? args[outputIdx + 1] : path.join(os.homedir(), '.claude-runcat', 'characters', `${name}.json`);
  if (!spritePath) { console.error('Usage: claude-runcat convert <sprite-folder> [--name <name>] [--output <path>]'); process.exit(1); }
  const { imageToBraille } = await import('./characters/converter.js');
  const phases: Phase[] = ['running', 'idle', 'heavy', 'crushed', 'expensive', 'rateLimited'];
  const frames: Record<string, any[]> = {};
  const compactFrames: Record<string, string[]> = {};
  for (const phase of phases) {
    frames[phase] = []; compactFrames[phase] = [];
    let i = 0;
    while (true) {
      const file = path.join(spritePath, `${phase}-${i}.png`);
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
  if (!frames.running?.length) { console.error('Error: No running-*.png sprites found in', spritePath); process.exit(1); }
  const character = { name, displayName: { en: name, ko: name, ja: name, zh: name }, frames, compactFrames };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(character, null, 2));
  console.log(`Character "${name}" saved to ${outputPath}`);
}

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) { chunks.push(chunk); }
  process.stdout.write(run(Buffer.concat(chunks).toString('utf-8')) + '\n');
}

const isDirectRun = process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('claude-runcat');
if (isDirectRun) {
  if (process.argv[2] === 'convert') {
    convertCommand(process.argv.slice(3)).catch(err => { process.stderr.write(`claude-runcat convert error: ${err.message}\n`); process.exit(1); });
  } else {
    main().catch(err => { process.stderr.write(`claude-runcat error: ${err.message}\n`); process.exit(1); });
  }
}
