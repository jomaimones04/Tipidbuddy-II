import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/auth';
import { completePasswordReset, requestPasswordReset } from '../api/auth';
import type { SettingsStackParamList } from '../types';

WebBrowser.maybeCompleteAuthSession();

type AuthNavigation = StackNavigationProp<SettingsStackParamList>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

const AuthFrame = ({
  children,
  backgroundColor,
}: {
  children: React.ReactNode;
  backgroundColor?: string;
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <SafeAreaView style={[styles.safeArea, backgroundColor ? { backgroundColor } : null]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const AuthHeader = ({ title }: { title?: string }) => {
  const navigation = useNavigation<AuthNavigation>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Feather name="arrow-left" size={22} color={theme.text} />
      </TouchableOpacity>
      {title ? <Text style={styles.headerTitle}>{title}</Text> : <View style={styles.headerTitlePlaceholder} />}
      <View style={styles.headerSpacer} />
    </View>
  );
};

const AuthField = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  onToggleSecure,
  keyboardType,
  autoCapitalize = 'none',
  textContentType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  onToggleSecure?: () => void;
  keyboardType?: 'email-address' | 'default';
  autoCapitalize?: 'none' | 'sentences';
  textContentType?: 'newPassword' | 'password';
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, onToggleSecure ? styles.inputWithToggle : null]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          textContentType={keyboardType === 'email-address' ? 'emailAddress' : textContentType || 'password'}
          accessibilityLabel={label}
        />
        {onToggleSecure && (
          <TouchableOpacity
            style={styles.visibilityButton}
            onPress={onToggleSecure}
            accessibilityRole="button"
            accessibilityLabel={secureTextEntry ? 'Show password' : 'Hide password'}
          >
            <Feather name={secureTextEntry ? 'eye' : 'eye-off'} size={19} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const SubmitButton = ({
  title,
  onPress,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <TouchableOpacity
      style={[styles.submitButton, disabled ? styles.disabledButton : null]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>{title}</Text>}
    </TouchableOpacity>
  );
};

export const AuthWelcomeScreen = () => {
  const navigation = useNavigation<AuthNavigation>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [emailChoiceVisible, setEmailChoiceVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const loginGoogle = useAuthStore((state) => state.loginGoogle);
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const platformClientId = Platform.OS === 'android'
    ? androidClientId
    : Platform.OS === 'ios'
      ? iosClientId
      : webClientId;
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: webClientId || '',
    androidClientId: androidClientId || '',
    iosClientId: iosClientId || '',
  });

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.authentication?.idToken;
    if (!idToken) {
      Alert.alert('Google sign-in failed', 'Google did not return a verified ID token. Please try again.');
      return;
    }

    setBusy(true);
    loginGoogle(idToken)
      .then(() => navigation.popToTop())
      .catch((error: unknown) => {
        Alert.alert('Google sign-in failed', error instanceof Error ? error.message : 'Please try again.');
      })
      .finally(() => setBusy(false));
  }, [loginGoogle, navigation, response]);

  const startGoogleSignIn = () => {
    if (!platformClientId) {
      Alert.alert(
        'Google sign-in is not configured',
        'Add the Google OAuth client IDs to the root .env file and configure GOOGLE_OAUTH_CLIENT_IDS on the backend.'
      );
      return;
    }
    if (!request) {
      Alert.alert('Please wait', 'Google sign-in is still initializing.');
      return;
    }
    setBusy(true);
    promptAsync()
      .catch((error: unknown) => {
        Alert.alert('Google sign-in failed', error instanceof Error ? error.message : 'Please try again.');
      })
      .finally(() => setBusy(false));
  };

  const closeEmailChoice = () => setEmailChoiceVisible(false);
  const openEmailScreen = (screen: 'Register' | 'Login') => {
    closeEmailChoice();
    navigation.navigate(screen);
  };

  return (
    <AuthFrame backgroundColor={theme.isDark ? '#17231A' : '#EAF5EC'}>
      <View style={styles.welcomeContainer}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Close sign in"
        >
          <Feather name="x" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.brandBlock}>
          <Text style={styles.brandText}>
            <Text style={styles.brandTipid}>Tipid</Text>
            <Text style={styles.brandBuddy}>Buddy</Text>
          </Text>
          <Text style={styles.tagline}>Your spending, finally under control</Text>
        </View>
        <View style={styles.welcomeActions}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={startGoogleSignIn}
            disabled={busy}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color={theme.primary} /> : (
              <>
                <Text style={styles.googleMark}>G</Text>
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => setEmailChoiceVisible(true)}
            accessibilityRole="button"
          >
            <Feather name="mail" size={19} color={theme.primary} />
            <Text style={styles.socialButtonText}>Continue with Email</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={emailChoiceVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEmailChoice}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.choiceCard}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={closeEmailChoice}
              accessibilityRole="button"
              accessibilityLabel="Close options"
            >
              <Feather name="x" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.choiceTitle}>Choose an option</Text>
            <Text style={styles.choiceSubtitle}>Sign in to your account or create a new one</Text>
            <TouchableOpacity style={styles.choiceButton} onPress={() => openEmailScreen('Register')}>
              <Text style={styles.choiceButtonText}>Register</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.choiceButton, styles.secondaryChoiceButton]} onPress={() => openEmailScreen('Login')}>
              <Text style={[styles.choiceButtonText, styles.secondaryChoiceText]}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AuthFrame>
  );
};

