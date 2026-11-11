import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGroceryStore } from '@store/index';
import { SPACING } from '@constants/index';
import { formatDate, formatPesoAmount } from '@utils/index';
import {
  mergePurchaseRecords,
  normalizeProductIdentity,
} from '../utils/storeBreakdown';
import { useTheme } from '../hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ItemPriceHistoryEntry } from '../types/index';

export const StoreComparisonScreen = ({ route, navigation }: any) => {
  const { itemId, cartId } = route.params || {};
  const { carts, getStoreName, getRecordsForItemName } = useGroceryStore();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const cart = carts.find((entry) => entry.id === cartId);
  const item = cart?.items.find((entry) => entry.id === itemId);

  const purchases = useMemo((): ItemPriceHistoryEntry[] => {
    if (!item) return [];

    const recordedPurchases = getRecordsForItemName(item.name);
    const purchasesFromCompletedCarts = carts
      .filter((entry) => entry.isCompleted)
      .flatMap((entry) =>
        entry.items
          .filter(
            (purchasedItem) =>
              purchasedItem.isChecked &&
              normalizeProductIdentity(purchasedItem.name) ===
                normalizeProductIdentity(item.name) &&
              Number.isFinite(
                purchasedItem.actualPrice ?? purchasedItem.estimatedPrice
              )
          )
          .map((purchasedItem) => ({
            storeId: entry.storeId || 'local',
            storeName: getStoreName(entry.storeId) || 'Local',
            price:
              purchasedItem.actualPrice ?? purchasedItem.estimatedPrice,
            date: entry.completedAt || entry.date,
            purchaseId: `${entry.id}:${purchasedItem.id}`,
            cartId: entry.id,
            itemId: purchasedItem.id,
          }))
      );

    return mergePurchaseRecords(
      recordedPurchases,
      purchasesFromCompletedCarts
    )
      .filter(
        (purchase) =>
          Number.isFinite(purchase.price) &&
          purchase.price >= 0 &&
          Number.isFinite(new Date(purchase.date).getTime())
      )
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
  }, [carts, getRecordsForItemName, getStoreName, item]);

  const latestPriceByStore = useMemo(() => {
    const byStore = new Map<string, ItemPriceHistoryEntry>();
    for (const purchase of purchases) {
      const storeKey =
        purchase.storeId || normalizeProductIdentity(purchase.storeName);
      byStore.set(storeKey, purchase);
    }
    return [...byStore.values()].sort((a, b) => a.price - b.price);
  }, [purchases]);

  const latestPurchase = purchases[purchases.length - 1];
  const previousPurchase = purchases[purchases.length - 2];
  const cheapestPurchase = latestPriceByStore[0];
  const highestPrice = latestPriceByStore.reduce(
    (highest, purchase) => Math.max(highest, purchase.price),
    0
  );
  const priceChange = latestPurchase && previousPurchase
    ? previousPurchase.price - latestPurchase.price
    : null;

  const formatPurchaseDate = (date: string) => {
    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime()) ? 'Date unavailable' : formatDate(date);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Store Prices</Text>
      </View>

      {!item ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Item not found</Text>
          <Text style={styles.emptyMessage}>
            Return to the cart and select an item to view its purchase history.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{item.name}</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {purchases.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialIcons
                  name="price-change"
                  size={36}
                  color={theme.textMuted}
                />
                <Text style={styles.emptyTitle}>No price history yet</Text>
                <Text style={styles.emptyMessage}>
                  Purchase this item on a completed trip to start tracking its
                  price. Comparisons appear automatically after you buy it from
                  other stores.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Latest purchase</Text>
                  <View style={styles.purchaseHeadline}>
                    <View style={styles.purchaseStore}>
                      <Text style={styles.storeName}>
                        {latestPurchase.storeName}
                      </Text>
                      <Text style={styles.purchaseDate}>
                        {formatPurchaseDate(latestPurchase.date)}
                      </Text>
                    </View>
                    <Text style={styles.latestPrice}>
                      ₱{formatPesoAmount(latestPurchase.price)}
                    </Text>
                  </View>
                  {previousPurchase && (
                    <View style={styles.previousPurchaseRow}>
                      <Text style={styles.previousPurchaseLabel}>
                        Previous: {previousPurchase.storeName}
                      </Text>
                      <Text style={styles.previousPurchasePrice}>
                        ₱{formatPesoAmount(previousPurchase.price)}
                      </Text>
                    </View>
                  )}
                  {priceChange !== null && Math.abs(priceChange) > 0.00001 && (
                    <Text
                      style={[
                        styles.priceChange,
                        priceChange > 0
                          ? styles.savingsText
                          : styles.moreExpensiveText,
                      ]}
                    >
                      {priceChange > 0
                        ? `You saved ₱${formatPesoAmount(priceChange)} at ${latestPurchase.storeName}.`
                        : `₱${formatPesoAmount(Math.abs(priceChange))} more expensive than your previous purchase.`}
                    </Text>
                  )}
                  {priceChange === 0 && previousPurchase && (
                    <Text style={styles.purchaseDate}>
                      Same price as your previous purchase.
                    </Text>
                  )}
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Latest price by store</Text>
                  {latestPriceByStore.map((purchase) => {
                    const isCheapest =
                      purchase.storeId === cheapestPurchase.storeId &&
                      purchase.storeName === cheapestPurchase.storeName;
                    const difference = purchase.price - cheapestPurchase.price;
                    return (
                      <View
                        key={`${purchase.storeId}:${purchase.storeName}`}
                        style={styles.storeRow}
                      >
                        <View style={styles.storeRowInfo}>
                          <Text style={styles.storeName}>
                            {purchase.storeName}
                          </Text>
                          {isCheapest && latestPriceByStore.length > 1 && (
                            <Text style={styles.cheapestLabel}>Cheapest</Text>
                          )}
                        </View>
                        <View style={styles.storePriceInfo}>
                          <Text
                            style={[
                              styles.storePrice,
                              isCheapest && styles.savingsText,
                            ]}
                          >
                            ₱{formatPesoAmount(purchase.price)}
                          </Text>
                          {!isCheapest && difference > 0 && (
                            <Text style={styles.purchaseDate}>
                              +₱{formatPesoAmount(difference)}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                  {latestPriceByStore.length > 1 && highestPrice > cheapestPurchase.price && (
                    <Text style={[styles.priceChange, styles.savingsText]}>
                      You could save ₱
                      {formatPesoAmount(highestPrice - cheapestPurchase.price)}{' '}
                      at {cheapestPurchase.storeName} compared with{' '}
                      {latestPriceByStore.find(
                        (purchase) => purchase.price === highestPrice
                      )?.storeName}
                      .
                    </Text>
                  )}
                  {latestPriceByStore.length === 1 && (
                    <Text style={styles.emptyHint}>
                      Buy this item at another store to see an automatic price
                      comparison.
                    </Text>
                  )}
                </View>

                {purchases.length > 1 && (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Purchase history</Text>
                    {[...purchases].reverse().map((purchase, index) => (
                      <View
                        key={
                          purchase.purchaseId ||
                          `${purchase.storeId}:${purchase.date}:${purchase.price}:${index}`
                        }
                        style={[
                          styles.historyRow,
                          index < purchases.length - 1 && styles.historyDivider,
                        ]}
                      >
                        <View style={styles.storeRowInfo}>
                          <Text style={styles.storeName}>
                            {purchase.storeName}
                          </Text>
                          <Text style={styles.purchaseDate}>
                            {formatPurchaseDate(purchase.date)}
                          </Text>
                        </View>
                        <Text style={styles.storePrice}>
                          ₱{formatPesoAmount(purchase.price)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
};

const getStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      backgroundColor: theme.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    backButton: {
      width: 44,
      height: 48,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
    },
    productHeader: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      backgroundColor: theme.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    productName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: SPACING.lg,
      paddingBottom: SPACING.xl,
      gap: SPACING.md,
    },
    card: {
      padding: SPACING.lg,
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      gap: SPACING.md,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    purchaseHeadline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.md,
    },
    purchaseStore: {
      flex: 1,
      gap: 4,
    },
    previousPurchaseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: SPACING.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    previousPurchaseLabel: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    previousPurchasePrice: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    storeName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    purchaseDate: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    latestPrice: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.primary,
    },
    priceChange: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
    },
    savingsText: {
      color: theme.success,
    },
    moreExpensiveText: {
      color: theme.danger,
    },
    storeRow: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    storeRowInfo: {
      flex: 1,
      gap: 3,
    },
    storePriceInfo: {
      alignItems: 'flex-end',
      gap: 3,
    },
    storePrice: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    cheapestLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.success,
    },
    emptyHint: {
      marginTop: SPACING.xs,
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    historyRow: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.md,
    },
    historyDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACING.xl,
      gap: SPACING.md,
    },
    emptyCard: {
      alignItems: 'center',
      padding: SPACING.xl,
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      gap: SPACING.md,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
    },
    emptyMessage: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
      textAlign: 'center',
    },
  });
