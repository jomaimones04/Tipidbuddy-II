import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useGroceryStore } from '@store/index';
import { SPACING } from '@constants/index';
import { formatPesoAmount } from '@utils/index';
import { CreateCartSheet } from '@components/CreateCartSheet';
import { useTheme } from '../hooks/useTheme';

export const HomeScreen = ({ navigation }: any) => {
  const { carts, getAllCarts, getStoreName } = useGroceryStore();
  const [showCreateCart, setShowCreateCart] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  // Animations
  const fabScale = useSharedValue(0);
  const tabIndicatorX = useSharedValue(0);

  useEffect(() => {
    // FAB scale in animation
    fabScale.value = withSpring(1, {
      damping: 10,
      mass: 1,
      overshootClamping: true,
    });
  }, []);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  useFocusEffect(
    React.useCallback(() => {
      getAllCarts();
    }, [getAllCarts])
  );

  const filteredCarts = React.useMemo(() => {
    if (activeTab === 'active') {
      return carts.filter((c) => !c.isCompleted);
    } else if (activeTab === 'completed') {
      return carts.filter((c) => c.isCompleted);
    } else {
      return carts;
    }
  }, [carts, activeTab]);

  const renderCartItem = ({ item, index }: { item: any; index: number }) => {
    return (
      <CartRow
        item={item}
        index={index}
        navigation={navigation}
        getStoreName={getStoreName}
        theme={theme}
      />
    );
  };

  const renderEmptyState = () => {
    if (activeTab === 'active') {
      return (
        <TouchableOpacity
          style={styles.emptyStateContainer}
          onPress={() => setShowCreateCart(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>No active carts — tap + to start a new trip</Text>
        </TouchableOpacity>
      );
    } else if (activeTab === 'completed') {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyText}>No completed trips yet — finish a cart to see it here</Text>
        </View>
      );
    } else {
      return (
        <TouchableOpacity
          style={styles.emptyStateContainer}
          onPress={() => setShowCreateCart(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No carts yet : Your shopping carts will be shown here. Tap + to create your first cart</Text>
        </TouchableOpacity>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'active' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('active')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.tabTextActive,
            ]}
          >
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'completed' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('completed')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'completed' && styles.tabTextActive,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'all' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('all')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'all' && styles.tabTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Carts List */}
      {filteredCarts.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredCarts}
          renderItem={renderCartItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={true}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Floating Action Button */}
      <Animated.View style={[fabAnimatedStyle, styles.fabContainer]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateCart(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Create Cart Sheet */}
      <CreateCartSheet
        visible={showCreateCart}
        onClose={() => setShowCreateCart(false)}
        onNavigateToTemplates={() => {
          navigation.navigate('HomeTab', { screen: 'TemplatesTab' });
        }}
      />
    </View>
  );
};

// Animated Cart Row Component
const CartRow = React.memo(
  ({ item, index, navigation, getStoreName, theme }: any) => {
    const styles = React.useMemo(() => getStyles(theme), [theme]);
    const translateY = useSharedValue(30);
    const opacity = useSharedValue(0);

    useEffect(() => {
      // Staggered animation for each cart
      const delay = index * 100;
      translateY.value = withDelay(
        delay,
        withTiming(0, {
          duration: 400,
          easing: Easing.out(Easing.ease),
        })
      );
      opacity.value = withDelay(
        delay,
        withTiming(1, {
          duration: 400,
          easing: Easing.out(Easing.ease),
        })
      );
    }, []);

    const cardScale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }, { scale: cardScale.value }],
      opacity: opacity.value,
    }));

    const onPressIn = () => {
      cardScale.value = withSpring(0.97, {
        damping: 15,
        mass: 1,
        overshootClamping: true,
      });
    };

    const onPressOut = () => {
      cardScale.value = withSpring(1, {
        damping: 15,
        mass: 1,
        overshootClamping: true,
      });
    };

    const spent = item.totalSpent || 0;
    const budget = item.budget || 0;
    const percentage = budget > 0 ? (spent / budget) * 100 : 0;
    const checkedCount = item.items.filter((i: any) => i.isChecked).length;
    const itemsCount = item.items.length;

    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={styles.cartCard}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={() => {
            if (item.isCompleted) {
              navigation.navigate('SpendingRecap', {
                startDate: new Date(item.date),
                endDate: new Date(item.date),
              });
            } else {
              navigation.navigate('CartDetail', { cartId: item.id });
            }
          }}
        >
          <View style={styles.cartCardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cartName}>{item.name}</Text>
              <Text style={styles.storeName}>{getStoreName(item.storeId)}</Text>
            </View>
            {item.isCompleted && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>✓ Completed</Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(percentage, 100)}%`,
                    backgroundColor:
                      percentage <= 100 && spent <= budget
                        ? theme.success
                        : theme.danger,
                  },
                ]}
              />
            </View>
          </View>

          {/* Footer */}
          <View style={styles.cartFooter}>
            <Text style={styles.spentText}>
              ₱{formatPesoAmount(spent)} of ₱{formatPesoAmount(budget)} spent
            </Text>
            <Text style={styles.itemsCount}>
              {checkedCount}/{itemsCount}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

CartRow.displayName = 'CartRow';

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    tabsContainer: {
      flexDirection: 'row',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: SPACING.sm,
    },
    tabButton: {
      flex: 1,
      paddingVertical: SPACING.sm,
      borderRadius: 20,
      backgroundColor: theme.inputBackground,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    tabButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    tabTextActive: {
      color: theme.isDark ? theme.background : '#FFFFFF',
    },
    completedBadge: {
      backgroundColor: theme.isDark ? 'rgba(74, 222, 128, 0.15)' : 'rgba(45, 125, 70, 0.15)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'center',
    },
    completedBadgeText: {
      color: theme.success,
      fontSize: 12,
      fontWeight: '600',
    },
    fab: {
      position: 'absolute',
      bottom: SPACING.lg,
      right: SPACING.lg,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    fabContainer: {
      position: 'absolute',
      bottom: SPACING.lg,
      right: SPACING.lg,
    },
    fabText: {
      fontSize: 32,
      fontWeight: '600',
      color: theme.isDark ? theme.background : '#FFFFFF',
    },
    listContent: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.lg,
      gap: SPACING.md,
    },
    cartCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cartCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SPACING.md,
    },
    cartName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      marginBottom: SPACING.xs,
    },
    storeName: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textSecondary,
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
    itemsCount: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.xl * 2,
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
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });

