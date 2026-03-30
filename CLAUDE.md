# claude-runcat

Claude Code용 애니메이션 statusline 플러그인. stdin으로 세션 JSON을 받아 Braille 아트 애니메이션과 함께 실시간 메트릭을 렌더링한다.

## Architecture

```
stdin JSON → Parser → State Engine → Animation → Renderer → stdout
```

| Module | Path | Role |
|--------|------|------|
| Parser | `src/parser.ts` | stdin JSON 파싱, 기본값 병합 |
| State | `src/state.ts` | phase(idle/running/heavy/crushed/expensive/rateLimited) + intensity 결정 |
| Animation | `src/animation.ts` | 시간/phase 기반 프레임 선택 |
| Config | `src/config.ts` | `~/.claude-runcat/config.json` 로드, 기본값 병합, 값 clamping |
| Idle Cache | `src/idle-cache.ts` | `/tmp/claude-runcat-idle-cache`로 idle 상태 감지 |
| Characters | `src/characters/` | Braille 스프라이트 로드/변환 (builtin: cat) |
| Renderer | `src/render/` | compact(1줄) / normal(2줄) / detailed(6줄) 출력 |
| Themes | `src/themes/` | 11개 빌트인 테마, 커스텀 테마 지원 |
| I18n | `src/i18n/` | en/ko/ja/zh 다국어 |
| Types | `src/types.ts` | 공통 타입 정의 |

## Entry Point

`src/index.ts`의 `run(stdinRaw, overrides?)` — 위 파이프라인을 순서대로 실행하고 string 반환.

## Commands

```bash
npm run build          # tsup → dist/
npm run dev            # watch mode
npm run test           # vitest
npm run lint           # tsc type check
npm run generate-characters  # PNG → cat.json 변환
```

## Key Conventions

- Functions: camelCase, Types: PascalCase, Constants: SCREAMING_SNAKE_CASE
- 안전한 기본값: parser에서 deep merge, config에서 clamp
- 에러 시 graceful degradation (기본값 반환)
- ESM (import.meta.url 사용)
- 테스트: vitest, `tests/` 디렉토리가 `src/` 구조 미러링

## Data Files (토큰 주의)

- `src/characters/builtin/generated/cat.json` — 13KB, 402줄 Braille 프레임 데이터
- `src/themes/builtin/*.json` — 테마별 색상/아이콘 정의
- 이 파일들은 데이터이므로 로직 변경 시 읽을 필요 없음
