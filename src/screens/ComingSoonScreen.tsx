import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@constants/index';
import { useTheme } from '../hooks/useTheme';

export const ComingSoonScreen = ({ route, navigation }: any) => {
  const { featureName, icon } = route.params || { featureName: 'Feature', icon: 'construction' };
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coming Soon</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={icon} size={80} color={theme.primary} />
          <View style={styles.lockBadge}>
            <MaterialIcons name="lock" size={16} color={COLORS.white} />
          </View>
        </View>

        <Text style={styles.title}>{featureName}</Text>
        <Text style={styles.subtitle}>Feature Coming Soon!</Text>
        
        <Text style={styles.description}>
          We are currently working hard to build this feature. In a future update, you'll be able to use this to quickly manage your shopping list.
        </Text>

        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
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
      backgroundColor: COLORS.primary,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: COLORS.white,
    },
    placeholder: {
      width: 32,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.xl * 1.5,
    },
    iconContainer: {
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: theme.isDark ? 'rgba(74, 222, 128, 0.1)' : 'rgba(45, 125, 70, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.xl,
    },
    lockBadge: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      backgroundColor: theme.danger || '#EF4444',
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.background,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      marginBottom: SPACING.xs,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
      marginBottom: SPACING.lg,
      textAlign: 'center',
    },
    description: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: SPACING.xl * 1.5,
    },
    button: {
      backgroundColor: theme.primary,
      paddingHorizontal: SPACING.xl * 1.5,
      paddingVertical: SPACING.md,
      borderRadius: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.isDark ? theme.background : '#FFFFFF',
    },
  });
