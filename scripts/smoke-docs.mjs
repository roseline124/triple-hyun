import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(resolve(root, 'tools/package.json'));
const PptxGenJS = require('pptxgenjs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const run = promisify(execFile);
const target = resolve(root, 'artifacts/setup/documents');
await mkdir(target, { recursive: true });
const python = resolve(root, 'tools/.venv/bin/python');
await run(python, ['-c', 'from PIL import Image; import sys; Image.new("RGB", (8,8), "#16362F").save(sys.argv[1])', resolve(target, 'image-check.png')], { cwd: root, timeout: 15000 });
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Hackathon setup check';
pptx.subject = 'Tool verification only; not a product pitch';
pptx.theme = { headFontFace: 'Noto Sans CJK KR', bodyFontFace: 'Noto Sans CJK KR', lang: 'ko-KR' };
for (const [title, body] of [
  ['문서 제작 환경 검증', '실제 사업기획서가 아닌 도구 검증용 샘플입니다.\n한글 텍스트와 편집 가능한 PPTX 출력을 확인합니다.'],
  ['2장 제출 형식 확인', '실제 사용자 문제와 제품 화면으로 교체.\n가짜 고객·매출·성과 수치는 넣지 않습니다.'],
]) {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  slide.addText(title, { x: 0.7, y: 0.7, w: 11.9, h: 0.8, fontFace: 'Noto Sans CJK KR', fontSize: 34, bold: true, color: '16362F', margin: 0 });
  slide.addShape(pptx.ShapeType.rect, { x: 0.7, y: 2, w: 11.9, h: 3.7, fill: { color: 'F0F5F3' }, line: { color: 'F0F5F3' } });
  slide.addText(body, { x: 1.1, y: 2.5, w: 11, h: 2.3, fontFace: 'Noto Sans CJK KR', fontSize: 23, color: '16362F', margin: 0, valign: 'mid', breakLine: false });
  slide.addImage({ path: resolve(target, 'image-check.png'), x: 0.7, y: 6.5, w: 0.2, h: 0.2 });
  slide.addNotes('도구 설치 검증용입니다. 해커톤 제품이나 실제 사용자 검증을 나타내지 않습니다.');
}
await pptx.writeFile({ fileName: resolve(target, 'setup-check.pptx') });
const doc = new Document({ styles: { default: { document: { run: { font: 'Noto Sans CJK KR', size: 24 } } } }, sections: [{ properties: {}, children: [
  new Paragraph({ text: '사업기획 문서 환경 검증', heading: HeadingLevel.TITLE }),
  new Paragraph({ children: [new TextRun('실제 사업계획이 아닌 DOCX 제작 도구 확인용 샘플입니다.')] }),
  new Paragraph({ text: '확인 항목', heading: HeadingLevel.HEADING_1 }),
  new Paragraph('한글 출력, 편집 가능한 문서 생성, PDF 렌더링을 확인합니다.'),
  new Paragraph('사용자·고통·핵심 가치·검증 근거·가정을 작성합니다.'),
] }] });
await writeFile(resolve(target, 'setup-business-check.docx'), await Packer.toBuffer(doc));
await run(python, [resolve(root, '.claude/skills/pptx/scripts/office/validate.py'), resolve(target, 'setup-check.pptx')], { cwd: root, timeout: 60000 });
await run(python, [resolve(root, '.claude/skills/docx/scripts/office/validate.py'), resolve(target, 'setup-business-check.docx')], { cwd: root, timeout: 60000 });
const soffice = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
const profile = new URL(`file://${resolve(target, 'lo-profile')}`).href;
for (const file of ['setup-check.pptx', 'setup-business-check.docx']) {
  const result = await run(soffice, [`-env:UserInstallation=${profile}`, '--headless', '--convert-to', 'pdf', '--outdir', target, resolve(target, file)], { cwd: root, env: { ...process.env, FONTCONFIG_FILE: resolve(root, 'tools/fonts.conf') }, timeout: 60000 });
  assert(!/Error:/i.test(result.stdout + result.stderr), result.stdout + result.stderr);
}
const render = `import pymupdf,sys,pathlib,json\np=pathlib.Path(sys.argv[1])\nresults=[]\nfor stem,titles in [('setup-check',['문서 제작 환경 검증','2장 제출 형식 확인']),('setup-business-check',['사업기획 문서 환경 검증'])]:\n d=pymupdf.open(p/(stem+'.pdf'))\n assert len(d)==len(titles),(stem,len(d))\n for i,page in enumerate(d):\n  assert titles[i] in page.get_text(),(stem,i,'Korean title missing')\n  page.get_pixmap(matrix=pymupdf.Matrix(1.25,1.25)).save(p/(stem+'-'+str(i+1)+'.png'))\n results.append({'file':stem,'pages':len(d),'korean_text':True})\nprint(json.dumps(results,ensure_ascii=False))`;
const { stdout } = await run(python, ['-c', render, target], { cwd: root, timeout: 60000 });
const results = JSON.parse(stdout);
assert.equal(results.length, 2);
console.log('PASS PPTX: 생성/OOXML 검증/2장 PDF/한글 텍스트/PNG 렌더');
console.log('PASS DOCX: 생성/OOXML 검증/1쪽 PDF/한글 텍스트/PNG 렌더');
console.log('시각 검토 대상: artifacts/setup/documents/*.png');
await writeFile(resolve(target, 'results.json'), JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
