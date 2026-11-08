import DarkModeIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeIcon from '@mui/icons-material/LightModeOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useColorScheme } from '@mui/material/styles';

/** 라이트/다크 전환. 처음에는 OS 설정(system)을 따르고, 한 번 바꾸면 그 선택을 저장한다. */
export function ColorModeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  const current = (mode === 'system' ? systemMode : mode) ?? 'light';
  const label = current === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={() => setMode(current === 'dark' ? 'light' : 'dark')}>
        {current === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
