import { describe, it, expect } from 'vitest';
import { loadConfig, DEFAULT_CONFIG } from '../src/config.js';

describe('loadConfig', () => {
  it('returns defaults when config file does not exist', () => {
    expect(loadConfig('/nonexistent/path/config.json')).toEqual(DEFAULT_CONFIG);
  });
  it('merges partial config with defaults', () => {
    const config = loadConfig('/nonexistent/path', { displayMode: 'detailed', character: 'robot' });
    expect(config.displayMode).toBe('detailed');
    expect(config.character).toBe('robot');
    expect(config.locale).toBe('auto');
    expect(config.thresholds.heavyContext).toBe(70);
  });
  it('validates thresholds stay within bounds', () => {
    const config = loadConfig('/nonexistent/path', { thresholds: { heavyContext: 150, crushedContext: -10 } });
    expect(config.thresholds.heavyContext).toBe(100);
    expect(config.thresholds.crushedContext).toBe(0);
  });
});
