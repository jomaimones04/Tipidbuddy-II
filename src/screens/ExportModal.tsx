import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { useGroceryStore } from '@store/index';
import { SPACING } from '@constants/index';
import { generateCSV } from '@utils/index';
import { useTheme } from '../hooks/useTheme';

export const ExportModal = ({ route, navigation }: any) => {
  const { cartId } = route.params;
  const { carts } = useGroceryStore();
  const cart = carts.find((c) => c.id === cartId);
  const [isExporting, setIsExporting] = useState(false);
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  if (!cart) {
    return (
      <View style={styles.container}>
        <Text style={styles.optionTitle}>Cart not found</Text>
      </View>
    );
  }

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const csv = generateCSV(
        cart.name,
        cart.items,
        cart.totalSpent,
        cart.budget,
        'All Stores',
        cart.date
      );

      // Try to share the CSV
      await Sharing.shareAsync(
        `data:text/csv;base64,${Buffer.from(csv).toString('base64')}`,
        {
          mimeType: 'text/csv',
          dialogTitle: 'Export Shopping Cart',
          UTI: 'public.csv',
        }
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportText = async () => {
    try {
      setIsExporting(true);
      let text = `SHOPPING CART: ${cart.name}\n`;
      text += `Date: ${new Date(cart.date).toLocaleDateString()}\n`;
      text += `Budget: ₱${cart.budget}\nTotal Spent: ₱${cart.totalSpent}\n\n`;
      text += `ITEMS:\n`;
      cart.items.forEach((item, index) => {
        text += `${index + 1}. ${item.name}\n`;
        text += `   Quantity: ${item.quantity} ${item.unit || ''}\n`;
        text += `   Price: ₱${item.actualPrice || item.estimatedPrice}\n`;
        text += `   Category: ${item.category}\n\n`;
      });

      await Sharing.shareAsync(
        `data:text/plain;base64,${Buffer.from(text).toString('base64')}`,
        {
          mimeType: 'text/plain',
          dialogTitle: 'Export Shopping List',
        }
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export text');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Export Cart</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Cart Info */}
        <View style={styles.cartInfo}>
          <Text style={styles.cartName}>{cart.name}</Text>
          <View style={styles.cartStats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Items</Text>
              <Text style={styles.statValue}>{cart.items.length}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={styles.statValue}>₱{cart.totalSpent}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Budget</Text>
              <Text style={styles.statValue}>₱{cart.budget}</Text>
            </View>
          </View>
        </View>

        {/* Export Options */}
        <View style={styles.optionsSection}>
          <Text style={styles.optionsTitle}>Export as:</Text>

          {/* CSV Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleExportCSV}
            disabled={isExporting}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.iconText}>📊</Text>
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>CSV File</Text>
              <Text style={styles.optionDescription}>
                Spreadsheet format for analysis and record keeping
              </Text>
            </View>
          </TouchableOpacity>

          {/* Text List Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleExportText}
            disabled={isExporting}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.iconText}>📝</Text>
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Text List</Text>
              <Text style={styles.optionDescription}>
                Plain text format for printing or sharing
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresBox}>
          <Text style={styles.featuresTitle}>What's included:</Text>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>✓</Text>
            <Text style={styles.featureText}>Cart name and date</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>✓</Text>
            <Text style={styles.featureText}>All items with prices</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>✓</Text>
            <Text style={styles.featureText}>Budget and total spent</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>✓</Text>
            <Text style={styles.featureText}>Categories</Text>
          </View>
        </View>

        {/* Note */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            You can share or save the exported file to your device for later reference.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.closeButtonFull}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
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
    closeButton: {
      fontSize: 24,
      color: theme.headerText,
    },
    title: {
      fontSize: 26,
      fontWeight: '600',
      color: theme.headerText,
    },
    placeholder: {
      width: 24,
    },
    content: {
      flex: 1,
      padding: SPACING.lg,
    },
    cartInfo: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.lg,
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: SPACING.xl,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cartName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: SPACING.lg,
    },
    cartStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    stat: {
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      marginBottom: SPACING.xs,
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.primary,
    },
    optionsSection: {
      marginBottom: SPACING.xl,
    },
    optionsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: SPACING.lg,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.lg,
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: SPACING.md,
      gap: SPACING.lg,
      borderWidth: 1,
      borderColor: theme.border,
    },
    optionIcon: {
      width: 50,
      height: 50,
      borderRadius: 12,
      backgroundColor: theme.isDark ? 'rgba(74, 222, 128, 0.15)' : 'rgba(45, 125, 70, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconText: {
      fontSize: 28,
    },
    optionContent: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: SPACING.xs,
    },
    optionDescription: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    featuresBox: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.lg,
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: SPACING.lg,
      borderWidth: 1,
      borderColor: theme.border,
    },
    featuresTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
      marginBottom: SPACING.md,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      marginBottom: SPACING.md,
    },
    featureBullet: {
      fontSize: 14,
      color: theme.success,
      fontWeight: 'bold',
    },
    featureText: {
      flex: 1,
      fontSize: 12,
      color: theme.text,
    },
    noteBox: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.lg,
      backgroundColor: theme.isDark ? 'rgba(244, 161, 35, 0.15)' : 'rgba(244, 161, 35, 0.1)',
      borderRadius: 12,
      marginBottom: SPACING.lg,
      borderWidth: 1,
      borderColor: theme.border,
    },
    noteText: {
      fontSize: 12,
      color: theme.text,
      lineHeight: 18,
    },
    footer: {
      padding: SPACING.lg,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
    closeButtonFull: {
      paddingVertical: SPACING.md,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    closeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.isDark ? theme.background : '#FFFFFF',
    },
  });

