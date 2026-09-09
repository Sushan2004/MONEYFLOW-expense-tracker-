import PropTypes from 'prop-types';
import {
  ArcElement,
  Chart as ChartJS,
  Tooltip,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import {
  colorWithAlpha,
  resolveCategoryColor,
} from '../utils/categoryAppearance.js';
import { formatCurrency } from '../utils/format.js';

ChartJS.register(ArcElement, Tooltip);

function readCssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

const centerTextPlugin = {
  id: 'spendingDoughnutCenterText',
  afterDatasetsDraw(chart, _args, pluginOptions) {
    const meta = chart.getDatasetMeta(0);
    const arc = meta?.data?.[0];
    if (!arc) return;

    const amountText = pluginOptions?.amountText || '';
    const labelText = pluginOptions?.labelText || '';
    const { ctx } = chart;
    const centerX = arc.x;
    const centerY = arc.y;
    const innerRadius = arc.innerRadius || 0;
    const amountFontSize = Math.max(18, Math.min(innerRadius * 0.3, amountText.length > 10 ? 20 : 26));
    const labelFontSize = Math.max(11, Math.min(innerRadius * 0.13, 13));

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pluginOptions?.amountColor || '#0E1F17';
    ctx.font = `600 ${amountFontSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(amountText, centerX, centerY - 8);

    ctx.fillStyle = pluginOptions?.labelColor || '#6B7A73';
    ctx.font = `500 ${labelFontSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(labelText, centerX, centerY + amountFontSize * 0.55);
    ctx.restore();
  },
};

export default function SpendingDoughnutChart({
  segments,
  total,
  theme,
  expanded = false,
  activeCategoryId = null,
  onSelectCategory,
}) {
  const palette = {
    centerPrimary: readCssVar('--ink', '#0E1F17'),
    centerSecondary: readCssVar('--chart-center-secondary', '#6B7A73'),
    arcBorder: readCssVar('--page-bg', '#FAFAF5'),
    tooltipBg: readCssVar('--chart-tooltip-bg', 'rgba(255,255,255,0.98)'),
    tooltipBorder: readCssVar('--chart-tooltip-border', '#E9E7DF'),
    tooltipTitle: readCssVar('--chart-tooltip-text', '#0E1F17'),
    tooltipBody: readCssVar('--chart-tooltip-muted', '#5B6B63'),
  };

  const data = {
    labels: segments.map((segment) => segment.name),
    datasets: [
      {
        data: segments.map((segment) => segment.amount),
        backgroundColor: segments.map((segment) =>
          activeCategoryId && segment.categoryId !== activeCategoryId
            ? colorWithAlpha(segment.colorVar, 0.38)
            : resolveCategoryColor(segment.colorVar)
        ),
        borderColor: palette.arcBorder,
        borderWidth: segments.map((segment) =>
          segment.categoryId === activeCategoryId ? (expanded ? 5 : 4) : (expanded ? 4 : 3)
        ),
        hoverBorderWidth: expanded ? 5 : 4,
        hoverOffset: expanded ? 8 : 6,
        spacing: expanded ? 2 : 1,
        offset: segments.map((segment) =>
          segment.categoryId === activeCategoryId ? (expanded ? 16 : 12) : 0
        ),
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: expanded ? '74%' : '72%',
    animation: {
      duration: 520,
      easing: 'easeOutCubic',
    },
    onClick: (_event, elements) => {
      const index = elements?.[0]?.index;
      if (typeof index !== 'number') return;
      onSelectCategory?.(segments[index]?.categoryId || null);
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: palette.tooltipBg,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        titleColor: palette.tooltipTitle,
        bodyColor: palette.tooltipBody,
        displayColors: true,
        boxPadding: 4,
        padding: 12,
        titleFont: {
          family: 'Inter, system-ui, sans-serif',
          size: 13,
          weight: '600',
        },
        bodyFont: {
          family: 'Inter, system-ui, sans-serif',
          size: 12,
        },
        callbacks: {
          label(context) {
            const amount = Number(context.raw) || 0;
            const share = total > 0 ? amount / total : 0;
            return `${formatCurrency(amount)} - ${Math.round(share * 100)}%`;
          },
        },
      },
      spendingDoughnutCenterText: {
        amountText: formatCurrency(total),
        labelText: 'spent',
        amountColor: palette.centerPrimary,
        labelColor: palette.centerSecondary,
      },
    },
  };

  return (
    <div className={`reports-donut${expanded ? ' reports-donut--expanded' : ''}`} data-theme-render={theme}>
      <div className="reports-donut__visual" aria-label="Spending breakdown doughnut chart">
        <div className="reports-donut__chart">
          <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
        </div>
      </div>
    </div>
  );
}

SpendingDoughnutChart.propTypes = {
  segments: PropTypes.arrayOf(
    PropTypes.shape({
      categoryId: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      amount: PropTypes.number.isRequired,
      share: PropTypes.number.isRequired,
      colorVar: PropTypes.string,
    })
  ).isRequired,
  total: PropTypes.number.isRequired,
  theme: PropTypes.oneOf(['light', 'dark']).isRequired,
  expanded: PropTypes.bool,
  activeCategoryId: PropTypes.string,
  onSelectCategory: PropTypes.func,
};
