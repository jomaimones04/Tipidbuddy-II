import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { useGroceryStore } from '@store/index';
import { COLORS, SPACING } from '@constants/index';
import { formatPesoAmount, getStoreStatsBreakdown } from '@utils/index';
import { useTheme } from '../hooks/useTheme';
import type { ItemPriceHistoryEntry } from '../types/index';

const sortByNewest = (records: ItemPriceHistoryEntry[]) =>
  [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

export const ItemDetailScreen = ({ route, navigation }: any) => {
  const { itemId, itemName: routeItemName } = route.params;
  const { carts, itemPriceHistory, getRecordsForItemName } = useGroceryStore();
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [activeTab, setActiveTab] = useState<'log' | 'stores'>('log');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  const cartItem = useMemo(() => {
    if (!itemId) return null;
    for (const cart of carts) {
      const found = cart.items.find((i) => i.id === itemId);
      if (found) return found;
    }
    return null;
  }, [carts, itemId]);

  const resolvedName = routeItemName || cartItem?.name || '';
  const historyKey = resolvedName.toLowerCase().trim();
  const historyGroup = itemPriceHistory[historyKey];

  const priceHistory = useMemo(() => {
    const fromStore = getRecordsForItemName(resolvedName);
    if (fromStore.length > 0) return fromStore;
    return cartItem?.priceHistory ?? [];
  }, [itemPriceHistory, resolvedName, cartItem, getRecordsForItemName]);

  const displayName = historyGroup?.itemName || cartItem?.name || resolvedName;

  if (!displayName) {
    return (
      <View style={styles.container}>
        <Text style={styles.missingText}>Item not found</Text>
      </View>
    );
  }

  const sortedByDate = useMemo(() => sortByNewest(priceHistory), [priceHistory]);

  const currentPrice =
    sortedByDate[0]?.price ??
    cartItem?.actualPrice ??
    cartItem?.estimatedPrice ??
    0;

  const priceTrend = useMemo(() => {
    if (sortedByDate.length < 2) return 0;
    const latest = sortedByDate[0].price;
    const previous = sortedByDate[1].price;
    if (previous === 0) return 0;
    return ((latest - previous) / previous) * 100;
  }, [sortedByDate]);

  const stats = useMemo(() => {
    if (priceHistory.length === 0) {
      return { lowest: 0, highest: 0, average: 0, total: 0, count: 0 };
    }
    const prices = priceHistory.map((h) => h.price);
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const total = prices.reduce((sum, p) => sum + p, 0);
    const average = total / prices.length;
    return {
      lowest,
      highest,
      average,
      total,
      count: priceHistory.length,
    };
  }, [priceHistory]);

  const storeData = useMemo(
    () => getStoreStatsBreakdown(priceHistory),
    [priceHistory]
  );

  const sortedHistory = useMemo(() => {
    let sorted = [...priceHistory];
    if (sortOrder === 'newest') {
      sorted = sortByNewest(sorted);
    } else if (sortOrder === 'oldest') {
      sorted = [...priceHistory].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } else if (sortOrder === 'highest') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortOrder === 'lowest') {
      sorted.sort((a, b) => a.price - b.price);
    }
    return sorted;
  }, [priceHistory, sortOrder]);

  const getTrendColor = () => {
    if (priceTrend < 0) return COLORS.success;
    if (priceTrend > 0) return COLORS.danger;
    return theme.textSecondary;
  };

  const getTrendLabel = () => {
    const sign = priceTrend > 0 ? '+' : '';
    return `${sign}${priceTrend.toFixed(1)}%`;
  };

  const getStoreColor = (index: number) => {
    const colors = [
      '#8B5CF6',
      '#10B981',
      '#F59E0B',
      '#3B82F6',
      '#EC4899',
      '#06B6D4',
    ];
    return colors[index % colors.length];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      short: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      year: date.getFullYear().toString(),
    };
  };

  const storeIndexForEntry = (entry: ItemPriceHistoryEntry) =>
    storeData.findIndex(
      (s) => s.storeName.toLowerCase().trim() === entry.storeName.toLowerCase().trim()
    );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{displayName}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.cardGrid}>
          <View style={styles.cardWrapper}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>$ Current Price</Text>
              <Text style={styles.cardValue}>₱{formatPesoAmount(currentPrice)}</Text>
            </View>
          </View>

          <View style={styles.cardWrapper}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>↘ Price Trend</Text>
              <Text style={[styles.cardValue, { color: getTrendColor() }]}>
                {getTrendLabel()}
              </Text>
            </View>
          </View>

          <View style={styles.cardWrapper}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}># Purchased</Text>
              <Text style={styles.cardValue}>{stats.count}x</Text>
            </View>
          </View>

          <View style={styles.cardWrapper}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>🛒 Total Spent</Text>
              <Text style={styles.cardValue}>₱{formatPesoAmount(stats.total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'log' && styles.tabActive]}
            onPress={() => setActiveTab('log')}
          >
            <Text style={[styles.tabText, activeTab === 'log' && styles.tabTextActive]}>
              Purchase Log
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'stores' && styles.tabActive]}
            onPress={() => setActiveTab('stores')}
          >
            <Text style={[styles.tabText, activeTab === 'stores' && styles.tabTextActive]}>
              Stores
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'log' && (
          <View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Lowest</Text>
                <Text style={[styles.statValue, { color: COLORS.success }]}>
                  ₱{formatPesoAmount(stats.lowest)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Average</Text>
                <Text style={[styles.statValue, { color: theme.textSecondary }]}>
                  ₱{formatPesoAmount(stats.average)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Highest</Text>
                <Text style={[styles.statValue, { color: COLORS.danger }]}>
                  ₱{formatPesoAmount(stats.highest)}
                </Text>
              </View>
            </View>

            <View style={styles.filterContainer}>
              <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterButtonText}>
                  {sortOrder === 'newest' && '⬇ Newest'}
                  {sortOrder === 'oldest' && '⬆ Oldest'}
                  {sortOrder === 'highest' && '⬆ Highest Price'}
                  {sortOrder === 'lowest' && '⬇ Lowest Price'}
                </Text>
              </TouchableOpacity>
              <View style={styles.filterOptions}>
                {(['newest', 'oldest', 'highest', 'lowest'] as const).map((order) => (
                  <TouchableOpacity
                    key={order}
                    onPress={() => setSortOrder(order)}
                    style={[
                      styles.filterOption,
                      sortOrder === order && styles.filterOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        sortOrder === order && styles.filterOptionTextActive,
                      ]}
                    >
                      {order === 'newest' && 'Newest'}
                      {order === 'oldest' && 'Oldest'}
                      {order === 'highest' && 'Highest Price'}
                      {order === 'lowest' && 'Lowest Price'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.logListCard}>
              {sortedHistory.length > 0 ? (
                <FlatList
                  data={sortedHistory}
                  keyExtractor={(entry, index) => `${entry.date}-${entry.storeId}-${index}`}
                  scrollEnabled={false}
                  renderItem={({ item: entry }) => {
                    const { short, year } = formatDate(entry.date);
                    const chipIndex = storeIndexForEntry(entry);
                    const chipColor = getStoreColor(chipIndex >= 0 ? chipIndex : 0);
                    return (
                      <View style={styles.logEntry}>
                        <View style={styles.logDate}>
                          <Text style={styles.logDateShort}>{short}</Text>
                          <Text style={styles.logDateYear}>{year}</Text>
                        </View>
                        <View
                          style={[
                            styles.storeChip,
                            { backgroundColor: `${chipColor}22` },
                          ]}
                        >
                          <Text style={[styles.storeChipText, { color: chipColor }]}>
                            {entry.storeName}
                          </Text>
                        </View>
                        <Text style={styles.logPrice}>
                          ₱{formatPesoAmount(entry.price)}
                        </Text>
                      </View>
                    );
                  }}
                  ItemSeparatorComponent={() => <View style={styles.divider} />}
                />
              ) : (
                <Text style={styles.emptyLog}>No purchase history yet</Text>
              )}
            </View>
          </View>
        )}

        {activeTab === 'stores' && (
          <View style={styles.storesContainer}>
            {storeData.length > 0 ? (
              storeData.map((store, index) => (
                <View key={store.storeName.toLowerCase().trim()} style={styles.storeCard}>
                  <View style={styles.storeRank}>
                    <View
                      style={[
                        styles.rankCircle,
                        { backgroundColor: getStoreColor(index) },
                      ]}
                    >
                      <Text style={styles.rankNumber}>{index + 1}</Text>
                    </View>
                  </View>

                  <View style={styles.storeInfo}>
                    <View style={styles.storeNameRow}>
                      <Text style={styles.storeName}>{store.storeName}</Text>
                      {index === 0 && (
                        <View style={[styles.badge, { backgroundColor: COLORS.success }]}>
                          <Text style={styles.badgeText}>Cheapest</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.storeBought}>Bought {store.count}x</Text>
                  </View>

                  <View style={styles.storePrice}>
                    <Text style={styles.storePriceValue}>
                      ₱{formatPesoAmount(store.avgPrice)}
                    </Text>
                    <Text style={styles.storePriceLabel}>avg price</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyLog}>No store data yet</Text>
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    missingText: {
      padding: SPACING.xl,
      textAlign: 'center',
      color: theme.textSecondary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.lg,
      paddingTop: SPACING.lg + 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      fontSize: 24,
      color: theme.primary,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.text,
      flex: 1,
      textAlign: 'center',
    },
    placeholder: {
      width: 24,
    },
    content: {
      flex: 1,
      paddingHorizontal: SPACING.lg,
    },
    cardGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginVertical: SPACING.lg,
      marginHorizontal: -SPACING.sm,
    },
    cardWrapper: {
      width: '50%',
      padding: SPACING.sm,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textSecondary,
      marginBottom: SPACING.sm,
    },
    cardValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    tabsContainer: {
      flexDirection: 'row',
      gap: SPACING.md,
      marginVertical: SPACING.lg,
      backgroundColor: theme.border,
      borderRadius: 8,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: SPACING.md,
      alignItems: 'center',
      borderRadius: 6,
    },
    tabActive: {
      backgroundColor: theme.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    tabTextActive: {
      color: COLORS.white,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: SPACING.lg,
      marginVertical: SPACING.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    statItem: {
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.textSecondary,
      marginBottom: SPACING.xs,
    },
    statValue: {
      fontSize: 14,
      fontWeight: '700',
    },
    filterContainer: {
      marginVertical: SPACING.lg,
    },
    filterButton: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      backgroundColor: theme.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      alignSelf: 'flex-start',
    },
    filterButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.primary,
    },
    filterOptions: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginTop: SPACING.md,
      flexWrap: 'wrap',
    },
    filterOption: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      backgroundColor: theme.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterOptionActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterOptionText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    filterOptionTextActive: {
      color: COLORS.white,
    },
    logListCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      paddingHorizontal: SPACING.md,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: SPACING.md,
    },
    logEntry: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      gap: SPACING.md,
    },
    logDate: {
      width: 48,
      alignItems: 'center',
    },
    logDateShort: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    logDateYear: {
      fontSize: 10,
      color: theme.textSecondary,
      marginTop: 2,
    },
    storeChip: {
      flex: 1,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: 20,
    },
    storeChipText: {
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    logPrice: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      minWidth: 80,
      textAlign: 'right',
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
    },
    emptyLog: {
      padding: SPACING.lg,
      textAlign: 'center',
      color: theme.textSecondary,
      fontSize: 14,
    },
    storesContainer: {
      paddingVertical: SPACING.lg,
      gap: SPACING.md,
    },
    storeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: theme.border,
      gap: SPACING.md,
    },
    storeRank: {
      marginRight: SPACING.sm,
    },
    rankCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankNumber: {
      fontSize: 16,
      fontWeight: '700',
      color: COLORS.white,
    },
    storeInfo: {
      flex: 1,
    },
    storeNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.xs,
    },
    storeName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    badge: {
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 4,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: COLORS.white,
    },
    storeBought: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    storePrice: {
      alignItems: 'flex-end',
    },
    storePriceValue: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    storePriceLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },
    bottomSpacer: {
      height: SPACING.xl,
    },
  });
