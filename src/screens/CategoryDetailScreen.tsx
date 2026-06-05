import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useGroceryStore } from '@store/index';
import { COLORS, SPACING } from '@constants/index';
import { formatPesoAmount } from '@utils/index';
import { useTheme } from '../hooks/useTheme';

export const CategoryDetailScreen = ({ route, navigation }: any) => {
  const { cartId, categoryName } = route.params;
  const { carts } = useGroceryStore();
  const cart = carts.find((c) => c.id === cartId);
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const categoryItems = useMemo(() => {
    if (!cart) return [];
    return cart.items.filter((item) => item.category === categoryName);
  }, [cart, categoryName]);

  const categoryColor = categoryItems[0]?.categoryColor || COLORS.primary;
  const totalAmount = categoryItems.reduce(
    (sum, item) => sum + (item.actualPrice || item.estimatedPrice) * item.quantity,
    0
  );

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.itemRow}
      onPress={() =>
        navigation.navigate('ItemDetail', {
          itemId: item.id,
          itemName: item.name,
          cartId,
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDetails}>
          {item.quantity} × ₱{formatPesoAmount(item.actualPrice || item.estimatedPrice)}
        </Text>
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.itemAmount}>
          ₱{formatPesoAmount((item.actualPrice || item.estimatedPrice) * item.quantity)}
        </Text>
        <Text style={styles.itemArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{categoryName}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Summary Card */}
      <View style={[styles.summaryCard, { borderLeftColor: categoryColor }]}>
        <Text style={styles.summaryLabel}>Total Spent</Text>
        <Text style={[styles.summaryAmount, { color: categoryColor }]}>
          ₱{formatPesoAmount(totalAmount)}
        </Text>
        <Text style={styles.summaryItemCount}>{categoryItems.length} items</Text>
      </View>

      {/* Items List */}
      <FlatList
        data={categoryItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
      />
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
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.lg,
      paddingTop: SPACING.lg + 8,
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
    summaryCard: {
      marginHorizontal: SPACING.lg,
      marginVertical: SPACING.lg,
      marginBottom: SPACING.xl,
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: SPACING.lg,
      borderLeftWidth: 4,
    },
    summaryLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '500',
      marginBottom: SPACING.xs,
    },
    summaryAmount: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: SPACING.sm,
    },
    summaryItemCount: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    listContent: {
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xl,
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.md,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: SPACING.xs,
    },
    itemDetails: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    itemRight: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: SPACING.lg,
    },
    itemAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    itemArrow: {
      fontSize: 18,
      color: theme.primary,
      marginLeft: SPACING.sm,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
    },
  });
