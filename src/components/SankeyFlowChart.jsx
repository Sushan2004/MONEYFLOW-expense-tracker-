import PropTypes from 'prop-types';
import { useMemo } from 'react';
import * as echarts from 'echarts/core';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { SankeyChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { formatCurrency } from '../utils/format.js';

echarts.use([SankeyChart, TooltipComponent, CanvasRenderer]);

function readCssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function colorForNode(node, ramp, palette) {
  if (node.color) return node.color;
  if (node.kind === 'income') return palette.forest;
  if (node.kind === 'pool') return palette.emeraldDark;
  if (node.kind === 'savings') return palette.savings;
  if (node.kind === 'balance') return palette.balance;
  if (node.kind?.startsWith('expense')) return ramp[0];
  if (node.kind?.startsWith('goal')) return palette.savings;
  return ramp[0];
}

function formatShare(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) return '0%';
  return `${Math.round(ratio * 100)}%`;
}

export default function SankeyFlowChart({
  data,
  theme,
  height = 460,
  framed = true,
  className = '',
  activeNodeKey = null,
  onNodeSelect,
}) {
  const palette = {
    forest: readCssVar('--accent-surface', '#0B3D2E'),
    emeraldDark: readCssVar('--emerald-dark', '#059669'),
    savings: readCssVar('--emerald', '#10B981'),
    balance: readCssVar('--text-3', '#6B9A78'),
    ramp: [
      readCssVar('--cat-2', '#A7F3D0'),
      readCssVar('--cat-3', '#6EE7B7'),
      readCssVar('--cat-4', '#34D399'),
      readCssVar('--cat-5', '#10B981'),
      readCssVar('--cat-6', '#059669'),
      readCssVar('--cat-7', '#0B3D2E'),
      readCssVar('--cat-1', '#D1E7DB'),
    ],
    tooltipBg: readCssVar('--chart-tooltip-bg', '#FFFFFF'),
    tooltipBorder: readCssVar('--chart-tooltip-border', '#E9E7DF'),
    tooltipText: readCssVar('--chart-tooltip-text', '#0E1F17'),
    tooltipMuted: readCssVar('--chart-tooltip-muted', '#5B6B63'),
    lineBorder: readCssVar('--panel-border-strong', 'rgba(255,255,255,0.4)'),
    shadow: theme === 'dark'
      ? 'box-shadow: 0 12px 28px rgba(0,0,0,0.32); border-radius: 12px; padding: 10px 12px;'
      : 'box-shadow: 0 8px 24px rgba(14,31,23,0.10); border-radius: 12px; padding: 10px 12px;',
  };
  // Visible set walks strictly upstream and strictly downstream from the active
  // node. Other branches at junctions stay hidden so the chart isolates only
  // the selected flow without rebuilding the layout.
  const visibleKeys = useMemo(() => {
    if (!activeNodeKey) return null;

    const activeNode = data.nodes.find((node) => node.key === activeNodeKey);
    // Clicking the pool/overview is treated as deselect: nothing gets hidden.
    if (!activeNode || activeNode.kind === 'pool') return null;

    const visible = new Set([activeNodeKey]);
    const upstreamFor = new Map();
    const downstreamFor = new Map();
    data.links.forEach((link) => {
      if (!upstreamFor.has(link.target)) upstreamFor.set(link.target, []);
      upstreamFor.get(link.target).push(link.source);
      if (!downstreamFor.has(link.source)) downstreamFor.set(link.source, []);
      downstreamFor.get(link.source).push(link.target);
    });

    const walk = (start, adjacency) => {
      const stack = [start];
      while (stack.length) {
        const key = stack.pop();
        const neighbours = adjacency.get(key) || [];
        for (const next of neighbours) {
          if (visible.has(next)) continue;
          visible.add(next);
          stack.push(next);
        }
      }
    };
    walk(activeNodeKey, upstreamFor);
    walk(activeNodeKey, downstreamFor);

    return visible;
  }, [activeNodeKey, data.links, data.nodes]);

  const nodes = useMemo(
    () =>
      data.nodes.map((node) => {
        const color = colorForNode(node, palette.ramp, palette);
        const isSelected = activeNodeKey === node.key;
        const isVisible = !visibleKeys || visibleKeys.has(node.key);

        return {
          ...node,
          name: node.name,
          itemStyle: {
            color,
            borderColor: isVisible ? palette.lineBorder : 'transparent',
            borderWidth: isSelected ? 2 : 1,
            opacity: isVisible ? 1 : 0,
            shadowBlur: isSelected ? 18 : 0,
            shadowColor: isSelected ? color : 'transparent',
          },
          label: {
            color: palette.tooltipText,
            fontWeight: 500,
            opacity: isVisible ? 1 : 0,
            show: isVisible,
          },
          tooltip: { show: isVisible },
        };
      }),
    [activeNodeKey, visibleKeys, data, palette]
  );

  const links = useMemo(
    () =>
      data.links.map((link) => {
        const isVisible = !visibleKeys
          || (visibleKeys.has(link.source) && visibleKeys.has(link.target));
        return {
          ...link,
          source: link.source,
          target: link.target,
          value: Number(link.value),
          lineStyle: {
            color: link.color || 'gradient',
            opacity: isVisible ? 0.5 : 0,
            curveness: 0.5,
          },
          tooltip: { show: isVisible },
        };
      }),
    [visibleKeys, data]
  );

  const option = useMemo(
    () => ({
      animationDuration: 600,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'item',
        backgroundColor: palette.tooltipBg,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        textStyle: {
          color: palette.tooltipText,
          fontFamily: 'Inter, -apple-system, sans-serif',
          fontSize: 13,
        },
        extraCssText: palette.shadow,
        formatter: (params) => {
          if (params.dataType === 'edge') {
            const amount = formatCurrency(Number(params.data.value));
            return `
              <div style="display:grid;gap:4px;min-width:160px;">
                <strong style="color:${palette.tooltipText};">${escapeHtml(params.data.sourceLabel || params.data.source)} &rarr; ${escapeHtml(params.data.targetLabel || params.data.target)}</strong>
                <span style="color:${palette.tooltipMuted};">Amount: ${escapeHtml(amount)}</span>
                <span style="color:${palette.tooltipMuted};">Share: ${escapeHtml(formatShare(params.data.share))}</span>
                ${
                  Number(params.data.count) > 0
                    ? `<span style="color:${palette.tooltipMuted};">Count: ${escapeHtml(String(params.data.count))}</span>`
                    : ''
                }
              </div>
            `;
          }

          const nodeValue = Number(params.data.value);
          const metaDate = params.data.meta?.date;
          const metaNote = params.data.meta?.note;
          const baseName = params.data.meta?.baseName || params.data.displayName || params.name;

          return `
            <div style="display:grid;gap:4px;">
              <strong style="color:${palette.tooltipText};">${escapeHtml(baseName)}</strong>
              ${
                Number.isFinite(nodeValue) && nodeValue > 0
                  ? `<span style="color:${palette.tooltipMuted};">Total: ${escapeHtml(formatCurrency(nodeValue))}</span>`
                  : ''
              }
              <span style="color:${palette.tooltipMuted};">Share: ${escapeHtml(formatShare(params.data.share))}</span>
              ${
                Number(params.data.count) > 0
                  ? `<span style="color:${palette.tooltipMuted};">Count: ${escapeHtml(String(params.data.count))}</span>`
                  : ''
              }
              ${metaDate ? `<span style="color:${palette.tooltipMuted};">Date: ${escapeHtml(metaDate)}</span>` : ''}
              ${metaNote ? `<span style="color:${palette.tooltipMuted};">${escapeHtml(metaNote)}</span>` : ''}
            </div>
          `;
        },
      },
      series: [
        {
          type: 'sankey',
          left: 24,
          right: 150,
          top: 32,
          bottom: 32,
          data: nodes,
          links,
          nodeAlign: 'justify',
          nodeWidth: 14,
          nodeGap: 24,
          draggable: false,
          layoutIterations: 24,
          emphasis: {
            focus: 'adjacency',
            lineStyle: { opacity: 0.78 },
          },
          lineStyle: {
            opacity: 0.42,
            curveness: 0.5,
          },
          label: {
            color: palette.tooltipText,
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'Inter, -apple-system, sans-serif',
            width: 140,
            overflow: 'truncate',
            formatter: (params) => params.data.displayName || params.name,
          },
        },
      ],
    }),
    [activeNodeKey, links, nodes, palette]
  );

  const onEvents = useMemo(
    () => ({
      click: (params) => {
        if (params?.dataType !== 'node' || typeof onNodeSelect !== 'function') return;
        onNodeSelect(params.data.key || params.data.name, params.data.kind || '');
      },
    }),
    [onNodeSelect]
  );

  const chart = (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge
      lazyUpdate
      onEvents={onEvents}
      style={{ height: `${height}px`, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );

  if (!framed) {
    return (
      <div className={className} aria-label="Money flow sankey chart" data-theme-render={theme}>
        {chart}
      </div>
    );
  }

  return (
    <section className={`card card--lg ${className}`.trim()} aria-label="Money flow sankey chart" data-theme-render={theme}>
      {chart}
    </section>
  );
}

SankeyFlowChart.propTypes = {
  data: PropTypes.shape({
    nodes: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        displayName: PropTypes.string,
        kind: PropTypes.string,
        color: PropTypes.string,
        value: PropTypes.number,
        count: PropTypes.number,
        share: PropTypes.number,
        depth: PropTypes.number,
        meta: PropTypes.object,
      })
    ).isRequired,
    links: PropTypes.arrayOf(
      PropTypes.shape({
        source: PropTypes.string.isRequired,
        target: PropTypes.string.isRequired,
        value: PropTypes.number.isRequired,
        color: PropTypes.string,
        count: PropTypes.number,
        share: PropTypes.number,
        sourceLabel: PropTypes.string,
        targetLabel: PropTypes.string,
      })
    ).isRequired,
  }).isRequired,
  theme: PropTypes.oneOf(['light', 'dark']).isRequired,
  height: PropTypes.number,
  framed: PropTypes.bool,
  className: PropTypes.string,
  activeNodeKey: PropTypes.string,
  onNodeSelect: PropTypes.func,
};
