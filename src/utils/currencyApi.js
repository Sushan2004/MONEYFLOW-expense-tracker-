export const BASE_CURRENCY_CODE = 'USD';
export const FALLBACK_CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'INR', 'NPR', 'CAD', 'AUD', 'JPY'];

const API_BASE_URL = 'https://api.unirateapi.com';
const UNI_RATE_API_KEY = (import.meta.env.VITE_UNIRATE_API_KEY || '').trim();

export function getUniRateApiKey() {
  return UNI_RATE_API_KEY;
}

export function hasUniRateApiKey() {
  return UNI_RATE_API_KEY.length > 0;
}

export function normalizeCurrencyCode(value) {
  const next = String(value || BASE_CURRENCY_CODE).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(next) ? next : BASE_CURRENCY_CODE;
}

export function mergeCurrencyCodes(...lists) {
  const merged = new Set();

  lists.flat().forEach((value) => {
    const code = normalizeCurrencyCode(value);
    if (code) merged.add(code);
  });

  return [...merged].sort((a, b) => {
    if (a === BASE_CURRENCY_CODE) return -1;
    if (b === BASE_CURRENCY_CODE) return 1;
    return a.localeCompare(b);
  });
}

export function getCurrencyDisplayName(code) {
  const normalized = normalizeCurrencyCode(code);

  try {
    const formatter = new Intl.DisplayNames(['en'], { type: 'currency' });
    return formatter.of(normalized) || normalized;
  } catch {
    return normalized;
  }
}

export function getCurrencySymbol(code) {
  const normalized = normalizeCurrencyCode(code);

  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalized,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const currencyPart = formatter.formatToParts(0).find((part) => part.type === 'currency');
    return currencyPart?.value || normalized;
  } catch {
    return normalized;
  }
}

export function isFreshTimestamp(value, ttlMs) {
  const timestamp = new Date(value || '').getTime();
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp < ttlMs;
}

async function fetchJson(url, signal) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`UniRate request failed with ${response.status}`);
  }

  return response.json();
}

export async function fetchAvailableCurrencies({ signal } = {}) {
  if (!hasUniRateApiKey()) {
    throw new Error('Missing UniRate API key');
  }

  const url = new URL('/api/currencies', API_BASE_URL);
  url.searchParams.set('api_key', UNI_RATE_API_KEY);

  const payload = await fetchJson(url, signal);
  return mergeCurrencyCodes(FALLBACK_CURRENCY_CODES, payload?.currencies || []);
}

export async function fetchConversionRate(toCurrency, { signal } = {}) {
  const target = normalizeCurrencyCode(toCurrency);

  if (target === BASE_CURRENCY_CODE) {
    return {
      code: BASE_CURRENCY_CODE,
      rate: 1,
      updatedAt: new Date().toISOString(),
    };
  }

  if (!hasUniRateApiKey()) {
    throw new Error('Missing UniRate API key');
  }

  const url = new URL('/api/convert', API_BASE_URL);
  url.searchParams.set('api_key', UNI_RATE_API_KEY);
  url.searchParams.set('amount', '1');
  url.searchParams.set('from', BASE_CURRENCY_CODE);
  url.searchParams.set('to', target);

  const payload = await fetchJson(url, signal);
  const baseAmount = Number(payload?.amount) || 1;
  const convertedAmount = Number(payload?.result);
  const rate = convertedAmount / baseAmount;

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('Invalid UniRate conversion response');
  }

  return {
    code: target,
    rate,
    updatedAt: new Date().toISOString(),
  };
}
