const {
  mergePurchaseRecords,
  normalizeProductIdentity,
} = require('./storeBreakdown');

const purchase = (overrides = {}) => ({
  storeId: 'store-1',
  storeName: 'Puregold',
  price: 35,
  date: '2026-11-11T10:00:00.000Z',
  purchaseId: 'cart-1:item-1',
  cartId: 'cart-1',
  itemId: 'item-1',
  ...overrides,
});

describe('purchase price identity and merging', () => {
  test('normalizes case and extra spaces without merging different variants', () => {
    expect(normalizeProductIdentity('  Century   Tuna  155g ')).toBe(
      'century tuna 155g'
    );
    expect(normalizeProductIdentity('Century Tuna 155g')).toBe(
      normalizeProductIdentity(' century tuna 155g ')
    );
    expect(normalizeProductIdentity('Century Tuna 155g')).not.toBe(
      normalizeProductIdentity('Century Tuna 555g')
    );
  });

  test('does not duplicate a purchase when its cart record is merged with history', () => {
    const recorded = purchase();
    const fromCart = purchase({
      storeName: 'Dali',
      price: 30,
      purchaseId: 'cart-2:item-2',
      cartId: 'cart-2',
      itemId: 'item-2',
    });

    expect(mergePurchaseRecords([recorded], [recorded, fromCart])).toEqual([
      recorded,
      fromCart,
    ]);
  });

  test('deduplicates legacy history against its completed-cart record', () => {
    const legacy = purchase({
      purchaseId: undefined,
      cartId: undefined,
      itemId: undefined,
    });

    expect(mergePurchaseRecords([legacy], [purchase()])).toEqual([legacy]);
  });
});
