import { BASE_CURRENCY_CODE, normalizeCurrencyCode } from './currencyApi.js';

const currencyFormatterCache = new Map();
let currencyDisplayConfig = {
  currencyCode: BASE_CURRENCY_CODE,
  rate: 1,
};

function normalizeCurrencyRate(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
}

function getCurrencyFormatter(currencyCode, compact) {
  const normalizedCode = normalizeCurrencyCode(currencyCode);
  const cacheKey = `${normalizedCode}:${compact ? 'compact' : 'full'}`;

  if (!currencyFormatterCache.has(cacheKey)) {
    currencyFormatterCache.set(
      cacheKey,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: normalizedCode,
        minimumFractionDigits: compact ? 0 : 2,
        maximumFractionDigits: compact ? 0 : 2,
      })
    );
  }

  return currencyFormatterCache.get(cacheKey);
}

export function setCurrencyDisplayConfig({
  currencyCode = BASE_CURRENCY_CODE,
  rate = 1,
} = {}) {
  currencyDisplayConfig = {
    currencyCode: normalizeCurrencyCode(currencyCode),
    rate: normalizeCurrencyRate(rate),
  };
}

export function getCurrencyDisplayConfig() {
  return { ...currencyDisplayConfig };
}

export function convertCurrencyAmount(value, { rate = currencyDisplayConfig.rate } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric * normalizeCurrencyRate(rate);
}

export function formatCurrency(
  value,
  {
    compact = false,
    currencyCode = currencyDisplayConfig.currencyCode,
    rate = currencyDisplayConfig.rate,
    convert = true,
  } = {}
) {
  const formatter = getCurrencyFormatter(currencyCode, compact);
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return formatter.format(0);

  const displayValue = convert ? convertCurrencyAmount(numeric, { rate }) : numeric;
  return formatter.format(displayValue);
}

export function formatPercent(ratio, digits = 1) {
  if (!Number.isFinite(ratio)) return '0%';
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function isoMonth(date = new Date()) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}`;
}

export function isoYear(date = new Date()) {
  return String(new Date(date).getFullYear());
}

export function todayIso(date = new Date()) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

export function endOfWeek(date = new Date()) {
  return addDays(startOfWeek(date), 6);
}

export function isoWeekStart(date = new Date()) {
  return todayIso(startOfWeek(date));
}

export function isoQuarter(date = new Date()) {
  const next = new Date(date);
  const quarter = Math.floor(next.getMonth() / 3) + 1;
  return `${next.getFullYear()}-Q${quarter}`;
}

export function currentBudgetPeriodKey(periodType, date = new Date()) {
  if (periodType === 'weekly') return isoWeekStart(date);
  if (periodType === 'yearly') return isoYear(date);
  return isoMonth(date);
}

export function currentReportPeriodKey(period, date = new Date()) {
  if (period === 'week') return isoWeekStart(date);
  if (period === 'quarter') return isoQuarter(date);
  if (period === 'year') return isoYear(date);
  return isoMonth(date);
}

export function matchesBudgetPeriod(isoDate, periodType, periodKey) {
  if (!isoDate || !periodKey) return false;

  if (periodType === 'weekly') {
    return isoWeekStart(new Date(`${isoDate}T00:00:00`)) === periodKey;
  }

  if (periodType === 'yearly') {
    return isoDate.slice(0, 4) === periodKey;
  }

  return isoDate.startsWith(periodKey);
}

export function matchesReportPeriod(isoDate, period, periodKey) {
  if (!isoDate || !periodKey) return false;

  if (period === 'week') return matchesBudgetPeriod(isoDate, 'weekly', periodKey);
  if (period === 'month') return matchesBudgetPeriod(isoDate, 'monthly', periodKey);
  if (period === 'year') return matchesBudgetPeriod(isoDate, 'yearly', periodKey);

  if (period === 'quarter') {
    const year = isoDate.slice(0, 4);
    const month = Number(isoDate.slice(5, 7));
    if (!year || !Number.isFinite(month)) return false;
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${year}-Q${quarter}` === periodKey;
  }

  return false;
}

export function formatBudgetPeriodLabel(periodType, periodKey, today = new Date()) {
  if (!periodKey) return '';

  if (periodType === 'weekly') {
    const start = new Date(`${periodKey}T00:00:00`);
    const end = endOfWeek(start);
    const currentWeek = isoWeekStart(today);
    const nextWeek = isoWeekStart(addDays(startOfWeek(today), 7));
    const range = `${shortDate(start)} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    if (periodKey === currentWeek) return `This week: ${range}`;
    if (periodKey === nextWeek) return `Next week: ${range}`;
    return range;
  }

  if (periodType === 'yearly') {
    return periodKey;
  }

  return new Date(`${periodKey}-01T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function formatReportPeriodLabel(period, periodKey, today = new Date()) {
  if (!periodKey) return '';

  if (period === 'week') return formatBudgetPeriodLabel('weekly', periodKey, today);
  if (period === 'month') return formatBudgetPeriodLabel('monthly', periodKey, today);
  if (period === 'year') return formatBudgetPeriodLabel('yearly', periodKey, today);

  if (period === 'quarter') {
    const [year, quarterPart] = String(periodKey).split('-Q');
    if (!year || !quarterPart) return '';
    const quarterLabel = `Q${quarterPart} ${year}`;
    return periodKey === isoQuarter(today) ? `This quarter: ${quarterLabel}` : quarterLabel;
  }

  return '';
}

export function elapsedDaysInReportPeriod(period, periodKey, today = new Date()) {
  const current = new Date(today);
  current.setHours(0, 0, 0, 0);

  if (period === 'week') {
    const start = startOfWeek(new Date(`${periodKey}T00:00:00`));
    const end = endOfWeek(start);
    const effectiveEnd = periodKey === isoWeekStart(today) ? current : end;
    return Math.max(1, Math.round((effectiveEnd - start) / 86_400_000) + 1);
  }

  if (period === 'month') {
    if (periodKey === isoMonth(today)) return current.getDate();
    const [year, month] = periodKey.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  }

  if (period === 'quarter') {
    const [yearValue, quarterValue] = String(periodKey).split('-Q');
    const year = Number(yearValue);
    const quarter = Number(quarterValue);
    if (!Number.isFinite(year) || !Number.isFinite(quarter)) return 1;

    const quarterStartMonth = (quarter - 1) * 3;
    const start = new Date(year, quarterStartMonth, 1);
    const end = new Date(year, quarterStartMonth + 3, 0);
    const effectiveEnd = periodKey === isoQuarter(today) ? current : end;
    return Math.max(1, Math.round((effectiveEnd - start) / 86_400_000) + 1);
  }

  if (period === 'year') {
    if (periodKey === isoYear(today)) {
      const start = new Date(current.getFullYear(), 0, 1);
      return Math.max(1, Math.round((current - start) / 86_400_000) + 1);
    }

    const year = Number(periodKey);
    const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return isLeapYear ? 366 : 365;
  }

  return 1;
}

export function formatDayLabel(iso, today = new Date()) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const diff = Math.round((t - d) / 86_400_000);
  if (diff === 0) return `Today · ${shortDate(d)}`;
  if (diff === 1) return `Yesterday · ${shortDate(d)}`;
  return `${weekday(d)} · ${shortDate(d)}`;
}

export function shortDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function weekday(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

export function fullDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
