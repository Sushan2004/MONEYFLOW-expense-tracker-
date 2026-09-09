import { todayIso } from './format.js';

function csvCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportTransactionsCsv({
  transactions = [],
  categories = [],
  accounts = [],
  incomeEntries = [],
  incomeSources = [],
  filenamePrefix = 'expense-tracker-transactions',
}) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const incomeEntryByTransactionId = new Map(
    incomeEntries
      .filter((entry) => entry?.transactionId)
      .map((entry) => [entry.transactionId, entry])
  );
  const incomeSourceMap = new Map(incomeSources.map((source) => [source.id, source]));

  const header = ['Date', 'Type', 'Category', 'Name', 'Amount', 'Note', 'Source'];
  const rows = transactions
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .map((transaction) => {
      const category = categoryMap.get(transaction.categoryId);
      const linkedIncomeEntry = incomeEntryByTransactionId.get(transaction.id);
      const incomeSource = linkedIncomeEntry
        ? incomeSourceMap.get(linkedIncomeEntry.sourceId)
        : null;
      const account = accountMap.get(transaction.accountId);
      const type =
        transaction.type === 'income' || Number(transaction.amount) > 0
          ? 'Income'
          : 'Expense';
      const source = incomeSource?.name || account?.name || 'Manual entry';
      const name = transaction.merchant || incomeSource?.name || category?.name || '';

      return [
        transaction.date || '',
        type,
        category?.name || 'Other',
        name,
        Number(transaction.amount || 0).toFixed(2),
        transaction.note || '',
        source,
      ];
    });

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\n');

  downloadBlob(csv, `${filenamePrefix}-${todayIso()}.csv`, 'text/csv;charset=utf-8;');
}

export function exportAppBackupJson({
  state,
  settings = {},
  filenamePrefix = 'expense-tracker-backup',
}) {
  const backup = {
    exportedAt: new Date().toISOString(),
    transactions: state.transactions || [],
    categories: state.categories || [],
    budgets: state.budgets || [],
    incomeSources: state.incomeSources || [],
    incomeEntries: state.incomeEntries || [],
    savingsGoals: state.goals || [],
    savingsTransfers: state.savingsTransfers || [],
    settings: {
      themeMode: state.themeMode || 'system',
      displayCurrency: state.currency?.code || 'USD',
      baseCurrency: state.currency?.baseCode || 'USD',
      ...settings,
    },
  };

  const json = JSON.stringify(backup, null, 2);
  downloadBlob(json, `${filenamePrefix}-${todayIso()}.json`, 'application/json;charset=utf-8;');
}
