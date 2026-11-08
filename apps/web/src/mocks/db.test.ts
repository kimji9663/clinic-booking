import { describe, expect, it } from 'vitest';
import { DB_STORAGE_KEY, db, loadDb, nextId, resetDb } from './db';

const BASE = '2026-11-08';

function stored() {
  return JSON.parse(window.localStorage.getItem(DB_STORAGE_KEY) ?? 'null') as {
    seedDate: string;
    appointments: { id: string; status: string }[];
  } | null;
}

describe('목업 DB localStorage 저장', () => {
  it('상태 변경과 신규 예약이 저장되고, 다시 불러오면 복원된다', () => {
    resetDb(BASE);
    const target = db.list().find((a) => a.status === 'requested');
    if (!target) throw new Error('시드에 승인 대기 예약이 있어야 한다');

    db.update(target.id, { status: 'confirmed' });
    const created = { ...target, id: nextId(), time: '17:30', status: 'confirmed' as const };
    db.insert(created);
    expect(stored()?.appointments).toHaveLength(db.list().length);

    // 새로고침 흉내: 메모리를 다른 날짜 시드로 덮은 뒤 저장본을 되살린다
    const snapshot = window.localStorage.getItem(DB_STORAGE_KEY);
    resetDb('2000-01-01');
    window.localStorage.setItem(DB_STORAGE_KEY, snapshot ?? '');
    loadDb(BASE);

    expect(db.find(target.id)?.status).toBe('confirmed');
    expect(db.find(created.id)).toMatchObject({ time: '17:30' });
    // 이어서 만드는 id 가 기존 id 와 겹치지 않는다
    expect(db.find(nextId())).toBeUndefined();
  });

  it('날짜가 바뀌면 오늘 기준으로 새로 시드한다', () => {
    resetDb(BASE);
    loadDb('2026-11-09');
    expect(stored()?.seedDate).toBe('2026-11-09');
    expect(db.list().some((a) => a.date === '2026-11-12')).toBe(true);
  });

  it('손상된 저장본은 무시하고 시드 데이터로 시작한다', () => {
    window.localStorage.setItem(DB_STORAGE_KEY, '{ not json');
    loadDb(BASE);
    expect(db.list()).toHaveLength(18);

    window.localStorage.setItem(
      DB_STORAGE_KEY,
      JSON.stringify({ version: 1, seedDate: BASE, sequence: 1, appointments: [{ id: 1 }] }),
    );
    loadDb(BASE);
    expect(db.list()).toHaveLength(18);
    expect(stored()?.appointments).toHaveLength(18);
  });
});
