import React from 'react';
import { Alert, View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useGroceryStore } from '@store/index';
import { COLORS, SPACING } from '@constants/index';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/auth';
import type { SettingsStackParamList } from '../types';

export const SettingsScreen = () => {
  const { settings, updateSettings } = useGroceryStore();
  const navigation = useNavigation<StackNavigationProp<SettingsStackParamList>>();
  const { user, initialized, signOut } = useAuthStore();
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'Your carts and app settings will remain on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          signOut().catch((error: unknown) => {
            Alert.alert('Sign-out notice', error instanceof Error ? error.message : 'Please try again.');
          });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {user ? (
            <>
              <Text style={styles.accountEmail}>{user.email}</Text>
              <TouchableOpacity style={styles.accountButton} onPress={confirmSignOut}>
                <Feather name="log-out" size={18} color={theme.danger} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.guestBadge}>{initialized ? 'Guest Mode' : 'Checking account…'}</Text>
              <TouchableOpacity
                style={styles.accountButton}
                onPress={() => navigation.navigate('AuthWelcome')}
                disabled={!initialized}
                accessibilityRole="button"
              >
                <Feather name="user" size={18} color={theme.primary} />
                <Text style={styles.accountButtonText}>Sign In / Create Account</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingItem}>
            <View>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(value) =>
                updateSettings({ notificationsEnabled: value })
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          {(['light', 'dark'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={styles.themeOption}
              onPress={() => updateSettings({ themeMode: mode })}
              accessibilityRole="radio"
              accessibilityState={{ selected: settings.themeMode === mode }}
            >
              <Text style={styles.settingLabel}>
                {mode === 'light' ? 'Light Mode' : 'Dark Mode'}
              </Text>
              <View style={styles.radioOuter}>
                {settings.themeMode === mode && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>TipidBuddy v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const getStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { flex: 1, paddingVertical: SPACING.lg },
  section: { marginBottom: SPACING.xl, paddingHorizontal: SPACING.lg },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: SPACING.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  themeOption: {
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.primary,
  },
  settingLabel: { fontSize: 14, fontWeight: '600', color: theme.text },
  guestBadge: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: `${COLORS.accent}20`,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  accountEmail: { fontSize: 15, color: theme.textSecondary, marginBottom: SPACING.sm },
  accountButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  accountButtonText: { color: theme.primary, fontSize: 14, fontWeight: '600' },
  signOutText: { color: theme.danger, fontSize: 14, fontWeight: '600' },
  aboutText: { fontSize: 14, color: theme.textSecondary },
});
