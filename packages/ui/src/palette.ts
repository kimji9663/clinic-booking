import type { Theme } from '@mui/material/styles';

/**
 * 스타일에서 쓸 팔레트. CSS 변수 테마면 var(--clinic-palette-...) 값을, 아니면 실제 색을 돌려준다.
 * CSS 변수 테마는 화면 모드를 바꿔도 테마 객체가 그대로이므로, theme.palette 의 실제 색을 쓰면
 * 다크 모드로 바뀌지 않는다. 컴포넌트 스타일은 항상 이 함수를 거친다.
 */
export function vars(theme: Theme): Theme['palette'] {
  return (theme.vars?.palette ?? theme.palette) as Theme['palette'];
}
