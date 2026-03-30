# claude-runcat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an animated statusline for Claude Code with RunCat-style Braille character animations, multi-language support, and multiple display modes.

**Architecture:** Modular pipeline — stdin JSON parser → state engine → animation frame selector → display mode renderer → stdout ANSI text. Characters are pixel art sprites converted to Braille at build time via node-drawille. Ships as npm package + Claude Code plugin wrapper.

**Tech Stack:** TypeScript, Node.js, node-drawille (build-time), vitest (testing), tsup (bundling)

---

## File Structure

```
claude-runcat/
├── src/
│   ├── index.ts                    # Entry point: read stdin → pipeline → stdout
│   ├── parser.ts                   # Parse stdin JSON, apply safe defaults
│   ├── types.ts                    # Shared types: StdinData, SessionState, Phase, etc.
│   ├── state.ts                    # Determine SessionState from parsed data
│   ├── config.ts                   # Load/validate ~/.claude-runcat/config.json
│   ├── animation.ts                # State→frame mapping, frame cycling logic
│   ├── i18n/
│   │   ├── index.ts                # Locale detection + t() translation function
│   │   ├── en.ts                   # English labels
│   │   ├── ko.ts                   # Korean labels
│   │   ├── ja.ts                   # Japanese labels
│   │   └── zh.ts                   # Chinese labels
│   ├── characters/
│   │   ├── types.ts                # Character, BrailleFrame interfaces
│   │   ├── registry.ts             # Character registry (builtin + custom)
│   │   ├── loader.ts               # Load custom character JSON from disk
│   │   ├── converter.ts            # Pixel art PNG → Braille JSON converter
│   │   └── builtin/
│   │       ├── sprites/            # Source pixel art PNGs (20×12px)
│   │       │   └── cat/            # running-0..4.png, idle-0..1.png, etc.
│   │       └── generated/
│   │           └── cat.json        # Pre-generated Braille frame data
│   ├── render/
│   │   ├── index.ts                # Mode dispatch: compact/normal/detailed
│   │   ├── compact.ts              # 1-line renderer
│   │   ├── normal.ts               # 2-line + 3-row character renderer
│   │   ├── detailed.ts             # 6-line renderer
│   │   ├── progress-bar.ts         # Unicode progress bar builder
│   │   ├── colors.ts               # ANSI escape code helpers
│   │   └── text-width.ts           # CJK/emoji width calculation
│   └── idle-cache.ts               # /tmp idle detection cache read/write
├── scripts/
│   └── generate-characters.ts      # Build script: sprites/ → generated/ JSON
├── plugin/
│   ├── plugin.json                 # Claude Code plugin manifest
│   ├── setup.ts                    # /claude-runcat:setup slash command
│   ├── add-character.ts            # /claude-runcat:add-character
│   └── configure.ts                # /claude-runcat:configure
├── tests/
│   ├── parser.test.ts
│   ├── state.test.ts
│   ├── animation.test.ts
│   ├── config.test.ts
│   ├── idle-cache.test.ts
│   ├── i18n.test.ts
│   ├── render/
│   │   ├── compact.test.ts
│   │   ├── normal.test.ts
│   │   ├── detailed.test.ts
│   │   ├── progress-bar.test.ts
│   │   └── text-width.test.ts
│   ├── characters/
│   │   ├── registry.test.ts
│   │   └── converter.test.ts
│   └── integration.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── tsup.config.ts
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `tsup.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```bash
cd /Users/winter/Side_projects/claude_runcat
npm init -y
```

Edit `package.json`:

```json
{
  "name": "claude-runcat",
  "version": "0.1.0",
  "description": "Animated statusline for Claude Code with RunCat-style character animations",
  "main": "dist/index.js",
  "bin": {
    "claude-runcat": "dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "generate-characters": "tsx scripts/generate-characters.ts",
    "lint": "tsc --noEmit"
  },
  "keywords": ["claude", "statusline", "runcat", "terminal", "animation"],
  "license": "MIT",
  "type": "module"
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install --save-dev typescript vitest tsup tsx @types/node
npm install --save drawille sharp
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  dts: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
```

- [ ] **Step 7: Verify setup**

```bash
npx tsc --noEmit
```

Expected: No errors (no source files yet, should complete cleanly).

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts tsup.config.ts .gitignore package-lock.json
git commit -m "chore: scaffold project with TypeScript, vitest, tsup"
```

---

### Task 2: Shared Types

**Files:**
- Create: `src/types.ts`
- Create: `src/characters/types.ts`

- [ ] **Step 1: Create src/types.ts**

```typescript
export interface StdinData {
  model: {
    id: string;
    display_name: string;
  };
  context_window: {
    total_input_tokens: number;
    total_output_tokens: number;
    context_window_size: number;
    used_percentage: number;
    remaining_percentage: number;
    current_usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
    } | null;
  };
  cost: {
    total_cost_usd: number;
    total_duration_ms: number;
    total_api_duration_ms: number;
    total_lines_added: number;
    total_lines_removed: number;
  };
  rate_limits: {
    five_hour: { used_percentage: number; resets_at: string };
    seven_day: { used_percentage: number; resets_at: string };
  };
  workspace: {
    current_dir: string;
    project_dir: string;
  };
  worktree?: {
    branch: string;
    original_cwd: string;
    original_branch: string;
  };
}

export type Phase = 'rateLimited' | 'crushed' | 'expensive' | 'heavy' | 'running' | 'idle';

export type Alert = 'contextWarning' | 'contextCritical' | 'costSpike' | 'rateLimitApproaching';

export interface SessionState {
  phase: Phase;
  intensity: number;
  alerts: Alert[];
}

export type Locale = 'en' | 'ko' | 'ja' | 'zh';

export type DisplayMode = 'compact' | 'normal' | 'detailed';

export interface Config {
  locale: Locale | 'auto';
  displayMode: DisplayMode;
  character: string;
  customCharactersDir: string;
  thresholds: {
    heavyContext: number;
    crushedContext: number;
    expensiveBurnRate: number;
    rateLimitWarning: number;
  };
  animation: {
    enabled: boolean;
  };
}
```

- [ ] **Step 2: Create src/characters/types.ts**

```typescript
import type { Phase, Locale } from '../types.js';

export interface BrailleFrame {
  lines: string[];
  effects?: string[];
}

export interface Character {
  name: string;
  displayName: Record<Locale, string>;
  frames: Record<Phase, BrailleFrame[]>;
  compactFrames: Record<Phase, string[]>;
}
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/characters/types.ts
git commit -m "feat: add shared type definitions"
```

---

### Task 3: Parser

**Files:**
- Create: `src/parser.ts`
- Create: `tests/parser.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseStdin } from '../src/parser.js';

