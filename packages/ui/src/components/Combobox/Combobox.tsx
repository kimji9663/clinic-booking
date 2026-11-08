import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import { styled } from '@mui/material/styles';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { useId, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { visuallyHidden } from '../../a11y';
import { vars } from '../../palette';

export interface ComboboxProps<T> {
  label: string;
  /** 입력값 (자유 입력 허용 — 목록에 없는 값도 그대로 쓸 수 있다) */
  inputValue: string;
  onInputChange: (value: string) => void;
  /** 현재 입력값에 맞는 추천 목록 (검색은 바깥에서 한다) */
  options: readonly T[];
  getOptionKey: (option: T) => string;
  /** 목록에 보이는 내용 */
  renderOption: (option: T) => ReactNode;
  onSelect: (option: T) => void;
  loading?: boolean;
  /** 이 글자 수 이상 입력해야 목록을 연다 */
  minChars?: number;
  noOptionsText?: string;
  inputRef?: Ref<HTMLInputElement>;
  onBlur?: () => void;
  name?: string;
  required?: boolean;
  error?: boolean;
  helperText?: ReactNode;
  fullWidth?: boolean;
  placeholder?: string;
  slotProps?: TextFieldProps['slotProps'];
}

const Listbox = styled('ul')(({ theme }) => ({
  listStyle: 'none',
  margin: 0,
  padding: theme.spacing(0.5, 0),
  maxHeight: 280,
  overflowY: 'auto',
}));

const Option = styled('li')(({ theme }) => ({
  padding: theme.spacing(1, 2),
  cursor: 'pointer',
  '&[aria-selected="true"]': {
    backgroundColor: vars(theme).action.selected,
    // 색만으로 구분하지 않도록 왼쪽 막대도 표시
    boxShadow: `inset 3px 0 0 ${vars(theme).primary.main}`,
  },
  '&:hover': { backgroundColor: vars(theme).action.hover },
}));

const Empty = styled('div')(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  color: vars(theme).text.secondary,
}));

/**
 * 자동완성 입력 (WAI-ARIA Authoring Practices: Combobox with List Autocomplete).
 * - input: role=combobox, aria-expanded, aria-controls, aria-autocomplete="list"
 * - 포커스는 입력창에 둔 채 ↑/↓ 로 옵션을 고르고 aria-activedescendant 로 현재 옵션을 알린다
 * - Enter 선택, Esc 로 목록 닫기(대화상자 안이어도 대화상자는 닫히지 않음)
 * - 검색 결과 개수는 aria-live 로 안내
 */
export function Combobox<T>({
  label,
  inputValue,
  onInputChange,
  options,
  getOptionKey,
  renderOption,
  onSelect,
  loading = false,
  minChars = 1,
  noOptionsText = '일치하는 항목이 없습니다',
  inputRef,
  onBlur,
  name,
  required,
  error,
  helperText,
  fullWidth,
  placeholder,
  slotProps,
}: ComboboxProps<T>) {
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;
  // Popper 기준 요소. 렌더 중에 ref 를 읽지 않도록 state 로 둔다
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // 옵션 목록이 바뀌면 강조 위치를 초기화 (렌더 중 이전 값과 비교하는 React 권장 방식)
  const [previousOptions, setPreviousOptions] = useState(options);
  if (previousOptions !== options) {
    setPreviousOptions(options);
    setActiveIndex(-1);
  }

  const ready = inputValue.trim().length >= minChars;
  const expanded = open && ready;
  const hasOptions = options.length > 0;

  const choose = (option: T) => {
    onSelect(option);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const count = options.length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setOpen(true);
        if (count > 0) setActiveIndex((i) => (i + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setOpen(true);
        if (count > 0) setActiveIndex((i) => (i <= 0 ? count - 1 : i - 1));
        break;
      case 'Enter': {
        const option = options[activeIndex];
        if (expanded && option) {
          // 폼 제출 대신 옵션 선택
          event.preventDefault();
          choose(option);
        }
        break;
      }
      case 'Escape':
        if (expanded) {
          // 목록만 닫고 바깥 대화상자는 닫지 않는다
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          setActiveIndex(-1);
        }
        break;
      default:
        break;
    }
  };

  const announcement = !expanded
    ? ''
    : loading
      ? '검색 중'
      : options.length > 0
        ? `추천 ${options.length}건. 위아래 화살표로 고르고 Enter 로 선택하세요.`
        : noOptionsText;

  return (
    <>
      <TextField
        ref={setAnchor}
        label={label}
        name={name}
        value={inputValue}
        required={required}
        error={error}
        helperText={helperText}
        fullWidth={fullWidth}
        placeholder={placeholder}
        autoComplete="off"
        inputRef={inputRef}
        onChange={(event) => {
          onInputChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setOpen(false);
          onBlur?.();
        }}
        slotProps={{
          ...slotProps,
          htmlInput: {
            role: 'combobox',
            'aria-expanded': expanded && hasOptions,
            'aria-controls': expanded && hasOptions ? listboxId : undefined,
            'aria-autocomplete': 'list',
            'aria-activedescendant':
              expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined,
          },
          input: {
            endAdornment:
              loading && expanded ? <CircularProgress size={18} aria-hidden="true" /> : undefined,
          },
        }}
      />
      <span aria-live="polite" style={visuallyHidden}>
        {announcement}
      </span>
      <Popper
        open={expanded && (hasOptions || !loading)}
        anchorEl={anchor}
        placement="bottom-start"
        // 대화상자 안에서 쓰여도 스크롤 영역에 잘리지 않고, 접근성 트리에서도 대화상자 안에 남도록
        disablePortal
        popperOptions={{ strategy: 'fixed' }}
        // 아래 입력칸의 라벨(z-index: 1)보다 위에 그린다
        style={{ width: anchor?.clientWidth, zIndex: 10 }}
      >
        <Paper elevation={6}>
          {hasOptions ? (
            <Listbox id={listboxId} role="listbox" aria-label={`${label} 추천`}>
              {options.map((option, index) => (
                <Option
                  key={getOptionKey(option)}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  // 클릭해도 입력창 포커스를 잃지 않게
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  ref={(node) => {
                    if (index === activeIndex) node?.scrollIntoView?.({ block: 'nearest' });
                  }}
                >
                  {renderOption(option)}
                </Option>
              ))}
            </Listbox>
          ) : (
            // 빈 listbox 는 ARIA 규칙(옵션 필수)에 어긋나므로 안내 문구만 보여 준다 (내용은 aria-live 로 안내)
            <Empty aria-hidden="true">{noOptionsText}</Empty>
          )}
        </Paper>
      </Popper>
    </>
  );
}
