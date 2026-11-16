/**
 * 차트 컴포넌트 진입점 (@clinic/ui/charts).
 * D3 는 차트를 쓰는 화면에서만 필요하므로 메인 진입점(@clinic/ui)과 분리해,
 * 모든 페이지가 함께 받는 공유 청크에 D3 가 섞이지 않게 한다.
 */
export {
  StackedBarChart,
  type ChartColor,
  type ChartDatum,
  type ChartSeries,
  type StackedBarChartProps,
} from './components/StackedBarChart/StackedBarChart';
