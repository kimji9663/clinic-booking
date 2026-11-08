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
│  └─ ui/      @clinic/ui    — 공통 컴포넌트 (AppShell, DataTable, VirtualDataTable, FormDialog, ConfirmDialog, Toast ...)
├─ apps/
│  └─ web/     @clinic/web   — 병원 예약 관리 앱 (Vite)
│     ├─ src/app/       라우트(코드 스플리팅), Provider, 레이아웃
│     ├─ src/api/       fetch 래퍼(zod 검증) + TanStack Query 훅
│     ├─ src/domain/    예약·의사·환자 zod 스키마와 상태 전이 규칙
│     ├─ src/features/  예약 등록 폼, 상태 변경 작업
│     ├─ src/pages/     대시보드 / 예약 관리 / 진료 일정 / 환자
│     └─ src/mocks/     MSW 핸들러 + 목업 DB (localStorage 저장, 백엔드 없는 데모용)
├─ .storybook/ 컴포넌트 문서 + 브랜드 전환 툴바 + a11y 검사
└─ e2e/        Playwright 크로스 브라우저 + axe 접근성 테스트
```

## 시작하기

```bash
npm install
npm run dev            # http://localhost:5173
npm run storybook      # http://localhost:6006
```

| 스크립트                  | 설명                                                     |
| ------------------------- | -------------------------------------------------------- |
| `npm run typecheck`       | 전체 워크스페이스 TypeScript 검사 (strict)               |
| `npm run lint`            | ESLint (jsx-a11y, react-hooks, hex 색상 하드코딩 금지)   |
| `npm test`                | Vitest 단위·통합 테스트 (앱 테스트는 MSW 목업 서버 사용) |
| `npm run build`           | 앱 프로덕션 빌드                                         |
| `npm run build-storybook` | Storybook 정적 빌드                                      |
| `npm run e2e`             | Playwright (최초 1회 `npx playwright install` 필요)      |

## 핵심 설계

### 1. 브랜드 테마 팩토리 (`packages/theme`)

- 고객사 브랜드 가이드 → `BrandTokens` → `createBrandTheme()` → MUI `Theme`
- 새 고객사 추가 = `tokens.ts`의 `brandIds`에 ID 추가 + `brands.ts`에 토큰 1개 작성. **화면 코드는 수정 없음.**
- palette / typography / shape / spacing / components(defaultProps, styleOverrides, variants) 커스터마이징
- 커스텀 Button variant `soft`, Typography variant `label`, `theme.brand` 필드를 **module augmentation**으로 타입 안전하게 추가

### 2. 접근성 자동 보정

- `ensureContrast()`: 브랜드 색이 WCAG AA(4.5:1) 대비 미달이면 기준을 만족할 때까지 명도를 조정
- 색이 **실제로 놓이는 모든 곳**(색 배경 위 글자, 카드·페이지 배경 위 글자, soft 버튼의 반투명 배경 위 글자)을 기준으로 보정
- 라이트·다크 모드 × 고객사 3곳 × 색상 6종을 단위 테스트로 검증
- MUI `getContrastRatio`는 소수점 2자리 반올림이라 4.49를 4.5로 통과시킨다 → E2E(axe)에서 발견해 정확한 계산으로 교체

### 3. 데이터 흐름

- MSW(서비스 워커)가 `/api/*` 요청을 가로채 목업 DB로 응답 → 백엔드 없이 배포해도 동작
  - 서비스 워커를 쓸 수 없는 환경에서는 페이지 내 fetch 가로채기로 자동 전환
  - 변경 사항은 localStorage(`clinic-booking:mock-db`)에 저장되어 새로고침해도 유지, 날짜가 바뀌면 오늘 기준 시드로 초기화
  - 직접 초기화하려면 개발자 도구에서 `localStorage.removeItem('clinic-booking:mock-db')` 후 새로고침
- 모든 응답은 `request(schema, ...)`에서 zod로 검증, TanStack Query 로 캐시·로딩·오류 상태 관리
- 예약 생성·상태 변경 후 관련 쿼리(예약, 환자)를 무효화해 화면 자동 갱신
- 환자 150명은 `GET /api/patients?cursor=&limit=` 커서 페이지네이션 + `useInfiniteQuery` 로 30명씩 이어 받음
- 상태 전이 규칙(`승인 대기 → 예약 확정 → 내원 접수 → 진료 완료`, 취소 가능 상태)을 도메인 함수로 정의해 화면과 목업 서버가 공유
- 필터(날짜·상태)는 URL 쿼리에 저장 → 새로고침·뒤로가기·링크 공유 시 유지

### 4. 타입 안정성

- `strict` + `noUncheckedIndexedAccess`, `any` 금지 (ESLint)
- `DataTable<T>`의 `Column<T>`: `key`에 따라 `render(value)`의 타입이 자동으로 좁혀짐
- `StatusConfig<S>`: 상태가 추가되면 표시 정의 누락이 컴파일 에러
- API 응답·폼 입력은 zod 스키마 하나로 런타임 검증, 타입은 `z.infer`로 추론 (폼과 목업 서버가 같은 스키마 사용)

### 5. 스타일 작성 규칙 (Emotion)

- 색상·간격·반경은 반드시 `theme`에서 가져온다. `apps/`, `packages/ui`에서 hex 리터럴은 lint 에러.
- **`sx`**: 한 곳에서만 쓰는 레이아웃 조정 / **`styled`**: 재사용되거나 prop에 따라 바뀌는 스타일
- 스타일 전용 prop은 `shouldForwardProp`으로 DOM 전달 차단 (`StatCard`의 `tone`)

- 공통 컴포넌트는 라우터를 모른다. 앱에서 테마의 `MuiButtonBase.LinkComponent`로 React Router 링크를 주입

### 6. 반응형 · 접근성 · 크로스 브라우징

- `AppShell`: md 이상 고정 사이드바 / 미만 햄버거 + Drawer. `FormDialog`: 모바일에서 전체 화면
- `DataTable`: sm 미만에서 표 → 카드 + 정의 목록(`dl`)으로 전환, 로딩 시 스켈레톤 + `aria-busy`
- `VirtualDataTable`: TanStack Virtual 로 보이는 행만 렌더링 (10,000행 스토리), `onLoadMore` 로 무한 스크롤
  - 렌더링되지 않은 행이 있어도 `aria-rowcount`/`aria-rowindex`(카드는 `aria-setsize`/`aria-posinset`)로 전체 위치 전달
  - `scrollMode="window"`: 페이지 전체 스크롤을 따라 가상화(`useWindowVirtualizer`), 표 머리글은 AppShell 상단 바 아래(`--app-header-height`)에 고정 — 환자 페이지에서 사용
  - `scrollMode="container"`(기본): 고정 높이 스크롤 영역, `role="region"` + `tabIndex=0` 으로 키보드(PageDown/End) 스크롤
  - 불러온 건수는 `role="status"` 로 안내
- 본문 바로가기, 랜드마크, `aria-current`, 표 `caption`, 키보드 포커스 링
- 페이지 이동 시 본문으로 포커스 이동 + 문서 제목 갱신 (스크린리더가 새 페이지를 인지)
- 행마다 반복되는 버튼은 `"14:00 윤*윤 승인"`처럼 구분되는 접근 가능한 이름 제공
- 폼 오류는 `aria-invalid` + `aria-describedby`로 연결, 토스트는 성공 `role="status"` / 오류 `role="alert"`
- 위험한 작업(예약 취소)은 확인 대화상자 + 기본 포커스를 "닫기"에 둠
- 개인정보 마스킹: 이름 `김*준`, 연락처 `010-****-4410`
- Playwright: Chromium · Firefox · WebKit · 모바일(iPhone, Pixel)에서 E2E
  - axe 검사: 고객사 3곳 × 라이트/다크 × 4개 페이지
  - Firefox 는 기능 테스트만 실행 (Playwright Firefox + MSW 서비스 워커 환경에서 axe 실행 시 페이지 크래시)

## 테스트 현황

| 종류     | 도구                     | 내용                                                                                                                          |
| -------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 단위     | Vitest                   | 명도 대비 보정, 테마(모드별), 마스킹, 날짜·전화번호 포맷                                                                      |
| 컴포넌트 | Vitest + Testing Library | DataTable, VirtualDataTable(가상화 범위·무한 스크롤 호출), AppShell, ConfirmDialog, Toast, StatusBadge                        |
| 통합     | Vitest + MSW             | 라우팅·포커스 이동, 브랜드/다크 모드 전환, 필터-URL 동기화, 예약 승인·취소, 예약 등록 폼(검증·자동 하이픈·중복 시간·409 처리) |
| E2E      | Playwright + axe         | 5개 브라우저 환경, 예약 등록 흐름, 전체 페이지 접근성                                                                         |

## 다음 단계

- [x] React Router로 예약 관리 / 진료 일정 / 환자 페이지 추가 (+ 라우트 단위 코드 스플리팅)
- [x] TanStack Query + MSW로 목업 API 연결
- [x] 예약 등록 폼 (react-hook-form + zod) / 확인 Dialog / Toast
- [x] 다크 모드
- [x] 환자 150명 대용량 목록: TanStack Virtual 가상화 + 무한 스크롤
- [ ] 공수 비교 지표: 신규 고객사 추가 시 변경 파일·라인 수 기록
- [ ] 배포 (Vercel/Netlify) + Storybook 배포
