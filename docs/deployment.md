# claude-runcat 배포 가이드

## 사전 준비

- [ ] GitHub 계정 (public repo 생성용)
- [ ] npm 계정 (`npm login` 완료)
- [ ] Claude.ai 계정 (플러그인 제출용)

## Step 1: GitHub Public Repository 생성

```bash
# 레포 생성 (gh CLI 사용 시)
gh repo create claude-runcat --public --source=. --push

# 또는 수동으로:
# 1. github.com/new 에서 레포 생성
# 2. git remote add origin https://github.com/<username>/claude-runcat.git
# 3. git push -u origin main
```

생성 후 `.claude-plugin/plugin.json`의 `repository` 필드를 실제 URL로 수정:

```json
{
  "repository": "https://github.com/<username>/claude-runcat"
}
```

## Step 2: npm 패키지 배포

statusline 등록 시 `npx claude-runcat`로 실행되므로 npm 배포가 필요하다.

```bash
# 패키지명 중복 확인
npm search claude-runcat

# 빌드 & 테스트
npm run build
npm test

# 배포 (첫 배포)
npm publish

# scoped 패키지로 배포 시
npm publish --access public
```

### 배포 전 체크리스트

- [ ] `package.json`의 name, version, description, license 확인
- [ ] `package.json`의 `bin` 필드가 `dist/index.js`를 가리키는지 확인
- [ ] `.npmignore` 또는 `files` 필드로 불필요한 파일 제외
- [ ] `npm run build` 성공
- [ ] `npm test` 전체 통과
- [ ] `npx .` 로 로컬 동작 확인

## Step 3: 로컬 플러그인 테스트

```bash
# 플러그인 디렉토리 직접 지정하여 Claude Code 실행
claude --plugin-dir /Users/winter/Side_projects/claude_runcat

# Claude Code 내에서 커맨드 동작 확인
# /claude-runcat:setup
# /claude-runcat:configure
# /claude-runcat:add-character
```

## Step 4: 공식 마켓플레이스 제출

1. https://claude.ai/settings/plugins/submit 접속 (로그인 필요)
2. 제출 폼 작성:
   - **Plugin name**: claude-runcat
   - **Repository URL**: GitHub 레포 URL
   - **Description**: Animated statusline for Claude Code with RunCat-style Braille character animations
3. 제출 후 Anthropic의 품질/보안 리뷰 대기
4. 승인되면 `anthropics/claude-plugins-official`의 `marketplace.json`에 등록됨

## Step 5: 승인 후 확인

사용자가 설치할 수 있는지 확인:

```
/plugin install claude-runcat@claude-plugins-official
```

## 버전 업데이트 시

```bash
# 버전 범프
npm version patch  # 또는 minor, major

# 재배포
npm run build && npm test && npm publish

# GitHub에도 push
git push && git push --tags
```

플러그인 캐시는 `plugin.json`의 version이 바뀌면 자동 갱신된다.
