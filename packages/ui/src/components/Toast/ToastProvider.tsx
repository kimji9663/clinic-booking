import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

export interface ToastOptions {
  message: string;
  severity?: ToastSeverity;
}

interface ToastState extends Required<ToastOptions> {
  key: number;
}

type ShowToast = (options: ToastOptions | string) => void;

const ToastContext = createContext<ShowToast | null>(null);

const AUTO_HIDE_MS = 4000;

/**
 * 전역 토스트. 성공/안내는 role="status"(조용히 읽힘), 오류는 role="alert"(즉시 읽힘)로 구분한다.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [open, setOpen] = useState(false);

  const show = useCallback<ShowToast>((options) => {
    const { message, severity = 'success' } =
      typeof options === 'string' ? { message: options } : options;
    setToast({ message, severity, key: Date.now() });
    setOpen(true);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.key}
        open={open}
        autoHideDuration={AUTO_HIDE_MS}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') setOpen(false);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert
            role={toast.severity === 'error' ? 'alert' : 'status'}
            severity={toast.severity}
            variant="filled"
            onClose={() => setOpen(false)}
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast 는 ToastProvider 안에서만 사용할 수 있습니다.');
  return context;
}
