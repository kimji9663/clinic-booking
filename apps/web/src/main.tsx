import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

/**
 * 백엔드가 없는 데모이므로 개발·배포 모두 MSW 목업 API 를 켠다.
 * 실제 API 가 생기면 import.meta.env.DEV 조건으로 감싸면 된다.
 */
async function enableMocking() {
  const { worker, startEventStreamMocking, startInPageMocking } = await import('./mocks/browser');
  try {
    await worker.start({
      onUnhandledFrame: 'bypass',
      quiet: import.meta.env.PROD,
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    });
    await startEventStreamMocking();
  } catch (error) {
    // 서비스 워커 등록이 막힌 환경(앱 내장 브라우저, 일부 시크릿 모드 등) → 페이지 내 가로채기로 대체
    console.warn('서비스 워커를 쓸 수 없어 페이지 내 목업 API 로 전환합니다.', error);
    await startInPageMocking();
  }
}

const container = document.getElementById('root');
if (!container) throw new Error('#root 요소를 찾을 수 없습니다.');

try {
  await enableMocking();
} catch (error) {
  // 목업 API 를 아예 켜지 못해도 빈 화면 대신 앱을 띄우고, 각 화면의 오류 상태(다시 시도)로 안내한다.
  console.error('목업 API(MSW)를 시작하지 못했습니다.', error);
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
