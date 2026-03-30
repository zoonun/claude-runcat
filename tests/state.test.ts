import { describe, it, expect } from 'vitest';
import { determineState } from '../src/state.js';
import type { StdinData, Config } from '../src/types.js';

const defaultThresholds: Config['thresholds'] = { heavyContext: 70, crushedContext: 90, expensiveBurnRate: 0.10, rateLimitWarning: 80 };

function makeInput(overrides: any = {}): StdinData {
  return {
    model: { id: 'test', display_name: 'Test' },
    context_window: { total_input_tokens: 0, total_output_tokens: 0, context_window_size: 200000, used_percentage: 30, remaining_percentage: 70, current_usage: null, ...overrides.context_window },
    cost: { total_cost_usd: 0.5, total_duration_ms: 300000, total_api_duration_ms: 120000, total_lines_added: 0, total_lines_removed: 0, ...overrides.cost },
    rate_limits: { five_hour: { used_percentage: 10, resets_at: '' }, seven_day: { used_percentage: 3, resets_at: '' }, ...overrides.rate_limits },
    workspace: { current_dir: '/test', project_dir: '/test' },
  };
}

describe('determineState', () => {
  it('returns running for normal session', () => {
    const state = determineState(makeInput(), defaultThresholds, false);
    expect(state.phase).toBe('running');
    expect(state.alerts).toEqual([]);
  });
  it('returns rateLimited when 5h rate >= 95%', () => {
    const state = determineState(makeInput({ rate_limits: { five_hour: { used_percentage: 96, resets_at: '' }, seven_day: { used_percentage: 3, resets_at: '' } } }), defaultThresholds, false);
    expect(state.phase).toBe('rateLimited');
    expect(state.intensity).toBe(1.0);
  });
  it('returns crushed when context >= 90%', () => {
    const state = determineState(makeInput({ context_window: { used_percentage: 92 } }), defaultThresholds, false);
    expect(state.phase).toBe('crushed');
    expect(state.alerts).toContain('contextCritical');
  });
  it('returns expensive when burn rate exceeds threshold', () => {
    const state = determineState(makeInput({ cost: { total_cost_usd: 1.5, total_duration_ms: 60000, total_api_duration_ms: 50000 } }), defaultThresholds, false);
    expect(state.phase).toBe('expensive');
    expect(state.alerts).toContain('costSpike');
  });
  it('returns heavy when context >= 70%', () => {
    const state = determineState(makeInput({ context_window: { used_percentage: 75 } }), defaultThresholds, false);
    expect(state.phase).toBe('heavy');
    expect(state.alerts).toContain('contextWarning');
  });
  it('returns idle when flagged as idle', () => {
    const state = determineState(makeInput(), defaultThresholds, true);
    expect(state.phase).toBe('idle');
    expect(state.intensity).toBe(0);
  });
  it('rateLimited takes priority over crushed', () => {
    const state = determineState(makeInput({ context_window: { used_percentage: 95 }, rate_limits: { five_hour: { used_percentage: 96, resets_at: '' }, seven_day: { used_percentage: 3, resets_at: '' } } }), defaultThresholds, false);
    expect(state.phase).toBe('rateLimited');
  });
  it('adds rateLimitApproaching alert at 80%', () => {
    const state = determineState(makeInput({ rate_limits: { five_hour: { used_percentage: 82, resets_at: '' }, seven_day: { used_percentage: 3, resets_at: '' } } }), defaultThresholds, false);
    expect(state.alerts).toContain('rateLimitApproaching');
  });
  it('intensity scales with context for running phase', () => {
    const low = determineState(makeInput({ context_window: { used_percentage: 10 } }), defaultThresholds, false);
    const high = determineState(makeInput({ context_window: { used_percentage: 60 } }), defaultThresholds, false);
    expect(high.intensity).toBeGreaterThan(low.intensity);
  });
});
