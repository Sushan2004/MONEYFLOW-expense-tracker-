const LOGO_DEV_BASE_URL = 'https://img.logo.dev/name';
const LOGO_DEV_TOKEN = (import.meta.env.VITE_LOGODEV_API_KEY || '').trim();
const MERCHANT_LOGO_CACHE_KEY = 'et:merchant-logo-cache';

let merchantLogoCache = null;

function canUseStorage() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function loadMerchantLogoCache() {
  if (merchantLogoCache) return merchantLogoCache;
  if (!canUseStorage()) {
    merchantLogoCache = {};
    return merchantLogoCache;
  }

  try {
    const raw = window.localStorage.getItem(MERCHANT_LOGO_CACHE_KEY);
    merchantLogoCache = raw ? JSON.parse(raw) : {};
  } catch {
    merchantLogoCache = {};
  }

  return merchantLogoCache;
}

function persistMerchantLogoCache() {
  if (!canUseStorage() || !merchantLogoCache) return;

  try {
    window.localStorage.setItem(MERCHANT_LOGO_CACHE_KEY, JSON.stringify(merchantLogoCache));
  } catch {
    /* ignore storage failures */
  }
}

export function hasLogoDevApiKey() {
  return LOGO_DEV_TOKEN.length > 0;
}

export function normalizeMerchantName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function merchantLogoCacheKey(value) {
  return normalizeMerchantName(value).toLowerCase();
}

export function buildMerchantLogoUrl(merchantName) {
  const merchant = normalizeMerchantName(merchantName);
  if (!merchant || !hasLogoDevApiKey()) return null;

  const encodedName = encodeURIComponent(merchant);
  return `${LOGO_DEV_BASE_URL}/${encodedName}?token=${LOGO_DEV_TOKEN}&size=128&format=png`;
}

export function getCachedMerchantLogo(merchantName) {
  const key = merchantLogoCacheKey(merchantName);
  if (!key) return null;

  const cache = loadMerchantLogoCache();
  return cache[key] || null;
}

export function setCachedMerchantLogo(merchantName, entry) {
  const key = merchantLogoCacheKey(merchantName);
  if (!key) return;

  const cache = loadMerchantLogoCache();
  cache[key] = {
    merchant: normalizeMerchantName(merchantName),
    updatedAt: new Date().toISOString(),
    ...entry,
  };
  persistMerchantLogoCache();
}
