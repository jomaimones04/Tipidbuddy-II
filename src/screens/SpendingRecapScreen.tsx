import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useGroceryStore } from '@store/index';
import { COLORS, SPACING } from '@constants/index';
import { formatPesoAmount } from '@utils/index';
import { useTheme } from '../hooks/useTheme';
import type { GroceryItem } from '../types/index';

export const SpendingRecapScreen = ({ route, navigation }: any) => {
  const { startDate, endDate, timeRange = '7days' } = route.params || {};
  const { carts, getStoreName } = useGroceryStore();
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [currentTimeRange, setCurrentTimeRange] = useState<'7days' | 'month'>(timeRange);
  const [dateOffset, setDateOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<'categories' | 'items' | 'stores'>('categories');
  const [categorySort, setCategorySort] = useState<'highest' | 'lowest' | 'a-z'>('highest');
  const [itemSort, setItemSort] = useState<'highest' | 'lowest' | 'a-z'>('highest');
  const [storeSort, setStoreSort] = useState<'highest' | 'lowest' | 'a-z'>('highest');
  const [showSortSheet, setShowSortSheet] = useState<'categories' | 'items' | 'stores' | null>(
    null
  );

  // Animations
  const screenOpacity = useSharedValue(0);
  const screenScale = useSharedValue(0.9);

  useEffect(() => {
    // Fade in + scale animation on mount
    screenOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });
    screenScale.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });
  }, []);

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    const offset = new Date(today);

    if (currentTimeRange === '7days') {
      offset.setDate(offset.getDate() + dateOffset * 7);
      const endDate = new Date(offset);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      return { startDate, endDate };
    } else {
      offset.setMonth(offset.getMonth() + dateOffset);
      const startDate = new Date(offset.getFullYear(), offset.getMonth(), 1);
      const endDate = new Date(offset.getFullYear(), offset.getMonth() + 1, 0);
      return { startDate, endDate };
    }
  };

  const { startDate: currentStart, endDate: currentEnd } = getDateRange();

  // Filter completed carts by date range
  const cartsInRange = useMemo(() => {
    return carts.filter((cart) => {
      if (!cart.isCompleted || !cart.date) return false;
      const cartDate = new Date(cart.date);
      return cartDate >= currentStart && cartDate <= currentEnd;
    });
  }, [carts, currentStart, currentEnd]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalBudget = cartsInRange.reduce((sum, cart) => sum + cart.budget, 0);
    const totalSpent = cartsInRange.reduce((sum, cart) => sum + cart.totalSpent, 0);
    const totalSaved = Math.max(0, totalBudget - totalSpent);
    const avgPerTrip = cartsInRange.length > 0 ? totalSpent / cartsInRange.length : 0;

    return { totalBudget, totalSpent, totalSaved, avgPerTrip };
  }, [cartsInRange]);

  // Get all items from carts in range
  const allItems = useMemo(() => {
    const items: (GroceryItem & { cartId: string })[] = [];
    cartsInRange.forEach((cart) => {
      cart.items.forEach((item) => {
        items.push({ ...item, cartId: cart.id });
      });
    });
    return items;
  }, [cartsInRange]);

  // Calculate category breakdown
  const categoryData = useMemo(() => {
    const map = new Map<string, { name: string; color: string; amount: number; count: number }>();
    allItems.forEach((item) => {
      const price = (item.actualPrice || item.estimatedPrice) * item.quantity;
      const key = item.category;
      const existing = map.get(key);
      if (existing) {
        existing.amount += price;
        existing.count += item.quantity;
      } else {
        map.set(key, { name: item.category, color: item.categoryColor, amount: price, count: item.quantity });
      }
    });

    let sorted = Array.from(map.values());
    if (categorySort === 'highest') {
      sorted.sort((a, b) => b.amount - a.amount);
    } else if (categorySort === 'lowest') {
      sorted.sort((a, b) => a.amount - b.amount);
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [allItems, categorySort]);

  // Calculate item breakdown
  const itemData = useMemo(() => {
    const map = new Map<string, { id: string; name: string; category: string; categoryColor: string; amount: number; count: number; cartId: string }>();
    allItems.forEach((item) => {
      const price = (item.actualPrice || item.estimatedPrice) * item.quantity;
      const key = item.name;
      const existing = map.get(key);
      if (existing) {
        existing.amount += price;
        existing.count += 1;
      } else {
        map.set(key, { id: item.id, name: item.name, category: item.category, categoryColor: item.categoryColor, amount: price, count: 1, cartId: item.cartId });
      }
    });

    let sorted = Array.from(map.values());
    if (itemSort === 'highest') {
      sorted.sort((a, b) => b.amount - a.amount);
    } else if (itemSort === 'lowest') {
      sorted.sort((a, b) => a.amount - b.amount);
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [allItems, itemSort]);

  // Calculate store breakdown
  const storeData = useMemo(() => {
    const map = new Map<string, { storeName: string; amount: number }>();
    cartsInRange.forEach((cart) => {
      const storeName = getStoreName(cart.storeId);
      const existing = map.get(storeName);
      if (existing) {
        existing.amount += cart.totalSpent;
      } else {
        map.set(storeName, { storeName, amount: cart.totalSpent });
      }
    });

    let sorted = Array.from(map.values());
    if (storeSort === 'highest') {
      sorted.sort((a, b) => b.amount - a.amount);
    } else if (storeSort === 'lowest') {
      sorted.sort((a, b) => a.amount - b.amount);
    } else {
      sorted.sort((a, b) => a.storeName.localeCompare(b.storeName));
    }
    return sorted;
  }, [cartsInRange, storeSort, getStoreName]);

  const formatDateRange = () => {
    const formatDate = (date: Date) => {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${month}/${day}`;
    };
    return `${formatDate(currentStart)} - ${formatDate(currentEnd)}`;
  };

  const getCategoryPercentage = (amount: number) => {
    const total = summaryStats.totalSpent;
    return total > 0 ? (amount / total) * 100 : 0;
  };

  const getStorePercentage = (amount: number) => {
    const total = storeData.reduce((sum, store) => sum + store.amount, 0);
    return total > 0 ? (amount / total) * 100 : 0;
  };

  const recapSortOptions: { key: 'highest' | 'lowest' | 'a-z'; label: string }[] = [
    { key: 'highest', label: 'Highest Spent' },
    { key: 'lowest', label: 'Lowest Spent' },
    { key: 'a-z', label: 'Name (A-Z)' },
  ];

  const getSortSheetTitle = () => {
    if (showSortSheet === 'categories') return 'Sort Categories';
    if (showSortSheet === 'items') return 'Sort Items';
    return 'Sort Stores';
  };

  const getActiveRecapSort = () => {
    if (showSortSheet === 'categories') return categorySort;
    if (showSortSheet === 'items') return itemSort;
    return storeSort;
  };

  const setActiveRecapSort = (key: 'highest' | 'lowest' | 'a-z') => {
    if (showSortSheet === 'categories') setCategorySort(key);
    else if (showSortSheet === 'items') setItemSort(key);
    else setStoreSort(key);
  };

  const getSortLabel = (sort: 'highest' | 'lowest' | 'a-z') => {
    if (sort === 'highest') return 'Highest Spent';
    if (sort === 'lowest') return 'Lowest Spent';
    return 'Name (A-Z)';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Recap</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              currentTimeRange === '7days' && styles.toggleButtonActive,
            ]}
            onPress={() => {
              setCurrentTimeRange('7days');
              setDateOffset(0);
            }}
          >
            <Text
              style={[
                styles.toggleText,
                currentTimeRange === '7days' && styles.toggleTextActive,
              ]}
            >
              7 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              currentTimeRange === 'month' && styles.toggleButtonActive,
            ]}
            onPress={() => {
              setCurrentTimeRange('month');
              setDateOffset(0);
            }}
          >
            <Text
              style={[
                styles.toggleText,
                currentTimeRange === 'month' && styles.toggleTextActive,
              ]}
            >
              Month
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Range Navigation */}
      <View style={styles.dateRangeContainer}>
        <TouchableOpacity onPress={() => setDateOffset(dateOffset - 1)}>
          <Text style={styles.arrowButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateRangeText}>{formatDateRange()}</Text>
        <TouchableOpacity onPress={() => setDateOffset(dateOffset + 1)}>
          <Text style={styles.arrowButton}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Budget</Text>
          <Text style={styles.summaryValue}>₱{formatPesoAmount(summaryStats.totalBudget)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Spent</Text>
          <Text style={styles.summaryValue}>₱{formatPesoAmount(summaryStats.totalSpent)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Saved</Text>
          <Text style={[styles.summaryValue, { color: COLORS.success }]}>₱{formatPesoAmount(summaryStats.totalSaved)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Avg per Trip</Text>
          <Text style={styles.summaryValue}>₱{formatPesoAmount(summaryStats.avgPerTrip)}</Text>
        </View>
      </View>

      {/* Segment Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'categories' && styles.tabActive]}
          onPress={() => setActiveTab('categories')}
        >
          <Text style={[styles.tabText, activeTab === 'categories' && styles.tabTextActive]}>Categories</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'items' && styles.tabActive]}
          onPress={() => setActiveTab('items')}
        >
          <Text style={[styles.tabText, activeTab === 'items' && styles.tabTextActive]}>Items</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stores' && styles.tabActive]}
          onPress={() => setActiveTab('stores')}
        >
          <Text style={[styles.tabText, activeTab === 'stores' && styles.tabTextActive]}>Stores</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowSortSheet('categories')}
                activeOpacity={0.7}
              >
                <Ionicons name="filter-outline" size={14} color={theme.textSecondary} />
                <Text style={styles.filterText}>{getSortLabel(categorySort)}</Text>
              </TouchableOpacity>
            </View>
            {categoryData.length > 0 ? (
              categoryData.map((category, index) => (
                <View key={index} style={styles.rowCard}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowName}>{category.name}</Text>
                    <Text style={styles.rowAmount}>₱{formatPesoAmount(category.amount)}</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${getCategoryPercentage(category.amount)}%`,
                            backgroundColor: category.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No data</Text>
            )}
          </View>
        )}

        {/* Items Tab */}
        {activeTab === 'items' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Items</Text>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowSortSheet('items')}
                activeOpacity={0.7}
              >
                <Ionicons name="filter-outline" size={14} color={theme.textSecondary} />
                <Text style={styles.filterText}>{getSortLabel(itemSort)}</Text>
              </TouchableOpacity>
            </View>
            {itemData.length > 0 ? (
              itemData.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.rowCard}
                  onPress={() => {
                    navigation.navigate('ItemDetail', {
                      itemId: item.id,
                      itemName: item.name,
                      cartId: item.cartId,
                    });
                  }}
                >
                  <View style={styles.rowHeader}>
                    <View style={styles.itemNameContainer}>
                      <Text style={styles.rowName}>{item.name}</Text>
                      <Text style={styles.arrowIcon}>›</Text>
                    </View>
                    <Text style={styles.rowAmount}>₱{formatPesoAmount(item.amount)}</Text>
                  </View>
                  <View style={styles.itemSubInfo}>
                    <View style={styles.categoryChip}>
                      <View style={[styles.categoryDot, { backgroundColor: item.categoryColor }]} />
                      <Text style={styles.categoryChipText}>{item.category}</Text>
                    </View>
                    <Text style={styles.frequencyBadge}>Bought {item.count}x</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${getCategoryPercentage(item.amount)}%`,
                            backgroundColor: item.categoryColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>No data</Text>
            )}
          </View>
        )}

        {/* Stores Tab */}
        {activeTab === 'stores' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Stores</Text>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowSortSheet('stores')}
                activeOpacity={0.7}
              >
                <Ionicons name="filter-outline" size={14} color={theme.textSecondary} />
                <Text style={styles.filterText}>{getSortLabel(storeSort)}</Text>
              </TouchableOpacity>
            </View>
            {storeData.length > 0 ? (
              storeData.map((store, index) => (
                <View key={index} style={styles.rowCard}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowName}>{store.storeName}</Text>
                    <Text style={styles.rowAmount}>₱{formatPesoAmount(store.amount)}</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${getStorePercentage(store.amount)}%`,
                            backgroundColor: COLORS.accent,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No data</Text>
            )}
          </View>
        )}

        {cartsInRange.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No completed trips in this period</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={showSortSheet !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortSheet(null)}
      >
        <View style={styles.sortSheetOverlay}>
          <TouchableOpacity
            style={styles.sortSheetBackdrop}
            activeOpacity={1}
            onPress={() => setShowSortSheet(null)}
          />
          <View style={styles.sortSheetWrapper}>
            <View style={styles.sortSheetOptionsBlock}>
              <Text style={styles.sortSheetTitle}>{getSortSheetTitle()}</Text>
              {recapSortOptions.map((option, index) => {
                const isSelected = getActiveRecapSort() === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.sortSheetOptionRow,
                      index < recapSortOptions.length - 1 && styles.sortSheetOptionBorder,
                    ]}
                    onPress={() => {
                      setActiveRecapSort(option.key);
                      setShowSortSheet(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.sortSheetOptionText,
                        isSelected && styles.sortSheetOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={COLORS.primary}
                        style={styles.sortSheetCheckmark}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.sortSheetCancelBlock}>
              <TouchableOpacity
                style={styles.sortSheetCancelButton}
                onPress={() => setShowSortSheet(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.sortSheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.md,
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
    },
    toggleContainer: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    toggleButton: {
      paddingHorizontal: SPACING.md,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBackground,
    },
    toggleButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    toggleText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    toggleTextActive: {
      color: theme.isDark ? theme.background : COLORS.white,
    },
    dateRangeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
    },
    arrowButton: {
      fontSize: 24,
      color: theme.primary,
      paddingHorizontal: SPACING.sm,
    },
    dateRangeText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      gap: SPACING.md,
    },
    summaryCard: {
      width: '48%',
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: SPACING.md,
      shadowColor: theme.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    summaryLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '500',
      marginBottom: SPACING.xs,
    },
    summaryValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    tabsContainer: {
      flexDirection: 'row',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      gap: SPACING.md,
    },
    tab: {
      flex: 1,
      paddingVertical: SPACING.sm,
      borderRadius: 20,
      backgroundColor: theme.inputBackground,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    tabActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    tabTextActive: {
      color: theme.isDark ? theme.background : COLORS.white,
    },
    content: {
      flex: 1,
      paddingHorizontal: SPACING.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: SPACING.md,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    filterText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    sortSheetOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.lg,
    },
    sortSheetBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    sortSheetWrapper: {
      gap: SPACING.sm,
    },
    sortSheetOptionsBlock: {
      backgroundColor: '#2C2C2E',
      borderRadius: 14,
      overflow: 'hidden',
    },
    sortSheetTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
      textAlign: 'center',
      paddingVertical: SPACING.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    },
    sortSheetOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      position: 'relative',
    },
    sortSheetOptionBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    },
    sortSheetOptionText: {
      fontSize: 16,
      fontWeight: '400',
      color: '#FFFFFF',
      textAlign: 'center',
    },
    sortSheetOptionTextSelected: {
      color: COLORS.primary,
      fontWeight: '600',
    },
    sortSheetCheckmark: {
      position: 'absolute',
      right: SPACING.lg,
    },
    sortSheetCancelBlock: {
      backgroundColor: '#2C2C2E',
      borderRadius: 14,
      overflow: 'hidden',
    },
    sortSheetCancelButton: {
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    sortSheetCancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.primary,
    },
    rowCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      shadowColor: theme.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    rowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    rowName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      flex: 1,
    },
    rowAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    itemNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    arrowIcon: {
      fontSize: 18,
      color: theme.primary,
      marginLeft: SPACING.sm,
    },
    itemSubInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      marginBottom: SPACING.sm,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: theme.background,
      borderRadius: 8,
    },
    categoryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    categoryChipText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    frequencyBadge: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textSecondary,
      backgroundColor: theme.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    progressBarContainer: {
      marginTop: SPACING.sm,
    },
    progressBarBackground: {
      height: 6,
      backgroundColor: theme.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.xl * 2,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: SPACING.md,
    },
    emptyText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    bottomSpacer: {
      height: SPACING.xl,
    },
  });
