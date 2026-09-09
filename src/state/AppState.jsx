import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import {
  DEFAULT_CATEGORIES,
} from '../data/defaultCategories.js';
import {
  BASE_CURRENCY_CODE,
  FALLBACK_CURRENCY_CODES,
  fetchAvailableCurrencies,
  fetchConversionRate,
  getUniRateApiKey,
  hasUniRateApiKey,
  isFreshTimestamp,
  mergeCurrencyCodes,
  normalizeCurrencyCode,
} from '../utils/currencyApi.js';
import {
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
  normalizeCategoryColor,
  normalizeCategoryIcon,
  resolveCategoryColor,
} from '../utils/categoryAppearance.js';
import { useSession } from './SessionState.jsx';
import { checkingBalance, uniqueId } from '../utils/selectors.js';
import { setCurrencyDisplayConfig, todayIso } from '../utils/format.js';

export const APP_STATE_STORAGE_KEY = 'et:app-state';
export const APP_STATE_STORAGE_PREFIX = 'et:app-state:';
const THEME_MODES = new Set(['light', 'dark', 'system']);
const CURRENCY_RATE_TTL_MS = 1000 * 60 * 60 * 12;
const CURRENCY_OPTIONS_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const CURRENCY_UNAVAILABLE_MESSAGE = 'Currency conversion unavailable right now.';
const CURRENCY_API_CONFIGURED = Boolean(getUniRateApiKey());

const AppStateContext = createContext(null);
const defaultCategoryIds = new Set(DEFAULT_CATEGORIES.map((category) => category.id));

const INCOME_FREQUENCIES = new Set(['one-time', 'weekly', 'biweekly', 'monthly', 'yearly']);

function cloneDefaultCategories() {
  return DEFAULT_CATEGORIES.map((category) => ({ ...category }));
}

function cloneList(value) {
  return Array.isArray(value) ? structuredClone(value) : [];
}

function normalizeCategory(category, builtin = false) {
  if (!category?.id || !category?.name) return null;

  return {
    id: category.id,
    name: category.name,
    icon: normalizeCategoryIcon(category.icon || DEFAULT_CATEGORY_ICON),
    colorVar: resolveCategoryColor(category.colorVar || DEFAULT_CATEGORY_COLOR),
    builtin: category.builtin ?? builtin,
  };
}

function mergeCategories(value) {
  const merged = cloneDefaultCategories();

  if (!Array.isArray(value)) return merged;

  value.forEach((category) => {
    if (!category || defaultCategoryIds.has(category.id)) return;
    const normalized = normalizeCategory(category, false);
    if (!normalized) return;
    merged.push(normalized);
  });

  return merged;
}

function normalizeTransaction(transaction) {
  if (!transaction?.id || !transaction?.categoryId || !transaction?.date) return null;

  return {
    ...structuredClone(transaction),
    accountId: transaction.accountId || null,
    recurring: Boolean(transaction.recurring),
  };
}

function normalizeTransactions(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeTransaction).filter(Boolean);
}

function normalizeThemeMode(value) {
  return THEME_MODES.has(value) ? value : 'system';
}

function normalizeCurrencyRateEntry(entry, code) {
  if (code === BASE_CURRENCY_CODE) {
    return {
      rate: 1,
      updatedAt: entry?.updatedAt || null,
    };
  }

  const rate = Number(entry?.rate);
  if (!Number.isFinite(rate) || rate <= 0) return null;

  return {
    rate,
    updatedAt: entry?.updatedAt || null,
  };
}

function normalizeCurrencyRates(value) {
  const rates = {
    [BASE_CURRENCY_CODE]: {
      rate: 1,
      updatedAt: null,
    },
  };

  if (!value || typeof value !== 'object') return rates;

  Object.entries(value).forEach(([rawCode, entry]) => {
    const code = normalizeCurrencyCode(rawCode);
    const normalized = normalizeCurrencyRateEntry(entry, code);
    if (!normalized) return;
    rates[code] = normalized;
  });

  return rates;
}

function normalizeCurrencyState(value) {
  const rates = normalizeCurrencyRates(value?.rates);
  const availableCodes = mergeCurrencyCodes(FALLBACK_CURRENCY_CODES, value?.availableCodes || []);
  const requestedCode = normalizeCurrencyCode(value?.code || BASE_CURRENCY_CODE);
  const code = requestedCode === BASE_CURRENCY_CODE || rates[requestedCode]
    ? requestedCode
    : BASE_CURRENCY_CODE;

  return {
    baseCode: BASE_CURRENCY_CODE,
    code,
    rates,
    availableCodes,
    optionsUpdatedAt: value?.optionsUpdatedAt || null,
    isLoading: false,
    error: value?.error ? String(value.error) : null,
  };
}

function getCurrencyRateForState(currencyState) {
  if (!currencyState || currencyState.code === BASE_CURRENCY_CODE) return 1;
  const rate = Number(currencyState.rates?.[currencyState.code]?.rate);
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
}

