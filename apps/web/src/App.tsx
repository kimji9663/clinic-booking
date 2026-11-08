import { useState } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { AppProviders } from './app/AppProviders';
import { createQueryClient } from './app/queryClient';
import { routes } from './app/routes';

export function App() {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(() => createBrowserRouter(routes));

  return (
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
