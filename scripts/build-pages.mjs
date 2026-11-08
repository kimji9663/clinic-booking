/**
 * GitHub Pages 배포용 빌드: 앱 + Storybook 을 apps/web/dist 하나로 묶는다.
 *   https://<user>.github.io/<repo>/            → 앱
 *   https://<user>.github.io/<repo>/storybook/  → Storybook
 *
 * 사용: BASE_PATH=/clinic-booking/ node scripts/build-pages.mjs  (기본값 /clinic-booking/)
 */
import { execSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';

const basePath = process.env.BASE_PATH ?? '/clinic-booking/';
const dist = 'apps/web/dist';
const run = (command, env = {}) =>
  execSync(command, { stdio: 'inherit', env: { ...process.env, ...env } });

run('npm run build', { BASE_PATH: basePath });

// Pages 는 SPA 주소 재작성을 지원하지 않는다. 없는 경로(/clinic-booking/patients 새로고침 등)는
// 404.html 을 보여 주므로 index.html 을 그대로 복사해 두면 앱이 뜨고 라우터가 주소를 이어받는다.
copyFileSync(`${dist}/index.html`, `${dist}/404.html`);

run(`npm run build-storybook -- --quiet -o ${dist}/storybook`);

console.log(`\nGitHub Pages 빌드 완료: ${dist} (base ${basePath})`);
