import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { connectedClientCount, emitClinicEvent } from '../mocks/events';
import { server } from '../test/setup';
import {
  connectEventStream,
  createEventStreamParser,
  type EventStreamMessage,
  type EventStreamStatus,
} from './eventStream';

function parse(chunks: string[]) {
  const messages: EventStreamMessage[] = [];
  const retries: number[] = [];
  const parser = createEventStreamParser({
    onMessage: (m) => messages.push(m),
    onRetry: (ms) => retries.push(ms),
  });
  chunks.forEach((chunk) => parser.push(chunk));
  return { messages, retries };
}

describe('createEventStreamParser (SSE 표준 해석)', () => {
  it('event·id·data 를 묶고 빈 줄에서 메시지를 내보낸다', () => {
    const { messages } = parse(['event: clinic\nid: 7\ndata: {"a":1}\n\n']);
    expect(messages).toEqual([{ event: 'clinic', id: '7', data: '{"a":1}' }]);
  });

  it('data 여러 줄은 줄바꿈으로 잇고, event 가 없으면 message', () => {
    const { messages } = parse(['data: 첫째\ndata: 둘째\n\n']);
    expect(messages).toEqual([{ event: 'message', data: '첫째\n둘째', id: undefined }]);
  });

  it('조각이 줄 중간·CRLF 중간에서 끊겨도 같은 결과', () => {
    const { messages } = parse(['da', 'ta: he', 'llo\r', '\n\r', '\n']);
    expect(messages).toEqual([{ event: 'message', data: 'hello', id: undefined }]);
  });

  it('주석(:)은 무시하고 retry 는 숫자만 받는다', () => {
    const { messages, retries } = parse([': heartbeat\nretry: 1500\nretry: abc\n\n']);
    expect(messages).toEqual([]);
    expect(retries).toEqual([1500]);
  });
});

describe('connectEventStream', () => {
  async function waitForConnection(count = 1) {
    await vi.waitFor(() => expect(connectedClientCount()).toBe(count));
  }

  it('서버 이벤트를 받고, abort 하면 closed 로 끝난다', async () => {
    const controller = new AbortController();
    const messages: EventStreamMessage[] = [];
    const statuses: EventStreamStatus[] = [];
    const done = connectEventStream('/api/events', {
      signal: controller.signal,
      onMessage: (m) => messages.push(m),
      onStatus: (s) => statuses.push(s),
    });

    await waitForConnection();
    const event = emitClinicEvent('appointment.requested');
    await vi.waitFor(() => expect(messages).toHaveLength(1));
    expect(messages[0]).toMatchObject({ event: 'clinic', id: String(event?.id) });
    expect(JSON.parse(messages[0]?.data ?? '')).toMatchObject({ type: 'appointment.requested' });

    controller.abort();
    await done;
    expect(statuses).toEqual(['connecting', 'open', 'closed']);
  });

  it('끊기면 다시 연결하면서 Last-Event-ID 를 보내 놓친 이벤트를 받는다', async () => {
    const controller = new AbortController();
    const received: string[] = [];
    const lastEventIds: (string | null)[] = [];
    // 첫 연결은 이벤트 하나를 보내고 바로 끊는 서버
    server.use(
      http.get(
        '/api/events',
        ({ request }) => {
          lastEventIds.push(request.headers.get('last-event-id'));
          return new HttpResponse('id: 1\nevent: clinic\ndata: first\n\n', {
            headers: { 'Content-Type': 'text/event-stream' },
          });
        },
        { once: true },
      ),
      // 재연결 요청의 헤더를 기록하고 실제 목업 서버로 넘긴다
      http.get('/api/events', ({ request }) => {
        lastEventIds.push(request.headers.get('last-event-id'));
      }),
    );

    void connectEventStream('/api/events', {
      signal: controller.signal,
      initialRetryMs: 10,
      onMessage: (m) => received.push(m.data),
    });
    await vi.waitFor(() => expect(lastEventIds).toEqual([null, '1']));
    controller.abort();
    expect(received[0]).toBe('first');
  });

  it('스트림이 아닌 응답이면 reconnecting 상태로 재시도한다', async () => {
    server.use(
      http.get('/api/events', () => HttpResponse.json({ message: 'no' }, { status: 503 })),
    );
    const controller = new AbortController();
    const statuses: EventStreamStatus[] = [];
    void connectEventStream('/api/events', {
      signal: controller.signal,
      initialRetryMs: 10,
      onMessage: () => {},
      onStatus: (s) => statuses.push(s),
    });
    await vi.waitFor(() =>
      expect(statuses.filter((s) => s === 'reconnecting').length).toBeGreaterThanOrEqual(2),
    );
    controller.abort();
    expect(statuses).not.toContain('open');
  });
});
