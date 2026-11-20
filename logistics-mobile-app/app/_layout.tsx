import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { socketService } from '../services/socketService';
import { ActivityIndicator, View, ImageBackground, StyleSheet } from 'react-native';
import '../i18n'; // initialise i18next before any screen renders
import { useLanguageStore } from '../store/languageStore';

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  
  const { token, isLoading, restoreToken } = useAuthStore();
  const { restoreLanguage, isLoaded: langLoaded } = useLanguageStore();

  useEffect(() => {
    restoreToken();
    restoreLanguage();
  }, []);

  useEffect(() => {
    if (isLoading || !langLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!token && !inAuthGroup) {
      // Redirect to login
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      // Redirect to dashboard
      router.replace('/(driver)/dashboard');
    }

    if (token) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }
  }, [token, isLoading, segments]);

  if (isLoading || !langLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/images/truck_bg.png')}
      style={StyleSheet.absoluteFillObject}
      imageStyle={{ opacity: 0.4, resizeMode: 'cover' }}
    >
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(driver)" />
      </Stack>
    </ImageBackground>
  );
}
