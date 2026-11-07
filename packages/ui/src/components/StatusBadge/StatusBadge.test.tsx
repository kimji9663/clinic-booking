import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithTheme } from '../../test-utils';
import { StatusBadge, type StatusConfig } from './StatusBadge';

type OrderStatus = 'open' | 'closed';

const config: StatusConfig<OrderStatus> = {
  open: { label: '진행 중', tone: 'info' },
  closed: { label: '종료', tone: 'neutral' },
};

describe('StatusBadge', () => {
  it('상태 라벨을 텍스트로 보여준다 (색상만으로 의미 전달 금지)', () => {
    renderWithTheme(<StatusBadge status="open" config={config} />);
    expect(screen.getByText('진행 중')).toBeInTheDocument();
  });
});
