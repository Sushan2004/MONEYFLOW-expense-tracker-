import {
  addDays,
  fullDate,
  isoMonth,
  isoYear,
  startOfWeek,
  todayIso,
} from './format.js';
import {
  categoryById,
  checkingBalance,
  spendingByCategoryEntries,
  totalsForTransactions,
} from './selectors.js';
import { resolveCategoryColor } from './categoryAppearance.js';

function isExpenseTransaction(transaction) {
  const amount = Number(transaction?.amount) || 0;
  return transaction?.type === 'expense' || (transaction?.type !== 'income' && amount < 0);
}

function monthStartDate(monthKey) {
  return new Date(`${monthKey}-01T00:00:00`);
}

function monthEndDate(monthKey) {
  const [year, month] = String(monthKey).split('-').map(Number);
  return new Date(year, month, 0);
}

function shiftMonth(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function monthLabel(monthKey) {
  return monthStartDate(monthKey).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function shortMonthLabel(monthKey) {
  return monthStartDate(monthKey).toLocaleDateString('en-US', {
    month: 'short',
  });
}

function formatCompactRange(start, end) {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()}-${end.getDate()}`;
  }
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function formatLongRange(start, end) {
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear) {
    return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  }
  return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
}

function compareTransactionsDesc(a, b) {
  if (a.date === b.date) {
    const amountDiff = Math.abs(Number(b.amount) || 0) - Math.abs(Number(a.amount) || 0);
    if (amountDiff !== 0) return amountDiff;
    return String(a.merchant || '').localeCompare(String(b.merchant || ''));
  }
  return a.date < b.date ? 1 : -1;
}

function savedAmountFromIncomeEntries(entries = []) {
  return entries.reduce(
    (sum, entry) => sum + (((Number(entry.amount) || 0) * (Number(entry.savePercent) || 0)) / 100),
    0
  );
}

function clampGoalProgress(goal) {
  const current = Number(goal.current) || 0;
  const target = Number(goal.target) || 0;
  if (target <= 0) return 0;
  return Math.max(0, Math.min(1, current / target));
}

function compareGoals(a, b) {
  const progressDiff = clampGoalProgress(b) - clampGoalProgress(a);
  if (progressDiff !== 0) return progressDiff;

  const aDeadline = a.deadline ? new Date(`${a.deadline}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
  const bDeadline = b.deadline ? new Date(`${b.deadline}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
  if (aDeadline !== bDeadline) return aDeadline - bDeadline;

  const currentDiff = (Number(b.current) || 0) - (Number(a.current) || 0);
  if (currentDiff !== 0) return currentDiff;

  return String(a.name || '').localeCompare(String(b.name || ''));
}

function normalizeSelectedMonth(value, today = new Date()) {
  return /^\d{4}-\d{2}$/.test(String(value || '')) ? value : isoMonth(today);
}

export function getDashboardMonthOptions(count = 12, today = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = shiftMonth(new Date(today.getFullYear(), today.getMonth(), 1), -index);
    const value = isoMonth(date);
    return { value, label: monthLabel(value) };
  });
}

export function getDashboardHeroData({
  transactions = [],
  incomeEntries = [],
  savingsTransfers = [],
  goals = [],
  month = isoMonth(),
} = {}) {
  const periodTransactions = transactions.filter((transaction) => transaction.date?.startsWith(month));
  const totals = totalsForTransactions(periodTransactions);
  const monthlyIncomeEntries = incomeEntries.filter((entry) => entry.date?.startsWith(month));
  const monthlySavingsTransfers = savingsTransfers.filter((transfer) => transfer.date?.startsWith(month));
  const saved = savedAmountFromIncomeEntries(monthlyIncomeEntries)
    + monthlySavingsTransfers.reduce((sum, transfer) => sum + (Number(transfer.amount) || 0), 0);

  return {
    month,
    income: totals.income,
    spending: totals.spending,
    saved,
    netCashflow: totals.income - totals.spending - saved,
    leftInChecking: checkingBalance({ transactions, goals }),
    hasActivity: totals.income > 0 || totals.spending > 0 || saved > 0,
  };
}

export function getDashboardRecentTransactions(transactions = [], limit = 5) {
  return [...transactions].sort(compareTransactionsDesc).slice(0, limit);
}

export function getDashboardCategorySpending({
  transactions = [],
  categories = [],
  budgets = [],
  month = isoMonth(),
  limit = 4,
} = {}) {
  const spending = spendingByCategoryEntries(
    transactions.filter(
      (transaction) => isExpenseTransaction(transaction) && transaction.date?.startsWith(month)
    )
  ).slice(0, limit);
  const topAmount = spending[0]?.amount || 0;

  return spending.map((item) => {
    const category = categoryById(categories, item.categoryId);
    const budget = budgets.find(
      (entry) =>
        entry.categoryId === item.categoryId
        && entry.periodType === 'monthly'
        && entry.periodKey === month
    );
    const max = Math.max(budget?.amount || 0, budget ? item.amount : topAmount, item.amount, 1);

    return {
      categoryId: item.categoryId,
      name: category?.name || 'Other',
      icon: category?.icon || 'sparkle',
      color: resolveCategoryColor(category?.colorVar),
      amount: item.amount,
      max,
      budgetAmount: budget?.amount ?? null,
      ratio: max > 0 ? item.amount / max : 0,
      isOverBudget: Boolean(budget && item.amount > budget.amount),
    };
  });
}

export function getDashboardSavingsProgress({
  goals = [],
  incomeEntries = [],
  savingsTransfers = [],
  month = isoMonth(),
  limit = 2,
} = {}) {
  const monthlyIncomeEntries = incomeEntries.filter((entry) => entry.date?.startsWith(month));
  const monthlySavingsTransfers = savingsTransfers.filter((transfer) => transfer.date?.startsWith(month));
  const savedThisMonth = savedAmountFromIncomeEntries(monthlyIncomeEntries)
    + monthlySavingsTransfers.reduce((sum, transfer) => sum + (Number(transfer.amount) || 0), 0);

  const activeGoals = goals.filter(
    (goal) => (Number(goal.target) || 0) > 0 && (Number(goal.current) || 0) < (Number(goal.target) || 0)
  );
  const goalPool = activeGoals.length > 0 ? activeGoals : goals;

  return {
    savedThisMonth,
    hasGoals: goals.length > 0,
    goals: [...goalPool].sort(compareGoals).slice(0, limit).map((goal) => ({
      id: goal.id,
      name: goal.name,
      color: goal.color,
      current: Number(goal.current) || 0,
      target: Number(goal.target) || 0,
      progress: clampGoalProgress(goal),
      deadline: goal.deadline || null,
    })),
  };
}

export function getDashboardChartSeries({
  transactions = [],
  granularity = 'daily',
  selectedMonth = isoMonth(),
  today = new Date(),
} = {}) {
  const currentMonth = isoMonth(today);
  const normalizedMonth = normalizeSelectedMonth(selectedMonth, today);
  const expenseTransactions = transactions.filter(isExpenseTransaction);
  const normalizedToday = new Date(today);
  normalizedToday.setHours(0, 0, 0, 0);

  if (granularity === 'daily') {
    const start = monthStartDate(normalizedMonth);
    const end = monthEndDate(normalizedMonth);
    const stats = new Map();

    expenseTransactions
      .filter((transaction) => transaction.date?.startsWith(normalizedMonth))
      .forEach((transaction) => {
        const current = stats.get(transaction.date) || { amount: 0, count: 0 };
        current.amount += Math.abs(Number(transaction.amount) || 0);
        current.count += 1;
        stats.set(transaction.date, current);
      });

    const points = [];
    for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
      const key = todayIso(cursor);
      const current = stats.get(key) || { amount: 0, count: 0 };
      points.push({
        key,
        label: String(cursor.getDate()),
        tooltipLabel: fullDate(key),
        amount: current.amount,
        count: current.count,
        isCurrent: normalizedMonth === currentMonth && key === todayIso(today),
      });
    }

    return {
      granularity,
      selectedMonth: normalizedMonth,
      periodLabel: `${monthLabel(normalizedMonth)} · ${points.length} days`,
      totalAmount: points.reduce((sum, point) => sum + point.amount, 0),
      totalCount: points.reduce((sum, point) => sum + point.count, 0),
      points,
      hasAnyExpenses: expenseTransactions.length > 0,
    };
  }

  if (granularity === 'weekly') {
    const start = monthStartDate(normalizedMonth);
    const end = monthEndDate(normalizedMonth);
    const stats = new Map();

    expenseTransactions
      .filter((transaction) => transaction.date?.startsWith(normalizedMonth))
      .forEach((transaction) => {
        const weekKey = todayIso(startOfWeek(new Date(`${transaction.date}T00:00:00`)));
        const current = stats.get(weekKey) || { amount: 0, count: 0 };
        current.amount += Math.abs(Number(transaction.amount) || 0);
        current.count += 1;
        stats.set(weekKey, current);
      });

    const points = [];
    for (let bucketStart = startOfWeek(start); bucketStart <= end; bucketStart = addDays(bucketStart, 7)) {
      const bucketEnd = addDays(bucketStart, 6);
      const clippedStart = bucketStart < start ? start : bucketStart;
      const clippedEnd = bucketEnd > end ? end : bucketEnd;
      const key = todayIso(bucketStart);
      const current = stats.get(key) || { amount: 0, count: 0 };

      points.push({
        key,
        label: formatCompactRange(clippedStart, clippedEnd),
        tooltipLabel: formatLongRange(clippedStart, clippedEnd),
        amount: current.amount,
        count: current.count,
        isCurrent: normalizedMonth === currentMonth && normalizedToday >= clippedStart && normalizedToday <= clippedEnd,
      });
    }

    return {
      granularity,
      selectedMonth: normalizedMonth,
      periodLabel: `${monthLabel(normalizedMonth)} · ${points.length} weeks`,
      totalAmount: points.reduce((sum, point) => sum + point.amount, 0),
      totalCount: points.reduce((sum, point) => sum + point.count, 0),
      points,
      hasAnyExpenses: expenseTransactions.length > 0,
    };
  }

  if (granularity === 'monthly') {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = shiftMonth(new Date(today.getFullYear(), today.getMonth(), 1), index - 5);
      return isoMonth(date);
    });
    const stats = new Map(months.map((key) => [key, { amount: 0, count: 0 }]));

    expenseTransactions.forEach((transaction) => {
      const key = transaction.date?.slice(0, 7);
      if (!stats.has(key)) return;
      const current = stats.get(key);
      current.amount += Math.abs(Number(transaction.amount) || 0);
      current.count += 1;
      stats.set(key, current);
    });

    const points = months.map((key) => {
      const current = stats.get(key) || { amount: 0, count: 0 };
      return {
        key,
        label: shortMonthLabel(key),
        tooltipLabel: monthLabel(key),
        amount: current.amount,
        count: current.count,
        isCurrent: key === currentMonth,
      };
    });

    return {
      granularity,
      selectedMonth: normalizedMonth,
      periodLabel: 'Last 6 months',
      totalAmount: points.reduce((sum, point) => sum + point.amount, 0),
      totalCount: points.reduce((sum, point) => sum + point.count, 0),
      points,
      hasAnyExpenses: expenseTransactions.length > 0,
    };
  }

  const currentYear = isoYear(today);
  const years = Array.from({ length: 6 }, (_, index) => String(Number(currentYear) - 5 + index));
  const stats = new Map(years.map((key) => [key, { amount: 0, count: 0 }]));

  expenseTransactions.forEach((transaction) => {
    const key = transaction.date?.slice(0, 4);
    if (!stats.has(key)) return;
    const current = stats.get(key);
    current.amount += Math.abs(Number(transaction.amount) || 0);
    current.count += 1;
    stats.set(key, current);
  });

  const points = years.map((key) => {
    const current = stats.get(key) || { amount: 0, count: 0 };
    return {
      key,
      label: key,
      tooltipLabel: key,
      amount: current.amount,
      count: current.count,
      isCurrent: key === currentYear,
    };
  });

  return {
    granularity,
    selectedMonth: normalizedMonth,
    periodLabel: 'Last 6 years',
    totalAmount: points.reduce((sum, point) => sum + point.amount, 0),
    totalCount: points.reduce((sum, point) => sum + point.count, 0),
    points,
    hasAnyExpenses: expenseTransactions.length > 0,
  };
}
