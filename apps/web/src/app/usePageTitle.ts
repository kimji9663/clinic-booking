import { useTheme } from '@mui/material/styles';
import { useEffect } from 'react';

/** 페이지 이동 시 스크린리더 사용자가 현재 위치를 알 수 있도록 문서 제목을 갱신 */
export function usePageTitle(title: string): void {
  const theme = useTheme();
  useEffect(() => {
    document.title = `${title} | ${theme.brand.name}`;
  }, [title, theme.brand.name]);
}
