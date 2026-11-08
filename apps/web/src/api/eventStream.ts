/**
 * fetch 기반 Server-Sent Events 클라이언트.
 *
 * 브라우저 EventSource 대신 직접 구현한 이유
 * - 요청 헤더(Last-Event-ID, 인증 토큰 등)를 직접 정할 수 있다.
 * - fetch 를 쓰므로 MSW(서비스 워커·페이지 내 가로채기)와 Node 테스트 환경에서 똑같이 동작한다.
 * - 재연결 간격(지수 백오프)과 연결 상태를 화면에 알릴 수 있다.
 *
 * 메시지 해석은 HTML 표준의 event stream 규칙을 따른다.
 * https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation
 */

export interface EventStreamMessage {
  /** event: 필드 (없으면 'message') */
  event: string;
  data: string;
  id?: string;
}

export type EventStreamStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

interface ParserCallbacks {
  onMessage: (message: EventStreamMessage) => void;
  onRetry?: (ms: number) => void;
  /** id: 필드를 받으면 (data 없이 id 만 와도) 마지막 이벤트 id 를 갱신 */
  onId?: (id: string) => void;
}

/** 텍스트 조각을 받아 줄 단위로 해석하는 파서. 조각 경계가 줄·줄바꿈 중간이어도 된다. */
export function createEventStreamParser({ onMessage, onRetry, onId }: ParserCallbacks) {
  let line = '';
  let afterCR = false;
  let data: string[] = [];
  let event = '';
  let id: string | undefined;

  const dispatch = () => {
    if (data.length > 0) onMessage({ event: event || 'message', data: data.join('\n'), id });
    data = [];
    event = '';
    id = undefined;
  };

  const processLine = (line: string) => {
    if (line === '') return dispatch();
    if (line.startsWith(':')) return; // 주석(하트비트)
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    switch (field) {
      case 'data':
        data.push(value);
        break;
      case 'event':
        event = value;
        break;
      case 'id':
        if (!value.includes('\0')) {
          id = value;
          onId?.(value);
        }
        break;
      case 'retry':
        if (/^\d+$/.test(value)) onRetry?.(Number(value));
        break;
      default:
        break; // 알 수 없는 필드는 무시
    }
  };

  return {
    push(chunk: string) {
      for (const char of chunk) {
        // CRLF 는 줄바꿈 하나. 조각이 CR 로 끝나고 다음 조각이 LF 로 시작해도 같다.
        if (afterCR && char === '\n') {
          afterCR = false;
          continue;
        }
        afterCR = false;
        if (char === '\r' || char === '\n') {
          afterCR = char === '\r';
          processLine(line);
          line = '';
        } else {
          line += char;
        }
      }
    },
  };
}

export interface ConnectOptions {
  onMessage: (message: EventStreamMessage) => void;
  onStatus?: (status: EventStreamStatus) => void;
  /** 이전에 받은 마지막 이벤트 id. 첫 연결부터 Last-Event-ID 로 보낸다. */
  lastEventId?: string;
  signal: AbortSignal;
  /** 서버가 retry 를 알려 주기 전의 기본 재연결 대기 시간 */
  initialRetryMs?: number;
  maxRetryMs?: number;
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * 스트림에 연결해 signal 이 abort 될 때까지 메시지를 전달한다.
 * 연결이 끊기거나 실패하면 retry × 2^(실패 횟수) (최대 maxRetryMs) 만큼 기다렸다 다시 연결하고,
 * 이때 마지막으로 받은 id 를 Last-Event-ID 로 보내 놓친 이벤트를 받는다.
 */
export async function connectEventStream(url: string, options: ConnectOptions): Promise<void> {
  const { onMessage, onStatus, signal, initialRetryMs = 3000, maxRetryMs = 30_000 } = options;
  let lastEventId = options.lastEventId;
  let retryMs = initialRetryMs;
  let failures = 0;

  while (!signal.aborted) {
    onStatus?.(failures === 0 ? 'connecting' : 'reconnecting');
    try {
      const response = await fetch(new URL(url, window.location.origin), {
        headers: {
          Accept: 'text/event-stream',
          ...(lastEventId ? { 'Last-Event-ID': lastEventId } : {}),
        },
        cache: 'no-store',
        signal,
      });
      if (!response.ok || !response.body) throw new Error(`스트림 연결 실패 (${response.status})`);
      if (!response.headers.get('Content-Type')?.includes('text/event-stream')) {
        throw new Error('이벤트 스트림 응답이 아닙니다.');
      }

      onStatus?.('open');
      failures = 0;
      const parser = createEventStreamParser({
        onMessage,
        onRetry: (ms) => (retryMs = ms),
        onId: (id) => (lastEventId = id),
      });
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.push(value);
      }
      // 서버가 정상 종료해도 SSE 규칙대로 다시 연결한다
    } catch {
      if (signal.aborted) break;
    }
    if (signal.aborted) break;

    failures += 1;
    onStatus?.('reconnecting');
    await wait(Math.min(retryMs * 2 ** (failures - 1), maxRetryMs), signal);
  }
  onStatus?.('closed');
}
