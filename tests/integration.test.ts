import { describe, it, expect } from 'vitest';
import { run } from '../src/index.js';

const validInput = JSON.stringify({
  model: { id: 'claude-opus-4-6', display_name: 'Opus 4.6' },
  context_window: { total_input_tokens: 42000, total_output_tokens: 8000, context_window_size: 200000, used_percentage: 45, remaining_percentage: 55,
    current_usage: { input_tokens: 42000, output_tokens: 8000, cache_creation_input_tokens: 5000, cache_read_input_tokens: 38000 } },
  cost: { total_cost_usd: 1.23, total_duration_ms: 300000, total_api_duration_ms: 120000, total_lines_added: 50, total_lines_removed: 10 },
  rate_limits: { five_hour: { used_percentage: 12, resets_at: '' }, seven_day: { used_percentage: 3, resets_at: '' } },
  workspace: { current_dir: '/home/user/my-project', project_dir: '/home/user/my-project' },
});

describe('integration', () => {
  it('compact mode output', () => { const out = run(validInput, { displayMode: 'compact' }); expect(out).toContain('Opus 4.6'); expect(out).toContain('45%'); });
  it('normal mode output', () => { const out = run(validInput, { displayMode: 'normal' }); expect(out).toContain('Opus 4.6'); expect(out).toContain('my-project'); });
  it('detailed mode output', () => { const out = run(validInput, { displayMode: 'detailed' }); expect(out).toContain('Opus 4.6'); expect(out).toContain('In:42K'); });
  it('handles empty input', () => { expect(run('', { displayMode: 'compact' }).length).toBeGreaterThan(0); });
  it('handles malformed JSON', () => { expect(run('not json', { displayMode: 'compact' }).length).toBeGreaterThan(0); });
});
