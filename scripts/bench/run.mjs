/**
 * 성능 비교 측정 — 같은 조건에서 "이전 방식 vs 현재 방식"을 수치로 비교한다.
 *
 *   npm run bench               # 측정용 Storybook 빌드 후 측정
 *   npm run bench -- --skip-build
 *
 * 1) 목록 렌더링: 10,000행 일반 표 vs 가상화 표
 * 2) 다크 모드 전환: 테마 재생성 vs CSS 변수
 *
 * - React 렌더 시간은 <Profiler> 의 actualDuration (React 프로파일링 빌드)
 * - 스타일 재계산·레이아웃 시간은 Chrome DevTools Protocol 의 Performance 지표
 * - 각 항목을 RUNS 번 새 페이지에서 반복해 중앙값을 쓴다 (헤드리스 Chromium, 1280×900)
 */
import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

const OUT = '.bench/storybook';
const PORT = 6100;
const RUNS = Number(process.env.BENCH_RUNS ?? 5);
const TOGGLES = 10;

if (!process.argv.includes('--skip-build')) {
  execSync(`npm run build-storybook -- --quiet -o ${OUT}`, {
    stdio: 'inherit',
    env: { ...process.env, STORYBOOK_BENCH: '1' },
  });
}

// ---------------------------------------------------------------- 정적 서버
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const server = createServer((req, res) => {
  let file = join(OUT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404).end();
  }
}).listen(PORT);

const storyUrl = (id) => `http://localhost:${PORT}/iframe.html?id=${id}&viewMode=story`;
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

const browser = await chromium.launch();

async function openStory(id, ready) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.goto(storyUrl(id));
  await page.waitForSelector(ready, { timeout: 60_000 });
  // 두 번의 animation frame 을 기다려 화면에 그려진 뒤 측정
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const metrics = async () => {
    const { metrics: list } = await cdp.send('Performance.getMetrics');
    return Object.fromEntries(list.map((m) => [m.name, m.value]));
  };
  return { context, page, cdp, metrics };
}

// ---------------------------------------------------------------- 1) 목록 렌더링
async function measureList(id, scrollTarget) {
  const { context, page, cdp, metrics } = await openStory(id, '#storybook-root tbody tr');
  const mountMs = await page.evaluate(() =>
    (window.__bench?.commits ?? [])
      .filter((c) => c.phase === 'mount')
      .reduce((s, c) => s + c.actualDuration, 0),
  );
  const domNodes = await page.evaluate(
    () => document.querySelector('#storybook-root').getElementsByTagName('*').length,
  );
  const rows = await page.evaluate(
    () => document.querySelectorAll('#storybook-root tbody tr').length,
  );
  await cdp.send('HeapProfiler.collectGarbage');
  const heapMb = (await metrics()).JSHeapUsedSize / 1024 / 1024;

  // 스크롤: 80 단계 × 250px, 단계마다 다음 프레임까지 걸린 시간 기록
  const before = await metrics();
  await page.evaluate(() => (window.__bench = { commits: [] }));
  const frames = await page.evaluate(async (target) => {
    const el = target === 'window' ? null : document.querySelector(target);
    const times = [];
    let last = performance.now();
    for (let i = 1; i <= 80; i++) {
      if (el) el.scrollTop = i * 250;
      else window.scrollTo(0, i * 250);
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now();
      times.push(now - last);
      last = now;
    }
    return times;
  }, scrollTarget);
  const after = await metrics();
  // 스크롤 80단계 동안 React 가 렌더링에 쓴 시간 합계
  const scrollReactMs = await page.evaluate(() =>
    window.__bench.commits.reduce((sum, c) => sum + c.actualDuration, 0),
  );
  await context.close();
  return {
    mountMs,
    domNodes,
    rows,
    heapMb,
    frameP95: percentile(frames, 95),
    scrollReactMs,
    scrollStyleLayoutMs:
      (after.RecalcStyleDuration -
        before.RecalcStyleDuration +
        after.LayoutDuration -
        before.LayoutDuration) *
      1000,
  };
}

