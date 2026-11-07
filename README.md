# 병원 예약 관리 서비스 (화이트라벨)

여러 병원(고객사)에 **같은 코드베이스**로 납품하고, 병원마다 **브랜드만 바꿔** 제공하는 예약 관리 웹 서비스입니다.
공통 컴포넌트 라이브러리와 MUI `createTheme` 기반 브랜드 테마 팩토리를 중심으로 구성했습니다.

> 등장하는 병원·의료진·환자는 모두 가상입니다.

## 가상 고객사

| ID               | 병원           | 특징                                                                          |
| ---------------- | -------------- | ----------------------------------------------------------------------------- |
| `sky-pediatrics` | 하늘소아과의원 | 밝은 하늘색, 둥근 모서리(16px) — 하늘색은 흰 글자 대비가 부족해 **자동 보정** |
| `barun-dental`   | 바른치과       | 청록색, 촘촘한 화면(`density: compact` → 기본 컴포넌트 size=small)            |
| `ongyeol-derma`  | 온결피부과     | 로즈 톤, 제목 세리프체, 각진 모서리(4px)                                      |

앱에서 우측 상단 **고객사** 셀렉트로 바꾸거나 `?brand=barun-dental` 쿼리로 확인할 수 있습니다.

## 구조

```
clinic-booking/
├─ packages/
│  ├─ theme/   @clinic/theme — 브랜드 토큰, createBrandTheme, 명도 대비 보정, MUI 타입 확장
│  └─ ui/      @clinic/ui    — 공통 컴포넌트 (AppShell, DataTable, StatCard, StatusBadge ...)
├─ apps/
│  └─ web/     @clinic/web   — 병원 예약 관리 앱 (Vite)
├─ .storybook/ 컴포넌트 문서 + 브랜드 전환 툴바 + a11y 검사
└─ e2e/        Playwright 크로스 브라우저 + axe 접근성 테스트
```

## 시작하기

```bash
npm install
npm run dev            # http://localhost:5173
npm run storybook      # http://localhost:6006
```

| 스크립트                  | 설명                                                   |
| ------------------------- | ------------------------------------------------------ |
| `npm run typecheck`       | 전체 워크스페이스 TypeScript 검사 (strict)             |
| `npm run lint`            | ESLint (jsx-a11y, react-hooks, hex 색상 하드코딩 금지) |
| `npm test`                | Vitest 단위 테스트                                     |
| `npm run build`           | 앱 프로덕션 빌드                                       |
| `npm run build-storybook` | Storybook 정적 빌드                                    |
| `npm run e2e`             | Playwright (최초 1회 `npx playwright install` 필요)    |

## 핵심 설계

### 1. 브랜드 테마 팩토리 (`packages/theme`)

- 고객사 브랜드 가이드 → `BrandTokens` → `createBrandTheme()` → MUI `Theme`
- 새 고객사 추가 = `tokens.ts`의 `brandIds`에 ID 추가 + `brands.ts`에 토큰 1개 작성. **화면 코드는 수정 없음.**
- palette / typography / shape / spacing / components(defaultProps, styleOverrides, variants) 커스터마이징
- 커스텀 Button variant `soft`, Typography variant `label`, `theme.brand` 필드를 **module augmentation**으로 타입 안전하게 추가

### 2. 접근성 자동 보정

- `ensureContrast()`: 브랜드 색이 WCAG AA(4.5:1) 대비 미달이면 기준을 만족할 때까지 명도를 조정
- 브랜드·상태 색 전부에 적용하고, 단위 테스트로 모든 고객사 테마의 대비를 검증

### 3. 타입 안정성

- `strict` + `noUncheckedIndexedAccess`, `any` 금지 (ESLint)
- `DataTable<T>`의 `Column<T>`: `key`에 따라 `render(value)`의 타입이 자동으로 좁혀짐
- `StatusConfig<S>`: 상태가 추가되면 표시 정의 누락이 컴파일 에러
- API 응답은 zod 스키마로 런타임 검증, 타입은 `z.infer`로 추론

### 4. 스타일 작성 규칙 (Emotion)

- 색상·간격·반경은 반드시 `theme`에서 가져온다. `apps/`, `packages/ui`에서 hex 리터럴은 lint 에러.
- **`sx`**: 한 곳에서만 쓰는 레이아웃 조정 / **`styled`**: 재사용되거나 prop에 따라 바뀌는 스타일
- 스타일 전용 prop은 `shouldForwardProp`으로 DOM 전달 차단 (`StatCard`의 `tone`)

### 5. 반응형 · 크로스 브라우징

- `AppShell`: md 이상 고정 사이드바 / 미만 햄버거 + Drawer
- `DataTable`: sm 미만에서 표 → 카드 + 정의 목록(`dl`)으로 전환
- 본문 바로가기, 랜드마크, `aria-current`, 표 `caption`, 키보드 포커스 링
- Playwright: Chromium · Firefox · WebKit · 모바일(iPhone, Pixel)에서 E2E + axe 검사

## 다음 단계

- [ ] React Router로 예약 관리 / 진료 일정 / 환자 페이지 추가 (+ 라우트 단위 코드 스플리팅)
- [ ] TanStack Query + MSW로 목업 API 연결
- [ ] 예약 등록 폼 (react-hook-form + zod) / 확인 Dialog / Toast
- [ ] 다크 모드 (colorSchemes)
- [ ] 공수 비교 지표: 신규 고객사 추가 시 변경 파일·라인 수 기록
