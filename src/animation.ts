import type { Phase, DisplayMode } from './types.js';
import type { Character, BrailleFrame } from './characters/types.js';

export function getFrameDuration(phase: Phase, intensity: number, speedMultiplier: number = 1.0): number {
  let base: number;
  switch (phase) {
    case 'idle': base = 3000; break;
    case 'rateLimited': base = 1000; break;
    case 'heavy': base = 500; break;
    case 'crushed': base = 600; break;
    case 'expensive':
    case 'running': base = 500 - intensity * 350; break;
  }
  return Math.max(50, Math.round(base / speedMultiplier));
}

export function selectFrame(character: Character, phase: Phase, intensity: number, mode: DisplayMode, speedMultiplier: number = 1.0): BrailleFrame {
  if (mode === 'compact') {
    const frames = character.compactFrames[phase];
    const pool = frames && frames.length > 0 ? frames : character.compactFrames.running;
    const index = Math.floor(Date.now() / getFrameDuration(phase, intensity, speedMultiplier)) % pool.length;
    return { lines: [pool[index]] };
  }
  const frames = character.frames[phase];
  const pool = frames && frames.length > 0 ? frames : character.frames.running;
  const index = Math.floor(Date.now() / getFrameDuration(phase, intensity, speedMultiplier)) % pool.length;
  return pool[index];
}
