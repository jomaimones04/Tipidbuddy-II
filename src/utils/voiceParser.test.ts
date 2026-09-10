import { parseVoiceInput } from './voiceParser';

describe('parseVoiceInput', () => {
  test('Bigas defaults to 1 pcs and rice category', () => {
    const result = parseVoiceInput('Bigas');
    expect(result.name).toBe('Bigas');
    expect(result.quantity).toBe(1);
    expect(result.unit).toBe('pcs');
    expect(result.category).toBe('Bigas at Butil (Rice & Grains)');
  });

  test('Bigas 5 kilo', () => {
    const result = parseVoiceInput('Bigas 5 kilo');
    expect(result.name).toBe('Bigas');
    expect(result.quantity).toBe(5);
    expect(result.unit).toBe('kg');
  });

  test('5 kilo ng bigas', () => {
    const result = parseVoiceInput('5 kilo ng bigas');
    expect(result.name).toBe('Bigas');
    expect(result.quantity).toBe(5);
    expect(result.unit).toBe('kg');
  });

  test('Dalawang kilo ng asukal', () => {
    const result = parseVoiceInput('Dalawang kilo ng asukal');
    expect(result.name).toBe('Asukal');
    expect(result.quantity).toBe(2);
    expect(result.unit).toBe('kg');
    expect(result.category).toBe('Pampalasa (Condiments & Spices)');
  });

  test('3 bote ng mantika', () => {
    const result = parseVoiceInput('3 bote ng mantika');
    expect(result.name).toBe('Mantika');
    expect(result.quantity).toBe(3);
    expect(result.unit).toBe('bottle');
    expect(result.category).toBe('Luto (Cooking Essentials)');
  });

  test('Isang dosenang itlog', () => {
    const result = parseVoiceInput('Isang dosenang itlog');
    expect(result.name).toBe('Itlog');
    expect(result.quantity).toBe(1);
    expect(result.unit).toBe('dozen');
    expect(result.category).toBe('Dairy at Itlog (Dairy & Eggs)');
  });

  test('2 packs ng noodles', () => {
    const result = parseVoiceInput('2 packs ng noodles');
    expect(result.name).toBe('Noodles');
    expect(result.quantity).toBe(2);
    expect(result.unit).toBe('pack');
    expect(result.category).toBe('Pagkain sa Lata at Instant (Canned & Instant Foods)');
  });

  test('milk 2 liters', () => {
    const result = parseVoiceInput('milk 2 liters');
    expect(result.name).toBe('Milk');
    expect(result.quantity).toBe(2);
    expect(result.unit).toBe('L');
    expect(result.category).toBe('Inumin (Beverages)');
  });

  test('bumili ako ng limang kilo ng bigas', () => {
    const result = parseVoiceInput('bumili ako ng limang kilo ng bigas');
    expect(result.name).toBe('Bigas');
    expect(result.quantity).toBe(5);
    expect(result.unit).toBe('kg');
  });

  test('unknown product uses Others', () => {
    const result = parseVoiceInput('xyzzy 2 packs');
    expect(result.name).toBe('Xyzzy');
    expect(result.quantity).toBe(2);
    expect(result.unit).toBe('pack');
    expect(result.category).toBe('Others');
  });

  test('extracts peso price', () => {
    const result = parseVoiceInput('80 piso');
    expect(result.price).toBe(80);
  });
});
