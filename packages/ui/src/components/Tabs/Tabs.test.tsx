import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithTheme } from '../../test-utils';
import { Tabs, type TabItem } from './Tabs';

type Value = 'upcoming' | 'past' | 'cancelled';
const items: TabItem<Value>[] = [
  { value: 'upcoming', label: '예정', count: 2, content: <p>예정 내용</p> },
  { value: 'past', label: '지난 이력', count: 5, content: <p>지난 내용</p> },
  { value: 'cancelled', label: '취소', content: <p>취소 내용</p> },
];

describe('Tabs', () => {
  it('tablist/tab/tabpanel 역할과 연결 관계를 갖는다', () => {
    renderWithTheme(<Tabs label="진료 이력" items={items} />);

    expect(screen.getByRole('tablist', { name: '진료 이력' })).toBeInTheDocument();
    const tab = screen.getByRole('tab', { name: '예정 2건' });
    expect(tab).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel', { name: '예정 2건' });
    expect(tab).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveTextContent('예정 내용');
    // 선택되지 않은 패널은 접근성 트리에서 빠진다
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it('roving tabindex: 선택된 탭만 Tab 순서에 있다', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <>
        <button type="button">앞</button>
        <Tabs label="진료 이력" items={items} />
      </>,
    );
    await user.click(screen.getByRole('button', { name: '앞' }));
    await user.tab();
    expect(screen.getByRole('tab', { name: '예정 2건' })).toHaveFocus();
    await user.tab();
    // 다음 Tab 은 다른 탭이 아니라 패널로 간다
    expect(screen.getByRole('tabpanel')).toHaveFocus();
  });

  it('←/→ 는 순환 이동하며 바로 선택하고(automatic), Home/End 는 처음/끝으로 간다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithTheme(<Tabs label="진료 이력" items={items} onChange={onChange} />);

    await user.click(screen.getByRole('tab', { name: '예정 2건' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: '지난 이력 5건' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: '지난 이력 5건' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent('지난 내용');

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: '취소' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: '예정 2건' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: '취소' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: '예정 2건' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('upcoming');
  });

  it('manual 모드는 화살표로 포커스만 옮기고 Enter 로 선택한다', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Tabs label="진료 이력" items={items} activation="manual" />);

    await user.click(screen.getByRole('tab', { name: '예정 2건' }));
    await user.keyboard('{ArrowRight}');
    const past = screen.getByRole('tab', { name: '지난 이력 5건' });
    expect(past).toHaveFocus();
    expect(past).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('예정 내용');

    await user.keyboard('{Enter}');
    expect(past).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('지난 내용');
  });
});
