import { describe, expect, it } from 'vitest';
import {
  convert,
  convertDensity,
  convertEnergy,
  convertLength,
  convertMass,
  convertPrefix,
  convertPressure,
  convertSpeed,
  convertTemperature,
  convertTemperatureDelta,
  convertTime,
  convertVolume,
  formatScientific,
  kineticEnergy,
  potentialEnergy,
  toScientific,
} from './conversions';

describe('conversiones lineales', () => {
  it('convierte longitudes en ambas direcciones', () => {
    expect(convertLength(3.5, 'km', 'm')).toBe(3500);
    expect(convertLength(45000, 'mm', 'm')).toBe(45);
    expect(convertLength(1, 'in', 'cm')).toBeCloseTo(2.54, 10);
    expect(convertLength(1, 'km', 'cm')).toBe(100000);
  });

  it('convierte masas', () => {
    expect(convertMass(2.5, 'g', 'mg')).toBeCloseTo(2500, 6);
    expect(convertMass(3.2, 't', 'kg')).toBeCloseTo(3200, 6);
    expect(convertMass(5, 'lb', 'kg')).toBeCloseTo(2.268, 3);
  });

  it('convierte tiempos con base 60 y 24', () => {
    expect(convertTime(90, 'min', 's')).toBe(5400);
    expect(convertTime(1, 'd', 's')).toBe(86400);
    expect(convertTime(12600, 's', 'h')).toBe(3.5);
    expect(convertTime(1, 'sem', 's')).toBe(604800);
  });

  it('convierte áreas elevando el factor al cuadrado', () => {
    expect(convert(5, 'm²', 'cm²', 'area')).toBeCloseTo(50000, 6);
    expect(convert(1, 'km²', 'm²', 'area')).toBeCloseTo(1e6, 6);
  });

  it('convierte volúmenes elevando el factor al cubo', () => {
    expect(convertVolume(2.5, 'L', 'mL')).toBeCloseTo(2500, 6);
    expect(convertVolume(1, 'mL', 'cm³')).toBeCloseTo(1, 12);
    expect(convertVolume(45000, 'cm³', 'm³')).toBeCloseTo(0.045, 10);
    expect(convertVolume(1, 'm³', 'L')).toBeCloseTo(1000, 6);
  });

  it('convierte rapideces con el factor 3.6', () => {
    expect(convertSpeed(72, 'km/h', 'm/s')).toBeCloseTo(20, 10);
    expect(convertSpeed(25, 'm/s', 'km/h')).toBeCloseTo(90, 10);
    expect(convertSpeed(60, 'mph', 'km/h')).toBeCloseTo(96.56, 2);
    expect(convertSpeed(15, 'm/s', 'cm/s')).toBeCloseTo(1500, 6);
  });

  it('convierte densidades', () => {
    expect(convertDensity(2.7, 'g/cm³', 'kg/m³')).toBeCloseTo(2700, 6);
    expect(convertDensity(13600, 'kg/m³', 'g/cm³')).toBeCloseTo(13.6, 10);
    // 1 kg/L y 1 g/mL son numéricamente idénticos
    expect(convertDensity(0.92, 'kg/L', 'g/mL')).toBeCloseTo(0.92, 10);
  });

  it('convierte presiones', () => {
    expect(convertPressure(250, 'kPa', 'Pa')).toBeCloseTo(250000, 6);
    expect(convertPressure(2, 'atm', 'kPa')).toBeCloseTo(202.65, 6);
    expect(convertPressure(1, 'atm', 'Pa')).toBeCloseTo(101325, 6);
  });

  it('convierte energías', () => {
    expect(convertEnergy(3.5, 'MJ', 'kJ')).toBeCloseTo(3500, 6);
    expect(convertEnergy(2500, 'J', 'kJ')).toBeCloseTo(2.5, 10);
    expect(convertEnergy(1, 'kWh', 'MJ')).toBeCloseTo(3.6, 10);
  });

  it('lanza un error claro ante una unidad desconocida', () => {
    expect(() => convertLength(1, 'parsec', 'm')).toThrow(/Unidad desconocida/);
  });

  it('es reversible: ida y vuelta devuelve el valor original', () => {
    const value = 7.31;
    expect(convertLength(convertLength(value, 'km', 'mm'), 'mm', 'km')).toBeCloseTo(value, 10);
    expect(convertEnergy(convertEnergy(value, 'kJ', 'cal'), 'cal', 'kJ')).toBeCloseTo(value, 10);
  });
});

