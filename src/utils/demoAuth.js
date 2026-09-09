const AUTH_USERS_STORAGE_KEY = 'et:auth-users';
const AUTH_SESSION_STORAGE_KEY = 'et:auth-session';

function safeParse(raw, fallback) {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function createUserId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `usr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function toAppUser(user) {
  if (!user?.id || !user?.email) return null;

  const firstName = String(user.firstName || '').trim();
  const lastName = String(user.lastName || '').trim();
  const email = normalizeEmail(user.email);
  const fallbackName = email.split('@')[0] || 'You';
  const name = String(user.name || [firstName, lastName].filter(Boolean).join(' ') || fallbackName).trim();

  return {
    id: String(user.id),
    firstName,
    lastName,
    name,
    initial: (name[0] || fallbackName[0] || 'Y').toUpperCase(),
    email,
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: user.updatedAt || user.createdAt || new Date().toISOString(),
  };
}

export function normalizeDemoUser(user) {
  const profile = toAppUser(user);
  if (!profile) return null;

  return {
    ...profile,
    passwordHash: typeof user.passwordHash === 'string' ? user.passwordHash : '',
  };
}

export function readStoredDemoUsers() {
  if (typeof window === 'undefined') return [];

  const parsed = safeParse(window.localStorage.getItem(AUTH_USERS_STORAGE_KEY), []);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeDemoUser).filter(Boolean);
}

export function writeStoredDemoUsers(users) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_USERS_STORAGE_KEY, JSON.stringify(users));
}

export function findDemoUserByEmail(users, email) {
  const normalizedEmail = normalizeEmail(email);
  return users.find((user) => user.email === normalizedEmail) || null;
}

export function readStoredSessionUserId() {
  if (typeof window === 'undefined') return null;

  const value = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  return value ? String(value) : null;
}

export function writeStoredSessionUserId(userId) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, String(userId));
}

export function clearStoredSessionUserId() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

export async function hashPassword(password) {
  const value = String(password || '');

  if (
    typeof window !== 'undefined'
    && window.crypto?.subtle
    && typeof TextEncoder !== 'undefined'
  ) {
    const bytes = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((part) => part.toString(16).padStart(2, '0'))
      .join('');
  }

  return value;
}

export function createDemoUserRecord({ firstName, lastName, email, passwordHash }) {
  const now = new Date().toISOString();

  return normalizeDemoUser({
    id: createUserId(),
    firstName,
    lastName,
    email,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });
}

export function getSafeAuthRedirectTarget(target, fallback = '/dashboard') {
  const value = String(target || '').trim();

  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('/auth') || value.startsWith('/signup')) return fallback;

  return value;
}

export {
  AUTH_SESSION_STORAGE_KEY,
  AUTH_USERS_STORAGE_KEY,
};
