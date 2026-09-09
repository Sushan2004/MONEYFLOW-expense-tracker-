import PropTypes from 'prop-types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import EmptyState from './EmptyState.jsx';
import { formatCurrency } from '../utils/format.js';

function readCssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function DashboardChartTooltip({ active, payload }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="dashboard-chart-tooltip">
      <div className="dashboard-chart-tooltip__title">{point.tooltipLabel}</div>
      <div className="dashboard-chart-tooltip__value tnum">{formatCurrency(point.amount)}</div>
      <div className="dashboard-chart-tooltip__meta">
        {point.count} {point.count === 1 ? 'transaction' : 'transactions'}
      </div>
    </div>
  );
}

export default function DashboardSpendingChart({
  data,
  theme,
  emptyTitle,
  emptyCopy,
}) {
  const palette = {
    axis: readCssVar('--text-3', '#95A098'),
    grid: readCssVar('--border', '#E9E7DF'),
    bar: readCssVar('--cat-4', '#34D399'),
    currentBar: readCssVar('--accent-surface', '#0B3D2E'),
    hover: readCssVar('--focus-ring-soft', 'rgba(16,185,129,0.12)'),
  };

  const hasVisibleData = data.totalCount > 0;
  const chartPoints = data.points.map((point) => ({
    ...point,
    amountValue: Number(point.amount) || 0,
  }));
  const xAxisInterval = data.granularity === 'daily' ? 2 : 0;

  if (!hasVisibleData) {
    return (
      <div className="dashboard-chart dashboard-chart--empty" data-theme-render={theme}>
        <EmptyState title={emptyTitle} copy={emptyCopy} />
      </div>
    );
  }

  return (
    <div className="dashboard-chart" data-theme-render={theme}>
      <div className="dashboard-chart__canvas" aria-label="Spending over time bar chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartPoints} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={palette.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              interval={xAxisInterval}
              minTickGap={data.granularity === 'daily' ? 10 : 4}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fill: palette.axis, fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tick={{ fill: palette.axis, fontSize: 11 }}
              tickFormatter={(value) => formatCurrency(value, { compact: true })}
            />
            <Tooltip
              cursor={{ fill: palette.hover }}
              content={<DashboardChartTooltip />}
            />
            <Bar
              dataKey="amountValue"
              maxBarSize={34}
              radius={[10, 10, 4, 4]}
              isAnimationActive
              animationDuration={420}
              animationEasing="ease-out"
            >
              {chartPoints.map((point) => (
                <Cell
                  key={point.key}
                  fill={point.isCurrent ? palette.currentBar : palette.bar}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="dashboard-chart__footer">
        <span className="dashboard-chart__period">{data.periodLabel}</span>
        <span className="dashboard-chart__summary tnum">
          {formatCurrency(data.totalAmount)} across {data.totalCount} {data.totalCount === 1 ? 'expense' : 'expenses'}
        </span>
      </div>
    </div>
  );
}

DashboardSpendingChart.propTypes = {
  data: PropTypes.shape({
    granularity: PropTypes.string,
    periodLabel: PropTypes.string.isRequired,
    totalAmount: PropTypes.number.isRequired,
    totalCount: PropTypes.number.isRequired,
    points: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        tooltipLabel: PropTypes.string.isRequired,
        amount: PropTypes.number.isRequired,
        count: PropTypes.number.isRequired,
        isCurrent: PropTypes.bool.isRequired,
      })
    ).isRequired,
  }).isRequired,
  theme: PropTypes.oneOf(['light', 'dark']).isRequired,
  emptyTitle: PropTypes.string.isRequired,
  emptyCopy: PropTypes.string.isRequired,
};

DashboardChartTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
};
