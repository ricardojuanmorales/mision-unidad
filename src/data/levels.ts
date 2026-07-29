/**
 * Índice de niveles del juego.
 *
 * Cada nivel vive en su propio archivo para que sea fácil revisarlo,
 * corregirlo o traducirlo sin tocar el resto del contenido.
 */

import type { Activity, Level } from '../types/game';
import { level01 } from './levels/level01';
import { level02 } from './levels/level02';
import { level03 } from './levels/level03';
import { level04 } from './levels/level04';
import { level05 } from './levels/level05';
import { level06 } from './levels/level06';
import { level07 } from './levels/level07';
import { level08 } from './levels/level08';
import { level09 } from './levels/level09';
import { level10 } from './levels/level10';

export const LEVELS: Level[] = [
  level01,
  level02,
  level03,
  level04,
  level05,
  level06,
  level07,
  level08,
  level09,
  level10,
];

/** Todas las actividades del juego en una sola lista. */
export const ALL_ACTIVITIES: Activity[] = LEVELS.flatMap((l) => l.activities);

export const TOTAL_LEVELS = LEVELS.length;
export const TOTAL_ACTIVITIES = ALL_ACTIVITIES.length;

export function getLevel(id: number): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function getActivity(id: string): Activity | undefined {
  return ALL_ACTIVITIES.find((a) => a.id === id);
}

/** Etiqueta legible para cada tipo de actividad (se muestra en la tarjeta). */
export const TYPE_LABELS: Record<Activity['type'], string> = {
  numeric: 'Respuesta numérica',
  'multiple-choice': 'Selección múltiple',
  'true-false': 'Verdadero o falso',
  ordering: 'Ordenar',
  matching: 'Emparejar',
  'error-correction': 'Corrige el error',
  'multi-step': 'Varios pasos',
};

/** Etiqueta legible para el sabor narrativo. */
export const FLAVOR_LABELS: Record<Activity['flavor'], string> = {
  reto: 'Reto',
  laboratorio: 'Reto de laboratorio',
  misión: 'Misión narrativa',
  relámpago: 'Problema relámpago',
  estimación: 'Estimación razonable',
  inversa: 'Conversión inversa',
  caso: 'Mini caso aplicado',
  detective: 'Modo detective',
};
