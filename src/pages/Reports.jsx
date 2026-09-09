import { useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState.jsx';
import ReportsBreakdownCard from '../components/ReportsBreakdownCard.jsx';
import SegmentedControl from '../components/SegmentedControl.jsx';
import StatCard from '../components/StatCard.jsx';
import { useAppState } from '../state/AppState.jsx';
import {
  currentReportPeriodKey,
  elapsedDaysInReportPeriod,
  formatCurrency,
  formatPercent,
  formatReportPeriodLabel,
  matchesReportPeriod,
} from '../utils/format.js';
import {
  categoryById,
  getSankeyData,
  spendingByCategoryEntries,
  totalsForTransactions,
} from '../utils/selectors.js';

const PERIODS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

export default function Reports() {
  const { state, resolvedTheme } = useAppState();
  const {
    transactions,
    categories,
    incomeEntries,
    incomeSources,
    goals,
    savingsTransfers,
  } = state;
  const [period, setPeriod] = useState('month');
  const [view, setView] = useState('bars');
  const periodKey = useMemo(() => currentReportPeriodKey(period), [period]);
  const periodLabel = useMemo(
    () => formatReportPeriodLabel(period, periodKey),
    [period, periodKey]
  );
  const periodTransactions = useMemo(
    () =>
      transactions.filter((transaction) => matchesReportPeriod(transaction.date, period, periodKey)),
    [period, periodKey, transactions]
  );
  const totals = useMemo(
    () => totalsForTransactions(periodTransactions),
    [periodTransactions]
  );
  const spending = useMemo(
    () => spendingByCategoryEntries(periodTransactions),
    [periodTransactions]
  );
  const expenseTransactions = useMemo(
    () =>
      periodTransactions.filter(
        (transaction) => transaction.type !== 'income' && Number(transaction.amount) < 0
      ),
    [periodTransactions]
  );
  const flowData = useMemo(
    () =>
      getSankeyData({
        transactions,
        categories,
        incomeEntries,
        incomeSources,
        goals,
        savingsTransfers,
        period,
        periodKey,
      }),
    [categories, goals, incomeEntries, incomeSources, period, periodKey, savingsTransfers, transactions]
  );
  const insights = useMemo(
    () => buildInsights({ categories, spending, totals }),
    [categories, spending, totals]
  );
  const hasAnyTransactions = transactions.length > 0;
  const hasPeriodData = periodTransactions.length > 0;
  const dailyAvg = hasPeriodData
    ? totals.spending / Math.max(1, elapsedDaysInReportPeriod(period, periodKey))
    : 0;

  if (state.status !== 'ready') return null;

  return (
    <>
      <header className="topbar">
        <div className="topbar__title-block">
          <h1 className="topbar__title">Reports</h1>
          <span className="t-caption">
            {periodLabel ? `Cashflow and category insights for ${periodLabel}` : 'Cashflow and category insights'}
          </span>
        </div>
        <SegmentedControl value={period} options={PERIODS} onChange={setPeriod} ariaLabel="Period" />
      </header>

      {hasPeriodData ? (
        <div className="kpi-grid">
          <StatCard label="Income" value={formatCurrency(totals.income)} />
          <StatCard label="Spending" value={formatCurrency(totals.spending)} />
          <StatCard label="Savings rate" value={formatPercent(totals.savingsRate)} />
          <StatCard label="Avg. daily" value={formatCurrency(dailyAvg)} />
        </div>
      ) : (
        <section className="card card--lg" style={{ marginBottom: 20 }}>
          <EmptyState
            title={hasAnyTransactions ? 'No report data for this period' : 'No report data yet'}
            copy={
              hasAnyTransactions
                ? 'Add income or expenses in this period to populate reports and charts.'
                : 'Add your first expense to see reports, charts, and savings rate.'
            }
          />
        </section>
      )}

      <section className="dash-grid" style={{ alignItems: 'start' }}>
        <ReportsBreakdownCard
          spending={spending}
          expenseTransactions={expenseTransactions}
          categories={categories}
          flowData={flowData}
          resolvedTheme={resolvedTheme}
          view={view}
          onViewChange={setView}
          hasAnyTransactions={hasAnyTransactions}
          hasPeriodTransactions={hasPeriodData}
        />

        <section className="card card--lg">
          <h2 className="t-h2" style={{ marginBottom: 12 }}>Insights</h2>
          {insights.length === 0 ? (
            <EmptyState
              title={hasAnyTransactions ? 'No insights for this period' : 'No insights yet'}
              copy={
                hasAnyTransactions
                  ? 'Add activity in this period to unlock insights here.'
                  : 'Add your first expense to see report insights.'
              }
            />
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {insights.map((insight) => (
                <Insight
                  key={insight.title}
                  tone={insight.tone}
                  title={insight.title}
                  body={insight.body}
                />
              ))}
            </div>
          )}
        </section>
      </section>
    </>
  );
}

function buildInsights({ categories, spending, totals }) {
  const nextInsights = [];

  if (spending.length > 0) {
    const topCategory = categoryById(categories, spending[0].categoryId);
    nextInsights.push({
      tone: 'neutral',
      title: 'Top category',
      body: `${topCategory?.name || 'Other'} leads spending at ${formatCurrency(spending[0].amount)} this period.`,
    });
  }

  if (totals.income > 0 && totals.spending > 0) {
    nextInsights.push({
      tone: totals.savingsRate >= 0.2 ? 'success' : 'warning',
      title: 'Savings rate',
      body: `You kept ${formatPercent(totals.savingsRate)} of income after expenses.`,
    });
  } else if (totals.income > 0 && totals.spending === 0) {
    nextInsights.push({
      tone: 'success',
      title: 'No expenses yet',
      body: 'Income is recorded for this period, but no expenses have been added yet.',
    });
  }

  if (spending.length > 0) {
    nextInsights.push({
      tone: 'neutral',
      title: 'Active categories',
      body: `Spending touched ${spending.length} ${spending.length === 1 ? 'category' : 'categories'} this period.`,
    });
  }

  return nextInsights.slice(0, 3);
}

function Insight({ tone, title, body }) {
  const bg =
    tone === 'success'
      ? 'var(--accent-soft-bg)'
      : tone === 'warning'
        ? 'var(--warning-wash)'
        : 'var(--cream)';
  const ink =
    tone === 'success'
      ? 'var(--accent-soft-ink)'
      : tone === 'warning'
        ? 'var(--warning-ink)'
        : 'var(--ink)';

  return (
    <div style={{ background: bg, borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{body}</div>
    </div>
  );
}
