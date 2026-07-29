/**
 * Persistencia del progreso en localStorage.
 *
 * Toda lectura está protegida: si el navegador bloquea el almacenamiento
 * (modo privado, políticas escolares) el juego debe seguir siendo jugable,
 * simplemente sin recordar el progreso entre sesiones.
 */

import type { GameProgress, GameStats, LevelResult } from '../types/game';

export const STORAGE_KEY = 'mision-unidad:progreso';
const CURRENT_VERSION = 1;

export const emptyStats = (): GameStats => ({
  currentStreak: 0,
  bestStreak: 0,
  totalCorrect: 0,
  totalIncorrect: 0,
  hintsUsed: 0,
  totalScore: 0,
  explanationsRead: 0,
});

export const defaultProgress = (): GameProgress => ({
  version: CURRENT_VERSION,
  unlockedLevels: [1],
  completedActivities: [],
  levelResults: {},
  badges: [],
  stats: emptyStats(),
  theme: 'light',
});

function storageAvailable(): boolean {
  try {
    const probe = '__mu_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function loadProgress(): GameProgress {
  if (typeof window === 'undefined' || !storageAvailable()) return defaultProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<GameProgress>;
    return migrate(parsed);
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress: GameProgress): void {
  if (typeof window === 'undefined' || !storageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* almacenamiento lleno o bloqueado: el juego continúa en memoria */
  }
}

export function clearProgress(): void {
  if (typeof window === 'undefined' || !storageAvailable()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sin efecto */
  }
}

/**
 * Rellena campos ausentes con los valores por defecto. Así, si en el futuro
 * se añaden campos al modelo, un progreso guardado con una versión anterior
 * sigue cargando en vez de perderse.
 */
export function migrate(saved: Partial<GameProgress>): GameProgress {
  const base = defaultProgress();
  const levelResults: Record<number, LevelResult> = {
    ...base.levelResults,
    ...(saved.levelResults ?? {}),
  };
  return {
    version: CURRENT_VERSION,
    unlockedLevels: Array.from(new Set([1, ...(saved.unlockedLevels ?? [])])).sort(
      (a, b) => a - b
    ),
    completedActivities: saved.completedActivities ?? [],
    levelResults,
    badges: saved.badges ?? [],
    stats: { ...base.stats, ...(saved.stats ?? {}) },
    theme: saved.theme === 'dark' ? 'dark' : 'light',
  };
}
