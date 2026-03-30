# Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a theme system where users pick a theme (colors, bars, icons, layout) and character independently, with a `/customize` command for interactive selection with previews.

**Architecture:** Themes are JSON presets loaded from `src/themes/builtin/`. A `resolveTheme()` function merges theme defaults with config overrides. The existing `render/colors.ts` and `render/progress-bar.ts` are refactored to accept a `ResolvedTheme` instead of hardcoded values. A `/customize` command skill file provides the interactive UX.

**Tech Stack:** TypeScript, vitest, Claude Code plugin skill (markdown command)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/themes/types.ts` | Create | Theme, ResolvedTheme interfaces |
| `src/themes/registry.ts` | Create | Load builtin + custom themes, getTheme(), listThemes() |
| `src/themes/resolve.ts` | Create | resolveTheme(config) → ResolvedTheme |
| `src/themes/preview.ts` | Create | Generate dummy preview string for a theme |
| `src/themes/builtin/default.json` | Create | Default theme (current colors) |
| `src/themes/builtin/monokai.json` | Create | Monokai theme |
| `src/themes/builtin/dracula.json` | Create | Dracula theme |
| `src/themes/builtin/nord.json` | Create | Nord theme |
| `src/themes/builtin/solarized.json` | Create | Solarized theme |
| `src/themes/builtin/catppuccin.json` | Create | Catppuccin theme |
| `src/themes/builtin/neon.json` | Create | Neon theme |
| `src/themes/builtin/minimal.json` | Create | Minimal theme |
| `src/themes/builtin/geek.json` | Create | Geek theme |
| `src/themes/builtin/designer.json` | Create | Designer theme |
| `src/themes/builtin/brainrot.json` | Create | BrainRot theme |
| `src/types.ts` | Modify | Add `theme`, `bars`, `icons` to Config |
| `src/config.ts` | Modify | Merge new fields in mergeConfig |
| `src/render/colors.ts` | Modify | Accept ResolvedTheme, resolve color values |
| `src/render/progress-bar.ts` | Modify | Accept bar chars from theme |
| `src/render/compact.ts` | Modify | Use theme icons/colors |
| `src/render/normal.ts` | Modify | Use theme icons/colors |
| `src/render/detailed.ts` | Modify | Use theme icons/colors |
| `src/render/index.ts` | Modify | Pass resolved theme through |
| `src/index.ts` | Modify | Call resolveTheme, pass to render |
| `commands/customize.md` | Create | /customize skill command |
| `tests/themes/types.test.ts` | Create | Theme type validation |
| `tests/themes/registry.test.ts` | Create | Theme loading tests |
| `tests/themes/resolve.test.ts` | Create | Theme resolution + override tests |
| `tests/themes/preview.test.ts` | Create | Preview rendering tests |
| `tests/render/progress-bar.test.ts` | Modify | Update for themed bar chars |
| `tests/render/compact.test.ts` | Modify | Update for themed render |
| `tests/render/normal.test.ts` | Modify | Update for themed render |
| `tests/render/detailed.test.ts` | Modify | Update for themed render |
| `tests/integration.test.ts` | Modify | Update for theme in config |

---

### Task 1: Theme Types

**Files:**
- Create: `src/themes/types.ts`
- Test: `tests/themes/types.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/themes/types.test.ts
import { describe, it, expect } from 'vitest';
import type { Theme, ResolvedTheme, ThemeBars, ThemeIcons, ThemeColors, ColorValue } from '../src/themes/types.js';

