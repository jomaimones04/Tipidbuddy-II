import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  PanResponder,
  Animated,
} from 'react-native';
import { useGroceryStore } from '@store/index';
import { SPACING } from '@constants/index';
import { generateId } from '@utils/index';
import { useTheme } from '../hooks/useTheme';
import type { Store } from '../types/index';

interface CreateCartSheetProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToTemplates: () => void;
}

export const CreateCartSheet: React.FC<CreateCartSheetProps> = ({
  visible,
  onClose,
  onNavigateToTemplates: _onNavigateToTemplates,
}) => {
  const { stores, addCart } = useGroceryStore();
  const [cartName, setCartName] = useState('');
  const [budget, setBudget] = useState('');
  const [selectedStore, setSelectedStore] = useState<string | undefined>(undefined);
  const [showStoreSheet, setShowStoreSheet] = useState(false);
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(0);
    }
  }, [visible, sheetTranslateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          sheetTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 90 || gestureState.vy > 0.4) {
          Animated.timing(sheetTranslateY, {
            toValue: 400,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            sheetTranslateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const getStoreName = (storeId?: string) => {
    if (!storeId) return 'Local';
    const store = stores.find((s) => s.id === storeId);
    return store?.name || 'Local';
  };

  const handleSaveCart = async () => {
    if (!cartName.trim() || !budget) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    try {
      const newCart = {
        id: generateId(),
        name: cartName,
        budget: parseFloat(budget),
        items: [],
        storeId: selectedStore || undefined,
        date: new Date().toISOString(),
        isCompleted: false,
        totalSpent: 0,
      };

      await addCart(newCart);
      setCartName('');
      setBudget('');
      setSelectedStore(undefined);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to create cart');
    }
  };

  const handleStoreSheetClose = () => {
    setShowStoreSheet(false);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
          >
            {/* Drag Handle */}
            <View style={styles.dragHandleContainer} {...panResponder.panHandlers}>
              <View style={styles.dragHandle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Create New Cart</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Form */}
            <ScrollView
              style={styles.form}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            >
              {/* Name Row */}
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Name</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="New cart"
                  value={cartName}
                  onChangeText={setCartName}
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={styles.rowDivider} />

              {/* Budget Row */}
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Budget</Text>
                <View style={styles.budgetInputContainer}>
                  <Text style={styles.currencySymbol}>₱</Text>
                  <TextInput
                    style={styles.budgetInput}
                    placeholder="0.00"
                    value={budget}
                    onChangeText={setBudget}
                    keyboardType="decimal-pad"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>
              <View style={styles.rowDivider} />

              {/* Store Row */}
              <TouchableOpacity
                style={styles.formRow}
                onPress={() => setShowStoreSheet(true)}
              >
                <Text style={styles.formLabel}>Store</Text>
                <View style={styles.storeValueContainer}>
                  <Text style={styles.storeValue}>{getStoreName(selectedStore)}</Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveCart}
            >
              <Text style={styles.saveButtonText}>Save Cart</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Store Selection Sheet - This will be shown from within the cart creation flow */}
      <SelectStoreSheetForCreation
        visible={showStoreSheet}
        onClose={handleStoreSheetClose}
        onSelectStore={(storeId) => {
          setSelectedStore(storeId);
          setShowStoreSheet(false);
        }}
        stores={stores}
      />
    </>
  );
};