export const RegisterScreen = () => {
  const navigation = useNavigation<AuthNavigation>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const register = useAuthStore((state) => state.register);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const valid = EMAIL_PATTERN.test(email.trim()) && password.length >= PASSWORD_MIN_LENGTH && password.length <= 128;

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await register(email.trim(), password);
      navigation.popToTop();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Account creation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame>
      <AuthHeader title="Register" />
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <AuthField label="Email" value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" />
        <AuthField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          textContentType="newPassword"
          secureTextEntry={!visible}
          onToggleSecure={() => setVisible((value) => !value)}
        />
        <Text style={styles.helperText}>Use at least {PASSWORD_MIN_LENGTH} characters.</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <SubmitButton title="Create Account" onPress={submit} disabled={!valid || loading} loading={loading} />
        <View style={styles.footerLinkRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AuthFrame>
  );
};

export const LoginScreen = () => {
  const navigation = useNavigation<AuthNavigation>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const valid = EMAIL_PATTERN.test(email.trim()) && password.length > 0;

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigation.popToTop();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame>
      <AuthHeader title="Login" />
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <AuthField label="Email" value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" />
        <AuthField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry={!visible}
          onToggleSecure={() => setVisible((value) => !value)}
        />
        <TouchableOpacity style={styles.forgotLink} onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <SubmitButton title="Login" onPress={submit} disabled={!valid || loading} loading={loading} />
        <View style={styles.footerLinkRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AuthFrame>
  );
};

export const ForgotPasswordScreen = () => {
  const navigation = useNavigation<AuthNavigation>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const valid = EMAIL_PATTERN.test(email.trim());

  const submit = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const result = await requestPasswordReset(email.trim());
      setMessage(result.message || 'If an account exists for that email, a password reset link has been sent.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not send the reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame>
      <AuthHeader />
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.forgotTitle}>Forgot Password</Text>
        <Text style={styles.forgotSubtitle}>Enter your email to receive a reset link.</Text>
        <AuthField label="Email Address" value={email} onChangeText={setEmail} placeholder="Enter your email address" keyboardType="email-address" />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.successText}>{message}</Text> : null}
        <SubmitButton title="Send Reset Link" onPress={submit} disabled={!valid || loading} loading={loading} />
        <TouchableOpacity style={styles.backToLogin} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </AuthFrame>
  );
};