describe('temperatura: escalas con origen desplazado', () => {
  it('convierte Celsius a Kelvin sumando 273.15', () => {
    expect(convertTemperature(25, '°C', 'K')).toBeCloseTo(298.15, 10);
    expect(convertTemperature(0, '°C', 'K')).toBeCloseTo(273.15, 10);
  });

  it('convierte Kelvin a Celsius', () => {
    expect(convertTemperature(300, 'K', '°C')).toBeCloseTo(26.85, 10);
    expect(convertTemperature(0, 'K', '°C')).toBeCloseTo(-273.15, 10);
  });

  it('convierte Celsius a Fahrenheit con los puntos de referencia del agua', () => {
    expect(convertTemperature(0, '°C', '°F')).toBeCloseTo(32, 10);
    expect(convertTemperature(100, '°C', '°F')).toBeCloseTo(212, 10);
    expect(convertTemperature(20, '°C', '°F')).toBeCloseTo(68, 10);
  });

  it('convierte Fahrenheit a Celsius', () => {
    expect(convertTemperature(98.6, '°F', '°C')).toBeCloseTo(37, 8);
    expect(convertTemperature(32, '°F', '°C')).toBeCloseTo(0, 10);
  });

  it('encuentra el punto donde ambas escalas coinciden', () => {
    expect(convertTemperature(-40, '°C', '°F')).toBeCloseTo(-40, 10);
  });

  it('distingue un intervalo de una temperatura', () => {
    // 25 grados de DIFERENCIA en Celsius son 45 en Fahrenheit (sin sumar 32)
    expect(convertTemperatureDelta(25, '°C', '°F')).toBeCloseTo(45, 10);
    // Y coincide con restar las dos temperaturas ya convertidas
    const diff = convertTemperature(40, '°C', '°F') - convertTemperature(15, '°C', '°F');
    expect(diff).toBeCloseTo(45, 10);
    // Un intervalo en Celsius equivale al mismo intervalo en Kelvin
    expect(convertTemperatureDelta(25, '°C', 'K')).toBeCloseTo(25, 10);
  });
});

describe('prefijos del SI y notación científica', () => {
  it('convierte entre prefijos', () => {
    expect(convertPrefix(2.5, 'giga', 'mega')).toBeCloseTo(2500, 6);
    expect(convertPrefix(5, 'micro', 'nano')).toBeCloseTo(5000, 6);
    expect(convertPrefix(1, 'kilo', 'mili')).toBeCloseTo(1e6, 6);
  });

  it('descompone en mantisa y exponente', () => {
    expect(toScientific(3500)).toEqual({ mantissa: 3.5, exponent: 3 });
    const small = toScientific(0.00000045);
    expect(small.exponent).toBe(-7);
    expect(small.mantissa).toBeCloseTo(4.5, 10);
  });

  it('formatea con superíndices legibles', () => {
    expect(formatScientific(3500)).toBe('3.5 × 10³');
    expect(formatScientific(0.00000045)).toBe('4.5 × 10⁻⁷');
  });
});

describe('relaciones físicas derivadas', () => {
  it('calcula energía potencial', () => {
    expect(potentialEnergy(2, 10, 9.8)).toBeCloseTo(196, 10);
  });

  it('calcula energía cinética con dependencia cuadrática', () => {
    expect(kineticEnergy(1200, 20)).toBeCloseTo(240000, 6);
    // Duplicar la rapidez cuadruplica la energía
    expect(kineticEnergy(1200, 40)).toBeCloseTo(4 * kineticEnergy(1200, 20), 6);
  });
});
