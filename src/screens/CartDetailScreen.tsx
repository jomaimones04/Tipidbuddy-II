import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Alert,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useGroceryStore } from '@store/index';
import { COLORS, SPACING } from '@constants/index';
import { formatPesoAmount } from '@utils/index';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { SelectStoreSheet } from '@components/SelectStoreSheet';
import { persistCompletedCart, persistPurchaseHistory } from '../api/sync';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';

export const CartDetailScreen = ({ route, navigation }: any) => {
  const { cartId } = route.params;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { carts, updateCart, getStoreName, addPriceRecord, addRecentStore } =
    useGroceryStore();
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const cart = carts.find((c) => c.id === cartId);
  const categoryOrderRef = useRef<{ cartId: string; categories: string[] } | null>(null);
  const [showStoreSheet, setShowStoreSheet] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTripSummary, setShowTripSummary] = useState(false);
  const [editType, setEditType] = useState<'name' | 'budget' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const savingTrip = useRef(false);
  const completionTriggered = useRef(false);
  const openedSwipeableRef = useRef<Swipeable | null>(null);

  if (cart && categoryOrderRef.current?.cartId !== cart.id) {
    categoryOrderRef.current = {
      cartId: cart.id,
      categories: [...new Set(cart.items.map((item) => item.category || 'Uncategorized'))],
    };
  } else if (cart && categoryOrderRef.current) {
    cart.items.forEach((item) => {
      const category = item.category || 'Uncategorized';
      if (!categoryOrderRef.current?.categories.includes(category)) {
        categoryOrderRef.current?.categories.push(category);
      }
    });
  }

  const saveCompletedTrip = async () => {
    if (
      !cart ||
      savingTrip.current ||
      cart.isCompleted ||
      cart.items.length === 0
    ) {
      return;
    }
    savingTrip.current = true;
    setIsSavingTrip(true);
    try {
      const purchasedAt = new Date().toISOString();
      const storeName = getStoreName(cart.storeId);
      const purchasedItems = cart.items.filter((item) => item.isChecked);
      const tripTotal = purchasedItems.reduce(
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

      const savedRemote = await persistCompletedCart(updatedCart);
      if (!savedRemote) {
        Alert.alert(
          'Could not save trip',
          'The trip was not saved to the database. Check that the backend is running and try again. Your cart was not cleared.'
        );
        return;
      }

      for (const item of purchasedItems) {
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
        console.error('[CompleteTrip] Price history save failed after cart save');
      }
      if (cart.storeId) await addRecentStore(cart.storeId);

      await updateCart(updatedCart);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowTripSummary(false);
      navigation.replace('TripSummary', { cartId });
    } catch (error) {
      console.error('[CompleteTrip] Failed to save trip:', error);
      Alert.alert('Could not save trip', 'An error occurred while saving this trip. Please try again.');
    } finally {
      savingTrip.current = false;
      setIsSavingTrip(false);
    }
  };

  useEffect(() => {
    if (!cart || cart.isCompleted) return;
    const allItemsChecked =
      cart.items.length > 0 && cart.items.every((item) => item.isChecked);
    if (!allItemsChecked) {
      completionTriggered.current = false;
      setShowTripSummary(false);
      return;
    }
    if (completionTriggered.current) return;

    completionTriggered.current = true;
    setShowTripSummary(true);
  }, [cart?.items, cart?.isCompleted]);

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
    const categories = new Map<string, typeof cart.items>();
    cart.items
      .filter((item) => !item.isChecked)
      .forEach((item) => {
        const category = item.category || 'Uncategorized';
        const items = categories.get(category) || [];
        categories.set(category, [...items, item]);
      });

    const categoryOrder = categoryOrderRef.current?.categories || [];
    const categorySections = Array.from(categories, ([title, data]) => ({
      title,
      data,
      isCheckedSection: false,
    })).sort((a, b) => categoryOrder.indexOf(a.title) - categoryOrder.indexOf(b.title));
    const checkedItems = cart.items.filter((item) => item.isChecked);
    if (checkedItems.length > 0) {
      categorySections.push({
        title: 'Checked Items',
        data: checkedItems,
        isCheckedSection: true,
      });
    }

    return categorySections;
  };

  const handleCheckItem = async (itemId: string) => {
    if (cart.isCompleted) return;
    openedSwipeableRef.current?.close();
    openedSwipeableRef.current = null;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const item = cart.items.find((cartItem) => cartItem.id === itemId);
    if (!item) return;

    const updatedItem = { ...item, isChecked: !item.isChecked };
    const remainingItems = cart.items.filter((cartItem) => cartItem.id !== itemId);
    let updatedItems: typeof cart.items;
    if (updatedItem.isChecked) {
      updatedItems = [...remainingItems, updatedItem];
    } else {
      const uncheckedItems = remainingItems.filter((cartItem) => !cartItem.isChecked);
      const checkedItems = remainingItems.filter((cartItem) => cartItem.isChecked);
      const itemCategory = updatedItem.category || 'Uncategorized';
      let insertionIndex = -1;

      uncheckedItems.forEach((cartItem, index) => {
        if ((cartItem.category || 'Uncategorized') === itemCategory) {
          insertionIndex = index + 1;
        }
      });
      if (insertionIndex === -1) {
        const categoryOrder = categoryOrderRef.current?.categories || [];
        const itemCategoryOrder = categoryOrder.indexOf(itemCategory);
        insertionIndex = uncheckedItems.findIndex((cartItem) => {
          const category = cartItem.category || 'Uncategorized';
          const categoryIndex = categoryOrder.indexOf(category);
          return categoryIndex > itemCategoryOrder;
        });
        if (insertionIndex === -1) insertionIndex = uncheckedItems.length;
      }

      uncheckedItems.splice(insertionIndex, 0, updatedItem);
      updatedItems = [...uncheckedItems, ...checkedItems];
    }

    const newSpent = updatedItems.reduce((sum, item) => {
      if (item.isChecked) {
        return sum + (item.actualPrice || item.estimatedPrice) * item.quantity;
      }
      return sum;
    }, 0);
    await updateCart({ ...cart, items: updatedItems, totalSpent: newSpent });
  };

  const handleCheckAll = async (isChecked: boolean) => {
    if (cart.isCompleted) return;
    const existingCheckedItems = cart.items.filter((item) => item.isChecked);
    const uncheckedItems = cart.items.filter((item) => !item.isChecked);
    const updatedItems = isChecked
      ? [
          ...existingCheckedItems,
          ...uncheckedItems.map((item) => ({ ...item, isChecked: true })),
        ]
      : cart.items.map((item) => ({ ...item, isChecked: false }));
    const totalSpent = updatedItems.reduce((sum, item) => {
      return sum + (item.isChecked ? (item.actualPrice || item.estimatedPrice) * item.quantity : 0);
    }, 0);
    await updateCart({ ...cart, items: updatedItems, totalSpent });
  };

  const openCartMenu = () => {
    openedSwipeableRef.current?.close();
    openedSwipeableRef.current = null;
    setShowMenu(true);
  };

  const closeOpenedSwipeable = () => {
    openedSwipeableRef.current?.close();
    openedSwipeableRef.current = null;
  };

  const saveCartEdit = async () => {
    if (editType === 'name') {
      const name = editValue.trim();
      if (!name) {
        Alert.alert('Invalid name', 'Please enter a cart name.');
        return;
      }
      await updateCart({ ...cart, name });
    } else if (editType === 'budget') {
      const rawBudget = editValue.replace(/,/g, '').trim();
      const budgetValue = Number(rawBudget);
      if (!rawBudget || !Number.isFinite(budgetValue) || budgetValue < 0) {
        Alert.alert('Invalid budget', 'Enter a valid budget amount.');
        return;
      }
      await updateCart({ ...cart, budget: budgetValue });
    }
    setEditType(null);
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

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Home');
  };

  const handleMenuAction = (
    action: 'rename' | 'budget' | 'check' | 'uncheck' | 'complete'
  ) => {
    setShowMenu(false);
    if (action === 'rename') {
      setEditValue(cart.name);
      setEditType('name');
    } else if (action === 'budget') {
      setEditValue(String(cart.budget));
      setEditType('budget');
    } else if (action === 'check') {
      void handleCheckAll(true);
    } else if (action === 'uncheck') {
      void handleCheckAll(false);
    } else if (action === 'complete') {
      if (cart.isCompleted) {
        navigation.navigate('TripSummary', { cartId });
      } else if (cart.items.length > 0) {
        setShowTripSummary(true);
      }
    }
  };

  const handleAddItem = (type: string) => {
    if (type === 'manual') {
      navigation.navigate('AddEditItem', { cartId });
    } else if (type === 'voice') {
      navigation.navigate('VoiceInput', { cartId });
    } else if (type === 'camera') {
      navigation.navigate('CameraScanner', { cartId });
    }
  };

  const actionBar = !cart.isCompleted ? (
    <View
      style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}
      onTouchStart={closeOpenedSwipeable}
    >
      <TouchableOpacity
        style={styles.actionBarButton}
        onPress={() => handleAddItem('voice')}
        accessibilityRole="button"
        accessibilityLabel="Add products using voice input"
      >
        <MaterialIcons name="mic" size={26} color={theme.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionBarButton}
        onPress={() => handleAddItem('manual')}
        accessibilityRole="button"
        accessibilityLabel="Add product manually"
      >
        <View style={styles.addButton}>
          <MaterialIcons name="add" size={30} color={COLORS.white} />
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionBarButton}
        onPress={() => handleAddItem('camera')}
        accessibilityRole="button"
        accessibilityLabel="Scan a product"
      >
        <MaterialIcons name="qr-code-scanner" size={26} color={theme.textSecondary} />
      </TouchableOpacity>
    </View>
  ) : null;

  const sections = groupItemsByCategory();
  const formattedDate = new Date(cart.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const cartHeader = (
    <View
      style={[styles.headerContainer, { paddingTop: insets.top }]}
      onTouchStart={closeOpenedSwipeable}
    >
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Back to dashboard"
        >
          <MaterialIcons name="arrow-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={openCartMenu}
          accessibilityRole="button"
          accessibilityLabel="Cart options"
        >
          <MaterialIcons name="more-vert" size={26} color={theme.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.cartInfo}>
        <View style={styles.cartInfoText}>
          <Text style={styles.headerTitle} numberOfLines={1}>{cart.name}</Text>
          <TouchableOpacity
            style={styles.storeRow}
            onPress={() => setShowStoreSheet(true)}
            disabled={cart.isCompleted}
            accessibilityRole="button"
            accessibilityLabel={`Store: ${getStoreName(cart.storeId)}`}
          >
            <Text style={styles.storeName}>Store: {getStoreName(cart.storeId)}</Text>
            {!cart.isCompleted && (
              <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.textSecondary} />
            )}
          </TouchableOpacity>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>
      </View>
    </View>
  );
  const budgetSummary = (
    <View style={styles.summaryContainer} onTouchStart={closeOpenedSwipeable}>
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Budget:</Text>
          <Text style={styles.statValue}>₱{formatPesoAmount(budget)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Spent:</Text>
          <Text style={styles.statValue}>₱{formatPesoAmount(spent)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, styles.statRight]}>Remaining:</Text>
          <Text style={[styles.statValue, styles.statRight, { color: theme.success }]}>
            ₱{formatPesoAmount(remaining)}
          </Text>
        </View>
      </View>
      <View
        style={styles.budgetBar}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.min(percentSpent, 100) }}
      >
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
  );
  const tripItemCount = cart.items.length;
  const budgetDifference = budget - spent;
  const overBudgetAmount = Math.max(0, spent - budget);
  const tripBudgetStatus =
    budgetDifference > 0
      ? {
          label: 'Saved',
          stamp: 'UNDER BUDGET',
          amount: budgetDifference,
          color: theme.success,
        }
      : overBudgetAmount > 0
        ? {
            label: 'Over',
            stamp: 'OVER BUDGET',
            amount: overBudgetAmount,
            color: '#C65300',
          }
        : {
            label: 'Budget Used',
            stamp: 'ON BUDGET',
            amount: 0,
            color: theme.textSecondary,
          };
  const menuOptions: {
    label: string;
    icon: React.ComponentProps<typeof MaterialIcons>['name'];
    action: 'rename' | 'budget' | 'check' | 'uncheck' | 'complete';
  }[] = [
    { label: 'Rename Cart', icon: 'edit', action: 'rename' },
    { label: 'Edit Budget', icon: 'attach-money', action: 'budget' },
    { label: 'Check All', icon: 'check-box', action: 'check' },
    { label: 'Uncheck All', icon: 'check-box-outline-blank', action: 'uncheck' },
    { label: 'Complete Trip', icon: 'flag', action: 'complete' },
  ];
  const menuHeight = menuOptions.length * 52;
  const menuTop = Math.min(
    insets.top + 48,
    Math.max(insets.top + SPACING.sm, windowHeight - insets.bottom - menuHeight - SPACING.md)
  );
  const overlays = (
    <>
      <SelectStoreSheet
        visible={showStoreSheet}
        cartId={cartId}
        onClose={() => setShowStoreSheet(false)}
      />
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <View style={styles.menuBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowMenu(false)}
            accessibilityLabel="Close cart options"
          />
          <View style={[styles.menuCard, { top: menuTop, maxHeight: menuHeight }]}>
            {menuOptions.map(({ label, icon, action }, index) => (
              <TouchableOpacity
                key={action}
                style={[
                  styles.menuItem,
                  index < menuOptions.length - 1 && styles.menuItemDivider,
                ]}
                onPress={() => handleMenuAction(action)}
                accessibilityRole="button"
              >
                <MaterialIcons name={icon} size={22} color="#F3F4F6" />
                <Text style={styles.menuItemText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
      <Modal
        visible={editType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditType(null)}
      >
        <KeyboardAvoidingView
          style={styles.editBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.editDialog}>
            <Text style={styles.editTitle}>
              {editType === 'name' ? 'Rename Cart' : 'Edit Budget'}
            </Text>
            <TextInput
              style={styles.editInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={editType === 'name' ? 'Cart name' : 'Budget amount'}
              keyboardType={editType === 'budget' ? 'decimal-pad' : 'default'}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.editAction}
                onPress={() => setEditType(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editAction}
                onPress={saveCartEdit}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={showTripSummary}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTripSummary(false)}
      >
        <View style={styles.tripSummaryBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowTripSummary(false)}
            accessibilityLabel="Close trip summary"
          />
          <View style={styles.tripSummaryCard}>
            <TouchableOpacity
              style={styles.tripSummaryClose}
              onPress={() => setShowTripSummary(false)}
              accessibilityRole="button"
              accessibilityLabel="Close trip summary"
            >
              <MaterialIcons name="close" size={23} color={theme.textMuted} />
            </TouchableOpacity>
            <Text style={styles.tripSummaryTitle} numberOfLines={1}>
              {cart.name.toUpperCase()}
            </Text>
            <Text style={styles.tripSummaryDate}>{formattedDate}</Text>
            <View style={styles.tripSummaryRows}>
              <View style={styles.tripSummaryRow}>
                <Text style={styles.tripSummaryLabel}>Items</Text>
                <Text style={styles.tripSummaryValue}>{tripItemCount}</Text>
              </View>
              <View style={styles.tripSummaryRow}>
                <Text style={styles.tripSummaryLabel}>Budget</Text>
                <Text style={styles.tripSummaryValue}>₱{formatPesoAmount(budget)}</Text>
              </View>
              <View style={styles.tripSummaryRow}>
                <Text style={styles.tripSummaryLabel}>Spent</Text>
                <Text style={styles.tripSummaryValue}>₱{formatPesoAmount(spent)}</Text>
              </View>
            </View>
            <View style={[styles.tripSummaryRow, styles.tripSummaryBalance]}>
              <Text style={[styles.tripSummaryStatus, { color: tripBudgetStatus.color }]}>
                {tripBudgetStatus.label}
              </Text>
              <Text style={[styles.tripSummaryStatus, { color: tripBudgetStatus.color }]}>
                ₱{formatPesoAmount(tripBudgetStatus.amount)}
              </Text>
            </View>
            {budgetDifference !== 0 && (
              <View style={[styles.budgetStamp, { borderColor: tripBudgetStatus.color }]}>
                <Text style={[styles.budgetStampText, { color: tripBudgetStatus.color }]}>
                  {tripBudgetStatus.stamp}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.finishTripButton, isSavingTrip && styles.disabledButton]}
              onPress={() => void saveCompletedTrip()}
              disabled={isSavingTrip}
              accessibilityRole="button"
              accessibilityLabel="Finish trip"
            >
              <Text style={styles.finishTripText}>
                {isSavingTrip ? 'Saving trip…' : 'Finish trip'}
              </Text>
            </TouchableOpacity>
            {overBudgetAmount > 0 && (
              <TouchableOpacity
                style={styles.reviewCartButton}
                onPress={() => setShowTripSummary(false)}
                accessibilityRole="button"
                accessibilityLabel="Review cart"
              >
                <Text style={styles.reviewCartText}>Review cart</Text>
              </TouchableOpacity>
            )}
            <View pointerEvents="none" style={styles.receiptEdge}>
              {Array.from({ length: 28 }, (_, index) => (
                <View key={index} style={styles.receiptTooth} />
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

  if (cart.items.length === 0) {
    return (
      <View style={styles.container}>
        {cartHeader}
        {budgetSummary}

        <View style={styles.emptyStateContainer}>
          <MaterialIcons name="shopping-basket" size={52} color="#B5B5B5" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add items by voice or scan a product.</Text>
        </View>

        {actionBar}
        {overlays}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {cartHeader}
      {budgetSummary}

      {/* Items List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        scrollEnabled={true}
        style={styles.content}
        contentContainerStyle={{ paddingBottom: SPACING.xl * 3 }}
        renderSectionHeader={({ section }) => (
          <View style={styles.categoryHeader} onTouchStart={closeOpenedSwipeable}>
            <Text style={styles.categoryTitle}>
              {section.isCheckedSection ? 'CHECKED ITEMS' : section.title}
            </Text>
            <Text style={styles.categoryCount}>({section.data.length})</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Swipeable
            friction={2}
            rightThreshold={40}
            overshootRight={false}
            enabled={!cart.isCompleted}
            onSwipeableOpen={(direction, swipeable) => {
              if (direction !== 'left') return;
              if (
                openedSwipeableRef.current &&
                openedSwipeableRef.current !== swipeable
              ) {
                openedSwipeableRef.current.close();
              }
              openedSwipeableRef.current = swipeable;
            }}
            onSwipeableClose={(_direction, swipeable) => {
              if (openedSwipeableRef.current === swipeable) {
                openedSwipeableRef.current = null;
              }
            }}
            renderRightActions={() => (
              <View style={styles.swipeActions}>
                <TouchableOpacity
                  style={[styles.swipeAction, styles.editSwipeAction]}
                  onPress={() => {
                    closeOpenedSwipeable();
                    navigation.navigate('AddEditItem', { cartId, itemId: item.id });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.name}`}
                >
                  <MaterialIcons name="edit" size={22} color={COLORS.white} />
                  <Text style={styles.swipeActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.swipeAction, styles.deleteSwipeAction]}
                  onPress={() => {
                    closeOpenedSwipeable();
                    void handleDeleteItem(item.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${item.name}`}
                >
                  <MaterialIcons name="delete-outline" size={22} color={COLORS.white} />
                  <Text style={styles.swipeActionText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          >
          <View style={styles.itemRow} onTouchStart={closeOpenedSwipeable}>
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
                  closeOpenedSwipeable();
                  navigation.navigate('ItemDetail', { itemId: item.id, cartId });
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.itemName, item.isChecked && styles.strikethrough]}
                >
                  {item.name} ({item.quantity} {item.unit})
                </Text>
                {item.isChecked && (
                  <Text style={styles.itemCategoryLabel}>
                    {item.category || 'Uncategorized'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.itemMetaRow}>
                <TouchableOpacity
                  onPress={() => {
                    closeOpenedSwipeable();
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
                      <Text style={[styles.trendBadgeText, { color: theme.danger }]}>
                        ↑ ₱{formatPesoAmount(absDiff)} more than last time
                      </Text>
                    </View>
                  );
                } else if (diff < -0.01) {
                  return (
                    <View style={[styles.trendBadge, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.trendBadgeText, { color: theme.success }]}>
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
            </View>
          </View>
          </Swipeable>
        )}
      />

      {actionBar}

      {/* Store Selection Modal */}
      {overlays}
    </View>
  );
};

const getStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface,
  },
  headerContainer: {
    backgroundColor: theme.surface,
    paddingHorizontal: SPACING.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
  },
  headerIconButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartInfo: {
    minHeight: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingBottom: SPACING.md,
  },
  cartInfoText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.text,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.textSecondary,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.textSecondary,
    marginTop: SPACING.xs,
  },
  summaryContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    backgroundColor: theme.surface,
  },
  budgetBar: {
    height: 9,
    backgroundColor: theme.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  budgetProgress: {
    height: '100%',
    borderRadius: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statBox: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  statRight: {
    textAlign: 'right',
    alignSelf: 'flex-end',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
  },
  content: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    marginHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.textSecondary,
    textTransform: 'uppercase',
  },
  categoryCount: {
    marginLeft: SPACING.xs,
    fontSize: 12,
    color: theme.textMuted,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
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
    borderColor: theme.textMuted,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.success,
    borderColor: theme.success,
  },
  checkmark: {
    color: theme.headerText,
    fontSize: 14,
    fontWeight: '700',
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
  itemCategoryLabel: {
    fontSize: 11,
    color: theme.textSecondary,
    marginBottom: SPACING.xs,
  },
  lastPrice: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: theme.textSecondary,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
  swipeActions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  swipeAction: {
    width: 76,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  editSwipeAction: {
    backgroundColor: '#009B69',
  },
  deleteSwipeAction: {
    backgroundColor: '#F44343',
  },
  swipeActionText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  menuCard: {
    position: 'absolute',
    right: SPACING.md,
    width: 250,
    maxWidth: '80%',
    backgroundColor: '#2B2B2D',
    borderRadius: 4,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  menuItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  menuItemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#454547',
  },
  menuItemText: {
    fontSize: 16,
    color: '#F3F4F6',
  },
  editBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  editDialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: SPACING.lg,
    backgroundColor: theme.surface,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    marginBottom: SPACING.md,
  },
  editInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    color: theme.text,
    backgroundColor: theme.inputBackground,
    fontSize: 16,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.lg,
    gap: SPACING.lg,
  },
  editAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  cancelText: {
    color: theme.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveText: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  tripSummaryBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  tripSummaryCard: {
    position: 'relative',
    width: '100%',
    maxWidth: 430,
    borderRadius: 22,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl * 1.4,
    paddingBottom: SPACING.lg,
    backgroundColor: theme.surface,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  tripSummaryClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tripSummaryTitle: {
    marginHorizontal: 36,
    textAlign: 'center',
    fontSize: 16,
    letterSpacing: 2,
    fontWeight: '700',
    color: theme.text,
  },
  tripSummaryDate: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    color: theme.textSecondary,
    fontSize: 14,
  },
  tripSummaryRows: {
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tripSummaryRow: {
    minHeight: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripSummaryLabel: {
    fontSize: 15,
    color: theme.textSecondary,
  },
  tripSummaryValue: {
    fontSize: 15,
    color: theme.text,
    fontWeight: '500',
  },
  tripSummaryBalance: {
    paddingTop: SPACING.md,
  },
  tripSummaryStatus: {
    fontSize: 17,
    fontWeight: '700',
  },
  budgetStamp: {
    alignSelf: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderWidth: 2,
    borderRadius: 9,
    transform: [{ rotate: '-9deg' }],
  },
  budgetStampText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  finishTripButton: {
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 11,
    backgroundColor: theme.success,
  },
  reviewCartButton: {
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: theme.success,
    borderRadius: 11,
    backgroundColor: theme.surface,
  },
  reviewCartText: {
    color: theme.success,
    fontSize: 16,
    fontWeight: '500',
  },
  receiptEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -7,
    height: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptTooth: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: theme.surface,
  },
  finishTripText: {
    color: theme.headerText,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.65,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  actionBarButton: {
    flex: 1,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyIcon: {
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 0,
  },
  emptyButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: theme.primary,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.headerText,
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
    color: theme.primary,
    fontWeight: '600',
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
