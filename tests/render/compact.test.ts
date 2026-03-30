import { describe, it, expect } from 'vitest';
import { renderCompact } from '../../src/render/compact.js';
import { resolveTheme } from '../../src/themes/resolve.js';
import type { StdinData, SessionState } from '../../src/types.js';
import type { BrailleFrame } from '../../src/characters/types.js';

const defaultTheme = resolveTheme({});

const mockData: StdinData = {
  model: { id: 'test', display_name: 'Opus' },
  context_window: { total_input_tokens: 0, total_output_tokens: 0, context_window_size: 200000, used_percentage: 45, remaining_percentage: 55, current_usage: null },
  cost: { total_cost_usd: 1.2, total_duration_ms: 300000, total_api_duration_ms: 120000, total_lines_added: 0, total_lines_removed: 0 },
  rate_limits: { five_hour: { used_percentage: 12, resets_at: '' }, seven_day: { used_percentage: 3, resets_at: '' } },
  workspace: { current_dir: '/test', project_dir: '/test' },
};
const mockState: SessionState = { phase: 'running', intensity: 0.5, alerts: [] };
const mockFrame: BrailleFrame = { lines: ['🐱'] };
const t = (key: string) => key === 'context' ? 'Context' : key;

describe('renderCompact', () => {
  it('renders single line', () => { const lines = renderCompact(mockData, mockState, mockFrame, t, defaultTheme); expect(lines).toHaveLength(1); expect(lines[0]).toContain('Opus'); expect(lines[0]).toContain('🟢'); expect(lines[0]).toContain('45%'); expect(lines[0]).toContain('$1.20'); });
  it('includes character', () => { expect(renderCompact(mockData, mockState, mockFrame, t, defaultTheme)[0]).toContain('🐱'); });
  it('shows rate limit warning', () => { const lines = renderCompact(mockData, { ...mockState, alerts: ['rateLimitApproaching'] }, mockFrame, t, defaultTheme); expect(lines[0]).toContain('⚠️'); });
});
