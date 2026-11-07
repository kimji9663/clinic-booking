/** 서비스에 등록된 고객사(병원) ID 목록. 새 고객사는 여기와 brands/ 에만 추가하면 된다. */
export const brandIds = ['sky-pediatrics', 'barun-dental', 'ongyeol-derma'] as const;

export type BrandId = (typeof brandIds)[number];

export const DEFAULT_BRAND_ID: BrandId = 'sky-pediatrics';

export function isBrandId(value: unknown): value is BrandId {
  return typeof value === 'string' && (brandIds as readonly string[]).includes(value);
}

/**
 * 고객사가 제공하는 브랜드 가이드를 코드로 옮긴 디자인 토큰.
 * hex 색상 리터럴은 이 패키지에서만 허용된다 (ESLint 규칙으로 강제).
 */
export interface BrandTokens {
  id: BrandId;
  /** 정식 명칭 (예: 하늘소아과의원) */
  name: string;
  /** 좁은 화면에서 쓰는 짧은 이름 */
  shortName: string;
  /** 진료과 */
  department: string;
  tagline: string;
  colors: {
    primary: string;
    secondary: string;
    /** 페이지 배경 */
    background: string;
  };
  /** primary 버튼 위 글자색 선호. 대비가 부족하면 primary 색을 자동 보정한다. */
  onPrimary: 'light' | 'dark';
  typography: {
    body: string;
    heading: string;
  };
  /** 기본 모서리 반경(px) */
  radius: number;
  /** compact: 정보 밀도가 높은 화면을 선호하는 고객사 (기본 컴포넌트 size=small) */
  density: 'comfortable' | 'compact';
}

/** 런타임에 theme.brand 로 접근할 수 있는 고객사 정보 */
export type BrandMeta = Pick<BrandTokens, 'id' | 'name' | 'shortName' | 'department' | 'tagline'>;
