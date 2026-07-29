/**
 * Validación de respuestas.
 *
 * Un principio pedagógico guía este módulo: el estudiante no debe perder
 * puntos por escribir "3,5" en vez de "3.5", por usar notación científica
 * o por dejar un espacio de más. Evaluamos comprensión física, no destreza
 * tecleando.
 */

import type { Activity } from '../types/game';

/**
 * Interpreta la entrada del usuario como número, aceptando:
 *  - coma decimal:            "3,5"      → 3.5
 *  - separadores de millar:   "1 000"    → 1000
 *  - notación científica:     "3.5e3", "3.5 x 10^3", "3.5×10³"
 *  - fracciones simples:      "5/9"      → 0.5555…
 *  - unidad escrita al final: "3500 m"   → 3500
 */
export function parseNumericInput(raw: string): number | null {
  if (raw == null) return null;
  let s = String(raw).trim().toLowerCase();
  if (s === '') return null;

  // Superíndices → dígitos normales (para "10³")
  const superMap: Record<string, string> = {
    '⁻': '-',
    '⁰': '0',
    '¹': '1',
    '²': '2',
    '³': '3',
    '⁴': '4',
    '⁵': '5',
    '⁶': '6',
    '⁷': '7',
    '⁸': '8',
    '⁹': '9',
  };
  s = s.replace(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => superMap[ch] ?? ch);

  // Normaliza multiplicaciones escritas: "3.5 × 10^3" → "3.5e3"
  s = s.replace(/\s*(?:×|x|\*)\s*10\s*\^?\s*/g, 'e');

  // Elimina espacios internos y separadores de millar
  s = s.replace(/\s+/g, '');
  s = s.replace(/(\d)[,](\d{3})\b/g, '$1$2'); // 1,000 → 1000

  // Coma decimal → punto
  s = s.replace(',', '.');

  // Quita cualquier sufijo de unidad al final (letras, °, /, ², ³)
  const match = s.match(/^[-+]?[\d.]+(?:e[-+]?\d+)?(?:\/[-+]?[\d.]+)?/);
  if (!match) return null;
  s = match[0];

  // Fracción simple
  if (s.includes('/')) {
    const [num, den] = s.split('/');
    const n = Number(num);
    const d = Number(den);
    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
    return n / d;
  }

  const value = Number(s);
  return Number.isFinite(value) ? value : null;
}

/** Tolerancia efectiva de una actividad numérica. */
export function toleranceFor(activity: Activity, expected: number): number {
  const declared = activity.acceptedTolerance ?? 0.01;
  if (activity.relativeTolerance) {
    return Math.abs(expected) * declared;
  }
  return declared;
}

/** ¿El valor cae dentro de la tolerancia aceptada? */
export function isNumericMatch(
  userValue: number,
  expected: number,
  tolerance: number
): boolean {
  return Math.abs(userValue - expected) <= tolerance + Number.EPSILON;
}

/** Normaliza texto para comparar opciones: sin acentos, sin mayúsculas. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export interface ValidationResult {
  correct: boolean;
  /** Mensaje amable cuando la respuesta no se pudo interpretar. */
  parseError?: string;
  /** Valor interpretado, útil para mostrar en la retroalimentación. */
  parsedValue?: number | string | string[];
  /** Pista diagnóstica: detecta errores típicos de dirección o de factor. */
  diagnosis?: string;
}

/**
 * Valida la respuesta del usuario según el tipo de actividad.
 * `answer` es el valor crudo recogido por el componente correspondiente.
 */
export function validateAnswer(
  activity: Activity,
  answer: string | string[]
): ValidationResult {
  switch (activity.type) {
    case 'numeric':
    case 'multi-step': {
      const raw = Array.isArray(answer) ? answer[0] : answer;
      if (!raw || String(raw).trim() === '') {
        return { correct: false, parseError: 'Escribe un número para poder revisarlo.' };
      }
      const value = parseNumericInput(raw);
      if (value === null) {
        return {
          correct: false,
          parseError:
            'No pude leer ese número. Usa dígitos, por ejemplo 3500, 3.5 o 3.5e3.',
        };
      }
      const expected = Number(activity.correctAnswer);
      const tol = toleranceFor(activity, expected);
      const correct = isNumericMatch(value, expected, tol);
      return {
        correct,
        parsedValue: value,
        diagnosis: correct ? undefined : diagnose(value, expected),
      };
    }

    case 'ordering': {
      const list = Array.isArray(answer) ? answer : [answer];
      const expected = activity.correctAnswer as string[];
      const correct =
        list.length === expected.length &&
        list.every((item, i) => normalizeText(item) === normalizeText(expected[i]));
      return { correct, parsedValue: list };
    }

    case 'matching': {
      const list = Array.isArray(answer) ? answer : [answer];
      const expected = activity.correctAnswer as string[];
      const correct =
        list.length === expected.length &&
        list.every((item, i) => normalizeText(item ?? '') === normalizeText(expected[i]));
      return { correct, parsedValue: list };
    }

    default: {
      // multiple-choice, true-false, error-correction
      const raw = Array.isArray(answer) ? answer[0] : answer;
      if (!raw) {
        return { correct: false, parseError: 'Selecciona una opción para continuar.' };
      }
      const correct = normalizeText(raw) === normalizeText(String(activity.correctAnswer));
      return { correct, parsedValue: raw };
    }
  }
}

/**
 * Diagnóstico didáctico: cuando el número falla, muchas veces el error no es
 * aritmético sino conceptual — se multiplicó donde había que dividir, o se
 * usó un factor de 10 equivocado. Nombrar el error ayuda más que corregirlo.
 */
export function diagnose(userValue: number, expected: number): string | undefined {
  if (userValue === 0 || expected === 0) return undefined;

  const ratio = userValue / expected;

  // Conversión invertida: se multiplicó en vez de dividir (o al revés)
  const inverseRatio = expected / userValue;
  if (isCloseToPowerOfTen(ratio) && isCloseToPowerOfTen(inverseRatio)) {
    const exponent = Math.round(Math.log10(Math.abs(ratio)));
    if (exponent !== 0) {
      return exponent > 0
        ? `Tu resultado es 10^${exponent} veces mayor de lo esperado. Revisa si multiplicaste cuando debías dividir.`
        : `Tu resultado es 10^${Math.abs(exponent)} veces menor de lo esperado. Revisa hacia qué lado va la conversión.`;
    }
  }

  if (Math.abs(ratio - 3.6) < 0.05 || Math.abs(inverseRatio - 3.6) < 0.05) {
    return 'La diferencia es un factor 3.6: ese es el puente entre m/s y km/h.';
  }

  if (Math.abs(ratio - 1000) < 1 || Math.abs(inverseRatio - 1000) < 1) {
    return 'Te separa un factor de 1000. Repasa el prefijo "kilo" o "mili".';
  }

  if (Math.abs(userValue + expected) < 1e-9) {
    return 'El valor es correcto pero con el signo cambiado.';
  }

  if (Math.abs(ratio - 1) < 0.05) {
    return 'Estás muy cerca: probablemente sea un redondeo. Conserva más decimales durante el cálculo.';
  }

  return undefined;
}

function isCloseToPowerOfTen(value: number): boolean {
  const abs = Math.abs(value);
  if (abs === 0) return false;
  const log = Math.log10(abs);
  return Math.abs(log - Math.round(log)) < 0.02;
}

/** Baraja determinista (para que las opciones no cambien en cada render). */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let s = seed || 1;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Semilla numérica estable a partir del id de una actividad. */
export function seedFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
