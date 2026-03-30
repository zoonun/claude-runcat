import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Character } from './types.js';

export function loadCharacterFromFile(filePath: string): Character | null {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Character; } catch { return null; }
}

export function loadCustomCharacters(dirPath: string): Character[] {
  const resolved = dirPath.replace(/^~/, process.env.HOME || '');
  try {
    return fs.readdirSync(resolved).filter(f => f.endsWith('.json'))
      .map(f => loadCharacterFromFile(path.join(resolved, f)))
      .filter((c): c is Character => c !== null);
  } catch { return []; }
}
