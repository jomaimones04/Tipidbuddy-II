import { capitalizeTitle, extractProductName, parseOCRResult, splitQuantityString } from './textCleaner';

describe('capitalizeTitle', () => {
  test('should capitalize simple lowercase names', () => {
    expect(capitalizeTitle('bigas')).toBe('Bigas');
    expect(capitalizeTitle('corned beef')).toBe('Corned Beef');
  });

  test('should capitalize names containing hyphens', () => {
    expect(capitalizeTitle('milo activ-go')).toBe('Milo Activ-Go');
  });

  test('should normalize mixed case text', () => {
    expect(capitalizeTitle('JASMINE RICE')).toBe('Jasmine Rice');
    expect(capitalizeTitle('cHoCo MuChO')).toBe('Choco Mucho');
  });
});

describe('extractProductName', () => {
  test('should extract brand/item name from typical product packaging text', () => {
    const ocrText = 'ARGENTINA\nCORNED BEEF\n150g\n₱45.00';
    expect(extractProductName(ocrText)).toBe('Argentina Corned Beef');
  });

  test('should ignore price lines', () => {
    const ocrText = '₱250.00\nJasmine Rice\nPHP 300\n120';
    expect(extractProductName(ocrText)).toBe('Jasmine Rice');
  });

  test('should ignore quantities and units', () => {
    const ocrText = '5kg\n500ml\n12pcs\nNestle Cream';
    expect(extractProductName(ocrText)).toBe('Nestle Cream');
  });

  test('should ignore store headers and receipt noise words', () => {
    const ocrText = 'SM Supermarket\nDate: 06/05/2026\nSubtotal: 100\nBangus Milkfish';
    expect(extractProductName(ocrText)).toBe('Bangus Milkfish');
  });

  test('should clean special characters but keep letters, numbers, hyphens and parentheses', () => {
    const ocrText = '* # Purefoods Tender Juicy Hotdog (Regular) *';
    expect(extractProductName(ocrText)).toBe('Purefoods Tender Juicy Hotdog (Regular)');
  });

  test('should return empty string if no valid alphabetic product candidate is found', () => {
    expect(extractProductName('12345\n₱150.00\n5kg\n06/05/2026')).toBe('');
    expect(extractProductName('')).toBe('');
  });
});

describe('parseOCRResult', () => {
  test('should parse "Lucky Me Pancit Canton 60g ₱12.00" correctly', () => {
    const result = parseOCRResult('Lucky Me Pancit Canton 60g ₱12.00');
    expect(result.name).toBe('Lucky Me Pancit Canton');
    expect(result.quantity).toBe('60g');
    expect(result.price).toBe('12.00');
  });

  test('should parse "Garlic 1kg ₱80/kg" correctly', () => {
    const result = parseOCRResult('Garlic 1kg ₱80/kg');
    expect(result.name).toBe('Garlic');
    expect(result.quantity).toBe('1kg');
    expect(result.price).toBe('80');
  });

  test('should parse a plain price tag "₱35" correctly', () => {
    const result = parseOCRResult('₱35');
    expect(result.name).toBe('');
    expect(result.quantity).toBe('');
    expect(result.price).toBe('35');
  });

  test('should parse a plain quantity "500g" correctly', () => {
    const result = parseOCRResult('500g');
    expect(result.name).toBe('');
    expect(result.quantity).toBe('500g');
    expect(result.price).toBe('');
  });

  test('should handle Filipino weight words like "kalahating kilo"', () => {
    const result = parseOCRResult('Sibuyas kalahating kilo');
    expect(result.name).toBe('Sibuyas');
    expect(result.quantity).toBe('0.5kg');
  });

  test('should handle Filipino weight words like "isang kilo"', () => {
    const result = parseOCRResult('Bigas isang kilo');
    expect(result.name).toBe('Bigas');
    expect(result.quantity).toBe('1kg');
  });
});

describe('splitQuantityString', () => {
  test('should split standard weight quantity', () => {
    const result = splitQuantityString('500g');
    expect(result.amount).toBe('500');
    expect(result.unit).toBe('g');
  });

  test('should split standard count quantity with spaces', () => {
    const result = splitQuantityString('6 pcs');
    expect(result.amount).toBe('6');
    expect(result.unit).toBe('pcs');
  });

  test('should split standard volume quantity with decimals', () => {
    const result = splitQuantityString('1.5L');
    expect(result.amount).toBe('1.5');
    expect(result.unit).toBe('L');
  });

  test('should return empty amount if not matching', () => {
    const result = splitQuantityString('pack');
    expect(result.amount).toBe('');
    expect(result.unit).toBe('pack');
  });

  test('should handle empty/null input gracefully', () => {
    const result = splitQuantityString('');
    expect(result.amount).toBe('');
    expect(result.unit).toBe('');
  });
});
