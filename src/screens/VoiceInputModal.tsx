import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { useMicrophonePermissions } from 'expo-camera';
import { COLORS, SPACING } from '@constants/index';
import { parseVoiceInput } from '@utils/index';
import type { ParsedVoiceItem } from '../utils/voiceParser';

const SPEECH_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <script>
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;

    function post(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    function start(lang) {
      if (!SpeechRecognition) {
        post({ type: 'unavailable' });
        return;
      }
      try {
        if (recognition) {
          recognition.onend = null;
          recognition.stop();
        }
        recognition = new SpeechRecognition();
        recognition.lang = lang || 'fil-PH';
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;
        recognition.onstart = function () {
          post({ type: 'started' });
        };
        recognition.onresult = function (event) {
          var text = '';
          var isFinal = false;
          for (var i = event.resultIndex; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              isFinal = true;
            }
          }
          post({ type: 'result', text: text.trim(), isFinal: isFinal });
        };
        recognition.onerror = function (event) {
          post({ type: 'error', error: event.error || 'unknown' });
        };
        recognition.onend = function () {
          post({ type: 'end' });
        };
        recognition.start();
      } catch (err) {
        post({ type: 'error', error: err && err.message ? err.message : 'start_failed' });
      }
    }

    function stop() {
      try {
        if (recognition) {
          recognition.stop();
        }
      } catch (err) {}
    }

    function onHostMessage(event) {
      try {
        var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.action === 'start') start(data.lang);
        if (data.action === 'stop') stop();
      } catch (err) {}
    }

    document.addEventListener('message', onHostMessage);
    window.addEventListener('message', onHostMessage);
    post({ type: 'ready' });
  </script>
