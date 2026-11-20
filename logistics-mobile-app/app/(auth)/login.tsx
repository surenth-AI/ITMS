import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  
  const { login, isLoading, error } = useAuthStore();
  const router = useRouter();
  const { theme } = useThemeStore();
  const c = colors[theme];
  const styles = getStyles(c);
  const { t } = useTranslation();

  const handleSendOTP = () => {
    if (phone.length > 5) setStep('otp');
  };

  const handleLogin = async () => {
    if (otp.length === 6) {
      try {
        const res = await api.post('/auth/login', {
          email: phone,
          password: 'password123'
        });
        await login(res.data.token, res.data.user);
        router.replace('/(driver)/dashboard');
      } catch (err: any) {
        console.error('Login failed:', err);
        alert('Login failed: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.content}>
          <Text style={styles.title}>{step === 'phone' ? t('auth.enter_email') : t('auth.enter_otp')}</Text>
          
          {step === 'phone' ? (
            <TextInput
              style={styles.input}
              placeholder={t('auth.email_placeholder')}
              placeholderTextColor={c.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus={true}
              value={phone}
              onChangeText={setPhone}
            />
          ) : (
            <TextInput
              style={styles.input}
              placeholder="000000"
              placeholderTextColor={c.textMuted}
              keyboardType="number-pad"
              autoFocus={true}
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.bottomSection}>
          {step === 'phone' ? (
            <>
              <TouchableOpacity 
                style={[styles.primaryButton, phone.length <= 5 && styles.disabledButton]} 
                onPress={handleSendOTP}
                disabled={phone.length <= 5 || isLoading}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t('auth.send_otp')}</Text>}
              </TouchableOpacity>
              <Text style={styles.helpText}>{t('auth.otp_hint')}</Text>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.primaryButton, otp.length !== 6 && styles.disabledButton]} 
                onPress={handleLogin}
                disabled={otp.length !== 6 || isLoading}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t('auth.verify_login')}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('phone')} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{t('auth.change_phone')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (c: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 39,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 0, // strict flat
    paddingHorizontal: 16,
    fontSize: 22,
    color: c.text,
    backgroundColor: c.background,
    textAlign: 'center',
  },
  errorText: {
    color: c.danger,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  bottomSection: {
    padding: 24,
    paddingBottom: 40,
  },
  primaryButton: {
    height: 52,
    backgroundColor: c.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  secondaryButton: {
    height: 48,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
  secondaryButtonText: {
    color: c.primary,
    fontSize: 17,
    fontWeight: 'bold',
  },
  helpText: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 19.6, // 1.4
  },
});
