import type { StdinData } from './types.js';

const DEFAULT_STDIN: StdinData = {
  model: { id: '', display_name: '' },
  context_window: { total_input_tokens: 0, total_output_tokens: 0, context_window_size: 200000, used_percentage: 0, remaining_percentage: 100, current_usage: null },
  cost: { total_cost_usd: 0, total_duration_ms: 0, total_api_duration_ms: 0, total_lines_added: 0, total_lines_removed: 0 },
  rate_limits: { five_hour: { used_percentage: 0, resets_at: '' }, seven_day: { used_percentage: 0, resets_at: '' } },
  workspace: { current_dir: '', project_dir: '' },
};

function deepMergeDefaults(defaults: any, input: any): any {
  if (input === null || input === undefined || typeof input !== 'object') { return input ?? defaults; }
  if (typeof defaults !== 'object' || defaults === null) { return input; }
  const result: any = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (key in input) {
      if (input[key] === null) { result[key] = null; }
      else { result[key] = deepMergeDefaults(defaults[key], input[key]); }
    }
  }
  for (const key of Object.keys(input)) {
    if (!(key in defaults)) { result[key] = input[key]; }
  }
  return result;
}

export function parseStdin(raw: string): StdinData {
  let parsed: any;
  try { parsed = JSON.parse(raw || '{}'); } catch { parsed = {}; }
  return deepMergeDefaults(DEFAULT_STDIN, parsed);
}
