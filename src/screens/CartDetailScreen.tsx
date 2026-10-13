import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SectionList,
  Alert,
  Animated,
} from 'react-native';
import { useGroceryStore } from '@store/index';
import { COLORS, SPACING, DEFAULT_CATEGORIES } from '@constants/index';
import { formatPesoAmount } from '@utils/index';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { SelectStoreSheet } from '@components/SelectStoreSheet';
import { persistCompletedCart, persistPurchaseHistory } from '../api/sync';

export const CartDetailScreen = ({ route, navigation }: any) => {
  const { cartId } = route.params;
  const { carts, updateCart, getStoreName, addPriceRecord, addRecentStore } =
    useGroceryStore();
  const cart = carts.find((c) => c.id === cartId);
  const [showFABMenu, setShowFABMenu] = useState(false);
  const [showStoreSheet, setShowStoreSheet] = useState(false);

  if (!cart) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyTitle}>Cart not found</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Calculate totals
  const budget = cart.budget || 0;
  const spent = cart.items.reduce((sum, item) => {
    if (item.isChecked) {
      return sum + (item.actualPrice || item.estimatedPrice) * item.quantity;
    }
    return sum;
  }, 0);
  const remaining = Math.max(0, budget - spent);
  const percentSpent = budget > 0 ? (spent / budget) * 100 : 0;

  // Get color based on percentage
  const getBarColor = () => {
    if (percentSpent <= 50) return COLORS.success;
    if (percentSpent <= 80) return COLORS.warning;
    return COLORS.danger;
  };

  // Group items by category
  const groupItemsByCategory = () => {
    const grouped: { [key: string]: any[] } = {};
    cart.items.forEach((item) => {
      const cat = item.category || 'Uncategorized';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(item);
    });
    return Object.entries(grouped).map(([category, items]) => ({
      title: category,
      data: items,
    }));
  };

  const handleCheckItem = async (itemId: string) => {
    if (cart.isCompleted) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedItems = cart.items.map((item) =>
      item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
    );
    const newSpent = updatedItems.reduce((sum, item) => {
      if (item.isChecked) {
        return sum + (item.actualPrice || item.estimatedPrice) * item.quantity;
      }
      return sum;
    }, 0);
    await updateCart({ ...cart, items: updatedItems, totalSpent: newSpent });
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert('Delete Item', 'Delete this item?', [
      { text: 'Cancel', onPress: () => { } },
      {
        text: 'Delete',
        onPress: async () => {
          const updatedItems = cart.items.filter((i) => i.id !== itemId);
          await updateCart({ ...cart, items: updatedItems });
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
        },
        style: 'destructive',
      },
    ]);
  };

  const getPriceTrend = (itemName: string, currentPrice: number) => {
    const completedCarts = carts.filter((c) => c.isCompleted);
    const sortedCarts = [...completedCarts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (const c of sortedCarts) {
      if (c.id === cartId) continue;
      const histItem = c.items.find(
        (i) => i.name.trim().toLowerCase() === itemName.trim().toLowerCase()
      );
      if (histItem) {
        const histPrice = histItem.actualPrice || histItem.estimatedPrice;
        const diff = currentPrice - histPrice;
        return {
          histPrice,
          diff,
        };
      }
    }
    return null;
  };

  const handleCompleteTrip = async () => {
    Alert.alert('Complete Trip', 'Complete this trip?', [
      {
        text: 'Cancel',
        onPress: () => { },
        style: 'cancel',
      },
      {
        text: 'Complete',
        onPress: async () => {
          const purchasedAt = new Date().toISOString();
          const storeName = getStoreName(cart.storeId);
          const tripTotal = cart.items.reduce(
            (sum, item) =>
              sum + (item.actualPrice || item.estimatedPrice) * item.quantity,
            0
          );

          const updatedCart = {
            ...cart,
            totalSpent: tripTotal,
            isCompleted: true,
            completedAt: purchasedAt,
          };

          console.log(
            '[CompleteTrip] saving cart',
            updatedCart.id,
            'items',
            updatedCart.items.length,
            'total',
            tripTotal
          );
          console.log('[CompleteTrip] Sending request...');

          const savedRemote = await persistCompletedCart(updatedCart);
          if (!savedRemote) {
            console.log('[CompleteTrip] Mongo cart save failed; keeping active cart');
            console.log('[CompleteTrip] Database save failed');
            console.log('[CompleteTrip] Keeping active cart');
            Alert.alert(
              'Could not save trip',
              'The trip was not saved to the database. Check that the backend is running and try Complete Trip again. Your cart was not cleared.'
            );
            return;
          }
          console.log('[CompleteTrip] Database save successful');

          for (const item of cart.items) {
            await addPriceRecord(item.name, item.category, item.categoryColor, {
              storeId: cart.storeId || 'local',
              storeName,
              price: item.actualPrice || item.estimatedPrice,
              date: purchasedAt,
            });
          }

          const purchaseMap = useGroceryStore.getState().itemPriceHistory;
          const savedPurchases = await persistPurchaseHistory(purchaseMap);
          if (!savedPurchases) {
            console.log('[CompleteTrip] Mongo price history save failed after cart save');
          }

          if (cart.storeId) {
            await addRecentStore(cart.storeId);
          }

          console.log('[CompleteTrip] Clearing active cart');
          await updateCart(updatedCart);
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
          navigation.replace('TripSummary', { cartId });
        },
        style: 'default',
      },
    ]);
  };

  const handleAddItem = (type: string) => {
    setShowFABMenu(false);
    if (type === 'manual') {
      navigation.navigate('AddEditItem', { cartId });
    } else if (type === 'voice') {
      navigation.navigate('VoiceInput', { cartId });
    } else if (type === 'camera') {
      navigation.navigate('CameraScanner', { cartId });
    }
  };

  const sections = groupItemsByCategory();
  const categoryMap = new Map(DEFAULT_CATEGORIES.map((c) => [c.name, c.color]));

  if (cart.items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {cart.name}
              </Text>
              <TouchableOpacity onPress={() => setShowStoreSheet(true)} disabled={cart.isCompleted}>
                <Text style={styles.storeName}>{getStoreName(cart.storeId)}</Text>
              </TouchableOpacity>
              <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Budget Bar */}
          <View style={styles.budgetSection}>
            <View style={styles.budgetBar}>
              <Animated.View
                style={[
                  styles.budgetProgress,
                  {
                    width: `${Math.min(percentSpent, 100)}%`,
                    backgroundColor: getBarColor(),
                  },
                ]}
              />
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Budget</Text>
              <Text style={styles.statValue}>₱{formatPesoAmount(budget)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Spent</Text>
              <Text style={[styles.statValue, { color: COLORS.danger }]}>
                ₱{formatPesoAmount(spent)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Left</Text>
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                ₱{formatPesoAmount(remaining)}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Empty State */}
        <View style={styles.emptyStateContainer}>
          <MaterialIcons name="shopping-cart" size={64} color={COLORS.textLight} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No items yet</Text>
          <Text style={styles.emptySubtitle}>Add your first item to get started</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => handleAddItem('manual')}
          >
            <Text style={styles.emptyButtonText}>Add First Item</Text>
          </TouchableOpacity>
        </View>

        {/* Floating Action Menu */}
        {!cart.isCompleted && (
          <View style={styles.fabContainer}>
            {showFABMenu && (
              <>
                <TouchableOpacity
                  style={styles.fabOption}
                  onPress={() => handleAddItem('manual')}
                >
                  <MaterialIcons name="edit" size={24} color={COLORS.white} />
                  <Text style={styles.fabLabel}>Manually</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.fabOption}
                  onPress={() => handleAddItem('voice')}
                >
                  <MaterialIcons name="mic" size={24} color={COLORS.white} />
                  <Text style={styles.fabLabel}>Voice</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.fabOption}
                  onPress={() => handleAddItem('camera')}
                >
                  <MaterialIcons name="camera-alt" size={24} color={COLORS.white} />
                  <Text style={styles.fabLabel}>Scan</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.fab}
              onPress={() => setShowFABMenu(!showFABMenu)}
            >
              <Text style={styles.fabText}>{showFABMenu ? '✕' : '+'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {cart.name}
            </Text>
            <TouchableOpacity onPress={() => setShowStoreSheet(true)} disabled={cart.isCompleted}>
              <Text style={styles.storeName}>{getStoreName(cart.storeId)}</Text>
            </TouchableOpacity>
            <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
          </View>
        </View>
      </View>

      {/* Budget Bar */}
      <View style={styles.budgetSection}>
        <View style={styles.budgetBar}>
          <Animated.View
            style={[
              styles.budgetProgress,
              {
                width: `${Math.min(percentSpent, 100)}%`,
                backgroundColor: getBarColor(),
              },
            ]}
          />
        </View>
        <Text style={styles.budgetPercentage}>{Math.round(percentSpent)}%</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Budget</Text>
          <Text style={styles.statValue}>₱{formatPesoAmount(budget)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Spent</Text>
          <Text style={[styles.statValue, { color: COLORS.danger }]}>
            ₱{formatPesoAmount(spent)}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Left</Text>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            ₱{formatPesoAmount(remaining)}
          </Text>
        </View>
      </View>

      {/* Items List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        scrollEnabled={true}
        style={styles.content}
        contentContainerStyle={{ paddingBottom: SPACING.xl * 3 }}
        renderSectionHeader={({ section: { title } }) => (
          <View
            style={[
              styles.categoryHeader,
              { backgroundColor: categoryMap.get(title) || COLORS.accent },
            ]}
          >
            <Text style={styles.categoryTitle}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => handleCheckItem(item.id)}
              disabled={cart.isCompleted}
            >
              <View
                style={[
                  styles.checkboxInner,
                  item.isChecked && styles.checkboxChecked,
                ]}
              >
                {item.isChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>

            <View style={styles.itemInfo}>
              <TouchableOpacity
                onLongPress={() => {
                  navigation.navigate('ItemDetail', { itemId: item.id, cartId });
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.itemName, item.isChecked && styles.strikethrough]}
                >
                  {item.name} ({item.quantity} {item.unit})
                </Text>
              </TouchableOpacity>

              <View style={styles.itemMetaRow}>
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('StoreComparison', { itemId: item.id, cartId });
                  }}
                  style={styles.compareLink}
                >
                  <View style={styles.compareRow}>
                    <MaterialIcons name="place" size={14} color={COLORS.primary} />
                    <Text style={styles.compareLinkText}>Compare Stores</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {(() => {
                const currentPrice = item.actualPrice || item.estimatedPrice;
                const trend = getPriceTrend(item.name, currentPrice);
                if (!trend) return null;
                const diff = trend.diff;
                const absDiff = Math.abs(diff);
                if (diff > 0.01) {
                  return (
                    <View style={[styles.trendBadge, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.trendBadgeText, { color: COLORS.danger }]}>
                        ↑ ₱{formatPesoAmount(absDiff)} more than last time
                      </Text>
                    </View>
                  );
                } else if (diff < -0.01) {
                  return (
                    <View style={[styles.trendBadge, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.trendBadgeText, { color: COLORS.success }]}>
                        ↓ ₱{formatPesoAmount(absDiff)} cheaper than last time
                      </Text>
                    </View>
                  );
                } else {
                  return (
                    <View style={[styles.trendBadge, { backgroundColor: '#F3F4F6' }]}>
                      <Text style={[styles.trendBadgeText, { color: '#4B5563' }]}>
                        → Same as last time
                      </Text>
                    </View>
                  );
                }
              })()}
            </View>

            <View style={styles.itemRight}>
              <Text
                style={[
                  styles.itemPrice,
                  item.isChecked && styles.strikethrough,
                ]}
              >
                ₱{formatPesoAmount(
                  (item.actualPrice || item.estimatedPrice) * item.quantity
                )}
              </Text>
              {!cart.isCompleted && (
                <>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                      navigation.navigate('AddEditItem', { cartId, itemId: item.id })
                    }
                  >
                    <MaterialIcons name="edit" size={18} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteItem(item.id)}
                  >
                    <MaterialIcons name="delete-outline" size={18} color="#E84040" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
      />

      {/* Complete Trip / View Recap Button */}
      <TouchableOpacity
        style={[
          styles.completeButton,
          cart.isCompleted && { backgroundColor: '#6B7280' }
        ]}
        onPress={
          cart.isCompleted
            ? () => navigation.navigate('TripSummary', { cartId })
            : handleCompleteTrip
        }
      >
        <Text style={styles.completeButtonText}>
          {cart.isCompleted ? 'View Summary' : 'Complete Trip'}
        </Text>
      </TouchableOpacity>

      {/* Floating Action Menu */}
      {!cart.isCompleted && (
        <View style={styles.fabContainer}>
          {showFABMenu && (
            <>
              <TouchableOpacity
                style={styles.fabOption}
                onPress={() => handleAddItem('manual')}
              >
                <MaterialIcons name="edit" size={24} color={COLORS.white} />
                <Text style={styles.fabLabel}>Manually</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fabOption}
                onPress={() => handleAddItem('voice')}
              >
                <MaterialIcons name="mic" size={24} color={COLORS.white} />
                <Text style={styles.fabLabel}>Voice</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fabOption}
                onPress={() => handleAddItem('camera')}
              >
                <MaterialIcons name="camera-alt" size={24} color={COLORS.white} />
                <Text style={styles.fabLabel}>Scan</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowFABMenu(!showFABMenu)}
          >
            <Text style={styles.fabText}>{showFABMenu ? '✕' : '+'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Store Selection Modal */}
      <SelectStoreSheet
        visible={showStoreSheet}
        cartId={cartId}
        onClose={() => setShowStoreSheet(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  storeName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textLight,
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textLight,
    marginTop: 4,
  },
  placeholder: {
    width: 50,
  },
  budgetSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  budgetBar: {
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  budgetProgress: {
    height: '100%',
    borderRadius: 6,
  },
  budgetPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  statBox: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  categoryHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  checkbox: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: COLORS.textLight,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  lastPrice: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: COLORS.textLight,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionButton: {
    padding: 6,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 76,
    right: SPACING.lg,
    gap: SPACING.md,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
  },
  fabOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  fabIcon: {
    fontSize: 24,
  },
  fabLabel: {
    position: 'absolute',
    bottom: -24,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text,
    width: 60,
    textAlign: 'center',
  },
  completeButton: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  emptyButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  trendBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  trendBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: SPACING.sm,
  },
  compareLink: {
    paddingVertical: 2,
  },
  compareLinkText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
