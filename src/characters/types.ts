import type { Phase, Locale } from '../types.js';

export interface BrailleFrame {
  lines: string[];
  effects?: string[];
}

export interface Character {
  name: string;
  displayName: Record<Locale, string>;
  frames: Record<Phase, BrailleFrame[]>;
  compactFrames: Record<Phase, string[]>;
}
