import { createContext, useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  clearStoredSessionUserId,
  createDemoUserRecord,
  findDemoUserByEmail,
  hashPassword,
  normalizeEmail,
  readStoredDemoUsers,
  readStoredSessionUserId,
  toAppUser,
  writeStoredDemoUsers,
  writeStoredSessionUserId,
} from '../utils/demoAuth.js';

const SessionContext = createContext(null);

function getBootstrapSession() {
  const users = readStoredDemoUsers();
  const sessionUserId = readStoredSessionUserId();
  const currentUser = users.find((user) => user.id === sessionUserId) || null;

  if (!currentUser && sessionUserId) {
    clearStoredSessionUserId();
  }

  return {
    users,
    currentUser,
  };
}

export function SessionProvider({ children }) {
  const [{ users, currentUser }, setSessionState] = useState(getBootstrapSession);

  async function signUp({ firstName, lastName, email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const existingUsers = readStoredDemoUsers();

    if (findDemoUserByEmail(existingUsers, normalizedEmail)) {
      throw new Error('An account with that email already exists.');
    }

    const passwordHash = await hashPassword(password);
    const user = createDemoUserRecord({
      firstName,
      lastName,
      email: normalizedEmail,
      passwordHash,
    });

    const nextUsers = [...existingUsers, user];
    writeStoredDemoUsers(nextUsers);
    writeStoredSessionUserId(user.id);
    setSessionState({ users: nextUsers, currentUser: user });

    return toAppUser(user);
  }

  async function logIn({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const nextUsers = readStoredDemoUsers();
    const user = findDemoUserByEmail(nextUsers, normalizedEmail);
    const passwordHash = await hashPassword(password);

    if (!user || user.passwordHash !== passwordHash) {
      throw new Error('Invalid email or password.');
    }

    writeStoredSessionUserId(user.id);
    setSessionState({ users: nextUsers, currentUser: user });

    return toAppUser(user);
  }

  function logOut() {
    clearStoredSessionUserId();
    setSessionState((prev) => ({ ...prev, currentUser: null }));
  }

  const value = useMemo(
    () => ({
      users,
      currentUser: toAppUser(currentUser),
      isAuthenticated: Boolean(currentUser?.id),
      signUp,
      logIn,
      logOut,
    }),
    [currentUser, users]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

SessionProvider.propTypes = {
  children: PropTypes.node,
};

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