describe('Theme types', () => {
  it('accepts a valid theme object', () => {
    const theme: Theme = {
      name: 'test',
      displayName: 'Test Theme',
      description: 'A test theme',
      lineLayout: 'expanded',
      showSeparators: false,
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/winter/Side_projects/claude_runcat && npx vitest run tests/themes/types.test.ts`
Expected: FAIL — cannot resolve `../src/themes/types.js`

- [ ] **Step 3: Write the implementation**

```typescript
// src/themes/types.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/winter/Side_projects/claude_runcat && npx vitest run tests/themes/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/themes/types.ts tests/themes/types.test.ts
git commit -m "feat: add theme type definitions"
```

---

### Task 2: Theme Registry

**Files:**
- Create: `src/themes/registry.ts`
- Create: `src/themes/builtin/default.json`
- Test: `tests/themes/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/themes/registry.test.ts
import { describe, it, expect } from 'vitest';
import { getTheme, listThemes, loadCustomThemes } from '../src/themes/registry.js';

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
    // custom themes tested with a temp dir in integration
    const before = listThemes().length;
    loadCustomThemes('/tmp/nonexistent-dir');
    expect(listThemes().length).toBe(before);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/winter/Side_projects/claude_runcat && npx vitest run tests/themes/registry.test.ts`
Expected: FAIL — cannot resolve `../src/themes/registry.js`

- [ ] **Step 3: Create default.json**

```json
{
  "name": "default",
  "displayName": "Default",
  "description": "Standard claude-runcat colors",
  "lineLayout": "expanded",
  "showSeparators": false,
  "colors": {
    "model": "cyan",
    "project": "yellow",
    "context": "green",
    "usage": "blue",
    "warning": "yellow",
    "usageWarning": "magenta",
    "critical": "red",
    "git": "magenta",
    "gitBranch": "cyan",
    "label": "dim",
    "custom": 208
  },
  "bars": { "fill": "█", "empty": "░" },
  "icons": { "running": "◐", "done": "✓", "progress": "▸", "separator": "│" }
}
```

- [ ] **Step 4: Create all 11 builtin theme JSON files**

Create these files in `src/themes/builtin/`:

**monokai.json:**
```json
{
  "name": "monokai",
  "displayName": "Monokai",
  "description": "Warm editor classic",
  "lineLayout": "expanded",
  "showSeparators": false,
  "colors": {
    "model": "#F92672",
    "project": "#E6DB74",
    "context": "#A6E22E",
    "usage": "#66D9EF",
    "warning": "#E6DB74",
    "usageWarning": "#FD971F",
    "critical": "#F92672",
    "git": "#AE81FF",
    "gitBranch": "#66D9EF",
    "label": "dim",
    "custom": "#FD971F"
  },
  "bars": { "fill": "━", "empty": "─" },
  "icons": { "running": "◆", "done": "✔", "progress": "›", "separator": "│" }
}
```

**dracula.json:**
```json
{
  "name": "dracula",
  "displayName": "🧛 Dracula",
  "description": "Purple/pink dark theme",
  "lineLayout": "expanded",
  "showSeparators": true,
  "colors": {
    "model": "#bd93f9",
    "project": "#f1fa8c",
    "context": "#50fa7b",
    "usage": "#8be9fd",
    "warning": "#f1fa8c",
    "usageWarning": "#ff79c6",
    "critical": "#ff5555",
    "git": "#ff79c6",
    "gitBranch": "#8be9fd",
    "label": "#6272a4",
    "custom": "#ffb86c"
  },
  "bars": { "fill": "█", "empty": "░" },
  "icons": { "running": "◐", "done": "✓", "progress": "▸", "separator": "│" }
}
```

**nord.json:**
```json
{
  "name": "nord",
  "displayName": "❄ Nord",
  "description": "Cool arctic blue tones",
  "lineLayout": "expanded",
  "showSeparators": false,
  "colors": {
    "model": "#88C0D0",
    "project": "#ECEFF4",
    "context": "#A3BE8C",
    "usage": "#81A1C1",
    "warning": "#EBCB8B",
    "usageWarning": "#B48EAD",
    "critical": "#BF616A",
    "git": "#B48EAD",
    "gitBranch": "#88C0D0",
    "label": "#4C566A",
    "custom": "#D08770"
  },
  "bars": { "fill": "▓", "empty": "▒" },
  "icons": { "running": "◇", "done": "✓", "progress": "▹", "separator": "│" }
}
```

**solarized.json:**
```json
{
  "name": "solarized",
  "displayName": "☀ Solarized",
  "description": "Warm sepia tone",
  "lineLayout": "expanded",
  "showSeparators": false,
  "colors": {
    "model": "#268BD2",
    "project": "#B58900",
    "context": "#859900",
    "usage": "#2AA198",
    "warning": "#CB4B16",
    "usageWarning": "#D33682",
    "critical": "#DC322F",
    "git": "#D33682",
    "gitBranch": "#6C71C4",
    "label": "#586E75",
    "custom": "#B58900"
  },
  "bars": { "fill": "█", "empty": "░" },
  "icons": { "running": "◐", "done": "✓", "progress": "▸", "separator": "│" }
}
```

**catppuccin.json:**
```json
{
  "name": "catppuccin",
  "displayName": "🐱 Catppuccin",
  "description": "Soothing pastel palette",
  "lineLayout": "expanded",
  "showSeparators": false,
  "colors": {
    "model": "#cba6f7",
    "project": "#f9e2af",
    "context": "#a6e3a1",
    "usage": "#89b4fa",
    "warning": "#fab387",
    "usageWarning": "#f5c2e7",
    "critical": "#f38ba8",
    "git": "#f5c2e7",
    "gitBranch": "#89dceb",
    "label": "#6c7086",
    "custom": "#fab387"
  },
  "bars": { "fill": "█", "empty": "░" },
  "icons": { "running": "●", "done": "✓", "progress": "▸", "separator": "│" }
}
```

**neon.json:**
```json
{
  "name": "neon",
  "displayName": "⚡ Neon",
  "description": "High contrast fluorescent",
  "lineLayout": "compact",
  "showSeparators": false,
  "colors": {
    "model": "#FF1493",
    "project": "#00FF41",
    "context": "#39FF14",
    "usage": "#00D4FF",
    "warning": "#FFD700",
    "usageWarning": "#FF6EC7",
    "critical": "#FF0000",
    "git": "#BF00FF",
    "gitBranch": "#00FFFF",
    "label": "#888888",
    "custom": "#FF8C00"
  },
  "bars": { "fill": "▮", "empty": "▯" },
  "icons": { "running": "⚡", "done": "✓", "progress": "▸", "separator": "┃" }
}
```

**minimal.json:**
```json
{
  "name": "minimal",
  "displayName": "Minimal",
  "description": "Monochrome with one accent",
  "lineLayout": "compact",
  "showSeparators": false,
  "colors": {
    "model": "white",
    "project": "dim",
    "context": "cyan",
    "usage": "dim",
    "warning": "yellow",
    "usageWarning": "yellow",
    "critical": "red",
    "git": "dim",
    "gitBranch": "dim",
    "label": "dim",
    "custom": "cyan"
  },
  "bars": { "fill": "─", "empty": "·" },
  "icons": { "running": "·", "done": "✓", "progress": "›", "separator": "│" }
}
```

**geek.json:**
```json
{
  "name": "geek",
  "displayName": "> Geek",
  "description": "Hacker terminal, matrix green",
  "lineLayout": "expanded",
  "showSeparators": false,
  "colors": {
    "model": "#00FF41",
    "project": "#00CC33",
    "context": "#00FF41",
    "usage": "#009926",
    "warning": "#CCFF00",
    "usageWarning": "#CCFF00",
    "critical": "#FF0000",
    "git": "#00CC33",
    "gitBranch": "#00FF41",
    "label": "#006600",
    "custom": "#00FF41"
  },
  "bars": { "fill": "#", "empty": "·" },
  "icons": { "running": ">", "done": "✓", "progress": "$", "separator": "│" }
}
```

**designer.json:**
```json
{
  "name": "designer",
  "displayName": "🎨 Designer",
  "description": "Colorful emoji rainbow",
  "lineLayout": "expanded",
  "showSeparators": true,
  "colors": {
    "model": "#FF6B6B",
    "project": "#4ECDC4",
    "context": "#45B7D1",
    "usage": "#96CEB4",
    "warning": "#FFEAA7",
    "usageWarning": "#DDA0DD",
    "critical": "#FF6B6B",
    "git": "#C39BD3",
    "gitBranch": "#76D7C4",
    "label": "#AEB6BF",
    "custom": "#F39C12"
  },
  "bars": { "fill": "🟩", "empty": "⬜" },
  "icons": { "running": "🔄", "done": "✅", "progress": "▶️", "separator": "│" }
}
```

**brainrot.json:**
```json
{
  "name": "brainrot",
  "displayName": "🗿 BrainRot",
  "description": "Meme chaos energy",
  "lineLayout": "expanded",
  "showSeparators": false,
  "colors": {
    "model": "#FF00FF",
    "project": "#00FFFF",
    "context": "#FFFF00",
    "usage": "#FF4500",
    "warning": "#FF69B4",
    "usageWarning": "#FF1493",
    "critical": "#FF0000",
    "git": "#7B68EE",
    "gitBranch": "#00FF7F",
    "label": "#696969",
    "custom": "#FFD700"
  },
  "bars": { "fill": "💀", "empty": "🥶" },
  "icons": { "running": "🗿", "done": "✅", "progress": "👉", "separator": "💀" }
}
```

- [ ] **Step 5: Write registry implementation**

```typescript
// src/themes/registry.ts
import type { Theme } from './types.js';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN_DIR = path.join(__dirname, 'builtin');

function loadJsonTheme(filePath: string): Theme | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as Theme;
  } catch {
    return null;
  }
}

const builtinThemes: Theme[] = readdirSync(BUILTIN_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => loadJsonTheme(path.join(BUILTIN_DIR, f)))
  .filter((t): t is Theme => t !== null);

let customThemes: Theme[] = [];

export function loadCustomThemes(dir: string): void {
  try {
    customThemes = readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => loadJsonTheme(path.join(dir, f)))
      .filter((t): t is Theme => t !== null);
  } catch {
    customThemes = [];
  }
}

export function listThemes(): string[] {
  return [...builtinThemes, ...customThemes].map(t => t.name);
}

export function getTheme(name: string): Theme | null {
  return [...builtinThemes, ...customThemes].find(t => t.name === name) ?? null;
}

export function getAllThemes(): Theme[] {
  return [...builtinThemes, ...customThemes];
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd /Users/winter/Side_projects/claude_runcat && npx vitest run tests/themes/registry.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/themes/ tests/themes/registry.test.ts
git commit -m "feat: add theme registry with 11 builtin themes"
```

---

### Task 3: Theme Resolution

**Files:**
- Create: `src/themes/resolve.ts`
- Test: `tests/themes/resolve.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/themes/resolve.test.ts
import { describe, it, expect } from 'vitest';
import { resolveTheme } from '../src/themes/resolve.js';

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
    expect(resolved.colors.project).toBe('#f1fa8c'); // rest from dracula
  });

  it('overrides theme bars with config', () => {
    const resolved = resolveTheme({
      theme: 'default',
      bars: { fill: '━' },
    });
    expect(resolved.bars.fill).toBe('━');
    expect(resolved.bars.empty).toBe('░'); // rest from default
  });

  it('overrides theme icons with config', () => {
    const resolved = resolveTheme({
      theme: 'default',
      icons: { running: '⟳' },
    });
    expect(resolved.icons.running).toBe('⟳');
    expect(resolved.icons.done).toBe('✓'); // rest from default
  });

  it('overrides layout from config', () => {
    const resolved = resolveTheme({
      theme: 'dracula',
      lineLayout: 'compact',
    });
    expect(resolved.lineLayout).toBe('compact');
  });

  it('falls back to default for unknown theme', () => {
    const resolved = resolveTheme({ theme: 'nonexistent' });
    expect(resolved.name).toBe('default');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/winter/Side_projects/claude_runcat && npx vitest run tests/themes/resolve.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/themes/resolve.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/winter/Side_projects/claude_runcat && npx vitest run tests/themes/resolve.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/themes/resolve.ts tests/themes/resolve.test.ts
git commit -m "feat: add theme resolution with config overrides"
```

---

### Task 4: Refactor colors.ts for Theme Support

**Files:**
- Modify: `src/render/colors.ts`
- Modify: `src/render/progress-bar.ts`
- Modify: `tests/render/progress-bar.test.ts`

- [ ] **Step 1: Write failing test for themed progress bar**

```typescript
// tests/render/progress-bar.test.ts (replace contents)
import { describe, it, expect } from 'vitest';
import { progressBar } from '../src/render/progress-bar.js';

describe('progressBar', () => {
  it('renders empty bar at 0%', () => {
    expect(progressBar(0, 5)).toBe('░░░░░');
  });

  it('renders half bar at 50%', () => {
    expect(progressBar(50, 10)).toBe('█████░░░░░');
  });

  it('renders full bar at 100%', () => {
    expect(progressBar(100, 5)).toBe('█████');
  });

  it('renders with custom bar chars', () => {
    expect(progressBar(50, 4, '━', '─')).toBe('━━──');
  });

  it('renders with emoji bar chars', () => {
    expect(progressBar(50, 4, '💀', '🥶')).toBe('💀💀🥶🥶');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/winter/Side_projects/claude_runcat && npx vitest run tests/render/progress-bar.test.ts`
Expected: FAIL on custom bar chars tests (signature mismatch)

- [ ] **Step 3: Update progress-bar.ts**

```typescript
// src/render/progress-bar.ts
export function progressBar(percentage: number, width: number, fill = '█', empty = '░'): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clamped / 100) * width);
  return fill.repeat(filled) + empty.repeat(width - filled);
}
```

- [ ] **Step 4: Update colors.ts to resolve ColorValue**

```typescript
// src/render/colors.ts
import type { ColorValue } from '../themes/types.js';

const ESC = '\x1b[';
export const colors = {
  reset: `${ESC}0m`, bold: `${ESC}1m`, dim: `${ESC}2m`,
  red: `${ESC}31m`, green: `${ESC}32m`, yellow: `${ESC}33m`,
  blue: `${ESC}34m`, magenta: `${ESC}35m`, cyan: `${ESC}36m`,
  white: `${ESC}37m`, gray: `${ESC}90m`,
};

const NAMED_COLORS: Record<string, string> = {
  dim: colors.dim, red: colors.red, green: colors.green,
  yellow: colors.yellow, blue: colors.blue, magenta: colors.magenta,
  cyan: colors.cyan, white: colors.white, gray: colors.gray,
};

export function resolveColor(value: ColorValue): string {
  if (typeof value === 'number') return `${ESC}38;5;${value}m`;
  if (typeof value === 'string' && value.startsWith('#')) {
    const hex = value.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `${ESC}38;2;${r};${g};${b}m`;
  }
  return NAMED_COLORS[value as string] ?? colors.white;
}

export function colorize(text: string, color: string): string {
  return `${color}${text}${colors.reset}`;
}

export function contextColor(percentage: number, contextClr: ColorValue, warningClr: ColorValue, criticalClr: ColorValue): string {
  if (percentage >= 90) return resolveColor(criticalClr);
  if (percentage >= 70) return resolveColor(warningClr);
  return resolveColor(contextClr);
}

export function trafficLight(percentage: number, idle: boolean): string {
  if (idle) return '⚪';
  if (percentage >= 90) return '🔴';
  if (percentage >= 70) return '🟡';
  return '🟢';
}
```

- [ ] **Step 5: Run tests to verify**

Run: `cd /Users/winter/Side_projects/claude_runcat && npx vitest run tests/render/progress-bar.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/render/colors.ts src/render/progress-bar.ts tests/render/progress-bar.test.ts
git commit -m "refactor: make colors and progress bar theme-aware"
```

---

### Task 5: Update Renderers to Use Theme

**Files:**
- Modify: `src/render/index.ts`
- Modify: `src/render/compact.ts`
- Modify: `src/render/normal.ts`
- Modify: `src/render/detailed.ts`
- Modify: `tests/render/compact.test.ts`
- Modify: `tests/render/normal.test.ts`
- Modify: `tests/render/detailed.test.ts`

- [ ] **Step 1: Update render/index.ts signature**

```typescript
// src/render/index.ts
import type { StdinData, SessionState, DisplayMode } from '../types.js';
import type { BrailleFrame } from '../characters/types.js';
import type { ResolvedTheme } from '../themes/types.js';
import { renderCompact } from './compact.js';
import { renderNormal } from './normal.js';
import { renderDetailed } from './detailed.js';

export function render(mode: DisplayMode, data: StdinData, state: SessionState, frame: BrailleFrame, t: (key: string) => string, theme: ResolvedTheme): string[] {
  switch (mode) {
    case 'compact': return renderCompact(data, state, frame, t, theme);
    case 'normal': return renderNormal(data, state, frame, t, theme);
    case 'detailed': return renderDetailed(data, state, frame, t, theme);
  }
}
```

- [ ] **Step 2: Update compact.ts**

```typescript
// src/render/compact.ts
import type { StdinData, SessionState } from '../types.js';
import type { BrailleFrame } from '../characters/types.js';
import type { ResolvedTheme } from '../themes/types.js';
import { progressBar } from './progress-bar.js';
import { colorize, contextColor, trafficLight, resolveColor } from './colors.js';

export function renderCompact(data: StdinData, state: SessionState, frame: BrailleFrame, t: (key: string) => string, theme: ResolvedTheme): string[] {
  const pct = Math.round(data.context_window.used_percentage);
  const light = trafficLight(pct, state.phase === 'idle');
  const bar = progressBar(pct, 8, theme.bars.fill, theme.bars.empty);
  const barColored = colorize(bar, contextColor(pct, theme.colors.context, theme.colors.warning, theme.colors.critical));
  let cost = `$${data.cost.total_cost_usd.toFixed(2)}`;
  const model = colorize(`[${data.model.display_name}]`, resolveColor(theme.colors.model));
  const char = frame.lines[0] || '';
  let rateLimits = `5h:${Math.round(data.rate_limits.five_hour.used_percentage)}% 7d:${Math.round(data.rate_limits.seven_day.used_percentage)}%`;
  if (state.alerts.includes('rateLimitApproaching')) rateLimits += ' ⚠️';
  if (state.alerts.includes('costSpike')) cost += ' 💸';
  const sep = theme.icons.separator;
  return [`${char} ${model} ${light} ${barColored} ${pct}% ${sep} ${cost} ${sep} ${rateLimits}`];
}
```

- [ ] **Step 3: Update normal.ts**

```typescript
// src/render/normal.ts
import type { StdinData, SessionState } from '../types.js';
import type { BrailleFrame } from '../characters/types.js';
import type { ResolvedTheme } from '../themes/types.js';
import { progressBar } from './progress-bar.js';
import { colorize, contextColor, trafficLight, resolveColor } from './colors.js';
import { padRight, textWidth } from './text-width.js';
import * as path from 'node:path';

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  return `${hours}h${remainMin > 0 ? remainMin + 'm' : ''}`;
}

export function renderNormal(data: StdinData, state: SessionState, frame: BrailleFrame, t: (key: string) => string, theme: ResolvedTheme): string[] {
  const pct = Math.round(data.context_window.used_percentage);
  const light = trafficLight(pct, state.phase === 'idle');
  const barColored = colorize(progressBar(pct, 10, theme.bars.fill, theme.bars.empty), contextColor(pct, theme.colors.context, theme.colors.warning, theme.colors.critical));
  const cost = `$${data.cost.total_cost_usd.toFixed(2)}`;
  const model = colorize(`[${data.model.display_name}]`, resolveColor(theme.colors.model));
  let rateLimitStr = `5h:${Math.round(data.rate_limits.five_hour.used_percentage)}%`;
  if (state.alerts.includes('rateLimitApproaching')) rateLimitStr += ' ⚠️';
  const projectName = colorize(
    path.basename(data.workspace.project_dir || data.workspace.current_dir),
    resolveColor(theme.colors.project),
  );
  const duration = formatDuration(data.cost.total_duration_ms);
  const burnRateVal = data.cost.total_duration_ms > 0 ? data.cost.total_cost_usd / (data.cost.total_duration_ms / 60000) : 0;
  const burnRate = `$${burnRateVal.toFixed(2)}/m`;
  const sep = theme.icons.separator;

  const line1 = `${model} ${light} ${barColored} ${pct}% ${sep} ${cost} ${sep} ${rateLimitStr}`;
  const line2 = `${projectName} ${sep} ${duration} ${sep} ${burnRate}`;

  const charLines = frame.lines;
  const effects = frame.effects || [];
  const charWidth = charLines.reduce((max, l) => Math.max(max, textWidth(l)), 0);
  const infoLines = [line1, line2];
  const outputLines: string[] = [];
  const maxLines = Math.max(charLines.length, infoLines.length);
  for (let i = 0; i < maxLines; i++) {
    const charPart = i < charLines.length ? padRight(charLines[i], charWidth) : ' '.repeat(charWidth);
    const effectPart = i < effects.length && effects[i] ? effects[i] : '';
    const infoPart = i < infoLines.length ? infoLines[i] : '';
    outputLines.push(`${charPart}${effectPart}  ${infoPart}`);
  }
  return outputLines;
}
```

- [ ] **Step 4: Update detailed.ts**

```typescript
// src/render/detailed.ts
import type { StdinData, SessionState } from '../types.js';
import type { BrailleFrame } from '../characters/types.js';
import type { ResolvedTheme } from '../themes/types.js';
import { progressBar } from './progress-bar.js';
import { colorize, contextColor, trafficLight, resolveColor } from './colors.js';
import { padRight, textWidth } from './text-width.js';
import * as path from 'node:path';

function formatTokens(n: number): string { return n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`; }

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return `${min}m${sec > 0 ? sec + 's' : ''}`;
  const hr = Math.floor(min / 60);
  const remainMin = min % 60;
  return `${hr}h${remainMin > 0 ? remainMin + 'm' : ''}`;
}

export function renderDetailed(data: StdinData, state: SessionState, frame: BrailleFrame, t: (key: string) => string, theme: ResolvedTheme): string[] {
  const pct = Math.round(data.context_window.used_percentage);
  const light = trafficLight(pct, state.phase === 'idle');
  const barColored = colorize(progressBar(pct, 10, theme.bars.fill, theme.bars.empty), contextColor(pct, theme.colors.context, theme.colors.warning, theme.colors.critical));
  const cost = `$${data.cost.total_cost_usd.toFixed(2)}`;
  const model = colorize(`[${data.model.display_name}]`, resolveColor(theme.colors.model));
  const projectName = colorize(
    path.basename(data.workspace.project_dir || data.workspace.current_dir),
    resolveColor(theme.colors.project),
  );
  const duration = formatDuration(data.cost.total_duration_ms);
  const burnRateVal = data.cost.total_duration_ms > 0 ? data.cost.total_cost_usd / (data.cost.total_duration_ms / 60000) : 0;
  const burnRate = `$${burnRateVal.toFixed(2)}/m`;
  const sep = theme.icons.separator;

  let depletionStr = '—';
  if (burnRateVal > 0) {
    const remainPct = data.context_window.remaining_percentage;
    const usedCostPerPct = data.cost.total_cost_usd / Math.max(pct, 1);
    depletionStr = `~${Math.round((usedCostPerPct * remainPct) / burnRateVal)}m`;
  }

  const cacheHitPct = data.context_window.current_usage
    ? Math.round((data.context_window.current_usage.cache_read_input_tokens / Math.max(data.context_window.current_usage.input_tokens, 1)) * 100) : 0;

  const infoLine1 = `${model} ${light} ${barColored} ${pct}% ${sep} ${cost}`;
  const infoLine2 = `${projectName} ${sep} ${duration}`;
  const infoLine3 = `${t('burnRate')}: ${burnRate} ${sep} ${t('depletion')}: ${depletionStr}`;

  const charLines = frame.lines;
  const effects = frame.effects || [];
  const charWidth = charLines.reduce((max, l) => Math.max(max, textWidth(l)), 0);
  const topInfoLines = [infoLine1, infoLine2, infoLine3];
  const topRows: string[] = [];
  const maxTop = Math.max(charLines.length, topInfoLines.length);
  for (let i = 0; i < maxTop; i++) {
    const charPart = i < charLines.length ? padRight(charLines[i], charWidth) : ' '.repeat(charWidth);
    const effectPart = i < effects.length && effects[i] ? effects[i] : '';
    const infoPart = i < topInfoLines.length ? topInfoLines[i] : '';
    topRows.push(`${charPart}${effectPart}  ${infoPart}`);
  }

  const fiveHr = `5h:${Math.round(data.rate_limits.five_hour.used_percentage)}%`;
  const sevenDay = `7d:${Math.round(data.rate_limits.seven_day.used_percentage)}%`;
  let row4 = `${fiveHr} ${progressBar(data.rate_limits.five_hour.used_percentage, 5, theme.bars.fill, theme.bars.empty)} ${sep} ${sevenDay} ${sep} Cache:${cacheHitPct}%`;
  if (state.alerts.includes('rateLimitApproaching')) row4 += ' ⚠️';

  const usage = data.context_window.current_usage;
  const row5 = `In:${usage ? formatTokens(usage.input_tokens) : '0'} Out:${usage ? formatTokens(usage.output_tokens) : '0'} Cache↺:${usage ? formatTokens(usage.cache_read_input_tokens) : '0'}`;
  const row6 = `+${data.cost.total_lines_added}/-${data.cost.total_lines_removed} lines`;

  return [...topRows.slice(0, 3), row4, row5, row6];
}
```

- [ ] **Step 5: Update existing render tests to pass theme**

In each test file (`tests/render/compact.test.ts`, `tests/render/normal.test.ts`, `tests/render/detailed.test.ts`, `tests/integration.test.ts`), add a default theme import and pass it as the last argument to the render functions.

Add this helper to each test file:
```typescript
import { resolveTheme } from '../src/themes/resolve.js';
const defaultTheme = resolveTheme({});
```

Then append `defaultTheme` to every render call. For example in compact test:
```typescript
renderCompact(data, state, frame, t, defaultTheme)
```

In `tests/integration.test.ts`, update the `run()` call — it will be updated in Task 6.

- [ ] **Step 6: Run all tests**

Run: `cd /Users/winter/Side_projects/claude_runcat && npx vitest run`
Expected: PASS (some may still fail until Task 6 wires index.ts)

- [ ] **Step 7: Commit**

```bash
git add src/render/ tests/render/ tests/integration.test.ts
git commit -m "refactor: update all renderers to accept theme"
```

---

### Task 6: Wire Theme Into Config and Entry Point

**Files:**
- Modify: `src/types.ts`
- Modify: `src/config.ts`
- Modify: `src/index.ts`
- Modify: `tests/config.test.ts`
- Modify: `tests/integration.test.ts`

- [ ] **Step 1: Update Config type in types.ts**

Add these fields to the `Config` interface:

```typescript
// Add to Config interface in src/types.ts
  theme: string;
  colors?: Partial<import('./themes/types.js').ThemeColors>;
  bars?: Partial<import('./themes/types.js').ThemeBars>;
  icons?: Partial<import('./themes/types.js').ThemeIcons>;
  lineLayout?: 'expanded' | 'compact';
  showSeparators?: boolean;
```

- [ ] **Step 2: Update DEFAULT_CONFIG in config.ts**

Add to DEFAULT_CONFIG:
```typescript
  theme: 'default',
```

Update `mergeConfig` to handle new fields:
```typescript
  if (override.theme) merged.theme = override.theme;
  if (override.colors) merged.colors = override.colors;
  if (override.bars) merged.bars = override.bars;
  if (override.icons) merged.icons = override.icons;
  if (override.lineLayout) merged.lineLayout = override.lineLayout;
  if (typeof override.showSeparators === 'boolean') merged.showSeparators = override.showSeparators;
```

- [ ] **Step 3: Update index.ts to resolve theme and pass it**

```typescript
// In src/index.ts, add imports:
import { resolveTheme } from './themes/resolve.js';
import { loadCustomThemes } from './themes/registry.js';

// In run(), after config loading, before render:
  loadCustomThemes(path.join(os.homedir(), '.claude-runcat', 'themes'));
  const theme = resolveTheme({
    theme: config.theme,
    colors: config.colors,
    bars: config.bars,
    icons: config.icons,
    lineLayout: config.lineLayout,
    showSeparators: config.showSeparators,
  });

// Update render call:
  return render(config.displayMode, data, state, frame, t, theme).join('\n');
```

- [ ] **Step 4: Update tests**

Update `tests/config.test.ts` to verify `theme: 'default'` is in DEFAULT_CONFIG.

Update `tests/integration.test.ts` — the `run()` function now handles theme internally so no signature change needed, but verify it still works.

- [ ] **Step 5: Run all tests**

Run: `cd /Users/winter/Side_projects/claude_runcat && npx vitest run`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/config.ts src/index.ts tests/
git commit -m "feat: wire theme resolution into config and entry point"
```

---

### Task 7: Theme Preview

**Files:**
- Create: `src/themes/preview.ts`
- Test: `tests/themes/preview.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/themes/preview.test.ts
import { describe, it, expect } from 'vitest';
import { renderThemePreview } from '../src/themes/preview.js';
import { getTheme } from '../src/themes/registry.js';

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
    expect(preview).toContain('💀'); // bar fill
    expect(preview).toContain('🗿'); // running icon
  });

  it('preview contains theme display name', () => {
    const theme = getTheme('dracula')!;
    const preview = renderThemePreview(theme);
    expect(preview).toContain('Dracula');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/winter/Side_projects/claude_runcat && npx vitest run tests/themes/preview.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/themes/preview.ts
import type { Theme } from './types.js';
import { resolveColor, colorize, colors } from '../render/colors.js';
import { progressBar } from '../render/progress-bar.js';

export function renderThemePreview(theme: Theme): string {
  const model = colorize(`[Opus]`, resolveColor(theme.colors.model));
  const project = colorize('my-project', resolveColor(theme.colors.project));
  const ctxBar = colorize(
    progressBar(45, 10, theme.bars.fill, theme.bars.empty),
    resolveColor(theme.colors.context),
  );
  const usageBar = colorize(
    progressBar(25, 10, theme.bars.fill, theme.bars.empty),
    resolveColor(theme.colors.usage),
  );
  const sep = theme.icons.separator;
  const label = (text: string) => colorize(text, resolveColor(theme.colors.label));

  const header = `── ${theme.displayName} ──`;
  const line1 = `${model} ${sep} ${project}`;
  const line2 = `${label('Context')} ${ctxBar} 45%`;
  const line3 = `${label('Usage')}   ${usageBar} 25%`;
  const line4 = `${theme.icons.running} Edit: file.ts ${sep} ${theme.icons.done} Read ×3`;
  const line5 = `${theme.icons.progress} Fix auth bug (2/5)`;

  return [header, line1, line2, line3, line4, line5].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/winter/Side_projects/claude_runcat && npx vitest run tests/themes/preview.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/themes/preview.ts tests/themes/preview.test.ts
git commit -m "feat: add theme preview renderer with dummy data"
```

---

### Task 8: /customize Command

**Files:**
- Create: `commands/customize.md`

- [ ] **Step 1: Write the customize command**

```markdown
---
name: customize
description: "Pick a theme and character with live previews"
---

## claude-runcat: Customize

Interactive theme and character selector with previews.

### Step 1: Theme Selection

Load all available themes using the theme registry. Present them one at a time with a dummy preview.

For each theme, show this format using the theme's actual colors, bars, and icons:

\`\`\`
── {theme.displayName} ({index}/{total}) ──
[Opus] │ my-project
Context {bar} 45%
Usage   {bar} 25%
{icons.running} Edit: file.ts │ {icons.done} Read ×3
{icons.progress} Fix auth bug (2/5)
\`\`\`

Generate the preview by running:
\`\`\`bash
node -e "
const { getTheme, getAllThemes } = require('./dist/themes/registry.js');
const { renderThemePreview } = require('./dist/themes/preview.js');
const theme = getTheme('{themeName}');
console.log(renderThemePreview(theme));
"
\`\`\`

Ask the user: "다음(n) / 이전(p) / 선택(Enter) / 이름으로 선택(type name)"

Keep cycling until the user selects one.

### Step 2: Character Selection

Load all available characters. Present them one at a time showing:
- Character display name
- The idle frame (first frame of idle phase)
- A label showing the phase name

Ask the user: "다음(n) / 이전(p) / 선택(Enter)"

### Step 3: Confirm and Save

Show a summary:
\`\`\`
테마: {selectedTheme.displayName}
캐릭터: {selectedCharacter.displayName}

저장할까요? (Y/n)
\`\`\`

If confirmed, write to ~/.claude-runcat/config.json:
\`\`\`json
{
  "theme": "{selectedTheme.name}",
  "character": "{selectedCharacter.name}"
}
\`\`\`

Merge with existing config (preserve thresholds, locale, etc).

Say: "저장 완료! 다음 statusline 갱신 시 반영됩니다."
```

- [ ] **Step 2: Commit**

```bash
git add commands/customize.md
git commit -m "feat: add /customize command for theme and character selection"
```

---

### Task 9: Build and Integration Test

**Files:**
- Modify: `tests/integration.test.ts`
- Modify: `tsup.config.ts` or `package.json` (if needed for JSON imports)

- [ ] **Step 1: Verify build succeeds**

Run: `cd /Users/winter/Side_projects/claude_runcat && npm run build`
Expected: Clean build with no errors. If JSON imports fail, add `--loader '.json=json'` to tsup config or use `resolveJsonModule` in tsconfig.

- [ ] **Step 2: Update integration test to verify themed output**

Add to `tests/integration.test.ts`:

```typescript
it('renders with dracula theme', () => {
  const output = run(validStdin, { theme: 'dracula' } as any);
  expect(output).toBeTruthy();
  expect(output.length).toBeGreaterThan(0);
});

it('renders with brainrot theme', () => {
  const output = run(validStdin, { theme: 'brainrot' } as any);
  expect(output).toContain('💀'); // brainrot bar fill
});
```

- [ ] **Step 3: Run all tests**

Run: `cd /Users/winter/Side_projects/claude_runcat && npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Manual smoke test**

Run: `cd /Users/winter/Side_projects/claude_runcat && echo '{"model":{"id":"claude-opus-4-6","display_name":"Opus"},"context_window":{"total_input_tokens":50000,"total_output_tokens":5000,"context_window_size":200000,"used_percentage":45,"remaining_percentage":55,"current_usage":{"input_tokens":50000,"output_tokens":5000,"cache_creation_input_tokens":1000,"cache_read_input_tokens":30000}},"cost":{"total_cost_usd":0.52,"total_duration_ms":300000,"total_api_duration_ms":120000,"total_lines_added":100,"total_lines_removed":30},"rate_limits":{"five_hour":{"used_percentage":25,"resets_at":"2026-03-26T12:00:00Z"},"seven_day":{"used_percentage":10,"resets_at":"2026-03-30T00:00:00Z"}},"workspace":{"current_dir":"/Users/winter/project","project_dir":"/Users/winter/project"}}' | node dist/index.js`

Verify colored output appears.

- [ ] **Step 5: Commit**

```bash
git add tests/integration.test.ts
git commit -m "test: add themed integration tests"
```

---

### Task 10: Copy Builtin Theme JSONs to dist

**Files:**
- Modify: `tsup.config.ts` or build script

- [ ] **Step 1: Ensure JSON files are included in build output**

Check if tsup bundles JSON imports. If not, add a post-build copy step to `package.json`:

```json
"scripts": {
  "build": "tsup && cp -r src/themes/builtin dist/themes/builtin"
}
```

Or if using tsup's `publicDir` or `copy` plugin, configure it there.

- [ ] **Step 2: Verify build includes theme JSONs**

Run: `cd /Users/winter/Side_projects/claude_runcat && npm run build && ls dist/themes/builtin/`
Expected: All 11 .json files present

- [ ] **Step 3: Smoke test built output**

Run the same stdin pipe test from Task 9 Step 4 to verify it works from dist.

- [ ] **Step 4: Commit**

```bash
git add package.json tsup.config.ts
git commit -m "build: include theme JSON files in dist output"
```
