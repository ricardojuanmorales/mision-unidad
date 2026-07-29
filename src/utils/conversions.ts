/**
 * Motor de conversiones.
 *
 * Una sola función genérica (`convert`) resuelve longitud, masa, tiempo,
 * área, volumen, rapidez, densidad, fuerza, presión y energía, porque todas
 * son conversiones lineales sin desplazamiento de origen.
 *
 * La temperatura se trata aparte: las escalas Celsius y Fahrenheit tienen
 * el cero en puntos distintos, así que requieren fórmulas afines (mx + b),
 * no un simple factor multiplicativo. Esa diferencia es, en sí misma,
 * uno de los conceptos que el Nivel 8 debe enseñar.
 */

import {
  FACTOR_TABLES,
  SI_PREFIXES,
  CONSTANTS,
  type QuantityKind,
  type FactorTable,
} from '../data/conversionFactors';

export class ConversionError extends Error {}

/** Devuelve el factor de una unidad dentro de una magnitud. */
export function factorOf(kind: QuantityKind, unit: string): number {
  const table: FactorTable = FACTOR_TABLES[kind];
  const factor = table[unit];
  if (factor === undefined) {
    throw new ConversionError(`Unidad desconocida para ${kind}: "${unit}"`);
  }
  return factor;
}

/**
 * Convierte `value` de la unidad `from` a la unidad `to` dentro de una magnitud.
 * Ejemplo: convert(3.5, 'km', 'm', 'length') === 3500
 */
export function convert(
  value: number,
  from: string,
  to: string,
  kind: QuantityKind
): number {
  return (value * factorOf(kind, from)) / factorOf(kind, to);
}

/** Atajos legibles por magnitud (azúcar sintáctico sobre `convert`). */
export const convertLength = (v: number, f: string, t: string) => convert(v, f, t, 'length');
export const convertMass = (v: number, f: string, t: string) => convert(v, f, t, 'mass');
export const convertTime = (v: number, f: string, t: string) => convert(v, f, t, 'time');
export const convertArea = (v: number, f: string, t: string) => convert(v, f, t, 'area');
export const convertVolume = (v: number, f: string, t: string) => convert(v, f, t, 'volume');
export const convertSpeed = (v: number, f: string, t: string) => convert(v, f, t, 'speed');
export const convertDensity = (v: number, f: string, t: string) => convert(v, f, t, 'density');
export const convertForce = (v: number, f: string, t: string) => convert(v, f, t, 'force');
export const convertPressure = (v: number, f: string, t: string) => convert(v, f, t, 'pressure');
export const convertEnergy = (v: number, f: string, t: string) => convert(v, f, t, 'energy');

/* ------------------------------------------------------------------ */
/* Temperatura: escalas con origen desplazado                          */
/* ------------------------------------------------------------------ */

export type TemperatureScale = '°C' | 'K' | '°F';

/** Lleva cualquier escala a kelvin, la escala absoluta de referencia. */
function toKelvin(value: number, from: TemperatureScale): number {
  switch (from) {
    case 'K':
      return value;
    case '°C':
      return value - CONSTANTS.absoluteZeroC; // °C + 273.15
    case '°F':
      return ((value - 32) * 5) / 9 - CONSTANTS.absoluteZeroC;
  }
}

/** Lleva kelvin a la escala solicitada. */
function fromKelvin(kelvin: number, to: TemperatureScale): number {
  switch (to) {
    case 'K':
      return kelvin;
    case '°C':
      return kelvin + CONSTANTS.absoluteZeroC; // K - 273.15
    case '°F':
      return ((kelvin + CONSTANTS.absoluteZeroC) * 9) / 5 + 32;
  }
}

/**
 * Convierte temperatura entre °C, K y °F.
 * convertTemperature(100, '°C', '°F') === 212
 */
export function convertTemperature(
  value: number,
  from: TemperatureScale,
  to: TemperatureScale
): number {
  if (from === to) return value;
  return fromKelvin(toKelvin(value, from), to);
}

