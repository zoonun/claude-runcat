import { describe, it, expect } from 'vitest';
import type { Theme, ColorValue } from '../../src/themes/types.js';

describe('Theme types', () => {
  it('accepts a valid theme object', () => {
    const theme: Theme = {
      name: 'test', displayName: 'Test Theme', description: 'A test theme',
      lineLayout: 'expanded', showSeparators: false,
      colors: {
        model: 'cyan', project: 'yellow', context: 'green', usage: 'blue',
        warning: 'yellow', usageWarning: 'magenta', critical: 'red',
        git: 'magenta', gitBranch: 'cyan', label: 'dim', custom: 208,
      },
      bars: { fill: '█', empty: '░' },
      icons: { running: '◐', done: '✓', progress: '▸', separator: '│' },
    };
    expect(theme.name).toBe('test');
    expect(theme.colors.model).toBe('cyan');
    expect(theme.bars.fill).toBe('█');
    expect(theme.icons.running).toBe('◐');
  });

  it('accepts hex and numeric color values', () => {
    const hex: ColorValue = '#bd93f9';
    const numeric: ColorValue = 208;
    const named: ColorValue = 'cyan';
    expect(typeof hex).toBe('string');
    expect(typeof numeric).toBe('number');
    expect(typeof named).toBe('string');
  });
});
