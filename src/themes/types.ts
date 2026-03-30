export type NamedColor = 'dim' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray';

/** A color value: named preset, 256-color index (0-255), or hex (#RRGGBB) */
export type ColorValue = NamedColor | number | string;

export interface ThemeColors {
  model: ColorValue;
  project: ColorValue;
  context: ColorValue;
  usage: ColorValue;
  warning: ColorValue;
  usageWarning: ColorValue;
  critical: ColorValue;
  git: ColorValue;
  gitBranch: ColorValue;
  label: ColorValue;
  custom: ColorValue;
}

export interface ThemeBars {
  fill: string;
  empty: string;
}

export interface ThemeIcons {
  running: string;
  done: string;
  progress: string;
  separator: string;
}

export interface Theme {
  name: string;
  displayName: string;
  description: string;
  lineLayout: 'expanded' | 'compact';
  showSeparators: boolean;
  colors: ThemeColors;
  bars: ThemeBars;
  icons: ThemeIcons;
}

/** Theme with all fields guaranteed present (after resolution) */
export type ResolvedTheme = Theme;
