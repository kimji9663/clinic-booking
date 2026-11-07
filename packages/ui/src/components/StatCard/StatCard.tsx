import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { useId } from 'react';
import { toneColor, type Tone } from '../../tone';

export interface StatCardProps {
  label: string;
  value: number | string;
  unit?: string;
  tone?: Tone;
  helperText?: string;
}

/**
 * 스타일 전용 prop(tone)이 DOM 속성으로 새지 않도록 shouldForwardProp 로 걸러낸다.
 */
const AccentBar = styled('span', {
  shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone: Tone }>(({ theme, tone }) => ({
  display: 'block',
  width: 4,
  alignSelf: 'stretch',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: toneColor(theme, tone),
}));

const Root = styled(Card)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  padding: theme.spacing(2, 2.5),
  height: '100%',
}));

export function StatCard({ label, value, unit, tone = 'neutral', helperText }: StatCardProps) {
  const labelId = useId();

  return (
    <Root role="group" aria-labelledby={labelId}>
      <AccentBar tone={tone} aria-hidden="true" />
      <Box sx={{ minWidth: 0 }}>
        <Typography id={labelId} variant="label" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" component="p" sx={{ mt: 0.5 }}>
          {value}
          {unit && (
            <Typography component="span" variant="body1" color="text.secondary" sx={{ ml: 0.5 }}>
              {unit}
            </Typography>
          )}
        </Typography>
        {helperText && (
          <Typography variant="body2" color="text.secondary">
            {helperText}
          </Typography>
        )}
      </Box>
    </Root>
  );
}
