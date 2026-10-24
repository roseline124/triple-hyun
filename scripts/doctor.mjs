import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(resolve(root, 'tools/package.json'));
let failures = 0;
function report(ok, name, details = '', required = true) {
  console.log(`${ok ? 'PASS' : required ? 'FAIL' : 'WARN'} ${name}${details ? ` — ${details}` : ''}`);
  if (!ok && required) failures++;
}
function command(name, args) {
  return spawnSync(name, args, { encoding: 'utf8', cwd: root, timeout: 15000 });
}

report(Number(process.versions.node.split('.')[0]) >= 22, 'Node.js', process.version);
const localNode = command(resolve(root, 'tools/node_modules/.bin/node'), ['--version']);
report(localNode.status === 0 && localNode.stdout.startsWith('v24.'), '프로젝트 Node 24', localNode.stdout.trim());
for (const [name, args] of [['claude', ['--version']], ['pnpm', ['--version']]]) {
  const result = command(name, args);
  report(result.status === 0, name, result.status === 0 ? result.stdout.trim() : '설치 또는 PATH 확인');
}
for (const path of ['.claude/settings.json', 'skills-lock.json', 'tools/package.json', 'docs/agency-sources.json']) {
  try { JSON.parse(readFileSync(resolve(root, path), 'utf8')); report(true, path); }
  catch { report(false, path, '파일 또는 JSON 확인'); }
}
report(existsSync(resolve(root, 'tools/pnpm-lock.yaml')), 'pnpm 잠금 파일');
report(!existsSync(resolve(root, 'tools/package-lock.json')), 'npm 잠금 파일 없음');
const skillsPath = resolve(root, '.claude/skills');
const names = existsSync(skillsPath) ? readdirSync(skillsPath).filter(name => existsSync(resolve(skillsPath, name, 'SKILL.md'))) : [];
const expected = ['frontend-design', 'claude-api', 'vercel-react-best-practices', 'vercel-react-native-skills', 'web-design-guidelines', 'agent-browser', 'agent-device', 'systematic-debugging', 'verification-before-completion', 'hackathon-plan', 'demo-gate', 'agency-business-strategist', 'agency-proposal-strategist', 'agency-visual-storyteller', 'hackathon-pitch', 'pptx', 'docx', 'doc-coauthoring'];
report(expected.every(name => names.includes(name)), 'Claude 스킬', `${names.length}개 / 누락: ${expected.filter(name => !names.includes(name)).join(', ') || '없음'}`);
for (const name of ['agent-browser', 'agent-device', 'playwright']) {
  const result = command(resolve(root, 'tools/node_modules/.bin', name), ['--version']);
  report(result.status === 0, name, result.status === 0 ? result.stdout.trim() : 'pnpm --dir tools install --frozen-lockfile 필요');
}
try {
  const { chromium } = require('@playwright/test');
  report(existsSync(chromium.executablePath()), 'Playwright Chromium');
} catch { report(false, 'Playwright Chromium', '패키지/브라우저 설치 확인'); }
for (const name of ['pptxgenjs', 'docx']) {
  try { require.resolve(name); report(true, `문서 제작 런타임: ${name}`); }
  catch { report(false, `문서 제작 런타임: ${name}`); }
}
const python = command(resolve(root, 'tools/.venv/bin/python'), ['-c', 'import defusedxml,lxml,PIL,pymupdf,pptx,pypdf; print("문서 Python 의존성 정상")']);
report(python.status === 0, '문서 Python 환경', python.status === 0 ? python.stdout.trim() : 'README의 uv 설치 절차 확인');
report(existsSync('/Applications/LibreOffice.app/Contents/MacOS/soffice'), 'LibreOffice 렌더러');
report(existsSync(resolve(process.env.HOME, 'Library/Fonts/NotoSansCJKkr-Regular.otf')), '한글 렌더링 폰트');
const auth = command('claude', ['auth', 'status']);
try {
  const value = JSON.parse(auth.stdout);
  console.log(`INFO Claude 인증 방식: ${value.authMethod ?? '알 수 없음'} / 플랜: ${value.subscriptionType ?? '알 수 없음'}`);
  report(value.loggedIn === true, 'Claude 로그인', '행사 소속/잔액은 별도 확인', false);
} catch { report(false, 'Claude 인증 상태', '터미널에서 확인 필요', false); }
console.log(`INFO ANTHROPIC_API_KEY 환경변수: ${process.env.ANTHROPIC_API_KEY ? '설정됨 (값 미출력)' : '없음'}`);
report(false, '행사 크레딧 소속과 잔액', '/status 및 행사 Console에서 사람이 확인해야 함', false);
report(command('xcrun', ['simctl', 'list', 'devices', 'booted']).status === 0, 'iOS Simulator', '네이티브 선택 시 Xcode와 기기 필요', false);
report(command('adb', ['version']).status === 0, 'Android adb', '네이티브 선택 시 SDK와 기기 필요', false);
console.log(`\n필수 도구 실패 ${failures}개. 제품/행사 인증 검증은 포함하지 않았습니다.`);
process.exitCode = failures ? 1 : 0;
