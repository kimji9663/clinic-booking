import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetDb } from '../mocks/db';
import { handlers } from '../mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetDb();
});
afterAll(() => server.close());
