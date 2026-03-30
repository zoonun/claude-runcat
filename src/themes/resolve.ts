import type { ResolvedTheme, ThemeColors, ThemeBars, ThemeIcons } from './types.js';
import { getTheme } from './registry.js';

export interface ThemeOverrides {
  theme?: string;
  colors?: Partial<ThemeColors>;
  bars?: Partial<ThemeBars>;
  icons?: Partial<ThemeIcons>;
  lineLayout?: 'expanded' | 'compact';
  showSeparators?: boolean;
}

export function resolveTheme(overrides: ThemeOverrides): ResolvedTheme {
  const base = getTheme(overrides.theme ?? 'default') ?? getTheme('default')!;
  return {
    ...base,
    colors: { ...base.colors, ...overrides.colors },
    bars: { ...base.bars, ...overrides.bars },
    icons: { ...base.icons, ...overrides.icons },
    lineLayout: overrides.lineLayout ?? base.lineLayout,
    showSeparators: overrides.showSeparators ?? base.showSeparators,
  };
}
