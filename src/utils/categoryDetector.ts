import { CATEGORY_KEYWORDS } from '@constants/categoryKeywords';

interface KeywordMapEntry {
  keyword: string;
  category: string;
}

// Pre-flatten and pre-sort keywords by length descending for optimal matching performance.
const SORTED_KEYWORD_ENTRIES: KeywordMapEntry[] = Object.entries(CATEGORY_KEYWORDS)
  .reduce<KeywordMapEntry[]>((acc, [category, keywords]) => {
    keywords.forEach((keyword) => {
      acc.push({
        keyword: keyword.toLowerCase().trim(),
        category,
      });
    });
    return acc;
  }, [])
  .sort((a, b) => b.keyword.length - a.keyword.length);

/**
 * Automatically assigns a category to a grocery item based on its name.
 * Uses substring matching against a predefined list of Filipino grocery staples.
 * Sorts keywords by length in descending order to match the most specific keyword first.
 *
 * @param itemName The name of the grocery item
 * @returns The matched category name, or "Others" if no match is found
 */
export function detectCategory(itemName: string): string {
  if (!itemName) {
    return 'Others';
  }

  const normalized = itemName.toLowerCase().trim().replace(/\s+/g, ' ');
  if (normalized === '') {
    return 'Others';
  }

  // Iterate over pre-sorted entries (longest keyword first)
  for (const entry of SORTED_KEYWORD_ENTRIES) {
    if (normalized.includes(entry.keyword)) {
      return entry.category;
    }
  }

  return 'Others';
}