export const PasswordResetScreen = () => {
  const navigation = useNavigation<AuthNavigation>();
  const route = useRoute<RouteProp<SettingsStackParamList, 'PasswordReset'>>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const resetToken = route.params?.token;
  const valid = Boolean(resetToken) && password.length >= PASSWORD_MIN_LENGTH && password.length <= 128;

  const submit = async () => {
    setError('');
    if (!resetToken) {
      setError('This password reset link is invalid or expired.');
      return;
    }
    setLoading(true);
    try {
      const result = await completePasswordReset(resetToken, password);
      Alert.alert('Password updated', result.message || 'Your password has been reset.');
      navigation.navigate('Login');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not reset the password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame>
      <AuthHeader title="Reset Password" />
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.forgotTitle}>Create a new password</Text>
        <Text style={styles.forgotSubtitle}>Choose a password with at least {PASSWORD_MIN_LENGTH} characters.</Text>
        <AuthField
          label="New Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your new password"
          textContentType="newPassword"
          secureTextEntry={!visible}
          onToggleSecure={() => setVisible((value) => !value)}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <SubmitButton title="Reset Password" onPress={submit} disabled={!valid || loading} loading={loading} />
      </ScrollView>
    </AuthFrame>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.surface },
    flex: { flex: 1 },
    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
    headerTitlePlaceholder: { flex: 1 },
    headerSpacer: { width: 40 },
    welcomeContainer: { flex: 1, justifyContent: 'space-between', padding: 24 },
    closeButton: { alignSelf: 'flex-end', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    brandBlock: { alignItems: 'center', marginTop: -38 },
    brandText: { fontSize: 46, fontWeight: '800', letterSpacing: -1.5 },
    brandTipid: { color: theme.primary },
    brandBuddy: { color: theme.isDark ? '#9DD9AA' : '#1E5C32' },
    tagline: { color: theme.textSecondary, fontSize: 15, marginTop: 12 },
    welcomeActions: { gap: 14, paddingBottom: 14 },
    socialButton: {
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    googleMark: { fontSize: 21, fontWeight: '800', color: '#4285F4' },
    socialButtonText: { color: '#26332A', fontSize: 16, fontWeight: '600' },
    modalBackdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 24 },
    choiceCard: { backgroundColor: theme.surface, borderRadius: 24, padding: 24, elevation: 8 },
    modalClose: { alignSelf: 'flex-end', padding: 3 },
    choiceTitle: { fontSize: 22, fontWeight: '700', color: theme.text, marginTop: 4 },
    choiceSubtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 8, marginBottom: 20 },
    choiceButton: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },
    choiceButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    secondaryChoiceButton: { backgroundColor: theme.inputBackground },
    secondaryChoiceText: { color: theme.text },
    formContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 26, paddingBottom: 32 },
    fieldGroup: { marginBottom: 18 },
    fieldLabel: { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    inputWrap: { position: 'relative', justifyContent: 'center' },
    input: {
      minHeight: 54,
      borderRadius: 14,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBackground,
      color: theme.text,
      fontSize: 15,
    },
    inputWithToggle: { paddingRight: 54 },
    visibilityButton: { position: 'absolute', right: 14, height: 44, width: 32, alignItems: 'center', justifyContent: 'center' },
    helperText: { color: theme.textSecondary, fontSize: 12, marginTop: -8, marginBottom: 18 },
    submitButton: {
      minHeight: 54,
      borderRadius: 28,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
    },
    disabledButton: { opacity: 0.48 },
    submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    footerLinkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 },
    footerText: { color: theme.textSecondary, fontSize: 14 },
    linkText: { color: theme.primary, fontWeight: '700', fontSize: 14 },
    forgotLink: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 18, paddingVertical: 6 },
    errorText: { color: theme.danger, fontSize: 13, marginBottom: 10 },
    successText: { color: theme.success, fontSize: 13, marginBottom: 10 },
    forgotTitle: { color: theme.text, fontSize: 26, fontWeight: '800', marginBottom: 8, marginTop: 10 },
    forgotSubtitle: { color: theme.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 28 },
    backToLogin: { alignSelf: 'center', marginTop: 24, padding: 8 },
  });
