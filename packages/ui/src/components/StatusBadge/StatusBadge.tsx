import Chip from '@mui/material/Chip';
import { toneToChipColor, type Tone } from '../../tone';

export interface StatusDefinition {
  label: string;
  tone: Tone;
}

/** 도메인 상태값(S) 전체에 대해 표시 방법을 정의. 상태가 추가되면 정의 누락이 컴파일 에러가 된다. */
export type StatusConfig<S extends string> = Readonly<Record<S, StatusDefinition>>;

export interface StatusBadgeProps<S extends string> {
  status: S;
  config: StatusConfig<S>;
  size?: 'small' | 'medium';
}

/**
 * 상태 뱃지. 색상만으로 의미를 전달하지 않도록 항상 텍스트 라벨을 함께 보여준다.
 */
export function StatusBadge<S extends string>({
  status,
  config,
  size = 'small',
}: StatusBadgeProps<S>) {
  const { label, tone } = config[status];
  return <Chip label={label} color={toneToChipColor[tone]} size={size} variant="outlined" />;
}
