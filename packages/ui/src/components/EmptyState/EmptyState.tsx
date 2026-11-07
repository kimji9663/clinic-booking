import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 6, px: 2 }}>
      {icon && (
        <Stack aria-hidden="true" sx={{ color: 'text.secondary', fontSize: 48 }}>
          {icon}
        </Stack>
      )}
      <Typography variant="h6" component="p">
        {title}
      </Typography>
      {description && <Typography color="text.secondary">{description}</Typography>}
      {action}
    </Stack>
  );
}