function getPersistableCurrencyState(currencyState) {
  const normalized = normalizeCurrencyState(currencyState);
  return {
    baseCode: normalized.baseCode,
    code: normalized.code,
    rates: normalized.rates,
    availableCodes: normalized.availableCodes,
    optionsUpdatedAt: normalized.optionsUpdatedAt,
  };
}

function clampPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, num));
}

function normalizeSplitConfig(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry && entry.goalId)
    .map((entry) => ({
      goalId: String(entry.goalId),
      percent: clampPercent(entry.percent),
    }))
    .filter((entry) => entry.percent > 0);
}

function normalizeIncomeSource(source) {
  if (!source?.id || !source?.name) return null;
  return {
    id: source.id,
    name: String(source.name).trim(),
    color: normalizeCategoryColor(source.color || source.colorVar || DEFAULT_CATEGORY_COLOR),
    createdAt: source.createdAt || todayIso(),
  };
}

function normalizeIncomeSources(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeIncomeSource).filter(Boolean);
}

function normalizeIncomeEntry(entry) {
  if (!entry?.id) return null;
  const amount = Number(entry.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const frequency = INCOME_FREQUENCIES.has(entry.frequency) ? entry.frequency : 'one-time';

  return {
    id: entry.id,
    sourceId: entry.sourceId || null,
    amount,
    frequency,
    note: entry.note ? String(entry.note) : '',
    savePercent: clampPercent(entry.savePercent),
    splitConfig: normalizeSplitConfig(entry.splitConfig),
    date: entry.date || todayIso(),
    transactionId: entry.transactionId || null,
    createdAt: entry.createdAt || todayIso(),
  };
}

function normalizeIncomeEntries(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeIncomeEntry).filter(Boolean);
}

function normalizeBudgetAlertThreshold(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.8;
  const ratio = numeric > 1 ? numeric / 100 : numeric;
  return Math.max(0, Math.min(1, ratio || 0.8));
}