const validInput = JSON.stringify({
  model: { id: 'claude-opus-4-6', display_name: 'Opus 4.6' },
  context_window: {
    total_input_tokens: 5000,
    total_output_tokens: 1000,
    context_window_size: 200000,
    used_percentage: 45.5,
    remaining_percentage: 54.5,
    current_usage: {
      input_tokens: 500,
      output_tokens: 100,
      cache_creation_input_tokens: 200,
      cache_read_input_tokens: 300,
    },
  },
  cost: {
    total_cost_usd: 1.23,
    total_duration_ms: 300000,
    total_api_duration_ms: 120000,
    total_lines_added: 50,
    total_lines_removed: 10,
  },
  rate_limits: {
    five_hour: { used_percentage: 12, resets_at: '2026-03-25T22:00:00Z' },
    seven_day: { used_percentage: 3, resets_at: '2026-03-31T00:00:00Z' },
  },
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
    const input = JSON.stringify({
      context_window: { current_usage: null },
    });
    const result = parseStdin(input);
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/parser.test.ts
```

Expected: FAIL — `parseStdin` not found.

- [ ] **Step 3: Implement parser**

```typescript
// src/parser.ts
import type { StdinData } from './types.js';

const DEFAULT_STDIN: StdinData = {
  model: { id: '', display_name: '' },
  context_window: {
    total_input_tokens: 0,
    total_output_tokens: 0,
    context_window_size: 200000,
    used_percentage: 0,
    remaining_percentage: 100,
    current_usage: null,
  },
  cost: {
    total_cost_usd: 0,
    total_duration_ms: 0,
    total_api_duration_ms: 0,
    total_lines_added: 0,
    total_lines_removed: 0,
  },
  rate_limits: {
    five_hour: { used_percentage: 0, resets_at: '' },
    seven_day: { used_percentage: 0, resets_at: '' },
  },
  workspace: { current_dir: '', project_dir: '' },
};

function deepMergeDefaults(defaults: any, input: any): any {
  if (input === null || input === undefined || typeof input !== 'object') {
    return input ?? defaults;
  }
  if (typeof defaults !== 'object' || defaults === null) {
    return input;
  }
  const result: any = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (key in input) {
      if (input[key] === null) {
        result[key] = null;
      } else {
        result[key] = deepMergeDefaults(defaults[key], input[key]);
      }
    }
  }
  // Preserve extra keys from input (like worktree)
  for (const key of Object.keys(input)) {
    if (!(key in defaults)) {
      result[key] = input[key];
    }
  }
  return result;
}

export function parseStdin(raw: string): StdinData {
  let parsed: any;
  try {
    parsed = JSON.parse(raw || '{}');
  } catch {
    parsed = {};
  }
  return deepMergeDefaults(DEFAULT_STDIN, parsed);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/parser.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/parser.ts tests/parser.test.ts
git commit -m "feat: add stdin JSON parser with safe defaults"
```

---

### Task 4: Idle Cache

**Files:**
- Create: `src/idle-cache.ts`
- Create: `tests/idle-cache.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/idle-cache.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readIdleCache, writeIdleCache, isIdle } from '../src/idle-cache.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const testCacheFile = path.join(os.tmpdir(), 'claude-runcat-idle-test');

describe('idle-cache', () => {
  beforeEach(() => {
    try { fs.unlinkSync(testCacheFile); } catch {}
  });
  afterEach(() => {
    try { fs.unlinkSync(testCacheFile); } catch {}
  });

  it('returns null when cache file does not exist', () => {
    const result = readIdleCache(testCacheFile);
    expect(result).toBeNull();
  });

  it('writes and reads cache correctly', () => {
    writeIdleCache(testCacheFile, 120000, Date.now());
    const result = readIdleCache(testCacheFile);
    expect(result).not.toBeNull();
    expect(result!.apiDurationMs).toBe(120000);
  });

  it('detects idle when api duration unchanged for 30+ seconds', () => {
    const now = Date.now();
    writeIdleCache(testCacheFile, 120000, now - 31000);
    expect(isIdle(120000, testCacheFile)).toBe(true);
  });

  it('detects not idle when api duration changed', () => {
    const now = Date.now();
    writeIdleCache(testCacheFile, 100000, now - 31000);
    expect(isIdle(120000, testCacheFile)).toBe(false);
  });

  it('detects not idle when under 30 seconds', () => {
    const now = Date.now();
    writeIdleCache(testCacheFile, 120000, now - 5000);
    expect(isIdle(120000, testCacheFile)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/idle-cache.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement idle cache**

```typescript
// src/idle-cache.ts
import * as fs from 'node:fs';

interface IdleCacheData {
  apiDurationMs: number;
  timestamp: number;
}

const IDLE_THRESHOLD_MS = 30000;

export function readIdleCache(cacheFile: string): IdleCacheData | null {
  try {
    const raw = fs.readFileSync(cacheFile, 'utf-8');
    const data = JSON.parse(raw);
    if (typeof data.apiDurationMs === 'number' && typeof data.timestamp === 'number') {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeIdleCache(cacheFile: string, apiDurationMs: number, timestamp: number): void {
  try {
    fs.writeFileSync(cacheFile, JSON.stringify({ apiDurationMs, timestamp }));
  } catch {
    // Silently fail — idle detection is best-effort
  }
}

export function isIdle(currentApiDurationMs: number, cacheFile: string): boolean {
  const cached = readIdleCache(cacheFile);
  const now = Date.now();

  if (!cached) {
    writeIdleCache(cacheFile, currentApiDurationMs, now);
    return false;
  }

  if (cached.apiDurationMs !== currentApiDurationMs) {
    // API activity changed — not idle, update cache
    writeIdleCache(cacheFile, currentApiDurationMs, now);
    return false;
  }

  // API duration unchanged — check how long
  const elapsed = now - cached.timestamp;
  return elapsed >= IDLE_THRESHOLD_MS;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/idle-cache.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/idle-cache.ts tests/idle-cache.test.ts
git commit -m "feat: add idle detection cache"
```

---

### Task 5: State Engine

**Files:**
- Create: `src/state.ts`
- Create: `tests/state.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/state.test.ts
import { describe, it, expect } from 'vitest';
import { determineState } from '../src/state.js';
import type { StdinData, Config } from '../src/types.js';

const defaultThresholds: Config['thresholds'] = {
  heavyContext: 70,
  crushedContext: 90,
  expensiveBurnRate: 0.10,
  rateLimitWarning: 80,
};

function makeInput(overrides: any = {}): StdinData {
  return {
    model: { id: 'test', display_name: 'Test' },
    context_window: {
      total_input_tokens: 0, total_output_tokens: 0,
      context_window_size: 200000, used_percentage: 30,
      remaining_percentage: 70, current_usage: null,
      ...overrides.context_window,
    },
    cost: {
      total_cost_usd: 0.5, total_duration_ms: 300000,
      total_api_duration_ms: 120000,
      total_lines_added: 0, total_lines_removed: 0,
      ...overrides.cost,
    },
    rate_limits: {
      five_hour: { used_percentage: 10, resets_at: '' },
      seven_day: { used_percentage: 3, resets_at: '' },
      ...overrides.rate_limits,
    },
    workspace: { current_dir: '/test', project_dir: '/test' },
  };
}

describe('determineState', () => {
  it('returns running for normal session', () => {
    const state = determineState(makeInput(), defaultThresholds, false);
    expect(state.phase).toBe('running');
    expect(state.alerts).toEqual([]);
  });

  it('returns rateLimited when 5h rate >= 95%', () => {
    const input = makeInput({
      rate_limits: {
        five_hour: { used_percentage: 96, resets_at: '' },
        seven_day: { used_percentage: 3, resets_at: '' },
      },
    });
    const state = determineState(input, defaultThresholds, false);
    expect(state.phase).toBe('rateLimited');
    expect(state.intensity).toBe(1.0);
  });

  it('returns crushed when context >= 90%', () => {
    const input = makeInput({ context_window: { used_percentage: 92 } });
    const state = determineState(input, defaultThresholds, false);
    expect(state.phase).toBe('crushed');
    expect(state.alerts).toContain('contextCritical');
  });

  it('returns expensive when burn rate exceeds threshold', () => {
    // $1.50 in 60 seconds = $1.50/min >> $0.10/min
    const input = makeInput({ cost: { total_cost_usd: 1.5, total_duration_ms: 60000, total_api_duration_ms: 50000 } });
    const state = determineState(input, defaultThresholds, false);
    expect(state.phase).toBe('expensive');
    expect(state.alerts).toContain('costSpike');
  });

  it('returns heavy when context >= 70%', () => {
    const input = makeInput({ context_window: { used_percentage: 75 } });
    const state = determineState(input, defaultThresholds, false);
    expect(state.phase).toBe('heavy');
    expect(state.alerts).toContain('contextWarning');
  });

  it('returns idle when flagged as idle', () => {
    const state = determineState(makeInput(), defaultThresholds, true);
    expect(state.phase).toBe('idle');
    expect(state.intensity).toBe(0);
  });

  it('rateLimited takes priority over crushed', () => {
    const input = makeInput({
      context_window: { used_percentage: 95 },
      rate_limits: {
        five_hour: { used_percentage: 96, resets_at: '' },
        seven_day: { used_percentage: 3, resets_at: '' },
      },
    });
    const state = determineState(input, defaultThresholds, false);
    expect(state.phase).toBe('rateLimited');
  });

  it('adds rateLimitApproaching alert at 80%', () => {
    const input = makeInput({
      rate_limits: {
        five_hour: { used_percentage: 82, resets_at: '' },
        seven_day: { used_percentage: 3, resets_at: '' },
      },
    });
    const state = determineState(input, defaultThresholds, false);
    expect(state.alerts).toContain('rateLimitApproaching');
  });

  it('intensity scales with context for running phase', () => {
    const low = determineState(makeInput({ context_window: { used_percentage: 10 } }), defaultThresholds, false);
    const high = determineState(makeInput({ context_window: { used_percentage: 60 } }), defaultThresholds, false);
    expect(high.intensity).toBeGreaterThan(low.intensity);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/state.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement state engine**

```typescript
// src/state.ts
import type { StdinData, SessionState, Phase, Alert, Config } from './types.js';

export function determineState(
  data: StdinData,
  thresholds: Config['thresholds'],
  idle: boolean,
): SessionState {
  const alerts: Alert[] = [];
  const contextPct = data.context_window.used_percentage;
  const ratePct = data.rate_limits.five_hour.used_percentage;
  const durationMin = data.cost.total_duration_ms / 60000;
  const burnRate = durationMin > 0 ? data.cost.total_cost_usd / durationMin : 0;

  // Collect alerts independently of phase
  if (contextPct >= thresholds.crushedContext) {
    alerts.push('contextCritical');
  } else if (contextPct >= thresholds.heavyContext) {
    alerts.push('contextWarning');
  }
  if (burnRate > thresholds.expensiveBurnRate) {
    alerts.push('costSpike');
  }
  if (ratePct >= thresholds.rateLimitWarning) {
    alerts.push('rateLimitApproaching');
  }

  // Determine phase by priority
  if (ratePct >= 95) {
    return { phase: 'rateLimited', intensity: 1.0, alerts };
  }
  if (contextPct >= thresholds.crushedContext) {
    const intensity = 0.9 + (contextPct - thresholds.crushedContext) / 100;
    return { phase: 'crushed', intensity: Math.min(intensity, 1.0), alerts };
  }
  if (burnRate > thresholds.expensiveBurnRate) {
    const intensity = Math.min(burnRate / (thresholds.expensiveBurnRate * 5), 1.0);
    return { phase: 'expensive', intensity, alerts };
  }
  if (contextPct >= thresholds.heavyContext) {
    const intensity = (contextPct - thresholds.heavyContext) / (thresholds.crushedContext - thresholds.heavyContext);
    return { phase: 'heavy', intensity: Math.min(intensity, 1.0), alerts };
  }
  if (idle) {
    return { phase: 'idle', intensity: 0, alerts };
  }

  // Running — intensity proportional to context usage (0-70% → 0-1)
  const intensity = contextPct / thresholds.heavyContext;
  return { phase: 'running', intensity: Math.min(intensity, 1.0), alerts };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/state.test.ts
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state.ts tests/state.test.ts
git commit -m "feat: add session state engine with priority-based phase detection"
```

---

### Task 6: Config Loader

**Files:**
- Create: `src/config.ts`
- Create: `tests/config.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/config.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig, DEFAULT_CONFIG } from '../src/config.js';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return { ...actual };
});

describe('loadConfig', () => {
  it('returns defaults when config file does not exist', () => {
    const config = loadConfig('/nonexistent/path/config.json');
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('merges partial config with defaults', () => {
    const config = loadConfig('/nonexistent/path', {
      displayMode: 'detailed',
      character: 'robot',
    });
    expect(config.displayMode).toBe('detailed');
    expect(config.character).toBe('robot');
    expect(config.locale).toBe('auto'); // default preserved
    expect(config.thresholds.heavyContext).toBe(70); // default preserved
  });

  it('validates thresholds stay within bounds', () => {
    const config = loadConfig('/nonexistent/path', {
      thresholds: { heavyContext: 150, crushedContext: -10 },
    });
    expect(config.thresholds.heavyContext).toBe(100);
    expect(config.thresholds.crushedContext).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/config.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement config loader**

```typescript
// src/config.ts
import * as fs from 'node:fs';
import type { Config } from './types.js';

export const DEFAULT_CONFIG: Config = {
  locale: 'auto',
  displayMode: 'normal',
  character: 'cat',
  customCharactersDir: '~/.claude-runcat/characters/',
  thresholds: {
    heavyContext: 70,
    crushedContext: 90,
    expensiveBurnRate: 0.10,
    rateLimitWarning: 80,
  },
  animation: {
    enabled: true,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mergeConfig(base: Config, override: any): Config {
  const merged = { ...base };
  if (override.locale) merged.locale = override.locale;
  if (override.displayMode) merged.displayMode = override.displayMode;
  if (override.character) merged.character = override.character;
  if (override.customCharactersDir) merged.customCharactersDir = override.customCharactersDir;
  if (override.thresholds) {
    merged.thresholds = { ...base.thresholds };
    if (typeof override.thresholds.heavyContext === 'number') {
      merged.thresholds.heavyContext = clamp(override.thresholds.heavyContext, 0, 100);
    }
    if (typeof override.thresholds.crushedContext === 'number') {
      merged.thresholds.crushedContext = clamp(override.thresholds.crushedContext, 0, 100);
    }
    if (typeof override.thresholds.expensiveBurnRate === 'number') {
      merged.thresholds.expensiveBurnRate = Math.max(0, override.thresholds.expensiveBurnRate);
    }
    if (typeof override.thresholds.rateLimitWarning === 'number') {
      merged.thresholds.rateLimitWarning = clamp(override.thresholds.rateLimitWarning, 0, 100);
    }
  }
  if (override.animation) {
    merged.animation = { ...base.animation, ...override.animation };
  }
  return merged;
}

export function loadConfig(configPath: string, overrideData?: any): Config {
  let fileData: any = {};
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    fileData = JSON.parse(raw);
  } catch {
    // No config file — use defaults
  }
  const combined = { ...fileData, ...overrideData };
  return mergeConfig(DEFAULT_CONFIG, combined);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/config.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat: add config loader with validation and defaults"
```

---

### Task 7: i18n System

**Files:**
- Create: `src/i18n/index.ts`, `src/i18n/en.ts`, `src/i18n/ko.ts`, `src/i18n/ja.ts`, `src/i18n/zh.ts`
- Create: `tests/i18n.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/i18n.test.ts
import { describe, it, expect, vi } from 'vitest';
import { detectLocale, createTranslator } from '../src/i18n/index.js';

describe('detectLocale', () => {
  it('returns config locale when not auto', () => {
    expect(detectLocale('ko')).toBe('ko');
  });

  it('detects from LANG env variable', () => {
    vi.stubEnv('LANG', 'ja_JP.UTF-8');
    expect(detectLocale('auto')).toBe('ja');
    vi.unstubAllEnvs();
  });

  it('defaults to en for unknown locale', () => {
    vi.stubEnv('LANG', 'fr_FR.UTF-8');
    expect(detectLocale('auto')).toBe('en');
    vi.unstubAllEnvs();
  });

  it('defaults to en when LANG is unset', () => {
    vi.stubEnv('LANG', '');
    expect(detectLocale('auto')).toBe('en');
    vi.unstubAllEnvs();
  });
});

describe('createTranslator', () => {
  it('translates labels in English', () => {
    const t = createTranslator('en');
    expect(t('context')).toBe('Context');
    expect(t('idle')).toBe('Idle');
  });

  it('translates labels in Korean', () => {
    const t = createTranslator('ko');
    expect(t('context')).toBe('컨텍스트');
    expect(t('idle')).toBe('대기 중');
  });

  it('falls back to English for missing keys', () => {
    const t = createTranslator('ko');
    expect(t('nonexistentKey' as any)).toBe('nonexistentKey');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/i18n.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create language files**

```typescript
// src/i18n/en.ts
export const en: Record<string, string> = {
  context: 'Context',
  cost: 'Cost',
  burnRate: 'Burn',
  depletion: 'Depletion',
  budget: 'Budget',
  session: 'Session',
  duration: 'Duration',
  idle: 'Idle',
  running: 'Running',
  heavy: 'Heavy',
  crushed: 'Overloaded',
  expensive: 'Cost Surge',
  rateLimited: 'Rate Limited',
  cat: 'Cat',
  robot: 'Robot',
  bird: 'Bird',
  runner: 'Runner',
};
```

```typescript
// src/i18n/ko.ts
export const ko: Record<string, string> = {
  context: '컨텍스트',
  cost: '비용',
  burnRate: '소모율',
  depletion: '소진 예상',
  budget: '예산',
  session: '세션',
  duration: '시간',
  idle: '대기 중',
  running: '실행 중',
  heavy: '무거움',
  crushed: '과부하',
  expensive: '비용 급등',
  rateLimited: '속도 제한',
  cat: '고양이',
  robot: '로봇',
  bird: '새',
  runner: '달리는 사람',
};
```

```typescript
// src/i18n/ja.ts
export const ja: Record<string, string> = {
  context: 'コンテキスト',
  cost: 'コスト',
  burnRate: '消費率',
  depletion: '枯渇予想',
  budget: '予算',
  session: 'セッション',
  duration: '時間',
  idle: '待機中',
  running: '実行中',
  heavy: '重い',
  crushed: '過負荷',
  expensive: 'コスト急増',
  rateLimited: 'レート制限',
  cat: '猫',
  robot: 'ロボット',
  bird: '鳥',
  runner: 'ランナー',
};
```

```typescript
// src/i18n/zh.ts
export const zh: Record<string, string> = {
  context: '上下文',
  cost: '费用',
  burnRate: '消耗率',
  depletion: '预计耗尽',
  budget: '预算',
  session: '会话',
  duration: '时间',
  idle: '空闲',
  running: '运行中',
  heavy: '较重',
  crushed: '超载',
  expensive: '费用激增',
  rateLimited: '速率限制',
  cat: '猫',
  robot: '机器人',
  bird: '鸟',
  runner: '跑步者',
};
```

- [ ] **Step 4: Create i18n index**

```typescript
// src/i18n/index.ts
import type { Locale } from '../types.js';
import { en } from './en.js';
import { ko } from './ko.js';
import { ja } from './ja.js';
import { zh } from './zh.js';

const locales: Record<Locale, Record<string, string>> = { en, ko, ja, zh };
const SUPPORTED: Set<string> = new Set(['en', 'ko', 'ja', 'zh']);

export function detectLocale(configLocale: Locale | 'auto'): Locale {
  if (configLocale !== 'auto' && SUPPORTED.has(configLocale)) {
    return configLocale;
  }
  const lang = (process.env.LANG || '').split(/[_.]/)[0];
  if (SUPPORTED.has(lang)) {
    return lang as Locale;
  }
  return 'en';
}

export function createTranslator(locale: Locale): (key: string) => string {
  const dict = locales[locale] || locales.en;
  const fallback = locales.en;
  return (key: string) => dict[key] ?? fallback[key] ?? key;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/i18n.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/ tests/i18n.test.ts
git commit -m "feat: add i18n system with en/ko/ja/zh support"
```

---

### Task 8: Render Utilities (colors, progress bar, text width)

**Files:**
- Create: `src/render/colors.ts`, `src/render/progress-bar.ts`, `src/render/text-width.ts`
- Create: `tests/render/progress-bar.test.ts`, `tests/render/text-width.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/render/progress-bar.test.ts
import { describe, it, expect } from 'vitest';
import { progressBar } from '../../src/render/progress-bar.js';

describe('progressBar', () => {
  it('renders 0% as all empty', () => {
    const bar = progressBar(0, 10);
    expect(bar).toBe('░░░░░░░░░░');
  });

  it('renders 100% as all filled', () => {
    const bar = progressBar(100, 10);
    expect(bar).toBe('██████████');
  });

  it('renders 50% correctly', () => {
    const bar = progressBar(50, 10);
    expect(bar).toBe('█████░░░░░');
  });

  it('clamps values above 100', () => {
    const bar = progressBar(150, 10);
    expect(bar).toBe('██████████');
  });

  it('clamps negative values', () => {
    const bar = progressBar(-10, 10);
    expect(bar).toBe('░░░░░░░░░░');
  });
});
```

```typescript
// tests/render/text-width.test.ts
import { describe, it, expect } from 'vitest';
import { textWidth, padRight } from '../../src/render/text-width.js';

describe('textWidth', () => {
  it('counts ASCII characters as width 1', () => {
    expect(textWidth('hello')).toBe(5);
  });

  it('counts CJK characters as width 2', () => {
    expect(textWidth('컨텍스트')).toBe(8);
  });

  it('counts emoji as width 2', () => {
    expect(textWidth('🟢')).toBe(2);
  });

  it('ignores ANSI escape codes', () => {
    expect(textWidth('\x1b[32mhello\x1b[0m')).toBe(5);
  });

  it('handles mixed content', () => {
    expect(textWidth('[Opus] 컨텍스트')).toBe(15); // 7 ascii + 4*2 CJK
  });
});

describe('padRight', () => {
  it('pads ASCII string', () => {
    expect(padRight('hi', 5)).toBe('hi   ');
  });

  it('pads CJK string accounting for width', () => {
    const result = padRight('안녕', 6);
    expect(textWidth(result)).toBe(6);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/render/
```

Expected: FAIL.

- [ ] **Step 3: Implement colors.ts**

```typescript
// src/render/colors.ts
const ESC = '\x1b[';

export const colors = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  white: `${ESC}37m`,
  gray: `${ESC}90m`,
};

export function colorize(text: string, color: string): string {
  return `${color}${text}${colors.reset}`;
}

export function contextColor(percentage: number): string {
  if (percentage >= 90) return colors.red;
  if (percentage >= 70) return colors.yellow;
  return colors.green;
}

export function trafficLight(percentage: number, idle: boolean): string {
  if (idle) return '⚪';
  if (percentage >= 90) return '🔴';
  if (percentage >= 70) return '🟡';
  return '🟢';
}
```

- [ ] **Step 4: Implement progress-bar.ts**

```typescript
// src/render/progress-bar.ts
export function progressBar(percentage: number, width: number): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clamped / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}
```

- [ ] **Step 5: Implement text-width.ts**

```typescript
// src/render/text-width.ts

// Strip ANSI escape codes
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// Check if a code point is wide (CJK, emoji, etc.)
function isWideCodePoint(cp: number): boolean {
  // CJK Unified Ideographs
  if (cp >= 0x4E00 && cp <= 0x9FFF) return true;
  // CJK Ext A
  if (cp >= 0x3400 && cp <= 0x4DBF) return true;
  // Hangul Syllables
  if (cp >= 0xAC00 && cp <= 0xD7AF) return true;
  // CJK Compatibility Ideographs
  if (cp >= 0xF900 && cp <= 0xFAFF) return true;
  // Fullwidth Forms
  if (cp >= 0xFF01 && cp <= 0xFF60) return true;
  // Katakana, Hiragana
  if (cp >= 0x3000 && cp <= 0x30FF) return true;
  // Emoji ranges (simplified)
  if (cp >= 0x1F300 && cp <= 0x1FAFF) return true;
  // Misc symbols
  if (cp >= 0x2600 && cp <= 0x27BF) return true;
  // Regional indicators
  if (cp >= 0x1F1E0 && cp <= 0x1F1FF) return true;
  // Braille patterns (these are actually single-width in most terminals)
  return false;
}

export function textWidth(str: string): number {
  const clean = stripAnsi(str);
  let width = 0;
  for (const char of clean) {
    const cp = char.codePointAt(0)!;
    width += isWideCodePoint(cp) ? 2 : 1;
  }
  return width;
}

export function padRight(str: string, targetWidth: number): string {
  const currentWidth = textWidth(str);
  const padding = targetWidth - currentWidth;
  if (padding <= 0) return str;
  return str + ' '.repeat(padding);
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run tests/render/
```

Expected: All 12 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/render/colors.ts src/render/progress-bar.ts src/render/text-width.ts tests/render/
git commit -m "feat: add render utilities (colors, progress bar, text width)"
```

---

### Task 9: Animation Frame Selection

**Files:**
- Create: `src/animation.ts`
- Create: `tests/animation.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/animation.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getFrameDuration, selectFrame } from '../src/animation.js';
import type { Phase } from '../src/types.js';
import type { Character, BrailleFrame } from '../src/characters/types.js';

describe('getFrameDuration', () => {
  it('returns 800ms for idle', () => {
    expect(getFrameDuration('idle', 0)).toBe(800);
  });

  it('returns 1000ms for rateLimited', () => {
    expect(getFrameDuration('rateLimited', 1.0)).toBe(1000);
  });

  it('returns faster duration for higher intensity running', () => {
    const slow = getFrameDuration('running', 0.3);
    const fast = getFrameDuration('running', 0.8);
    expect(fast).toBeLessThan(slow);
  });

  it('returns 500ms for heavy', () => {
    expect(getFrameDuration('heavy', 0.5)).toBe(500);
  });

  it('returns 600ms for crushed', () => {
    expect(getFrameDuration('crushed', 0.9)).toBe(600);
  });
});

describe('selectFrame', () => {
  const mockFrames: BrailleFrame[] = [
    { lines: ['frame0'] },
    { lines: ['frame1'] },
    { lines: ['frame2'] },
  ];

  const mockCharacter: Character = {
    name: 'test',
    displayName: { en: 'Test', ko: '테스트', ja: 'テスト', zh: '测试' },
    frames: {
      running: mockFrames,
      idle: [{ lines: ['idle0'] }],
      heavy: mockFrames,
      crushed: mockFrames,
      expensive: mockFrames,
      rateLimited: mockFrames,
    },
    compactFrames: {
      running: ['r0', 'r1', 'r2'],
      idle: ['i0'],
      heavy: ['h0'],
      crushed: ['c0'],
      expensive: ['e0'],
      rateLimited: ['l0'],
    },
  };

  it('selects frame based on timestamp', () => {
    vi.spyOn(Date, 'now').mockReturnValue(0);
    const frame = selectFrame(mockCharacter, 'running', 0.5, 'normal');
    expect(frame.lines[0]).toBe('frame0');
    vi.restoreAllMocks();
  });

  it('cycles through frames over time', () => {
    // At 400ms duration, frame 1 starts at 400ms
    vi.spyOn(Date, 'now').mockReturnValue(400);
    const frame = selectFrame(mockCharacter, 'running', 0.3, 'normal');
    expect(frame.lines[0]).toBe('frame1');
    vi.restoreAllMocks();
  });

  it('returns compact frame for compact mode', () => {
    vi.spyOn(Date, 'now').mockReturnValue(0);
    const frame = selectFrame(mockCharacter, 'running', 0.5, 'compact');
    expect(frame.lines[0]).toBe('r0');
    vi.restoreAllMocks();
  });

  it('falls back to running frames for missing phase', () => {
    const sparseCharacter = {
      ...mockCharacter,
      frames: { ...mockCharacter.frames, expensive: [] },
    };
    vi.spyOn(Date, 'now').mockReturnValue(0);
    const frame = selectFrame(sparseCharacter, 'expensive', 0.5, 'normal');
    expect(frame.lines[0]).toBe('frame0');
    vi.restoreAllMocks();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/animation.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement animation**

```typescript
// src/animation.ts
import type { Phase, DisplayMode } from './types.js';
import type { Character, BrailleFrame } from './characters/types.js';

export function getFrameDuration(phase: Phase, intensity: number): number {
  switch (phase) {
    case 'idle': return 800;
    case 'rateLimited': return 1000;
    case 'heavy': return 500;
    case 'crushed': return 600;
    case 'expensive':
    case 'running': {
      // 150ms at intensity 1.0, 500ms at intensity 0.0
      return Math.round(500 - intensity * 350);
    }
  }
}

export function selectFrame(
  character: Character,
  phase: Phase,
  intensity: number,
  mode: DisplayMode,
): BrailleFrame {
  if (mode === 'compact') {
    const frames = character.compactFrames[phase];
    const pool = frames && frames.length > 0 ? frames : character.compactFrames.running;
    const duration = getFrameDuration(phase, intensity);
    const index = Math.floor(Date.now() / duration) % pool.length;
    return { lines: [pool[index]] };
  }

  const frames = character.frames[phase];
  const pool = frames && frames.length > 0 ? frames : character.frames.running;
  const duration = getFrameDuration(phase, intensity);
  const index = Math.floor(Date.now() / duration) % pool.length;
  return pool[index];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/animation.test.ts
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/animation.ts tests/animation.test.ts
git commit -m "feat: add animation frame selection with state-based timing"
```

---

### Task 10: Character Registry and Builtin Cat

**Files:**
- Create: `src/characters/registry.ts`
- Create: `src/characters/loader.ts`
- Create: `src/characters/builtin/generated/cat.json`
- Create: `tests/characters/registry.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/characters/registry.test.ts
import { describe, it, expect } from 'vitest';
import { getCharacter, listCharacters } from '../../src/characters/registry.js';

describe('character registry', () => {
  it('lists builtin characters', () => {
    const names = listCharacters();
    expect(names).toContain('cat');
  });

  it('returns cat character with all phases', () => {
    const cat = getCharacter('cat');
    expect(cat).not.toBeNull();
    expect(cat!.name).toBe('cat');
    expect(cat!.frames.running.length).toBeGreaterThan(0);
    expect(cat!.frames.idle.length).toBeGreaterThan(0);
    expect(cat!.frames.heavy.length).toBeGreaterThan(0);
    expect(cat!.frames.crushed.length).toBeGreaterThan(0);
    expect(cat!.frames.expensive.length).toBeGreaterThan(0);
    expect(cat!.frames.rateLimited.length).toBeGreaterThan(0);
  });

  it('returns cat compact frames', () => {
    const cat = getCharacter('cat');
    expect(cat!.compactFrames.running.length).toBeGreaterThan(0);
  });

  it('returns null for unknown character', () => {
    expect(getCharacter('nonexistent')).toBeNull();
  });

  it('cat has display names in all locales', () => {
    const cat = getCharacter('cat');
    expect(cat!.displayName.en).toBe('Cat');
    expect(cat!.displayName.ko).toBe('고양이');
    expect(cat!.displayName.ja).toBe('猫');
    expect(cat!.displayName.zh).toBe('猫');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/characters/registry.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create placeholder cat.json with hand-crafted Braille frames**

Create `src/characters/builtin/generated/cat.json`. This is placeholder data — the real sprites will be pixel-art-converted later. These frames are hand-tuned Braille patterns representing a cat in different states:

```json
{
  "name": "cat",
  "displayName": { "en": "Cat", "ko": "고양이", "ja": "猫", "zh": "猫" },
  "frames": {
    "running": [
      { "lines": ["⠀⠀⢀⣀⡀⠀⠀⠀", "⠀⢀⣼⣿⡿⠗⠂", "⠀⠈⠁⠀⠈⠁⠀"] },
      { "lines": ["⠀⠀⢀⣀⡀⠀⠀⠀", "⠀⢀⣼⣿⡿⠗⠂", "⠀⠈⠁⠈⠁⠀⠀"] },
      { "lines": ["⠀⠀⢀⣀⡀⠀⠀⠀", "⠀⢀⣼⣿⡿⠗⠂", "⠈⠁⠀⠀⠈⠁⠀"] },
      { "lines": ["⠀⠀⢀⣀⡀⠀⠀⠀", "⠀⢀⣼⣿⡿⠗⠂", "⠀⠈⠁⠀⠈⠁⠀"] }
    ],
    "idle": [
      { "lines": ["⠀⠀⢀⣀⡀⠀⠀⠀", "⠀⢀⣼⣿⡷⠤⠤", "⠀⠀⠉⠉⠁⠀⠀"], "effects": ["", "", "💤"] },
      { "lines": ["⠀⠀⢀⣀⡀⠀⠀⠀", "⠀⢀⣼⣿⡷⠤⠤", "⠀⠀⠉⠉⠁⠀⠀"], "effects": ["", "💤", ""] }
    ],
    "heavy": [
      { "lines": ["⠀⣀⣤⣀⡀⠀⠀⠀", "⠀⢠⣿⣿⡿⠗⠂", "⠀⠈⠃⠀⠘⠁⠀"], "effects": ["📦", "", ""] },
      { "lines": ["⣠⣤⣤⣀⡀⠀⠀⠀", "⠀⢠⣿⣿⡿⠗⠂", "⠀⠈⠃⠘⠁⠀⠀"], "effects": ["📦", "", ""] },
      { "lines": ["⣤⣤⣤⣀⡀⠀⠀⠀", "⠀⢠⣿⣿⡿⠗⠂", "⠈⠃⠀⠀⠘⠁⠀"], "effects": ["📦📦", "", ""] }
    ],
    "crushed": [
      { "lines": ["⣤⣤⣤⣤⣤⡀⠀⠀", "⠀⠀⣿⣿⣿⠗⠂", "⠀⠀⠃⠀⠘⠀⠀"], "effects": ["📦📦📦", "", ""] },
      { "lines": ["⣤⣤⣤⣤⣤⡀⠀⠀", "⠀⠀⣿⣿⣿⠗⠂", "⠀⠈⠃⠘⠁⠀⠀"], "effects": ["📦📦📦", "", ""] }
    ],
    "expensive": [
      { "lines": ["⠀⠀⢀⣀⡀⠀⠀⠀", "⠀⢀⣼⣿⡿⠗⠂", "⠀⠈⠁⠀⠈⠁⠀"], "effects": ["💸", "", ""] },
      { "lines": ["⠀⠀⢀⣀⡀⠀⠀⠀", "⠀⢀⣼⣿⡿⠗⠂", "⠀⠈⠁⠈⠁⠀⠀"], "effects": ["", "💸", ""] },
      { "lines": ["⠀⠀⢀⣀⡀⠀⠀⠀", "⠀⢀⣼⣿⡿⠗⠂", "⠈⠁⠀⠀⠈⠁⠀"], "effects": ["💸", "💸", ""] }
    ],
    "rateLimited": [
      { "lines": ["⠀⠀⢀⣀⡀⠀⠀⠀", "⠀⢀⣼⣿⡿⠗⠂", "⠀⠈⠁⠀⠈⠁⠀"], "effects": ["", "", "🧱"] },
      { "lines": ["⠀⠀⢀⣀⡀⠀⠀⠀", "⠀⢀⣼⣿⡗⠂⠀", "⠀⠈⠁⠀⠁⠀⠀"], "effects": ["", "🧱", "✦"] },
      { "lines": ["⠀⠀⢀⣀⡀⠀⠀⠀", "⠀⢀⣼⣿⡿⠗⠂", "⠀⠈⠁⠀⠈⠁⠀"], "effects": ["", "", "🧱"] }
    ]
  },
  "compactFrames": {
    "running": ["🐱", "🐱", "🐱", "🐱"],
    "idle": ["😺", "😺"],
    "heavy": ["😿", "😿"],
    "crushed": ["🙀", "🙀"],
    "expensive": ["😿", "😿"],
    "rateLimited": ["🙀", "🙀"]
  }
}
```

- [ ] **Step 4: Implement registry and loader**

```typescript
// src/characters/loader.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Character } from './types.js';

export function loadCharacterFromFile(filePath: string): Character | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Character;
  } catch {
    return null;
  }
}

export function loadCustomCharacters(dirPath: string): Character[] {
  const resolved = dirPath.replace(/^~/, process.env.HOME || '');
  try {
    const files = fs.readdirSync(resolved).filter(f => f.endsWith('.json'));
    return files
      .map(f => loadCharacterFromFile(path.join(resolved, f)))
      .filter((c): c is Character => c !== null);
  } catch {
    return [];
  }
}
```

```typescript
// src/characters/registry.ts
import type { Character } from './types.js';
import { loadCustomCharacters } from './loader.js';
import catData from './builtin/generated/cat.json' with { type: 'json' };

const builtinCharacters: Character[] = [
  catData as Character,
];

let customCharacters: Character[] = [];

export function initCustomCharacters(customDir: string): void {
  customCharacters = loadCustomCharacters(customDir);
}

export function listCharacters(): string[] {
  return [...builtinCharacters, ...customCharacters].map(c => c.name);
}

export function getCharacter(name: string): Character | null {
  return [...builtinCharacters, ...customCharacters].find(c => c.name === name) ?? null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/characters/registry.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/characters/ tests/characters/
git commit -m "feat: add character registry with builtin cat"
```

---

### Task 11: Compact Renderer

**Files:**
- Create: `src/render/compact.ts`
- Create: `tests/render/compact.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/render/compact.test.ts
import { describe, it, expect } from 'vitest';
import { renderCompact } from '../../src/render/compact.js';
import type { StdinData, SessionState } from '../../src/types.js';
import type { BrailleFrame } from '../../src/characters/types.js';

const mockData: StdinData = {
  model: { id: 'test', display_name: 'Opus' },
  context_window: {
    total_input_tokens: 0, total_output_tokens: 0,
    context_window_size: 200000, used_percentage: 45,
    remaining_percentage: 55, current_usage: null,
  },
  cost: { total_cost_usd: 1.2, total_duration_ms: 300000, total_api_duration_ms: 120000, total_lines_added: 0, total_lines_removed: 0 },
  rate_limits: {
    five_hour: { used_percentage: 12, resets_at: '' },
    seven_day: { used_percentage: 3, resets_at: '' },
  },
  workspace: { current_dir: '/test', project_dir: '/test' },
};

const mockState: SessionState = { phase: 'running', intensity: 0.5, alerts: [] };
const mockFrame: BrailleFrame = { lines: ['🐱'] };
const t = (key: string) => key === 'context' ? 'Context' : key;

describe('renderCompact', () => {
  it('renders single line with all elements', () => {
    const lines = renderCompact(mockData, mockState, mockFrame, t);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Opus');
    expect(lines[0]).toContain('🟢');
    expect(lines[0]).toContain('45%');
    expect(lines[0]).toContain('$1.20');
  });

  it('includes character frame', () => {
    const lines = renderCompact(mockData, mockState, mockFrame, t);
    expect(lines[0]).toContain('🐱');
  });

  it('shows rate limit warning when alert present', () => {
    const stateWithAlert: SessionState = { ...mockState, alerts: ['rateLimitApproaching'] };
    const lines = renderCompact(mockData, stateWithAlert, mockFrame, t);
    expect(lines[0]).toContain('⚠️');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/render/compact.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement compact renderer**

```typescript
// src/render/compact.ts
import type { StdinData, SessionState } from '../types.js';
import type { BrailleFrame } from '../characters/types.js';
import { progressBar } from './progress-bar.js';
import { colorize, contextColor, trafficLight } from './colors.js';

export function renderCompact(
  data: StdinData,
  state: SessionState,
  frame: BrailleFrame,
  t: (key: string) => string,
): string[] {
  const pct = Math.round(data.context_window.used_percentage);
  const light = trafficLight(pct, state.phase === 'idle');
  const bar = progressBar(pct, 8);
  const barColored = colorize(bar, contextColor(pct));
  let cost = `$${data.cost.total_cost_usd.toFixed(2)}`;
  const model = `[${data.model.display_name}]`;
  const char = frame.lines[0] || '';

  let rateLimits = `5h:${Math.round(data.rate_limits.five_hour.used_percentage)}%`;
  rateLimits += ` 7d:${Math.round(data.rate_limits.seven_day.used_percentage)}%`;
  if (state.alerts.includes('rateLimitApproaching')) {
    rateLimits += ' ⚠️';
  }
  if (state.alerts.includes('costSpike')) {
    cost += ' 💸';
  }

  const line = `${char} ${model} ${light} ${barColored} ${pct}% | ${cost} | ${rateLimits}`;
  return [line];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/render/compact.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/compact.ts tests/render/compact.test.ts
git commit -m "feat: add compact (1-line) renderer"
```

---

### Task 12: Normal Renderer

**Files:**
- Create: `src/render/normal.ts`
- Create: `tests/render/normal.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/render/normal.test.ts
import { describe, it, expect } from 'vitest';
import { renderNormal } from '../../src/render/normal.js';
import type { StdinData, SessionState } from '../../src/types.js';
import type { BrailleFrame } from '../../src/characters/types.js';

const mockData: StdinData = {
  model: { id: 'test', display_name: 'Opus' },
  context_window: {
    total_input_tokens: 0, total_output_tokens: 0,
    context_window_size: 200000, used_percentage: 78,
    remaining_percentage: 22, current_usage: null,
  },
  cost: { total_cost_usd: 2.4, total_duration_ms: 900000, total_api_duration_ms: 400000, total_lines_added: 50, total_lines_removed: 10 },
  rate_limits: {
    five_hour: { used_percentage: 35, resets_at: '' },
    seven_day: { used_percentage: 8, resets_at: '' },
  },
  workspace: { current_dir: '/home/user/my-project', project_dir: '/home/user/my-project' },
};

const mockState: SessionState = { phase: 'heavy', intensity: 0.4, alerts: ['contextWarning'] };
const mockFrame: BrailleFrame = {
  lines: ['⠀⢀⣴⣧⠀⠀', '⢾⣿⣿⣿⡷⠀', '⠀⠟⠀⠻⠀⠀'],
  effects: ['📦', '', ''],
};
const t = (key: string) => {
  const map: Record<string, string> = { context: 'Context', cost: 'Cost', burnRate: 'Burn' };
  return map[key] || key;
};

describe('renderNormal', () => {
  it('renders 3 lines (character height)', () => {
    const lines = renderNormal(mockData, mockState, mockFrame, t);
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it('includes model name on first info line', () => {
    const lines = renderNormal(mockData, mockState, mockFrame, t);
    const infoContent = lines.join('\n');
    expect(infoContent).toContain('Opus');
  });

  it('includes project name on second info line', () => {
    const lines = renderNormal(mockData, mockState, mockFrame, t);
    const infoContent = lines.join('\n');
    expect(infoContent).toContain('my-project');
  });

  it('includes burn rate', () => {
    const lines = renderNormal(mockData, mockState, mockFrame, t);
    const infoContent = lines.join('\n');
    expect(infoContent).toContain('$0.16/m'); // $2.4 / 15min = $0.16/min
  });

  it('includes character frame on left', () => {
    const lines = renderNormal(mockData, mockState, mockFrame, t);
    expect(lines[0]).toContain('⠀⢀⣴⣧⠀⠀');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/render/normal.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement normal renderer**

```typescript
// src/render/normal.ts
import type { StdinData, SessionState } from '../types.js';
import type { BrailleFrame } from '../characters/types.js';
import { progressBar } from './progress-bar.js';
import { colorize, contextColor, trafficLight } from './colors.js';
import { padRight, textWidth } from './text-width.js';
import * as path from 'node:path';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  return `${hours}h${remainMin > 0 ? remainMin + 'm' : ''}`;
}

export function renderNormal(
  data: StdinData,
  state: SessionState,
  frame: BrailleFrame,
  t: (key: string) => string,
): string[] {
  const pct = Math.round(data.context_window.used_percentage);
  const light = trafficLight(pct, state.phase === 'idle');
  const bar = progressBar(pct, 10);
  const barColored = colorize(bar, contextColor(pct));
  const cost = `$${data.cost.total_cost_usd.toFixed(2)}`;
  const model = `[${data.model.display_name}]`;
  const rateLimits = `5h:${Math.round(data.rate_limits.five_hour.used_percentage)}%`;
  const projectName = path.basename(data.workspace.project_dir || data.workspace.current_dir);
  const duration = formatDuration(data.cost.total_duration_ms);
  const burnRateVal = data.cost.total_duration_ms > 0
    ? data.cost.total_cost_usd / (data.cost.total_duration_ms / 60000)
    : 0;
  const burnRate = `$${burnRateVal.toFixed(2)}/m`;

  let rateLimitStr = rateLimits;
  if (state.alerts.includes('rateLimitApproaching')) {
    rateLimitStr += ' ⚠️';
  }

  const line1 = `${model} ${light} ${barColored} ${pct}% | ${cost} | ${rateLimitStr}`;
  const line2 = `${projectName} | ${duration} | ${burnRate}`;

  // Combine character lines with info lines
  const charLines = frame.lines;
  const effects = frame.effects || [];
  const charWidth = charLines.reduce((max, l) => Math.max(max, textWidth(l)), 0);
  const separator = '  ';
  const infoLines = [line1, line2];
  const outputLines: string[] = [];

  const maxLines = Math.max(charLines.length, infoLines.length);
  for (let i = 0; i < maxLines; i++) {
    const charPart = i < charLines.length ? padRight(charLines[i], charWidth) : ' '.repeat(charWidth);
    const effectPart = i < effects.length && effects[i] ? effects[i] : '';
    const infoPart = i < infoLines.length ? infoLines[i] : '';
    outputLines.push(`${charPart}${effectPart}${separator}${infoPart}`);
  }

  return outputLines;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/render/normal.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/normal.ts tests/render/normal.test.ts
git commit -m "feat: add normal (2-line + character) renderer"
```

---

### Task 13: Detailed Renderer

**Files:**
- Create: `src/render/detailed.ts`
- Create: `tests/render/detailed.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/render/detailed.test.ts
import { describe, it, expect } from 'vitest';
import { renderDetailed } from '../../src/render/detailed.js';
import type { StdinData, SessionState } from '../../src/types.js';
import type { BrailleFrame } from '../../src/characters/types.js';

const mockData: StdinData = {
  model: { id: 'claude-opus-4-6', display_name: 'Opus 4.6' },
  context_window: {
    total_input_tokens: 42000, total_output_tokens: 8000,
    context_window_size: 200000, used_percentage: 78,
    remaining_percentage: 22,
    current_usage: {
      input_tokens: 42000, output_tokens: 8000,
      cache_creation_input_tokens: 5000, cache_read_input_tokens: 38000,
    },
  },
  cost: { total_cost_usd: 2.4, total_duration_ms: 932000, total_api_duration_ms: 400000, total_lines_added: 150, total_lines_removed: 30 },
  rate_limits: {
    five_hour: { used_percentage: 35, resets_at: '2026-03-25T22:00:00Z' },
    seven_day: { used_percentage: 8, resets_at: '2026-03-31T00:00:00Z' },
  },
  workspace: { current_dir: '/home/user/my-project', project_dir: '/home/user/my-project' },
};

const mockState: SessionState = { phase: 'heavy', intensity: 0.4, alerts: ['contextWarning'] };
const mockFrame: BrailleFrame = {
  lines: ['⠀⢀⣴⣧⠀⠀', '⢾⣿⣿⣿⡷⠀', '⠀⠟⠀⠻⠀⠀'],
};
const t = (key: string) => {
  const map: Record<string, string> = {
    context: 'Context', cost: 'Cost', burnRate: 'Burn',
    depletion: 'Depletion', budget: 'Budget',
  };
  return map[key] || key;
};

describe('renderDetailed', () => {
  it('renders 6 lines', () => {
    const lines = renderDetailed(mockData, mockState, mockFrame, t);
    expect(lines).toHaveLength(6);
  });

  it('rows 1-3 have character on left', () => {
    const lines = renderDetailed(mockData, mockState, mockFrame, t);
    expect(lines[0]).toContain('⠀⢀⣴⣧⠀⠀');
    expect(lines[1]).toContain('⢾⣿⣿⣿⡷⠀');
    expect(lines[2]).toContain('⠀⠟⠀⠻⠀⠀');
  });

  it('rows 4-6 are full width (no character column)', () => {
    const lines = renderDetailed(mockData, mockState, mockFrame, t);
    // Rows 4-6 should not start with braille character padding
    expect(lines[3]).not.toMatch(/^⠀/);
  });

  it('includes token breakdown', () => {
    const lines = renderDetailed(mockData, mockState, mockFrame, t);
    const all = lines.join('\n');
    expect(all).toContain('In:42K');
    expect(all).toContain('Out:8K');
  });

  it('includes rate limits with bar', () => {
    const lines = renderDetailed(mockData, mockState, mockFrame, t);
    const all = lines.join('\n');
    expect(all).toContain('5h:35%');
    expect(all).toContain('7d:8%');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/render/detailed.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement detailed renderer**

```typescript
// src/render/detailed.ts
import type { StdinData, SessionState } from '../types.js';
import type { BrailleFrame } from '../characters/types.js';
import { progressBar } from './progress-bar.js';
import { colorize, contextColor, trafficLight } from './colors.js';
import { padRight, textWidth } from './text-width.js';
import * as path from 'node:path';

function formatTokens(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return `${n}`;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m${seconds > 0 ? seconds + 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  return `${hours}h${remainMin > 0 ? remainMin + 'm' : ''}`;
}

export function renderDetailed(
  data: StdinData,
  state: SessionState,
  frame: BrailleFrame,
  t: (key: string) => string,
): string[] {
  const pct = Math.round(data.context_window.used_percentage);
  const light = trafficLight(pct, state.phase === 'idle');
  const bar = progressBar(pct, 10);
  const barColored = colorize(bar, contextColor(pct));
  const cost = `$${data.cost.total_cost_usd.toFixed(2)}`;
  const model = `[${data.model.display_name}]`;
  const projectName = path.basename(data.workspace.project_dir || data.workspace.current_dir);
  const duration = formatDuration(data.cost.total_duration_ms);
  const burnRateVal = data.cost.total_duration_ms > 0
    ? data.cost.total_cost_usd / (data.cost.total_duration_ms / 60000)
    : 0;
  const burnRate = `$${burnRateVal.toFixed(2)}/m`;

  // Depletion estimate (minutes remaining at current burn rate)
  let depletionStr = '—';
  if (burnRateVal > 0) {
    // Rough estimate based on remaining context percentage
    const remainPct = data.context_window.remaining_percentage;
    const usedCostPerPct = data.cost.total_cost_usd / Math.max(pct, 1);
    const remainCost = usedCostPerPct * remainPct;
    const remainMin = remainCost / burnRateVal;
    depletionStr = `~${Math.round(remainMin)}m`;
  }

  const cacheHitPct = data.context_window.current_usage
    ? Math.round(
        (data.context_window.current_usage.cache_read_input_tokens /
          Math.max(data.context_window.current_usage.input_tokens, 1)) *
          100,
      )
    : 0;

  // Rows 1-3: character (left) + info (right)
  const infoLine1 = `${model} ${light} ${barColored} ${pct}% | ${cost}`;
  const infoLine2 = `${projectName} | ${duration}`;
  const infoLine3 = `${t('burnRate')}: ${burnRate} | ${t('depletion')}: ${depletionStr}`;

  const charLines = frame.lines;
  const effects = frame.effects || [];
  const charWidth = charLines.reduce((max, l) => Math.max(max, textWidth(l)), 0);
  const sep = '  ';
  const topInfoLines = [infoLine1, infoLine2, infoLine3];

  const topRows: string[] = [];
  const maxTop = Math.max(charLines.length, topInfoLines.length);
  for (let i = 0; i < maxTop; i++) {
    const charPart = i < charLines.length ? padRight(charLines[i], charWidth) : ' '.repeat(charWidth);
    const effectPart = i < effects.length && effects[i] ? effects[i] : '';
    const infoPart = i < topInfoLines.length ? topInfoLines[i] : '';
    topRows.push(`${charPart}${effectPart}${sep}${infoPart}`);
  }

  // Rows 4-6: full width
  const fiveHr = `5h:${Math.round(data.rate_limits.five_hour.used_percentage)}%`;
  const sevenDay = `7d:${Math.round(data.rate_limits.seven_day.used_percentage)}%`;
  const rateLimitBar = progressBar(data.rate_limits.five_hour.used_percentage, 5);
  let row4 = `${fiveHr} ${rateLimitBar} | ${sevenDay} | Cache:${cacheHitPct}%`;
  if (state.alerts.includes('rateLimitApproaching')) {
    row4 += ' ⚠️';
  }

  const usage = data.context_window.current_usage;
  const inTok = usage ? formatTokens(usage.input_tokens) : '0';
  const outTok = usage ? formatTokens(usage.output_tokens) : '0';
  const cacheTok = usage ? formatTokens(usage.cache_read_input_tokens) : '0';
  const row5 = `In:${inTok} Out:${outTok} Cache↺:${cacheTok}`;

  const linesAdded = `+${data.cost.total_lines_added}`;
  const linesRemoved = `-${data.cost.total_lines_removed}`;
  const row6 = `${linesAdded}/${linesRemoved} lines`;

  return [...topRows.slice(0, 3), row4, row5, row6];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/render/detailed.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/detailed.ts tests/render/detailed.test.ts
git commit -m "feat: add detailed (6-line) renderer"
```

---

### Task 14: Render Dispatcher

**Files:**
- Create: `src/render/index.ts`

- [ ] **Step 1: Create render dispatcher**

```typescript
// src/render/index.ts
import type { StdinData, SessionState, DisplayMode } from '../types.js';
import type { BrailleFrame } from '../characters/types.js';
import { renderCompact } from './compact.js';
import { renderNormal } from './normal.js';
import { renderDetailed } from './detailed.js';

export function render(
  mode: DisplayMode,
  data: StdinData,
  state: SessionState,
  frame: BrailleFrame,
  t: (key: string) => string,
): string[] {
  switch (mode) {
    case 'compact': return renderCompact(data, state, frame, t);
    case 'normal': return renderNormal(data, state, frame, t);
    case 'detailed': return renderDetailed(data, state, frame, t);
  }
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/render/index.ts
git commit -m "feat: add render mode dispatcher"
```

---

### Task 15: Entry Point (index.ts) and Integration Test

**Files:**
- Create: `src/index.ts`
- Create: `tests/integration.test.ts`

- [ ] **Step 1: Write the failing integration test**

```typescript
// tests/integration.test.ts
import { describe, it, expect } from 'vitest';
import { run } from '../src/index.js';

const validInput = JSON.stringify({
  model: { id: 'claude-opus-4-6', display_name: 'Opus 4.6' },
  context_window: {
    total_input_tokens: 42000, total_output_tokens: 8000,
    context_window_size: 200000, used_percentage: 45,
    remaining_percentage: 55,
    current_usage: { input_tokens: 42000, output_tokens: 8000, cache_creation_input_tokens: 5000, cache_read_input_tokens: 38000 },
  },
  cost: { total_cost_usd: 1.23, total_duration_ms: 300000, total_api_duration_ms: 120000, total_lines_added: 50, total_lines_removed: 10 },
  rate_limits: {
    five_hour: { used_percentage: 12, resets_at: '' },
    seven_day: { used_percentage: 3, resets_at: '' },
  },
  workspace: { current_dir: '/home/user/my-project', project_dir: '/home/user/my-project' },
});

describe('integration', () => {
  it('produces output for compact mode', () => {
    const output = run(validInput, { displayMode: 'compact' });
    expect(output.length).toBeGreaterThan(0);
    expect(output).toContain('Opus 4.6');
    expect(output).toContain('45%');
  });

  it('produces output for normal mode', () => {
    const output = run(validInput, { displayMode: 'normal' });
    expect(output).toContain('Opus 4.6');
    expect(output).toContain('my-project');
  });

  it('produces output for detailed mode', () => {
    const output = run(validInput, { displayMode: 'detailed' });
    expect(output).toContain('Opus 4.6');
    expect(output).toContain('In:42K');
  });

  it('handles empty input gracefully', () => {
    const output = run('', { displayMode: 'compact' });
    expect(output.length).toBeGreaterThan(0);
  });

  it('handles malformed JSON gracefully', () => {
    const output = run('not json', { displayMode: 'compact' });
    expect(output.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/integration.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement entry point**

```typescript
// src/index.ts
import { parseStdin } from './parser.js';
import { loadConfig, DEFAULT_CONFIG } from './config.js';
import { determineState } from './state.js';
import { isIdle } from './idle-cache.js';
import { selectFrame } from './animation.js';
import { getCharacter, initCustomCharacters } from './characters/registry.js';
import { detectLocale, createTranslator } from './i18n/index.js';
import { render } from './render/index.js';
import type { Config, DisplayMode } from './types.js';
import * as os from 'node:os';
import * as path from 'node:path';

const CONFIG_PATH = path.join(os.homedir(), '.claude-runcat', 'config.json');
const IDLE_CACHE_PATH = path.join(os.tmpdir(), 'claude-runcat-idle-cache');

export function run(stdinRaw: string, overrides?: Partial<Config>): string {
  const config = loadConfig(CONFIG_PATH, overrides);
  const data = parseStdin(stdinRaw);
  const idle = isIdle(data.cost.total_api_duration_ms, IDLE_CACHE_PATH);
  const state = determineState(data, config.thresholds, idle);

  initCustomCharacters(config.customCharactersDir);
  const character = getCharacter(config.character) || getCharacter('cat')!;

  const locale = detectLocale(config.locale);
  const t = createTranslator(locale);

  const displayMode = config.displayMode;
  const frame = config.animation.enabled
    ? selectFrame(character, state.phase, state.intensity, displayMode)
    : { lines: [''] };

  const lines = render(displayMode, data, state, frame, t);
  return lines.join('\n');
}

// CLI entry point: read stdin, write stdout
async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const stdinRaw = Buffer.concat(chunks).toString('utf-8');
  const output = run(stdinRaw);
  process.stdout.write(output + '\n');
}

// Only run main when executed directly (not imported for tests)
const isDirectRun = process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('claude-runcat');
if (isDirectRun) {
  main().catch((err) => {
    process.stderr.write(`claude-runcat error: ${err.message}\n`);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run integration tests**

```bash
npx vitest run tests/integration.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 6: Build and verify binary works**

```bash
npx tsup
echo '{"model":{"display_name":"Opus 4.6"},"context_window":{"used_percentage":45},"cost":{"total_cost_usd":1.23,"total_duration_ms":300000,"total_api_duration_ms":120000},"rate_limits":{"five_hour":{"used_percentage":12},"seven_day":{"used_percentage":3}},"workspace":{"current_dir":"/test"}}' | node dist/index.js
```

Expected: Colored statusline output with cat animation.

- [ ] **Step 7: Commit**

```bash
git add src/index.ts tests/integration.test.ts
git commit -m "feat: add entry point and integration tests"
```

---

### Task 16: Pixel Art Converter (build-time tool)

**Files:**
- Create: `src/characters/converter.ts`
- Create: `scripts/generate-characters.ts`
- Create: `tests/characters/converter.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/characters/converter.test.ts
import { describe, it, expect } from 'vitest';
import { pixelsToBraille } from '../../src/characters/converter.js';

describe('pixelsToBraille', () => {
  it('converts empty 2x4 grid to blank braille', () => {
    // 2 wide x 4 tall = 1 braille character
    const pixels = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    expect(pixelsToBraille(pixels)).toBe('⠀');
  });

  it('converts full 2x4 grid to full braille', () => {
    const pixels = [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1],
    ];
    expect(pixelsToBraille(pixels)).toBe('⣿');
  });

  it('converts top-left dot only', () => {
    const pixels = [
      [1, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    expect(pixelsToBraille(pixels)).toBe('⠁');
  });

  it('converts 4x8 grid to 2 braille characters', () => {
    // 4 wide = 2 braille chars, 8 tall = 2 rows
    const pixels = Array.from({ length: 8 }, () => [1, 1, 1, 1]);
    const result = pixelsToBraille(pixels);
    expect(result).toBe('⣿⣿\n⣿⣿');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/characters/converter.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement converter**

```typescript
// src/characters/converter.ts

// Braille dot positions: each char is 2 wide x 4 tall
// Dot numbering and bit values:
// (0,0)=0x01  (1,0)=0x08
// (0,1)=0x02  (1,1)=0x10
// (0,2)=0x04  (1,2)=0x20
// (0,3)=0x40  (1,3)=0x80
const BRAILLE_OFFSET = 0x2800;
const DOT_MAP: number[][] = [
  [0x01, 0x08],  // row 0
  [0x02, 0x10],  // row 1
  [0x04, 0x20],  // row 2
  [0x40, 0x80],  // row 3
];

/**
 * Convert a 2D pixel grid (0/1 values) to Braille text.
 * Grid is [row][col], where each cell is 0 (off) or 1 (on).
 * Width must be even, height must be multiple of 4.
 */
export function pixelsToBraille(pixels: number[][]): string {
  const height = pixels.length;
  const width = pixels[0]?.length || 0;

  // Pad to multiples of 4 (height) and 2 (width)
  const paddedHeight = Math.ceil(height / 4) * 4;
  const paddedWidth = Math.ceil(width / 2) * 2;

  const rows: string[] = [];

  for (let cellRow = 0; cellRow < paddedHeight; cellRow += 4) {
    let line = '';
    for (let cellCol = 0; cellCol < paddedWidth; cellCol += 2) {
      let bits = 0;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const y = cellRow + dy;
          const x = cellCol + dx;
          if (y < height && x < width && pixels[y][x]) {
            bits |= DOT_MAP[dy][dx];
          }
        }
      }
      line += String.fromCodePoint(BRAILLE_OFFSET + bits);
    }
    rows.push(line);
  }

  return rows.join('\n');
}

/**
 * Convert a PNG image buffer to Braille text.
 * Uses sharp to read the image as grayscale, threshold at 128.
 */
export async function imageToBraille(imageBuffer: Buffer, threshold = 128): Promise<string> {
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(imageBuffer)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels: number[][] = [];
  for (let y = 0; y < info.height; y++) {
    const row: number[] = [];
    for (let x = 0; x < info.width; x++) {
      // Invert: dark pixels = on (for silhouettes on transparent bg)
      row.push(data[y * info.width + x] < threshold ? 1 : 0);
    }
    pixels.push(row);
  }
  return pixelsToBraille(pixels);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/characters/converter.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Create generate-characters script**

```typescript
// scripts/generate-characters.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import { imageToBraille } from '../src/characters/converter.js';
import type { Character, BrailleFrame } from '../src/characters/types.js';
import type { Phase } from '../src/types.js';

const SPRITES_DIR = path.join(__dirname, '..', 'src', 'characters', 'builtin', 'sprites');
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'characters', 'builtin', 'generated');

const PHASES: Phase[] = ['running', 'idle', 'heavy', 'crushed', 'expensive', 'rateLimited'];

async function generateCharacter(name: string, displayName: Record<string, string>): Promise<void> {
  const spriteDir = path.join(SPRITES_DIR, name);
  if (!fs.existsSync(spriteDir)) {
    console.log(`  Skipping ${name}: no sprites directory`);
    return;
  }

  const frames: Record<string, BrailleFrame[]> = {};
  const compactFrames: Record<string, string[]> = {};

  for (const phase of PHASES) {
    frames[phase] = [];
    compactFrames[phase] = [];

    // Find all frames for this phase: phase-0.png, phase-1.png, etc.
    let i = 0;
    while (true) {
      const file = path.join(spriteDir, `${phase}-${i}.png`);
      if (!fs.existsSync(file)) break;
      const buf = fs.readFileSync(file);
      const braille = await imageToBraille(buf);
      const lines = braille.split('\n');
      frames[phase].push({ lines });
      // Compact: use first character of first line
      compactFrames[phase].push(lines[0]?.[0] || '⠀');
      i++;
    }

    // Fallback to running if phase has no frames
    if (frames[phase].length === 0 && phase !== 'running') {
      frames[phase] = frames.running || [];
      compactFrames[phase] = compactFrames.running || [];
    }
  }

  const character: Character = {
    name,
    displayName: displayName as any,
    frames: frames as any,
    compactFrames: compactFrames as any,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `${name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(character, null, 2));
  console.log(`  Generated ${outPath}`);
}

async function main() {
  console.log('Generating character data from sprites...');
  await generateCharacter('cat', { en: 'Cat', ko: '고양이', ja: '猫', zh: '猫' });
  // Add more characters here as sprites are created:
  // await generateCharacter('robot', { en: 'Robot', ko: '로봇', ja: 'ロボット', zh: '机器人' });
  // await generateCharacter('bird', { en: 'Bird', ko: '새', ja: '鳥', zh: '鸟' });
  // await generateCharacter('runner', { en: 'Runner', ko: '달리는 사람', ja: 'ランナー', zh: '跑步者' });
  console.log('Done!');
}

main().catch(console.error);
```

- [ ] **Step 6: Commit**

```bash
git add src/characters/converter.ts scripts/generate-characters.ts tests/characters/converter.test.ts
git commit -m "feat: add pixel art to Braille converter and character generation script"
```

---

### Task 17: Plugin Manifest and Setup Command

**Files:**
- Create: `plugin/plugin.json`
- Create: `plugin/setup.ts`
- Create: `plugin/add-character.ts`
- Create: `plugin/configure.ts`

- [ ] **Step 1: Create plugin.json**

```json
{
  "name": "claude-runcat",
  "version": "0.1.0",
  "description": "Animated statusline with RunCat-style character animations",
  "commands": {
    "setup": {
      "description": "Initial setup wizard: select language, character, display mode, and register statusline",
      "script": "setup.ts"
    },
    "add-character": {
      "description": "Convert custom pixel art sprites to Braille character frames",
      "script": "add-character.ts"
    },
    "configure": {
      "description": "Change claude-runcat settings (mode, character, thresholds)",
      "script": "configure.ts"
    }
  }
}
```

- [ ] **Step 2: Create setup.ts**

```typescript
// plugin/setup.ts
// This is a Claude Code plugin slash command handler.
// It outputs instructions for Claude to interactively guide the user through setup.

export default function setup() {
  return `
## claude-runcat Setup

Help the user configure claude-runcat step by step:

1. **Language**: Ask the user to choose: en / ko / ja / zh / auto (detect from system)
2. **Character**: Ask the user to choose: 🐱 Cat / 🤖 Robot / 🐦 Bird / 🏃 Runner
   - Also mention they can add custom characters later with /claude-runcat:add-character
3. **Display Mode**: Ask the user to choose: compact (1 line) / normal (2 lines) / detailed (6 lines)
4. **Save config**: Write choices to ~/.claude-runcat/config.json
5. **Register statusline**: Add to ~/.claude/settings.json:
   \`\`\`json
   { "statusLine": { "type": "command", "command": "npx claude-runcat" } }
   \`\`\`
6. Tell the user to restart Claude Code to see the statusline.
`;
}
```

- [ ] **Step 3: Create add-character.ts**

```typescript
// plugin/add-character.ts

export default function addCharacter() {
  return `
## claude-runcat: Add Custom Character

Help the user add a custom pixel art character:

1. **Ask for sprite folder path**: The folder should contain PNG files named by phase:
   - running-0.png, running-1.png, ... (required, at least 1)
   - idle-0.png, idle-1.png, ... (optional, falls back to running)
   - heavy-0.png, heavy-1.png, ... (optional)
   - crushed-0.png, ... (optional)
   - expensive-0.png, ... (optional)
   - rateLimited-0.png, ... (optional)

   Sprite size: 20×12px, PNG, transparent background, dark silhouette.

2. **Ask for character name**: A short identifier (e.g., "dino", "penguin")

3. **Run conversion**: Execute:
   \`\`\`bash
   npx claude-runcat convert <sprite-folder-path> --name <character-name> --output ~/.claude-runcat/characters/<name>.json
   \`\`\`

4. **Update config**: Set the new character as active in ~/.claude-runcat/config.json if the user wants.

5. Tell the user to restart Claude Code or wait for the next statusline refresh.
`;
}
```

- [ ] **Step 4: Create configure.ts**

```typescript
// plugin/configure.ts

export default function configure() {
  return `
## claude-runcat: Configure

Help the user change claude-runcat settings. Read the current config from ~/.claude-runcat/config.json, show current values, and ask what they want to change:

- **locale**: en / ko / ja / zh / auto
- **displayMode**: compact / normal / detailed
- **character**: cat / robot / bird / runner (or any custom character name)
- **thresholds.heavyContext**: Context % for "heavy" state (default: 70)
- **thresholds.crushedContext**: Context % for "crushed" state (default: 90)
- **thresholds.expensiveBurnRate**: $/min threshold for "expensive" state (default: 0.10)
- **thresholds.rateLimitWarning**: Rate limit % for warning (default: 80)
- **animation.enabled**: true / false

After changes, update ~/.claude-runcat/config.json. Changes take effect on next statusline refresh.
`;
}
```

- [ ] **Step 5: Commit**

```bash
git add plugin/
git commit -m "feat: add Claude Code plugin with setup, add-character, configure commands"
```

---

### Task 18: CLI Convert Subcommand

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add convert subcommand to entry point**

Update `src/index.ts` to handle `claude-runcat convert <path>` CLI usage. Add before the `main()` function:

```typescript
async function convertCommand(args: string[]) {
  const spritePath = args[0];
  const nameIdx = args.indexOf('--name');
  const name = nameIdx >= 0 ? args[nameIdx + 1] : path.basename(spritePath || '');
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx >= 0
    ? args[outputIdx + 1]
    : path.join(os.homedir(), '.claude-runcat', 'characters', `${name}.json`);

  if (!spritePath) {
    console.error('Usage: claude-runcat convert <sprite-folder> [--name <name>] [--output <path>]');
    process.exit(1);
  }

  const { imageToBraille } = await import('./characters/converter.js');
  const phases: Phase[] = ['running', 'idle', 'heavy', 'crushed', 'expensive', 'rateLimited'];
  const frames: Record<string, any[]> = {};
  const compactFrames: Record<string, string[]> = {};

  for (const phase of phases) {
    frames[phase] = [];
    compactFrames[phase] = [];
    let i = 0;
    while (true) {
      const file = path.join(spritePath, `${phase}-${i}.png`);
      if (!fs.existsSync(file)) break;
      const buf = fs.readFileSync(file);
      const braille = await imageToBraille(buf);
      const lines = braille.split('\n');
      frames[phase].push({ lines });
      compactFrames[phase].push(lines[0]?.[0] || '⠀');
      i++;
    }
    if (frames[phase].length === 0 && phase !== 'running') {
      frames[phase] = frames.running || [];
      compactFrames[phase] = compactFrames.running || [];
    }
  }

  if (!frames.running || frames.running.length === 0) {
    console.error('Error: No running-*.png sprites found in', spritePath);
    process.exit(1);
  }

  const character = {
    name,
    displayName: { en: name, ko: name, ja: name, zh: name },
    frames,
    compactFrames,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(character, null, 2));
  console.log(`Character "${name}" saved to ${outputPath}`);
}
```

Update the bottom of `src/index.ts` to dispatch:

```typescript
const isDirectRun = process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('claude-runcat');
if (isDirectRun) {
  const subcommand = process.argv[2];
  if (subcommand === 'convert') {
    convertCommand(process.argv.slice(3)).catch((err) => {
      process.stderr.write(`claude-runcat convert error: ${err.message}\n`);
      process.exit(1);
    });
  } else {
    main().catch((err) => {
      process.stderr.write(`claude-runcat error: ${err.message}\n`);
      process.exit(1);
    });
  }
}
```

Add required imports at top of `src/index.ts`:

```typescript
import * as fs from 'node:fs';
import type { Phase } from './types.js';
```

- [ ] **Step 2: Verify build**

```bash
npx tsup
```

Expected: Builds cleanly.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: add CLI convert subcommand for custom characters"
```

---

### Task 19: Final Build, Manual Smoke Test, and Cleanup

**Files:**
- No new files

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 2: Build**

```bash
npx tsup
```

Expected: Clean build, `dist/index.js` created.

- [ ] **Step 3: Manual smoke test — compact mode**

```bash
echo '{"model":{"display_name":"Opus 4.6"},"context_window":{"used_percentage":45,"context_window_size":200000,"remaining_percentage":55,"current_usage":{"input_tokens":42000,"output_tokens":8000,"cache_creation_input_tokens":5000,"cache_read_input_tokens":38000}},"cost":{"total_cost_usd":1.23,"total_duration_ms":300000,"total_api_duration_ms":120000,"total_lines_added":50,"total_lines_removed":10},"rate_limits":{"five_hour":{"used_percentage":12,"resets_at":""},"seven_day":{"used_percentage":3,"resets_at":""}},"workspace":{"current_dir":"/home/user/my-project","project_dir":"/home/user/my-project"}}' | node dist/index.js
```

Expected: Single colored line with cat emoji, model, progress bar, cost, rate limits.

- [ ] **Step 4: Manual smoke test — normal and detailed modes**

Create a temporary config and test:

```bash
mkdir -p ~/.claude-runcat
echo '{"displayMode":"normal"}' > ~/.claude-runcat/config.json
echo '{"model":{"display_name":"Opus 4.6"},"context_window":{"used_percentage":78,"context_window_size":200000,"remaining_percentage":22,"current_usage":{"input_tokens":42000,"output_tokens":8000,"cache_creation_input_tokens":5000,"cache_read_input_tokens":38000}},"cost":{"total_cost_usd":2.4,"total_duration_ms":900000,"total_api_duration_ms":400000,"total_lines_added":150,"total_lines_removed":30},"rate_limits":{"five_hour":{"used_percentage":35,"resets_at":""},"seven_day":{"used_percentage":8,"resets_at":""}},"workspace":{"current_dir":"/home/user/my-project","project_dir":"/home/user/my-project"}}' | node dist/index.js

echo '{"displayMode":"detailed"}' > ~/.claude-runcat/config.json
echo '{"model":{"display_name":"Opus 4.6"},"context_window":{"used_percentage":78,"context_window_size":200000,"remaining_percentage":22,"current_usage":{"input_tokens":42000,"output_tokens":8000,"cache_creation_input_tokens":5000,"cache_read_input_tokens":38000}},"cost":{"total_cost_usd":2.4,"total_duration_ms":900000,"total_api_duration_ms":400000,"total_lines_added":150,"total_lines_removed":30},"rate_limits":{"five_hour":{"used_percentage":35,"resets_at":""},"seven_day":{"used_percentage":8,"resets_at":""}},"workspace":{"current_dir":"/home/user/my-project","project_dir":"/home/user/my-project"}}' | node dist/index.js
```

Expected: Multi-line output with Braille cat character on left, info on right.

- [ ] **Step 5: Clean up test config**

```bash
rm ~/.claude-runcat/config.json
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: final build verification"
```

---

## Summary

19 tasks total. Core pipeline (Tasks 1–15) builds bottom-up: types → parser → state → config → i18n → render utils → animation → character system → renderers → entry point. Then build tooling (Task 16), plugin (Task 17), CLI (Task 18), and smoke testing (Task 19).

Each task is independently testable and committable. The cat character ships with hand-crafted placeholder Braille frames; the converter tool enables generating better frames from pixel art sprites later.
