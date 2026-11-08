import { brands, createBrandScheme, createBrandTheme } from '@clinic/theme';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CssBaseline from '@mui/material/CssBaseline';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import {
  ThemeProvider,
  createTheme,
  useColorScheme,
  type PaletteMode,
  type PaletteOptions,
} from '@mui/material/styles';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Profiler, useMemo, useState, type ProfilerOnRenderCallback } from 'react';

/**
 * 성능 비교용 스토리 — 다크 모드 전환 비용.
 * - CSS 변수 방식(현재): 테마는 그대로, <html data-color-scheme> 만 바뀜
 * - 테마 재생성 방식(이전): 모드가 바뀔 때마다 createTheme 으로 새 테마를 만들어 내려보냄
 * 같은 화면(버튼·칩·입력칸 각 300개)에서 "전환" 버튼(#bench-toggle)을 눌러 비교한다.
 */
const meta: Meta = {
  title: 'Benchmarks/Color mode switch',
  parameters: { layout: 'padded', a11y: { test: 'off' } },
};
export default meta;

type Story = StoryObj;

const COUNT = 300;
const tokens = brands['sky-pediatrics'];

const record: ProfilerOnRenderCallback = (_id, phase, actualDuration) => {
  window.__bench ??= { commits: [] };
  window.__bench.commits.push({ phase, actualDuration });
};

function Content() {
  return (
    <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
      {Array.from({ length: COUNT }, (_, i) => (
        <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button variant={i % 2 ? 'contained' : 'soft'} size="small">
            버튼 {i}
          </Button>
          <Chip label={`칩 ${i}`} color="primary" size="small" />
          <TextField size="small" label={`입력 ${i}`} sx={{ width: 120 }} />
        </Stack>
      ))}
    </Stack>
  );
}

function CssVarsToggle() {
  const { mode, setMode } = useColorScheme();
  return (
    <Button id="bench-toggle" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
      전환 (현재 {mode})
    </Button>
  );
}

export const CssVariables: Story = {
  name: 'CSS 변수 방식 (현재)',
  render: () => {
    const theme = createBrandTheme(tokens);
    return (
      <ThemeProvider theme={theme} defaultMode="light" storageManager={null}>
        <CssBaseline />
        <CssVarsToggle />
        <Profiler id="cssvars" onRender={record}>
          <Content />
        </Profiler>
      </ThemeProvider>
    );
  },
};

/** 이전 구현: 모드마다 팔레트를 넣어 테마를 새로 만든다 (CSS 변수 없음) */
function RecreateThemeDemo() {
  const [mode, setMode] = useState<PaletteMode>('light');
  const theme = useMemo(() => {
    const scheme = createBrandScheme(tokens, mode);
    return createTheme({
      palette: { mode, ...(scheme.palette as PaletteOptions) },
      shape: { borderRadius: tokens.radius },
    });
  }, [mode]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Button id="bench-toggle" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
        전환 (현재 {mode})
      </Button>
      <Profiler id="recreate" onRender={record}>
        <Content />
      </Profiler>
    </ThemeProvider>
  );
}

export const RecreateTheme: Story = {
  name: '테마 재생성 방식 (이전)',
  render: () => <RecreateThemeDemo />,
};
