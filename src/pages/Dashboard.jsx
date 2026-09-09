import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CategoryIcon from '../components/CategoryIcon.jsx';
import DashboardSpendingChart from '../components/DashboardSpendingChart.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import FilterChipSelect from '../components/FilterChipSelect.jsx';
import Icon from '../components/Icon.jsx';
import SegmentedControl from '../components/SegmentedControl.jsx';
import Skeleton from '../components/Skeleton.jsx';
import TransactionRow from '../components/TransactionRow.jsx';
import { useAppState } from '../state/AppState.jsx';
import { getCategoryAccentStyle } from '../utils/categoryAppearance.js';
import { formatCurrency, greetingFor, isoMonth } from '../utils/format.js';
import {
  getDashboardCategorySpending,
  getDashboardChartSeries,
  getDashboardHeroData,
  getDashboardMonthOptions,
  getDashboardRecentTransactions,
  getDashboardSavingsProgress,
} from '../utils/dashboardSelectors.js';
import { accountById, categoryById } from '../utils/selectors.js';

const CHART_GRANULARITIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function Dashboard() {
  const { state, resolvedTheme } = useAppState();
  const {
    user,
    accounts,
    transactions,
    categories,
    budgets,
    incomeEntries,
    goals,
    savingsTransfers,
    status,
    error,
  } = state;
  const currentMonth = isoMonth();
  const [chartGranularity, setChartGranularity] = useState('daily');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const hero = useMemo(
    () =>
      getDashboardHeroData({
        transactions,
        incomeEntries,
        savingsTransfers,
        goals,
        month: currentMonth,
      }),
    [currentMonth, goals, incomeEntries, savingsTransfers, transactions]
  );
  const recentTransactions = useMemo(
    () => getDashboardRecentTransactions(transactions, 5),
    [transactions]
  );
  const topCategories = useMemo(
    () =>
      getDashboardCategorySpending({
        transactions,
        categories,
        budgets,
        month: currentMonth,
        limit: 4,
      }),
    [budgets, categories, currentMonth, transactions]
  );
  const savingsProgress = useMemo(
    () =>
      getDashboardSavingsProgress({
        goals,
        incomeEntries,
        savingsTransfers,
        month: currentMonth,
        limit: 2,
      }),
    [currentMonth, goals, incomeEntries, savingsTransfers]
  );
  const chartData = useMemo(
    () =>
      getDashboardChartSeries({
        transactions,
        granularity: chartGranularity,
        selectedMonth,
      }),
    [chartGranularity, selectedMonth, transactions]
  );
  const monthOptions = useMemo(() => getDashboardMonthOptions(12), []);

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const currentMonthLabel = new Date(`${currentMonth}-01T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  if (status === 'loading' || status === 'idle') {
    return <DashboardSkeleton />;
  }

  if (status === 'error') {
    return (
      <ErrorBanner
        message={`Couldn't load your data - ${error || 'unknown error'}.`}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <>
      <header className="topbar dashboard-topbar">
        <div className="topbar__title-block">
          <h1 className="topbar__title">
            {greetingFor()}, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <span className="topbar__date">{dateLabel}</span>
        </div>
      </header>

      <div className="dashboard-page">
        <DashboardHero summary={hero} monthLabel={currentMonthLabel} />

        <section className="card card--lg dashboard-card dashboard-chart-card">
          <div className="dashboard-card__head dashboard-chart-card__head">
            <div>
              <h2 className="section-head__title">Spending over time</h2>
              <p className="dashboard-card__eyebrow">
                See how expense activity builds over the periods that matter most.
              </p>
            </div>
            <div className="dashboard-chart-card__controls">
              <SegmentedControl
                value={chartGranularity}
                options={CHART_GRANULARITIES}
                onChange={setChartGranularity}
                ariaLabel="Dashboard spending chart period"
              />
              {(chartGranularity === 'daily' || chartGranularity === 'weekly') ? (
                <FilterChipSelect
                  value={selectedMonth}
                  options={monthOptions}
                  onChange={setSelectedMonth}
                  ariaLabel="Select month for dashboard spending chart"
                  icon="calendar"
                  prefix="Month"
                  selected
                  secondary
                  className="dashboard-chart-card__month-filter"
                />
              ) : null}
            </div>
          </div>

          <DashboardSpendingChart
            data={chartData}
            theme={resolvedTheme}
            emptyTitle={chartData.hasAnyExpenses ? 'No spending in this period' : 'No spending data yet'}
            emptyCopy={
              chartData.hasAnyExpenses
                ? 'Choose another month or add expenses in this period to see your spending chart.'
                : 'Add expenses to see your spending chart.'
            }
          />
        </section>

        <div className="dashboard-bottom-grid">
          <section className="card card--lg dashboard-card">
            <header className="section-head">
              <h2 className="section-head__title">Recent transactions</h2>
              <Link to="/transactions" className="section-head__action">See all</Link>
            </header>
            {recentTransactions.length === 0 ? (
              <EmptyState
                title="No transactions yet"
                copy="Add your first transaction to get started."
                action={
                  <Link to="/add" className="btn btn--secondary">
                    Add entry
                  </Link>
                }
              />
            ) : (
              <div className="dashboard-transactions">
                {recentTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    category={categoryById(categories, transaction.categoryId)}
                    account={accountById(accounts, transaction.accountId)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="card card--lg dashboard-card">
            <header className="section-head">
              <h2 className="section-head__title">Spending by category</h2>
              <Link to="/budget" className="section-head__action">View budgets</Link>
            </header>
            {topCategories.length === 0 ? (
              <EmptyState
                title="No spending data available"
                copy="Add expenses to see your top categories."
              />
            ) : (
              <div className="dashboard-category-list">
                {topCategories.map((category) => {
                  const barWidth = Math.max(category.amount > 0 ? 8 : 0, Math.min(100, Math.round(category.ratio * 100)));
                  return (
                    <article key={category.categoryId} className="dashboard-category-row">
                      <div className="dashboard-category-row__head">
                        <div className="dashboard-category-row__identity">
                          <span
                            className="dashboard-category-row__icon"
                            style={getCategoryAccentStyle(category.color, 0.14)}
                            aria-hidden="true"
                          >
                            <CategoryIcon category={{ icon: category.icon, colorVar: category.color }} size={16} />
                          </span>
                          <div className="dashboard-category-row__copy">
                            <div className="dashboard-category-row__name">{category.name}</div>
                            <div className="dashboard-category-row__meta">
                              {category.budgetAmount
                                ? `Budget ${formatCurrency(category.budgetAmount)}`
                                : 'No budget set'}
                            </div>
                          </div>
                        </div>
                        <div className="dashboard-category-row__amount tnum">
                          {formatCurrency(category.amount)}
                        </div>
                      </div>
                      <div className="dashboard-mini-progress" aria-hidden="true">
                        <span style={{ width: `${barWidth}%`, backgroundColor: category.color }} />
                      </div>
                      <div className="dashboard-category-row__foot">
                        {category.budgetAmount
                          ? `${Math.round((category.amount / category.budgetAmount) * 100)}% of budget used`
                          : 'Scaled against this month’s top category'}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card card--lg dashboard-card">
            <header className="section-head">
              <h2 className="section-head__title">Savings progress</h2>
              <Link to="/goals" className="section-head__action">Manage</Link>
            </header>
            {!savingsProgress.hasGoals ? (
              <EmptyState
                title="No savings goal yet"
                copy="Create a savings goal to track progress."
                action={
                  <Link to="/goals" className="btn btn--secondary">
                    Create goal
                  </Link>
                }
              />
            ) : (
              <div className="dashboard-savings">
                <div className="dashboard-savings__summary">
                  <span className="dashboard-savings__label">Saved this month</span>
                  <span className="dashboard-savings__amount tnum">
                    {formatCurrency(savingsProgress.savedThisMonth)}
                  </span>
                  <span className="dashboard-savings__copy">
                    Goal progress updates automatically as savings moves are recorded.
                  </span>
                </div>

                <div className="dashboard-goal-list">
                  {savingsProgress.goals.map((goal) => {
                    const progressWidth = Math.max(goal.progress > 0 ? 8 : 0, Math.min(100, Math.round(goal.progress * 100)));
                    return (
                      <article key={goal.id} className="dashboard-goal-row">
                        <div className="dashboard-goal-row__head">
                          <div className="dashboard-goal-row__title">
                            <span
                              className="dashboard-goal-row__dot"
                              style={{ backgroundColor: goal.color }}
                              aria-hidden="true"
                            />
                            <span>{goal.name}</span>
                          </div>
                          <div className="dashboard-goal-row__amount tnum">
                            {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
                          </div>
                        </div>
                        <div className="dashboard-mini-progress" aria-hidden="true">
                          <span style={{ width: `${progressWidth}%`, backgroundColor: goal.color }} />
                        </div>
                        <div className="dashboard-goal-row__meta">
                          {Math.round(goal.progress * 100)}% funded
                          {goal.deadline ? ` · Due ${formatDeadline(goal.deadline)}` : ''}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function DashboardHero({ summary, monthLabel }) {
  if (!summary.hasActivity) {
    return (
      <section className="dashboard-hero dashboard-hero--empty">
        <div className="dashboard-hero__empty-copy">
          <span className="dashboard-hero__eyebrow">{monthLabel}</span>
          <h2 className="dashboard-hero__headline">Add income to see your cashflow</h2>
          <p className="dashboard-hero__copy">
            Your monthly cashflow, spending, savings, and checking balance will appear here once you start tracking activity.
          </p>
          <Link to="/add" className="btn btn--secondary dashboard-hero__empty-action">
            <Icon name="plus" size={14} strokeWidth={2} />
            Add first entry
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-hero">
      <div className="dashboard-hero__top">
        <div className="dashboard-hero__intro">
          <span className="dashboard-hero__eyebrow">{monthLabel}</span>
          <h2 className="dashboard-hero__headline">Net cashflow</h2>
          <p className="dashboard-hero__copy">
            Income minus spending and money moved into savings this month.
          </p>
        </div>
        <div className="dashboard-hero__net tnum">{formatCurrency(summary.netCashflow)}</div>
      </div>

      <div className="dashboard-hero__metrics">
        <DashboardMetric label="Income" value={summary.income} tone="income" />
        <DashboardMetric label="Spending" value={summary.spending} tone="spending" />
        <DashboardMetric label="Saved" value={summary.saved} tone="saved" />
        <DashboardMetric label="Left in checking" value={summary.leftInChecking} tone="checking" />
      </div>
    </section>
  );
}

function DashboardMetric({ label, value, tone = 'default' }) {
  return (
    <article className={`dashboard-metric dashboard-metric--${tone}`}>
      <span className="dashboard-metric__label">{label}</span>
      <span className="dashboard-metric__value tnum">{formatCurrency(value)}</span>
    </article>
  );
}

function formatDeadline(iso) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function DashboardSkeleton() {
  return (
    <>
      <header className="topbar dashboard-topbar">
        <div className="topbar__title-block">
          <Skeleton width={220} height={26} />
          <Skeleton width={180} height={12} style={{ marginTop: 6 }} />
        </div>
      </header>
      <div className="dashboard-page">
        <Skeleton height={240} radius={22} />
        <Skeleton height={420} radius={20} />
        <div className="dashboard-bottom-grid">
          <Skeleton height={280} radius={18} />
          <Skeleton height={280} radius={18} />
          <Skeleton height={280} radius={18} />
        </div>
      </div>
    </>
  );
}

DashboardHero.propTypes = {
  summary: PropTypes.shape({
    income: PropTypes.number.isRequired,
    spending: PropTypes.number.isRequired,
    saved: PropTypes.number.isRequired,
    netCashflow: PropTypes.number.isRequired,
    leftInChecking: PropTypes.number.isRequired,
    hasActivity: PropTypes.bool.isRequired,
  }).isRequired,
  monthLabel: PropTypes.string.isRequired,
};

DashboardMetric.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  tone: PropTypes.string,
};
