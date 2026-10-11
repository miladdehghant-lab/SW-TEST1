import { AppState, AuthSession } from '../types';
import { getInitialState } from '../data/mockData';

const DB_KEY = 'storewar_pilot_v2';
const SESSION_KEY = 'storewar_session_v2';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const init = getInitialState();
      saveState(init);
      return init;
    }
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 2 && Array.isArray(parsed.users)) {
      return parsed;
    }
    const init = getInitialState();
    saveState(init);
    return init;
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
    return getInitialState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error saving state to localStorage:', err);
  }
}

export function resetToDefaults(): AppState {
  const init = getInitialState();
  saveState(init);
  return init;
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      // Default to admin for seamless evaluation
      const defaultAdmin: AuthSession = { admin: true, id: 'usr_admin' };
      localStorage.setItem(SESSION_KEY, JSON.stringify(defaultAdmin));
      return defaultAdmin;
    }
    return JSON.parse(raw);
  } catch {
    return { admin: true, id: 'usr_admin' };
  }
}

export function saveSession(session: AuthSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch (err) {
    console.error('Error saving session:', err);
  }
}
