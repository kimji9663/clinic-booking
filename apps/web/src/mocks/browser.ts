import { FetchInterceptor } from '@mswjs/interceptors/fetch';
import type { RequestHandler } from 'msw';
import { setupWorker } from 'msw/browser';
import { InterceptorSource, defineNetwork } from 'msw/experimental';
import { configureEventSimulation, eventHandlers } from './events';
import { handlers } from './handlers';

/** REST API 는 서비스 워커가 가로챈다 (네트워크 탭에서 요청을 확인할 수 있음) */
export const worker = setupWorker(...handlers);

/** 페이지 안에서 fetch 자체를 가로채 주어진 핸들러로 응답한다. 처리하지 않는 요청은 그대로 통과. */
async function startInPage(list: RequestHandler[]) {
  const network = defineNetwork({
    sources: [new InterceptorSource({ interceptors: [new FetchInterceptor()] })],
    handlers: list,
    onUnhandledFrame: 'bypass',
  });
  await network.enable();
}

/**
 * 실시간 이벤트 스트림(SSE)은 페이지 안에서 가로챈다.
 * MSW 는 서비스 워커의 스트리밍 응답을 ReadableStream 전송을 지원하는 브라우저에서만 흘려보내고,
 * 그 외(Safari 등)에서는 응답 본문을 끝까지 모은 뒤 전달하기 때문에 끝나지 않는 SSE 가 멈춰 버린다.
 */
export function startEventStreamMocking() {
  applySimulationSetting();
  return startInPage(eventHandlers);
}

/**
 * 자동 이벤트 시뮬레이션 끄기: localStorage 에 clinic-booking:event-simulation = off
 * (E2E 처럼 데이터가 저절로 바뀌면 안 되는 경우. POST /api/dev/events 로 직접 발생시키는 것은 계속 동작)
 */
export const EVENT_SIMULATION_KEY = 'clinic-booking:event-simulation';
function applySimulationSetting() {
  try {
    if (window.localStorage.getItem(EVENT_SIMULATION_KEY) === 'off') {
      configureEventSimulation({ enabled: false });
    }
  } catch {
    // 저장소를 읽을 수 없으면 기본값(켜짐)
  }
}

/**
 * 서비스 워커를 등록할 수 없는 환경(앱 내장 브라우저, 일부 시크릿 모드, 사내 정책 등)에서는
 * 모든 API 를 페이지 안에서 처리한다. 네트워크 탭에는 요청이 보이지 않지만 화면 동작은 동일하다.
 */
export function startInPageMocking() {
  applySimulationSetting();
  return startInPage([...handlers, ...eventHandlers]);
}
