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
import { SPACING } from '@constants/index';
import { generateId } from '@utils/index';
import { useTheme } from '../hooks/useTheme';

export const FamilySharingScreen = ({ navigation }: any) => {
  const { settings, updateSettings } = useGroceryStore();
  const [memberName, setMemberName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const members = settings.familyMembers || [];
  const maxMembers = 5;
  const canAddMore = members.length < maxMembers;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddMember = async () => {
    if (!memberName.trim()) {
      Alert.alert('Error', 'Please enter member name');
      return;
    }

    const newMember = {
      id: generateId(),
      name: memberName,
      avatarInitials: getInitials(memberName),
    };

    const updatedMembers = [...members, newMember];
    await updateSettings({ familyMembers: updatedMembers });
    setMemberName('');
    setShowForm(false);
  };

  const handleRemoveMember = (memberId: string) => {
    Alert.alert('Remove Member', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updatedMembers = members.filter((m) => m.id !== memberId);
          await updateSettings({ familyMembers: updatedMembers });
        },
      },
    ]);
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      theme.primary,
      theme.accent,
      theme.danger,
      theme.isDark ? '#4ADE80' : '#10B981',
      '#8B5CF6',
    ];
    return colors[index % colors.length];
  };

  const renderMemberCard = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.memberCard}>
      <View
        style={[
          styles.avatar,
          { backgroundColor: getAvatarColor(index), opacity: theme.isDark ? 0.8 : 1 },
        ]}
      >
        <Text style={styles.avatarText}>{item.avatarInitials}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberStatus}>Family member</Text>
      </View>
      <TouchableOpacity
        onPress={() => handleRemoveMember(item.id)}
        style={styles.removeButton}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Family Sharing</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Add family members to share shopping lists and carts. You can add up to
            {' '}{maxMembers} members.
          </Text>
        </View>

        {/* Member Count */}
        <View style={styles.countBox}>
          <Text style={styles.countLabel}>Members</Text>
          <Text style={styles.countValue}>
            {members.length} / {maxMembers}
          </Text>
        </View>

        {/* Add Form */}
        {!showForm ? (
          canAddMore && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowForm(true)}
            >
              <Text style={styles.addButtonText}>+ Add Member</Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.formBox}>
            <TextInput
              style={styles.input}
              placeholder="Member name"
              value={memberName}
              onChangeText={setMemberName}
              placeholderTextColor={theme.textMuted}
            />
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowForm(false);
                  setMemberName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddMember}
              >
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Members List */}
        {members.length > 0 ? (
          <View style={styles.membersList}>
            <Text style={styles.listTitle}>Current Members</Text>
            <FlatList
              data={members}
              renderItem={renderMemberCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No family members yet</Text>
            <Text style={styles.emptySubtext}>
              Add members to share shopping lists
            </Text>
          </View>
        )}

        {/* Features Info */}
        <View style={styles.featuresBox}>
          <Text style={styles.featuresTitle}>With family sharing:</Text>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>✓</Text>
            <Text style={styles.featureText}>Share shopping carts in real-time</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>✓</Text>
            <Text style={styles.featureText}>See who's shopping</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>✓</Text>
            <Text style={styles.featureText}>Manage joint budgets</Text>
          </View>
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
    infoBox: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.lg,
      backgroundColor: theme.isDark ? 'rgba(74, 222, 128, 0.15)' : 'rgba(45, 125, 70, 0.15)',
      borderRadius: 12,
      marginBottom: SPACING.lg,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
    },
    infoText: {
      fontSize: 13,
      color: theme.text,
      lineHeight: 20,
    },
    countBox: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.lg,
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: SPACING.xl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    countLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    countValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.primary,
      marginTop: SPACING.xs,
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
    membersList: {
      marginBottom: SPACING.xl,
    },
    listTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: SPACING.md,
    },
    memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.md,
      backgroundColor: theme.card,
      borderRadius: 12,
      gap: SPACING.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    memberStatus: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: SPACING.xs,
    },
    removeButton: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: theme.isDark ? 'rgba(255, 107, 107, 0.15)' : 'rgba(232, 64, 64, 0.15)',
      borderRadius: 6,
    },
    removeButtonText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.danger,
    },
    separator: {
      height: SPACING.sm,
    },
    emptyState: {
      paddingVertical: SPACING.xl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    emptySubtext: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: SPACING.sm,
    },
    featuresBox: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.lg,
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: SPACING.xl,
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
  });

