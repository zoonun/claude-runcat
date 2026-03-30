import { describe, it, expect } from 'vitest';
import { renderThemePreview } from '../../src/themes/preview.js';
import { getTheme } from '../../src/themes/registry.js';

describe('renderThemePreview', () => {
  it('renders a preview string for default theme', () => {
    const theme = getTheme('default')!;
    const preview = renderThemePreview(theme);
    expect(preview).toContain('[Opus]');
    expect(preview).toContain('45%');
    expect(preview).toContain(theme.bars.fill);
  });

  it('renders a preview string for brainrot theme', () => {
    const theme = getTheme('brainrot')!;
    const preview = renderThemePreview(theme);
    expect(preview).toContain('💀');
    expect(preview).toContain('🗿');
  });

  it('preview contains theme display name', () => {
    const theme = getTheme('dracula')!;
    const preview = renderThemePreview(theme);
    expect(preview).toContain('Dracula');
  });
});
