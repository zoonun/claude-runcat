import type { Character } from './types.js';
import { loadCustomCharacters, loadCharacterFromFile } from './loader.js';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { readFileSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catData = JSON.parse(
  readFileSync(path.join(__dirname, 'builtin', 'generated', 'cat.json'), 'utf-8')
) as Character;

const builtinCharacters: Character[] = [catData];
let customCharacters: Character[] = [];

export function initCustomCharacters(customDir: string): void { customCharacters = loadCustomCharacters(customDir); }
export function listCharacters(): string[] { return [...builtinCharacters, ...customCharacters].map(c => c.name); }
export function getCharacter(name: string): Character | null { return [...builtinCharacters, ...customCharacters].find(c => c.name === name) ?? null; }
