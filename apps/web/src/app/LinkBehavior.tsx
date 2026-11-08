import type { LinkProps } from '@mui/material/Link';
import type { ThemeOptions } from '@mui/material/styles';
import type { Ref } from 'react';
import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router';

type LinkBehaviorProps = Omit<RouterLinkProps, 'to'> & {
  href: RouterLinkProps['to'];
  ref?: Ref<HTMLAnchorElement>;
};

/** MUI 의 href 를 React Router 의 to 로 연결하는 어댑터 */
export function LinkBehavior({ href, ref, ...other }: LinkBehaviorProps) {
  return <RouterLink ref={ref} to={href} {...other} />;
}

/**
 * 공통 컴포넌트(@clinic/ui)는 라우터를 모른다.
 * 앱에서 테마로 Link/ButtonBase 의 링크 컴포넌트를 주입해 클라이언트 라우팅을 연결한다.
 */
export const routerLinkThemeOptions: ThemeOptions = {
  components: {
    MuiLink: { defaultProps: { component: LinkBehavior } as LinkProps },
    MuiButtonBase: { defaultProps: { LinkComponent: LinkBehavior } },
  },
};
