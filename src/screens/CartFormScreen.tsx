import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useGroceryStore } from '@store/index';
import { SPACING } from '@constants/index';
import { generateId } from '@utils/index';
import { useTheme } from '../hooks/useTheme';

export const CartFormScreen = ({ route, navigation }: any) => {
  const { cartId } = route.params || {};
  const { carts, addCart, updateCart } = useGroceryStore();
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const existingCart = cartId ? carts.find((c) => c.id === cartId) : null;

  React.useEffect(() => {
    if (existingCart) {
      setName(existingCart.name);
      setBudget(existingCart.budget.toString());
    }
  }, [existingCart]);

  const handleSave = async () => {
    if (!name.trim() || !budget.trim()) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    const numBudget = parseFloat(budget);
    if (isNaN(numBudget) || numBudget <= 0) {
      Alert.alert('Validation Error', 'Budget must be a valid positive number');
      return;
    }

    if (existingCart) {
      const updated = {
        ...existingCart,
        name,
        budget: numBudget,
      };
      await updateCart(updated);
    } else {
      const newCart = {
        id: generateId(),
        name,
        budget: numBudget,
        items: [],
        date: new Date().toISOString(),
        isCompleted: false,
        totalSpent: 0,
      };
      await addCart(newCart);
    }

    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.content}>
        <Text style={styles.title}>{existingCart ? 'Edit Cart' : 'Create Cart'}</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Cart Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Weekly Groceries"
              value={name}
              onChangeText={setName}
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Budget (₱)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 1500"
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      padding: SPACING.lg,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: SPACING.xl,
    },
    form: {
      gap: SPACING.lg,
    },
    field: {
      gap: SPACING.sm,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      fontSize: 14,
      color: theme.text,
      backgroundColor: theme.inputBackground,
    },
    footer: {
      flexDirection: 'row',
      gap: SPACING.md,
      padding: SPACING.lg,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: SPACING.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    saveButton: {
      flex: 1,
      paddingVertical: SPACING.md,
      borderRadius: 12,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.isDark ? theme.background : '#FFFFFF',
    },
  });

