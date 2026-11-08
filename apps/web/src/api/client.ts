import type { z } from 'zod';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function hasMessage(body: unknown): body is { message: string } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof (body as { message: unknown }).message === 'string'
  );
}

function isJson(response: Response): boolean {
  return response.headers.get('Content-Type')?.includes('application/json') ?? false;
}

/**
 * fetch 래퍼. 응답을 zod 스키마로 검증해서 "타입은 맞는데 실제 데이터는 다른" 상황을 막는다.
 * 어떤 실패든 사용자에게는 이해할 수 있는 문장을 담은 ApiError 로 바꿔 던진다.
 */
export async function request<S extends z.ZodType>(
  schema: S,
  path: string,
  init?: RequestInit,
): Promise<z.output<S>> {
  let response: Response;
  try {
    response = await fetch(new URL(path, window.location.origin), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError('서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.', 0);
  }

  // API 대신 HTML(예: 개발 서버의 SPA 폴백)이 오면 200 이어도 실패로 본다
  if (!isJson(response)) {
    throw new ApiError('API 서버에 연결하지 못했습니다.', response.status);
  }
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      hasMessage(body) ? body.message : '요청을 처리하지 못했습니다.',
      response.status,
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // 상세 원인은 개발자용으로만 남기고, 화면에는 원문 검증 오류를 노출하지 않는다
    console.error(`응답 형식 오류: ${path}`, parsed.error.issues);
    throw new ApiError('서버 응답 형식이 올바르지 않습니다.', response.status);
  }
  return parsed.data;
}
