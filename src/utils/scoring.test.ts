import { describe, expect, it } from 'vitest';
import type { Activity, GameStats } from '../types/game';
import {
  SCORING_CONFIG,
  applyOutcomeToStats,
  nextStreak,
  scoreActivity,
  streakBonusFor,
  summarizeLevel,
} from './scoring';

const activity: Activity = {
  id: 'test-1',
  levelId: 1,
  title: 'Prueba',
  type: 'numeric',
  flavor: 'reto',
  cognitiveLevel: 'aplicar',
  physicalQuantity: 'Longitud',
  context: '',
  prompt: '',
  unitsInvolved: ['m'],
  correctAnswer: 1,
  hint: '',
  basePoints: 100,
  difficulty: 1,
  explanationSteps: [],
  conversionFactor: '',
  phenomenonExplanation: '',
  reflection: '',
};

const emptyStats = (): GameStats => ({
  currentStreak: 0,
  bestStreak: 0,
  totalCorrect: 0,
  totalIncorrect: 0,
  hintsUsed: 0,
  totalScore: 0,
  explanationsRead: 0,
});

describe('puntuación de actividades', () => {
  it('otorga puntos completos más el bono de primer intento', () => {
    const result = scoreActivity({
      activity,
      correct: true,
      attempts: 1,
      usedHint: false,
      streakAfter: 1,
    });
    expect(result.points).toBe(120); // 100 base + 20 de primer intento
  });

  it('descuenta puntos al usar pista y elimina el bono de primer intento', () => {
    const result = scoreActivity({
      activity,
      correct: true,
      attempts: 1,
      usedHint: true,
      streakAfter: 1,
    });
    expect(result.points).toBe(75); // 100 − 25
    expect(result.bonuses.some((b) => b.label === 'Pista usada')).toBe(true);
    expect(result.bonuses.some((b) => b.label === 'Primer intento')).toBe(false);
  });

  it('penaliza los reintentos', () => {
    const result = scoreActivity({
      activity,
      correct: true,
      attempts: 2,
      usedHint: false,
      streakAfter: 1,
    });
    expect(result.points).toBe(85); // 100 − 15
  });

  it('nunca da 0 puntos a una respuesta correcta', () => {
    const result = scoreActivity({
      activity,
      correct: true,
      attempts: 6,
      usedHint: true,
      streakAfter: 1,
    });
    expect(result.points).toBeGreaterThanOrEqual(SCORING_CONFIG.minimumPointsWhenCorrect);
  });

  it('no otorga puntos por una respuesta incorrecta', () => {
    const result = scoreActivity({
      activity,
      correct: false,
      attempts: 2,
      usedHint: false,
      streakAfter: 0,
    });
    expect(result.points).toBe(0);
  });

  it('suma el bono de racha en los umbrales definidos', () => {
    const at3 = scoreActivity({
      activity,
      correct: true,
      attempts: 1,
      usedHint: false,
      streakAfter: 3,
    });
    expect(at3.points).toBe(150); // 100 + 20 + 30
    expect(streakBonusFor(5)).toBe(75);
    expect(streakBonusFor(10)).toBe(150);
    expect(streakBonusFor(4)).toBe(0);
    // Las rachas largas siguen premiando cada 10
    expect(streakBonusFor(20)).toBe(150);
  });
});

describe('rachas', () => {
  it('crece al acertar y se reinicia al fallar', () => {
    expect(nextStreak(4, true)).toBe(5);
    expect(nextStreak(4, false)).toBe(0);
  });

  it('registra la mejor racha alcanzada', () => {
    let stats = emptyStats();
    for (let i = 0; i < 4; i++) {
      stats = applyOutcomeToStats(stats, { correct: true, usedHint: false, points: 100 });
    }
    expect(stats.currentStreak).toBe(4);
    expect(stats.bestStreak).toBe(4);

    stats = applyOutcomeToStats(stats, { correct: false, usedHint: false, points: 0 });
    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(4); // la mejor racha se conserva
    expect(stats.totalIncorrect).toBe(1);
    expect(stats.totalScore).toBe(400);
  });

  it('contabiliza las pistas usadas', () => {
    const stats = applyOutcomeToStats(emptyStats(), {
      correct: true,
      usedHint: true,
      points: 75,
    });
    expect(stats.hintsUsed).toBe(1);
  });
});

describe('resumen de nivel', () => {
  it('desbloquea el siguiente nivel a partir del 80 % de aciertos', () => {
    const justEnough = summarizeLevel({ rawScore: 800, correct: 8, total: 10, hintsUsed: 2 });
    expect(justEnough.unlockedNext).toBe(true);
    expect(justEnough.mastery).toBe('bronce');

    const notEnough = summarizeLevel({ rawScore: 700, correct: 7, total: 10, hintsUsed: 3 });
    expect(notEnough.unlockedNext).toBe(false);
    expect(notEnough.mastery).toBe('en progreso');
  });

  it('otorga el bono de dominio solo si es perfecto y sin pistas', () => {
    const perfect = summarizeLevel({ rawScore: 1200, correct: 10, total: 10, hintsUsed: 0 });
    expect(perfect.flawlessBonus).toBe(300);
    expect(perfect.mastery).toBe('oro');
    expect(perfect.finalScore).toBe(1200 + 200 + 300);

    const withHints = summarizeLevel({ rawScore: 1000, correct: 10, total: 10, hintsUsed: 1 });
    expect(withHints.flawlessBonus).toBe(0);
    expect(withHints.mastery).toBe('plata');
  });

  it('siempre añade el bono por completar el nivel', () => {
    const summary = summarizeLevel({ rawScore: 500, correct: 5, total: 10, hintsUsed: 0 });
    expect(summary.completionBonus).toBe(200);
    expect(summary.finalScore).toBe(700);
  });
});
