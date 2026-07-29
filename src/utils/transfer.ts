/**
 * Exportación e importación del progreso en formato JSON.
 *
 * Sirve para tres situaciones reales: un estudiante que cambia de
 * computadora, un salón donde los navegadores se limpian cada noche, y un
 * docente que quiere recoger evidencia del trabajo de su grupo.
 *
 * Regla de oro de este módulo: **nunca confiar en el archivo importado**.
 * Un JSON puede venir editado a mano, corrupto o de una versión distinta
 * del juego. Todo lo que entra se sanea contra el contenido real del juego
 * antes de tocar el estado: niveles que existen, insignias que existen,
 * actividades que existen y números dentro de rangos posibles. Un archivo
 * malo debe producir un mensaje claro, nunca una partida rota.
 */

import { ALL_ACTIVITIES, TOTAL_LEVELS } from '../data/levels';
import { BADGES } from '../data/badges';
import type { GameProgress, GameStats, LevelResult } from '../types/game';
import { defaultProgress } from './storage';

/** Identificador del formato, para distinguirlo de cualquier otro JSON. */
export const TRANSFER_APP_ID = 'mision-unidad';
export const TRANSFER_FORMAT_VERSION = 1;

/** Resumen legible que acompaña al archivo (informativo, nunca se confía). */
export interface TransferSummary {
  levelsCompleted: number;
  activitiesCompleted: number;
  totalScore: number;
  bestStreak: number;
  badges: number;
}

export interface TransferFile {
  app: typeof TRANSFER_APP_ID;
  formatVersion: number;
  exportedAt: string;
  /** Nombre o grupo que el estudiante escribió al exportar. Opcional. */
  label?: string;
  summary: TransferSummary;
  progress: GameProgress;
}

/* ------------------------------------------------------------------ */
/* Exportar                                                            */
/* ------------------------------------------------------------------ */

/** Calcula el resumen legible de un progreso. */
export function summarize(progress: GameProgress): TransferSummary {
  return {
    levelsCompleted: Object.keys(progress.levelResults).length,
    activitiesCompleted: progress.completedActivities.length,
    totalScore: progress.stats.totalScore,
    bestStreak: progress.stats.bestStreak,
    badges: progress.badges.length,
  };
}

/** Construye el objeto exportable. */
export function buildTransferFile(
  progress: GameProgress,
  label?: string,
  now: Date = new Date()
): TransferFile {
  const clean = label?.trim();
  return {
    app: TRANSFER_APP_ID,
    formatVersion: TRANSFER_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    ...(clean ? { label: clean } : {}),
    summary: summarize(progress),
    progress,
  };
}

/** Serializa el progreso a texto JSON legible (con sangría, para inspección). */
export function exportProgressToJson(
  progress: GameProgress,
  label?: string,
  now: Date = new Date()
): string {
  return JSON.stringify(buildTransferFile(progress, label, now), null, 2);
}

/**
 * Nombre de archivo sugerido: incluye la fecha y, si lo hay, el nombre del
 * estudiante saneado para que sea un nombre de archivo válido.
 */
export function suggestedFileName(label?: string, now: Date = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  const clean = (label ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40);
  return clean
    ? `mision-unidad-${clean}-${date}.json`
    : `mision-unidad-progreso-${date}.json`;
}

/* ------------------------------------------------------------------ */
/* Importar: análisis y saneamiento                                    */
/* ------------------------------------------------------------------ */

export type ImportResult =
  | {
      ok: true;
      progress: GameProgress;
      summary: TransferSummary;
      label?: string;
      exportedAt?: string;
      /** Avisos no fatales: datos descartados por no reconocerse. */
      warnings: string[];
    }
  | { ok: false; error: string };

const KNOWN_ACTIVITY_IDS = new Set(ALL_ACTIVITIES.map((a) => a.id));
const KNOWN_BADGE_IDS = new Set(BADGES.map((b) => b.id));

/** Convierte a número finito no negativo; cualquier basura se vuelve 0. */
function safeCount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Lee un texto JSON y devuelve un progreso seguro de usar.
 *
 * Los mensajes de error están escritos para un estudiante, no para un
 * programador: dicen qué pasó y qué hacer.
 */
export function parseImportedProgress(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error:
        'Ese archivo no tiene formato JSON válido. Asegúrate de subir el archivo que descargaste desde Misión Unidad, sin editarlo.',
    };
  }

  if (!isPlainObject(raw)) {
    return { ok: false, error: 'El archivo no contiene un progreso de Misión Unidad.' };
  }

  if (raw.app !== TRANSFER_APP_ID) {
    return {
      ok: false,
      error:
        'Este archivo no es un progreso de Misión Unidad. Busca el archivo cuyo nombre empieza con "mision-unidad-".',
    };
  }

  const formatVersion = Number(raw.formatVersion);
  if (Number.isFinite(formatVersion) && formatVersion > TRANSFER_FORMAT_VERSION) {
    return {
      ok: false,
      error:
        'Este archivo viene de una versión más nueva del juego. Actualiza Misión Unidad para poder abrirlo.',
    };
  }

  if (!isPlainObject(raw.progress)) {
    return {
      ok: false,
      error: 'El archivo está incompleto: no contiene datos de progreso.',
    };
  }

  const { progress, warnings } = sanitizeProgress(raw.progress);

  return {
    ok: true,
    progress,
    summary: summarize(progress),
    label: typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : undefined,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : undefined,
    warnings,
  };
}

/**
 * Sanea un objeto arbitrario hasta convertirlo en un GameProgress válido.
 * Todo lo que no se reconoce se descarta y se reporta como aviso.
 */
