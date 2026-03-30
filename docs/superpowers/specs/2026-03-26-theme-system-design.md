# Theme System Design

## Overview

claude-runcat statusline에 테마 시스템을 추가한다. 사용자는 **테마**(색상, 바 스타일, 아이콘, 레이아웃)와 **캐릭터**(Braille 애니메이션)를 독립적으로 선택할 수 있다.

## 선택 구조

```
사용자 선택 두 축 (독립적):
┌─────────────┐    ┌─────────────┐
│    Theme     │    │  Character  │
│  색상/바/     │    │  Braille    │
│  아이콘/      │    │  애니메이션   │
│  레이아웃     │    │  Phase별    │
└──────┬──────┘    └──────┬──────┘
       └──────┬───────────┘
              ▼
       config.json
       { "theme": "dracula", "character": "cat" }
```

진입점: `/customize` 커맨드

## Theme Schema

```typescript
interface Theme {
  name: string;
  displayName: string;           // "🧛 Dracula"
  description: string;           // 한 줄 설명

  // 레이아웃
  lineLayout: 'expanded' | 'compact';
  showSeparators: boolean;

  // 색상 (hex #RRGGBB, 256-index 0-255, 또는 named preset)
  colors: {
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
  };

  // 바 스타일
  bars: {
    fill: string;       // "█" | "▓" | "━" 등
    empty: string;      // "░" | "▒" | "─" 등
  };

  // 아이콘 (주요 것만)
  icons: {
    running: string;    // "◐" | "⟳" 등
    done: string;       // "✓" | "✔" 등
    progress: string;   // "▸" | "→" 등
    separator: string;  // "│" | "|" | "·" 등
  };
}
```

## Builtin Themes (11개)

| 이름 | 컨셉 | 바 | 아이콘 |
|------|-------|-----|--------|
| **default** | 현재 HUD 색상 | █/░ | ◐ ✓ ▸ │ |
| **monokai** | 따뜻한 에디터 클래식 | ━/─ | ◆ ✔ › │ |
| **dracula** | 보라/핑크 다크 | █/░ | ◐ ✓ ▸ │ |
| **nord** | 차가운 블루 | ▓/▒ | ◇ ✓ ▹ │ |
| **solarized** | 따뜻한 세피아 톤 | █/░ | ◐ ✓ ▸ │ |
| **catppuccin** | 파스텔 | █/░ | ● ✓ ▸ │ |
| **neon** | 형광 강대비 | ▮/▯ | ⚡ ✓ ▸ ┃ |
| **minimal** | 흑백 + 포인트 | ─/· | · ✓ › │ |
| **geek** | 해커 터미널 (green matrix) | #/· | > ✓ $ │ |
| **designer** | 이모지 컬러풀 rainbow | 🟩/⬜ | 🔄 ✅ ▶️ │ |
| **brainrot** | 밈 카오스 | 💀/🥶 | 🗿 ✅ 👉 💀 |

## `/customize` 커맨드 흐름

### Step 1: 테마 선택

테마를 하나씩 순회하며 dummy 데이터로 실제 렌더링된 미리보기를 보여준다.

```
── 🧛 Dracula (1/11) ──────────────────
[Opus] │ my-project
Context █████░░░░░ 45%
◐ Edit: file.ts | ✓ Read ×3
▸ Fix auth bug (2/5)
────────────────────────────────────────
→ 다음 / ← 이전 / Enter: 선택
```

실제 구현은 AskUserQuestion으로 "다음/이전/선택" 입력을 받는다.

### Step 2: 캐릭터 선택

등록된 캐릭터를 순회하며 각 Phase의 Braille 프레임을 미리보기로 보여준다.

```
── 🐱 고양이 (1/N) ────────────────────
⠀⠀⣨⠗⠀⠀⠀⠀⠀⠀
⠀⠀⠉⠉⢠⡄⠀⠀⠀⠀
⣴⡶⠶⢀⣀⣤⣄⡀⠀⠈⠁
⢸⣿⠀⣾⣿⣿⣿⣿⣿⣦⡀
⠈⠿⣦⣤⣿⣿⣿⣿⣿⣿⣿
⠀⠈⠉⠙⠛⠛⠛⠛⠛⠁
idle 💤
────────────────────────────────────────
→ 다음 / ← 이전 / Enter: 선택
```

### Step 3: 확인 & 저장

```
테마: Dracula
캐릭터: 고양이

저장할까요? (Y/n)
```

`~/.claude-runcat/config.json`에 저장, 즉시 반영.

## 파일 구조

```
src/
├── themes/
│   ├── types.ts              # Theme 인터페이스
│   ├── registry.ts           # 빌트인 + 커스텀 테마 로딩
│   ├── preview.ts            # dummy 데이터로 미리보기 렌더링
│   └── builtin/
│       ├── default.json
│       ├── monokai.json
│       ├── dracula.json
│       ├── nord.json
│       ├── solarized.json
│       ├── catppuccin.json
│       ├── neon.json
│       ├── minimal.json
│       ├── geek.json
│       ├── designer.json
│       └── brainrot.json
│
├── characters/               # 기존 그대로
├── render/
│   ├── colors.ts             # 수정: 하드코딩 → theme 참조
│   ├── index.ts              # 수정: theme.bars, theme.icons 참조
│   └── ...
├── config.ts                 # 수정: theme, character 필드 추가
│
commands/
└── customize.ts              # /customize 스킬 구현
```

## 렌더링 통합

### 테마 해석 (Theme Resolution)

```typescript
function resolveTheme(config: Config): ResolvedTheme {
  const base = getTheme(config.theme ?? 'default');
  return {
    ...base,
    colors: { ...base.colors, ...config.colors },
    bars: { ...base.bars, ...config.bars },
    icons: { ...base.icons, ...config.icons },
    lineLayout: config.lineLayout ?? base.lineLayout,
    showSeparators: config.showSeparators ?? base.showSeparators,
  };
}
```

### 우선순위

```
테마 기본값 → config.json 개별 오버라이드
```

테마를 고른 뒤에도 `colors.model`만 따로 바꾸고 싶으면 config에 직접 쓸 수 있다.

### colors.ts 변경

기존: 하드코딩된 ANSI 상수 직접 사용
변경: `ResolvedTheme`을 받아서 색상 해석

```
main() 흐름:
1. config 로드 (theme, character, 개별 오버라이드)
2. resolveTheme(config) → 최종 ResolvedTheme
3. getCharacter(config.character) → Character
4. render(ctx, resolvedTheme, character)
```

## 커스텀 테마

사용자가 `~/.claude-runcat/themes/*.json`에 Theme 스키마에 맞는 JSON을 넣으면 자동 로딩된다. 빌트인 테마와 동일한 구조.

## config.json 변경

```json
{
  "theme": "dracula",
  "character": "cat",
  "colors": { ... },
  "bars": { ... },
  "icons": { ... },
  "lineLayout": "expanded",
  "showSeparators": false,
  "display": { ... }
}
```

`theme`과 `character`가 새 필드. 나머지는 기존과 동일하며 테마 값을 오버라이드하는 용도로 유지.
