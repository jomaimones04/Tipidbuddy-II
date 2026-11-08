import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGroceryStore } from '@store/index';
import { COLORS, SPACING } from '@constants/index';
import { formatPesoAmount } from '@utils/index';
import type { Cart } from '../types/index';
import { useTheme } from '../hooks/useTheme';

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

const MOTIVATIONAL_MESSAGES = [
  'That discipline is paying off 🎯',
  'Keep it up! 💪',
  "You're crushing it! 🔥",
];

const getWeekMessageIndex = (startDate: Date) => {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return Math.floor(startDate.getTime() / weekMs) % MOTIVATIONAL_MESSAGES.length;
};

export const InsightsScreen = ({ navigation }: any) => {
  const { carts, stores, deleteCart } = useGroceryStore();
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [timeRange, setTimeRange] = useState<'7days' | 'month'>('7days');
  const [dateOffset, setDateOffset] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showCartSortSheet, setShowCartSortSheet] = useState(false);

  const getStoreName = (storeId?: string) => {
    if (!storeId) return 'Local';
    const store = stores.find((s) => s.id === storeId);
    return store?.name || 'Local';
  };

  const getDateRange = () => {
    const today = new Date();
    const offset = new Date(today);

    if (timeRange === '7days') {
      offset.setDate(offset.getDate() + dateOffset * 7);
      const endDate = new Date(offset);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      return { startDate, endDate };
    }

    offset.setMonth(offset.getMonth() + dateOffset);
    const startDate = new Date(offset.getFullYear(), offset.getMonth(), 1);
    const endDate = new Date(offset.getFullYear(), offset.getMonth() + 1, 0);
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  const cartsInRange = useMemo(() => {
    return carts.filter((cart) => {
      if (!cart.date) return false;
      const cartDate = new Date(cart.date);
      return cartDate >= startDate && cartDate <= endDate;
    });
  }, [carts, startDate, endDate]);

  const sortedCarts = useMemo(() => {
    const sorted = [...cartsInRange];
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'highest':
        sorted.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
        break;
      case 'lowest':
        sorted.sort((a, b) => (a.totalSpent || 0) - (b.totalSpent || 0));
        break;
    }
    return sorted;
  }, [cartsInRange, sortBy]);

  const stats = useMemo(() => {
    const totalSpent = cartsInRange.reduce((sum, cart) => sum + (cart.totalSpent || 0), 0);
    const totalBudget = cartsInRange.reduce((sum, cart) => sum + (cart.budget || 0), 0);
    const savedAmount = Math.max(0, totalBudget - totalSpent);
    const numberOfTrips = cartsInRange.length;
    const averageTrip = numberOfTrips > 0 ? totalSpent / numberOfTrips : 0;

    return { totalSpent, totalBudget, savedAmount, numberOfTrips, averageTrip };
  }, [cartsInRange]);

  const formatDateRange = () => {
    const fmt = (date: Date) =>
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(startDate)} - ${fmt(endDate)}`;
  };

  const formatCartDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const getMotivationalText = () => {
    if (stats.savedAmount > 0) {
      return `You saved ₱${formatPesoAmount(stats.savedAmount)} this ${timeRange === '7days' ? 'week' : 'month'
        }! More money in your pocket 🙌`;
    }
    return MOTIVATIONAL_MESSAGES[getWeekMessageIndex(startDate)];
  };

  const sortLabels: Record<SortOption, string> = {
    newest: 'Newest',
    oldest: 'Oldest',
    highest: 'Highest Spent',
    lowest: 'Lowest Spent',
  };

  const cartSortOptions: { key: SortOption; label: string }[] = [
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
    { key: 'highest', label: 'Highest Spent' },
    { key: 'lowest', label: 'Lowest Spent' },
  ];

  const showSortOptions = () => {
    setShowCartSortSheet(true);
  };

  const handleNavigateToRecap = () => {
    navigation.navigate('SpendingRecap', { startDate, endDate, timeRange });
  };

  const handleCartPress = (cartId: string) => {
    navigation.navigate('TripSummary', { cartId });
  };

  const showCartMenu = (cart: Cart) => {
    Alert.alert(cart.name, undefined, [
      {
        text: 'View Summary',
        onPress: () => handleCartPress(cart.id),
      },
      {
        text: 'Delete Cart',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete Cart', `Delete "${cart.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => deleteCart(cart.id),
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage <= 50) return COLORS.success;
    if (percentage <= 80) return COLORS.warning;
    return COLORS.danger;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.toggleRow}>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, timeRange === '7days' && styles.toggleButtonActive]}
              onPress={() => {
                setTimeRange('7days');
                setDateOffset(0);
              }}
            >
              <Text style={[styles.toggleText, timeRange === '7days' && styles.toggleTextActive]}>
                7 Days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, timeRange === 'month' && styles.toggleButtonActive]}
              onPress={() => {
                setTimeRange('month');
                setDateOffset(0);
              }}
            >
              <Text style={[styles.toggleText, timeRange === 'month' && styles.toggleTextActive]}>
                Month
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date range */}
        <View style={styles.dateRangeContainer}>
          <TouchableOpacity onPress={() => setDateOffset(dateOffset - 1)} hitSlop={8}>
            <Text style={styles.arrowButton}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.dateRangeText}>{formatDateRange()}</Text>
          <TouchableOpacity onPress={() => setDateOffset(dateOffset + 1)} hitSlop={8}>
            <Text style={styles.arrowButton}>›</Text>
          </TouchableOpacity>
        </View>

        {cartsInRange.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No trips in this period</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>TOTAL SPENT</Text>
              <Text style={styles.summaryAmount}>₱{formatPesoAmount(stats.totalSpent)}</Text>
              <Text style={styles.savedText}>{getMotivationalText()}</Text>

              <View style={styles.divider} />

              <View style={styles.summaryFooter}>
                <Text style={styles.summaryFooterText}>
                  {stats.numberOfTrips} trip{stats.numberOfTrips !== 1 ? 's' : ''}{' '}
                  <Text style={styles.dot}>•</Text> ₱{formatPesoAmount(stats.averageTrip)} avg/trip
                </Text>
                <TouchableOpacity onPress={handleNavigateToRecap}>
                  <Text style={styles.seeRecapLink}>See recap</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.recentCartsHeader}>
              <Text style={styles.recentCartsTitle}>Recent Carts</Text>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={showSortOptions}
                activeOpacity={0.7}
              >
                <Ionicons name="filter-outline" size={14} color={theme.textSecondary} />
                <Text style={styles.filterText}>{sortLabels[sortBy]}</Text>
              </TouchableOpacity>
            </View>

            {sortedCarts.map((cart) => {
              const spent = cart.totalSpent || 0;
              const budget = cart.budget || 0;
              const percentage = budget > 0 ? (spent / budget) * 100 : 0;
              const itemsCount = cart.items.length;
              const checkedCount = cart.items.filter((i) => i.isChecked).length;

              return (
                <TouchableOpacity
                  key={cart.id}
                  style={styles.cartCard}
                  onPress={() => handleCartPress(cart.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cartHeader}>
                    <Text style={styles.cartName} numberOfLines={1}>
                      {cart.name}
                    </Text>
                    <Text style={styles.cartDate}>{formatCartDate(cart.date)}</Text>
                  </View>

                  <View style={styles.cartSubHeader}>
                    <Text style={styles.storeName}>{getStoreName(cart.storeId)}</Text>
                    <TouchableOpacity
                      style={styles.moreButton}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        showCartMenu(cart);
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.moreIcon}>⋯</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: getProgressColor(percentage),
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.cartFooter}>
                    <Text style={styles.spentText}>
                      ₱{formatPesoAmount(spent)} of ₱{formatPesoAmount(budget)} spent
                    </Text>
                    <Text style={styles.itemsText}>
                      {checkedCount}/{itemsCount} items
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={showCartSortSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCartSortSheet(false)}
      >
        <View style={styles.sortSheetOverlay}>
          <TouchableOpacity
            style={styles.sortSheetBackdrop}
            activeOpacity={1}
            onPress={() => setShowCartSortSheet(false)}
          />
          <View style={styles.sortSheetWrapper}>
            <View style={styles.sortSheetOptionsBlock}>
              <Text style={styles.sortSheetTitle}>Sort Carts</Text>
              {cartSortOptions.map((option, index) => {
                const isSelected = sortBy === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.sortSheetOptionRow,
                      index < cartSortOptions.length - 1 && styles.sortSheetOptionBorder,
                    ]}
                    onPress={() => {
                      setSortBy(option.key);
                      setShowCartSortSheet(false);
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
                        color={theme.primary}
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
                onPress={() => setShowCartSortSheet(false)}
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

const getStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
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
    backgroundColor: theme.surface,
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
    color: theme.headerText,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  arrowButton: {
    fontSize: 22,
    fontWeight: '300',
    color: theme.textSecondary,
    paddingHorizontal: SPACING.sm,
  },
  dateRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    minWidth: 140,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: SPACING.xl,
  },
  bottomSpacer: {
    height: SPACING.md,
  },
  summaryCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    backgroundColor: theme.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: 0.8,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  savedText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.success,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: SPACING.md,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryFooterText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text,
    flex: 1,
  },
  dot: {
    color: theme.textSecondary,
  },
  seeRecapLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: SPACING.sm,
  },
  recentCartsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  recentCartsTitle: {
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
    backgroundColor: theme.surface,
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
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sortSheetWrapper: {
    gap: SPACING.sm,
  },
  sortSheetOptionsBlock: {
    backgroundColor: theme.card,
    borderRadius: 14,
    overflow: 'hidden',
  },
  sortSheetTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
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
    color: theme.primary,
    fontWeight: '600',
  },
  sortSheetCheckmark: {
    position: 'absolute',
    right: SPACING.lg,
  },
  sortSheetCancelBlock: {
    backgroundColor: theme.card,
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
    color: theme.primary,
  },
  cartCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cartName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  cartDate: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  cartSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  storeName: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.textSecondary,
    flex: 1,
  },
  moreButton: {
    padding: SPACING.xs,
  },
  moreIcon: {
    fontSize: 18,
    color: theme.textSecondary,
    fontWeight: '700',
  },
  progressBarContainer: {
    marginBottom: SPACING.md,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: theme.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  cartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spentText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text,
  },
  itemsText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 3,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
});
