import { DEFAULT_BRAND_ID, brands, createBrandTheme, isBrandId, type BrandId } from '@clinic/theme';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme, type PaletteMode } from '@mui/material/styles';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { routerLinkThemeOptions } from '../app/LinkBehavior';

const BRAND_KEY = 'clinic-booking.brand';
const MODE_KEY = 'clinic-booking.mode';

interface BrandContextValue {
  brandId: BrandId;
  setBrandId: (id: BrandId) => void;
  mode: PaletteMode;
  setMode: (mode: PaletteMode) => void;
}

const BrandContext = createContext<BrandContextValue | null>(null);

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // 시크릿 모드 등에서 storage 접근이 막혀도 기본값으로 동작
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 저장 실패는 무시
  }
}

/** ?brand= 쿼리 → localStorage → 기본값 순서로 고객사를 결정 */
function readInitialBrand(): BrandId {
  const fromUrl = new URLSearchParams(window.location.search).get('brand');
  if (isBrandId(fromUrl)) return fromUrl;
  const saved = safeGet(BRAND_KEY);
  return isBrandId(saved) ? saved : DEFAULT_BRAND_ID;
}

/** localStorage → OS 설정(prefers-color-scheme) 순서로 화면 모드를 결정 */
function readInitialMode(): PaletteMode {
  const saved = safeGet(MODE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brandId, setBrandId] = useState<BrandId>(readInitialBrand);
  const [mode, setMode] = useState<PaletteMode>(readInitialMode);

  useEffect(() => safeSet(BRAND_KEY, brandId), [brandId]);
  useEffect(() => safeSet(MODE_KEY, mode), [mode]);

  const theme = useMemo(
    () => createTheme(createBrandTheme(brands[brandId], mode), routerLinkThemeOptions),
    [brandId, mode],
  );
  const value = useMemo(() => ({ brandId, setBrandId, mode, setMode }), [brandId, mode]);

  return (
    <BrandContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </BrandContext.Provider>
  );
}

export function useBrand(): BrandContextValue {
  const context = useContext(BrandContext);
  if (!context) throw new Error('useBrand 는 BrandProvider 안에서만 사용할 수 있습니다.');
  return context;
}
