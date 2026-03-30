# claude-runcat Design Spec

A witty, animated statusline for Claude Code that shows session state through RunCat-style character animations with multi-language support and multiple display modes.

## Overview

claude-runcat replaces the default Claude Code statusline with an animated character (Braille pixel art) that reacts to session state, alongside rich session metrics. It ships as both an npm package and a Claude Code plugin.

## Architecture

Modular pipeline architecture:

```
Claude Code (stdin JSON, ~300ms interval)
    │
    ▼
  Parser ──→ { model, context%, cost, rateLimits, ... }
    │
    ▼
  State Engine ──→ SessionState { phase, intensity, alerts[] }
    │
    ▼
  Animation ──→ Current character's frame for this state
    │              (frame index = timestamp-based cycling)
    │
    ▼
  Renderer ──→ Layout by display mode (compact/normal/detailed)
    │
    ▼
  stdout: ANSI colored text
```

## Project Structure

```
claude-runcat/
├── src/
│   ├── index.ts              # Entry point: stdin → pipeline → stdout
│   ├── parser.ts             # stdin JSON parsing + defaults
│   ├── state.ts              # Session state determination engine
│   ├── config.ts             # User config load/validate (~/.claude-runcat/config.json)
│   ├── i18n/
│   │   ├── index.ts          # Locale detection + translation function
│   │   ├── en.ts
│   │   ├── ko.ts
│   │   ├── ja.ts
│   │   └── zh.ts
│   ├── characters/
│   │   ├── index.ts          # Character registry (builtin + custom loader)
│   │   ├── types.ts          # Character/frame interfaces
│   │   ├── converter.ts      # Pixel art → Braille converter (node-drawille)
│   │   ├── loader.ts         # Load builtin + custom characters
│   │   └── builtin/
│   │       ├── sprites/      # Source pixel art (20×12px PNG per frame)
│   │       │   ├── cat/
│   │       │   ├── robot/
│   │       │   ├── bird/
│   │       │   └── runner/
│   │       └── generated/    # Build output (JSON, committed to git)
│   │           ├── cat.json
│   │           ├── robot.json
│   │           ├── bird.json
│   │           └── runner.json
│   ├── render/
│   │   ├── index.ts          # Mode-based render dispatch
│   │   ├── compact.ts        # 1-line mode
│   │   ├── normal.ts         # 2-line mode
│   │   ├── detailed.ts       # 6-line mode
│   │   ├── progress-bar.ts   # Progress bar utility
│   │   └── colors.ts         # ANSI color utility
│   └── animation.ts          # State→frame mapping + frame cycling logic
├── plugin/                   # Claude Code plugin wrapper
│   ├── plugin.json
│   ├── setup.ts              # /claude-runcat:setup
│   ├── add-character.ts      # /claude-runcat:add-character
│   └── configure.ts          # /claude-runcat:configure
├── package.json
├── tsconfig.json
└── README.md
```

## Stdin JSON Schema

Claude Code pipes this JSON to stdin on each invocation:

```typescript
interface StdinData {
  model: {
    id: string;              // e.g. "claude-opus-4-6"
    display_name: string;    // e.g. "Opus 4.6"
  };
  context_window: {
    total_input_tokens: number;
    total_output_tokens: number;
    context_window_size: number;   // 200000 or 1000000
    used_percentage: number;       // pre-calculated
    remaining_percentage: number;
    current_usage: {               // null before first API call
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
    } | null;
  };
  cost: {
    total_cost_usd: number;
    total_duration_ms: number;     // wall-clock since session start
    total_api_duration_ms: number; // time spent in API calls
    total_lines_added: number;
    total_lines_removed: number;
  };
  rate_limits: {
    five_hour: { used_percentage: number; resets_at: string; };
    seven_day: { used_percentage: number; resets_at: string; };
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
```

Fields may be `null` before the first API call. Parser must apply safe defaults (0 for numbers, empty string for strings).

## State Engine

The state engine analyzes stdin data to determine a `SessionState`.

### Phase Priority (highest wins)

| Priority | Condition | Phase | Intensity |
|----------|-----------|-------|-----------|
| 1 | `rateLimits.five_hour.used >= 95%` | `rateLimited` | 1.0 |
| 2 | `context.used >= 90%` | `crushed` | 0.9–1.0 |
| 3 | `cost.total_cost_usd / (cost.total_duration_ms / 60000) > burnRateThreshold` | `expensive` | proportional to cost |
| 4 | `context_window.used_percentage >= 70` | `heavy` | proportional to context |
| 5 | `cost.total_api_duration_ms` unchanged from previous invocation (use cache file) | `idle` | 0.0 |
| 6 | Otherwise | `running` | proportional to context |

