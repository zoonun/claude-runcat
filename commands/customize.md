---
name: customize
description: "Pick a theme and character with live previews"
---

## claude-runcat: Customize

Interactive theme and character selector with previews.

### Step 1: Theme Selection

Load all available themes using the theme registry. Present them one at a time with a dummy preview.

For each theme, show this format using the theme's actual colors, bars, and icons:

```
── {theme.displayName} ({index}/{total}) ──
[Opus] │ my-project
Context {bar} 45%
Usage   {bar} 25%
{icons.running} Edit: file.ts │ {icons.done} Read ×3
{icons.progress} Fix auth bug (2/5)
```

Generate the preview by running:
```bash
node -e "
const { getTheme, getAllThemes } = require('./dist/themes/registry.js');
const { renderThemePreview } = require('./dist/themes/preview.js');
const theme = getTheme('{themeName}');
console.log(renderThemePreview(theme));
"
```

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
```
테마: {selectedTheme.displayName}
캐릭터: {selectedCharacter.displayName}

저장할까요? (Y/n)
```

If confirmed, write to ~/.claude-runcat/config.json:
```json
{
  "theme": "{selectedTheme.name}",
  "character": "{selectedCharacter.name}"
}
```

Merge with existing config (preserve thresholds, locale, etc).

Say: "저장 완료! 다음 statusline 갱신 시 반영됩니다."
