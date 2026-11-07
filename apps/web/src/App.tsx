import { AppShell, type NavItem } from '@clinic/ui';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PeopleIcon from '@mui/icons-material/People';
import { BrandProvider } from './brand/BrandProvider';
import { BrandSwitcher } from './brand/BrandSwitcher';
import { todayAppointments } from './mocks/appointments';
import { DashboardPage } from './pages/DashboardPage';

const navItems: NavItem[] = [
  { id: 'dashboard', label: '대시보드', href: '/', icon: <DashboardIcon />, current: true },
  {
    id: 'appointments',
    label: '예약 관리',
    href: '/appointments',
    icon: <EventNoteIcon />,
    disabled: true,
  },
  {
    id: 'schedule',
    label: '진료 일정',
    href: '/schedule',
    icon: <CalendarMonthIcon />,
    disabled: true,
  },
  { id: 'patients', label: '환자', href: '/patients', icon: <PeopleIcon />, disabled: true },
];

export function App() {
  return (
    <BrandProvider>
      <AppShell title="예약 관리" navItems={navItems} headerActions={<BrandSwitcher />}>
        <DashboardPage appointments={todayAppointments} />
      </AppShell>
    </BrandProvider>
  );
}
