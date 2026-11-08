import { ToastProvider } from '@clinic/ui';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrandProvider } from '../brand/BrandProvider';

export function AppProviders({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider>
        <ToastProvider>{children}</ToastProvider>
      </BrandProvider>
    </QueryClientProvider>
  );
}
