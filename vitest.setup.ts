import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// MSW sse() 핸들러는 만들 때 EventSource 가 있는지만 확인한다 (Node 에는 없음).
// 앱은 fetch 기반 SSE 클라이언트를 쓰므로 빈 클래스로 충분하다.
if (typeof globalThis.EventSource === 'undefined') {
  globalThis.EventSource = class {} as unknown as typeof EventSource;
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
