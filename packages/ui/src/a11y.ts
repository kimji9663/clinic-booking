import type { CSSProperties } from 'react';

/** 화면에는 보이지 않지만 스크린리더는 읽는 요소용 스타일 */
export const visuallyHidden: CSSProperties = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: 1,
  margin: -1,
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: 1,
};
