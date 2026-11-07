import type { BrandId, BrandTokens } from './tokens';

const PRETENDARD =
  "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
const SERIF_KR = "'Noto Serif KR', 'Nanum Myeongjo', serif";

/** 가상 고객사 1 — 밝고 친근한 소아과. 하늘색은 흰 글자 대비가 부족해 자동 보정 대상이 된다. */
const skyPediatrics: BrandTokens = {
  id: 'sky-pediatrics',
  name: '하늘소아과의원',
  shortName: '하늘소아과',
  department: '소아청소년과',
  tagline: '아이와 부모 모두 편안한 진료',
  colors: { primary: '#3BA0F5', secondary: '#FFB648', background: '#F5F9FF' },
  onPrimary: 'light',
  typography: { body: PRETENDARD, heading: PRETENDARD },
  radius: 16,
  density: 'comfortable',
};

/** 가상 고객사 2 — 신뢰감 있는 치과. 예약이 많아 촘촘한(compact) 화면을 선호. */
const barunDental: BrandTokens = {
  id: 'barun-dental',
  name: '바른치과',
  shortName: '바른치과',
  department: '치과',
  tagline: '바른 진단, 정직한 치료',
  colors: { primary: '#12A594', secondary: '#1F3A5F', background: '#F4F8F7' },
  onPrimary: 'light',
  typography: { body: PRETENDARD, heading: PRETENDARD },
  radius: 8,
  density: 'compact',
};

/** 가상 고객사 3 — 차분한 프리미엄 피부과. 제목에 세리프체 사용. */
const ongyeolDerma: BrandTokens = {
  id: 'ongyeol-derma',
  name: '온결피부과',
  shortName: '온결피부과',
  department: '피부과',
  tagline: '피부 결을 따라 섬세하게',
  colors: { primary: '#B4536A', secondary: '#8C6A4F', background: '#FBF7F4' },
  onPrimary: 'light',
  typography: { body: PRETENDARD, heading: SERIF_KR },
  radius: 4,
  density: 'comfortable',
};

export const brands: Readonly<Record<BrandId, BrandTokens>> = {
  'sky-pediatrics': skyPediatrics,
  'barun-dental': barunDental,
  'ongyeol-derma': ongyeolDerma,
};
