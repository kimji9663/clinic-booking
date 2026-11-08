import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../packages/ui/src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  // 성능 측정(npm run bench)용 빌드에서만 React 프로파일링 빌드를 써서 <Profiler> 측정값을 얻는다
  viteFinal: (viteConfig) => {
    if (process.env.STORYBOOK_BENCH !== '1') return viteConfig;
    // 기존 alias 는 배열·객체 두 형식 모두 유지한다
    const existing = viteConfig.resolve?.alias ?? [];
    const aliases = Array.isArray(existing)
      ? existing
      : Object.entries(existing).map(([find, replacement]) => ({ find, replacement }));
    return {
      ...viteConfig,
      resolve: {
        ...viteConfig.resolve,
        alias: [...aliases, { find: /^react-dom\/client$/, replacement: 'react-dom/profiling' }],
      },
    };
  },
};

export default config;
