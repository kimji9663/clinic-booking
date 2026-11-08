import DarkModeIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeIcon from '@mui/icons-material/LightModeOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useBrand } from './BrandProvider';

export function ColorModeToggle() {
  const { mode, setMode } = useBrand();
  const label = mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
        {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
