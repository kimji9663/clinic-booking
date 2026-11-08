import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { styled, useTheme } from '@mui/material/styles';
import { useId, useState, type ReactNode } from 'react';
import { vars } from '../../palette';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
  /** 현재 페이지 여부 (aria-current="page") */
  current?: boolean;
  disabled?: boolean;
}

export interface AppShellProps {
  /** 상단 바 제목 */
  title: string;
  navItems: readonly NavItem[];
  /** 상단 바 오른쪽 영역 (검색, 고객사 전환 등) */
  headerActions?: ReactNode;
  drawerWidth?: number;
  children: ReactNode;
}

export const MAIN_CONTENT_ID = 'main-content';

/**
 * 고정 상단 바 높이를 담는 CSS 변수. 본문의 sticky 요소(표 머리글 등)가 상단 바 아래에 붙도록 쓴다.
 * 높이는 MUI Toolbar 와 같은 규칙(theme.mixins.toolbar: 모바일 56 / 가로 48 / sm 이상 64)을 따른다.
 */
export const APP_HEADER_HEIGHT_VAR = '--app-header-height';

function headerHeightVars(toolbar: Record<string, unknown>) {
  const vars: Record<string, string | Record<string, string>> = {};
  for (const [key, value] of Object.entries(toolbar)) {
    if (key === 'minHeight' && typeof value === 'number') {
      vars[APP_HEADER_HEIGHT_VAR] = `${value}px`;
    } else if (typeof value === 'object' && value !== null && 'minHeight' in value) {
      // 미디어쿼리 키 (예: '@media (min-width:600px)')
      vars[key] = { [APP_HEADER_HEIGHT_VAR]: `${String(value.minHeight)}px` };
    }
  }
  return vars;
}

/** Tab 키를 누르면 가장 먼저 나타나는 "본문 바로가기" 링크 */
const SkipLink = styled('a')(({ theme }) => ({
  position: 'absolute',
  left: theme.spacing(2),
  top: -200,
  zIndex: theme.zIndex.tooltip,
  padding: theme.spacing(1, 2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: vars(theme).primary.main,
  color: vars(theme).primary.contrastText,
  fontWeight: 600,
  textDecoration: 'none',
  '&:focus': { top: theme.spacing(1) },
}));

/**
 * 반응형 레이아웃 셸.
 * - md 이상: 고정 사이드바 / md 미만: 햄버거 버튼 + 임시 Drawer
 * - header / nav / main 랜드마크와 본문 바로가기 제공
 */
export function AppShell({
  title,
  navItems,
  headerActions,
  drawerWidth = 248,
  children,
}: AppShellProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navId = useId();

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100dvh',
        ...headerHeightVars(theme.mixins.toolbar as Record<string, unknown>),
      }}
    >
      <SkipLink href={`#${MAIN_CONTENT_ID}`}>본문 바로가기</SkipLink>

      <AppBar
        position="fixed"
        color="inherit"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {!isDesktop && (
            <IconButton
              edge="start"
              aria-label="메뉴 열기"
              aria-controls={navId}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="p" noWrap sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {headerActions}
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop || mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: { md: drawerWidth },
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Box component="nav" id={navId} aria-label="주 메뉴">
          <Toolbar>
            <Box>
              <Typography variant="subtitle1" component="p" sx={{ fontWeight: 700 }} noWrap>
                {theme.brand.name}
              </Typography>
              <Typography variant="label" color="text.secondary">
                {theme.brand.department}
              </Typography>
            </Box>
          </Toolbar>
          <List>
            {navItems.map((item) => (
              <ListItem key={item.id} disablePadding>
                {/* href 를 주면 테마의 MuiButtonBase.LinkComponent 로 렌더링된다 (라우터 비의존) */}
                <ListItemButton
                  href={item.href}
                  selected={item.current ?? false}
                  disabled={item.disabled ?? false}
                  aria-current={item.current ? 'page' : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon && <ListItemIcon aria-hidden="true">{item.icon}</ListItemIcon>}
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 }, outline: 'none' }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