/**
 * Convierte una DIFERENCIA de temperatura (un intervalo), donde el
 * desplazamiento de origen se cancela y solo importa el tamaño del grado.
 * Un intervalo de 1 °C equivale a 1 K y a 1.8 °F.
 */
export function convertTemperatureDelta(
  value: number,
  from: TemperatureScale,
  to: TemperatureScale
): number {
  const perDegree: Record<TemperatureScale, number> = { '°C': 1, K: 1, '°F': 5 / 9 };
  return (value * perDegree[from]) / perDegree[to];
}

/* ------------------------------------------------------------------ */
/* Prefijos del SI y notación científica                               */
/* ------------------------------------------------------------------ */

/** Convierte entre prefijos del SI: convertPrefix(5, 'kilo', 'mili') === 5e6 */
export function convertPrefix(value: number, from: string, to: string): number {
  const f = SI_PREFIXES[from];
  const t = SI_PREFIXES[to];
  if (f === undefined || t === undefined) {
    throw new ConversionError(`Prefijo del SI desconocido: "${from}" o "${to}"`);
  }
  return (value * f) / t;
}

/** Descompone un número en mantisa (1 ≤ |m| < 10) y exponente. */
export function toScientific(value: number): { mantissa: number; exponent: number } {
  if (value === 0) return { mantissa: 0, exponent: 0 };
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / 10 ** exponent;
  return { mantissa, exponent };
}

/** Reconstruye el número a partir de mantisa y exponente. */
export function fromScientific(mantissa: number, exponent: number): number {
  return mantissa * 10 ** exponent;
}

/** Formatea en notación científica legible: 3500 → "3.5 × 10³" */
export function formatScientific(value: number, decimals = 2): string {
  const { mantissa, exponent } = toScientific(value);
  const superscripts: Record<string, string> = {
    '-': '⁻',
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
  };
  const exp = String(exponent)
    .split('')
    .map((ch) => superscripts[ch] ?? ch)
    .join('');
  return `${trimNumber(mantissa, decimals)} × 10${exp}`;
}

/* ------------------------------------------------------------------ */
/* Relaciones físicas derivadas                                        */
/* ------------------------------------------------------------------ */

/** Densidad = masa / volumen. Unidades base: kg y m³ → kg/m³ */
export const density = (massKg: number, volumeM3: number) => massKg / volumeM3;

/** Masa = densidad × volumen. */
export const massFromDensity = (densityKgM3: number, volumeM3: number) =>
  densityKgM3 * volumeM3;

/** Volumen = masa / densidad. */
export const volumeFromDensity = (massKg: number, densityKgM3: number) =>
  massKg / densityKgM3;

/** Rapidez media = distancia / tiempo. */
export const speed = (distanceM: number, timeS: number) => distanceM / timeS;

/** Peso (fuerza gravitatoria) = masa × g. */
export const weight = (massKg: number, g: number = CONSTANTS.g) => massKg * g;

/** Presión = fuerza / área. */
export const pressure = (forceN: number, areaM2: number) => forceN / areaM2;

/** Trabajo = fuerza × desplazamiento en la dirección de la fuerza. */
export const work = (forceN: number, distanceM: number) => forceN * distanceM;

/** Energía potencial gravitatoria = m·g·h. */
export const potentialEnergy = (massKg: number, heightM: number, g: number = CONSTANTS.g) =>
  massKg * g * heightM;

/** Energía cinética = ½·m·v². */
export const kineticEnergy = (massKg: number, speedMs: number) =>
  0.5 * massKg * speedMs ** 2;

/* ------------------------------------------------------------------ */
/* Utilidades de formato                                               */
/* ------------------------------------------------------------------ */

/** Redondea a n decimales eliminando ceros sobrantes: 3.500 → "3.5" */
export function trimNumber(value: number, decimals = 4): string {
  if (!Number.isFinite(value)) return String(value);
  const rounded = Number(value.toFixed(decimals));
  return String(rounded);
}

/** Redondeo numérico a n decimales (devuelve number, no string). */
export function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
