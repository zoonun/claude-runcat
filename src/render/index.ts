import type { StdinData, SessionState, DisplayMode } from '../types.js';
import type { BrailleFrame } from '../characters/types.js';
import type { ResolvedTheme } from '../themes/types.js';
import { renderCompact } from './compact.js';
import { renderNormal } from './normal.js';
import { renderDetailed } from './detailed.js';

export function render(mode: DisplayMode, data: StdinData, state: SessionState, frame: BrailleFrame, t: (key: string) => string, theme: ResolvedTheme): string[] {
  switch (mode) {
    case 'compact': return renderCompact(data, state, frame, t, theme);
    case 'normal': return renderNormal(data, state, frame, t, theme);
    case 'detailed': return renderDetailed(data, state, frame, t, theme);
  }
}
