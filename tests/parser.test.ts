import { describe, it, expect } from 'vitest';
import { parseStdin } from '../src/parser.js';

const validInput = JSON.stringify({
  model: { id: 'claude-opus-4-6', display_name: 'Opus 4.6' },
  context_window: { total_input_tokens: 5000, total_output_tokens: 1000, context_window_size: 200000, used_percentage: 45.5, remaining_percentage: 54.5, current_usage: { input_tokens: 500, output_tokens: 100, cache_creation_input_tokens: 200, cache_read_input_tokens: 300 } },
  cost: { total_cost_usd: 1.23, total_duration_ms: 300000, total_api_duration_ms: 120000, total_lines_added: 50, total_lines_removed: 10 },
  rate_limits: { five_hour: { used_percentage: 12, resets_at: '2026-03-25T22:00:00Z' }, seven_day: { used_percentage: 3, resets_at: '2026-03-31T00:00:00Z' } },
  workspace: { current_dir: '/home/user/project', project_dir: '/home/user/project' },
});

describe('parseStdin', () => {
  it('parses valid JSON input', () => {
    const result = parseStdin(validInput);
    expect(result.model.display_name).toBe('Opus 4.6');
    expect(result.context_window.used_percentage).toBe(45.5);
    expect(result.cost.total_cost_usd).toBe(1.23);
  });
  it('applies defaults for missing fields', () => {
    const result = parseStdin('{}');
    expect(result.model.display_name).toBe('');
    expect(result.context_window.used_percentage).toBe(0);
    expect(result.cost.total_cost_usd).toBe(0);
    expect(result.rate_limits.five_hour.used_percentage).toBe(0);
  });
  it('handles null current_usage', () => {
    const result = parseStdin(JSON.stringify({ context_window: { current_usage: null } }));
    expect(result.context_window.current_usage).toBeNull();
  });
  it('handles malformed JSON gracefully', () => {
    const result = parseStdin('not json');
    expect(result.model.display_name).toBe('');
    expect(result.context_window.used_percentage).toBe(0);
  });
  it('handles empty string', () => {
    const result = parseStdin('');
    expect(result.model.display_name).toBe('');
  });
});
