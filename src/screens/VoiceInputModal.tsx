import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { useGroceryStore } from '@store/index';
import { COLORS, SPACING } from '@constants/index';
import { parseVoiceInput } from '@utils/index';

export const VoiceInputModal = ({ route, navigation }: any) => {
  const { cartId } = route.params;
  useGroceryStore();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [micScale] = useState(new Animated.Value(1));

  // Animated pulsing mic effect
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(micScale, {
            toValue: 1.2,
            duration: 600,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(micScale, {
            toValue: 1,
            duration: 600,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isListening, micScale]);

  const handleStartListening = () => {
    setIsListening(true);
    // In real implementation, use expo-speech-recognition or @react-native-voice/voice
    // For now, simulate with a timeout
    setTimeout(() => {
      setIsListening(false);
      // Mock transcript for demo
      const mockTranscript = '2 kilo ng bigas, 120 piso';
      setTranscript(mockTranscript);
      const parsed = parseVoiceInput(mockTranscript);
      setParsedData(parsed);
    }, 3000);
  };

  const handleConfirm = () => {
    if (!parsedData || !parsedData.name) {
      Alert.alert('Error', 'Could not parse voice input. Please try again.');
      return;
    }

    // Navigate to AddEditItemScreen with voice data pre-filled
    navigation.navigate('AddEditItem', {
      cartId,
      voiceData: parsedData,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Add by Voice</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Mic Button */}
        <View style={styles.micContainer}>
          <Animated.View
            style={[styles.micPulse, { transform: [{ scale: micScale }] }]}
          >
            <TouchableOpacity
              style={[
                styles.micButton,
                isListening && styles.micButtonActive,
              ]}
              onPress={handleStartListening}
              disabled={isListening}
            >
              <Text style={styles.micIcon}>🎤</Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.micText}>
            {isListening ? 'Listening...' : 'Tap to speak'}
          </Text>
        </View>

        {/* Transcript Display */}
        {transcript && (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>What you said:</Text>
            <Text style={styles.transcriptText}>"{transcript}"</Text>
          </View>
        )}

        {/* Parsed Data Chips */}
        {parsedData && (
          <View style={styles.parsedSection}>
            <Text style={styles.parsedLabel}>Detected information:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipsContainer}>
                {parsedData.name && (
                  <View style={[styles.chip, { backgroundColor: COLORS.accent }]}>
                    <Text style={styles.chipLabel}>Item</Text>
                    <Text style={styles.chipValue}>{parsedData.name}</Text>
                  </View>
                )}
                {parsedData.quantity && (
                  <View style={[styles.chip, { backgroundColor: COLORS.primary }]}>
                    <Text style={styles.chipLabel}>Quantity</Text>
                    <Text style={styles.chipValue}>{parsedData.quantity}</Text>
                  </View>
                )}
                {parsedData.unit && (
                  <View style={[styles.chip, { backgroundColor: COLORS.warning }]}>
                    <Text style={styles.chipLabel}>Unit</Text>
                    <Text style={styles.chipValue}>{parsedData.unit}</Text>
                  </View>
                )}
                {parsedData.price && (
                  <View style={[styles.chip, { backgroundColor: COLORS.success }]}>
                    <Text style={styles.chipLabel}>Price</Text>
                    <Text style={styles.chipValue}>₱{parsedData.price}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>Tip:</Text>
          <Text style={styles.instructionsText}>
            Say something like "2 kilos of rice for 120 pesos" or "2 kilo ng bigas, 120 piso"
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !parsedData && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!parsedData}
        >
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.white,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: COLORS.white,
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  micContainer: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  micPulse: {
    marginBottom: SPACING.lg,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  micButtonActive: {
    backgroundColor: COLORS.danger,
  },
  micIcon: {
    fontSize: 48,
  },
  micText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: SPACING.md,
  },
  transcriptBox: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  transcriptLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
  },
  transcriptText: {
    fontSize: 16,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  parsedSection: {
    marginBottom: SPACING.lg,
  },
  parsedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingRight: SPACING.lg,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 24,
    minWidth: 100,
  },
  chipLabel: {
    fontSize: 11,
    color: COLORS.white,
    opacity: 0.8,
  },
  chipValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  instructionsBox: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  instructionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  instructionsText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
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
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
