import { describe, expect, it } from 'vitest';
import type { Activity } from '../types/game';
import {
  diagnose,
  isNumericMatch,
  normalizeText,
  parseNumericInput,
  seededShuffle,
  validateAnswer,
} from './validation';

const numericActivity = (over: Partial<Activity> = {}): Activity => ({
  id: 'v-1',
  levelId: 1,
  title: 'Prueba',
  type: 'numeric',
  flavor: 'reto',
  cognitiveLevel: 'aplicar',
  physicalQuantity: 'Longitud',
  context: '',
  prompt: '',
  unitsInvolved: ['m'],
  correctAnswer: 3500,
  acceptedTolerance: 0.01,
  answerUnit: 'm',
  hint: '',
  basePoints: 100,
  difficulty: 1,
  explanationSteps: [],
  conversionFactor: '',
  phenomenonExplanation: '',
  reflection: '',
  ...over,
});

describe('lectura tolerante de la entrada del usuario', () => {
  it('acepta el punto decimal y la coma decimal', () => {
    expect(parseNumericInput('3.5')).toBe(3.5);
    expect(parseNumericInput('3,5')).toBe(3.5);
  });

  it('ignora espacios y separadores de millar', () => {
    expect(parseNumericInput(' 1 000 ')).toBe(1000);
    expect(parseNumericInput('1,000')).toBe(1000);
  });

  it('acepta notación científica en varias formas', () => {
    expect(parseNumericInput('3.5e3')).toBe(3500);
    expect(parseNumericInput('3.5 x 10^3')).toBe(3500);
    expect(parseNumericInput('3.5 × 10³')).toBe(3500);
    expect(parseNumericInput('4.5e-7')).toBeCloseTo(4.5e-7, 12);
  });

  it('acepta fracciones simples', () => {
    expect(parseNumericInput('5/9')).toBeCloseTo(0.5555, 3);
  });

  it('tolera que el estudiante escriba la unidad', () => {
    expect(parseNumericInput('3500 m')).toBe(3500);
    expect(parseNumericInput('20 m/s')).toBe(20);
  });

  it('acepta números negativos', () => {
    expect(parseNumericInput('-40')).toBe(-40);
  });

  it('devuelve null ante un texto sin número', () => {
    expect(parseNumericInput('no sé')).toBeNull();
    expect(parseNumericInput('')).toBeNull();
  });
});

describe('tolerancia numérica', () => {
  it('acepta desviaciones dentro del margen', () => {
    expect(isNumericMatch(3500.005, 3500, 0.01)).toBe(true);
    expect(isNumericMatch(3500.5, 3500, 0.01)).toBe(false);
  });

  it('aplica tolerancia relativa cuando la actividad lo pide', () => {
    const activity = numericActivity({
      correctAnswer: 4.5e-7,
      acceptedTolerance: 0.01,
      relativeTolerance: true,
    });
    expect(validateAnswer(activity, '4.5e-7').correct).toBe(true);
    expect(validateAnswer(activity, '4.52e-7').correct).toBe(true); // dentro del 1 %
    expect(validateAnswer(activity, '5.5e-7').correct).toBe(false);
  });

  it('pide corregir la entrada cuando no se puede leer, sin marcarla incorrecta', () => {
    const result = validateAnswer(numericActivity(), 'abc');
    expect(result.parseError).toBeTruthy();
    expect(result.correct).toBe(false);
  });
});

describe('comparación de texto', () => {
  it('ignora acentos, mayúsculas y espacios sobrantes', () => {
    expect(normalizeText('  Verdadero ')).toBe('verdadero');
    expect(normalizeText('Falso')).toBe(normalizeText('FALSO'));
    expect(normalizeText('difícil')).toBe('dificil');
  });

  it('valida opciones sin distinguir mayúsculas', () => {
    const activity = numericActivity({
      type: 'true-false',
      correctAnswer: 'Falso',
      choices: ['Verdadero', 'Falso'],
      answerUnit: undefined,
      acceptedTolerance: undefined,
    });
    expect(validateAnswer(activity, 'falso').correct).toBe(true);
    expect(validateAnswer(activity, 'Verdadero').correct).toBe(false);
  });
});

describe('orden y emparejamiento', () => {
  const ordering = numericActivity({
    type: 'ordering',
    correctAnswer: ['mm', 'cm', 'm', 'km'],
    orderingItems: ['m', 'km', 'mm', 'cm'],
  });

  it('exige el orden exacto', () => {
    expect(validateAnswer(ordering, ['mm', 'cm', 'm', 'km']).correct).toBe(true);
    expect(validateAnswer(ordering, ['cm', 'mm', 'm', 'km']).correct).toBe(false);
  });

  it('la baraja determinista conserva todos los elementos', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const shuffled = seededShuffle(items, 12345);
    expect([...shuffled].sort()).toEqual([...items].sort());
    // Determinista: la misma semilla da el mismo resultado
    expect(seededShuffle(items, 12345)).toEqual(shuffled);
  });
});

describe('diagnóstico didáctico del error', () => {
  it('detecta una conversión hecha en la dirección contraria', () => {
    const message = diagnose(0.0035, 3500);
    expect(message).toMatch(/menor de lo esperado/);
  });

  it('detecta el error clásico del factor 3.6 entre m/s y km/h', () => {
    expect(diagnose(72, 20)).toMatch(/3\.6/);
  });

  it('reconoce un simple problema de redondeo', () => {
    expect(diagnose(20.83, 20.833)).toMatch(/redondeo/);
  });
});
