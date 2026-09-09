import PropTypes from 'prop-types';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CategoryIcon from './CategoryIcon.jsx';
import EmptyState from './EmptyState.jsx';
import Icon from './Icon.jsx';
import SankeyFlowChart from './SankeyFlowChart.jsx';
import SegmentedControl from './SegmentedControl.jsx';
import SpendingDoughnutChart from './SpendingDoughnutChart.jsx';
import { getCategoryAccentStyle, resolveCategoryColor } from '../utils/categoryAppearance.js';
import { formatCurrency, fullDate } from '../utils/format.js';
import { categoryById, getSankeyChartData } from '../utils/selectors.js';

const VIEWS = [
  { value: 'bars', label: 'Breakdown' },
  { value: 'flow', label: 'Flow' },
];

export default function ReportsBreakdownCard({
  spending,
  expenseTransactions,
  categories,
  flowData,
  resolvedTheme,
  view,
  onViewChange,
  hasAnyTransactions,
  hasPeriodTransactions,
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [activeFlowNodeKey, setActiveFlowNodeKey] = useState(null);
  const expandButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  const canExpand = view === 'bars' ? spending.length > 0 : Boolean(flowData?.hasFlow);

  useEffect(() => {
    if (view !== 'bars') return;

    if (spending.length === 0) {
      setActiveCategoryId(null);
      return;
    }

    if (!spending.some((item) => item.categoryId === activeCategoryId)) {
      setActiveCategoryId(spending[0].categoryId);
    }
  }, [activeCategoryId, spending, view]);

  useEffect(() => {
    if (view !== 'flow') return;

    if (!flowData?.hasFlow) {
      setActiveFlowNodeKey(null);
      return;
    }

    if (activeFlowNodeKey && !flowData.detailsByKey?.[activeFlowNodeKey]) {
      setActiveFlowNodeKey(null);
    }
  }, [activeFlowNodeKey, flowData, view]);

  useEffect(() => {
    if (!expanded) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeExpanded();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [expanded]);

  function openExpanded() {
    if (!canExpand) return;
    setExpanded(true);
  }

  function closeExpanded() {
    setExpanded(false);
    window.requestAnimationFrame(() => {
      expandButtonRef.current?.focus();
    });
  }

  const dialogTitle = view === 'bars' ? 'Expanded spending breakdown chart' : 'Expanded money flow chart';
  const dialogCopy =
    view === 'bars'
      ? 'Expanded chart-only view of this period\'s spending breakdown.'
      : 'Expanded chart-only view of how income, checking, expenses, and savings goals connect this period.';

  return (
    <>
      <section className="card card--lg reports-breakdown" aria-label="Spending breakdown">
        <div className="reports-breakdown__header">
          <h2 className="t-h2">Spending breakdown</h2>
          <div className="reports-breakdown__actions">
            <SegmentedControl value={view} options={VIEWS} onChange={onViewChange} ariaLabel="Chart view" />
            {canExpand ? (
              <button
                ref={expandButtonRef}
                type="button"
                className="reports-breakdown__expand"
                onClick={openExpanded}
                aria-label={view === 'bars' ? 'Expand spending breakdown' : 'Expand money flow chart'}
              >
                <Icon name="expand" size={15} strokeWidth={1.8} />
              </button>
            ) : null}
          </div>
        </div>

        <BreakdownContent
          spending={spending}
          expenseTransactions={expenseTransactions}
          categories={categories}
          flowData={flowData}
          resolvedTheme={resolvedTheme}
          view={view}
          expanded={false}
          activeCategoryId={activeCategoryId}
          onActiveCategoryChange={setActiveCategoryId}
          activeFlowNodeKey={activeFlowNodeKey}
          onActiveFlowNodeChange={setActiveFlowNodeKey}
          hasAnyTransactions={hasAnyTransactions}
          hasPeriodTransactions={hasPeriodTransactions}
        />
      </section>

      {expanded && portalTarget
        ? createPortal(
            <div
              className="sheet-backdrop reports-breakdown__backdrop"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  closeExpanded();
                }
              }}
            >
              <section
                className="sheet reports-breakdown__dialog reports-breakdown__dialog--chart-only"
                role="dialog"
                aria-modal="true"
                aria-labelledby={dialogTitleId}
                aria-describedby={dialogDescriptionId}
              >
                <div className="reports-breakdown__dialog-head">
                  <div className="sr-only">
                    <h2 id={dialogTitleId} className="t-h2">{dialogTitle}</h2>
                    <p id={dialogDescriptionId} className="reports-breakdown__dialog-text">
                      {dialogCopy}
                    </p>
                  </div>
                  <div className="reports-breakdown__dialog-actions">
                    <SegmentedControl value={view} options={VIEWS} onChange={onViewChange} ariaLabel="Expanded chart view" />
                    <button
                      ref={closeButtonRef}
                      type="button"
                      className="reports-breakdown__close"
                      onClick={closeExpanded}
                      aria-label="Close expanded spending breakdown"
                    >
                      <Icon name="x" size={16} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                <div className="reports-breakdown__dialog-body">
                  <BreakdownContent
                    spending={spending}
                    expenseTransactions={expenseTransactions}
                    categories={categories}
                    flowData={flowData}
                    resolvedTheme={resolvedTheme}
                    view={view}
                    expanded
                    chartOnly
                    activeCategoryId={activeCategoryId}
                    onActiveCategoryChange={setActiveCategoryId}
                    activeFlowNodeKey={activeFlowNodeKey}
                    onActiveFlowNodeChange={setActiveFlowNodeKey}
                    hasAnyTransactions={hasAnyTransactions}
                    hasPeriodTransactions={hasPeriodTransactions}
                  />
                </div>
              </section>
            </div>,
            portalTarget
          )
        : null}
    </>
  );
}

