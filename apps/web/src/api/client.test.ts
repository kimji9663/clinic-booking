import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { server } from '../test/setup';
import { ApiError, request } from './client';

const ListSchema = z.array(z.object({ id: z.string() }));

describe('request', () => {
  it('정상 응답은 스키마로 검증한 값을 돌려준다', async () => {
    server.use(http.get('/api/items', () => HttpResponse.json([{ id: 'a' }])));
    await expect(request(ListSchema, '/api/items')).resolves.toEqual([{ id: 'a' }]);
  });

  it('API 대신 HTML 이 오면(목업 미동작·SPA 폴백) 연결 실패로 알린다', async () => {
    server.use(http.get('/api/items', () => HttpResponse.html('<!doctype html><html></html>')));
    await expect(request(ListSchema, '/api/items')).rejects.toEqual(
      new ApiError('API 서버에 연결하지 못했습니다.', 200),
    );
  });

  it('형식이 다른 응답은 zod 원문 대신 읽을 수 있는 문장으로 알린다', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    server.use(http.get('/api/items', () => HttpResponse.json(null)));
    await expect(request(ListSchema, '/api/items')).rejects.toThrow(
      '서버 응답 형식이 올바르지 않습니다.',
    );
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('오류 응답은 서버 메시지를 그대로 전달한다', async () => {
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json({ message: '권한이 없습니다.' }, { status: 403 }),
      ),
    );
    await expect(request(ListSchema, '/api/items')).rejects.toEqual(
      new ApiError('권한이 없습니다.', 403),
    );
  });

  it('네트워크 오류는 연결 안내로 바꾼다', async () => {
    server.use(http.get('/api/items', () => HttpResponse.error()));
    await expect(request(ListSchema, '/api/items')).rejects.toThrow('서버에 연결할 수 없습니다.');
  });
});
