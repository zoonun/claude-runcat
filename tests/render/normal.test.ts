import { describe, it, expect } from 'vitest';
import { renderNormal } from '../../src/render/normal.js';
import { resolveTheme } from '../../src/themes/resolve.js';
import type { StdinData, SessionState } from '../../src/types.js';
import type { BrailleFrame } from '../../src/characters/types.js';

const defaultTheme = resolveTheme({});

const mockData: StdinData = {
  model: { id: 'test', display_name: 'Opus' },
  context_window: { total_input_tokens: 0, total_output_tokens: 0, context_window_size: 200000, used_percentage: 78, remaining_percentage: 22, current_usage: null },
  cost: { total_cost_usd: 2.4, total_duration_ms: 900000, total_api_duration_ms: 400000, total_lines_added: 50, total_lines_removed: 10 },
  rate_limits: { five_hour: { used_percentage: 35, resets_at: '' }, seven_day: { used_percentage: 8, resets_at: '' } },
  workspace: { current_dir: '/home/user/my-project', project_dir: '/home/user/my-project' },
};
const mockState: SessionState = { phase: 'heavy', intensity: 0.4, alerts: ['contextWarning'] };
const mockFrame: BrailleFrame = { lines: ['⠀⢀⣴⣧⠀⠀', '⢾⣿⣿⣿⡷⠀', '⠀⠟⠀⠻⠀⠀'], effects: ['📦', '', ''] };
const t = (key: string) => ({ context: 'Context', cost: 'Cost', burnRate: 'Burn' }[key] || key);

describe('renderNormal', () => {
  it('renders >= 2 lines', () => { expect(renderNormal(mockData, mockState, mockFrame, t, defaultTheme).length).toBeGreaterThanOrEqual(2); });
  it('includes model', () => { expect(renderNormal(mockData, mockState, mockFrame, t, defaultTheme).join('\n')).toContain('Opus'); });
  it('includes project name', () => { expect(renderNormal(mockData, mockState, mockFrame, t, defaultTheme).join('\n')).toContain('my-project'); });
  it('includes burn rate', () => { expect(renderNormal(mockData, mockState, mockFrame, t, defaultTheme).join('\n')).toContain('$0.16/m'); });
  it('includes character on left', () => { expect(renderNormal(mockData, mockState, mockFrame, t, defaultTheme)[0]).toContain('⠀⢀⣴⣧⠀⠀'); });
});
