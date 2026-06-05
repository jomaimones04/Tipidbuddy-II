import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { WebView } from 'react-native-webview';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { SPACING } from '@constants/index';
import { useTheme } from '../hooks/useTheme';
import { parseOCRResult } from '@utils/index';

// HTML content for hidden WebView executing Tesseract.js in JS environment
const TESSERACT_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
</head>
<body>
  <script>
    window.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.base64) {
          const result = await Tesseract.recognize(
            'data:image/jpeg;base64,' + data.base64,
            'eng'
          );
          window.ReactNativeWebView.postMessage(JSON.stringify({
            success: true,
            text: result.data.text,
            mode: data.mode
          }));
        }
      } catch (err) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          success: false,
          error: err.message || 'Tesseract recognition failed',
          mode: data.mode
        }));
      }
    });
  </script>
</body>
</html>
`;

export const CameraScannerScreen = ({ route, navigation }: any) => {
  const { cartId } = route.params;
  const cameraRef = useRef<CameraView | null>(null);
  const webViewRef = useRef<WebView | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrBase64, setOcrBase64] = useState<string | null>(null);
  const [liveOcrBase64, setLiveOcrBase64] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Live preview state
  const [liveDetected, setLiveDetected] = useState({
    name: '',
    price: '',
    quantity: '',
  });

  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const isScreenFocused = useRef(true);
  const liveScanActive = useRef(true);
  const liveScanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLiveProcessing = useRef(false);

  // Log active engine on mount
  useEffect(() => {
    console.log('OCR engine: Google MLKit (Native) with Tesseract.js (WebView) Fallback');
  }, []);

  // Background live scanning loop
  const runLiveScanStep = async () => {
    if (!isScreenFocused.current || !liveScanActive.current || isProcessing || isLiveProcessing.current) {
      liveScanTimeoutRef.current = setTimeout(runLiveScanStep, 2000);
      return;
    }

    if (cameraRef.current && permission?.granted) {
      try {
        isLiveProcessing.current = true;
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.25, // low quality for speed
          base64: true,
        });

        if (photo && isScreenFocused.current && liveScanActive.current) {
          console.log('Active Live OCR engine: Google MLKit (Native)');
          try {
            // Try native ML Kit first
            const result = await TextRecognition.recognize(photo.uri);
            if (result && result.text && isScreenFocused.current) {
              console.log('Raw Live OCR output (MLKit):', result.text);
              const parsed = parseOCRResult(result.text);
              setLiveDetected(parsed);
            }
            isLiveProcessing.current = false;
            liveScanTimeoutRef.current = setTimeout(runLiveScanStep, 2500);
          } catch (nativeError: any) {
            console.log('Native Live MLKit OCR Error (Live Scan):', nativeError?.message || nativeError);
            console.log('Active Live OCR engine: Tesseract.js (WebView Fallback)');

            // Fallback to Tesseract WebView
            if (photo.base64 && isScreenFocused.current) {
              setLiveOcrBase64(photo.base64);
              // Next step will be scheduled from WebView callback (handleWebViewMessage)
            } else {
              isLiveProcessing.current = false;
              liveScanTimeoutRef.current = setTimeout(runLiveScanStep, 2500);
            }
          }
        } else {
          isLiveProcessing.current = false;
          liveScanTimeoutRef.current = setTimeout(runLiveScanStep, 2500);
        }
      } catch (e) {
        console.log('Live scan error:', e);
        isLiveProcessing.current = false;
        liveScanTimeoutRef.current = setTimeout(runLiveScanStep, 2500);
      }
    } else {
      liveScanTimeoutRef.current = setTimeout(runLiveScanStep, 2500);
    }
  };

  const triggerNextLiveScan = () => {
    isLiveProcessing.current = false;
    if (liveScanTimeoutRef.current) {
      clearTimeout(liveScanTimeoutRef.current);
    }
    liveScanTimeoutRef.current = setTimeout(runLiveScanStep, 2500);
  };

  useEffect(() => {
    isScreenFocused.current = true;
    liveScanActive.current = true;

    // Start loop after a short delay
    liveScanTimeoutRef.current = setTimeout(runLiveScanStep, 1000);

    return () => {
      isScreenFocused.current = false;
      liveScanActive.current = false;
      if (liveScanTimeoutRef.current) {
        clearTimeout(liveScanTimeoutRef.current);
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, [permission, isProcessing]);

  // Check if all 3 fields are populated
  const allFieldsFound = !!(liveDetected.name && liveDetected.price && liveDetected.quantity);

  // Navigate directly using live values
  const handleUseLiveDetected = () => {
    setStatusMessage(null);
    navigation.navigate('AddEditItem', {
      cartId,
      detectedName: liveDetected.name,
      detectedPrice: liveDetected.price,
      detectedQuantity: liveDetected.quantity,
    });
  };

  // Handle final OCR results (when manual capture completes)
  const handleOcrResult = (rawText: string) => {
    setIsProcessing(false);
    const parsed = parseOCRResult(rawText);

    if (parsed.name || parsed.price || parsed.quantity) {
      setStatusMessage(null);
      navigation.navigate('AddEditItem', {
        cartId,
        detectedName: parsed.name,
        detectedPrice: parsed.price,
        detectedQuantity: parsed.quantity,
      });
    } else {
      setStatusMessage('No text found — try again');
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const response = JSON.parse(event.nativeEvent.data);
      const isLive = response.mode === 'live';

      if (isLive) {
        setLiveOcrBase64(null);
        if (response.success && response.text) {
          console.log('Raw Live OCR output (Tesseract WebView):', response.text);
          const parsed = parseOCRResult(response.text);
          setLiveDetected(parsed);
        }
        triggerNextLiveScan();
      } else {
        // Clear manual fallback timeout since response received
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
        }
        setOcrBase64(null);
        if (response.success && response.text) {
          console.log('Raw OCR output (Tesseract WebView):', response.text);
          handleOcrResult(response.text);
        } else {
          setIsProcessing(false);
          setStatusMessage('No text found — try again');
        }
      }
    } catch (err) {
      console.log('Error parsing WebView message:', err);
      setLiveOcrBase64(null);
      setOcrBase64(null);
      setIsProcessing(false);
      triggerNextLiveScan();
    }
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      setStatusMessage('Capturing photo...');

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: true,
      });

      if (!photo) {
        throw new Error('Photo capture failed');
      }

      setStatusMessage('Scanning for text...');

      console.log('Active OCR engine: Google MLKit (Native)');
      try {
        // Try native Google ML Kit text recognition first (on-device, fast, offline)
        const result = await TextRecognition.recognize(photo.uri);
        console.log('Raw OCR output (MLKit):', result?.text);
        if (result && result.text) {
          handleOcrResult(result.text);
        } else {
          handleOcrResult('');
        }
      } catch (nativeError: any) {
        console.log('Native MLKit OCR Error:', nativeError?.message || nativeError);
        console.log('Active OCR engine: Tesseract.js (WebView Fallback)');

        // If native MLKit fails/isn't available (e.g. Expo Go), fallback to Tesseract.js via WebView
        if (photo.base64) {
          setStatusMessage('Scanning via fallback engine...');
          setOcrBase64(photo.base64);

          // Clear any previous timeout
          if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
          }

          // Start 8-second hard timeout for the manual fallback scan
          fallbackTimeoutRef.current = setTimeout(() => {
            setOcrBase64(null); // Unmount WebView
            setIsProcessing(false);
            setStatusMessage('Could not read text. Please try again or enter manually.');
            console.log('OCR Fallback engine timed out after 8 seconds.');
          }, 8000);
        } else {
          setIsProcessing(false);
          setStatusMessage('No text found — try again');
        }
      }
    } catch (error) {
      console.log('Camera capture/processing error:', error);
      Alert.alert('Error', 'Failed to capture and process image. Please try again.');
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  if (!permission) {
    // Camera permissions are still loading
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Layer 1 — Full screen camera viewfinder */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
      />

      {/* Layer 2 — Scanning guide box overlay (centered) */}
      <View style={styles.scanningFrameContainer}>
        <View style={styles.topLeft} />
        <View style={styles.topRight} />
        <View style={styles.bottomLeft} />
        <View style={styles.bottomRight} />
        <View style={styles.scanningFrame} />
      </View>

      {/* Layer 3 — Live fields panel overlay (top) */}
      <View style={styles.previewPanel}>
        <Text style={styles.previewTitle}>Live Detected Fields</Text>
        <View style={styles.previewRow}>
          <Text style={styles.previewValue}>🏷️ Name: {liveDetected.name || '—'}</Text>
          <Text style={styles.previewValue}>💰 Price: {liveDetected.price ? `₱${liveDetected.price}` : '—'}</Text>
          <Text style={styles.previewValue}>⚖️ Qty: {liveDetected.quantity || '—'}</Text>
        </View>
        {statusMessage && (
          <Text style={styles.statusText}>{statusMessage}</Text>
        )}
      </View>

      {/* Layer 4 — Scan/Capture button overlay (bottom center) */}
      <View style={styles.controls}>
        {allFieldsFound ? (
          <TouchableOpacity
            style={styles.useThisButton}
            onPress={handleUseLiveDetected}
            disabled={isProcessing}
          >
            <Text style={styles.useThisButtonText}>✅ Use This</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleTakePicture}
            disabled={isProcessing}
          >
            <View style={[styles.captureInner, isProcessing && styles.captureInnerDisabled]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeTouchable}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scan Label</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Processing Spinner Overlay */}
      {isProcessing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={styles.loadingText}>{statusMessage || 'Processing...'}</Text>
        </View>
      )}

      {/* Hidden WebView for Tesseract.js Fallback (Live Scan) */}
      {liveOcrBase64 && (
        <WebView
          ref={webViewRef}
          style={styles.hiddenWebView}
          originWhitelist={['*']}
          source={{ html: TESSERACT_HTML }}
          onLoadEnd={() => {
            webViewRef.current?.postMessage(JSON.stringify({ base64: liveOcrBase64, mode: 'live' }));
          }}
          onMessage={handleWebViewMessage}
        />
      )}

      {/* Hidden WebView for Tesseract.js Fallback (Manual Scan) */}
      {ocrBase64 && (
        <WebView
          ref={webViewRef}
          style={styles.hiddenWebView}
          originWhitelist={['*']}
          source={{ html: TESSERACT_HTML }}
          onLoadEnd={() => {
            webViewRef.current?.postMessage(JSON.stringify({ base64: ocrBase64, mode: 'manual' }));
          }}
          onMessage={handleWebViewMessage}
        />
      )}
    </View>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000',
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 10,
    },
    closeTouchable: {
      padding: 5,
    },
    closeButton: {
      fontSize: 24,
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    placeholder: {
      width: 24,
    },
    scanningFrameContainer: {
      position: 'absolute',
      top: '30%',
      left: '10%',
      right: '10%',
      height: '25%',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
    },
    topLeft: {
      position: 'absolute',
      top: -2,
      left: -2,
      width: 30,
      height: 30,
      borderTopWidth: 3,
      borderLeftWidth: 3,
      borderColor: theme.accent,
    },
    topRight: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 30,
      height: 30,
      borderTopWidth: 3,
      borderRightWidth: 3,
      borderColor: theme.accent,
    },
    bottomLeft: {
      position: 'absolute',
      bottom: -2,
      left: -2,
      width: 30,
      height: 30,
      borderBottomWidth: 3,
      borderLeftWidth: 3,
      borderColor: theme.accent,
    },
    bottomRight: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 30,
      height: 30,
      borderBottomWidth: 3,
      borderRightWidth: 3,
      borderColor: theme.accent,
    },
    scanningFrame: {
      width: '100%',
      height: '100%',
      borderWidth: 2,
      borderColor: `${theme.accent}80`,
      borderRadius: 12,
    },
    instructionsBox: {
      display: 'none', // replaced by statusText in previewPanel
    },
    previewPanel: {
      position: 'absolute',
      top: 75,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      borderRadius: 12,
      padding: 12,
      zIndex: 5,
    },
    previewTitle: {
      color: theme.accent,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: SPACING.sm,
      textAlign: 'center',
    },
    previewRow: {
      flexDirection: 'column',
      gap: 4,
    },
    previewValue: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    statusText: {
      color: '#FDA4AF',
      fontSize: 12,
      fontWeight: '600',
      marginTop: 8,
      textAlign: 'center',
    },
    controls: {
      position: 'absolute',
      bottom: 40,
      alignSelf: 'center',
      zIndex: 5,
    },
    captureButton: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    captureInner: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary,
    },
    captureInnerDisabled: {
      backgroundColor: '#9CA3AF',
    },
    useThisButton: {
      backgroundColor: theme.success || '#22C55E',
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: 24,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      minWidth: 150,
      alignItems: 'center',
    },
    useThisButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 20,
    },
    loadingText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginTop: SPACING.md,
    },
    permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xl,
      backgroundColor: theme.background,
    },
    permissionText: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: SPACING.lg,
      color: theme.text,
    },
    permissionButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: 12,
    },
    permissionButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    hiddenWebView: {
      width: 0,
      height: 0,
      opacity: 0,
      position: 'absolute',
    },
  });
