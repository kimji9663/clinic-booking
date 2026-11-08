import { useToast } from '@clinic/ui';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { z } from 'zod';
import { queryKeys } from '../../api/clinic';
import { connectEventStream, type EventStreamStatus } from '../../api/eventStream';
import { CLINIC_EVENT_NAME, ClinicEventSchema, type ClinicEvent } from '../../domain/clinicEvent';
import { describeEvent } from './describeEvent';

export const EVENTS_URL = '/api/events';
export const NOTIFICATIONS_STORAGE_KEY = 'clinic-booking:notifications';
const MAX_ITEMS = 30;
/** 재연결로 뒤늦게 받은 오래된 이벤트는 토스트 없이 목록에만 넣는다 */
const TOAST_MAX_AGE_MS = 60_000;

export interface Notification {
  event: ClinicEvent;
  read: boolean;
}

const StoredSchema = z.object({
  lastEventId: z.string().optional(),
  items: z.array(z.object({ event: ClinicEventSchema, read: z.boolean() })),
});
type Stored = z.infer<typeof StoredSchema>;

function load(): Stored {
  try {
    const parsed = StoredSchema.safeParse(
      JSON.parse(window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) ?? 'null'),
    );
    return parsed.success ? parsed.data : { items: [] };
  } catch {
    return { items: [] };
  }
}

function save(stored: Stored) {
  try {
    window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // 저장소를 쓸 수 없으면 메모리에서만 유지
  }
}

interface NotificationsContextValue {
  items: readonly Notification[];
  unreadCount: number;
  status: EventStreamStatus;
  markRead: (eventId: number) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/**
 * 실시간 알림.
 * - SSE 스트림(/api/events)에 연결해 이벤트를 받는다. 끊기면 지수 백오프로 재연결하고,
 *   마지막으로 받은 id 를 Last-Event-ID 로 보내 놓친 이벤트를 받는다.
 * - 이벤트를 받으면 예약·환자 쿼리를 무효화해 열려 있는 화면을 바로 갱신하고 토스트로 알린다.
 * - 알림 목록과 마지막 이벤트 id 는 localStorage 에 저장해 새로고침 후에도 이어진다.
 */
export function NotificationsProvider({
  enabled = true,
  children,
}: {
  enabled?: boolean;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [stored, setStored] = useState(load);
  const [status, setStatus] = useState<EventStreamStatus>(enabled ? 'connecting' : 'closed');

  // 첫 연결 때 보낼 Last-Event-ID (이후 재연결은 connectEventStream 이 직접 관리)
  const lastEventIdRef = useRef(stored.lastEventId);

  useEffect(() => save(stored), [stored]);

  // 연결을 다시 만들지 않으면서 항상 최신 toast·queryClient 를 쓰도록 Effect Event 로 둔다
  const receive = useEffectEvent((event: ClinicEvent) => {
    lastEventIdRef.current = String(event.id);
    setStored((prev) => {
      if (prev.items.some((item) => item.event.id === event.id)) return prev; // 중복 수신
      return {
        lastEventId: String(event.id),
        items: [{ event, read: false }, ...prev.items].slice(0, MAX_ITEMS),
      };
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
    void queryClient.invalidateQueries({ queryKey: queryKeys.patients });

    if (Date.now() - new Date(event.at).getTime() < TOAST_MAX_AGE_MS) {
      const { message, severity } = describeEvent(event);
      toast({ message, severity });
    }
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void connectEventStream(EVENTS_URL, {
      signal: controller.signal,
      lastEventId: lastEventIdRef.current,
      onStatus: setStatus,
      onMessage: (message) => {
        if (message.event !== CLINIC_EVENT_NAME) return;
        try {
          const parsed = ClinicEventSchema.safeParse(JSON.parse(message.data));
          if (parsed.success) receive(parsed.data);
          else console.error('알림 형식 오류', parsed.error.issues);
        } catch (error) {
          console.error('알림을 해석하지 못했습니다.', error);
        }
      },
    });
    return () => controller.abort();
  }, [enabled]);

  const markRead = useCallback((eventId: number) => {
    setStored((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.event.id === eventId ? { ...item, read: true } : item)),
    }));
  }, []);

  const markAllRead = useCallback(() => {
    setStored((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({ ...item, read: true })),
    }));
  }, []);

  const value = useMemo(
    () => ({
      items: stored.items,
      unreadCount: stored.items.filter((item) => !item.read).length,
      status,
      markRead,
      markAllRead,
    }),
    [stored.items, status, markRead, markAllRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications 는 NotificationsProvider 안에서 사용하세요.');
  return context;
}
