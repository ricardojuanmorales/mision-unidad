/**
 * Insignias educativas.
 *
 * Cada insignia nombra un logro concreto y comprensible. No se otorgan al
 * azar ni por tiempo jugado: siempre representan una competencia demostrada.
 */

import type { BadgeDefinition, GameProgress } from '../types/game';

export const BADGES: BadgeDefinition[] = [
  { id: 'nivel-1', name: 'Aprendiz de Escalas', description: 'Completar el Nivel 1: Longitud cotidiana.', icon: '📏' },
  { id: 'nivel-2', name: 'Maestro de la Masa', description: 'Completar el Nivel 2: Masa y peso cotidiano.', icon: '⚖️' },
  { id: 'nivel-3', name: 'Guardián del Tiempo', description: 'Completar el Nivel 3: Tiempo.', icon: '⏳' },
  { id: 'nivel-4', name: 'Arquitecto del Espacio', description: 'Completar el Nivel 4: Área y volumen.', icon: '📐' },
  { id: 'nivel-5', name: 'Viajero de la Velocidad', description: 'Completar el Nivel 5: Velocidad.', icon: '🚀' },
  { id: 'nivel-6', name: 'Explorador de la Densidad', description: 'Completar el Nivel 6: Densidad.', icon: '🪨' },
  { id: 'nivel-7', name: 'Ingeniero de Energía', description: 'Completar el Nivel 7: Fuerza, presión y energía.', icon: '⚡' },
  { id: 'nivel-8', name: 'Termonauta', description: 'Completar el Nivel 8: Temperatura.', icon: '🌡️' },
  { id: 'nivel-9', name: 'Navegante del SI', description: 'Completar el Nivel 9: Notación científica y prefijos.', icon: '🔬' },
  { id: 'nivel-10', name: 'Maestro Dimensional', description: 'Completar el Nivel 10: Desafíos integradores.', icon: '🏆' },
  { id: 'racha-dorada', name: 'Racha Dorada', description: 'Lograr 10 respuestas correctas consecutivas.', icon: '🔥' },
  { id: 'sin-pistas', name: 'Sin Pistas', description: 'Completar un nivel entero sin usar ninguna pista.', icon: '🧠' },
  { id: 'cientifico-reflexivo', name: 'Científico Reflexivo', description: 'Leer todas las explicaciones de un nivel.', icon: '📖' },
  { id: 'perfeccionista', name: 'Perfeccionista', description: 'Terminar un nivel con 100 % de aciertos.', icon: '💎' },
  { id: 'medio-camino', name: 'A Medio Camino', description: 'Completar cinco niveles.', icon: '🧭' },
  { id: 'laboratorio-completo', name: 'Laboratorio Completo', description: 'Completar las 100 actividades del juego.', icon: '🎓' },
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));

/** Contexto necesario para decidir qué insignias se ganaron. */
export interface BadgeContext {
  progress: GameProgress;
  justFinishedLevel?: number;
  levelAccuracy?: number;
  levelHintsUsed?: number;
  levelExplanationsRead?: number;
  levelActivityCount?: number;
  totalActivityCount: number;
}

/** Devuelve los ids de insignias recién obtenidas (aún no presentes). */
export function evaluateBadges(ctx: BadgeContext): string[] {
  const { progress } = ctx;
  const owned = new Set(progress.badges);
  const earned: string[] = [];

  const award = (id: string) => {
    if (!owned.has(id) && !earned.includes(id)) earned.push(id);
  };

  if (ctx.justFinishedLevel) {
    award(`nivel-${ctx.justFinishedLevel}`);

    if (ctx.levelHintsUsed === 0) award('sin-pistas');
    if (ctx.levelAccuracy === 1) award('perfeccionista');
    if (
      ctx.levelExplanationsRead !== undefined &&
      ctx.levelActivityCount !== undefined &&
      ctx.levelExplanationsRead >= ctx.levelActivityCount
    ) {
      award('cientifico-reflexivo');
    }
  }

  if (progress.stats.bestStreak >= 10) award('racha-dorada');

  const completedLevels = Object.keys(progress.levelResults).length;
  if (completedLevels >= 5) award('medio-camino');

  if (progress.completedActivities.length >= ctx.totalActivityCount) {
    award('laboratorio-completo');
  }

  return earned;
}
