import { DEFAULT_BRAND_ID, brandIds, brands, createBrandTheme, isBrandId } from '@clinic/theme';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, useColorScheme } from '@mui/material/styles';
import type { Decorator, Preview } from '@storybook/react-vite';
import { useEffect, type ReactNode } from 'react';

/** 툴바의 라이트/다크 선택을 CSS 변수 테마에 반영 (테마를 다시 만들지 않는다) */
function SyncMode({ mode, children }: { mode: 'light' | 'dark'; children: ReactNode }) {
  const { setMode } = useColorScheme();
  useEffect(() => setMode(mode), [mode, setMode]);
  return children;
}

/** 툴바에서 고른 고객사 테마를 모든 스토리에 적용 */
const withBrandTheme: Decorator = (Story, context) => {
  const brandId = isBrandId(context.globals.brand) ? context.globals.brand : DEFAULT_BRAND_ID;
  const mode = context.globals.mode === 'dark' ? 'dark' : 'light';
  return (
    <ThemeProvider
      theme={createBrandTheme(brands[brandId])}
      defaultMode={mode}
      storageManager={null}
    >
      <CssBaseline enableColorScheme />
      <SyncMode mode={mode}>
        <Story />
      </SyncMode>
    </ThemeProvider>
  );
};

const preview: Preview = {
  decorators: [withBrandTheme],
  globalTypes: {
    brand: {
      description: '고객사 브랜드 테마',
      toolbar: {
        title: 'Brand',
        icon: 'paintbrush',
        items: brandIds.map((id) => ({ value: id, title: brands[id].name })),
        dynamicTitle: true,
      },
    },
    mode: {
      description: '화면 모드',
      toolbar: {
        title: 'Mode',
        icon: 'contrast',
        items: [
          { value: 'light', title: '라이트' },
          { value: 'dark', title: '다크' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { brand: DEFAULT_BRAND_ID, mode: 'light' },
  parameters: {
    // 접근성 위반이 있으면 스토리 테스트를 실패시킨다
    a11y: { test: 'error' },
    controls: { matchers: { color: /(background|color)$/i } },
  },
};

export default preview;
