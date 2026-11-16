import { describe, expect, it } from 'vitest';
import { PatientPageSchema } from '../domain/patient';
import { WeeklyVisitsSchema } from '../domain/stats';
import { today } from '../utils/date';

async function getPatients(query: string) {
  const response = await fetch(new URL(`/api/patients${query}`, window.location.origin));
  return { status: response.status, body: (await response.json()) as unknown };
}

describe('GET /api/patients (커서 페이지네이션)', () => {
  it('cursor·limit 만큼 잘라 주고 다음 커서를 알려준다', async () => {
    const first = PatientPageSchema.parse((await getPatients('?cursor=0&limit=30')).body);
    expect(first.items).toHaveLength(30);
    expect(first).toMatchObject({ nextCursor: 30, total: 150 });

    const last = PatientPageSchema.parse((await getPatients('?cursor=120&limit=30')).body);
    expect(last.items).toHaveLength(30);
    expect(last.nextCursor).toBeNull();
  });

  it('페이지끼리 환자가 겹치지 않고 이름순으로 이어진다', async () => {
    const pages = await Promise.all(
      [0, 50, 100].map(async (cursor) =>
        PatientPageSchema.parse((await getPatients(`?cursor=${cursor}&limit=50`)).body),
      ),
    );
    const all = pages.flatMap((page) => page.items);
    expect(new Set(all.map((p) => p.id)).size).toBe(150);
    const names = all.map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'ko')));
  });

  it('잘못된 커서는 400', async () => {
    expect((await getPatients('?cursor=-1')).status).toBe(400);
    expect((await getPatients('?limit=abc')).status).toBe(400);
  });
});

describe('GET /api/stats/weekly-visits', () => {
  async function getStats(query = '') {
    const response = await fetch(
      new URL(`/api/stats/weekly-visits${query}`, window.location.origin),
    );
    return { status: response.status, body: (await response.json()) as unknown };
  }

  it('기본 12주, 마지막 구간은 오늘로 끝나고 시드 데이터가 집계된다', async () => {
    const weeks = WeeklyVisitsSchema.parse((await getStats()).body);
    expect(weeks).toHaveLength(12);
    expect(weeks.at(-1)?.weekEnd).toBe(today());
    // 오늘 ±3일 시드 + 과거 진료 이력이 있으므로 매주 0건은 아니다
    expect(weeks.reduce((sum, w) => sum + w.first + w.return, 0)).toBeGreaterThan(0);
  });

  it('weeks 범위를 벗어나면 400', async () => {
    expect((await getStats('?weeks=0')).status).toBe(400);
    expect((await getStats('?weeks=53')).status).toBe(400);
  });
});
