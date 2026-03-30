import type { Theme } from './types.js';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// In source: __dirname = src/themes/, builtin at src/themes/builtin/
// In bundle: __dirname = dist/, builtin copied to dist/themes/builtin/
const BUILTIN_DIR = __dirname.endsWith('themes')
  ? path.join(__dirname, 'builtin')
  : path.join(__dirname, 'themes', 'builtin');

function loadJsonTheme(filePath: string): Theme | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as Theme;
  } catch {
    return null;
  }
}

const builtinThemes: Theme[] = readdirSync(BUILTIN_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => loadJsonTheme(path.join(BUILTIN_DIR, f)))
  .filter((t): t is Theme => t !== null);

let customThemes: Theme[] = [];

export function loadCustomThemes(dir: string): void {
  try {
    customThemes = readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => loadJsonTheme(path.join(dir, f)))
      .filter((t): t is Theme => t !== null);
  } catch {
    customThemes = [];
  }
}

export function listThemes(): string[] {
  return [...builtinThemes, ...customThemes].map(t => t.name);
}

export function getTheme(name: string): Theme | null {
  return [...builtinThemes, ...customThemes].find(t => t.name === name) ?? null;
}

export function getAllThemes(): Theme[] {
  return [...builtinThemes, ...customThemes];
}
