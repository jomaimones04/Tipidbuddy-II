import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useGroceryStore } from '@store/index';
import { COLORS, SPACING, SYSTEM_TEMPLATES } from '@constants/index';
import { generateId } from '@utils/index';

export const TemplatesScreen = ({ navigation }: any) => {
  const { templates, addTemplate, deleteTemplate } = useGroceryStore();
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Separate system and custom templates
  const systemTemplates = SYSTEM_TEMPLATES;
  const customTemplates = templates.filter((t) => !t.isSystem);

  const handleUseTemplate = (template: any) => {
    navigation.navigate('CartForm', {
      templateItems: template.items,
      templateName: template.name,
    });
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    const newTemplate = {
      id: generateId(),
      name: templateName,
      isSystem: false,
      items: [],
    };

    await addTemplate(newTemplate);
    setTemplateName('');
    setShowNewTemplateModal(false);
    Alert.alert('Success', 'Template created! Start adding items to it.');
  };

  const handleDeleteTemplate = async (templateId: string) => {
    Alert.alert('Delete Template', 'Are you sure you want to delete this template?', [
      { text: 'Cancel', onPress: () => { } },
      {
        text: 'Delete',
        onPress: async () => {
          await deleteTemplate(templateId);
        },
        style: 'destructive',
      },
    ]);
  };

  const TemplateCard = ({ template, isSystem }: any) => (
    <View style={styles.templateCard}>
      <View style={styles.templateInfo}>
        <View style={styles.templateNameRow}>
          <Text style={styles.templateName}>{template.name}</Text>
          {isSystem && <Text style={styles.lockIcon}>🔒</Text>}
        </View>
        <Text style={styles.itemCount}>
          {template.items.length} {template.items.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.useButton}
        onPress={() => handleUseTemplate(template)}
      >
        <Text style={styles.useButtonText}>Use</Text>
      </TouchableOpacity>

      {!isSystem && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteTemplate(template.id)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const sections = [
    {
      title: 'System Templates',
      data: systemTemplates,
      isSystem: true,
    },
    ...(customTemplates.length > 0
      ? [
        {
          title: 'My Templates',
          data: customTemplates,
          isSystem: false,
        },
      ]
      : []),
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Cart Templates</Text>
      </View>

      {/* Templates List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        scrollEnabled={true}
        contentContainerStyle={{ paddingBottom: SPACING.xl * 3 }}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        renderItem={({ item, section }) => (
          <TemplateCard template={item} isSystem={section.isSystem} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Templates Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first custom template to save time on future shopping trips
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowNewTemplateModal(true)}
            >
              <Text style={styles.emptyButtonText}>Create Template</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Empty State for Custom Templates */}
      {customTemplates.length === 0 && systemTemplates.length > 0 && (
        <View style={styles.customEmptyHint}>
          <Text style={styles.customEmptyText}>
            ✨ No custom templates yet — create one!
          </Text>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNewTemplateModal(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* New Template Modal */}
      <Modal
        visible={showNewTemplateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewTemplateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Template</Text>
              <TouchableOpacity onPress={() => setShowNewTemplateModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Template Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Weekend Picnic, Potluck Items"
                value={templateName}
                onChangeText={setTemplateName}
                placeholderTextColor={COLORS.textLight}
              />

              <Text style={styles.helperText}>
                After creating the template, you can add items to it from the templates list.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setTemplateName('');
                  setShowNewTemplateModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateTemplate}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
  },
  sectionHeader: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateInfo: {
    flex: 1,
  },
  templateNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  lockIcon: {
    fontSize: 14,
  },
  itemCount: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  useButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  useButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  deleteButton: {
    padding: SPACING.sm,
  },
  deleteButtonText: {
    fontSize: 14,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    marginTop: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  emptyButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  customEmptyHint: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  customEmptyText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  modalBody: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.lg,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  createButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});

