import { FetchInterceptor } from '@mswjs/interceptors/fetch';
import { setupWorker } from 'msw/browser';
import { InterceptorSource, defineNetwork } from 'msw/experimental';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

/**
 * 서비스 워커를 등록할 수 없는 환경(앱 내장 브라우저, 일부 시크릿 모드, 사내 정책 등)에서는
 * 페이지 안에서 fetch 자체를 가로채는 방식으로 같은 핸들러를 실행한다.
 * 네트워크 탭에는 요청이 보이지 않지만 화면 동작은 동일하다.
 */
export async function startInPageMocking() {
  const network = defineNetwork({
    sources: [new InterceptorSource({ interceptors: [new FetchInterceptor()] })],
    handlers,
    onUnhandledFrame: 'bypass',
  });
  await network.enable();
}
