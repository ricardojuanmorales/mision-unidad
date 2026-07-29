/**
 * Control de calidad del contenido educativo.
 *
 * Estas pruebas no verifican el código: verifican las 100 actividades.
 * Un error tipográfico en una respuesta correcta enseñaría física
 * equivocada a un estudiante, así que cada respuesta numérica se
 * RECALCULA aquí de forma independiente con el motor de conversiones.
 */

import { describe, expect, it } from 'vitest';
import { ALL_ACTIVITIES, LEVELS, TOTAL_ACTIVITIES, TOTAL_LEVELS } from './levels';
import {
  convert,
  convertPrefix,
  convertTemperature,
  convertTemperatureDelta,
  kineticEnergy,
  potentialEnergy,
} from '../utils/conversions';
import { validateAnswer } from '../utils/validation';

describe('estructura del juego', () => {
  it('tiene exactamente 10 niveles', () => {
    expect(TOTAL_LEVELS).toBe(10);
  });

  it('cada nivel tiene exactamente 10 actividades', () => {
    for (const level of LEVELS) {
      expect(level.activities, `Nivel ${level.id}`).toHaveLength(10);
    }
  });

  it('suma 100 actividades en total', () => {
    expect(TOTAL_ACTIVITIES).toBe(100);
  });

  it('los niveles están numerados del 1 al 10 sin huecos', () => {
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('todos los identificadores de actividad son únicos', () => {
    const ids = ALL_ACTIVITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada actividad declara el nivel al que pertenece', () => {
    for (const level of LEVELS) {
      for (const activity of level.activities) {
        expect(activity.levelId, activity.id).toBe(level.id);
      }
    }
  });
});

describe('integridad pedagógica de cada actividad', () => {
  it.each(ALL_ACTIVITIES.map((a) => [a.id, a] as const))(
    '%s tiene todos los campos educativos completos',
    (_id, activity) => {
      expect(activity.title.length).toBeGreaterThan(3);
      expect(activity.context.length).toBeGreaterThan(20);
      expect(activity.prompt.length).toBeGreaterThan(10);
      expect(activity.hint.length).toBeGreaterThan(10);
      expect(activity.unitsInvolved.length).toBeGreaterThan(0);
      expect(activity.basePoints).toBeGreaterThan(0);
      expect(activity.difficulty).toBeGreaterThanOrEqual(1);
      expect(activity.difficulty).toBeLessThanOrEqual(5);

      // El corazón del juego: nunca se entrega una actividad sin explicación
      expect(activity.explanationSteps.length).toBeGreaterThanOrEqual(2);
      expect(activity.conversionFactor.length).toBeGreaterThan(3);
      expect(activity.phenomenonExplanation.length).toBeGreaterThan(40);
      expect(activity.reflection.length).toBeGreaterThan(10);
    }
  );

  it('la pista nunca contiene la respuesta numérica literal', () => {
    for (const activity of ALL_ACTIVITIES) {
      if (typeof activity.correctAnswer !== 'number') continue;
      const answerText = String(activity.correctAnswer);
      // Se ignoran respuestas de una sola cifra: "1" o "3" aparecen en
      // cualquier explicación legítima ("1 m = 100 cm").
      if (answerText.replace('-', '').length < 3) continue;
      expect(activity.hint, `${activity.id}: la pista revela la respuesta`).not.toContain(
        answerText
      );
    }
  });

  it('las actividades de opción incluyen la respuesta correcta entre sus opciones', () => {
    const choiceTypes = ['multiple-choice', 'true-false', 'error-correction'];
    for (const activity of ALL_ACTIVITIES) {
      if (!choiceTypes.includes(activity.type)) continue;
      expect(activity.choices, activity.id).toBeDefined();
      expect(activity.choices!.length, activity.id).toBeGreaterThanOrEqual(2);
      expect(activity.choices, activity.id).toContain(String(activity.correctAnswer));
      // Sin opciones duplicadas
      expect(new Set(activity.choices).size, activity.id).toBe(activity.choices!.length);
    }
  });

  it('las actividades de ordenar contienen los mismos elementos que la solución', () => {
    for (const activity of ALL_ACTIVITIES) {
      if (activity.type !== 'ordering') continue;
      const items = [...(activity.orderingItems ?? [])].sort();
      const answer = [...(activity.correctAnswer as string[])].sort();
      expect(items, activity.id).toEqual(answer);
    }
  });

  it('las actividades de emparejar ofrecen la opción correcta en cada fila', () => {
    for (const activity of ALL_ACTIVITIES) {
      if (activity.type !== 'matching') continue;
      const answers = activity.correctAnswer as string[];
      expect(activity.matchingPairs, activity.id).toHaveLength(answers.length);
      activity.matchingPairs!.forEach((pair, i) => {
        expect(pair.options, `${activity.id} fila ${i}`).toContain(answers[i]);
      });
    }
  });

  it('las actividades numéricas declaran unidad de respuesta y tolerancia', () => {
    for (const activity of ALL_ACTIVITIES) {
      if (activity.type !== 'numeric' && activity.type !== 'multi-step') continue;
      expect(typeof activity.correctAnswer, activity.id).toBe('number');
      expect(activity.answerUnit, activity.id).toBeTruthy();
      expect(activity.acceptedTolerance, activity.id).toBeGreaterThan(0);
    }
  });

  it('la dificultad crece, en promedio, con el número de nivel', () => {
    const averages = LEVELS.map(
      (l) => l.activities.reduce((s, a) => s + a.difficulty, 0) / l.activities.length
    );
    const firstThree = (averages[0] + averages[1] + averages[2]) / 3;
    const lastThree = (averages[7] + averages[8] + averages[9]) / 3;
    expect(lastThree).toBeGreaterThan(firstThree);
  });

  it('usa una variedad razonable de tipos de actividad', () => {
    const types = new Set(ALL_ACTIVITIES.map((a) => a.type));
    expect(types.size).toBeGreaterThanOrEqual(6);
    for (const level of LEVELS) {
      const levelTypes = new Set(level.activities.map((a) => a.type));
      expect(levelTypes.size, `Nivel ${level.id} repite demasiado el formato`).toBeGreaterThanOrEqual(4);
    }
  });
});

/**
 * Verificación matemática independiente.
 *
 * Cada respuesta numérica se vuelve a calcular desde los datos del enunciado
 * usando el motor de conversiones, sin mirar el valor guardado. Si alguna
 * discrepa, la prueba falla y el estudiante nunca ve el error.
 */
describe('verificación matemática de las respuestas numéricas', () => {
  const expected: Record<string, number> = {
    // Nivel 1 — longitud
    'n1-a1': convert(1.2, 'm', 'cm', 'length'),
    'n1-a4': convert(45000, 'mm', 'm', 'length'),
    'n1-a7': convert(1.38, 'm', 'mm', 'length'),
    'n1-a8': convert(12, 'in', 'cm', 'length'),
    'n1-a10': convert(12 * 400, 'm', 'km', 'length'),

    // Nivel 2 — masa
    'n2-a1': convert(2.5, 'g', 'mg', 'mass'),
    'n2-a3': convert(3.2, 't', 'kg', 'mass'),
    'n2-a5': convert(15 * 40, 'mg', 'g', 'mass'),
    'n2-a7': convert(5, 'lb', 'kg', 'mass'),
    'n2-a10': convert(25 * 250, 'g', 'kg', 'mass'),

    // Nivel 3 — tiempo
    'n3-a1': convert(90, 'min', 's', 'time'),
    'n3-a4': convert(12600, 's', 'h', 'time'),
    'n3-a7': 72 * convert(24, 'h', 'min', 'time'),
    'n3-a8': convert(3, 'sem', 'd', 'time'),
    'n3-a10': convert(500, 's', 'min', 'time'),

    // Nivel 4 — área y volumen
    'n4-a1': convert(5, 'm²', 'cm²', 'area'),
    'n4-a3': convert(2.5, 'L', 'mL', 'volume'),
    'n4-a7': convert(45000, 'cm³', 'm³', 'volume'),
    'n4-a8': convert(2 * 1.5 * 0.8, 'm³', 'L', 'volume'),
    'n4-a10': convert(28 * 15, 'm²', 'cm²', 'area'),

    // Nivel 5 — rapidez
    'n5-a1': convert(72, 'km/h', 'm/s', 'speed'),
    'n5-a6': convert(60, 'mph', 'km/h', 'speed'),
    'n5-a7': convert(15, 'm/s', 'cm/s', 'speed'),
    'n5-a8': convert(150 / 2, 'km/h', 'm/s', 'speed'),
    'n5-a10': convert(90, 'km/h', 'm/s', 'speed') * 1.5,

    // Nivel 6 — densidad
    'n6-a1': convert(2.7, 'g/cm³', 'kg/m³', 'density'),
    'n6-a4': 500 / 200,
    'n6-a6': convert(13600, 'kg/m³', 'g/cm³', 'density'),
    'n6-a8': convert(2.7 / 2700, 'm³', 'L', 'volume'),
    'n6-a9': convert(0.92, 'kg/L', 'g/mL', 'density'),
    'n6-a10': 1200 / 1500,

    // Nivel 7 — fuerza, presión, energía
    'n7-a1': convert(4.5, 'kN', 'N', 'force'),
    'n7-a2': 50 * 9.8,
    'n7-a3': convert(250, 'kPa', 'Pa', 'pressure'),
    'n7-a5': convert(600 / 0.15, 'Pa', 'kPa', 'pressure'),
    'n7-a6': convert(3.5, 'MJ', 'kJ', 'energy'),
    'n7-a8': convert(250 * 12, 'J', 'kJ', 'energy'),
    'n7-a10': potentialEnergy(2, 10, 9.8),

    // Nivel 8 — temperatura
    'n8-a1': convertTemperature(25, '°C', 'K'),
    'n8-a2': convertTemperature(100, '°C', '°F'),
    'n8-a3': convertTemperature(98.6, '°F', '°C'),
    'n8-a6': convertTemperature(300, 'K', '°C'),
    'n8-a8': convertTemperatureDelta(40 - 15, '°C', '°F'),
    'n8-a9': -40,

    // Nivel 9 — prefijos y notación científica
    'n9-a1': convertPrefix(2.5, 'giga', 'mega'),
    'n9-a2': convert(450, 'nm', 'm', 'length'),
    'n9-a7': convert(7, 'µm', 'nm', 'length'),
    'n9-a8': convert(3.2e5, 'm', 'km', 'length'),
    'n9-a10': 1.5e11 / 1e9,

    // Nivel 10 — compuestas
    'n10-a1': 0.75 * 500,
    'n10-a2': convert(25 * convert(4, 'min', 's', 'time'), 'm', 'km', 'length'),
    'n10-a3': 2000 / 0.5,
    'n10-a4': convert(2, 'atm', 'kPa', 'pressure'),
    'n10-a5': (8 / 100) * 250,
    'n10-a7': convert(2.5, 'L', 'mL', 'volume') / convert(1, 'min', 's', 'time'),
    'n10-a8': convert(
      kineticEnergy(1200, convert(72, 'km/h', 'm/s', 'speed')),
      'J',
      'kJ',
      'energy'
    ),
    'n10-a10': convert(
      convert(25 * 10 * 2, 'm³', 'L', 'volume') / 200,
      'min',
      'h',
      'time'
    ),
  };

  it('cubre todas las actividades numéricas del juego', () => {
    const numericIds = ALL_ACTIVITIES.filter(
      (a) => a.type === 'numeric' || a.type === 'multi-step'
    ).map((a) => a.id);
    const covered = Object.keys(expected);
    const missing = numericIds.filter((id) => !covered.includes(id));
    expect(missing, `Sin verificación matemática: ${missing.join(', ')}`).toHaveLength(0);
  });

  it.each(Object.entries(expected))(
    '%s: la respuesta guardada coincide con el cálculo independiente',
    (id, computed) => {
      const activity = ALL_ACTIVITIES.find((a) => a.id === id);
      expect(activity, `No existe la actividad ${id}`).toBeDefined();
      const stored = Number(activity!.correctAnswer);
      const tolerance = activity!.relativeTolerance
        ? Math.abs(computed) * activity!.acceptedTolerance!
        : activity!.acceptedTolerance!;
      expect(Math.abs(stored - computed)).toBeLessThanOrEqual(tolerance);
    }
  );
});

describe('el validador acepta las respuestas correctas de las 100 actividades', () => {
  it.each(ALL_ACTIVITIES.map((a) => [a.id, a] as const))(
    '%s se valida como correcta al responder la solución oficial',
    (_id, activity) => {
      const answer = Array.isArray(activity.correctAnswer)
        ? activity.correctAnswer
        : String(activity.correctAnswer);
      const result = validateAnswer(activity, answer);
      expect(result.parseError).toBeUndefined();
      expect(result.correct).toBe(true);
    }
  );

  it('rechaza una respuesta claramente equivocada en las actividades numéricas', () => {
    for (const activity of ALL_ACTIVITIES) {
      if (activity.type !== 'numeric' && activity.type !== 'multi-step') continue;
      const wrong = String(Number(activity.correctAnswer) * 10 + 7);
      expect(validateAnswer(activity, wrong).correct, activity.id).toBe(false);
    }
  });
});
