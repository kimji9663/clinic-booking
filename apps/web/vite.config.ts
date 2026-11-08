import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { brands } from '../../packages/theme/src/brands';
import { DARK_BACKGROUND, DEFAULT_BRAND_ID } from '../../packages/theme/src/tokens';
import {
  BRAND_STORAGE_KEY,
  INITIAL_SCHEME_STYLE_ID,
  MODE_STORAGE_KEY,
} from './src/brand/storageKeys';

/**
 * 새로고침 직후 깜빡임(라이트 배경이 잠깐 보였다가 다크로 바뀌는 현상) 방지.
 * 앱 JS 가 내려받아지고 목업 API(서비스 워커)가 준비되기 전까지 화면이 비어 있는데,
 * 그 사이에도 저장된 모드와 고객사 배경색으로 칠해 두도록 <head> 에 작은 동기 스크립트를 넣는다.
 * 색은 브랜드 토큰 파일에서 빌드 시점에 가져오므로, 고객사를 추가해도 이 코드는 바꾸지 않는다.
 */
function initialColorScheme(): Plugin {
  const backgrounds = Object.fromEntries(
    Object.values(brands).map((brand) => [brand.id, brand.colors.background]),
  );
  const config = {
    modeKey: MODE_STORAGE_KEY,
    brandKey: BRAND_STORAGE_KEY,
    styleId: INITIAL_SCHEME_STYLE_ID,
    defaultBrand: DEFAULT_BRAND_ID,
    dark: DARK_BACKGROUND,
    backgrounds,
  };
  const script = `(function (c) {
  try {
    var mode = localStorage.getItem(c.modeKey);
    var dark = mode === 'dark' || (mode !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    var brand = new URLSearchParams(location.search).get('brand') || localStorage.getItem(c.brandKey);
    var light = c.backgrounds[brand] || c.backgrounds[c.defaultBrand];
    var scheme = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-color-scheme', scheme);
    var style = document.createElement('style');
    style.id = c.styleId;
    style.textContent = 'html{color-scheme:' + scheme + ';background:' + (dark ? c.dark : light) + '}';
    document.head.appendChild(style);
  } catch (e) {}
})(${JSON.stringify(config)});`;

  return {
    name: 'initial-color-scheme',
    transformIndexHtml: () => [{ tag: 'script', children: script, injectTo: 'head-prepend' }],
  };
}

export default defineConfig({
  plugins: [react(), initialColorScheme()],
  // GitHub Pages(https://<user>.github.io/clinic-booking/)처럼 하위 경로에 배포할 때 BASE_PATH 로 지정
  base: process.env.BASE_PATH ?? '/',
  server: { port: 5173 },
});
