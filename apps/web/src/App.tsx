import { useState } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { AppProviders } from './app/AppProviders';
import { createQueryClient } from './app/queryClient';
import { routes } from './app/routes';

export function App() {
  const [queryClient] = useState(createQueryClient);
  // 하위 경로 배포(GitHub Pages) 시 /clinic-booking/patients 를 /patients 로 해석
  const [router] = useState(() =>
    createBrowserRouter(routes, { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' }),
  );

  return (
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
