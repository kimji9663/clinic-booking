import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithTheme } from '../../test-utils';
import { Combobox } from './Combobox';

const people = ['김민준', '김서아', '김하늘', '박지우'];

function Harness({ onSelect = vi.fn(), onKeyDownOutside = vi.fn() }) {
  const [value, setValue] = useState('');
  const options = value ? people.filter((p) => p.includes(value)) : [];
  return (
    // 바깥(대화상자 등)으로 Escape 가 전달되는지 확인용
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div onKeyDown={onKeyDownOutside}>
      <Combobox
        label="환자 이름"
        inputValue={value}
        onInputChange={setValue}
        options={options}
        getOptionKey={(o) => o}
        renderOption={(o) => o}
        onSelect={(o) => {
          setValue(o);
          onSelect(o);
        }}
      />
    </div>
  );
}

describe('Combobox', () => {
  it('입력하면 listbox 를 열고 combobox 와 연결한다', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Harness />);
    const input = screen.getByRole('combobox', { name: '환자 이름' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');

    await user.type(input, '김');
    const listbox = screen.getByRole('listbox', { name: '환자 이름 추천' });
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText(/추천 3건/)).toBeInTheDocument();
  });

  it('↑/↓ 로 옵션을 고르면 포커스는 입력창에 둔 채 aria-activedescendant 가 바뀐다', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Harness />);
    const input = screen.getByRole('combobox', { name: '환자 이름' });
    await user.type(input, '김');

    await user.keyboard('{ArrowDown}');
    const [first, second, third] = screen.getAllByRole('option');
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-activedescendant', first?.id);
    expect(first).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', second?.id);
    await user.keyboard('{ArrowUp}{ArrowUp}');
    // 처음에서 위로 가면 마지막으로 순환
    expect(input).toHaveAttribute('aria-activedescendant', third?.id);
  });

  it('Enter 로 선택하면 값이 바뀌고 목록이 닫힌다', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithTheme(<Harness onSelect={onSelect} />);
    const input = screen.getByRole('combobox', { name: '환자 이름' });
    await user.type(input, '김');
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledWith('김서아');
    expect(input).toHaveValue('김서아');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('마우스로 선택해도 입력창 포커스를 유지한다', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithTheme(<Harness onSelect={onSelect} />);
    const input = screen.getByRole('combobox', { name: '환자 이름' });
    await user.type(input, '박');
    await user.click(screen.getByRole('option', { name: '박지우' }));

    expect(onSelect).toHaveBeenCalledWith('박지우');
    expect(input).toHaveFocus();
  });

  it('Esc 는 열린 목록만 닫고 바깥으로 전달하지 않는다', async () => {
    const user = userEvent.setup();
    const outside = vi.fn();
    renderWithTheme(<Harness onKeyDownOutside={outside} />);
    const input = screen.getByRole('combobox', { name: '환자 이름' });
    await user.type(input, '김');
    outside.mockClear();

    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(outside).not.toHaveBeenCalled();

    // 이미 닫혀 있으면 Esc 는 바깥(대화상자 닫기)으로 전달된다
    await user.keyboard('{Escape}');
    expect(outside).toHaveBeenCalled();
  });

  it('결과가 없으면 listbox 없이 안내한다', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Harness />);
    const input = screen.getByRole('combobox', { name: '환자 이름' });
    await user.type(input, '없는이름');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByText('일치하는 항목이 없습니다').length).toBeGreaterThan(0);
  });
});
