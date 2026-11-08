import { ToastProvider } from '@clinic/ui';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrandProvider } from '../brand/BrandProvider';
import { NotificationsProvider } from '../features/notifications/NotificationsProvider';

export function AppProviders({
  queryClient,
  realtime = true,
  children,
}: {
  queryClient: QueryClient;
  /** 실시간 알림(SSE) 연결 여부. 알림과 무관한 테스트에서는 끈다. */
  realtime?: boolean;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider>
        <ToastProvider>
          <NotificationsProvider enabled={realtime}>{children}</NotificationsProvider>
        </ToastProvider>
      </BrandProvider>
    </QueryClientProvider>
  );
}
