import { visuallyHidden } from '@clinic/ui';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';
import type { EventStreamStatus } from '../../api/eventStream';
import { describeEvent, formatRelativeTime } from './describeEvent';
import { useNotifications } from './NotificationsProvider';

const statusLabel: Record<EventStreamStatus, string> = {
  connecting: '연결 중…',
  open: '실시간 연결됨',
  reconnecting: '연결이 끊겨 다시 연결하는 중…',
  closed: '연결 종료',
};

const statusColor: Record<EventStreamStatus, string> = {
  connecting: 'text.disabled',
  open: 'success.main',
  reconnecting: 'warning.main',
  closed: 'text.disabled',
};

/**
 * 상단 바 알림 버튼 + 알림 목록 팝오버.
 * - 버튼 이름에 읽지 않은 개수를 포함해 스크린리더 사용자도 알 수 있게 한다 (배지 숫자는 시각용)
 * - 각 알림은 해당 환자 프로필로 이동하는 링크
 */
export function NotificationBell() {
  const { items, unreadCount, status, markRead, markAllRead } = useNotifications();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const popoverId = useId();
  const headingId = useId();
  const open = Boolean(anchor);
  const close = () => setAnchor(null);

  const buttonLabel = unreadCount > 0 ? `알림, 읽지 않음 ${unreadCount}개` : '알림';

  return (
    <>
      <Tooltip title={statusLabel[status]}>
        <IconButton
          aria-label={buttonLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          {/* 0 일 때도 숨은 "0" 글자가 남으면 버튼 이름(알림)과 보이는 글자가 어긋난다 → 비워 둔다 */}
          <Badge badgeContent={unreadCount || undefined} color="error" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        id={popoverId}
        open={open}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-labelledby': headingId,
            sx: { width: 'min(380px, calc(100vw - 32px))', maxHeight: 480 },
          },
        }}
      >
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 1.5, pb: 1 }}
        >
          <Box>
            <Typography id={headingId} variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              알림
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Box
                aria-hidden="true"
                sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusColor[status] }}
              />
              <Typography variant="caption" color="text.secondary">
                {statusLabel[status]}
              </Typography>
            </Stack>
          </Box>
          {/* disabled 로 바꾸면 누른 직후 포커스가 사라지므로(키보드 사용자가 위치를 잃음) 활성 상태를 유지한다 */}
          {items.length > 0 && (
            <Button size="small" onClick={markAllRead}>
              모두 읽음
            </Button>
          )}
        </Stack>
        <Divider />

        {items.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            새 알림이 없습니다.
          </Typography>
        ) : (
          <List disablePadding>
            {items.map(({ event, read }) => {
              const { title, message } = describeEvent(event);
              return (
                <ListItem key={event.id} disablePadding divider>
                  <ListItemButton
                    href={`/patients/${event.patientId}`}
                    onClick={() => {
                      markRead(event.id);
                      close();
                    }}
                    sx={{ alignItems: 'flex-start', gap: 1.5 }}
                  >
                    <Box
                      aria-hidden="true"
                      sx={{
                        mt: 1,
                        width: 8,
                        height: 8,
                        flexShrink: 0,
                        borderRadius: '50%',
                        bgcolor: read ? 'transparent' : 'primary.main',
                      }}
                    />
                    <ListItemText
                      primary={
                        <>
                          {!read && <span style={visuallyHidden}>읽지 않음, </span>}
                          {message.replace(`${title} — `, '')}
                        </>
                      }
                      secondary={`${title} · ${formatRelativeTime(event.at)}`}
                      slotProps={{
                        primary: { sx: { fontWeight: read ? 400 : 700 } },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Popover>
    </>
  );
}
