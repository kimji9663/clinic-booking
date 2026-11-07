import { DEFAULT_BRAND_ID, brandIds, brands, createBrandTheme, isBrandId } from '@clinic/theme';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import type { Decorator, Preview } from '@storybook/react-vite';

/** 툴바에서 고른 고객사 테마를 모든 스토리에 적용 */
const withBrandTheme: Decorator = (Story, context) => {
  const brandId = isBrandId(context.globals.brand) ? context.globals.brand : DEFAULT_BRAND_ID;
  return (
    <ThemeProvider theme={createBrandTheme(brands[brandId])}>
      <CssBaseline />
      <Story />
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
  },
  initialGlobals: { brand: DEFAULT_BRAND_ID },
  parameters: {
    // 접근성 위반이 있으면 스토리 테스트를 실패시킨다
    a11y: { test: 'error' },
    controls: { matchers: { color: /(background|color)$/i } },
  },
};

export default preview;
