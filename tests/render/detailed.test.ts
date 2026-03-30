import { describe, it, expect } from 'vitest';
import { renderDetailed } from '../../src/render/detailed.js';
import { resolveTheme } from '../../src/themes/resolve.js';
import type { StdinData, SessionState } from '../../src/types.js';
import type { BrailleFrame } from '../../src/characters/types.js';

const defaultTheme = resolveTheme({});

const mockData: StdinData = {
  model: { id: 'claude-opus-4-6', display_name: 'Opus 4.6' },
  context_window: { total_input_tokens: 42000, total_output_tokens: 8000, context_window_size: 200000, used_percentage: 78, remaining_percentage: 22,
    current_usage: { input_tokens: 42000, output_tokens: 8000, cache_creation_input_tokens: 5000, cache_read_input_tokens: 38000 } },
  cost: { total_cost_usd: 2.4, total_duration_ms: 932000, total_api_duration_ms: 400000, total_lines_added: 150, total_lines_removed: 30 },
  rate_limits: { five_hour: { used_percentage: 35, resets_at: '' }, seven_day: { used_percentage: 8, resets_at: '' } },
  workspace: { current_dir: '/home/user/my-project', project_dir: '/home/user/my-project' },
};
const mockState: SessionState = { phase: 'heavy', intensity: 0.4, alerts: ['contextWarning'] };
const mockFrame: BrailleFrame = { lines: ['⠀⢀⣴⣧⠀⠀', '⢾⣿⣿⣿⡷⠀', '⠀⠟⠀⠻⠀⠀'] };
const t = (key: string) => ({ context: 'Context', cost: 'Cost', burnRate: 'Burn', depletion: 'Depletion', budget: 'Budget' }[key] || key);

describe('renderDetailed', () => {
  it('renders 6 lines', () => { expect(renderDetailed(mockData, mockState, mockFrame, t, defaultTheme)).toHaveLength(6); });
  it('rows 1-3 have character', () => { const lines = renderDetailed(mockData, mockState, mockFrame, t, defaultTheme); expect(lines[0]).toContain('⠀⢀⣴⣧⠀⠀'); expect(lines[1]).toContain('⢾⣿⣿⣿⡷⠀'); expect(lines[2]).toContain('⠀⠟⠀⠻⠀⠀'); });
  it('rows 4-6 full width', () => { expect(renderDetailed(mockData, mockState, mockFrame, t, defaultTheme)[3]).not.toMatch(/^⠀/); });
  it('includes token breakdown', () => { const all = renderDetailed(mockData, mockState, mockFrame, t, defaultTheme).join('\n'); expect(all).toContain('In:42K'); expect(all).toContain('Out:8K'); });
  it('includes rate limits', () => { const all = renderDetailed(mockData, mockState, mockFrame, t, defaultTheme).join('\n'); expect(all).toContain('5h:35%'); expect(all).toContain('7d:8%'); });
});
