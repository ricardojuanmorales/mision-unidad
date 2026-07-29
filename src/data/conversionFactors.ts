/**
 * Catálogo central de factores de conversión.
 *
 * Cada magnitud se expresa respecto de una UNIDAD BASE del SI. El valor
 * asociado a cada unidad responde a la pregunta:
 *   "¿cuántas unidades base equivale 1 de esta unidad?"
 *
 * Así, convertir es siempre: valor × factor(origen) ÷ factor(destino).
 * Centralizar los factores evita duplicar lógica y hace que una corrección
 * se propague a todo el juego (y a las pruebas).
 */

export type QuantityKind =
  | 'length'
  | 'mass'
  | 'time'
  | 'area'
  | 'volume'
  | 'speed'
  | 'density'
  | 'force'
  | 'pressure'
  | 'energy';

export type FactorTable = Record<string, number>;

/** Longitud — unidad base: metro (m) */
export const LENGTH: FactorTable = {
  nm: 1e-9,
  µm: 1e-6,
  um: 1e-6,
  mm: 1e-3,
  cm: 1e-2,
  dm: 1e-1,
  m: 1,
  km: 1e3,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
  'año luz': 9.4607304725808e15,
  UA: 1.495978707e11,
};

/** Masa — unidad base: kilogramo (kg) */
export const MASS: FactorTable = {
  µg: 1e-9,
  ug: 1e-9,
  mg: 1e-6,
  g: 1e-3,
  kg: 1,
  t: 1000,
  oz: 0.028349523125,
  lb: 0.45359237,
};

/** Tiempo — unidad base: segundo (s) */
export const TIME: FactorTable = {
  ms: 1e-3,
  s: 1,
  min: 60,
  h: 3600,
  d: 86400,
  sem: 604800,
  año: 31557600, // año juliano de 365.25 días
};

/** Área — unidad base: metro cuadrado (m²) */
export const AREA: FactorTable = {
  'mm²': 1e-6,
  'cm²': 1e-4,
  'm²': 1,
  ha: 1e4,
  'km²': 1e6,
  cuerda: 3930.395625, // cuerda puertorriqueña: 0.9712 acres
  acre: 4046.8564224,
};

/** Volumen — unidad base: metro cúbico (m³) */
export const VOLUME: FactorTable = {
  'mm³': 1e-9,
  mL: 1e-6,
  'cm³': 1e-6,
  L: 1e-3,
  'dm³': 1e-3,
  'm³': 1,
  gal: 0.003785411784, // galón estadounidense
};

/** Rapidez — unidad base: metro por segundo (m/s) */
export const SPEED: FactorTable = {
  'cm/s': 0.01,
  'm/s': 1,
  'km/h': 1 / 3.6,
  'km/s': 1000,
  mph: 0.44704,
  'ft/s': 0.3048,
  nudo: 0.514444444444,
};

/** Densidad — unidad base: kilogramo por metro cúbico (kg/m³) */
export const DENSITY: FactorTable = {
  'kg/m³': 1,
  'g/cm³': 1000,
  'g/mL': 1000,
  'kg/L': 1000,
  'g/L': 1,
  'mg/mL': 1,
};

/** Fuerza — unidad base: newton (N) */
export const FORCE: FactorTable = {
  mN: 1e-3,
  N: 1,
  kN: 1e3,
  MN: 1e6,
  lbf: 4.4482216152605,
  dyn: 1e-5,
};

/** Presión — unidad base: pascal (Pa) */
export const PRESSURE: FactorTable = {
  Pa: 1,
  hPa: 100,
  kPa: 1000,
  MPa: 1e6,
  bar: 1e5,
  atm: 101325,
  mmHg: 133.322387415,
  psi: 6894.757293168,
};

/** Energía — unidad base: joule (J) */
export const ENERGY: FactorTable = {
  mJ: 1e-3,
  J: 1,
  kJ: 1e3,
  MJ: 1e6,
  GJ: 1e9,
  cal: 4.184,
  kcal: 4184,
  Wh: 3600,
  kWh: 3.6e6,
  eV: 1.602176634e-19,
};

/** Tabla maestra por magnitud. */
export const FACTOR_TABLES: Record<QuantityKind, FactorTable> = {
  length: LENGTH,
  mass: MASS,
  time: TIME,
  area: AREA,
  volume: VOLUME,
  speed: SPEED,
  density: DENSITY,
  force: FORCE,
  pressure: PRESSURE,
  energy: ENERGY,
};

/**
 * Prefijos del SI — multiplicador respecto de la unidad sin prefijo.
 * Se usan en el Nivel 9 y en el motor de notación científica.
 */
export const SI_PREFIXES: Record<string, number> = {
  yocto: 1e-24,
  zepto: 1e-21,
  atto: 1e-18,
  femto: 1e-15,
  pico: 1e-12,
  nano: 1e-9,
  micro: 1e-6,
  mili: 1e-3,
  centi: 1e-2,
  deci: 1e-1,
  '(ninguno)': 1,
  deca: 1e1,
  hecto: 1e2,
  kilo: 1e3,
  mega: 1e6,
  giga: 1e9,
  tera: 1e12,
  peta: 1e15,
  exa: 1e18,
};

/** Símbolo de cada prefijo del SI. */
export const SI_PREFIX_SYMBOLS: Record<string, string> = {
  yocto: 'y',
  zepto: 'z',
  atto: 'a',
  femto: 'f',
  pico: 'p',
  nano: 'n',
  micro: 'µ',
  mili: 'm',
  centi: 'c',
  deci: 'd',
  '(ninguno)': '',
  deca: 'da',
  hecto: 'h',
  kilo: 'k',
  mega: 'M',
  giga: 'G',
  tera: 'T',
  peta: 'P',
  exa: 'E',
};

/** Constantes físicas de apoyo usadas en explicaciones y actividades. */
export const CONSTANTS = {
  /** Aceleración de la gravedad estándar (m/s²). */
  g: 9.80665,
  /** Cero absoluto expresado en grados Celsius. */
  absoluteZeroC: -273.15,
  /** Rapidez de la luz en el vacío (m/s). */
  c: 299792458,
  /** Densidad del agua líquida a 4 °C (kg/m³). */
  waterDensity: 1000,
  /** Presión atmosférica estándar (Pa). */
  atmosphere: 101325,
};