function BreakdownContent({
  spending,
  expenseTransactions,
  categories,
  flowData,
  resolvedTheme,
  view,
  expanded,
  chartOnly = false,
  activeCategoryId,
  onActiveCategoryChange,
  activeFlowNodeKey,
  onActiveFlowNodeChange,
  hasAnyTransactions,
  hasPeriodTransactions,
}) {
  if (view === 'flow') {
    return (
      <FlowBreakdown
        data={flowData}
        resolvedTheme={resolvedTheme}
        expanded={expanded}
        chartOnly={chartOnly}
        activeFlowNodeKey={activeFlowNodeKey}
        onActiveFlowNodeChange={onActiveFlowNodeChange}
        hasAnyTransactions={hasAnyTransactions}
        hasPeriodTransactions={hasPeriodTransactions}
      />
    );
  }

  return (
    <DoughnutBreakdown
      spending={spending}
      expenseTransactions={expenseTransactions}
      categories={categories}
      resolvedTheme={resolvedTheme}
      expanded={expanded}
      chartOnly={chartOnly}
      activeCategoryId={activeCategoryId}
      onActiveCategoryChange={onActiveCategoryChange}
      hasAnyTransactions={hasAnyTransactions}
      hasPeriodTransactions={hasPeriodTransactions}
    />
  );
}

