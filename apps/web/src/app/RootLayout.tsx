import { AppShell, MAIN_CONTENT_ID, type NavItem } from '@clinic/ui';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PeopleIcon from '@mui/icons-material/People';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { BrandSwitcher } from '../brand/BrandSwitcher';
import { ColorModeToggle } from '../brand/ColorModeToggle';
import { NotificationBell } from '../features/notifications/NotificationBell';

const navigation: readonly Omit<NavItem, 'current'>[] = [
  { id: 'dashboard', label: '대시보드', href: '/', icon: <DashboardIcon /> },
  { id: 'appointments', label: '예약 관리', href: '/appointments', icon: <EventNoteIcon /> },
  { id: 'schedule', label: '진료 일정', href: '/schedule', icon: <CalendarMonthIcon /> },
  { id: 'patients', label: '환자', href: '/patients', icon: <PeopleIcon /> },
];

function isCurrent(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function PageFallback() {
  return (
    <Box sx={{ py: 4 }}>
      <LinearProgress aria-label="페이지 불러오는 중" />
    </Box>
  );
}

/** SPA 페이지 전환 시 포커스를 본문으로 옮겨 스크린리더가 새 페이지를 읽도록 한다 */
function useFocusMainOnNavigate(pathname: string) {
  // "첫 렌더 여부" 플래그는 StrictMode 의 이중 effect 실행에 깨지므로, 이전 경로와 비교한다.
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    document.getElementById(MAIN_CONTENT_ID)?.focus();
    window.scrollTo({ top: 0 });
  }, [pathname]);
}

export function RootLayout() {
  const { pathname } = useLocation();
  useFocusMainOnNavigate(pathname);

  const navItems = navigation.map((item) => ({
    ...item,
    current: isCurrent(item.href, pathname),
  }));

  return (
    <AppShell
      title="예약 관리"
      navItems={navItems}
      headerActions={
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <NotificationBell />
          <ColorModeToggle />
          <BrandSwitcher />
        </Stack>
      }
    >
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}