// Simplified store selector for cart creation (doesn't modify cart)
const SelectStoreSheetForCreation: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelectStore: (storeId: string) => void;
  stores: any[];
}> = ({ visible, onClose, onSelectStore, stores }) => {
  const { addStore, recentStoreIds, addRecentStore } = useGroceryStore();
  const [activeTab, setActiveTab] = useState<'recent' | 'all'>('all');
  const [showAddStore, setShowAddStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const theme = useTheme();
  const storeSheetStyles = React.useMemo(() => getStoreSheetStyles(theme), [theme]);

  useEffect(() => {
    if (visible) {
      setActiveTab(recentStoreIds.length > 0 ? 'recent' : 'all');
      setShowAddStore(false);
      setNewStoreName('');
    }
  }, [visible, recentStoreIds.length]);

  const recentStoresList = useMemo(() => {
    return recentStoreIds
      .map((id) => stores.find((s) => s.id === id))
      .filter((s): s is Store => Boolean(s));
  }, [recentStoreIds, stores]);

  const allStoresList = useMemo(
    () => [...stores].sort((a, b) => a.name.localeCompare(b.name)),
    [stores]
  );

  const displayedStores =
    activeTab === 'recent' ? recentStoresList : allStoresList;

  const handleAddStore = async () => {
    if (!newStoreName.trim()) {
      Alert.alert('Validation', 'Please enter a store name');
      return;
    }
    try {
      const newStore = {
        id: generateId(),
        name: newStoreName.trim(),
        createdAt: new Date().toISOString(),
      };
      await addStore(newStore);
      await addRecentStore(newStore.id);
      onSelectStore(newStore.id);
      setNewStoreName('');
      setShowAddStore(false);
      setActiveTab('recent');
    } catch {
      Alert.alert('Error', 'Failed to add store');
    }
  };

  const handleSelectStore = async (storeId: string) => {
    await addRecentStore(storeId);
    onSelectStore(storeId);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={storeSheetStyles.overlay}>
        <View style={storeSheetStyles.sheet}>
          <View style={storeSheetStyles.dragHandle} />

          <View style={storeSheetStyles.header}>
            <Text style={storeSheetStyles.headerTitle}>Select Store</Text>
            <TouchableOpacity onPress={onClose} style={storeSheetStyles.closeButton}>
              <Text style={storeSheetStyles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={storeSheetStyles.tabContainer}>
            <TouchableOpacity
              style={[
                storeSheetStyles.tab,
                activeTab === 'recent' && storeSheetStyles.tabActive,
              ]}
              onPress={() => setActiveTab('recent')}
            >
              <Text
                style={[
                  storeSheetStyles.tabText,
                  activeTab === 'recent' && storeSheetStyles.tabTextActive,
                ]}
              >
                Recent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[storeSheetStyles.tab, activeTab === 'all' && storeSheetStyles.tabActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text
                style={[
                  storeSheetStyles.tabText,
                  activeTab === 'all' && storeSheetStyles.tabTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={storeSheetStyles.storesList} showsVerticalScrollIndicator={false}>
            {activeTab === 'recent' && recentStoresList.length === 0 ? (
              <View style={storeSheetStyles.emptyState}>
                <Text style={storeSheetStyles.emptyStateText}>No recent stores yet</Text>
              </View>
            ) : displayedStores.length > 0 ? (
              displayedStores.map((store) => (
                <TouchableOpacity
                  key={store.id}
                  style={storeSheetStyles.storeRow}
                  onPress={() => handleSelectStore(store.id)}
                >
                  <Text style={storeSheetStyles.storeName}>{store.name}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={storeSheetStyles.emptyState}>
                <Text style={storeSheetStyles.emptyStateText}>No stores available</Text>
              </View>
            )}

            {!showAddStore && (
              <TouchableOpacity
                style={storeSheetStyles.addStoreButton}
                onPress={() => setShowAddStore(true)}
              >
                <Text style={storeSheetStyles.addStoreText}>+ Add new store</Text>
              </TouchableOpacity>
            )}

            {showAddStore && (
              <View style={storeSheetStyles.addStoreForm}>
                <TextInput
                  style={storeSheetStyles.addStoreInput}
                  placeholder="Store name"
                  value={newStoreName}
                  onChangeText={setNewStoreName}
                  placeholderTextColor={theme.textMuted}
                />
                <View style={storeSheetStyles.addStoreActions}>
                  <TouchableOpacity
                    style={storeSheetStyles.cancelButton}
                    onPress={() => {
                      setShowAddStore(false);
                      setNewStoreName('');
                    }}
                  >
                    <Text style={storeSheetStyles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={storeSheetStyles.confirmButton}
                    onPress={handleAddStore}
                  >
                    <Text style={storeSheetStyles.confirmButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.lg,
      maxHeight: '70%',
      borderWidth: 1,
      borderColor: theme.border,
    },
    dragHandleContainer: {
      alignItems: 'center',
      paddingVertical: SPACING.md,
    },
    dragHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.border,
      borderRadius: 2,
    },
    header: {
      marginBottom: SPACING.md,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginBottom: SPACING.md,
    },
    form: {
      marginBottom: SPACING.lg,
    },
    formRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.md,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
    },
    formInput: {
      flex: 1,
      marginLeft: SPACING.md,
      fontSize: 14,
      color: theme.text,
      textAlign: 'right',
      padding: 0,
    },
    budgetInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: SPACING.md,
    },
    currencySymbol: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
      marginRight: SPACING.xs,
    },
    budgetInput: {
      fontSize: 14,
      color: theme.text,
      textAlign: 'right',
      padding: 0,
      minWidth: 80,
    },
    storeValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: SPACING.md,
    },
    storeValue: {
      fontSize: 14,
      color: theme.text,
      marginRight: SPACING.sm,
    },
    chevron: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    rowDivider: {
      height: 1,
      backgroundColor: theme.border,
    },
    saveButton: {
      paddingVertical: SPACING.md,
      borderRadius: 8,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.isDark ? theme.background : '#FFFFFF',
    },
  });

const getStoreSheetStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
      paddingBottom: SPACING.lg,
      borderWidth: 1,
      borderColor: theme.border,
    },
    dragHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: SPACING.md,
      marginBottom: SPACING.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    backButton: {
      padding: SPACING.sm,
    },
    backIcon: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      padding: SPACING.sm,
    },
    closeIcon: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
    },
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.lg,
      backgroundColor: theme.inputBackground,
      borderRadius: 8,
      padding: SPACING.sm,
      marginHorizontal: SPACING.lg,
    },
    tab: {
      flex: 1,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: 6,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: theme.card,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    tabTextActive: {
      color: theme.text,
    },
    storesList: {
      paddingHorizontal: SPACING.lg,
    },
    emptyState: {
      paddingVertical: SPACING.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    storeRow: {
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    storeName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    addStoreButton: {
      paddingVertical: SPACING.md,
      marginTop: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    addStoreText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
      textAlign: 'center',
    },
    addStoreForm: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingVertical: SPACING.md,
      marginTop: SPACING.md,
    },
    addStoreInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      fontSize: 14,
      color: theme.text,
      marginBottom: SPACING.md,
      backgroundColor: theme.inputBackground,
    },
    addStoreActions: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: SPACING.sm,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    confirmButton: {
      flex: 1,
      paddingVertical: SPACING.sm,
      borderRadius: 6,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    confirmButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.isDark ? theme.background : '#FFFFFF',
    },
  });

