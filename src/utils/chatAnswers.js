import { currentBudgetPeriodKey, isoMonth } from './format.js';
import { getBudgetCategoryData, spendingByCategoryEntries } from './selectors.js';

export const QUICK_QUERIES = ["This month's spending", 'Upcoming bills', 'Am I over budget?'];
const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const expense = (t) => t.type !== 'income' && t.type !== 'transfer' && Number(t.amount) < 0;
const categoryLink = (id, month) => `/transactions?category=${encodeURIComponent(id)}&month=${month}`;

// Compute each occurrence from its original anchor to avoid Jan 31 -> Feb 28 -> Mar 28 drift.
export function nextOccurrence(isoDate, frequency, today) {
  const anchor = new Date(`${isoDate}T00:00:00`);
  if (!Number.isFinite(anchor.getTime())) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!['weekly', 'biweekly', 'monthly', 'yearly'].includes(frequency)) return null;
  for (let n = 0; n < 10000; n += 1) {
    let next;
    if (frequency === 'weekly' || frequency === 'biweekly') {
      next = new Date(anchor);
      next.setDate(anchor.getDate() + n * (frequency === 'weekly' ? 7 : 14));
    } else {
      const months = n * (frequency === 'yearly' ? 12 : 1);
      next = new Date(anchor.getFullYear(), anchor.getMonth() + months, 1);
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(anchor.getDate(), lastDay));
    }
    // A recorded entry on today's date is already in the ledger, so predict the next cycle.
    if (next >= start && (n > 0 || anchor > start)) return dayKey(next);
  }
  return null;
}

export function answerQuery(query, state, now = new Date()) {
  const q = query.toLowerCase().trim();
  const transactions = state.transactions || [];
  const categories = state.categories || [];
  const month = /last month/.test(q)
    ? isoMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)) : isoMonth(now);
  const period = new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const category = [...categories].sort((a, b) => b.name.length - a.name.length)
    .find((c) => q.includes(c.name.toLowerCase()));
  const base = { cards: [], generatedAt: now.toISOString() };

  if (/bill|recurr|subscription/.test(q)) {
    const latest = new Map();
    for (const t of transactions.filter((t) => expense(t) && t.recurring)) {
      const key = `${String(t.merchant).trim().toLowerCase()}:${t.categoryId}:${t.accountId || ''}:${t.frequency}`;
      if (!latest.has(key) || latest.get(key).date < t.date) latest.set(key, t);
    }
    const until = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
    const rows = [...latest.values()].map((t) => ({ t, date: nextOccurrence(t.date, t.frequency, now) }))
      .filter(({ date }) => date && date <= dayKey(until)).sort((a, b) => a.date.localeCompare(b.date));
    return { ...base, text: rows.length ? 'Estimated recurring expenses in the next 30 days. Dates are projections, not confirmed unpaid bills.' : 'No recurring expenses with a known schedule are due in the next 30 days. Add a recurring expense with a frequency to see estimates.',
      cards: rows.slice(0, 8).map(({ t, date }) => ({ kind: 'metric', label: t.merchant || 'Recurring expense', amount: Math.abs(t.amount), detail: `Estimated · ${date}`, href: `/transactions/${encodeURIComponent(t.id)}` })),
      footnote: rows.length > 8 ? `Showing the next 8 of ${rows.length} estimates.` : null };
  }
  if (/budget/.test(q)) {
    const types = /week/.test(q) ? ['weekly'] : /year/.test(q) ? ['yearly'] : /month/.test(q) ? ['monthly'] : ['weekly', 'monthly', 'yearly'];
    const rows = types.flatMap((type) => getBudgetCategoryData(state.budgets || [], transactions.filter(expense), categories, type,
      type === 'monthly' ? month : currentBudgetPeriodKey(type, now))).filter((row) => !category || row.categoryId === category.id);
    const over = rows.filter((row) => row.overBy > 0);
    return { ...base, text: !rows.length ? 'No budgets are set for this period. Add a category budget to start comparing spending.' : over.length ? `${over.length} category budget${over.length === 1 ? ' is' : 's are'} over the limit.` : 'Your tracked category budgets are within their limits.',
      cards: rows.sort((a, b) => b.ratio - a.ratio).slice(0, 8).map((r) => ({ kind: 'budget', label: r.name, amount: r.spent, limit: r.budget, detail: `${r.periodType} · ${r.periodKey}`, href: categoryLink(r.categoryId, r.periodType === 'monthly' ? r.periodKey : 'all') })),
      footnote: rows.length > 8 ? `Showing 8 of ${rows.length} budgets, highest usage first.` : 'Only categories with a budget are included.' };
  }
  if (/goal|saving/.test(q)) {
    const goals = state.goals || [];
    return { ...base, text: goals.length ? 'Here is your saved progress toward each goal.' : 'You have no savings goals yet.',
      cards: goals.slice(0, 8).map((g) => ({ kind: 'goal', label: g.name, amount: g.current, limit: g.target, detail: g.deadline ? `Target date · ${g.deadline}` : 'Saved toward target', href: '/goals' })) };
  }
  if (/spen|spent|expense|food|categor|transaction|income|earned/.test(q) || category) {
    const inMonth = transactions.filter((t) => t.date?.startsWith(month));
    if (/income|earned/.test(q)) {
      return { ...base, text: `Recorded income for ${period}.`, cards: [{ kind: 'metric', label: 'Income', amount: inMonth.filter((t) => t.type === 'income').reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0), href: '/transactions', detail: period }] };
    }
    const selected = inMonth.filter((t) => expense(t) && (!category || t.categoryId === category.id));
    const total = selected.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const segments = spendingByCategoryEntries(selected).map((s) => ({ ...s, name: categories.find((c) => c.id === s.categoryId)?.name || 'Other', colorVar: categories.find((c) => c.id === s.categoryId)?.colorVar, share: total ? s.amount / total : 0 }));
    const cards = [{ kind: 'spending', label: category ? category.name : 'Total spending', amount: total, detail: period, segments, month, href: category ? categoryLink(category.id, month) : `/transactions?month=${month}` }];
    if (category || /transaction|recent|largest/.test(q)) {
      cards.push(...[...selected].sort((a, b) => /largest/.test(q) ? Math.abs(b.amount) - Math.abs(a.amount) : b.date.localeCompare(a.date)).slice(0, 3).map((t) => ({ kind: 'metric', label: t.merchant, amount: Math.abs(t.amount), detail: t.date, href: `/transactions/${encodeURIComponent(t.id)}` })));
    }
    return { ...base, text: selected.length ? `${selected.length} expense${selected.length === 1 ? '' : 's'} recorded${category ? ` in ${category.name}` : ''} for ${period}.` : `No expenses recorded${category ? ` in ${category.name}` : ''} for ${period}.`, cards };
  }
  return { ...base, text: "I can summarize this or last month's spending, income, category budgets, recurring bills, and savings goals. Try “Food spending this month” or choose a suggestion below. I only use your saved records." };
}