</body>
</html>
`;

type VoiceStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'result'
  | 'error';

export const VoiceInputModal = ({ route, navigation }: any) => {
  const { cartId } = route.params;
  const webViewRef = useRef<WebView | null>(null);
  const [permission, requestPermission] = useMicrophonePermissions();
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [recognizedText, setRecognizedText] = useState('');
  const [parsedItem, setParsedItem] = useState<ParsedVoiceItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const [micScale] = useState(new Animated.Value(1));
  const listenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognizedTextRef = useRef('');
  const hasFinalResultRef = useRef(false);

  const sendToWebView = useCallback((payload: { action: string; lang?: string }) => {
    webViewRef.current?.postMessage(JSON.stringify(payload));
  }, []);

  useEffect(() => {
    if (status !== 'listening') {
      micScale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(micScale, {
          toValue: 1.18,
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
    );
    loop.start();
    return () => loop.stop();
  }, [status, micScale]);

  useEffect(() => {
    return () => {
      if (listenTimeoutRef.current) {
        clearTimeout(listenTimeoutRef.current);
      }
    };
  }, []);

  const applyTranscript = (text: string, isFinal: boolean) => {
    if (!text) return;
    recognizedTextRef.current = text;
    setRecognizedText(text);
    if (!isFinal) return;

    hasFinalResultRef.current = true;
    setStatus('processing');
    const parsed = parseVoiceInput(text);
    if (!parsed.name) {
      setParsedItem(null);
      setErrorMessage('Please say the product name and quantity.');
      setStatus('error');
      return;
    }
    setParsedItem(parsed);
    setErrorMessage(null);
    setStatus('result');
  };

  const startListening = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setErrorMessage('Microphone permission is required for voice input.');
        setStatus('error');
        return;
      }
    }

    recognizedTextRef.current = '';
    hasFinalResultRef.current = false;
    setRecognizedText('');
    setParsedItem(null);
    setErrorMessage(null);
    setStatus('listening');

    if (listenTimeoutRef.current) {
      clearTimeout(listenTimeoutRef.current);
    }
    listenTimeoutRef.current = setTimeout(() => {
      sendToWebView({ action: 'stop' });
    }, 12000);

    sendToWebView({ action: 'start', lang: 'fil-PH' });
  };

  const stopListening = () => {
    sendToWebView({ action: 'stop' });
  };

  const handleSpeakAgain = () => {
    setRecognizedText('');
    setParsedItem(null);
    setErrorMessage(null);
    setStatus('idle');
    void startListening();
  };

  const handleUseThis = () => {
    if (!parsedItem?.name) return;
    navigation.navigate('AddEditItem', {
      cartId,
      detectedName: parsedItem.name,
      detectedQuantity: String(parsedItem.quantity),
      detectedUnit: parsedItem.unit,
      detectedCategory: parsedItem.category,
      detectedPrice: parsedItem.price != null ? String(parsedItem.price) : undefined,
      voiceInput: recognizedText,
      voiceData: parsedItem,
    });
  };

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        text?: string;
        isFinal?: boolean;
        error?: string;
      };

      if (payload.type === 'ready') {
        setWebViewReady(true);
        return;
      }
      if (payload.type === 'unavailable') {
        setStatus('error');
        setErrorMessage(
          'Speech recognition is not available on this device. On iOS Expo Go this often requires a development build.'
        );
        return;
      }
      if (payload.type === 'started') {
        setStatus('listening');
        return;
      }
      if (payload.type === 'result' && payload.text) {
        applyTranscript(payload.text, Boolean(payload.isFinal));
        return;
      }
      if (payload.type === 'error') {
        const code = payload.error || '';
        if (code === 'no-speech' || code === 'aborted') {
          setErrorMessage("Sorry, I couldn't understand that.");
        } else if (code === 'not-allowed') {
          setErrorMessage('Microphone permission is required for voice input.');
        } else if (code === 'network') {
          setErrorMessage('Speech recognition needs an internet connection on this device. Please try again.');
        } else {
          setErrorMessage("Sorry, I couldn't understand that.");
        }
        setStatus('error');
        return;
      }
      if (payload.type === 'end') {
        if (!hasFinalResultRef.current && recognizedTextRef.current) {
          applyTranscript(recognizedTextRef.current, true);
          return;
        }
        if (!hasFinalResultRef.current && !recognizedTextRef.current) {
          setErrorMessage("Sorry, I couldn't understand that.");
          setStatus('error');
        }
      }
    } catch (error) {
      console.log('Voice WebView message error:', error);
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Voice Input</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionText}>
            Microphone permission is required for voice input.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => void requestPermission()}>
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice Input</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.micContainer}>
          <Animated.View style={[styles.micPulse, { transform: [{ scale: micScale }] }]}>
            <TouchableOpacity
              style={[styles.micButton, status === 'listening' && styles.micButtonActive]}
              onPress={() => {
                if (status === 'listening') {
                  stopListening();
                  return;
                }
                void startListening();
              }}
              disabled={!webViewReady || status === 'processing'}
            >
              <Text style={styles.micIcon}>🎤</Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.micText}>
            {status === 'listening'
              ? 'Listening... Speak now'
              : status === 'processing'
                ? 'Processing...'
                : 'Tap the microphone to speak'}
          </Text>
          {status === 'listening' && (
            <TouchableOpacity style={styles.stopButton} onPress={stopListening}>
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>

        {recognizedText ? (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>Heard:</Text>
            <Text style={styles.transcriptText}>"{recognizedText}"</Text>
          </View>
        ) : null}

        {parsedItem?.name ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Detected Product</Text>
            <Text style={styles.resultRow}>Product Name: {parsedItem.name}</Text>
            <Text style={styles.resultRow}>Quantity: {parsedItem.quantity}</Text>
            <Text style={styles.resultRow}>Unit: {parsedItem.unit}</Text>
            <Text style={styles.resultRow}>Category: {parsedItem.category}</Text>
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>Tip:</Text>
          <Text style={styles.instructionsText}>
            Try "Bigas 5 kilo", "3 bote ng mantika", or "2 packs ng noodles".
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        {status === 'error' || status === 'result' ? (
          <TouchableOpacity style={styles.secondaryFooterButton} onPress={handleSpeakAgain}>
            <Text style={styles.secondaryFooterButtonText}>
              {status === 'error' ? 'Try Again' : 'Speak Again'}
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.confirmButton, !parsedItem?.name && styles.confirmButtonDisabled]}
          onPress={handleUseThis}
          disabled={!parsedItem?.name}
        >
          <Text style={styles.confirmButtonText}>Use This</Text>
        </TouchableOpacity>
      </View>

      <WebView
        ref={webViewRef}
        source={{ html: SPEECH_HTML }}
        originWhitelist={['*']}
        style={styles.hiddenWebView}
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        onMessage={handleWebViewMessage}
        onError={(event) => {
          console.log('Voice WebView error:', event.nativeEvent);
        }}
      />
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
  },
  contentInner: {
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
    textAlign: 'center',
  },
  stopButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.danger,
  },
  stopButtonText: {
    color: COLORS.white,
    fontWeight: '700',
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
  resultCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: 6,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  resultRow: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.md,
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
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.sm,
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
  secondaryFooterButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryFooterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
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
  hiddenWebView: {
    width: 1,
    height: 1,
    opacity: 0.01,
    position: 'absolute',
  },
});
