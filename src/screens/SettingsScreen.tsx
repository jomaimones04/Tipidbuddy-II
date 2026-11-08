import React from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { useGroceryStore } from '@store/index';
import { COLORS, SPACING } from '@constants/index';
import { useTheme } from '../hooks/useTheme';

export const SettingsScreen = () => {
  const { settings, updateSettings } = useGroceryStore();
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.settingItem}>
            <View>
              <Text style={styles.settingLabel}>Default Budget (₱)</Text>
              <Text style={styles.settingValue}>{settings.defaultBudget}</Text>
            </View>
          </View>

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
          <Text style={styles.sectionTitle}>Account</Text>
          {settings.isGuest && (
            <Text style={styles.guestBadge}>Guest Mode</Text>
          )}
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
  settingValue: { fontSize: 12, color: theme.textSecondary, marginTop: SPACING.xs },
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
  aboutText: { fontSize: 14, color: theme.textSecondary },
});