function normalizeBudget(budget) {
  if (!budget?.categoryId) return null;

  const amount = Number(budget.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const periodType = ['weekly', 'monthly', 'yearly'].includes(budget.periodType)
    ? budget.periodType
    : 'monthly';
  const rawPeriodKey = budget.periodKey || budget.month || budget.year || budget.week;
  const periodKey = String(rawPeriodKey || '').slice(0, periodType === 'weekly' ? 10 : periodType === 'monthly' ? 7 : 4);

  if (
    (periodType === 'weekly' && !/^\d{4}-\d{2}-\d{2}$/.test(periodKey))
    || (periodType === 'monthly' && !/^\d{4}-\d{2}$/.test(periodKey))
    || (periodType === 'yearly' && !/^\d{4}$/.test(periodKey))
  ) {
    return null;
  }

  return {
    categoryId: String(budget.categoryId),
    periodType,
    periodKey,
    amount,
    alertThreshold: normalizeBudgetAlertThreshold(budget.alertThreshold),
  };
}

function normalizeBudgets(value) {
  if (!Array.isArray(value)) return [];

  const deduped = new Map();
  value.forEach((budget) => {
    const normalized = normalizeBudget(budget);
    if (!normalized) return;
    deduped.set(
      `${normalized.categoryId}:${normalized.periodType}:${normalized.periodKey}`,
      normalized
    );
  });

  return [...deduped.values()];
}

// Migrates older "incomeSources had amount" records into the split shape
// (sources = labels only, entries = actual income events). Idempotent.
function migrateIncomeData(payload) {
  const rawSources = Array.isArray(payload?.incomeSources) ? payload.incomeSources : [];
  const rawEntries = Array.isArray(payload?.incomeEntries) ? payload.incomeEntries : null;

  // Already split (entries field present): trust the new shape.
  if (rawEntries) {
    return {
      sources: normalizeIncomeSources(rawSources),
      entries: normalizeIncomeEntries(rawEntries),
    };
  }

  // Legacy: each item in incomeSources had amount/frequency/etc. Fan out.
  const legacy = rawSources.filter((item) => Number(item?.amount) > 0);
  if (legacy.length === 0) {
    return {
      sources: normalizeIncomeSources(rawSources),
      entries: [],
    };
  }

  const sourceByName = new Map();
  const entries = [];

  for (const item of legacy) {
    const name = String(item.name || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();

    let source = sourceByName.get(key);
    if (!source) {
      source = {
        id: `isrc-${key.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'src'}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        color: normalizeCategoryColor(item.color || item.colorVar || DEFAULT_CATEGORY_COLOR),
        createdAt: item.createdAt || todayIso(),
      };
      sourceByName.set(key, source);
    }

    entries.push(normalizeIncomeEntry({
      id: item.id,
      sourceId: source.id,
      amount: item.amount,
      frequency: item.frequency,
      note: item.note,
      savePercent: item.savePercent,
      splitConfig: item.splitConfig,
      date: item.date || item.createdAt,
      transactionId: item.transactionId,
      createdAt: item.createdAt,
    }));
  }

  return {
    sources: Array.from(sourceByName.values()),
    entries: entries.filter(Boolean),
  };
}

function normalizeGoal(goal) {
  if (!goal?.id || !goal?.name) return null;
  const target = Number(goal.target);
  if (!Number.isFinite(target) || target <= 0) return null;

  const current = Math.max(0, Number(goal.current) || 0);
  const deadline = goal.deadline || goal.dueDate || null;

  return {
    id: goal.id,
    name: String(goal.name).trim(),
    target,
    current,
    deadline,
    color: normalizeCategoryColor(goal.color || goal.colorVar || DEFAULT_CATEGORY_COLOR),
    createdAt: goal.createdAt || todayIso(),
  };
}

function normalizeGoals(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeGoal).filter(Boolean);
}

function normalizeSavingsTransfer(transfer) {
  if (!transfer?.id || !transfer?.goalId) return null;

  const amount = Number(transfer.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    id: transfer.id,
    goalId: String(transfer.goalId),
    amount,
    name: transfer.name ? String(transfer.name).trim() : '',
    date: transfer.date || todayIso(),
    note: transfer.note ? String(transfer.note) : '',
    kind: transfer.kind === 'income-save' ? 'income-save' : 'manual',
    recurring: Boolean(transfer.recurring),
    frequency: INCOME_FREQUENCIES.has(transfer.frequency) ? transfer.frequency : 'one-time',
    createdAt: transfer.createdAt || transfer.date || todayIso(),
  };
}

function normalizeSavingsTransfers(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeSavingsTransfer).filter(Boolean);
}

function normalizeState(payload) {
  const source = payload || {};
  const income = migrateIncomeData(source);

  return {
    user: source.user ? structuredClone(source.user) : null,
    themeMode: normalizeThemeMode(source.themeMode),
    currency: normalizeCurrencyState(source.currency),
    accounts: cloneList(source.accounts),
    categories: mergeCategories(source.categories),
    transactions: normalizeTransactions(source.transactions),
    budgets: normalizeBudgets(source.budgets),
    goals: normalizeGoals(source.goals),
    incomeSources: income.sources,
    incomeEntries: income.entries,
    savingsTransfers: normalizeSavingsTransfers(source.savingsTransfers),
  };
}

function getUserAppStateStorageKey(userId) {
  return `${APP_STATE_STORAGE_PREFIX}${userId}`;
}

function readStoredAppState(userId) {
  if (typeof window === 'undefined') return null;

  try {
    if (!userId) return null;

    const userKey = getUserAppStateStorageKey(userId);
    const userRaw = window.localStorage.getItem(userKey);
    if (userRaw) return JSON.parse(userRaw);

    const legacyRaw = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (!legacyRaw) return null;

    const legacyState = JSON.parse(legacyRaw);
    window.localStorage.setItem(userKey, JSON.stringify(legacyState));
    window.localStorage.removeItem(APP_STATE_STORAGE_KEY);
    return legacyState;
  } catch {
    return null;
  }
}

function getPersistableState(state) {
  return {
    user: state.user ? structuredClone(state.user) : null,
    themeMode: normalizeThemeMode(state.themeMode),
    currency: getPersistableCurrencyState(state.currency),
    accounts: cloneList(state.accounts),
    categories: cloneList(state.categories),
    transactions: cloneList(state.transactions),
    budgets: cloneList(state.budgets),
    goals: cloneList(state.goals),
    incomeSources: cloneList(state.incomeSources),
    incomeEntries: cloneList(state.incomeEntries),
    savingsTransfers: cloneList(state.savingsTransfers),
  };
}

export function clearStoredAppState(userId) {
  if (typeof window === 'undefined') return;

  try {
    if (userId) {
      window.localStorage.removeItem(getUserAppStateStorageKey(userId));
      return;
    }

    window.localStorage.removeItem(APP_STATE_STORAGE_KEY);
  } catch {
    /* ignore storage failures */
  }
}

function loadStateForUser(currentUser) {
  if (!currentUser) {
    return normalizeState({ user: null });
  }

  const stored = readStoredAppState(currentUser.id);
  const next = normalizeState(stored);

  return {
    ...next,
    user: currentUser,
  };
}

function createBootstrapState(currentUser) {
  const next = loadStateForUser(currentUser);

  return {
    status: 'ready',
    error: null,
    ...next,
    toast: null,
  };
}

function distributeSavedAmount(goals, savedAmount, splitConfig) {
  if (savedAmount <= 0 || !goals.length) return goals;

  const allocations = new Map();

  if (Array.isArray(splitConfig) && splitConfig.length > 0) {
    splitConfig.forEach(({ goalId, percent }) => {
      if (!percent) return;
      const portion = (savedAmount * percent) / 100;
      allocations.set(goalId, (allocations.get(goalId) || 0) + portion);
    });
  } else {
    const share = savedAmount / goals.length;
    goals.forEach((goal) => allocations.set(goal.id, share));
  }

  return goals.map((goal) => {
    const add = allocations.get(goal.id);
    if (!add) return goal;
    return { ...goal, current: Math.max(0, goal.current + add) };
  });
}

function reverseSavedAmount(goals, savedAmount, splitConfig) {
  if (savedAmount <= 0 || !goals.length) return goals;

  const reversals = new Map();

  if (Array.isArray(splitConfig) && splitConfig.length > 0) {
    splitConfig.forEach(({ goalId, percent }) => {
      if (!percent) return;
      const portion = (savedAmount * percent) / 100;
      reversals.set(goalId, (reversals.get(goalId) || 0) + portion);
    });
  } else {
    const share = savedAmount / goals.length;
    goals.forEach((goal) => reversals.set(goal.id, share));
  }

  return goals.map((goal) => {
    const subtract = reversals.get(goal.id);
    if (!subtract) return goal;
    return { ...goal, current: Math.max(0, goal.current - subtract) };
  });
}

function normalizeRecurringFrequency(value, fallback = 'monthly') {
  if (INCOME_FREQUENCIES.has(value) && value !== 'one-time') return value;
  return fallback;
}

function buildExpenseTransaction({
  id,
  title,
  amount,
  categoryId,
  accountId,
  date,
  note,
  recurring,
  frequency,
}) {
  return {
    id,
    merchant: String(title || '').trim(),
    categoryId,
    accountId: accountId || null,
    amount: -Math.abs(Number(amount) || 0),
    date,
    note: note ? String(note).trim() : '',
    recurring: Boolean(recurring),
    frequency: recurring ? normalizeRecurringFrequency(frequency) : 'one-time',
    type: 'expense',
  };
}

function buildIncomeTransaction({
  id,
  title,
  amount,
  date,
  note,
  frequency,
}) {
  return {
    id,
    merchant: String(title || '').trim() || 'Income',
    categoryId: 'cat-income',
    accountId: null,
    amount: Math.abs(Number(amount) || 0),
    date,
    note: note ? String(note).trim() : '',
    recurring: frequency !== 'one-time',
    frequency,
    type: 'income',
  };
}

function buildSavingsTransferRecord({
  id,
  goalId,
  title,
  amount,
  date,
  note,
  recurring,
  frequency,
  createdAt,
}) {
  return normalizeSavingsTransfer({
    id,
    goalId,
    amount: Math.abs(Number(amount) || 0),
    name: title,
    date,
    note,
    kind: 'manual',
    recurring,
    frequency: recurring ? normalizeRecurringFrequency(frequency) : 'one-time',
    createdAt,
  });
}

function applyManualTransferToGoals(goals, goalId, amountDelta) {
  if (!(Number(amountDelta) > 0) || !goalId) return goals;

  return goals.map((goal) =>
    goal.id === goalId
      ? { ...goal, current: Math.max(0, goal.current + amountDelta) }
      : goal
  );
}

function reducer(state, action) {
  switch (action.type) {
    case 'load/success': {
      const next = normalizeState(action.payload);
      return {
        ...state,
        status: 'ready',
        error: null,
        ...next,
      };
    }
    case 'load/error':
      return { ...state, status: 'ready', error: action.payload };
    case 'theme/set':
      return { ...state, themeMode: normalizeThemeMode(action.payload) };
    case 'currency/request':
      return {
        ...state,
        currency: {
          ...state.currency,
          isLoading: true,
          error: null,
        },
      };
    case 'currency/optionsLoaded': {
      const availableCodes = mergeCurrencyCodes(
        state.currency.availableCodes,
        action.payload?.availableCodes || []
      );

      return {
        ...state,
        currency: {
          ...state.currency,
          availableCodes,
          optionsUpdatedAt: action.payload?.optionsUpdatedAt || state.currency.optionsUpdatedAt,
          isLoading: false,
          error: null,
        },
      };
    }
    case 'currency/set': {
      const code = normalizeCurrencyCode(action.payload?.code || BASE_CURRENCY_CODE);
      const nextRates = normalizeCurrencyRates({
        ...state.currency.rates,
        [code]: {
          rate: code === BASE_CURRENCY_CODE ? 1 : action.payload?.rate,
          updatedAt: action.payload?.updatedAt || state.currency.rates?.[code]?.updatedAt || null,
        },
      });

      return {
        ...state,
        currency: {
          ...state.currency,
          code,
          rates: nextRates,
          availableCodes: mergeCurrencyCodes(
            state.currency.availableCodes,
            [code],
            action.payload?.availableCodes || []
          ),
          optionsUpdatedAt: action.payload?.optionsUpdatedAt || state.currency.optionsUpdatedAt,
          isLoading: false,
          error: null,
        },
      };
    }
    case 'currency/error':
      return {
        ...state,
        currency: {
          ...state.currency,
          availableCodes: mergeCurrencyCodes(
            state.currency.availableCodes,
            action.payload?.availableCodes || []
          ),
          optionsUpdatedAt: action.payload?.optionsUpdatedAt || state.currency.optionsUpdatedAt,
          isLoading: false,
          error: action.payload?.message || CURRENCY_UNAVAILABLE_MESSAGE,
        },
      };
    case 'currency/fallback':
      return {
        ...state,
        currency: {
          ...state.currency,
          code: BASE_CURRENCY_CODE,
          rates: normalizeCurrencyRates(state.currency.rates),
          availableCodes: mergeCurrencyCodes(
            state.currency.availableCodes,
            action.payload?.availableCodes || []
          ),
          optionsUpdatedAt: action.payload?.optionsUpdatedAt || state.currency.optionsUpdatedAt,
          isLoading: false,
          error: action.payload?.message || CURRENCY_UNAVAILABLE_MESSAGE,
        },
      };
    case 'tx/add':
      return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'tx/update':
      return {
        ...state,
        transactions: state.transactions.map((transaction) =>
          transaction.id === action.payload.id
            ? { ...transaction, ...action.payload }
            : transaction
        ),
      };
    case 'tx/delete':
      return {
        ...state,
        transactions: state.transactions.filter((transaction) => transaction.id !== action.payload),
      };
    case 'category/add':
      return {
        ...state,
        categories: [...state.categories, normalizeCategory(action.payload, false)].filter(Boolean),
      };
    case 'category/delete': {
      const categoryId = action.payload;
      if (!categoryId || defaultCategoryIds.has(categoryId)) return state;
      if (state.transactions.some((transaction) => transaction.categoryId === categoryId)) return state;
      if (state.budgets.some((budget) => budget.categoryId === categoryId)) return state;

      return {
        ...state,
        categories: state.categories.filter((category) => category.id !== categoryId),
      };
    }
    case 'budget/update': {
      const normalized = normalizeBudget(action.payload);
      if (!normalized) return state;

      const { categoryId, periodType, periodKey } = normalized;
      const index = state.budgets.findIndex(
        (budget) =>
          budget.categoryId === categoryId
          && budget.periodType === periodType
          && budget.periodKey === periodKey
      );
      const nextBudgets = [...state.budgets];

      if (index >= 0) nextBudgets[index] = normalized;
      else nextBudgets.push(normalized);

      return { ...state, budgets: nextBudgets };
    }
    case 'budget/delete': {
      const { categoryId, periodType, periodKey } = action.payload || {};
      if (!categoryId || !periodType || !periodKey) return state;

      return {
        ...state,
        budgets: state.budgets.filter(
          (budget) =>
            !(
              budget.categoryId === categoryId
              && budget.periodType === periodType
              && budget.periodKey === periodKey
            )
        ),
      };
    }
    case 'incomeSource/add': {
      const normalized = normalizeIncomeSource(action.payload);
      if (!normalized) return state;
      if (state.incomeSources.some((s) => s.name.toLowerCase() === normalized.name.toLowerCase())) {
        return state;
      }
      return { ...state, incomeSources: [...state.incomeSources, normalized] };
    }
    case 'incomeSource/update': {
      const current = state.incomeSources.find((source) => source.id === action.payload.id);
      if (!current) return state;

      const normalized = normalizeIncomeSource({ ...current, ...action.payload });
      if (!normalized) return state;

      if (
        state.incomeSources.some(
          (source) =>
            source.id !== normalized.id
            && source.name.toLowerCase() === normalized.name.toLowerCase()
        )
      ) {
        return state;
      }

      return {
        ...state,
        incomeSources: state.incomeSources.map((source) =>
          source.id === normalized.id ? normalized : source
        ),
        transactions: state.transactions.map((transaction) => {
          const relatedEntry = state.incomeEntries.find(
            (entry) => entry.transactionId === transaction.id && entry.sourceId === normalized.id
          );

          if (!relatedEntry) return transaction;
          return { ...transaction, merchant: normalized.name };
        }),
      };
    }
    case 'incomeSource/delete': {
      // Refuse if any entry still references this source.
      if (state.incomeEntries.some((entry) => entry.sourceId === action.payload)) return state;
      return {
        ...state,
        incomeSources: state.incomeSources.filter((source) => source.id !== action.payload),
      };
    }
    case 'incomeEntry/add': {
      const normalized = normalizeIncomeEntry(action.payload);
      if (!normalized) return state;

      const savedAmount = (normalized.amount * normalized.savePercent) / 100;
      const validSplit = normalized.splitConfig.filter((entry) =>
        state.goals.some((goal) => goal.id === entry.goalId)
      );

      const transactionId = normalized.transactionId || uniqueId('t');
      const transaction = {
        id: transactionId,
        merchant: state.incomeSources.find((source) => source.id === normalized.sourceId)?.name || 'Income',
        categoryId: 'cat-income',
        accountId: null,
        amount: normalized.amount,
        date: normalized.date,
        note: normalized.note || `Income · ${normalized.frequency}`,
        recurring: normalized.frequency !== 'one-time',
        type: 'income',
      };

      const entryWithRefs = { ...normalized, transactionId, splitConfig: validSplit };

      const nextGoals = savedAmount > 0
        ? distributeSavedAmount(state.goals, savedAmount, validSplit)
        : state.goals;

      return {
        ...state,
        incomeEntries: [entryWithRefs, ...state.incomeEntries],
        transactions: [
          transaction,
          ...state.transactions.filter((existingTransaction) => existingTransaction.id !== transactionId),
        ],
        goals: nextGoals,
      };
    }
    case 'incomeEntry/delete': {
      const entry = state.incomeEntries.find((item) => item.id === action.payload);
      if (!entry) return state;

      const savedAmount = (entry.amount * entry.savePercent) / 100;
      const nextGoals = savedAmount > 0
        ? reverseSavedAmount(state.goals, savedAmount, entry.splitConfig)
        : state.goals;

      return {
        ...state,
        incomeEntries: state.incomeEntries.filter((item) => item.id !== entry.id),
        transactions: entry.transactionId
          ? state.transactions.filter((tx) => tx.id !== entry.transactionId)
          : state.transactions,
        goals: nextGoals,
      };
    }
    case 'savingsTransfer/delete': {
      const transfer = state.savingsTransfers.find((item) => item.id === action.payload);
      if (!transfer) return state;

      return {
        ...state,
        goals: state.goals.map((goal) =>
          goal.id === transfer.goalId
            ? { ...goal, current: Math.max(0, goal.current - transfer.amount) }
            : goal
        ),
        savingsTransfers: state.savingsTransfers.filter((item) => item.id !== transfer.id),
      };
    }
    case 'entry/save': {
      const payload = action.payload || {};
      const id = String(payload.id || '').trim();
      const title = String(payload.title || '').trim();
      const date = payload.date || todayIso();
      const nextType = payload.type;
      const amount = Math.abs(Number(payload.amount));
      const note = payload.note ? String(payload.note) : '';
      const recurring = Boolean(payload.recurring);
      const frequency = recurring ? normalizeRecurringFrequency(payload.frequency) : 'one-time';
      const categoryId = payload.categoryId ? String(payload.categoryId) : '';
      const accountId = payload.accountId ? String(payload.accountId) : null;
      const sourceId = payload.sourceId ? String(payload.sourceId) : null;
      const goalId = payload.goalId ? String(payload.goalId) : null;

      if (!id || !title || !date || !Number.isFinite(amount) || amount <= 0) return state;
      if (!['expense', 'income', 'transfer'].includes(nextType)) return state;
      if (nextType === 'expense' && !categoryId) return state;
      if (nextType === 'income' && !sourceId) return state;
      if (nextType === 'transfer' && !goalId) return state;
      if (nextType === 'income' && !state.incomeSources.some((source) => source.id === sourceId)) return state;
      if (nextType === 'transfer' && !state.goals.some((goal) => goal.id === goalId)) return state;

      const existingTransaction = state.transactions.find((transaction) => transaction.id === id) || null;
      const existingTransfer = state.savingsTransfers.find((transfer) => transfer.id === id) || null;
      const existingIncomeEntry = existingTransaction
        ? state.incomeEntries.find((entry) => entry.transactionId === existingTransaction.id) || null
        : null;

      if (!existingTransaction && !existingTransfer) return state;

      let nextTransactions = [...state.transactions];
      let nextIncomeEntries = [...state.incomeEntries];
      let nextGoals = [...state.goals];
      let nextSavingsTransfers = [...state.savingsTransfers];

      if (existingIncomeEntry) {
        const oldSavedAmount = (existingIncomeEntry.amount * existingIncomeEntry.savePercent) / 100;
        nextGoals = oldSavedAmount > 0
          ? reverseSavedAmount(nextGoals, oldSavedAmount, existingIncomeEntry.splitConfig)
          : nextGoals;
        nextIncomeEntries = nextIncomeEntries.filter((entry) => entry.id !== existingIncomeEntry.id);
      }

      if (existingTransaction) {
        nextTransactions = nextTransactions.filter((transaction) => transaction.id !== existingTransaction.id);
      }

      if (existingTransfer) {
        nextGoals = nextGoals.map((goal) =>
          goal.id === existingTransfer.goalId
            ? { ...goal, current: Math.max(0, goal.current - existingTransfer.amount) }
            : goal
        );
        nextSavingsTransfers = nextSavingsTransfers.filter((transfer) => transfer.id !== existingTransfer.id);
      }

      if (nextType === 'expense') {
        nextTransactions = [
          buildExpenseTransaction({
            id,
            title,
            amount,
            categoryId,
            accountId,
            date,
            note,
            recurring,
            frequency,
          }),
          ...nextTransactions,
        ];

        return {
          ...state,
          transactions: nextTransactions,
          incomeEntries: nextIncomeEntries,
          goals: nextGoals,
          savingsTransfers: nextSavingsTransfers,
        };
      }

      if (nextType === 'income') {
        const splitConfig = (existingIncomeEntry?.splitConfig || []).filter((entry) =>
          nextGoals.some((goal) => goal.id === entry.goalId)
        );
        const savePercent = clampPercent(existingIncomeEntry?.savePercent ?? 0);
        const incomeEntry = normalizeIncomeEntry({
          id: existingIncomeEntry?.id || uniqueId('inc'),
          sourceId,
          amount,
          frequency,
          note,
          savePercent,
          splitConfig,
          date,
          transactionId: id,
          createdAt: existingIncomeEntry?.createdAt || todayIso(),
        });

        if (!incomeEntry) return state;

        nextIncomeEntries = [incomeEntry, ...nextIncomeEntries];
        nextTransactions = [
          buildIncomeTransaction({
            id,
            title,
            amount,
            date,
            note,
            frequency: incomeEntry.frequency,
          }),
          ...nextTransactions,
        ];

        const savedAmount = (incomeEntry.amount * incomeEntry.savePercent) / 100;
        nextGoals = savedAmount > 0
          ? distributeSavedAmount(nextGoals, savedAmount, splitConfig)
          : nextGoals;

        return {
          ...state,
          transactions: nextTransactions,
          incomeEntries: nextIncomeEntries,
          goals: nextGoals,
          savingsTransfers: nextSavingsTransfers,
        };
      }

      const transfer = buildSavingsTransferRecord({
        id,
        goalId,
        title,
        amount,
        date,
        note,
        recurring,
        frequency,
        createdAt: existingTransfer?.createdAt || todayIso(),
      });
      if (!transfer) return state;

      nextGoals = applyManualTransferToGoals(nextGoals, transfer.goalId, transfer.amount);
      nextSavingsTransfers = [transfer, ...nextSavingsTransfers];

      return {
        ...state,
        transactions: nextTransactions,
        incomeEntries: nextIncomeEntries,
        goals: nextGoals,
        savingsTransfers: nextSavingsTransfers,
      };
    }
    case 'goal/add': {
      const normalized = normalizeGoal(action.payload);
      if (!normalized) return state;
      if (state.goals.some((goal) => goal.name.toLowerCase() === normalized.name.toLowerCase())) {
        return state;
      }
      return { ...state, goals: [...state.goals, normalized] };
    }
    case 'goal/update': {
      const { id, ...patch } = action.payload;
      return {
        ...state,
        goals: state.goals.map((goal) => {
          if (goal.id !== id) return goal;
          return normalizeGoal({ ...goal, ...patch }) || goal;
        }),
      };
    }
    case 'goal/delete':
      return {
        ...state,
        goals: state.goals.filter((goal) => goal.id !== action.payload),
        savingsTransfers: state.savingsTransfers.filter((transfer) => transfer.goalId !== action.payload),
      };
    case 'goal/transfer': {
      const { goalId, amount } = action.payload;
      const numericAmount = Number(amount);
      const goalExists = state.goals.some((goal) => goal.id === goalId);
      const available = Math.max(0, checkingBalance({ transactions: state.transactions, goals: state.goals }));

      if (!goalExists || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > available) {
        return state;
      }

      return {
        ...state,
        goals: applyManualTransferToGoals(state.goals, goalId, numericAmount),
        savingsTransfers: [
          buildSavingsTransferRecord({
            id: action.payload.id || uniqueId('svtx'),
            goalId,
            title: action.payload.name || action.payload.title || 'Savings transfer',
            amount: numericAmount,
            date: action.payload.date || todayIso(),
            note: action.payload.note ? String(action.payload.note) : '',
            recurring: Boolean(action.payload.recurring),
            frequency: action.payload.frequency,
            createdAt: action.payload.createdAt || todayIso(),
          }),
          ...state.savingsTransfers,
        ],
      };
    }
    case 'toast/show':
      return { ...state, toast: action.payload };
    case 'toast/clear':
      return { ...state, toast: null };
    default:
      return state;
  }
}

export function AppStateProvider({ children }) {
  const { currentUser } = useSession();
  const [state, dispatch] = useReducer(reducer, currentUser, createBootstrapState);
  const [systemTheme, setSystemTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const stateRef = useRef(state);

  stateRef.current = state;

  const resolvedTheme = state.themeMode === 'system' ? systemTheme : state.themeMode;
  const displayCurrencyCode = state.currency?.code || BASE_CURRENCY_CODE;
  const displayCurrencyRate = getCurrencyRateForState(state.currency);

  const refreshAvailableCurrencies = useCallback(async ({ force = false, silent = false } = {}) => {
    const currentCurrency = stateRef.current.currency;
    const currentCodes = currentCurrency?.availableCodes?.length
      ? currentCurrency.availableCodes
      : mergeCurrencyCodes(FALLBACK_CURRENCY_CODES);

    if (!hasUniRateApiKey()) {
      return currentCodes;
    }

    if (
      !force
      && currentCurrency?.availableCodes?.length
      && isFreshTimestamp(currentCurrency.optionsUpdatedAt, CURRENCY_OPTIONS_TTL_MS)
    ) {
      return currentCurrency.availableCodes;
    }

    if (!silent) {
      dispatch({ type: 'currency/request' });
    }

    try {
      const availableCodes = await fetchAvailableCurrencies();
      const optionsUpdatedAt = new Date().toISOString();
      dispatch({
        type: 'currency/optionsLoaded',
        payload: { availableCodes, optionsUpdatedAt },
      });
      return availableCodes;
    } catch {
      if (!silent) {
        dispatch({
          type: 'currency/error',
          payload: { message: CURRENCY_UNAVAILABLE_MESSAGE },
        });
      }
      return currentCodes;
    }
  }, []);

  const setDisplayCurrency = useCallback(async (nextCode) => {
    const currencyCode = normalizeCurrencyCode(nextCode);

    if (currencyCode === BASE_CURRENCY_CODE) {
      dispatch({
        type: 'currency/set',
        payload: {
          code: BASE_CURRENCY_CODE,
          rate: 1,
          updatedAt: new Date().toISOString(),
        },
      });
      return true;
    }

    const currentCurrency = stateRef.current.currency;
    const cachedRate = currentCurrency?.rates?.[currencyCode];
    const hasFreshCachedRate = cachedRate && isFreshTimestamp(cachedRate.updatedAt, CURRENCY_RATE_TTL_MS);

    if (hasFreshCachedRate) {
      dispatch({
        type: 'currency/set',
        payload: {
          code: currencyCode,
          rate: cachedRate.rate,
          updatedAt: cachedRate.updatedAt,
        },
      });
      return true;
    }

    dispatch({ type: 'currency/request' });

    try {
      const [conversion, availableCodes] = await Promise.all([
        fetchConversionRate(currencyCode),
        refreshAvailableCurrencies({ silent: true }),
      ]);

      dispatch({
        type: 'currency/set',
        payload: {
          code: currencyCode,
          rate: conversion.rate,
          updatedAt: conversion.updatedAt,
          availableCodes,
          optionsUpdatedAt: new Date().toISOString(),
        },
      });
      return true;
    } catch {
      if (cachedRate?.rate) {
        dispatch({
          type: 'currency/set',
          payload: {
            code: currencyCode,
            rate: cachedRate.rate,
            updatedAt: cachedRate.updatedAt,
          },
        });
        dispatch({
          type: 'currency/error',
          payload: { message: CURRENCY_UNAVAILABLE_MESSAGE },
        });
      } else {
        dispatch({
          type: 'currency/fallback',
          payload: { message: CURRENCY_UNAVAILABLE_MESSAGE },
        });
      }

      dispatch({
        type: 'toast/show',
        payload: { message: CURRENCY_UNAVAILABLE_MESSAGE, kind: 'error' },
      });
      return false;
    }
  }, [refreshAvailableCurrencies]);

  useEffect(() => {
    if (state.status !== 'ready') return;
    if (!currentUser?.id) return;

    try {
      window.localStorage.setItem(
        getUserAppStateStorageKey(currentUser.id),
        JSON.stringify(getPersistableState(state))
      );
    } catch {
      /* ignore storage failures */
    }
  }, [currentUser?.id, state]);

  useLayoutEffect(() => {
    dispatch({ type: 'load/success', payload: loadStateForUser(currentUser) });
  }, [currentUser]);

  useLayoutEffect(() => {
    setCurrencyDisplayConfig({
      currencyCode: displayCurrencyCode,
      rate: displayCurrencyRate,
    });
  }, [displayCurrencyCode, displayCurrencyRate]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (event) => setSystemTheme(event.matches ? 'dark' : 'light');

    setSystemTheme(media.matches ? 'dark' : 'light');

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themeMode = state.themeMode;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme, state.themeMode]);

  useEffect(() => {
    if (!state.toast) return undefined;
    const timeoutId = setTimeout(() => dispatch({ type: 'toast/clear' }), 2600);
    return () => clearTimeout(timeoutId);
  }, [state.toast]);

  useEffect(() => {
    if (!CURRENCY_API_CONFIGURED) return;
    void refreshAvailableCurrencies({ silent: true });
  }, [refreshAvailableCurrencies]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      resolvedTheme,
      systemTheme,
      displayCurrencyCode,
      displayCurrencyRate,
      currencyApiConfigured: CURRENCY_API_CONFIGURED,
      setDisplayCurrency,
      refreshAvailableCurrencies,
    }),
    [
      displayCurrencyCode,
      displayCurrencyRate,
      refreshAvailableCurrencies,
      resolvedTheme,
      setDisplayCurrency,
      state,
      systemTheme,
    ]
  );
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

AppStateProvider.propTypes = {
  children: PropTypes.node,
};

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within AppStateProvider');
  return context;
}
