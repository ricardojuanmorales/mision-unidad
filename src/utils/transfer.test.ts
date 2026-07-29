import { describe, expect, it } from 'vitest';
import type { GameProgress } from '../types/game';
import { defaultProgress } from './storage';
import {
  TRANSFER_APP_ID,
  TRANSFER_FORMAT_VERSION,
  exportProgressToJson,
  hasMeaningfulProgress,
  mergeProgress,
  parseImportedProgress,
  sanitizeProgress,
  suggestedFileName,
  summarize,
} from './transfer';

function makeProgress(over: Partial<GameProgress> = {}): GameProgress {
  const base = defaultProgress();
  return {
    ...base,
    unlockedLevels: [1, 2, 3],
    completedActivities: ['n1-a1', 'n1-a2', 'n2-a1'],
    levelResults: {
      1: {
        levelId: 1,
        score: 1500,
        correct: 10,
        total: 10,
        accuracy: 1,
        hintsUsed: 0,
        completedAt: '2026-07-01T10:00:00.000Z',
      },
      2: {
        levelId: 2,
        score: 900,
        correct: 8,
        total: 10,
        accuracy: 0.8,
        hintsUsed: 3,
        completedAt: '2026-07-02T10:00:00.000Z',
      },
    },
    badges: ['nivel-1', 'nivel-2', 'sin-pistas'],
    stats: {
      currentStreak: 4,
      bestStreak: 11,
      totalCorrect: 18,
      totalIncorrect: 2,
      hintsUsed: 3,
      totalScore: 2400,
      explanationsRead: 20,
    },
    ...over,
  };
}

describe('exportar', () => {
  it('produce un JSON con identificador de aplicación, versión y fecha', () => {
    const json = exportProgressToJson(makeProgress(), undefined, new Date('2026-07-29T12:00:00Z'));
    const parsed = JSON.parse(json);
    expect(parsed.app).toBe(TRANSFER_APP_ID);
    expect(parsed.formatVersion).toBe(TRANSFER_FORMAT_VERSION);
    expect(parsed.exportedAt).toBe('2026-07-29T12:00:00.000Z');
    expect(parsed.progress.stats.totalScore).toBe(2400);
  });

  it('incluye el nombre solo cuando se escribió alguno', () => {
    const con = JSON.parse(exportProgressToJson(makeProgress(), '  Ana Rivera  '));
    expect(con.label).toBe('Ana Rivera');

    const sin = JSON.parse(exportProgressToJson(makeProgress(), '   '));
    expect(sin.label).toBeUndefined();
  });

  it('adjunta un resumen legible del contenido', () => {
    const { summary } = JSON.parse(exportProgressToJson(makeProgress()));
    expect(summary).toEqual({
      levelsCompleted: 2,
      activitiesCompleted: 3,
      totalScore: 2400,
      bestStreak: 11,
      badges: 3,
    });
  });

  it('sugiere un nombre de archivo válido a partir del nombre del estudiante', () => {
    const date = new Date('2026-07-29T12:00:00Z');
    expect(suggestedFileName('Ana Rivera — Física 101', date)).toBe(
      'mision-unidad-ana-rivera-fisica-101-2026-07-29.json'
    );
    expect(suggestedFileName(undefined, date)).toBe('mision-unidad-progreso-2026-07-29.json');
    // Un nombre compuesto solo de símbolos no debe dejar guiones sueltos
    expect(suggestedFileName('!!!', date)).toBe('mision-unidad-progreso-2026-07-29.json');
  });
});