### Types

```typescript
type Phase = 'rateLimited' | 'crushed' | 'expensive' | 'heavy' | 'running' | 'idle';

interface SessionState {
  phase: Phase;
  intensity: number;       // 0.0–1.0, controls animation speed/effects
  alerts: Alert[];         // contextWarning, contextCritical, costSpike, rateLimitApproaching
}
```

### Animation Mapping

| Phase | Animation | Effect |
|-------|-----------|--------|
| `running` | Light run | — |
| `heavy` | Heavy steps, bags piling up | 📦 |
| `expensive` | Running + money flying | 💸 |
| `idle` | Sleeping | 💤 |
| `rateLimited` | Hitting a wall | 🧱 |
| `crushed` | Crushed under bags | 📦📦📦 |

### Intensity → Frame Duration

```
idle:         800ms (slow)
running 0.3:  400ms
running 0.8:  150ms (fast)
heavy:        500ms (heavy)
crushed:      600ms (struggling)
rateLimited:  1000ms (hit wall, pause)
```

Default `burnRateThreshold`: $0.10/min (configurable). Uses wall-clock duration (`cost.total_duration_ms`) for simplicity — no persistent state needed.

### Idle Detection

Idle is detected by comparing `cost.total_api_duration_ms` against the previous invocation's value stored in a cache file (`/tmp/claude-runcat-idle-cache`). If unchanged for 30+ seconds (calculated via `Date.now()` delta stored alongside), the session is idle. This is the only piece of persisted state.

### Alerts

Alerts are supplementary visual indicators overlaid on the traffic light and status text:

| Alert | Condition | Visual |
|-------|-----------|--------|
| `contextWarning` | `context_window.used_percentage >= 70` | 🟡 traffic light, yellow context bar |
| `contextCritical` | `context_window.used_percentage >= 90` | 🔴 traffic light, red context bar, blinking |
| `costSpike` | burn rate > `burnRateThreshold` | 💸 emoji appended to cost display |
| `rateLimitApproaching` | `rate_limits.five_hour.used_percentage >= 80` | ⚠️ appended to rate limit display |

## Character System

### Braille Rendering

Characters are pixel art sprites converted to Braille (Unicode U+2800–U+28FF) via node-drawille at build time.

Each Braille character encodes a 2×4 dot grid:
```
Dot layout:    Bit values:
 ,___,          0x01  0x08
 |1 4|          0x02  0x10
 |2 5|          0x04  0x20
 |3 6|          0x40  0x80
 |7 8|
```

### Sprite Specification

- Size: 20×12px (→ 10 Braille chars × 3 rows for normal mode)
- Compact: 4×8px (→ 2 chars × 2 rows) or auto-downscaled
- Format: PNG, transparent background, monochrome silhouette
- Missing phases fall back to `running` frames

### Builtin Characters (4)

1. **cat** — Classic RunCat homage
2. **robot** — Claude-inspired robot
3. **bird** — Flying bird
4. **runner** — Running person

Each has frames for all 6 phases.

### Custom Characters

Users can add their own pixel art characters via plugin command:

```
/claude-runcat:add-character
  → Prompts for sprite folder path
  → Validates images (size, format)
  → Converts to Braille via node-drawille
  → Saves to ~/.claude-runcat/characters/<name>.json
  → Registers in config, optionally applies immediately
```

Sprite folder structure:
```
my-dino/
  ├── running-0.png ~ running-4.png
  ├── idle-0.png ~ idle-1.png
  ├── heavy-0.png ~ heavy-2.png
  └── ... (missing phases fall back to running)
```

### Character Frame Data Format

```typescript
interface Character {
  name: string;
  displayName: Record<Locale, string>;
  frames: Record<Phase, BrailleFrame[]>;
  compactFrames: Record<Phase, string[]>;
}

interface BrailleFrame {
  lines: string[];     // Braille character rows (3 lines for normal)
  effects?: string[];  // Side effects per line (💸, 💤, 🧱, etc.)
}
```

## Display Modes

### Character Sizing by Mode

- **Compact**: 1–2 chars (minimal symbol)
- **Normal**: 3 rows (full character, left side)
- **Detailed**: 3–4 rows (full character with extra detail, left side)

### Compact (1 line)

```
ᘛ [Opus] ████░░░░ 45% | $1.20 | 5h:12% 7d:3%
```

Elements: character (1 char) + model + context bar + cost + rate limits

### Normal (2 lines + 3-row character)

```
⠀⢀⣴⣧⠀⠀  [Opus] ████████░░ 78% | $2.40 | 5h:35%
⢾⣿⣿⣿⡷⠀  my-project | sid:abc12 | 15m | $0.16/m | todo:2/5
⠀⠟⠀⠻⠀⠀
```

