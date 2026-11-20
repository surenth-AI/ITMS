import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { useThemeStore } from '../../store/themeStore';
import { useTranslation } from 'react-i18next';

export default function DriverLayout() {
  const { theme } = useThemeStore();
  const c = colors[theme];
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.text,
        headerTitleStyle: { fontSize: 17, fontWeight: '600' },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: c.background,
          height: Platform.OS === 'ios' ? 84 : 64,
          borderTopWidth: 1,
          borderTopColor: c.border,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          headerShown: false,
          headerTitle: t('dashboard.active_trip', "Today's Trips"),
          title: t('tabs.home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          headerShown: false, // the POD screen draws its own title
          title: t('tabs.scan'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'scan' : 'scan-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerTitle: t('profile.title'),
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* Hidden screens — not in tab bar */}
      <Tabs.Screen name="trip-detail"     options={{ href: null, headerTitle: t('trip.title') }} />
      <Tabs.Screen name="fuel-log"        options={{ href: null, headerTitle: t('fuel.title') }} />
      <Tabs.Screen name="attendance"      options={{ href: null, headerTitle: t('attendance.title') }} />
      <Tabs.Screen name="alerts"          options={{ href: null, headerTitle: t('alerts.title') }} />
      <Tabs.Screen name="performance"     options={{ href: null, headerTitle: t('performance.title') }} />
      <Tabs.Screen name="failed-delivery" options={{ href: null, headerTitle: 'Failed Delivery' }} />
      <Tabs.Screen name="navigation"      options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
