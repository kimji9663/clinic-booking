import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { Meta, StoryObj } from '@storybook/react-vite';

/** 상단 툴바의 Brand 를 바꾸며 같은 컴포넌트가 고객사별로 어떻게 달라지는지 확인하는 스토리 */
function ThemeShowcase() {
  const theme = useTheme();
  return (
    <Stack spacing={3} sx={{ maxWidth: 560 }}>
      <div>
        <Typography variant="h4" component="h1">
          {theme.brand.name}
        </Typography>
        <Typography color="text.secondary">{theme.brand.tagline}</Typography>
      </div>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button variant="contained">예약하기</Button>
        <Button variant="soft">일정 보기</Button>
        <Button variant="outlined">취소</Button>
        <Button variant="contained" color="secondary">
          문의하기
        </Button>
        <Button variant="soft" color="secondary">
          보조
        </Button>
      </Stack>
      <TextField label="환자 이름" placeholder="홍길동" />
      <Typography variant="label">label 커스텀 Typography variant</Typography>
    </Stack>
  );
}

const meta = {
  title: 'Foundations/Theme',
  component: ThemeShowcase,
} satisfies Meta<typeof ThemeShowcase>;
export default meta;

export const Showcase: StoryObj<typeof meta> = {};
