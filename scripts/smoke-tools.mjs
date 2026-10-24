import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(resolve(root, 'tools/package.json'));
const { chromium } = require('@playwright/test');
const run = promisify(execFile);
const artifacts = resolve(root, 'artifacts/setup');
await mkdir(artifacts, { recursive: true });
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>해커톤 도구 검증</title><style>body{font:18px system-ui;max-width:650px;margin:24px auto;padding:16px;box-sizing:border-box}input,button{font:inherit;padding:12px;box-sizing:border-box;max-width:100%}form{display:grid;gap:12px}#result{overflow-wrap:anywhere}</style><main><h1>해커톤 도구 검증</h1><p>제품이나 실제 AI 호출이 아닌 로컬 도구 테스트입니다.</p><form><label for="scenario">시연 입력</label><input id="scenario" name="scenario"><button type="submit">실행</button></form><p id="result" role="status" aria-live="polite"></p></main><script>document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const value=document.querySelector('input').value.trim();document.querySelector('#result').textContent=value?'검증 완료: '+value:'입력을 확인하세요';});</script></html>`;
const server = createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const url = `http://127.0.0.1:${server.address().port}`;
const cli = resolve(root, 'tools/node_modules/.bin/agent-browser');
const session = `ambition-setup-${process.pid}`;
const env = { ...process.env, AGENT_BROWSER_SESSION: session };
const checks = [];
let browser;
let cliStarted = false;
async function browserCommand(...args) {
  const { stdout } = await run(cli, args, { cwd: root, env, timeout: 45000, maxBuffer: 1024 * 1024 });
  return stdout;
}
try {
  browser = await chromium.launch({ headless: true });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.getByRole('button', { name: '실행', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '입력을 확인하세요' }).waitFor();
    for (const value of ['첫 번째 시연', '다시 시연']) {
      await page.getByLabel('시연 입력').fill(value);
      await page.getByRole('button', { name: '실행', exact: true }).click();
      assert.equal(await page.getByRole('status').textContent(), `검증 완료: ${value}`);
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '가로 넘침');
    assert.deepEqual(errors, [], '페이지 JS 오류');
    await page.screenshot({ path: resolve(artifacts, `playwright-${viewport.width}.png`), fullPage: true });
    await page.reload();
    assert.equal(await page.getByLabel('시연 입력').inputValue(), '');
    checks.push(`PASS Playwright ${viewport.width}px: 입력/클릭/오류 복구/반복/새로고침/가로 넘침`);
    await page.close();
  }
  cliStarted = true;
  await browserCommand('open', url);
  const snapshot = await browserCommand('snapshot', '-i');
  assert(snapshot.includes('시연 입력') && snapshot.includes('실행'), 'CLI 접근성 스냅샷');
  await browserCommand('fill', 'input[name="scenario"]', 'CLI 시연');
  await browserCommand('click', 'button[type="submit"]');
  await browserCommand('wait', '--text', '검증 완료: CLI 시연');
  assert((await browserCommand('get', 'text', '#result')).includes('검증 완료: CLI 시연'));
  await browserCommand('set', 'viewport', '390', '844');
  await browserCommand('screenshot', resolve(artifacts, 'agent-browser-390.png'));
  checks.push('PASS agent-browser: 독립 세션/접근성 스냅샷/입력/클릭/결과/390px 캡처');
  await writeFile(resolve(artifacts, 'smoke-results.txt'), `${new Date().toISOString()}\n${checks.join('\n')}\n로컬 fixture만 검증. 행사 인증/제품/네이티브 검증 아님.\n`);
  console.log(checks.join('\n'));
  console.log('증거: artifacts/setup/');
} finally {
  if (cliStarted) await browserCommand('close').catch(error => console.error('CLI 정리 실패:', error.message));
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
