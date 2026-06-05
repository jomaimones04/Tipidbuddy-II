import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useGroceryStore } from '@store/index';
import { COLORS, SPACING } from '@constants/index';
import {
  generateId,
  calculatePriceTrend,
  getTrendIcon,
  formatPesoAmount,
  getStoreBreakdown,
  getMostRecentPurchase,
  detectCategory,
  splitQuantityString,
} from '@utils/index';

interface HistoricalPurchase {
  storeId: string;
  storeName: string;
  price: number;
  date: string;
}

export const AddEditItemScreen = ({ route, navigation }: any) => {
  const {
    cartId,
    itemId,
    scannedData,
    voiceData,
    detectedName,
    detectedPrice,
    detectedQuantity,
  } = route.params || {};
  const { carts, categories, updateCart, getStoreName, getRecordsForItemName } =
    useGroceryStore();
  const cart = carts.find((c) => c.id === cartId);
  const existingItem = cart?.items.find((i) => i.id === itemId);

  // Prefill scanned, voice, or camera detected data if adding a new item
  const prefill = !existingItem ? (scannedData || voiceData) : null;

  const initialName = existingItem?.name || detectedName || prefill?.name || '';
  const initialPrice = existingItem?.estimatedPrice?.toString() || detectedPrice || prefill?.price?.toString() || '';

  // Handle quantity and unit prefilling (possibly splitting unit-containing quantities)
  const initialQuantityUnit = (() => {
    if (existingItem) {
      return { amount: existingItem.quantity.toString(), unit: existingItem.unit || '' };
    }

    const rawQty = detectedQuantity || prefill?.quantity?.toString() || '';
    if (rawQty) {
      return splitQuantityString(rawQty);
    }
    return { amount: '', unit: prefill?.unit || '' };
  })();

  const [name, setName] = useState(initialName);
  const [quantity, setQuantity] = useState(initialQuantityUnit.amount);
  const [unit, setUnit] = useState(initialQuantityUnit.unit);
  const [customUnit, setCustomUnit] = useState(
    initialQuantityUnit.unit !== '' && !['pcs', 'kg', 'g', 'L', 'mL', 'pack', 'bottle', 'loaf', 'dozen', 'box', 'sachet', 'tray'].includes(initialQuantityUnit.unit)
      ? initialQuantityUnit.unit
      : ''
  );
  const [estimatedPrice, setEstimatedPrice] = useState(initialPrice);

  const handleSelectChip = (u: string) => {
    setUnit(u);
    setCustomUnit('');
  };

  const handleCustomUnitChange = (text: string) => {
    setCustomUnit(text);
    setUnit(text);
  };

  const isChipSelected = (u: string) => {
    return unit === u && customUnit === '';
  };

  // Auto-detect category for prefilled name if present, otherwise fallback
  const initialCategory = (() => {
    if (existingItem) return existingItem.category;
    if (initialName) return detectCategory(initialName);
    return categories[0]?.name || '';
  })();

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [priceManuallyChanged, setPriceManuallyChanged] = useState(
    existingItem || initialPrice !== '' ? true : false
  );
  const [categoryManuallyChanged, setCategoryManuallyChanged] = useState(false);

  const getHistoryForName = (itemName: string): HistoricalPurchase[] => {
    if (!itemName.trim()) return [];

    const fromGlobal = getRecordsForItemName(itemName);
    if (fromGlobal.length > 0) return fromGlobal;

    const matches: HistoricalPurchase[] = [];
    carts.forEach((c) => {
      if (c.isCompleted) {
        c.items.forEach((item) => {
          if (item.name.trim().toLowerCase() === itemName.trim().toLowerCase()) {
            matches.push({
              storeId: c.storeId || 'local',
              storeName: getStoreName(c.storeId),
              price: item.actualPrice || item.estimatedPrice,
              date: c.completedAt || c.date || new Date().toISOString(),
            });
          }
        });
      }
    });
    return matches;
  };

  const getTimeAgo = (dateString: string) => {
    const diffTime = Math.abs(new Date().getTime() - new Date(dateString).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return '1 week ago';
    return `${diffWeeks} weeks ago`;
  };

  const nameHistory = getHistoryForName(name);
  const uniqueStorePurchases = getStoreBreakdown(nameHistory);
  const lastBought = getMostRecentPurchase(nameHistory);

  const getSmartRecommendation = () => {
    if (!cart?.storeId || !name.trim() || uniqueStorePurchases.length === 0) {
      return null;
    }

    const currentStoreName = getStoreName(cart.storeId).toLowerCase().trim();
    const cheapestOtherStore = uniqueStorePurchases.find(
      (p) => p.storeName.toLowerCase().trim() !== currentStoreName
    );
    const currentStoreLatest = uniqueStorePurchases.find(
      (p) => p.storeName.toLowerCase().trim() === currentStoreName
    );

    if (cheapestOtherStore) {
      const comparisonPrice =
        parseFloat(estimatedPrice) ||
        (currentStoreLatest ? currentStoreLatest.price : null);
      if (comparisonPrice && cheapestOtherStore.price < comparisonPrice) {
        const diff = comparisonPrice - cheapestOtherStore.price;
        if (diff > 0.01) {
          return {
            diff,
            storeName: cheapestOtherStore.storeName,
          };
        }
      }
    }
    return null;
  };

  const recommendation = getSmartRecommendation();

  const handleNameChange = (text: string) => {
    setName(text);
    if (!priceManuallyChanged && text.trim().length > 0) {
      const hist = getHistoryForName(text);
      if (hist.length > 0) {
        const cheapest = getStoreBreakdown(hist)[0];
        if (cheapest) {
          setEstimatedPrice(cheapest.price.toString());
        }
      }
    }

    // Auto-detect category for new items if not manually changed by user
    if (!existingItem && !categoryManuallyChanged) {
      const detected = detectCategory(text);
      setSelectedCategory(detected);
    }
  };

  const selectedCategoryObj = categories.find((c) => c.name === selectedCategory);

  // Get last price and trend
  const lastPrice = existingItem?.actualPrice || existingItem?.priceHistory?.[0]?.price;
  const currentPrice = parseFloat(estimatedPrice) || 0;
  const priceTrend = lastPrice ? calculatePriceTrend(lastPrice, currentPrice) : null;
  const trendIcon = priceTrend ? getTrendIcon(priceTrend) : null;
  const trendColor = priceTrend === 'up' ? COLORS.danger : priceTrend === 'down' ? COLORS.success : COLORS.textLight;

  const handleSave = async () => {
    if (!name.trim() || !quantity || !estimatedPrice) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    const numQuantity = parseFloat(quantity);
    const numPrice = parseFloat(estimatedPrice);

    if (isNaN(numQuantity) || numQuantity <= 0) {
      Alert.alert('Validation Error', 'Quantity must be a valid positive number');
      return;
    }

    if (isNaN(numPrice) || numPrice < 0) {
      Alert.alert('Validation Error', 'Price must be a valid non-negative number');
      return;
    }

    if (!cart) return;

    let updatedItems = [...cart.items];

    if (existingItem) {
      // Update existing item
      updatedItems = updatedItems.map((item) =>
        item.id === itemId
          ? {
            ...item,
            name,
            quantity: numQuantity,
            unit,
            estimatedPrice: numPrice,
            category: selectedCategory,
            categoryColor: selectedCategoryObj?.color || item.categoryColor,
            lastUpdated: new Date().toISOString(),
          }
          : item
      );
    } else {
      // Add new item
      const newItem = {
        id: generateId(),
        name,
        quantity: numQuantity,
        unit,
        estimatedPrice: numPrice,
        actualPrice: undefined,
        isChecked: false,
        category: selectedCategory,
        categoryColor: selectedCategoryObj?.color || '#84CC16',
        priceHistory: [],
        lastUpdated: new Date().toISOString(),
      };
      updatedItems.push(newItem);
    }

    // Recalculate total spent
    const totalSpent = updatedItems.reduce(
      (sum, item) => sum + (item.actualPrice || item.estimatedPrice) * item.quantity,
      0
    );

    const updatedCart = { ...cart, items: updatedItems, totalSpent };
    await updateCart(updatedCart);
    navigation.goBack();
  };

  const UNITS = ['pcs', 'kg', 'g', 'L', 'mL', 'pack', 'bottle', 'loaf', 'dozen', 'box', 'sachet', 'tray'];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{existingItem ? 'Edit Item' : 'Add Item'}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {recommendation && (
          <View style={styles.recommendationBanner}>
            <Text style={styles.recommendationBannerText}>
              ⚠️ You bought this ₱{formatPesoAmount(recommendation.diff)} cheaper at {recommendation.storeName} last time
            </Text>
          </View>
        )}
        <View style={styles.form}>
          {/* Last Price Badge */}
          {lastPrice && (
            <View style={styles.lastPriceBadge}>
              <Text style={styles.lastPriceLabel}>Last known price:</Text>
              <View style={styles.lastPriceValue}>
                <Text style={styles.lastPriceAmount}>₱{lastPrice.toFixed(2)}</Text>
                {trendIcon && (
                  <Text style={[styles.trendIcon, { color: trendColor }]}>
                    {trendIcon}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Item Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Item Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Bigas, Itlog, Tinapay"
              value={name}
              onChangeText={handleNameChange}
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          {/* Suggestions Card */}
          {name.trim().length > 0 && lastBought && (
            <View style={styles.suggestionCard}>
              <Text style={styles.suggestionTitle}>💡 Price Suggestions</Text>
              <Text style={styles.suggestionSub}>
                Last bought at {lastBought.storeName} for ₱{formatPesoAmount(lastBought.price)} ({getTimeAgo(lastBought.date)})
              </Text>
              {uniqueStorePurchases.length > 1 && (
                <View style={styles.rankingList}>
                  <Text style={styles.rankingHeader}>Store Rankings (Cheapest First):</Text>
                  {uniqueStorePurchases.map((store, idx) => {
                    const isCheapest = idx === 0;
                    const diff = store.price - uniqueStorePurchases[0].price;
                    const storeKey = store.storeName.toLowerCase().trim();
                    return (
                      <TouchableOpacity
                        key={storeKey}
                        style={styles.rankingRow}
                        onPress={() => {
                          setEstimatedPrice(store.price.toString());
                          setPriceManuallyChanged(true);
                        }}
                      >
                        <Text style={styles.rankingText}>
                          📍 {store.storeName} — ₱{formatPesoAmount(store.price)} {isCheapest ? '✅ Cheapest' : `(+₱${formatPesoAmount(diff)})`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Quantity */}
          <View style={styles.field}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          {/* Unit Chips and Custom Input */}
          <View style={styles.field}>
            <Text style={styles.label}>Unit</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScrollView}
              contentContainerStyle={styles.chipsContainer}
            >
              {UNITS.map((u) => {
                const selected = isChipSelected(u);
                return (
                  <TouchableOpacity
                    key={u}
                    onPress={() => handleSelectChip(u)}
                    style={[
                      styles.chip,
                      selected ? styles.chipSelected : styles.chipUnselected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected ? styles.chipTextSelected : styles.chipTextUnselected,
                      ]}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.subLabel}>Or type custom unit:</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. box, sachet, tray"
              value={customUnit}
              onChangeText={handleCustomUnitChange}
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          {/* Estimated Price */}
          <View style={styles.field}>
            <Text style={styles.label}>Estimated Price (₱) *</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.pricePrefix}>₱</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                value={estimatedPrice}
                onChangeText={(text) => {
                  setEstimatedPrice(text);
                  setPriceManuallyChanged(true);
                }}
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                { borderLeftColor: selectedCategoryObj?.color || COLORS.accent },
              ]}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <View
                style={[
                  styles.categoryColor,
                  { backgroundColor: selectedCategoryObj?.color || COLORS.accent },
                ]}
              />
              <Text style={styles.categoryText}>{selectedCategory}</Text>
              <Text style={styles.chevron}>{showCategoryPicker ? '▼' : '▶'}</Text>
            </TouchableOpacity>

            {showCategoryPicker && (
              <View style={styles.categoryList}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryOption}
                    onPress={() => {
                      setSelectedCategory(cat.name);
                      setCategoryManuallyChanged(true);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <View style={[styles.colorSwatch, { backgroundColor: cat.color }]} />
                    <Text
                      style={[
                        styles.categoryOptionText,
                        selectedCategory === cat.name && styles.categoryOptionTextSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Item</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: COLORS.white,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  form: {
    gap: SPACING.lg,
  },
  lastPriceBadge: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastPriceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  lastPriceValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  lastPriceAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  trendIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  field: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfField: {
    flex: 1,
    gap: SPACING.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
  },
  pricePrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: SPACING.sm,
  },
  priceInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: 14,
    color: COLORS.text,
  },
  chipsScrollView: {
    marginVertical: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipUnselected: {
    backgroundColor: 'transparent',
    borderColor: COLORS.border,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipTextUnselected: {
    color: '#6B7280',
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textLight,
    marginTop: 4,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  categoryColor: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  categoryText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  categoryList: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  categoryOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  categoryOptionTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  recommendationBanner: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  recommendationBannerText: {
    color: '#B45309',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionCard: {
    backgroundColor: '#F0FDFA',
    borderColor: '#5EEAD4',
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.sm,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  suggestionSub: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
  },
  rankingList: {
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: SPACING.sm,
    gap: 4,
  },
  rankingHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  rankingRow: {
    paddingVertical: 2,
  },
  rankingText: {
    fontSize: 12,
    color: COLORS.text,
  },
});

