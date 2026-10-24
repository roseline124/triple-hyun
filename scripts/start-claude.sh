#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/tools/node_modules/.bin:$PWD/tools/.venv/bin:$PATH"
export FONTCONFIG_FILE="$PWD/tools/fonts.conf"
if [[ "${1:-}" == "--check" ]]; then
  command -v claude >/dev/null
  claude --version
  printf '%s\n' '시작 스크립트 정상. 모델 호출과 인증 변경은 수행하지 않았습니다.'
  exit 0
fi
if [[ ! -t 0 ]]; then
  printf '%s\n' '대화형 터미널에서 실행하세요. 행사 키는 파일이나 명령행 인자로 받지 않습니다.' >&2
  exit 1
fi
printf '%s\n' '행사 Console에서 발급한 API 키만 사용하세요. 개인 Pro 인증은 행사 크레딧이 아닙니다.'
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  read -r -s -p '행사 API 키 입력 (화면/파일에 저장하지 않음): ' ANTHROPIC_API_KEY
  printf '\n'
fi
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  printf '%s\n' '키가 없어 시작하지 않았습니다. Console 로그인 방식은 README를 확인하세요.' >&2
  exit 1
fi
export ANTHROPIC_API_KEY
unset ANTHROPIC_AUTH_TOKEN CLAUDE_CODE_OAUTH_TOKEN ANTHROPIC_BASE_URL
unset CLAUDE_CODE_USE_BEDROCK CLAUDE_CODE_USE_VERTEX CLAUDE_CODE_USE_FOUNDRY
printf '%s\n' '시작 후 /status에서 행사 키 사용을 확인하고 Console에서 잔액을 확인하세요.'
exec claude --setting-sources project,local --model sonnet --effort medium --permission-mode acceptEdits "$@"