// ---------------------------------------------------------------- 2) 다크 모드 전환
async function measureToggle(id) {
  const { context, page, metrics } = await openStory(id, '#storybook-root #bench-toggle');
  const results = [];
  for (let i = 0; i < TOGGLES; i++) {
    const before = await metrics();
    const { wallMs, reactMs } = await page.evaluate(async () => {
      window.__bench = { commits: [] };
      const t0 = performance.now();
      document.querySelector('#bench-toggle').click();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return {
        wallMs: performance.now() - t0,
        reactMs: window.__bench.commits.reduce((s, c) => s + c.actualDuration, 0),
      };
    });
    const after = await metrics();
    results.push({
      wallMs,
      reactMs,
      styleMs: (after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000,
      layoutMs: (after.LayoutDuration - before.LayoutDuration) * 1000,
    });
  }
  await context.close();
  // 첫 전환은 워밍업으로 제외
  const warm = results.slice(1);
  return Object.fromEntries(
    ['wallMs', 'reactMs', 'styleMs', 'layoutMs'].map((k) => [k, median(warm.map((r) => r[k]))]),
  );
}

async function repeat(fn) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await fn());
  return Object.fromEntries(Object.keys(runs[0]).map((k) => [k, median(runs.map((r) => r[k]))]));
}

const list = {
  plain: await repeat(() => measureList('benchmarks-list-rendering--plain-10-k', 'window')),
  virtual: await repeat(() =>
    measureList('benchmarks-list-rendering--virtual-10-k', '[role="region"]'),
  ),
};
const toggle = {
  recreate: await repeat(() => measureToggle('benchmarks-color-mode-switch--recreate-theme')),
  cssVars: await repeat(() => measureToggle('benchmarks-color-mode-switch--css-variables')),
};

await browser.close();
server.close();

// ---------------------------------------------------------------- 출력
const f = (n, d = 1) =>
  n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
const ratio = (a, b) => `${f(a / b, 1)}배`;
const md = `
측정: ${new Date().toISOString().slice(0, 10)} · 헤드리스 Chromium · 1280×900 · 각 ${RUNS}회 중앙값

### 목록 렌더링 (10,000행)

| 항목 | 일반 표 | 가상화 표 | 차이 |
| --- | ---: | ---: | ---: |
| 화면에 그린 행 | ${f(list.plain.rows, 0)} | ${f(list.virtual.rows, 0)} | — |
| DOM 노드 수 | ${f(list.plain.domNodes, 0)} | ${f(list.virtual.domNodes, 0)} | ${ratio(list.plain.domNodes, list.virtual.domNodes)} 적음 |
| 첫 렌더 React 시간 | ${f(list.plain.mountMs)} ms | ${f(list.virtual.mountMs)} ms | ${ratio(list.plain.mountMs, list.virtual.mountMs)} 빠름 |
| JS 힙 | ${f(list.plain.heapMb)} MB | ${f(list.virtual.heapMb)} MB | ${ratio(list.plain.heapMb, list.virtual.heapMb)} 적음 |
| 스크롤 중 React 렌더 합계 | ${f(list.plain.scrollReactMs)} ms | ${f(list.virtual.scrollReactMs)} ms | — |
| 스크롤 프레임 p95 | ${f(list.plain.frameP95)} ms | ${f(list.virtual.frameP95)} ms | — |
| 스크롤 중 스타일·레이아웃 | ${f(list.plain.scrollStyleLayoutMs)} ms | ${f(list.virtual.scrollStyleLayoutMs)} ms | — |

### 다크 모드 전환 (버튼·칩·입력칸 각 300개, 1회 전환)

| 항목 | 테마 재생성 (이전) | CSS 변수 (현재) | 차이 |
| --- | ---: | ---: | ---: |
| 클릭 → 화면 반영 | ${f(toggle.recreate.wallMs)} ms | ${f(toggle.cssVars.wallMs)} ms | ${ratio(toggle.recreate.wallMs, toggle.cssVars.wallMs)} 빠름 |
| React 렌더 시간 | ${f(toggle.recreate.reactMs)} ms | ${f(toggle.cssVars.reactMs)} ms | ${toggle.cssVars.reactMs > 0 ? ratio(toggle.recreate.reactMs, toggle.cssVars.reactMs) + ' 빠름' : '리렌더 없음'} |
| 스타일 재계산 | ${f(toggle.recreate.styleMs)} ms | ${f(toggle.cssVars.styleMs)} ms | — |
| 레이아웃 | ${f(toggle.recreate.layoutMs)} ms | ${f(toggle.cssVars.layoutMs)} ms | — |
`;
console.log(md);
mkdirSync('.bench', { recursive: true });
writeFileSync('.bench/results.json', JSON.stringify({ list, toggle }, null, 2));
writeFileSync('.bench/results.md', md);