Elements: character (3 rows, left) + model, context, cost, rate limits (line 1) + project, session ID, duration, burn rate, todo progress (line 2)

### Detailed (6 lines)

Character occupies rows 1–3 on the left. Rows 4–6 are full-width (no character column).

```
⠀⠀⢀⣴⣧⠀⠀⠀  [Opus 4.6] 🟡 ████████░░ 78% | $2.40
⠀⢾⣿⣿⣿⡷⠀⠀  my-project git:(main*) | sid:abc12 | 15m32s
⠀⠀⠟⠀⠻⠀⠀⠀  Burn: $0.16/m | Depletion: ~45m | Budget: $10
5h:35% ██▓░░ | 7d:8% | Cache:92% | ⚡fast
In:42K Out:8K Cache↺:38K | MCP:2 Hooks:3 Rules:5
◐ Edit: auth.ts | ✓ Read ×3 | todo: 2/5 ████░
```

Rows 1–3: character (left) + info (right). Rows 4–6: full-width info lines. All Normal elements + depletion time, budget, cache hit rate, performance badge, token breakdown, config counts, tool/agent status

### Traffic Light Indicator (all modes)

Placed immediately before the context percentage in all modes:

- 🟢 context < 70%
- 🟡 context 70–90%
- 🔴 context > 90%
- ⚪ idle

Compact: `ᘛ [Opus] 🟢 ████░░░░ 45%...`
Normal: `... [Opus] 🟡 ████████░░ 78%...`

## i18n

### Locale Detection Order

1. `~/.claude-runcat/config.json` → `locale` field
2. Environment variable `LANG` (e.g., `ko_KR.UTF-8` → `ko`)
3. Default: `en`

### Supported Locales

`en`, `ko`, `ja`, `zh`

### Translation Scope

Labels and status messages only. Numbers, time expressions (`5m`, `$1.20`), and progress bars are not translated.

```typescript
// Example: Korean
const ko = {
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

CJK full-width characters (2-cell width) are compensated automatically by the renderer.

## Configuration

### Config File (`~/.claude-runcat/config.json`)

```json
{
  "locale": "auto",
  "displayMode": "normal",
  "character": "cat",
  "customCharactersDir": "~/.claude-runcat/characters/",
  "thresholds": {
    "heavyContext": 70,
    "crushedContext": 90,
    "expensiveBurnRate": 0.10,
    "rateLimitWarning": 80
  },
  "animation": {
    "enabled": true
  }
}
```

### Plugin Slash Commands

| Command | Description |
|---------|-------------|
| `/claude-runcat:setup` | Initial setup wizard: locale → character → mode → auto-register statusline in settings.json |
| `/claude-runcat:add-character` | Convert custom pixel art folder → Braille frames → register |
| `/claude-runcat:configure` | Change individual settings (mode, character, thresholds, etc.) |

### Setup Flow

```
/claude-runcat:setup
  → Select language: en / ko / ja / zh / auto
  → Select character: 🐱cat / 🤖robot / 🐦bird / 🏃runner
  → Select display mode: compact / normal / detailed
  → Auto-register in settings.json:
    { "statusLine": { "type": "command", "command": "npx claude-runcat" } }
  → "Setup complete! Restart Claude Code to apply."
```

## Distribution

### npm Package (`claude-runcat`)

- Core: parser, state engine, renderer, animation
- Builtin character JSON data
- Converter CLI (`npx claude-runcat convert <path>`)
- Statusline execution (stdin → stdout)
- Standalone usage: `npx claude-runcat` (no plugin required)

### Claude Code Plugin (`claude-runcat`)

- Thin wrapper over npm package
- Provides slash commands: setup, add-character, configure
- Published to plugin marketplace
- plugin.json defines commands

The plugin calls the npm package internally. All logic lives in the npm package. The statusline works without the plugin installed — the plugin just provides convenience commands.

## Performance

- The statusline script is invoked frequently (~300ms debounce). Must complete fast.
- node-drawille conversion happens at build time (builtin) or setup time (custom), NOT at render time.
- Frame data is pre-generated JSON — rendering is just string lookup + concatenation.
- Expensive operations (git status, file reads) should be cached with a stable cache file path and TTL.
- Frame selection uses `Date.now()` arithmetic — no state persisted between invocations.

## Technology

- **Language**: TypeScript
- **Runtime**: Node.js
- **Key dependency**: node-drawille (build-time sprite conversion)
- **Package manager**: npm
- **Distribution**: npm registry + Claude Code plugin marketplace
