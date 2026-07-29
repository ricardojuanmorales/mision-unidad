/**
 * Sistema de puntuación, rachas y bonos.
 *
 * Todos los valores viven en SCORING_CONFIG para que un docente pueda
 * recalibrar la economía del juego desde un solo lugar.
 */

import type { Activity, GameStats } from '../types/game';

export const SCORING_CONFIG = {
  /** Puntos base por actividad (una actividad puede sobrescribirlo). */
  basePoints: 100,
  /** Descuento por usar la pista. */
  hintPenalty: 25,
  /** Bono por acertar en el primer intento. */
  firstTryBonus: 20,
  /** Descuento acumulado por cada intento fallido previo. */
  retryPenalty: 15,
  /** Puntos mínimos garantizados si la respuesta acaba siendo correcta. */
  minimumPointsWhenCorrect: 10,
  /** Bonos por racha: se otorgan al alcanzar exactamente ese múltiplo. */
  streakBonuses: {
    3: 30,
    5: 75,
    10: 150,
  } as Record<number, number>,
  /** Bono por completar un nivel. */
  levelCompletionBonus: 200,
  /** Bono adicional por completar un nivel sin usar ninguna pista. */
  flawlessLevelBonus: 300,
  /** Precisión mínima (0–1) para desbloquear el siguiente nivel. */
  unlockThreshold: 0.8,
  /** Si es false, un fallo reduce la racha a la mitad en vez de reiniciarla. */
  strictStreakReset: true,
} as const;

export interface ScoreBreakdown {
  points: number;
  bonuses: { label: string; points: number }[];
}

/**
 * Calcula los puntos de una actividad respondida.
 *
 * Regla: una respuesta correcta nunca vale 0. Aunque el estudiante haya
 * usado pista y fallado varias veces, conserva un mínimo — el objetivo es
 * que persistir siga siendo mejor que rendirse.
 */
export function scoreActivity(params: {
  activity: Activity;
  correct: boolean;
  attempts: number; // número total de intentos, incluido el actual
  usedHint: boolean;
  streakAfter: number; // racha resultante tras esta respuesta
}): ScoreBreakdown {
  const { activity, correct, attempts, usedHint, streakAfter } = params;
  const bonuses: { label: string; points: number }[] = [];

  if (!correct) {
    return { points: 0, bonuses };
  }

  const base = activity.basePoints || SCORING_CONFIG.basePoints;
  let points = base;

  if (usedHint) {
    points -= SCORING_CONFIG.hintPenalty;
    bonuses.push({ label: 'Pista usada', points: -SCORING_CONFIG.hintPenalty });
  }

  const failedAttempts = Math.max(0, attempts - 1);
  if (failedAttempts > 0) {
    const penalty = failedAttempts * SCORING_CONFIG.retryPenalty;
    points -= penalty;
    bonuses.push({
      label: `Reintentos (${failedAttempts})`,
      points: -penalty,
    });
  }

  points = Math.max(SCORING_CONFIG.minimumPointsWhenCorrect, points);

  if (attempts === 1 && !usedHint) {
    points += SCORING_CONFIG.firstTryBonus;
    bonuses.push({ label: 'Primer intento', points: SCORING_CONFIG.firstTryBonus });
  }

  const streakBonus = streakBonusFor(streakAfter);
  if (streakBonus > 0) {
    points += streakBonus;
    bonuses.push({ label: `Racha de ${streakAfter}`, points: streakBonus });
  }

  return { points, bonuses };
}

/**
 * Bono por racha. Se otorga en cada múltiplo del umbral más alto alcanzado:
 * 3, 5, 10, y luego cada 10 (20, 30, …) para que las rachas largas sigan
 * teniendo recompensa.
 */
export function streakBonusFor(streak: number): number {
  const direct = SCORING_CONFIG.streakBonuses[streak];
  if (direct) return direct;
  if (streak > 10 && streak % 10 === 0) return SCORING_CONFIG.streakBonuses[10];
  return 0;
}

/** Nueva racha tras una respuesta. */
export function nextStreak(current: number, correct: boolean): number {
  if (correct) return current + 1;
  return SCORING_CONFIG.strictStreakReset ? 0 : Math.floor(current / 2);
}

/** Actualiza las estadísticas globales tras una respuesta. */
export function applyOutcomeToStats(
  stats: GameStats,
  outcome: { correct: boolean; usedHint: boolean; points: number }
): GameStats {
  const streak = nextStreak(stats.currentStreak, outcome.correct);
  return {
    ...stats,
    currentStreak: streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    totalCorrect: stats.totalCorrect + (outcome.correct ? 1 : 0),
    totalIncorrect: stats.totalIncorrect + (outcome.correct ? 0 : 1),
    hintsUsed: stats.hintsUsed + (outcome.usedHint ? 1 : 0),
    totalScore: stats.totalScore + outcome.points,
  };
}

export interface LevelSummary {
  rawScore: number;
  correct: number;
  total: number;
  accuracy: number;
  hintsUsed: number;
  completionBonus: number;
  flawlessBonus: number;
  finalScore: number;
  unlockedNext: boolean;
  mastery: 'oro' | 'plata' | 'bronce' | 'en progreso';
}

/** Resume un nivel terminado y decide si desbloquea el siguiente. */
export function summarizeLevel(params: {
  rawScore: number;
  correct: number;
  total: number;
  hintsUsed: number;
}): LevelSummary {
  const { rawScore, correct, total, hintsUsed } = params;
  const accuracy = total > 0 ? correct / total : 0;
  const completionBonus = SCORING_CONFIG.levelCompletionBonus;
  const flawlessBonus =
    hintsUsed === 0 && correct === total ? SCORING_CONFIG.flawlessLevelBonus : 0;

  return {
    rawScore,
    correct,
    total,
    accuracy,
    hintsUsed,
    completionBonus,
    flawlessBonus,
    finalScore: rawScore + completionBonus + flawlessBonus,
    unlockedNext: accuracy >= SCORING_CONFIG.unlockThreshold,
    mastery:
      accuracy === 1 && hintsUsed === 0
        ? 'oro'
        : accuracy >= 0.9
          ? 'plata'
          : accuracy >= SCORING_CONFIG.unlockThreshold
            ? 'bronce'
            : 'en progreso',
  };
}

/** Mensajes de aliento: nunca se burlan del error. */
export const ENCOURAGEMENT = {
  correct: [
    '¡Correcto! Has convertido con precisión.',
    'Excelente razonamiento dimensional.',
    'Tu racha científica continúa.',
    '¡Eso es! Las unidades cuadran perfectamente.',
    'Precisión de laboratorio. Bien hecho.',
  ],
  incorrect: [
    'Buen intento. Revisemos el factor de conversión.',
    'Estás cerca. Observa las unidades antes de multiplicar.',
    'El error es parte del laboratorio: veamos qué nos enseña.',
    'Casi. Vuelve a mirar hacia qué lado va la conversión.',
    'Sin problema: cada intento afina el instrumento.',
  ],
  inspiration: [
    'Medir es traducir la naturaleza al lenguaje de los números.',
    'Una unidad bien elegida puede iluminar un fenómeno completo.',
    'Convertir unidades es aprender a cambiar de escala sin perder el sentido.',
    'Detrás de cada número hay una decisión sobre cómo mirar el mundo.',
    'La ciencia empieza cuando preguntamos "¿cuánto?" y respondemos "¿de qué?".',
  ],
};

/** Escoge un mensaje de forma determinista a partir de una semilla. */
export function pickMessage(pool: string[], seed: number): string {
  return pool[Math.abs(seed) % pool.length];
}