describe('importar: viaje de ida y vuelta', () => {
  it('recupera exactamente el mismo progreso que se exportó', () => {
    const original = makeProgress();
    const result = parseImportedProgress(exportProgressToJson(original, 'Ana'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.label).toBe('Ana');
    expect(result.warnings).toHaveLength(0);
    expect(result.progress.unlockedLevels).toEqual(original.unlockedLevels);
    expect(result.progress.completedActivities).toEqual(original.completedActivities);
    expect(result.progress.badges).toEqual(original.badges);
    expect(result.progress.stats.totalScore).toBe(2400);
    expect(result.progress.stats.bestStreak).toBe(11);
    expect(result.progress.levelResults[1].score).toBe(1500);
    // La racha en curso no se transfiere: se empieza limpio en el dispositivo nuevo
    expect(result.progress.stats.currentStreak).toBe(0);
  });
});

describe('importar: rechazo de archivos inválidos', () => {
  it('rechaza texto que no es JSON', () => {
    const result = parseImportedProgress('esto no es json {{{');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/formato JSON/);
  });

  it('rechaza un JSON de otra aplicación', () => {
    const result = parseImportedProgress(JSON.stringify({ app: 'otro-juego', progress: {} }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no es un progreso de Misión Unidad/);
  });

  it('rechaza un archivo de una versión futura del formato', () => {
    const result = parseImportedProgress(
      JSON.stringify({ app: TRANSFER_APP_ID, formatVersion: 99, progress: {} })
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/versión más nueva/);
  });

  it('rechaza un archivo sin datos de progreso', () => {
    const result = parseImportedProgress(
      JSON.stringify({ app: TRANSFER_APP_ID, formatVersion: 1 })
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/incompleto/);
  });

  it('rechaza un JSON que no es un objeto', () => {
    expect(parseImportedProgress('[1,2,3]').ok).toBe(false);
    expect(parseImportedProgress('42').ok).toBe(false);
  });
});

describe('saneamiento: nunca se confía en el archivo', () => {
  it('descarta niveles, actividades e insignias que no existen', () => {
    const { progress, warnings } = sanitizeProgress({
      unlockedLevels: [1, 2, 99, -3, 'siete'],
      completedActivities: ['n1-a1', 'actividad-inventada', 42],
      badges: ['nivel-1', 'insignia-pirata'],
    });

    expect(progress.unlockedLevels).toEqual([1, 2]);
    expect(progress.completedActivities).toEqual(['n1-a1']);
    expect(progress.badges).toEqual(['nivel-1']);
    expect(warnings).toHaveLength(3);
  });

  it('convierte números imposibles en valores seguros', () => {
    const { progress } = sanitizeProgress({
      stats: {
        bestStreak: -50,
        totalScore: 'muchísimos',
        totalCorrect: Infinity,
        hintsUsed: 3.9,
        explanationsRead: null,
      },
    });

    expect(progress.stats.bestStreak).toBe(0);
    expect(progress.stats.totalScore).toBe(0);
    expect(progress.stats.totalCorrect).toBe(0);
    expect(progress.stats.hintsUsed).toBe(3); // se trunca, no se redondea hacia arriba
    expect(progress.stats.explanationsRead).toBe(0);
  });

  it('recalcula la precisión en vez de aceptar la del archivo', () => {
    // Un archivo editado a mano afirma 100 % con 3 de 10 aciertos
    const { progress } = sanitizeProgress({
      levelResults: {
        1: { levelId: 1, score: 9999, correct: 3, total: 10, accuracy: 1, hintsUsed: 0 },
      },
    });
    expect(progress.levelResults[1].accuracy).toBeCloseTo(0.3, 10);
  });

  it('no permite más aciertos que actividades del nivel', () => {
    const { progress } = sanitizeProgress({
      levelResults: {
        1: { levelId: 1, score: 100, correct: 500, total: 10, hintsUsed: 0 },
      },
    });
    expect(progress.levelResults[1].correct).toBe(10);
    expect(progress.levelResults[1].accuracy).toBe(1);
  });

  it('el Nivel 1 siempre queda desbloqueado, aunque el archivo diga lo contrario', () => {
    const { progress } = sanitizeProgress({ unlockedLevels: [] });
    expect(progress.unlockedLevels).toContain(1);
  });

  it('sobrevive a un objeto completamente vacío', () => {
    const { progress } = sanitizeProgress({});
    expect(progress.unlockedLevels).toEqual([1]);
    expect(progress.completedActivities).toEqual([]);
    expect(progress.stats.totalScore).toBe(0);
  });
});

describe('combinar dos progresos', () => {
  const local = makeProgress({
    unlockedLevels: [1, 2],
    completedActivities: ['n1-a1', 'n1-a2'],
    badges: ['nivel-1'],
    levelResults: {
      1: {
        levelId: 1,
        score: 800,
        correct: 8,
        total: 10,
        accuracy: 0.8,
        hintsUsed: 4,
        completedAt: '2026-07-01T00:00:00.000Z',
      },
    },
    stats: {
      currentStreak: 3,
      bestStreak: 5,
      totalCorrect: 8,
      totalIncorrect: 2,
      hintsUsed: 4,
      totalScore: 1000,
      explanationsRead: 10,
    },
  });

  const remote = makeProgress({
    unlockedLevels: [1, 2, 3, 4],
    completedActivities: ['n1-a1', 'n3-a1'],
    badges: ['nivel-2', 'racha-dorada'],
    levelResults: {
      1: {
        levelId: 1,
        score: 1500,
        correct: 10,
        total: 10,
        accuracy: 1,
        hintsUsed: 0,
        completedAt: '2026-07-05T00:00:00.000Z',
      },
      3: {
        levelId: 3,
        score: 950,
        correct: 9,
        total: 10,
        accuracy: 0.9,
        hintsUsed: 1,
        completedAt: '2026-07-06T00:00:00.000Z',
      },
    },
    stats: {
      currentStreak: 7,
      bestStreak: 12,
      totalCorrect: 19,
      totalIncorrect: 1,
      hintsUsed: 1,
      totalScore: 2450,
      explanationsRead: 20,
    },
  });

  it('une niveles desbloqueados, actividades e insignias', () => {
    const merged = mergeProgress(local, remote);
    expect(merged.unlockedLevels).toEqual([1, 2, 3, 4]);
    expect(merged.completedActivities.sort()).toEqual(['n1-a1', 'n1-a2', 'n3-a1']);
    expect(merged.badges.sort()).toEqual(['nivel-1', 'nivel-2', 'racha-dorada']);
  });

  it('conserva el mejor intento de cada nivel', () => {
    const merged = mergeProgress(local, remote);
    expect(merged.levelResults[1].score).toBe(1500); // gana el del archivo
    expect(merged.levelResults[1].accuracy).toBe(1);
    expect(merged.levelResults[3].score).toBe(950); // solo existe en el archivo
  });

  it('no suma los puntos: toma el máximo, para no contar dos veces lo mismo', () => {
    const merged = mergeProgress(local, remote);
    expect(merged.stats.totalScore).toBe(2450);
    expect(merged.stats.totalScore).not.toBe(1000 + 2450);
    expect(merged.stats.bestStreak).toBe(12);
    expect(merged.stats.currentStreak).toBe(0);
  });

  it('conserva el tema visual de este dispositivo', () => {
    const merged = mergeProgress({ ...local, theme: 'dark' }, { ...remote, theme: 'light' });
    expect(merged.theme).toBe('dark');
  });

  it('es idempotente: combinar dos veces no cambia nada', () => {
    const once = mergeProgress(local, remote);
    const twice = mergeProgress(once, remote);
    expect(twice).toEqual(once);
  });

  it('combinar con un progreso vacío no destruye nada', () => {
    const merged = mergeProgress(local, defaultProgress());
    expect(merged.stats.totalScore).toBe(local.stats.totalScore);
    expect(merged.completedActivities).toEqual(local.completedActivities);
  });
});

describe('utilidades de apoyo', () => {
  it('detecta si hay progreso que se podría perder', () => {
    expect(hasMeaningfulProgress(defaultProgress())).toBe(false);
    expect(hasMeaningfulProgress(makeProgress())).toBe(true);
  });

  it('resume correctamente un progreso vacío', () => {
    expect(summarize(defaultProgress())).toEqual({
      levelsCompleted: 0,
      activitiesCompleted: 0,
      totalScore: 0,
      bestStreak: 0,
      badges: 0,
    });
  });
});
