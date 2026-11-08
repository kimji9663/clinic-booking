import { DEFAULT_BRAND_ID, brands, createBrandTheme, isBrandId, type BrandId } from '@clinic/theme';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { routerLinkThemeOptions } from '../app/LinkBehavior';

const BRAND_KEY = 'clinic-booking.brand';
/** 화면 모드(light/dark/system) 저장 키 — MUI 가 직접 읽고 쓴다 */
export const MODE_KEY = 'clinic-booking.mode';

interface BrandContextValue {
  brandId: BrandId;
  setBrandId: (id: BrandId) => void;
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

/**
 * 고객사 테마 + 화면 모드.
 * - 테마는 고객사가 바뀔 때만 새로 만든다. light/dark 색은 CSS 변수로 함께 들어 있다.
 * - 화면 모드는 MUI 가 관리한다: 저장값 → OS 설정(system) 순서, 바꾸면 <html data-color-scheme> 만 바뀐다.
 *   전환 중 CSS transition 을 꺼서 색이 한 번에 바뀌게 한다.
 */
export function BrandProvider({ children }: { children: ReactNode }) {
  const [brandId, setBrandId] = useState<BrandId>(readInitialBrand);
  useEffect(() => safeSet(BRAND_KEY, brandId), [brandId]);

  const theme = useMemo(
    () => createBrandTheme(brands[brandId], { components: routerLinkThemeOptions.components }),
    [brandId],
  );
  const value = useMemo(() => ({ brandId, setBrandId }), [brandId]);

  return (
    <BrandContext.Provider value={value}>
      <ThemeProvider
        theme={theme}
        defaultMode="system"
        modeStorageKey={MODE_KEY}
        disableTransitionOnChange
      >
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
