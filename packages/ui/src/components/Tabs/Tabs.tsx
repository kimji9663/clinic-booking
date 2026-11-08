import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { vars } from '../../palette';

export interface TabItem<V extends string = string> {
  value: V;
  label: string;
  /** 탭 이름 옆 개수 (스크린리더에는 "예정된 예약 2건"처럼 이름에 포함) */
  count?: number;
  content: ReactNode;
}

export interface TabsProps<V extends string = string> {
  /** 탭 묶음의 이름 (tablist 의 aria-label) */
  label: string;
  items: readonly TabItem<V>[];
  /** 제어 모드 */
  value?: V;
  defaultValue?: V;
  onChange?: (value: V) => void;
  /**
   * automatic: 화살표로 이동하면 바로 선택 (내용이 가벼울 때, 기본)
   * manual: 화살표는 포커스만 옮기고 Enter/Space 로 선택 (내용을 불러오는 비용이 클 때)
   */
  activation?: 'automatic' | 'manual';
}

const TabList = styled('div')(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(0.5),
  borderBottom: `1px solid ${vars(theme).divider}`,
  overflowX: 'auto',
}));

const Tab = styled('button')(({ theme }) => ({
  ...theme.typography.button,
  appearance: 'none',
  background: 'none',
  border: 0,
  borderBottom: '3px solid transparent',
  marginBottom: -1,
  padding: theme.spacing(1.25, 2),
  color: vars(theme).text.secondary,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  borderTopLeftRadius: theme.shape.borderRadius,
  borderTopRightRadius: theme.shape.borderRadius,
  '&:hover': { backgroundColor: vars(theme).action.hover },
  '&[aria-selected="true"]': {
    color: vars(theme).primary.main,
    borderBottomColor: vars(theme).primary.main,
  },
  '&:focus-visible': {
    outline: `3px solid ${vars(theme).primary.main}`,
    outlineOffset: -3,
  },
}));

const Count = styled('span')(({ theme }) => ({
  marginLeft: theme.spacing(0.75),
  padding: theme.spacing(0, 0.75),
  borderRadius: 999,
  fontSize: '0.75rem',
  backgroundColor: vars(theme).action.selected,
  color: vars(theme).text.primary,
}));

/**
 * 접근 가능한 탭 (WAI-ARIA Authoring Practices: Tabs 패턴).
 * - role=tablist / tab / tabpanel, aria-selected, aria-controls, aria-labelledby
 * - roving tabindex: 탭 묶음은 Tab 한 번으로 들어오고, 그 안에서는 ←/→, Home/End 로 이동
 * - 선택되지 않은 패널은 hidden 으로 접근성 트리에서도 제외
 */
export function Tabs<V extends string>({
  label,
  items,
  value,
  defaultValue,
  onChange,
  activation = 'automatic',
}: TabsProps<V>) {
  const baseId = useId();
  const [internal, setInternal] = useState<V | undefined>(defaultValue ?? items[0]?.value);
  const selected = value ?? internal;
  const tabRefs = useRef(new Map<V, HTMLButtonElement>());

  const tabId = (v: V) => `${baseId}-tab-${v}`;
  const panelId = (v: V) => `${baseId}-panel-${v}`;

  const select = (next: V) => {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    const target = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];

    if (target !== undefined) {
      event.preventDefault();
      const next = items[target];
      if (!next) return;
      tabRefs.current.get(next.value)?.focus();
      if (activation === 'automatic') select(next.value);
      return;
    }
    if (activation === 'manual' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      const current = items[index];
      if (current) select(current.value);
    }
  };

  return (
    <Box>
      <TabList role="tablist" aria-label={label}>
        {items.map((item, index) => {
          const isSelected = item.value === selected;
          return (
            <Tab
              key={item.value}
              ref={(node) => {
                if (node) tabRefs.current.set(item.value, node);
                else tabRefs.current.delete(item.value);
              }}
              type="button"
              role="tab"
              id={tabId(item.value)}
              aria-selected={isSelected}
              aria-controls={panelId(item.value)}
              // 개수 배지는 숫자만 보이므로 이름에는 "예정 2건"처럼 단위까지 넣는다
              aria-label={item.count === undefined ? undefined : `${item.label} ${item.count}건`}
              // roving tabindex: 선택된 탭만 Tab 순서에 들어간다
              tabIndex={isSelected ? 0 : -1}
              onClick={() => select(item.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {item.label}
              {item.count !== undefined && <Count aria-hidden="true">{item.count}</Count>}
            </Tab>
          );
        })}
      </TabList>
      {items.map((item) => (
        <Box
          key={item.value}
          role="tabpanel"
          id={panelId(item.value)}
          aria-labelledby={tabId(item.value)}
          // 패널 안에 포커스할 요소가 없을 때도 키보드로 내용에 닿을 수 있도록
          tabIndex={0}
          hidden={item.value !== selected}
          sx={(theme) => ({
            pt: 2,
            borderRadius: 1,
            '&:focus-visible': {
              outline: `3px solid ${vars(theme).primary.main}`,
              outlineOffset: 2,
            },
          })}
        >
          {item.value === selected && item.content}
        </Box>
      ))}
    </Box>
  );
}
