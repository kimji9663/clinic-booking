import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { scaleBand, scaleLinear } from 'd3-scale';
import { stack } from 'd3-shape';
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { visuallyHidden } from '../../a11y';
import { vars } from '../../palette';

/** 막대 색은 팔레트 키로만 받는다 → 고객사 테마·다크 모드를 그대로 따르고, 대비 보정된 색만 쓴다 */
export type ChartColor = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';

export interface ChartSeries<K extends string> {
  key: K;
  label: string;
  color: ChartColor;
}

export interface ChartDatum<K extends string> {
  id: string;
  /** x축에 쓰는 짧은 라벨 (예: 11/10) */
  label: string;
  /** 툴팁·표에 쓰는 전체 라벨 (예: 11월 10일 – 11월 16일) */
  fullLabel: string;
  values: Record<K, number>;
}

export interface StackedBarChartProps<K extends string> {
  title: string;
  description?: string;
  /** 아래(먼저)부터 쌓이는 순서 */
  series: readonly ChartSeries<K>[];
  data: readonly ChartDatum<K>[];
  /** 값 뒤에 붙는 단위 (예: 건) */
  unit?: string;
  height?: number;
  loading?: boolean;
}

const MARGIN = { top: 16, right: 8, bottom: 28, left: 36 };
/** 측정 전(첫 레이아웃·jsdom)에 쓰는 폭 */
const FALLBACK_WIDTH = 640;
/** x축 라벨끼리 최소 간격. 좁은 화면에서는 라벨을 건너뛰어 겹치지 않게 한다 */
const MIN_LABEL_SPACING = 52;
const TOOLTIP_GAP = 4;

