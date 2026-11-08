import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { addDays, today } from '../utils/date';

export interface DateNavigatorProps {
  value: string;
  onChange: (date: string) => void;
}

/** 진료일 선택: 이전/다음 날 버튼 + 날짜 입력 + 오늘 */
export function DateNavigator({ value, onChange }: DateNavigatorProps) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <IconButton aria-label="이전 날" onClick={() => onChange(addDays(value, -1))}>
        <ChevronLeftIcon />
      </IconButton>
      <TextField
        type="date"
        label="진료일"
        size="small"
        value={value}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ width: 168 }}
      />
      <IconButton aria-label="다음 날" onClick={() => onChange(addDays(value, 1))}>
        <ChevronRightIcon />
      </IconButton>
      <Button variant="soft" onClick={() => onChange(today())} disabled={value === today()}>
        오늘
      </Button>
    </Stack>
  );
}
