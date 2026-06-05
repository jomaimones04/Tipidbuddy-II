import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useGroceryStore } from '@store/index';
import { SPACING } from '@constants/index';
import { generateId } from '@utils/index';
import { useTheme } from '../hooks/useTheme';
import type { Store } from '../types/index';

interface SelectStoreSheetProps {
  visible: boolean;
  cartId: string;
  onClose: () => void;
}

type TabType = 'recent' | 'all';

export const SelectStoreSheet: React.FC<SelectStoreSheetProps> = ({
  visible,
  cartId,
  onClose,
}) => {
  const {
    stores,
    updateCart,
    carts,
    addStore,
    deleteStore,
    recentStoreIds,
    addRecentStore,
  } = useGroceryStore();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showAddStore, setShowAddStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const cart = carts.find((c) => c.id === cartId);

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

  const handleSelectStore = async (storeId: string) => {
    if (!cart) return;

    try {
      const updatedCart = { ...cart, storeId };
      await updateCart(updatedCart);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to select store');
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    Alert.alert('Delete Store', 'Are you sure you want to delete this store?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await deleteStore(storeId);
          } catch {
            Alert.alert('Error', 'Failed to delete store');
          }
        },
        style: 'destructive',
      },
    ]);
  };

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

      if (cart) {
        await updateCart({ ...cart, storeId: newStore.id });
      }

      setNewStoreName('');
      setShowAddStore(false);
      setActiveTab('recent');
    } catch {
      Alert.alert('Error', 'Failed to add store');
    }
  };

  const renderStoreRow = (store: Store) => (
    <View key={store.id} style={styles.storeRow}>
      <TouchableOpacity
        style={styles.storeNameContainer}
        onPress={() => handleSelectStore(store.id)}
      >
        <Text style={styles.storeName}>{store.name}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteStore(store.id)}
      >
        <Text style={styles.deleteIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Store</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'recent' && styles.tabActive]}
              onPress={() => setActiveTab('recent')}
            >
              <Text
                style={[styles.tabText, activeTab === 'recent' && styles.tabTextActive]}
              >
                Recent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.tabActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text
                style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}
              >
                All
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.storesList} showsVerticalScrollIndicator={false}>
            {activeTab === 'recent' && recentStoresList.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No recent stores yet</Text>
              </View>
            ) : displayedStores.length > 0 ? (
              displayedStores.map((store) => renderStoreRow(store))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No stores available</Text>
              </View>
            )}
          </ScrollView>

          {showAddStore ? (
            <View style={styles.addStoreForm}>
              <TextInput
                style={styles.addStoreInput}
                placeholder="Store name"
                value={newStoreName}
                onChangeText={setNewStoreName}
                placeholderTextColor={theme.textMuted}
                autoFocus
              />
              <View style={styles.addStoreButtons}>
                <TouchableOpacity
                  style={styles.addStoreCancelButton}
                  onPress={() => {
                    setShowAddStore(false);
                    setNewStoreName('');
                  }}
                >
                  <Text style={styles.addStoreCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addStoreConfirmButton}
                  onPress={handleAddStore}
                >
                  <Text style={styles.addStoreConfirmText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addStoreButton}
              onPress={() => setShowAddStore(true)}
            >
              <Text style={styles.addStoreButtonText}>+ Add new store...</Text>
            </TouchableOpacity>
          )}
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
      maxHeight: 300,
      paddingHorizontal: SPACING.lg,
    },
    storeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    storeNameContainer: {
      flex: 1,
    },
    storeName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    deleteButton: {
      padding: SPACING.sm,
      marginLeft: SPACING.md,
    },
    deleteIcon: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.danger,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.xl,
    },
    emptyText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    addStoreForm: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
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
    addStoreButtons: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    addStoreCancelButton: {
      flex: 1,
      paddingVertical: SPACING.md,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
    },
    addStoreCancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    addStoreConfirmButton: {
      flex: 1,
      paddingVertical: SPACING.md,
      borderRadius: 8,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    addStoreConfirmText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.isDark ? theme.background : '#FFFFFF',
    },
    addStoreButton: {
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.lg,
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    addStoreButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
    },
  });
