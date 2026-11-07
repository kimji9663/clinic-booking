import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('오늘의 예약 대시보드를 보여주고 환자 이름은 마스킹한다', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: '오늘의 예약' })).toBeInTheDocument();
    expect(screen.getAllByText('김*준').length).toBeGreaterThan(0);
    expect(screen.queryByText('김민준')).not.toBeInTheDocument();
  });

  it('고객사를 바꾸면 브랜드가 전환된다', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('combobox', { name: '고객사' }));
    await user.click(screen.getByRole('option', { name: '바른치과' }));

    expect(document.title).toBe('예약 관리 | 바른치과');
  });
});
