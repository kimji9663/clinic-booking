import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetDb } from '../mocks/db';
import { configureEventSimulation, eventHandlers, resetEventServer } from '../mocks/events';
import { handlers } from '../mocks/handlers';

export const server = setupServer(...handlers, ...eventHandlers);

// 테스트에서는 시간에 따른 자동 이벤트를 끄고 emitClinicEvent 로 직접 발생시킨다
configureEventSimulation({ enabled: false });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetEventServer();
  resetDb();
});
afterAll(() => server.close());
