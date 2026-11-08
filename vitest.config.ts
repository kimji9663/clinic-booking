import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    css: false,
    projects: [
      {
        extends: true,
        test: {
          name: 'packages',
          include: ['packages/*/src/**/*.test.{ts,tsx}'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'web',
          include: ['apps/web/src/**/*.test.{ts,tsx}'],
          // 앱 테스트는 MSW 목업 서버로 실제 fetch 흐름까지 검증한다
          setupFiles: ['./vitest.setup.ts', './apps/web/src/test/setup.ts'],
        },
      },
    ],
  },
});