/** 컨테이너 폭을 따라가 반응형으로 다시 그린다 */
function useElementWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWidth(element.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * D3 누적 막대 차트.
 * - D3 는 계산(d3-scale 의 축 스케일, d3-shape 의 stack)만 맡고, SVG 는 React 가 그린다
 *   → DOM 을 React 와 D3 가 나눠 갖지 않아 리렌더·StrictMode 에서도 안전
 * - 색은 CSS 변수로 칠해 다크 모드 전환 시 다시 렌더링하지 않는다
 * - SVG 는 스크린리더에서 숨기고 같은 데이터를 표(caption 포함)로 제공한다
 * - 키보드: 차트에 포커스 후 ←/→/Home/End 로 막대를 옮기며 값을 읽는다(툴팁 + aria-live)
 */
export function StackedBarChart<K extends string>({
  title,
  description,
  series,
  data,
  unit = '',
  height = 240,
  loading = false,
}: StackedBarChartProps<K>) {
  const theme = useTheme();
  const palette = vars(theme);
  const titleId = useId();
  const hintId = useId();
  const [containerRef, measuredWidth] = useElementWidth();
  const [active, setActive] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const width = measuredWidth || FALLBACK_WIDTH;
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const { layers, totals, x, y, labelEvery } = useMemo(() => {
    const keys = series.map((s) => s.key);
    const layers = stack<ChartDatum<K>, K>()
      .keys(keys)
      .value((d, key) => d.values[key])([...data]);
    const totals = data.map((d) => keys.reduce((sum, key) => sum + d.values[key], 0));
    const x = scaleBand<string>()
      .domain(data.map((d) => d.id))
      .range([0, innerWidth])
      .paddingInner(0.3)
      .paddingOuter(0.15);
    const y = scaleLinear()
      .domain([0, Math.max(1, ...totals)])
      .nice()
      .range([innerHeight, 0]);
    const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_SPACING / Math.max(1, x.step())));
    return { layers, totals, x, y, labelEvery };
  }, [series, data, innerWidth, innerHeight]);

  const describe = (index: number): string => {
    const datum = data[index];
    if (!datum) return '';
    const parts = series.map((s) => `${s.label} ${datum.values[s.key]}${unit}`);
    return `${datum.fullLabel}: ${parts.join(', ')}, 합계 ${totals[index] ?? 0}${unit}`;
  };

  const moveTo = (index: number) => {
    setActive(index);
    setAnnouncement(describe(index));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = data.length - 1;
    if (last < 0) return;
    const current = active ?? last;
    const next = {
      ArrowLeft: Math.max(0, current - 1),
      ArrowRight: Math.min(last, current + 1),
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    moveTo(next);
  };

  const handleFocus = () => {
    setFocused(true);
    // 포커스가 들어오면 가장 최근 막대부터 읽어 준다
    if (active === null && data.length > 0) moveTo(data.length - 1);
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setFocused(false);
    setActive(null);
  };

  const activeDatum = active === null ? undefined : data[active];
  // 툴팁은 막대 위가 아니라 옆(차트 왼쪽 절반이면 오른쪽, 아니면 왼쪽)에 둔다
  // → 높은 막대에서도 제목·범례를 가리지 않고, 가리키는 막대 자체도 가리지 않는다
  const columnCenter = activeDatum ? MARGIN.left + (x(activeDatum.id) ?? 0) + x.bandwidth() / 2 : 0;
  const tooltipOnRight = columnCenter < width / 2;
  const tooltipLeft = tooltipOnRight
    ? columnCenter + x.step() / 2 + TOOLTIP_GAP
    : columnCenter - x.step() / 2 - TOOLTIP_GAP;
  const textStyle = { fill: palette.text.secondary, fontSize: 12 };

  return (
    <Card
      component="section"
      aria-labelledby={titleId}
      aria-busy={loading}
      sx={{ p: { xs: 2, sm: 2.5 } }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' }, mb: 2 }}
      >
        <Box>
          <Typography id={titleId} variant="h6" component="h2">
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
        <Stack component="ul" direction="row" spacing={2} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {series.map((s) => (
            <Stack
              key={s.key}
              component="li"
              direction="row"
              spacing={0.75}
              sx={{ alignItems: 'center' }}
            >
              <Box
                aria-hidden="true"
                sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: palette[s.color].main }}
              />
              <Typography variant="body2">{s.label}</Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>

      <Box ref={containerRef} sx={{ position: 'relative', minHeight: height }}>
        {loading ? (
          // 스켈레톤(span)에는 aria-label 을 쓸 수 없다(역할 없음) → 숨기고 안내 문장을 따로 둔다
          <>
            <Skeleton variant="rounded" height={height} aria-hidden="true" />
            <span style={visuallyHidden}>{title} 불러오는 중</span>
          </>
        ) : data.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            표시할 데이터가 없습니다.
          </Typography>
        ) : (
          <>
            {/* 시각 차트: 마우스·키보드로 값을 읽는 영역. 스크린리더는 아래 표를 읽는다 */}
            <Box
              role="group"
              aria-labelledby={titleId}
              aria-describedby={hintId}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onPointerLeave={() => {
                if (!focused) setActive(null);
              }}
              sx={{
                borderRadius: 1,
                '&:focus-visible': {
                  outline: `3px solid ${palette.primary.main}`,
                  outlineOffset: 2,
                },
              }}
            >
              <svg width={width} height={height} aria-hidden="true" style={{ display: 'block' }}>
                <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                  {y.ticks(4).map((tick) => (
                    <g key={tick} transform={`translate(0,${y(tick)})`}>
                      <line x2={innerWidth} style={{ stroke: palette.divider }} />
                      <text x={-8} dy="0.32em" textAnchor="end" style={textStyle}>
                        {tick}
                      </text>
                    </g>
                  ))}

                  {activeDatum && (
                    <rect
                      x={(x(activeDatum.id) ?? 0) - (x.step() - x.bandwidth()) / 2}
                      width={x.step()}
                      height={innerHeight}
                      style={{ fill: palette.action.hover }}
                    />
                  )}

                  {layers.map((layer, layerIndex) => {
                    const color = palette[series[layerIndex]?.color ?? 'primary'].main;
                    return (
                      <g key={layer.key}>
                        {layer.map((point, i) => {
                          const datum = data[i];
                          const barHeight = y(point[0]) - y(point[1]);
                          if (!datum || barHeight <= 0) return null;
                          return (
                            <rect
                              key={datum.id}
                              x={x(datum.id)}
                              y={y(point[1])}
                              width={x.bandwidth()}
                              height={barHeight}
                              // 쌓인 막대 사이를 표면색 선으로 갈라 색이 비슷한 고객사 테마에서도 구분되게
                              style={{
                                fill: color,
                                stroke: palette.background.paper,
                                strokeWidth: 1,
                              }}
                            />
                          );
                        })}
                      </g>
                    );
                  })}

                  {data.map((datum, i) =>
                    (data.length - 1 - i) % labelEvery === 0 ? (
                      <text
                        key={datum.id}
                        x={(x(datum.id) ?? 0) + x.bandwidth() / 2}
                        y={innerHeight + 18}
                        textAnchor="middle"
                        style={textStyle}
                      >
                        {datum.label}
                      </text>
                    ) : null,
                  )}

                  {/* 마우스: 막대 사이 빈 곳까지 열 전체를 감지 영역으로 */}
                  {data.map((datum, i) => (
                    <rect
                      key={datum.id}
                      x={(x(datum.id) ?? 0) - (x.step() - x.bandwidth()) / 2}
                      width={x.step()}
                      height={innerHeight}
                      fill="transparent"
                      onPointerEnter={() => setActive(i)}
                    />
                  ))}
                </g>
              </svg>
              <span id={hintId} style={visuallyHidden}>
                ←, → 키로 막대를 옮기며 값을 확인할 수 있습니다.
              </span>
            </Box>

            {activeDatum && (
              <Box
                aria-hidden="true"
                sx={{
                  position: 'absolute',
                  left: tooltipLeft,
                  top: MARGIN.top,
                  transform: tooltipOnRight ? 'none' : 'translateX(-100%)',
                  pointerEvents: 'none',
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  boxShadow: 2,
                  px: 1.5,
                  py: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {activeDatum.fullLabel}
                </Typography>
                {series.map((s) => (
                  <Typography key={s.key} variant="body2">
                    {s.label} {activeDatum.values[s.key]}
                    {unit}
                  </Typography>
                ))}
                <Typography variant="body2" color="text.secondary">
                  합계 {totals[active ?? 0]}
                  {unit}
                </Typography>
              </Box>
            )}

            <Box role="status" style={visuallyHidden}>
              {announcement}
            </Box>

            <table style={visuallyHidden}>
              <caption>{title}</caption>
              <thead>
                <tr>
                  <th scope="col">기간</th>
                  {series.map((s) => (
                    <th key={s.key} scope="col">
                      {s.label}
                    </th>
                  ))}
                  <th scope="col">합계</th>
                </tr>
              </thead>
              <tbody>
                {data.map((datum, i) => (
                  <tr key={datum.id}>
                    <th scope="row">{datum.fullLabel}</th>
                    {series.map((s) => (
                      <td key={s.key}>
                        {datum.values[s.key]}
                        {unit}
                      </td>
                    ))}
                    <td>
                      {totals[i]}
                      {unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Box>
    </Card>
  );
}
