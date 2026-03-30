# claude-runcat

Animated statusline for [Claude Code](https://claude.ai/code) with RunCat-style Braille character animations.

```
⠀⠀⢀⣀⣀⣀⡀⠀⠀⠀⠀
⠀⢠⣿⣿⣿⣿⣿⡄⠀⠀⠀  [Opus 4.6] 🟢 ████████░░ 42% | $1.23 | 5h:15%
⠀⠈⣿⣾⣿⣷⣿⠁⠀⢀⠀  my-project | 25m | $0.05/m
⠀⠀⠈⠻⠿⠟⠁⢀⡴⠋⠀
```

## Features

- **Real-time animation** - RunCat-style Braille pixel art that reacts to session state
- **Session monitoring** - Model, context usage, API cost, rate limits, burn rate
- **Adaptive states** - idle, running, heavy, expensive, crushed, rate-limited
- **Multi-language** - English, Korean, Japanese, Chinese
- **3 display modes** - compact (1 line), normal (2 lines), detailed (6 lines)
- **Custom characters** - Convert your own pixel art sprites to Braille animations

## Quick Start

### Install

```bash
npm install -g claude-runcat
```

### Setup via Plugin (Recommended)

In Claude Code, run the setup wizard:

```
/claude-runcat:setup
```

This will guide you through language, character, display mode selection and register the statusline automatically.

### Manual Setup

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx claude-runcat"
  }
}
```

Restart Claude Code to see the statusline.

## Configuration

Settings are stored in `~/.claude-runcat/config.json`:

```json
{
  "locale": "auto",
  "displayMode": "normal",
  "character": "cat",
  "customCharactersDir": "~/.claude-runcat/characters/",
  "animation": {
    "enabled": true
  },
  "thresholds": {
    "heavyContext": 70,
    "crushedContext": 90,
    "expensiveBurnRate": 0.10,
    "rateLimitWarning": 80
  }
}
```

| Option | Values | Description |
|--------|--------|-------------|
| `locale` | `auto`, `en`, `ko`, `ja`, `zh` | Display language (`auto` detects from `$LANG`) |
| `displayMode` | `compact`, `normal`, `detailed` | Output line count: 1 / 2 / 6 |
| `character` | `cat`, or custom name | Animation character |
| `thresholds.heavyContext` | 0-100 | Context % to trigger "heavy" animation |
| `thresholds.crushedContext` | 0-100 | Context % to trigger "crushed" animation |
| `thresholds.expensiveBurnRate` | number | $/minute to trigger "expensive" state |
| `thresholds.rateLimitWarning` | 0-100 | Rate limit % to show warning |

## Display Modes

**Compact** - Single line, minimal footprint:
```
🐱 [Opus 4.6] ████████░░ 42% $1.23
```

**Normal** (default) - Two lines with key metrics:
```
[Opus 4.6] 🟢 ████████░░ 42% | $1.23 | 5h:15%
my-project | 25m | $0.05/m
```

**Detailed** - Six lines with full breakdown:
```
[Opus 4.6]  Context: 42% (84k / 200k tokens)
Cost: $1.23  Burn: $0.05/m
Rate Limit (5h): 15%  (7d): 3%
Duration: 25m  API: 8m
Project: my-project
```

## Custom Characters

Convert your own pixel art sprites to Braille animations:

```bash
claude-runcat convert ./my-sprites --name mychar --output ~/.claude-runcat/characters/mychar.json
```

### Sprite Requirements

- **Format**: PNG, 20x12 pixels per frame
- **Naming**: `{phase}-{index}.png` (e.g., `running-0.png`, `running-1.png`, `idle-0.png`)
- **Required phase**: `running` (other phases fall back to running frames if missing)
- **Available phases**: `running`, `idle`, `heavy`, `crushed`, `expensive`, `rateLimited`

Then set in config:

```json
{
  "character": "mychar"
}
```

Or use the plugin command:

```
/claude-runcat:add-character
```

## Plugin Commands

| Command | Description |
|---------|-------------|
| `/claude-runcat:setup` | Interactive setup wizard |
| `/claude-runcat:add-character` | Convert and add custom character sprites |
| `/claude-runcat:configure` | Change settings (mode, character, thresholds) |

## Development

```bash
git clone https://github.com/user/claude-runcat.git
cd claude-runcat
npm install
npm run build
```

| Script | Description |
|--------|-------------|
| `npm run build` | Build to `dist/` |
| `npm run dev` | Watch mode (rebuild on change) |
| `npm test` | Run tests (vitest) |
| `npm run test:watch` | Test watch mode |
| `npm run lint` | Type check |
| `npm run generate-characters` | Regenerate Braille sprites from PNGs |

### Architecture

```
stdin (JSON from Claude Code)
  → Parser (safe defaults)
  → State Engine (phase + intensity + alerts)
  → Animation (frame selection)
  → Renderer (ANSI colored output)
→ stdout
```

## License

MIT
