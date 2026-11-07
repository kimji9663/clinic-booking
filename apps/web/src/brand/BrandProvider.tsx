import { DEFAULT_BRAND_ID, brands, createBrandTheme, isBrandId, type BrandId } from '@clinic/theme';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'clinic-booking.brand';

interface BrandContextValue {
  brandId: BrandId;
  setBrandId: (id: BrandId) => void;
}

const BrandContext = createContext<BrandContextValue | null>(null);

/** ?brand= 쿼리 → localStorage → 기본값 순서로 고객사를 결정 */
function readInitialBrand(): BrandId {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('brand');
    if (isBrandId(fromUrl)) return fromUrl;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isBrandId(saved)) return saved;
  } catch {
    // 시크릿 모드 등에서 storage 접근이 막혀도 기본 브랜드로 동작
  }
  return DEFAULT_BRAND_ID;
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brandId, setBrandId] = useState<BrandId>(readInitialBrand);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, brandId);
    } catch {
      // 저장 실패는 무시
    }
    document.title = `예약 관리 | ${brands[brandId].name}`;
  }, [brandId]);

  const theme = useMemo(() => createBrandTheme(brands[brandId]), [brandId]);
  const value = useMemo(() => ({ brandId, setBrandId }), [brandId]);

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
