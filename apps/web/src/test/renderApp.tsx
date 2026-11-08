import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { AppProviders } from '../app/AppProviders';
import { routes } from '../app/routes';

/**
 * 실제 라우트·Provider 구성 그대로 원하는 주소에서 앱을 렌더링.
 * 실시간 알림(SSE)은 알림 테스트에서만 켠다 — Node 의 fetch(undici)+MSW 환경에서 열린 스트림이
 * 다른 요청과 엉켜 간헐적으로 실패하는 문제가 있어, 관련 없는 테스트는 연결하지 않는다.
 */
export function renderApp(path = '/', { realtime = false }: { realtime?: boolean } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();

  const utils = render(
    <AppProviders queryClient={queryClient} realtime={realtime}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...utils, user, router };
}
