import { describe, it, expect } from 'vitest';
import { resolveTheme } from '../../src/themes/resolve.js';

describe('resolveTheme', () => {
  it('returns default theme when no theme specified', () => {
    const resolved = resolveTheme({});
    expect(resolved.name).toBe('default');
    expect(resolved.colors.model).toBe('cyan');
    expect(resolved.bars.fill).toBe('█');
  });

  it('returns named theme', () => {
    const resolved = resolveTheme({ theme: 'dracula' });
    expect(resolved.name).toBe('dracula');
    expect(resolved.colors.model).toBe('#bd93f9');
  });

  it('overrides theme colors with config', () => {
    const resolved = resolveTheme({
      theme: 'dracula',
      colors: { model: '#FF0000' },
    });
    expect(resolved.colors.model).toBe('#FF0000');
    expect(resolved.colors.project).toBe('#f1fa8c');
  });

  it('overrides theme bars with config', () => {
    const resolved = resolveTheme({
      theme: 'default',
      bars: { fill: '━' },
    });
    expect(resolved.bars.fill).toBe('━');
    expect(resolved.bars.empty).toBe('░');
  });

  it('overrides theme icons with config', () => {
    const resolved = resolveTheme({
      theme: 'default',
      icons: { running: '⟳' },
    });
    expect(resolved.icons.running).toBe('⟳');
    expect(resolved.icons.done).toBe('✓');
  });

  it('overrides layout from config', () => {
    const resolved = resolveTheme({ theme: 'dracula', lineLayout: 'compact' });
    expect(resolved.lineLayout).toBe('compact');
  });

  it('falls back to default for unknown theme', () => {
    const resolved = resolveTheme({ theme: 'nonexistent' });
    expect(resolved.name).toBe('default');
  });
});