export function sanitizeProgress(input: Record<string, unknown>): {
  progress: GameProgress;
  warnings: string[];
} {
  const base = defaultProgress();
  const warnings: string[] = [];

  // Niveles desbloqueados: enteros dentro del rango real del juego.
  const rawLevels = Array.isArray(input.unlockedLevels) ? input.unlockedLevels : [];
  const levels = rawLevels
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= TOTAL_LEVELS);
  if (levels.length !== rawLevels.length) {
    warnings.push('Se ignoraron niveles que no existen en esta versión del juego.');
  }

  // Actividades completadas: solo identificadores que existen de verdad.
  const rawActivities = Array.isArray(input.completedActivities)
    ? input.completedActivities
    : [];
  const activities = rawActivities.filter(
    (id): id is string => typeof id === 'string' && KNOWN_ACTIVITY_IDS.has(id)
  );
  if (activities.length !== rawActivities.length) {
    warnings.push('Se ignoraron actividades que no existen en esta versión del juego.');
  }

  // Insignias: solo las definidas en el catálogo.
  const rawBadges = Array.isArray(input.badges) ? input.badges : [];
  const badges = rawBadges.filter(
    (id): id is string => typeof id === 'string' && KNOWN_BADGE_IDS.has(id)
  );
  if (badges.length !== rawBadges.length) {
    warnings.push('Se ignoraron insignias desconocidas.');
  }

  // Resultados por nivel: se reconstruye cada campo y se recalcula la precisión.
  const levelResults: Record<number, LevelResult> = {};
  if (isPlainObject(input.levelResults)) {
    for (const [key, value] of Object.entries(input.levelResults)) {
      const levelId = Number(key);
      if (!Number.isInteger(levelId) || levelId < 1 || levelId > TOTAL_LEVELS) continue;
      if (!isPlainObject(value)) continue;

      const total = safeCount(value.total);
      if (total === 0) continue;
      const correct = Math.min(safeCount(value.correct), total);

      levelResults[levelId] = {
        levelId,
        score: safeCount(value.score),
        correct,
        total,
        // La precisión se RECALCULA: nunca se acepta la del archivo.
        accuracy: correct / total,
        hintsUsed: Math.min(safeCount(value.hintsUsed), total),
        completedAt:
          typeof value.completedAt === 'string' ? value.completedAt : new Date().toISOString(),
      };
    }
  }

  const rawStats = isPlainObject(input.stats) ? input.stats : {};
  const stats: GameStats = {
    // La racha en curso no sobrevive a una transferencia: se empieza limpio.
    currentStreak: 0,
    bestStreak: safeCount(rawStats.bestStreak),
    totalCorrect: safeCount(rawStats.totalCorrect),
    totalIncorrect: safeCount(rawStats.totalIncorrect),
    hintsUsed: safeCount(rawStats.hintsUsed),
    totalScore: safeCount(rawStats.totalScore),
    explanationsRead: safeCount(rawStats.explanationsRead),
  };

  return {
    progress: {
      ...base,
      unlockedLevels: Array.from(new Set([1, ...levels])).sort((a, b) => a - b),
      completedActivities: Array.from(new Set(activities)),
      levelResults,
      badges: Array.from(new Set(badges)),
      stats,
      theme: input.theme === 'dark' ? 'dark' : 'light',
    },
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/* Combinar dos progresos                                              */
/* ------------------------------------------------------------------ */

/**
 * Une el progreso importado con el que ya existe en este navegador.
 *
 * Criterio: se conserva **lo mejor de cada lado**, nunca la suma. Sumar los
 * puntos de dos dispositivos inflaría el marcador contando dos veces las
 * mismas actividades resueltas, así que en cada estadística acumulada se
 * toma el máximo. De cada nivel se guarda el intento de mayor puntuación.
 */
export function mergeProgress(current: GameProgress, incoming: GameProgress): GameProgress {
  const levelResults: Record<number, LevelResult> = { ...current.levelResults };
  for (const [key, result] of Object.entries(incoming.levelResults)) {
    const levelId = Number(key);
    const existing = levelResults[levelId];
    if (!existing || result.score > existing.score) {
      levelResults[levelId] = result;
    }
  }

  return {
    version: current.version,
    unlockedLevels: Array.from(
      new Set([...current.unlockedLevels, ...incoming.unlockedLevels])
    ).sort((a, b) => a - b),
    completedActivities: Array.from(
      new Set([...current.completedActivities, ...incoming.completedActivities])
    ),
    levelResults,
    badges: Array.from(new Set([...current.badges, ...incoming.badges])),
    stats: {
      currentStreak: 0,
      bestStreak: Math.max(current.stats.bestStreak, incoming.stats.bestStreak),
      totalCorrect: Math.max(current.stats.totalCorrect, incoming.stats.totalCorrect),
      totalIncorrect: Math.max(current.stats.totalIncorrect, incoming.stats.totalIncorrect),
      hintsUsed: Math.max(current.stats.hintsUsed, incoming.stats.hintsUsed),
      totalScore: Math.max(current.stats.totalScore, incoming.stats.totalScore),
      explanationsRead: Math.max(
        current.stats.explanationsRead,
        incoming.stats.explanationsRead
      ),
    },
    // El tema es una preferencia de este dispositivo: no se importa.
    theme: current.theme,
  };
}

/** ¿Hay algo que perder si se reemplaza el progreso actual? */
export function hasMeaningfulProgress(progress: GameProgress): boolean {
  return (
    progress.completedActivities.length > 0 ||
    progress.stats.totalScore > 0 ||
    Object.keys(progress.levelResults).length > 0
  );
}
