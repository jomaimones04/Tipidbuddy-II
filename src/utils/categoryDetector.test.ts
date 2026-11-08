import { detectCategory } from './categoryDetector';

describe('Category Detector', () => {
  test('should detect exact matches', () => {
    expect(detectCategory('bigas')).toBe('Bigas at Butil (Rice & Grains)');
    expect(detectCategory('kangkong')).toBe('Gulay (Vegetables)');
    expect(detectCategory('saging')).toBe('Prutas (Fruits)');
  });

  test('should detect substring/partial matches', () => {
    expect(detectCategory('fresh bangus')).toBe('Karne at Isda (Meat, Poultry & Seafood)');
    expect(detectCategory('organic brown rice')).toBe('Bigas at Butil (Rice & Grains)');
    expect(detectCategory('purefoods hotdog')).toBe('Karne at Isda (Meat, Poultry & Seafood)');
  });

  test('should be case-insensitive', () => {
    expect(detectCategory('MILO activ-go')).toBe('Inumin (Beverages)');
    expect(detectCategory('CARROTS')).toBe('Gulay (Vegetables)');
    expect(detectCategory('San Miguel Light')).toBe('Inumin (Beverages)');
  });

  test('should detect common English item names despite case and extra spaces', () => {
    expect(detectCategory('  RICE  ')).toBe('Bigas at Butil (Rice & Grains)');
    expect(detectCategory('Bigas')).toBe('Bigas at Butil (Rice & Grains)');
    expect(detectCategory('CHICKEN   BREAST')).toBe(
      'Karne at Isda (Meat, Poultry & Seafood)'
    );
    expect(detectCategory('Pork')).toBe('Karne at Isda (Meat, Poultry & Seafood)');
    expect(detectCategory('Beef')).toBe('Karne at Isda (Meat, Poultry & Seafood)');
    expect(detectCategory('Fish')).toBe('Karne at Isda (Meat, Poultry & Seafood)');
    expect(detectCategory('Tomato')).toBe('Gulay (Vegetables)');
    expect(detectCategory('Vegetables')).toBe('Gulay (Vegetables)');
    expect(detectCategory('Apple')).toBe('Prutas (Fruits)');
    expect(detectCategory('Banana')).toBe('Prutas (Fruits)');
    expect(detectCategory('Cooking   Oil')).toBe('Luto (Cooking Essentials)');
  });

  test('should categorize Nature Spring barcode product names as beverages', () => {
    expect(detectCategory('Nature Spring 350ml')).toBe('Inumin (Beverages)');
    expect(detectCategory("Nature's Spring Purified Water")).toBe('Inumin (Beverages)');
    expect(detectCategory('Natures Spring Mineral Water')).toBe('Inumin (Beverages)');
  });

  test('should prioritize the longest/most specific keyword to prevent false positives', () => {
    // 'puso ng saging' matches both 'puso ng saging' (Gulay) and 'saging' (Prutas).
    // It should prioritize 'puso ng saging' and return Gulay.
    expect(detectCategory('puso ng saging')).toBe('Gulay (Vegetables)');
    expect(detectCategory('fresh puso ng saging')).toBe('Gulay (Vegetables)');
  });

  test('should fallback to "Others" for unknown or unmatched items', () => {
    expect(detectCategory('unknown product 123')).toBe('Others');
    expect(detectCategory('')).toBe('Others');
  });
});
