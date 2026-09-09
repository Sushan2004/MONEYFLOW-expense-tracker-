import { DEFAULT_CATEGORY_COLOR, colorWithAlpha, resolveCategoryColor } from './categoryAppearance.js';
import {
  currentBudgetPeriodKey,
  currentReportPeriodKey,
  formatCurrency,
  isoMonth,
  matchesBudgetPeriod,
  matchesReportPeriod,
} from './format.js';

export function categoryById(categories, id) {
  return categories.find((c) => c.id === id);
}

export function accountById(accounts, id) {
  return accounts.find((a) => a.id === id);
}

export function totalBalance(accounts) {
  return accounts.reduce((sum, a) => sum + a.balance, 0);
}

export function totalsForTransactions(transactions = []) {
  let income = 0;
  let spending = 0;

  for (const transaction of transactions) {
    if (transaction.type === 'income' || transaction.amount > 0) income += transaction.amount;
    else spending += Math.abs(transaction.amount);
  }

  return {
    income,
    spending,
    savingsRate: income > 0 ? (income - spending) / income : 0,
  };
}

export function monthTotals(transactions, month = isoMonth()) {
  return totalsForTransactions(transactions.filter((transaction) => transaction.date.startsWith(month)));
}

export function spendingByCategoryEntries(transactions = []) {
  const map = new Map();
  for (const transaction of transactions) {
    if (transaction.type === 'income' || transaction.amount >= 0) continue;
    const key = transaction.categoryId;
    map.set(key, (map.get(key) || 0) + Math.abs(transaction.amount));
  }

  return [...map.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function spendingByCategory(transactions, month = isoMonth()) {
  return spendingByCategoryEntries(
    transactions.filter((transaction) => transaction.date.startsWith(month))
  );
}

export function spendingByCategoryForBudgetPeriod(
  transactions,
  periodType = 'monthly',
  periodKey = currentBudgetPeriodKey(periodType)
) {
  const map = new Map();
  for (const transaction of transactions) {
    if (!matchesBudgetPeriod(transaction.date, periodType, periodKey)) continue;
    if (transaction.type === 'income' || transaction.amount >= 0) continue;
    const key = transaction.categoryId;
    map.set(key, (map.get(key) || 0) + Math.abs(transaction.amount));
  }
  return [...map.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function normalizeBudgetAlertThreshold(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.8;
  const ratio = numeric > 1 ? numeric / 100 : numeric;
  return Math.max(0, Math.min(1, ratio || 0.8));
}

function budgetStatusForRatio(ratio, alertThreshold = 0.8) {
  if (ratio > 1) return 'over';
  if (ratio >= alertThreshold) return 'warn';
  return 'ok';
}

export function getBudgetableCategories(categories) {
  if (!Array.isArray(categories)) return [];
  return categories.filter((category) => category?.id && category.id !== 'cat-income');
}

export function getBudgetCategoryData(
  budgets,
  transactions,
  categories,
  periodType = 'monthly',
  periodKey = currentBudgetPeriodKey(periodType)
) {
  const budgetableCategoryIds = new Set(getBudgetableCategories(categories).map((category) => category.id));
  const periodBudgets = budgets.filter(
    (budget) =>
      budget.periodType === periodType
      && budget.periodKey === periodKey
      && budgetableCategoryIds.has(budget.categoryId)
  );
  const spending = spendingByCategoryForBudgetPeriod(transactions, periodType, periodKey);
  const spentMap = new Map(spending.map((item) => [item.categoryId, item.amount]));
  const statusOrder = { over: 0, warn: 1, ok: 2 };

  return periodBudgets
    .map((budget) => {
      const category = categoryById(categories, budget.categoryId);
      const spent = spentMap.get(budget.categoryId) || 0;
      const ratio = budget.amount > 0 ? spent / budget.amount : 0;
      const remaining = budget.amount - spent;
      const alertThreshold = normalizeBudgetAlertThreshold(budget.alertThreshold);
      const status = budgetStatusForRatio(ratio, alertThreshold);
      const usedPercent = Math.round(ratio * 100);

      return {
        categoryId: budget.categoryId,
        periodType: budget.periodType,
        periodKey: budget.periodKey,
        name: category?.name || 'Other',
        icon: category?.icon || 'sparkle',
        colorVar: resolveCategoryColor(category?.colorVar || DEFAULT_CATEGORY_COLOR),
        budget: budget.amount,
        spent,
        ratio,
        usedPercent,
        remaining,
        overBy: Math.max(0, spent - budget.amount),
        alertThreshold,
        thresholdPercent: Math.round(alertThreshold * 100),
        status,
      };
    })
    .sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      if (b.ratio !== a.ratio) return b.ratio - a.ratio;
      return b.spent - a.spent;
    });
}

export function getBudgetSummary(budgets, transactions, categories, month = isoMonth()) {
  const categoryData = getBudgetCategoryData(budgets, transactions, categories, 'monthly', month);
  const totalBudget = categoryData.reduce((sum, item) => sum + item.budget, 0);
  const totalSpent = categoryData.reduce((sum, item) => sum + item.spent, 0);
  const remaining = totalBudget - totalSpent;

  return {
    totalBudget,
    totalSpent,
    remaining,
    usedRatio: totalBudget > 0 ? totalSpent / totalBudget : 0,
    remainingRatio: totalBudget > 0 ? Math.max(0, remaining) / totalBudget : 0,
    overBudgetAmount: categoryData.reduce((sum, item) => sum + item.overBy, 0),
    overBudgetCount: categoryData.filter((item) => item.status === 'over').length,
    nearLimitCount: categoryData.filter((item) => item.status === 'warn').length,
  };
}

export function getBudgetSummaryForPeriod(
  budgets,
  transactions,
  categories,
  periodType = 'monthly',
  periodKey = currentBudgetPeriodKey(periodType)
) {
  const categoryData = getBudgetCategoryData(budgets, transactions, categories, periodType, periodKey);
  const totalBudget = categoryData.reduce((sum, item) => sum + item.budget, 0);
  const totalSpent = categoryData.reduce((sum, item) => sum + item.spent, 0);
  const remaining = totalBudget - totalSpent;

  return {
    totalBudget,
    totalSpent,
    remaining,
    usedRatio: totalBudget > 0 ? totalSpent / totalBudget : 0,
    remainingRatio: totalBudget > 0 ? Math.max(0, remaining) / totalBudget : 0,
    overBudgetAmount: categoryData.reduce((sum, item) => sum + item.overBy, 0),
    overBudgetCount: categoryData.filter((item) => item.status === 'over').length,
    nearLimitCount: categoryData.filter((item) => item.status === 'warn').length,
  };
}

export function getBudgetBreakdown(categoryData) {
  const totalSpent = categoryData.reduce((sum, item) => sum + item.spent, 0);

  return categoryData
    .filter((item) => item.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .map((item) => ({
      categoryId: item.categoryId,
      name: item.name,
      colorVar: item.colorVar,
      amount: item.spent,
      share: totalSpent > 0 ? item.spent / totalSpent : 0,
      status: item.status,
    }));
}

export function groupByDay(transactions) {
  const map = new Map();
  for (const t of transactions) {
    if (!map.has(t.date)) map.set(t.date, []);
    map.get(t.date).push(t);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({
      date,
      total: items.reduce((s, t) => s + t.amount, 0),
      items,
    }));
}

export function uniqueId(prefix = 't') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function totalSavings(goals) {
  if (!Array.isArray(goals)) return 0;
  return goals.reduce((sum, goal) => sum + (Number(goal.current) || 0), 0);
}

export function checkingBalance({ transactions = [], goals = [] } = {}) {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    const amount = Number(t.amount) || 0;
    if (t.type === 'income' || amount > 0) income += Math.abs(amount);
    else expenses += Math.abs(amount);
  }
  return income - expenses - totalSavings(goals);
}

const FLOW_INCOME_COLORS = ['#B7E4C7', '#95D5B2', '#74C69D', '#52B788', '#40916C'];
const FLOW_BALANCE_COLOR = '#6B9A78';
const FLOW_SAVINGS_COLOR = '#34D399';
const FLOW_OTHER_COLOR = resolveCategoryColor(DEFAULT_CATEGORY_COLOR);
const FLOW_POOL_KEY = 'pool:checking';
const FLOW_SAVINGS_KEY = 'savings:pool';

function normalizeFlowLabel(value, fallback) {
  const next = String(value || '').trim();
  return next || fallback;
}

function flowKeyPart(value, fallback = 'item') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

function sortFlowTransactions(a, b) {
  const amountDiff = Math.abs(Number(b.amount) || 0) - Math.abs(Number(a.amount) || 0);
  if (amountDiff !== 0) return amountDiff;
  if (a.date === b.date) return String(a.name || '').localeCompare(String(b.name || ''));
  return a.date < b.date ? 1 : -1;
}

function makeFlowTransactionRecord(transaction, fallbackName) {
  return {
    id: transaction.id,
    name: normalizeFlowLabel(transaction.merchant, fallbackName),
    amount: Math.abs(Number(transaction.amount) || 0),
    date: transaction.date,
    note: transaction.note || '',
    categoryId: transaction.categoryId,
  };
}

function distributeEntryAcrossGoals(entry, goalsById) {
  const savedAmount = ((Number(entry.amount) || 0) * (Number(entry.savePercent) || 0)) / 100;
  if (!(savedAmount > 0)) return [];

  const split = Array.isArray(entry.splitConfig) ? entry.splitConfig : [];
  const allocations = split
    .filter((item) => item?.goalId && goalsById.has(item.goalId) && Number(item.percent) > 0)
    .map((item) => ({
      goalId: item.goalId,
      amount: savedAmount * (Number(item.percent) / 100),
    }))
    .filter((item) => item.amount > 0);

  if (allocations.length > 0) return allocations;

  if (goalsById.size === 1) {
    const [goalId] = goalsById.keys();
    return [{ goalId, amount: savedAmount }];
  }

  return [];
}

function withShare(items, total) {
  return items.map((item) => ({
    ...item,
    share: total > 0 ? item.amount / total : 0,
  }));
}

function createGroupedFlowItem({
  key,
  label,
  color,
  amount,
  count,
  icon = 'sparkle',
  children = [],
}) {
  return {
    key,
    label,
    color,
    amount,
    count,
    icon,
    children,
    share: 0,
  };
}

function limitFlowItems(items, maxVisible, otherKey, otherLabel, otherColor) {
  const visible = items.slice(0, maxVisible);
  const overflow = items.slice(maxVisible);

  if (overflow.length === 0) return { visible, overflow: [] };

  const grouped = createGroupedFlowItem({
    key: otherKey,
    label: otherLabel,
    color: otherColor,
    amount: overflow.reduce((sum, item) => sum + item.amount, 0),
    count: overflow.reduce((sum, item) => sum + item.count, 0),
    children: overflow,
  });

  return { visible: [...visible, grouped], overflow };
}

function createFlowNode({
  key,
  label,
  kind,
  color,
  amount,
  count = 0,
  share = 0,
  depth = 0,
  meta = {},
}) {
  return {
    key,
    name: key,
    displayName: label,
    kind,
    color,
    value: amount,
    count,
    share,
    depth,
    meta,
  };
}

function createFlowLink({
  source,
  target,
  amount,
  color,
  count = 0,
  share = 0,
  sourceLabel,
  targetLabel,
}) {
  return {
    key: `${source}->${target}`,
    source,
    target,
    value: amount,
    color,
    count,
    share,
    sourceLabel,
    targetLabel,
  };
}

export function getSankeyData({
  transactions = [],
  categories = [],
  incomeEntries = [],
  incomeSources = [],
  goals = [],
  savingsTransfers = [],
  period = 'month',
  periodKey = currentReportPeriodKey(period),
  maxCategories = 5,
  maxGoals = 5,
} = {}) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const goalMap = new Map(goals.map((goal) => [goal.id, goal]));
  const incomeSourceById = new Map(incomeSources.map((source) => [source.id, source]));
  const incomeSourceByName = new Map(
    incomeSources.map((source) => [normalizeFlowLabel(source.name, 'Income').toLowerCase(), source])
  );
  const incomeEntryByTransactionId = new Map(
    incomeEntries.map((entry) => [entry.transactionId, entry])
  );

  const periodTransactions = transactions.filter((transaction) =>
    matchesReportPeriod(transaction.date, period, periodKey)
  );
  const periodIncomeEntries = incomeEntries.filter((entry) =>
    matchesReportPeriod(entry.date, period, periodKey)
  );
  const periodSavingsTransfers = savingsTransfers.filter((transfer) =>
    matchesReportPeriod(transfer.date, period, periodKey)
  );

  const incomeGroups = new Map();
  for (const transaction of periodTransactions) {
    const amount = Number(transaction.amount) || 0;
    const isIncome = transaction.type === 'income' || (transaction.type !== 'expense' && amount > 0);
    if (!isIncome) continue;

    const entry = incomeEntryByTransactionId.get(transaction.id);
    const fallbackName = normalizeFlowLabel(transaction.merchant, 'Income');
    const matchedSource = entry?.sourceId
      ? incomeSourceById.get(entry.sourceId)
      : incomeSourceByName.get(fallbackName.toLowerCase());
    const label = matchedSource?.name || fallbackName;
    const key = matchedSource?.id ? `income:${matchedSource.id}` : `income:${flowKeyPart(label, 'income')}`;
    const group = incomeGroups.get(key) || {
      key,
      label,
      color: matchedSource?.color || null,
      amount: 0,
      count: 0,
      transactions: [],
    };

    group.amount += Math.abs(amount);
    group.count += 1;
    group.transactions.push(makeFlowTransactionRecord(transaction, label));
    incomeGroups.set(key, group);
  }

  const incomeSourcesSummary = [...incomeGroups.values()]
    .map((group, index) => ({
      ...group,
      color: group.color || FLOW_INCOME_COLORS[index % FLOW_INCOME_COLORS.length],
      transactions: [...group.transactions].sort(sortFlowTransactions),
      share: 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalIncome = incomeSourcesSummary.reduce((sum, item) => sum + item.amount, 0);

  const expenseGroups = new Map();
  for (const transaction of periodTransactions) {
    const amount = Number(transaction.amount) || 0;
    const isExpense = transaction.type === 'expense' || (transaction.type !== 'income' && amount < 0);
    if (!isExpense) continue;

    const category = categoryMap.get(transaction.categoryId);
    const label = normalizeFlowLabel(category?.name, 'Other');
    const key = `expense:${transaction.categoryId || 'other'}`;
    const group = expenseGroups.get(key) || {
      key,
      categoryId: transaction.categoryId || 'other',
      label,
      color: resolveCategoryColor(category?.colorVar || DEFAULT_CATEGORY_COLOR),
      icon: category?.icon || 'sparkle',
      amount: 0,
      count: 0,
      transactions: [],
      share: 0,
    };

    group.amount += Math.abs(amount);
    group.count += 1;
    group.transactions.push(makeFlowTransactionRecord(transaction, label));
    expenseGroups.set(key, group);
  }

  const expenseCategories = [...expenseGroups.values()]
    .map((group) => ({
      ...group,
      transactions: [...group.transactions].sort(sortFlowTransactions),
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalExpenses = expenseCategories.reduce((sum, item) => sum + item.amount, 0);
  const limitedExpenses = limitFlowItems(
    withShare(expenseCategories, totalExpenses),
    maxCategories,
    'expense:other',
    'Other',
    FLOW_OTHER_COLOR
  );
  const visibleExpenses = withShare(limitedExpenses.visible, totalExpenses);

  const goalContributionMap = new Map();
  const addGoalContribution = (goalId, amount, event) => {
    const goal = goalMap.get(goalId);
    if (!goal || !(amount > 0)) return;

    const key = `goal:${goal.id}`;
    const existing = goalContributionMap.get(key) || {
      key,
      goalId: goal.id,
      label: goal.name,
      color: goal.color || FLOW_SAVINGS_COLOR,
      target: goal.target,
      current: goal.current,
      deadline: goal.deadline || null,
      amount: 0,
      count: 0,
      entries: [],
      share: 0,
    };

    existing.amount += amount;
    existing.count += 1;
    existing.entries.push(event);
    goalContributionMap.set(key, existing);
  };

  for (const entry of periodIncomeEntries) {
    const source = incomeSourceById.get(entry.sourceId);
    const sourceLabel = normalizeFlowLabel(source?.name, 'Saved income');
    const allocations = distributeEntryAcrossGoals(entry, goalMap);

    allocations.forEach(({ goalId, amount }) => {
      addGoalContribution(goalId, amount, {
        id: `income-save:${entry.id}:${goalId}`,
        label: sourceLabel,
        amount,
        date: entry.date,
        note: entry.note || '',
        kind: 'income-save',
      });
    });
  }

  for (const transfer of periodSavingsTransfers) {
    addGoalContribution(transfer.goalId, transfer.amount, {
      id: transfer.id,
      label: transfer.kind === 'income-save' ? 'Saved from income' : 'Manual transfer',
      amount: transfer.amount,
      date: transfer.date,
      note: transfer.note || '',
      kind: transfer.kind || 'manual',
    });
  }

  const savingsGoals = [...goalContributionMap.values()]
    .map((goal) => ({
      ...goal,
      entries: [...goal.entries].sort((a, b) => {
        if (a.date === b.date) return b.amount - a.amount;
        return a.date < b.date ? 1 : -1;
      }),
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalSavings = savingsGoals.reduce((sum, item) => sum + item.amount, 0);
  const limitedGoals = limitFlowItems(
    withShare(savingsGoals, totalSavings),
    maxGoals,
    'goal:other',
    'Other goals',
    FLOW_SAVINGS_COLOR
  );
  const visibleGoals = withShare(limitedGoals.visible, totalSavings);

  const totalOutflow = totalExpenses + totalSavings;
  const balanceUsed = Math.max(0, totalOutflow - totalIncome);
  const totalInflow = totalIncome + balanceUsed;
  const totalFlow = Math.max(totalInflow, totalOutflow);
  const retainedInChecking = Math.max(0, totalInflow - totalOutflow);

  const detailsByKey = {};

  detailsByKey[FLOW_POOL_KEY] = {
    key: FLOW_POOL_KEY,
    type: 'overview',
    title: 'Money pool / Checking',
    subtitle: 'Income and existing balance move through your top categories and savings goals.',
    stats: [
      { label: 'Income', amount: totalIncome },
      { label: 'Spent', amount: totalExpenses },
      { label: 'Saved', amount: totalSavings },
      { label: 'Left in checking', amount: retainedInChecking },
    ],
    categories: visibleExpenses,
    goals: visibleGoals,
    sources: incomeSourcesSummary,
  };

  incomeSourcesSummary.forEach((source) => {
    detailsByKey[source.key] = {
      key: source.key,
      type: 'income',
      title: source.label,
      subtitle: `${source.count} ${source.count === 1 ? 'income entry' : 'income entries'} into the money pool this period.`,
      amount: source.amount,
      share: totalFlow > 0 ? source.amount / totalFlow : 0,
      color: source.color,
      transactions: source.transactions,
    };
  });

  visibleExpenses.forEach((category) => {
    if (category.children?.length) {
      detailsByKey[category.key] = {
        key: category.key,
        type: 'expense-group',
        title: category.label,
        subtitle: 'These smaller categories were grouped together to keep the chart readable.',
        amount: category.amount,
        share: category.share,
        color: category.color,
        items: category.children,
      };
      return;
    }

    const sharePercent = Math.max(0, Math.round((category.share || 0) * 100));
    detailsByKey[category.key] = {
      key: category.key,
      type: 'category',
      title: category.label,
      subtitle: `${category.count} ${category.count === 1 ? 'transaction' : 'transactions'} · ${sharePercent}% of spending.`,
      amount: category.amount,
      share: category.share,
      color: category.color,
      icon: category.icon,
      transactions: category.transactions,
    };
  });

  if (totalSavings > 0) {
    detailsByKey[FLOW_SAVINGS_KEY] = {
      key: FLOW_SAVINGS_KEY,
      type: 'savings',
      title: 'Savings',
      subtitle: `${visibleGoals.length} ${visibleGoals.length === 1 ? 'goal' : 'goals'} received money from the pool this period.`,
      amount: totalSavings,
      share: totalFlow > 0 ? totalSavings / totalFlow : 0,
      color: FLOW_SAVINGS_COLOR,
      goals: visibleGoals,
    };
  }

  visibleGoals.forEach((goal) => {
    if (goal.children?.length) {
      detailsByKey[goal.key] = {
        key: goal.key,
        type: 'goal-group',
        title: goal.label,
        subtitle: 'Additional goals grouped together to keep the chart simple.',
        amount: goal.amount,
        share: goal.share,
        color: goal.color,
        items: goal.children,
      };
      return;
    }

    detailsByKey[goal.key] = {
      key: goal.key,
      type: 'goal',
      title: goal.label,
      subtitle: `${goal.count} ${goal.count === 1 ? 'savings move' : 'savings moves'} contributed to this goal in the selected period.`,
      amount: goal.amount,
      share: goal.share,
      color: goal.color,
      target: goal.target,
      current: goal.current,
      progress: goal.target > 0 ? Math.min(1, goal.current / goal.target) : 0,
      entries: goal.entries,
      deadline: goal.deadline,
    };
  });

  return {
    hasFlow: totalFlow > 0,
    period,
    periodKey,
    summary: {
      totalIncome,
      totalExpenses,
      totalSavings,
      totalOutflow,
      totalInflow,
      totalFlow,
      balanceUsed,
      retainedInChecking,
    },
    detailsByKey,
    overviewKey: FLOW_POOL_KEY,
    incomeSources: incomeSourcesSummary,
    expenseCategories: visibleExpenses,
    savingsGoals: visibleGoals,
  };
}

export function getSankeyChartData(flowData, selectedNodeKey = null, { maxTransactions = 5 } = {}) {
  if (!flowData?.hasFlow) {
    return { nodes: [], links: [] };
  }

  const {
    summary,
    incomeSources = [],
    expenseCategories = [],
    savingsGoals = [],
    detailsByKey = {},
  } = flowData;
  const selectedDetail = selectedNodeKey ? detailsByKey[selectedNodeKey] : null;

  const totalFlow = summary.totalFlow || 0;
  const nodes = [];
  const links = [];

  const pushNode = (node) => nodes.push(node);
  const pushLink = (link) => links.push(link);

  incomeSources.forEach((source) => {
    pushNode(
      createFlowNode({
        key: source.key,
        label: source.label,
        kind: 'income',
        color: source.color,
        amount: source.amount,
        count: source.count,
        share: totalFlow > 0 ? source.amount / totalFlow : 0,
        depth: 0,
      })
    );

    pushLink(
      createFlowLink({
        source: source.key,
        target: FLOW_POOL_KEY,
        amount: source.amount,
        color: colorWithAlpha(source.color, 0.28),
        count: source.count,
        share: totalFlow > 0 ? source.amount / totalFlow : 0,
        sourceLabel: source.label,
        targetLabel: 'Money pool',
      })
    );
  });

  if (summary.balanceUsed > 0) {
    pushNode(
      createFlowNode({
        key: 'balance:existing',
        label: 'Existing balance',
        kind: 'balance',
        color: FLOW_BALANCE_COLOR,
        amount: summary.balanceUsed,
        share: totalFlow > 0 ? summary.balanceUsed / totalFlow : 0,
        depth: 0,
      })
    );

    pushLink(
      createFlowLink({
        source: 'balance:existing',
        target: FLOW_POOL_KEY,
        amount: summary.balanceUsed,
        color: colorWithAlpha(FLOW_BALANCE_COLOR, 0.24),
        share: totalFlow > 0 ? summary.balanceUsed / totalFlow : 0,
        sourceLabel: 'Existing balance',
        targetLabel: 'Money pool',
      })
    );
  }

  pushNode(
    createFlowNode({
      key: FLOW_POOL_KEY,
      label: 'Money pool',
      kind: 'pool',
      color: FLOW_SAVINGS_COLOR,
      amount: summary.totalInflow,
      count: incomeSources.length,
      share: totalFlow > 0 ? summary.totalInflow / totalFlow : 0,
      depth: 1,
    })
  );

  expenseCategories.forEach((category) => {
    const kind = category.children?.length ? 'expense-group' : 'expense';
    pushNode(
      createFlowNode({
        key: category.key,
        label: category.label,
        kind,
        color: category.color,
        amount: category.amount,
        count: category.count,
        share: category.share,
        depth: 2,
        meta: { icon: category.icon || 'sparkle' },
      })
    );

    pushLink(
      createFlowLink({
        source: FLOW_POOL_KEY,
        target: category.key,
        amount: category.amount,
        color: colorWithAlpha(category.color, 0.28),
        count: category.count,
        share: category.share,
        sourceLabel: 'Money pool',
        targetLabel: category.label,
      })
    );
  });

  if (summary.totalSavings > 0) {
    pushNode(
      createFlowNode({
        key: FLOW_SAVINGS_KEY,
        label: 'Savings',
        kind: 'savings',
        color: FLOW_SAVINGS_COLOR,
        amount: summary.totalSavings,
        count: savingsGoals.length,
        share: totalFlow > 0 ? summary.totalSavings / totalFlow : 0,
        depth: 2,
      })
    );

    pushLink(
      createFlowLink({
        source: FLOW_POOL_KEY,
        target: FLOW_SAVINGS_KEY,
        amount: summary.totalSavings,
        color: colorWithAlpha(FLOW_SAVINGS_COLOR, 0.26),
        count: savingsGoals.length,
        share: totalFlow > 0 ? summary.totalSavings / totalFlow : 0,
        sourceLabel: 'Money pool',
        targetLabel: 'Savings',
      })
    );
  }

  if (selectedDetail?.type === 'category') {
    const visibleTransactions = selectedDetail.transactions.slice(0, maxTransactions);
    const hiddenTransactions = selectedDetail.transactions.slice(maxTransactions);

    visibleTransactions.forEach((transaction) => {
      const txKey = `transaction:${transaction.id}`;
      pushNode(
        createFlowNode({
          key: txKey,
          label: `${transaction.name} ${formatCurrency(transaction.amount, { compact: true })}`,
          kind: 'transaction',
          color: selectedDetail.color,
          amount: transaction.amount,
          count: 1,
          share: totalFlow > 0 ? transaction.amount / totalFlow : 0,
          depth: 3,
          meta: {
            date: transaction.date,
            note: transaction.note || '',
            baseName: transaction.name,
          },
        })
      );

      pushLink(
        createFlowLink({
          source: selectedDetail.key,
          target: txKey,
          amount: transaction.amount,
          color: colorWithAlpha(selectedDetail.color, 0.22),
          count: 1,
          share: totalFlow > 0 ? transaction.amount / totalFlow : 0,
          sourceLabel: selectedDetail.title,
          targetLabel: transaction.name,
        })
      );
    });

    if (hiddenTransactions.length > 0) {
      const otherAmount = hiddenTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      const otherKey = `${selectedDetail.key}:other-transactions`;

      pushNode(
        createFlowNode({
          key: otherKey,
          label: `${hiddenTransactions.length} more`,
          kind: 'transaction-group',
          color: selectedDetail.color,
          amount: otherAmount,
          count: hiddenTransactions.length,
          share: totalFlow > 0 ? otherAmount / totalFlow : 0,
          depth: 3,
          meta: {
            note: 'Additional transactions grouped together',
          },
        })
      );

      pushLink(
        createFlowLink({
          source: selectedDetail.key,
          target: otherKey,
          amount: otherAmount,
          color: colorWithAlpha(selectedDetail.color, 0.14),
          count: hiddenTransactions.length,
          share: totalFlow > 0 ? otherAmount / totalFlow : 0,
          sourceLabel: selectedDetail.title,
          targetLabel: 'Other transactions',
        })
      );
    }
  }

  if (selectedDetail?.type === 'expense-group') {
    selectedDetail.items.forEach((item) => {
      const itemKey = `${selectedDetail.key}:${item.categoryId || item.key}`;

      pushNode(
        createFlowNode({
          key: itemKey,
          label: item.label,
          kind: 'expense-child',
          color: item.color,
          amount: item.amount,
          count: item.count,
          share: item.share,
          depth: 3,
        })
      );

      pushLink(
        createFlowLink({
          source: selectedDetail.key,
          target: itemKey,
          amount: item.amount,
          color: colorWithAlpha(item.color, 0.18),
          count: item.count,
          share: item.share,
          sourceLabel: selectedDetail.title,
          targetLabel: item.label,
        })
      );
    });
  }

  const shouldExpandSavings =
    selectedDetail?.type === 'savings'
    || selectedDetail?.type === 'goal'
    || selectedDetail?.type === 'goal-group';

  if (shouldExpandSavings) {
    savingsGoals.forEach((goal) => {
      pushNode(
        createFlowNode({
          key: goal.key,
          label: goal.label,
          kind: goal.children?.length ? 'goal-group' : 'goal',
          color: goal.color,
          amount: goal.amount,
          count: goal.count,
          share: goal.share,
          depth: 3,
        })
      );

      pushLink(
        createFlowLink({
          source: FLOW_SAVINGS_KEY,
          target: goal.key,
          amount: goal.amount,
          color: colorWithAlpha(goal.color, 0.22),
          count: goal.count,
          share: goal.share,
          sourceLabel: 'Savings',
          targetLabel: goal.label,
        })
      );
    });
  }

  if (selectedDetail?.type === 'goal-group') {
    selectedDetail.items.forEach((item) => {
      const itemKey = `${selectedDetail.key}:${item.goalId || item.key}`;
      pushNode(
        createFlowNode({
          key: itemKey,
          label: item.label,
          kind: 'goal-child',
          color: item.color,
          amount: item.amount,
          count: item.count,
          share: item.share,
          depth: 4,
        })
      );

      pushLink(
        createFlowLink({
          source: selectedDetail.key,
          target: itemKey,
          amount: item.amount,
          color: colorWithAlpha(item.color, 0.18),
          count: item.count,
          share: item.share,
          sourceLabel: selectedDetail.title,
          targetLabel: item.label,
        })
      );
    });
  }

  return { nodes, links };
}