function DoughnutBreakdown({
  spending,
  expenseTransactions,
  categories,
  resolvedTheme,
  expanded,
  chartOnly = false,
  activeCategoryId,
  onActiveCategoryChange,
  hasAnyTransactions,
  hasPeriodTransactions,
}) {
  const total = spending.reduce((sum, item) => sum + item.amount, 0);
  const segments = useMemo(() => {
    const transactionsByCategory = new Map();

    expenseTransactions.forEach((transaction) => {
      if (!transactionsByCategory.has(transaction.categoryId)) {
        transactionsByCategory.set(transaction.categoryId, []);
      }
      transactionsByCategory.get(transaction.categoryId).push(transaction);
    });

    return spending.map((item) => {
      const category = categoryById(categories, item.categoryId);
      const transactions = [...(transactionsByCategory.get(item.categoryId) || [])].sort((a, b) => {
        if (a.date === b.date) return Math.abs(b.amount) - Math.abs(a.amount);
        return a.date < b.date ? 1 : -1;
      });

      return {
        categoryId: item.categoryId,
        name: category?.name || 'Other',
        icon: category?.icon,
        colorVar: category?.colorVar,
        amount: item.amount,
        share: total > 0 ? item.amount / total : 0,
        transactionCount: transactions.length,
        transactions,
      };
    });
  }, [categories, expenseTransactions, spending, total]);

  const activeSegment = segments.find((segment) => segment.categoryId === activeCategoryId) || segments[0] || null;

  if (segments.length === 0) {
    const emptyCopy = !hasAnyTransactions
      ? 'Add expenses to see your breakdown.'
      : hasPeriodTransactions
        ? 'Add expenses to see your breakdown.'
        : 'No spending data yet. Add expenses to see your breakdown.';

    return (
      <div className={`reports-breakdown__empty${expanded ? ' is-expanded' : ''}`}>
        <EmptyState
          title="No spending data yet"
          copy={emptyCopy}
        />
      </div>
    );
  }

  if (chartOnly) {
    return (
      <div className="reports-breakdown-chart-only" aria-label="Expanded spending breakdown chart">
        <SpendingDoughnutChart
          segments={segments}
          total={total}
          theme={resolvedTheme}
          expanded
          activeCategoryId={activeSegment?.categoryId || null}
          onSelectCategory={onActiveCategoryChange}
        />
      </div>
    );
  }

  return (
    <div className={`reports-breakdown-detail${expanded ? ' reports-breakdown-detail--expanded' : ''}`}>
      <div className="reports-breakdown-detail__summary">
        <SpendingDoughnutChart
          segments={segments}
          total={total}
          theme={resolvedTheme}
          expanded={expanded}
          activeCategoryId={activeSegment?.categoryId || null}
          onSelectCategory={onActiveCategoryChange}
        />
        <div className="reports-breakdown-detail__caption">
          <span className="reports-breakdown-detail__caption-title">Category details</span>
          <span className="reports-breakdown-detail__caption-copy">
            Select a chart slice or category row to inspect the expense transactions behind it.
          </span>
        </div>
      </div>

      <div className="reports-category-breakdown" aria-label="Detailed category spending breakdown">
        {segments.map((segment) => {
          const isActive = segment.categoryId === activeSegment?.categoryId;
          const itemId = `reports-category-${segment.categoryId}`;

          return (
            <section
              key={segment.categoryId}
              className={`reports-category-breakdown__item${isActive ? ' is-active' : ''}`}
            >
              <button
                type="button"
                className="reports-category-breakdown__toggle"
                aria-expanded={isActive}
                aria-controls={itemId}
                onClick={() => onActiveCategoryChange(segment.categoryId)}
              >
                <span className="reports-category-breakdown__main">
                  <span
                    className="reports-category-breakdown__icon"
                    style={getCategoryAccentStyle(segment.colorVar, 0.15)}
                    aria-hidden="true"
                  >
                    <CategoryIcon category={segment} categoryId={segment.categoryId} size={15} />
                  </span>

                  <span className="reports-category-breakdown__copy">
                    <span className="reports-category-breakdown__name-row">
                      <span className="reports-category-breakdown__name">{segment.name}</span>
                      <span
                        className="reports-category-breakdown__dot"
                        style={{ backgroundColor: resolveCategoryColor(segment.colorVar) }}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="reports-category-breakdown__meta">
                      {formatCount(segment.transactionCount, 'transaction')} / {Math.round(segment.share * 100)}% of spending
                    </span>
                  </span>
                </span>

                <span className="reports-category-breakdown__stats">
                  <span className="reports-category-breakdown__amount tnum">{formatCurrency(segment.amount)}</span>
                  <span className="reports-category-breakdown__share tnum">{Math.round(segment.share * 100)}%</span>
                  <span className="reports-category-breakdown__chevron" aria-hidden="true">
                    <Icon name={isActive ? 'arrowUp' : 'arrowDown'} size={14} strokeWidth={1.8} />
                  </span>
                </span>
              </button>

              {isActive ? (
                <div id={itemId} className="reports-category-breakdown__panel">
                  <div className="reports-category-breakdown__transactions">
                    {segment.transactions.map((transaction) => (
                      <article key={transaction.id} className="reports-category-breakdown__transaction">
                        <div className="reports-category-breakdown__transaction-main">
                          <div className="reports-category-breakdown__transaction-name">
                            {transaction.merchant || segment.name}
                          </div>
                          <div className="reports-category-breakdown__transaction-date">
                            {fullDate(transaction.date)}
                          </div>
                          {transaction.note ? (
                            <div className="reports-category-breakdown__transaction-note">
                              {transaction.note}
                            </div>
                          ) : null}
                        </div>

                        <div className="reports-category-breakdown__transaction-amount tnum">
                          {formatCurrency(Math.abs(transaction.amount))}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function FlowBreakdown({
  data,
  resolvedTheme,
  expanded,
  chartOnly = false,
  activeFlowNodeKey,
  onActiveFlowNodeChange,
  hasAnyTransactions,
  hasPeriodTransactions,
}) {
  const [showAll, setShowAll] = useState(false);
  const chartData = useMemo(
    () => getSankeyChartData(data, activeFlowNodeKey, { maxTransactions: expanded ? 6 : 4 }),
    [activeFlowNodeKey, data, expanded]
  );
  const activeDetail = activeFlowNodeKey ? data?.detailsByKey?.[activeFlowNodeKey] || null : null;
  const isFocused = !!(activeFlowNodeKey && activeDetail && activeDetail.type !== 'overview');
  const focusedTitle = isFocused ? activeDetail?.title || '' : '';

  useEffect(() => {
    setShowAll(false);
  }, [activeFlowNodeKey, expanded]);

  if (!data?.hasFlow) {
    const emptyCopy = !hasAnyTransactions
      ? 'No money flow data yet. Add income, expenses, or savings goals to see your flow.'
      : hasPeriodTransactions
        ? 'No money flow data yet. Add income, expenses, or savings goals to see your flow.'
        : 'No money flow data yet. Add income, expenses, or savings goals to see your flow.';

    return (
      <div className={`reports-breakdown__empty${expanded ? ' is-expanded' : ''}`}>
        <EmptyState
          title="No money flow data yet"
          copy={emptyCopy}
        />
      </div>
    );
  }

  function handleNodeSelect(nodeKey, kind) {
    if (!nodeKey || kind === 'transaction' || kind === 'transaction-group') return;
    if (kind === 'pool' || kind === 'balance') {
      onActiveFlowNodeChange(null);
      return;
    }
    onActiveFlowNodeChange((current) => (current === nodeKey ? null : nodeKey));
  }

  function handleSelectFromPanel(nodeKey) {
    onActiveFlowNodeChange((current) => (current === nodeKey ? null : nodeKey));
  }

  if (chartOnly) {
    return (
      <div className="reports-breakdown-chart-only" aria-label="Expanded money flow chart">
        <div className="reports-flow__chart-pane reports-flow__chart-pane--chart-only">
          <SankeyFlowChart
            data={chartData}
            theme={resolvedTheme}
            height={660}
            framed={false}
            className="reports-flow-chart reports-flow-chart--expanded-only"
            activeNodeKey={activeFlowNodeKey}
            onNodeSelect={handleNodeSelect}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`reports-flow${expanded ? ' reports-flow--expanded' : ''}`}>
      <div className="reports-flow__caption t-caption">
        Default view stays high level. Click a spending category to expand its transactions, or click Savings to expand its goals.
      </div>

      <div className={`reports-flow-shell${expanded ? ' reports-flow-shell--expanded' : ''}`}>
        <div className="reports-flow__chart-pane">
          {isFocused ? (
            <div className="reports-flow__focus-bar" role="status" aria-live="polite">
              <span className="reports-flow__focus-label">
                Expanded <strong>{focusedTitle}</strong>
              </span>
              <button
                type="button"
                className="reports-flow__focus-reset"
                onClick={() => onActiveFlowNodeChange(null)}
              >
                <Icon name="x" size={12} strokeWidth={2} />
                Show all flows
              </button>
            </div>
          ) : null}
          <SankeyFlowChart
            data={chartData}
            theme={resolvedTheme}
            height={expanded ? 560 : 420}
            framed={false}
            className="reports-flow-chart"
            activeNodeKey={activeFlowNodeKey}
            onNodeSelect={handleNodeSelect}
          />
          <div className="reports-flow__hint">
            {isFocused
              ? 'Click the same node again or use “Show all flows” to bring everything back.'
              : 'Click a category to isolate its flow. Hover any node to fade the rest.'}
          </div>
        </div>

        <FlowDetailPanel
          detail={activeDetail}
          expanded={expanded}
          showAll={showAll}
          onToggleShowAll={() => setShowAll((current) => !current)}
          onSelectNode={handleSelectFromPanel}
        />
      </div>
    </div>
  );
}

function FlowDetailPanel({ detail, expanded, showAll, onToggleShowAll, onSelectNode }) {
  if (!detail || detail.type === 'overview') {
    return (
      <section className="reports-flow-detail" aria-label="Money flow detail">
        <header className="reports-flow-detail__head">
          <h3 className="reports-flow-detail__title">Flow details</h3>
          <p className="reports-flow-detail__subtitle">
            Select a spending category or the Savings node to inspect that branch in detail.
          </p>
        </header>
      </section>
    );
  }

  const entryLimit = expanded ? 6 : 4;
  const headerSummary = getFlowDetailSummary(detail);

  return (
    <section className="reports-flow-detail" aria-label="Money flow detail">
      <header className="reports-flow-detail__head">
        <div className="reports-flow-detail__title-row">
          {detail.color ? (
            <span className="reports-flow-detail__dot" style={{ backgroundColor: detail.color }} aria-hidden="true" />
          ) : null}
          <h3 className="reports-flow-detail__title">{detail.title}</h3>
        </div>
        {typeof detail.amount === 'number' ? (
          <div className="reports-flow-detail__amount tnum">{formatCurrency(detail.amount)}</div>
        ) : null}
        <p className="reports-flow-detail__subtitle">{headerSummary || detail.subtitle}</p>
      </header>

      {detail.type === 'income' ? (
        <FlowTransactionSection
          entries={detail.transactions}
          limit={entryLimit}
          noun="income entry"
          showAll={showAll}
          onToggleShowAll={onToggleShowAll}
          sectionTitle="Income transactions"
          emptyCopy="No income entries for this source yet."
          categoryColor={detail.color}
        />
      ) : null}

      {detail.type === 'category' ? (
        <FlowTransactionSection
          entries={detail.transactions}
          limit={entryLimit}
          noun="transaction"
          showAll={showAll}
          onToggleShowAll={onToggleShowAll}
          sectionTitle={`${detail.title} transactions`}
          emptyCopy="No transactions found for this category."
          categoryColor={detail.color}
          categoryIcon={detail.icon}
        />
      ) : null}

      {detail.type === 'expense-group' ? (
        <FlowCollectionSection
          title="Grouped categories"
          items={detail.items}
          emptyCopy="No grouped categories."
        />
      ) : null}

      {detail.type === 'savings' ? (
        <FlowCollectionSection
          title="Savings goals"
          items={detail.goals}
          emptyCopy="No goals funded in this period yet."
          onSelectNode={onSelectNode}
          mode="savings-goals"
        />
      ) : null}

      {detail.type === 'goal' ? (
        <>
          <div className="reports-flow-detail__stats">
            <div className="reports-flow-detail__stat">
              <span className="reports-flow-detail__stat-label">Saved this period</span>
              <span className="reports-flow-detail__stat-value tnum">{formatCurrency(detail.amount)}</span>
            </div>
            <div className="reports-flow-detail__stat">
              <span className="reports-flow-detail__stat-label">Current total</span>
              <span className="reports-flow-detail__stat-value tnum">{formatCurrency(detail.current || 0)}</span>
            </div>
            <div className="reports-flow-detail__stat">
              <span className="reports-flow-detail__stat-label">Progress</span>
              <span className="reports-flow-detail__stat-value tnum">{Math.round((detail.progress || 0) * 100)}%</span>
            </div>
          </div>
          <div className="reports-flow-detail__progress">
            <div className="reports-flow-detail__progress-track">
              <div
                className="reports-flow-detail__progress-fill"
                style={{
                  width: `${Math.min(100, Math.round((detail.progress || 0) * 100))}%`,
                  backgroundColor: detail.color || 'var(--accent-surface)',
                }}
              />
            </div>
            <div className="reports-flow-detail__progress-meta">
              <span className="tnum">{formatCurrency(detail.current || 0)}</span>
              <span className="tnum">of {formatCurrency(detail.target || 0)}</span>
            </div>
          </div>
          <FlowSavingsEntrySection
            entries={detail.entries}
            limit={entryLimit}
            showAll={showAll}
            onToggleShowAll={onToggleShowAll}
          />
        </>
      ) : null}

      {detail.type === 'goal-group' ? (
        <FlowCollectionSection
          title="Grouped goals"
          items={detail.items}
          emptyCopy="No grouped goals."
        />
      ) : null}
    </section>
  );
}

function FlowCollectionSection({ title, items = [], emptyCopy, onSelectNode, mode = 'default' }) {
  return (
    <section className="reports-flow-detail__section">
      <div className="reports-flow-detail__section-title">{title}</div>
      {items.length === 0 ? (
        <div className="reports-flow-detail__empty-note">{emptyCopy}</div>
      ) : (
        <div className="reports-flow-detail__list">
          {items.map((item) => {
            const meta = getFlowCollectionMeta(item, mode);
            const amountLabel = getFlowCollectionAmountLabel(item, mode);

            return (
              <FlowDetailRow
                key={item.key}
                label={item.label}
                meta={meta}
                amount={item.amount}
                amountLabel={amountLabel}
                color={item.color}
                onClick={onSelectNode ? () => onSelectNode(item.key) : null}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function FlowDetailRow({ label, meta, amount, amountLabel, color, onClick }) {
  const content = (
    <>
      <span className="reports-flow-detail__row-main">
        {color ? <span className="reports-flow-detail__dot" style={{ backgroundColor: color }} aria-hidden="true" /> : null}
        <span className="reports-flow-detail__row-copy">
          <span className="reports-flow-detail__row-label">{label}</span>
          <span className="reports-flow-detail__row-meta">{meta}</span>
        </span>
      </span>
      <span className="reports-flow-detail__row-amount tnum">{amountLabel || formatCurrency(amount)}</span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="reports-flow-detail__row" onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className="reports-flow-detail__row">{content}</div>;
}

function FlowTransactionSection({
  entries = [],
  limit,
  noun,
  showAll,
  onToggleShowAll,
  sectionTitle = 'Transactions',
  emptyCopy = 'No transactions found for this category.',
  categoryColor,
  categoryIcon,
}) {
  const visibleEntries = showAll ? entries : entries.slice(0, limit);
  const showIcon = !!(categoryColor || categoryIcon);

  return (
    <section className="reports-flow-detail__section">
      <div className="reports-flow-detail__section-title">{sectionTitle}</div>
      {visibleEntries.length === 0 ? (
        <div className="reports-flow-detail__empty-note">{emptyCopy}</div>
      ) : (
        <div className="reports-flow-detail__transactions">
          {visibleEntries.map((entry) => (
            <article
              key={entry.id}
              className={`reports-flow-detail__transaction${showIcon ? ' has-icon' : ''}`}
            >
              {showIcon ? (
                <span
                  className="reports-flow-detail__transaction-icon"
                  style={getCategoryAccentStyle(categoryColor, 0.16)}
                  aria-hidden="true"
                >
                  {categoryIcon ? (
                    <CategoryIcon category={{ icon: categoryIcon }} size={14} />
                  ) : null}
                </span>
              ) : null}
              <div className="reports-flow-detail__transaction-main">
                <div className="reports-flow-detail__transaction-name">{entry.name}</div>
                <div className="reports-flow-detail__transaction-date">{fullDate(entry.date)}</div>
                {entry.note ? (
                  <div className="reports-flow-detail__transaction-note">{entry.note}</div>
                ) : null}
              </div>
              <div className="reports-flow-detail__transaction-amount tnum">
                {formatCurrency(entry.amount)}
              </div>
            </article>
          ))}
        </div>
      )}
      {entries.length > limit ? (
        <button type="button" className="reports-flow-detail__show-more" onClick={onToggleShowAll}>
          {showAll ? `Show fewer ${noun}s` : `See all ${entries.length} ${noun}${entries.length === 1 ? '' : 's'}`}
        </button>
      ) : null}
    </section>
  );
}

function FlowSavingsEntrySection({ entries = [], limit, showAll, onToggleShowAll }) {
  const visibleEntries = showAll ? entries : entries.slice(0, limit);

  return (
    <section className="reports-flow-detail__section">
      <div className="reports-flow-detail__section-title">Savings moves</div>
      {visibleEntries.length === 0 ? (
        <div className="reports-flow-detail__empty-note">No savings moves recorded for this goal yet.</div>
      ) : (
        <div className="reports-flow-detail__transactions">
          {visibleEntries.map((entry) => (
            <article key={entry.id} className="reports-flow-detail__transaction">
              <div className="reports-flow-detail__transaction-main">
                <div className="reports-flow-detail__transaction-name">{entry.label}</div>
                <div className="reports-flow-detail__transaction-date">{fullDate(entry.date)}</div>
                {entry.note ? (
                  <div className="reports-flow-detail__transaction-note">{entry.note}</div>
                ) : null}
              </div>
              <div className="reports-flow-detail__transaction-amount tnum">
                {formatCurrency(entry.amount)}
              </div>
            </article>
          ))}
        </div>
      )}
      {entries.length > limit ? (
        <button type="button" className="reports-flow-detail__show-more" onClick={onToggleShowAll}>
          {showAll ? 'Show fewer savings moves' : `See all ${entries.length} savings moves`}
        </button>
      ) : null}
    </section>
  );
}

function getFlowDetailSummary(detail) {
  if (detail.type === 'category') {
    const transactionCount = detail.transactions?.length || 0;
    return `${formatCurrency(detail.amount)} spent · ${formatCount(transactionCount, 'transaction')}`;
  }

  if (detail.type === 'savings') {
    const goalCount = detail.goals?.length || 0;
    return `${formatCurrency(detail.amount)} saved · ${formatCount(goalCount, 'goal')}`;
  }

  if (detail.type === 'income') {
    const incomeCount = detail.transactions?.length || 0;
    return `${formatCurrency(detail.amount)} received · ${formatCount(incomeCount, 'income entry')}`;
  }

  return detail.subtitle;
}

function getFlowCollectionMeta(item, mode) {
  if (mode === 'savings-goals') {
    const currentAmount = typeof item.current === 'number' ? formatCurrency(item.current) : null;
    return currentAmount
      ? `Current total ${currentAmount}`
      : formatCount(item.count || 0, 'savings move');
  }

  if (item.children?.length) {
    return `${formatCount(item.children.length, 'item')} grouped / ${Math.round((item.share || 0) * 100)}%`;
  }

  return `${formatCount(item.count || 0, 'transaction')} / ${Math.round((item.share || 0) * 100)}%`;
}

function getFlowCollectionAmountLabel(item, mode) {
  if (mode === 'savings-goals') {
    return `${formatCurrency(item.amount)} / ${formatCurrency(item.target || 0)}`;
  }

  return null;
}

function formatCount(value, noun) {
  return `${value} ${value === 1 ? noun : `${noun}s`}`;
}

const flowDataShape = PropTypes.shape({
  hasFlow: PropTypes.bool,
  overviewKey: PropTypes.string,
  summary: PropTypes.shape({
    totalIncome: PropTypes.number,
    totalExpenses: PropTypes.number,
    totalSavings: PropTypes.number,
    retainedInChecking: PropTypes.number,
    balanceUsed: PropTypes.number,
  }),
  detailsByKey: PropTypes.object,
  incomeSources: PropTypes.array,
  expenseCategories: PropTypes.array,
  savingsGoals: PropTypes.array,
});

ReportsBreakdownCard.propTypes = {
  spending: PropTypes.arrayOf(
    PropTypes.shape({
      categoryId: PropTypes.string.isRequired,
      amount: PropTypes.number.isRequired,
    })
  ).isRequired,
  expenseTransactions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      merchant: PropTypes.string,
      amount: PropTypes.number.isRequired,
      date: PropTypes.string.isRequired,
      note: PropTypes.string,
      categoryId: PropTypes.string.isRequired,
    })
  ).isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string,
      icon: PropTypes.string,
      colorVar: PropTypes.string,
    })
  ).isRequired,
  flowData: flowDataShape,
  resolvedTheme: PropTypes.oneOf(['light', 'dark']).isRequired,
  view: PropTypes.oneOf(['bars', 'flow']).isRequired,
  onViewChange: PropTypes.func.isRequired,
  hasAnyTransactions: PropTypes.bool.isRequired,
  hasPeriodTransactions: PropTypes.bool.isRequired,
};

BreakdownContent.propTypes = {
  spending: ReportsBreakdownCard.propTypes.spending,
  expenseTransactions: ReportsBreakdownCard.propTypes.expenseTransactions,
  categories: ReportsBreakdownCard.propTypes.categories,
  flowData: flowDataShape,
  resolvedTheme: ReportsBreakdownCard.propTypes.resolvedTheme,
  view: PropTypes.oneOf(['bars', 'flow']).isRequired,
  expanded: PropTypes.bool.isRequired,
  chartOnly: PropTypes.bool,
  activeCategoryId: PropTypes.string,
  onActiveCategoryChange: PropTypes.func.isRequired,
  activeFlowNodeKey: PropTypes.string,
  onActiveFlowNodeChange: PropTypes.func.isRequired,
  hasAnyTransactions: PropTypes.bool.isRequired,
  hasPeriodTransactions: PropTypes.bool.isRequired,
};

DoughnutBreakdown.propTypes = {
  spending: ReportsBreakdownCard.propTypes.spending,
  expenseTransactions: ReportsBreakdownCard.propTypes.expenseTransactions,
  categories: ReportsBreakdownCard.propTypes.categories,
  resolvedTheme: ReportsBreakdownCard.propTypes.resolvedTheme,
  expanded: PropTypes.bool.isRequired,
  chartOnly: PropTypes.bool,
  activeCategoryId: PropTypes.string,
  onActiveCategoryChange: PropTypes.func.isRequired,
  hasAnyTransactions: PropTypes.bool.isRequired,
  hasPeriodTransactions: PropTypes.bool.isRequired,
};

FlowBreakdown.propTypes = {
  data: flowDataShape,
  resolvedTheme: ReportsBreakdownCard.propTypes.resolvedTheme,
  expanded: PropTypes.bool.isRequired,
  chartOnly: PropTypes.bool,
  activeFlowNodeKey: PropTypes.string,
  onActiveFlowNodeChange: PropTypes.func.isRequired,
  hasAnyTransactions: PropTypes.bool.isRequired,
  hasPeriodTransactions: PropTypes.bool.isRequired,
};

FlowDetailPanel.propTypes = {
  detail: PropTypes.object,
  expanded: PropTypes.bool.isRequired,
  showAll: PropTypes.bool.isRequired,
  onToggleShowAll: PropTypes.func.isRequired,
  onSelectNode: PropTypes.func.isRequired,
};

FlowCollectionSection.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.array,
  emptyCopy: PropTypes.string.isRequired,
  onSelectNode: PropTypes.func,
  mode: PropTypes.string,
};

FlowDetailRow.propTypes = {
  label: PropTypes.string.isRequired,
  meta: PropTypes.string.isRequired,
  amount: PropTypes.number.isRequired,
  amountLabel: PropTypes.string,
  color: PropTypes.string,
  onClick: PropTypes.func,
};

FlowTransactionSection.propTypes = {
  entries: PropTypes.array,
  limit: PropTypes.number.isRequired,
  noun: PropTypes.string.isRequired,
  showAll: PropTypes.bool.isRequired,
  onToggleShowAll: PropTypes.func.isRequired,
  sectionTitle: PropTypes.string,
  emptyCopy: PropTypes.string,
  categoryColor: PropTypes.string,
  categoryIcon: PropTypes.string,
};

FlowSavingsEntrySection.propTypes = {
  entries: PropTypes.array,
  limit: PropTypes.number.isRequired,
  showAll: PropTypes.bool.isRequired,
  onToggleShowAll: PropTypes.func.isRequired,
};
