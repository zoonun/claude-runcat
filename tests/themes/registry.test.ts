import { describe, it, expect } from 'vitest';
import { getTheme, listThemes, loadCustomThemes } from '../../src/themes/registry.js';

describe('Theme registry', () => {
  it('lists all builtin themes', () => {
    const names = listThemes();
    expect(names).toContain('default');
    expect(names).toContain('dracula');
    expect(names).toContain('nord');
    expect(names).toContain('brainrot');
    expect(names.length).toBe(11);
  });

  it('returns default theme by name', () => {
    const theme = getTheme('default');
    expect(theme).not.toBeNull();
    expect(theme!.name).toBe('default');
    expect(theme!.colors.model).toBeDefined();
    expect(theme!.bars.fill).toBeDefined();
    expect(theme!.icons.running).toBeDefined();
  });

  it('returns null for unknown theme', () => {
    expect(getTheme('nonexistent')).toBeNull();
  });

  it('loads custom themes from directory', () => {
    const before = listThemes().length;
    loadCustomThemes('/tmp/nonexistent-dir');
    expect(listThemes().length).toBe(before);
  });
});
