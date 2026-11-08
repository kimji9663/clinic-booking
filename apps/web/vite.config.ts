import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages(https://<user>.github.io/clinic-booking/)처럼 하위 경로에 배포할 때 BASE_PATH 로 지정
  base: process.env.BASE_PATH ?? '/',
  server: { port: 5173 },
});
