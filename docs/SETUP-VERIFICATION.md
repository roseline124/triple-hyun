# 환경 세팅 검증 기록

확인일: 2026-10-24. 제품 코드·제품 배포·실제 모델 호출 없이 도구와 문서 환경을 검증했다.
이후 사용자가 행사 API 키 연결 및 Orca의 새 작업 브랜치에서 Claude 에이전트를 사용할 수 있음을 확인했다.
아래 CLI 인증 기록은 당시 점검 환경의 결과이며 Orca의 인증 상태를 판정하지 않는다.

## 통과

- `pnpm --dir tools install --frozen-lockfile`: 잠금 파일 변경 없이 복원 성공.
- `pnpm --dir tools run doctor`: 필수 도구 확인. 행사 인증과 네이티브 기기는 별도 경고 항목.
- `pnpm --dir tools run smoke`: Playwright 1440px/390px에서 입력·클릭·빈 입력 복구·2회 반복·새로고침·가로 넘침 검사 통과.
- 동일 smoke에서 agent-browser 독립 세션·접근성 스냅샷·입력·클릭·결과·390px 캡처·세션 종료 확인.
- `pnpm --dir tools run smoke:docs`: PPTX 2장과 DOCX 1쪽 생성, 각 스킬의 OOXML 검사, LibreOffice PDF 변환, 한글 제목·페이지 수 확인, PNG 렌더링 통과.
- 생성한 PPT 2장과 DOCX 1쪽의 PNG를 직접 열어 한글 표시·주요 텍스트·잘림 없음 확인.
- `pnpm --dir tools audit --json`: 보고된 취약점 0건. 이 결과는 제3자 스킬 전체의 보안 감사를 의미하지 않는다.
- `bash -n scripts/start-claude.sh`, `bash scripts/start-claude.sh --check`: 문법과 비과금 시작 점검 통과.
- 프로젝트 작성 파일의 `git diff --cached --check -- . ':!.claude/skills'`: 공백 오류 없음.
  설치한 제3자 스킬 원문에는 후행 공백·파일 끝 빈 줄이 있어 전체 공백 검사는 통과하지 않는다.
  원문과 해시를 보존하기 위해 설치 스킬을 일괄 재포맷하지 않았다.
- 18개 스킬의 YAML frontmatter/name/description 확인. agency 원문 3개의 SHA-256과 MIT 라이선스 확인.

브라우저 증거는 `artifacts/setup/`, 문서 샘플과 PDF/PNG는 `artifacts/setup/documents/`에 있다.
`artifacts/`는 Git에서 제외된다. 샘플은 실제 사업기획이나 해커톤 제출물이 아니다.

## 설치 상태

- Claude Code: 최종 확인 2.1.309.
- 기본 시스템 Node 25를 변경하지 않고 도구용 Node 24.22.1을 프로젝트에 설치.
- 패키지 관리자 pnpm 10.33.3, 잠금 파일 `tools/pnpm-lock.yaml`.
- Playwright 1.64.1, agent-browser 0.39.2, agent-device 0.21.31.
- PptxGenJS 4.0.0, docx 9.14.0. image-size는 취약점 수정 버전 2.0.4로 override하고 이미지 삽입·렌더링 확인.
- 문서 Python 3.12.13과 설치 버전 목록 `tools/requirements-docs.txt`.
- LibreOffice 26.8.1, Noto Sans CJK KR 2.004 설치.
- 초기 설치와 최종 설치를 pnpm으로 전환했으며 프로젝트의 npm 잠금 파일은 제거했다.

한글은 초기 구조·텍스트 검사만 통과하고 PNG에 보이지 않는 문제가 있었다.
Noto 폰트 설치와 `tools/fonts.conf`의 시스템/사용자 폰트 경로 설정 후 다시 렌더링하고 시각 확인했다.
문서 제작 시에도 구조 검사와 별개로 미리보기를 직접 확인해야 한다.

## 미검증 / 사용자 확인 필요

- **행사 크레딧 인증**: 최초 확인은 개인 Pro였고, 최종 외부 샌드박스 확인에서도 `loggedIn: false`, `authMethod: none`이었다.
  행사 키·Console 계정의 소속/잔액은 확인할 수 없었다. 로그인·로그아웃 명령이나 유료 모델 호출은 수행하지 않았다.
  시작 스크립트에서 행사 키를 입력하거나 운영진 안내에 맞춰 Console로 로그인하고 `/status`와 Console 잔액을 확인해야 한다.
- **실제 모델 응답과 비용**: 크레딧 소속 확인 전 API 호출을 하지 않아 미검증이다.
- **네이티브 모바일**: Xcode Simulator와 adb가 없어 iOS/Android 실기기·시뮬레이터 검증은 미수행.
  agent-device 스킬/CLI 설치가 네이티브 환경 설치를 대체하지 않는다.
- **실제 앱**: 미션·제품·팀 스택 미정이므로 앱 생성·제품 타입 검사/린트/빌드·배포는 미수행.
- **배포 계정**: Vercel 등 팀의 실제 배포 프로젝트·접근 권한은 당일 결정해야 한다.
- **행사 운영**: 행사일, 현장 미션, 제출 포맷/창구, 잔여 자리, 결선 시간 분할은 운영진 최신 공지로 확인한다.

## 재확인 명령

```bash
pnpm --dir tools run doctor
pnpm --dir tools run smoke
pnpm --dir tools run smoke:docs
pnpm --dir tools audit
bash scripts/start-claude.sh --check
```

Orca에서는 새 작업 브랜치의 Claude 에이전트에서 `/hackathon-plan`으로 시작한다.
터미널에서 직접 실행할 때만 선택적으로 `bash scripts/start-claude.sh`를 사용한다.
