// Unit tests for utility functions

import {
  formatPeso,
  formatPesoAmount,
  parsePesoString,
  calculatePriceTrend,
  getTrendIcon,
  generateCSV,
  parseVoiceInput,
  isValidPrice,
  isValidQuantity,
} from './index';

describe('Peso Formatting', () => {
  test('formatPeso should return peso currency format', () => {
    expect(formatPeso(1234.5)).toBe('₱1,234.50');
  });

  test('formatPesoAmount should format number without currency', () => {
    const result = formatPesoAmount(1234.5);
    expect(result).toContain('1,234.50');
  });

  test('parsePesoString should parse peso string to number', () => {
    expect(parsePesoString('₱1,234.50')).toBe(1234.5);
  });
});

describe('Price Trend', () => {
  test('calculatePriceTrend should return "up" for price increase', () => {
    expect(calculatePriceTrend(100, 106)).toBe('up');
  });

  test('calculatePriceTrend should return "down" for price decrease', () => {
    expect(calculatePriceTrend(100, 94)).toBe('down');
  });

  test('calculatePriceTrend should return "stable" for small change', () => {
    expect(calculatePriceTrend(100, 103)).toBe('stable');
  });

  test('getTrendIcon should return correct icon', () => {
    expect(getTrendIcon('up')).toBe('↑');
    expect(getTrendIcon('down')).toBe('↓');
    expect(getTrendIcon('stable')).toBe('→');
  });
});

describe('CSV Export', () => {
  test('generateCSV should create valid CSV', () => {
    const items = [
      {
        name: 'Bigas',
        category: 'Grains',
        quantity: 2,
        unit: 'kg',
        actualPrice: 120,
      },
    ];
    const csv = generateCSV('Weekly Shop', items, 1320, 1500, 'SM', '2025-06-01');
    expect(csv).toContain('Date,Cart Name,Store');
    expect(csv).toContain('Bigas');
  });
});

describe('Validation', () => {
  test('isValidPrice should validate price', () => {
    expect(isValidPrice(100)).toBe(true);
    expect(isValidPrice(-10)).toBe(false);
    expect(isValidPrice('abc')).toBe(false);
  });

  test('isValidQuantity should validate quantity', () => {
    expect(isValidQuantity(5)).toBe(true);
    expect(isValidQuantity(0)).toBe(false);
    expect(isValidQuantity(-1)).toBe(false);
  });
});

describe('Voice Input Parser', () => {
  test('parseVoiceInput should extract quantity and unit', () => {
    const result = parseVoiceInput('2 kilo ng bigas');
    expect(result.quantity).toBe(2);
    expect(result.unit).toContain('kilo');
  });

  test('parseVoiceInput should extract price', () => {
    const result = parseVoiceInput('80 piso');
    expect(result.price).toBe(80);
  });
});
