import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useGroceryStore } from '@store/index';
import { SPACING } from '@constants/index';
import { formatPesoAmount, getStoreBreakdown } from '@utils/index';
import { useTheme } from '../hooks/useTheme';
import type { ItemPriceHistoryEntry } from '../types/index';

export const StoreComparisonScreen = ({ route, navigation }: any) => {
  const { itemId, cartId } = route.params;
  const { carts, updateCart, getStoreName, getRecordsForItemName } =
    useGroceryStore();
  const cart = carts.find((c) => c.id === cartId);
  const item = cart?.items.find((i) => i.id === itemId);
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const sorted = useMemo((): ItemPriceHistoryEntry[] => {
    if (!item) return [];

    const fromGlobal = getRecordsForItemName(item.name);
    if (fromGlobal.length > 0) {
      return getStoreBreakdown(fromGlobal);
    }

    const records: ItemPriceHistoryEntry[] = [];
    carts.forEach((c) => {
      if (c.isCompleted) {
        c.items.forEach((i) => {
          if (i.name.trim().toLowerCase() === item.name.trim().toLowerCase()) {
            records.push({
              storeId: c.storeId || 'local',
              storeName: getStoreName(c.storeId),
              price: i.actualPrice || i.estimatedPrice,
              date: c.completedAt || c.date || new Date().toISOString(),
            });
          }
        });
      }
    });

    return getStoreBreakdown(records);
  }, [item, carts, getRecordsForItemName, getStoreName]);

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.itemName}>Item not found</Text>
      </View>
    );
  }

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

  const lowestPrice = sorted.length > 0 ? sorted[0].price : 0;

  const handleSetPreferredStore = async (storeId: string) => {
    if (!cart) return;
    const updatedItems = cart.items.map((i) =>
      i.id === item.id ? { ...i, storeId } : i
    );
    const updatedCart = { ...cart, items: updatedItems };
    await updateCart(updatedCart);
    Alert.alert(
      'Preferred Store Set',
      `Preferred store updated to ${getStoreName(storeId === 'local' ? undefined : storeId)} for ${item.name}.`
    );
  };

  const isPreferredStore = (store: ItemPriceHistoryEntry) => {
    const cartStoreName = getStoreName(cart?.storeId).toLowerCase().trim();
    return (
      item.storeId === store.storeId ||
      store.storeName.toLowerCase().trim() === cartStoreName
    );
  };

  const renderStoreCard = ({ item: store }: { item: ItemPriceHistoryEntry }) => {
    const difference = store.price - lowestPrice;
    const timeAgo = getTimeAgo(store.date);
    const isPreferred = isPreferredStore(store);
    const isCheapest = store.price === lowestPrice;

    return (
      <View style={styles.storeCard}>
        <View style={styles.storeHeader}>
          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>{store.storeName}</Text>
            <Text style={styles.storeDate}>Last bought {timeAgo}</Text>
          </View>
          <View style={styles.storePriceSection}>
            <Text style={styles.price}>₱{formatPesoAmount(store.price)}</Text>
            {isCheapest ? (
              <Text style={styles.bestPrice}>✅ Cheapest</Text>
            ) : difference > 0 ? (
              <Text style={styles.difference}>
                +₱{formatPesoAmount(difference)}
              </Text>
            ) : null}
          </View>
        </View>

        {!cart?.isCompleted ? (
          <TouchableOpacity
            style={[
              styles.preferredButton,
              isPreferred && styles.preferredButtonActive,
            ]}
            onPress={() => handleSetPreferredStore(store.storeId)}
          >
            <Text
              style={[
                styles.preferredButtonText,
                isPreferred && styles.preferredButtonTextActive,
              ]}
            >
              {isPreferred ? '★ Preferred Store' : 'Shop here next time'}
            </Text>
          </TouchableOpacity>
        ) : (
          isPreferred && (
            <View
              style={[
                styles.preferredButton,
                styles.preferredButtonActive,
                { opacity: 0.6 },
              ]}
            >
              <Text
                style={[styles.preferredButtonText, styles.preferredButtonTextActive]}
              >
                ★ Preferred Store
              </Text>
            </View>
          )
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Store Comparison</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDetail}>
          Current Price: ₱{formatPesoAmount(item.actualPrice || item.estimatedPrice)}
        </Text>
      </View>

      {sorted.length > 0 ? (
        <>
          <FlatList
            data={sorted}
            renderItem={renderStoreCard}
            keyExtractor={(store) => store.storeName.toLowerCase().trim()}
            contentContainerStyle={styles.list}
            scrollEnabled={true}
          />

          <View style={styles.recommendationBox}>
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationTitle}>Best Deal:</Text>
              <Text style={styles.recommendationStore}>{sorted[0].storeName}</Text>
              <Text style={styles.recommendationPrice}>
                ₱{formatPesoAmount(sorted[0].price)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.recommendationButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.recommendationButtonText}>Noted</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyText}>No historical price data yet</Text>
          <Text style={styles.emptySubtext}>
            Complete shopping trips to compare prices across stores.
          </Text>
          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backHomeButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}
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
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      backgroundColor: theme.header,
    },
    backButton: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.headerText,
    },
    title: {
      fontSize: 26,
      fontWeight: '600',
      color: theme.headerText,
    },
    placeholder: {
      width: 60,
    },
    itemInfo: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.lg,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    itemName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    itemDetail: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: SPACING.xs,
    },
    list: {
      padding: SPACING.lg,
      gap: SPACING.md,
    },
    storeCard: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.lg,
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    storeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: SPACING.md,
    },
    storeInfo: {
      flex: 1,
      gap: 4,
    },
    storeName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    storeDate: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    storePriceSection: {
      alignItems: 'flex-end',
      gap: 4,
    },
    price: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.primary,
    },
    difference: {
      fontSize: 12,
      color: theme.danger,
      fontWeight: '600',
    },
    bestPrice: {
      fontSize: 12,
      color: theme.success,
      fontWeight: '600',
    },
    preferredButton: {
      backgroundColor: theme.card,
      borderColor: theme.primary,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: SPACING.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    preferredButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    preferredButtonText: {
      color: theme.primary,
      fontWeight: '600',
      fontSize: 13,
    },
    preferredButtonTextActive: {
      color: theme.isDark ? theme.background : '#FFFFFF',
    },
    recommendationBox: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.lg,
      backgroundColor: theme.isDark ? 'rgba(74, 222, 128, 0.15)' : 'rgba(45, 125, 70, 0.15)',
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: SPACING.lg,
    },
    recommendationContent: {
      flex: 1,
    },
    recommendationTitle: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    recommendationStore: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.success,
    },
    recommendationPrice: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginTop: SPACING.xs,
    },
    recommendationButton: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      backgroundColor: theme.success,
      borderRadius: 8,
    },
    recommendationButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.isDark ? theme.background : '#FFFFFF',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.xl,
      paddingBottom: SPACING.xl * 2,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: SPACING.lg,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: SPACING.sm,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: SPACING.lg,
    },
    backHomeButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    backHomeButtonText: {
      color: theme.isDark ? theme.background : '#FFFFFF',
      fontWeight: '600',
      fontSize: 14,
    },
  });
