import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { useGroceryStore } from '@store/index';
import { SPACING, CATEGORY_COLORS } from '@constants/index';
import { generateId } from '@utils/index';
import { useTheme } from '../hooks/useTheme';

export const CategoryManagerScreen = ({ navigation }: any) => {
  const { categories, addCategory, deleteCategory } = useGroceryStore();
  const [showForm, setShowForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    const newCategory = {
      id: generateId(),
      name: newCategoryName,
      color: selectedColor,
    };

    await addCategory(newCategory);
    setNewCategoryName('');
    setShowForm(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    Alert.alert('Delete Category', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteCategory(categoryId),
      },
    ]);
  };

  const renderCategoryItem = ({ item }: { item: any }) => {
    const categoryColor = theme.isDark ? `${item.color}CC` : item.color;
    return (
      <View style={styles.categoryItem}>
        <View style={styles.categoryLeft}>
          <View
            style={[styles.colorSwatch, { backgroundColor: categoryColor }]}
          />
          <Text style={styles.categoryName}>{item.name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteCategory(item.id)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Add New Category Section */}
        {!showForm ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.addButtonText}>+ Add Category</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.formBox}>
            <TextInput
              style={styles.input}
              placeholder="Category name"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholderTextColor={theme.textMuted}
            />

            <Text style={styles.colorLabel}>Select color:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.colorPicker}
            >
              {CATEGORY_COLORS.map((color) => {
                const itemColor = theme.isDark ? `${color}CC` : color;
                return (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      {
                        backgroundColor: itemColor,
                        borderWidth: selectedColor === color ? 3 : 0,
                        borderColor: selectedColor === color ? theme.text : 'transparent',
                      },
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                );
              })}
            </ScrollView>

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowForm(false);
                  setNewCategoryName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddCategory}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Categories List */}
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>All Categories</Text>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
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
    content: {
      flex: 1,
      padding: SPACING.lg,
    },
    addButton: {
      paddingVertical: SPACING.lg,
      marginBottom: SPACING.xl,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.primary,
      borderStyle: 'dashed',
      alignItems: 'center',
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
    },
    formBox: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.lg,
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: SPACING.xl,
      borderWidth: 1,
      borderColor: theme.border,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      marginBottom: SPACING.lg,
      fontSize: 14,
      color: theme.text,
      backgroundColor: theme.inputBackground,
    },
    colorLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.text,
      marginBottom: SPACING.md,
    },
    colorPicker: {
      marginBottom: SPACING.lg,
    },
    colorOption: {
      width: 50,
      height: 50,
      borderRadius: 8,
      marginRight: SPACING.md,
    },
    formButtons: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: SPACING.md,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.text,
    },
    saveButton: {
      flex: 1,
      paddingVertical: SPACING.md,
      borderRadius: 8,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.isDark ? theme.background : '#FFFFFF',
    },
    listSection: {
      marginBottom: SPACING.xl,
    },
    listTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: SPACING.md,
    },
    categoryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      backgroundColor: theme.card,
      borderRadius: 8,
      paddingHorizontal: SPACING.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    categoryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
    },
    colorSwatch: {
      width: 28,
      height: 28,
      borderRadius: 6,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
    },
    deleteButton: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: theme.isDark ? 'rgba(255, 107, 107, 0.15)' : 'rgba(232, 64, 64, 0.15)',
      borderRadius: 6,
    },
    deleteButtonText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.danger,
    },
    separator: {
      height: SPACING.sm,
    },
  });

