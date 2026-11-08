import { lazy } from 'react';
import type { RouteObject } from 'react-router';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import { RootLayout } from './RootLayout';

/** 페이지 단위 코드 스플리팅: 각 페이지는 처음 방문할 때 별도 청크로 내려받는다 */
const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const AppointmentsPage = lazy(() =>
  import('../pages/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage })),
);
const SchedulePage = lazy(() =>
  import('../pages/SchedulePage').then((m) => ({ default: m.SchedulePage })),
);
const PatientsPage = lazy(() =>
  import('../pages/PatientsPage').then((m) => ({ default: m.PatientsPage })),
);
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'appointments', element: <AppointmentsPage /> },
      { path: 'schedule', element: <SchedulePage /> },
      { path: 'patients', element: <PatientsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
