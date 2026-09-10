import { detectCategory } from './categoryDetector';

export interface ParsedVoiceItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  price?: number;
}

const NUMBER_WORDS: Array<{ pattern: RegExp; value: number }> = [
  { pattern: /\b(sampung|sampu|ten)\b/gi, value: 10 },
  { pattern: /\b(siyam na|siyam|nine)\b/gi, value: 9 },
  { pattern: /\b(walong|walo|eight)\b/gi, value: 8 },
  { pattern: /\b(pitong|pito|seven)\b/gi, value: 7 },
  { pattern: /\b(anim na|anim|six)\b/gi, value: 6 },
  { pattern: /\b(limang|lima|five)\b/gi, value: 5 },
  { pattern: /\b(apat na|apat|four)\b/gi, value: 4 },
  { pattern: /\b(tatlong|tatlo|three)\b/gi, value: 3 },
  { pattern: /\b(dalawang|dalawa|two)\b/gi, value: 2 },
  { pattern: /\b(isang|isa|one)\b/gi, value: 1 },
];

const UNIT_PATTERNS: Array<{ pattern: RegExp; unit: string }> = [
  { pattern: /\b(kilograms?|kilos?|kilo|kg)\b/gi, unit: 'kg' },
  { pattern: /\b(milliliters?|millilitre|ml)\b/gi, unit: 'mL' },
  { pattern: /\b(liters?|litres?|litro|l)\b/gi, unit: 'L' },
  { pattern: /\b(grams?|gramo|g)\b/gi, unit: 'g' },
  { pattern: /\b(dosenang|dosena|dozens?|dozen)\b/gi, unit: 'dozen' },
  { pattern: /\b(botelya|botes?|bottles?|bottle)\b/gi, unit: 'bottle' },
  { pattern: /\b(pakete|packs?|pack)\b/gi, unit: 'pack' },
  { pattern: /\b(kahon|boxes?|box)\b/gi, unit: 'box' },
  { pattern: /\b(lata|cans?|can)\b/gi, unit: 'can' },
  { pattern: /\b(sachet)\b/gi, unit: 'sachet' },
  { pattern: /\b(tray)\b/gi, unit: 'tray' },
  { pattern: /\b(loaf)\b/gi, unit: 'loaf' },
  { pattern: /\b(piraso|pieces?|piece|pcs|pc)\b/gi, unit: 'pcs' },
];

const FILLER_PATTERN =
  /\b(bumili|pabili|paki|please|add|buy|gusto|meron|may|ako|ko|mo|natin|namin|yung|iyong|ang|mga|para|kay|sa|ng|na|of|for|the|a|an|and|at)\b/gi;

const ATTACHED_UNIT_PATTERN = /(\d+(?:\.\d+)?)(kg|g|ml|l)\b/gi;

const toTitleCase = (value: string): string =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const normalizeAttachedUnits = (input: string): string =>
  input.replace(ATTACHED_UNIT_PATTERN, (_, amount: string, unit: string) => {
    const lower = unit.toLowerCase();
    if (lower === 'ml') return `${amount} ml`;
    if (lower === 'l') return `${amount} liter`;
    return `${amount} ${lower}`;
  });

const extractPrice = (input: string): { price?: number; remaining: string } => {
  const match = input.match(/(\d+(?:\.\d+)?)\s*(piso|pesos?|php|₱)/i);
  if (!match) {
    return { remaining: input };
  }
  return {
    price: parseFloat(match[1]),
    remaining: input.replace(match[0], ' '),
  };
};

const extractUnit = (input: string): { unit: string; remaining: string } => {
  for (const entry of UNIT_PATTERNS) {
    const match = input.match(entry.pattern);
    if (match && match[0]) {
      return {
        unit: entry.unit,
        remaining: input.replace(entry.pattern, ' '),
      };
    }
  }
  return { unit: 'pcs', remaining: input };
};

const extractQuantity = (input: string): { quantity: number; remaining: string } => {
  for (const entry of NUMBER_WORDS) {
    const match = input.match(entry.pattern);
    if (match && match[0]) {
      return {
        quantity: entry.value,
        remaining: input.replace(entry.pattern, ' '),
      };
    }
  }

  const numeric = input.match(/\b(\d+(?:\.\d+)?)\b/);
  if (numeric) {
    return {
      quantity: parseFloat(numeric[1]),
      remaining: input.replace(numeric[0], ' '),
    };
  }

  return { quantity: 1, remaining: input };
};

const extractName = (input: string): string => {
  const cleaned = input
    .replace(FILLER_PATTERN, ' ')
    .replace(/[.,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return toTitleCase(cleaned);
};

export const parseVoiceInput = (input: string): ParsedVoiceItem => {
  const source = normalizeAttachedUnits((input || '').trim());
  if (!source) {
    return {
      name: '',
      quantity: 1,
      unit: 'pcs',
      category: 'Others',
    };
  }

  const withPrice = extractPrice(source);
  const withUnit = extractUnit(withPrice.remaining);
  const withQuantity = extractQuantity(withUnit.remaining);
  const name = extractName(withQuantity.remaining);

  const result: ParsedVoiceItem = {
    name,
    quantity: withQuantity.quantity,
    unit: withUnit.unit,
    category: name ? detectCategory(name) : 'Others',
  };

  if (typeof withPrice.price === 'number') {
    result.price = withPrice.price;
  }

  return result;
};
