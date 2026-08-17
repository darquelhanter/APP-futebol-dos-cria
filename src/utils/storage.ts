import { Player, Pelada, NotificationLog } from '../types';
import { INITIAL_PLAYERS, INITIAL_PELADAS, INITIAL_NOTIFICATIONS } from '../data/initialData';

const PLAYERS_KEY = 'futebol_dos_cria_players_v3';
const PELADAS_KEY = 'futebol_dos_cria_peladas_v3';
const NOTIFICATIONS_KEY = 'futebol_dos_cria_notifications_v3';
const WIPE_FLAG_KEY = 'futebol_dos_cria_wiped_v3';

// Force wipe legacy mock data from localStorage once
export function checkAndWipeLegacyData() {
  try {
    if (!localStorage.getItem(WIPE_FLAG_KEY)) {
      // Clear legacy storage keys
      localStorage.removeItem('futebol_dos_cria_players_v1');
      localStorage.removeItem('futebol_dos_cria_peladas_v1');
      localStorage.removeItem('futebol_dos_cria_notifications_v1');
      localStorage.removeItem('futebol_dos_cria_initialized_v2');
      localStorage.removeItem(PLAYERS_KEY);
      localStorage.removeItem(PELADAS_KEY);
      localStorage.removeItem(NOTIFICATIONS_KEY);
      localStorage.setItem(WIPE_FLAG_KEY, 'true');
    }
  } catch (e) {
    console.error('Failed to wipe legacy data', e);
  }
}

// Run wipe check immediately on load
checkAndWipeLegacyData();

export function loadPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(PLAYERS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load players from storage', e);
  }
  return [];
}

export function savePlayers(players: Player[]) {
  try {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  } catch (e) {
    console.error('Failed to save players to storage', e);
  }
}

export function loadPeladas(): Pelada[] {
  try {
    const raw = localStorage.getItem(PELADAS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load peladas from storage', e);
  }
  return [];
}

export function savePeladas(peladas: Pelada[]) {
  try {
    localStorage.setItem(PELADAS_KEY, JSON.stringify(peladas));
  } catch (e) {
    console.error('Failed to save peladas to storage', e);
  }
}

export function loadNotifications(): NotificationLog[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load notifications from storage', e);
  }
  return [];
}

export function saveNotifications(notifications: NotificationLog[]) {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error('Failed to save notifications to storage', e);
  }
}

export function clearAllData(): { players: Player[]; peladas: Pelada[]; notifications: NotificationLog[] } {
  try {
    localStorage.removeItem(PLAYERS_KEY);
    localStorage.removeItem(PELADAS_KEY);
    localStorage.removeItem(NOTIFICATIONS_KEY);
    localStorage.setItem(WIPE_FLAG_KEY, 'true');
  } catch (e) {
    console.error('Failed to clear storage', e);
  }
  return {
    players: [],
    peladas: [],
    notifications: [],
  };
}

export function resetToDemoData(): { players: Player[]; peladas: Pelada[]; notifications: NotificationLog[] } {
  savePlayers([]);
  savePeladas([]);
  saveNotifications([]);
  return {
    players: [],
    peladas: [],
    notifications: [],
  };
}

export const loadPlayersFromStorage = loadPlayers;
export const savePlayersToStorage = savePlayers;
export const loadPeladasFromStorage = loadPeladas;
export const savePeladasToStorage = savePeladas;
export const loadNotificationsFromStorage = loadNotifications;
export const saveNotificationsToStorage = saveNotifications;
export const resetToInitialData = resetToDemoData;
