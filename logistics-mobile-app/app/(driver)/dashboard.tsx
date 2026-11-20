import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { fetchTodayTrips } from '../../services/tripService';
import { socketService } from '../../services/socketService';
import { useTripStore, Trip } from '../../store/tripStore';
import { useTranslation } from 'react-i18next';

// Mock next-stop coordinates for the active trip (would come from API in production)
const MOCK_STOP_COORDS: Record<number, { lat: number; lng: number; address: string }> = {
  0: { lat: 51.5155, lng: -0.0922, address: '14 Logistics Way, London' },
  1: { lat: 51.4543, lng: -0.9781, address: 'Central Distribution Centre, Reading' },
  2: { lat: 51.4545, lng: -2.5879, address: 'Port Authority, Bristol' },
};

function statusAccent(status: string, c: any) {
  if (status === 'in_progress') return c.primary;
  if (status === 'completed') return c.success;
  return c.border;
}

export default function DashboardScreen() {
  const { theme } = useThemeStore();
  const c = colors[theme];
  const router = useRouter();
  const { user } = useAuthStore();
  const { todayTrips, setTrips } = useTripStore();
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();


  const loadTrips = async () => {
    try {
      const data = await fetchTodayTrips();
      setTrips(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  // GPS tracking for active trip
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const setupLocationTracking = async () => {
      const activeTrip = todayTrips.find(t => t.status === 'in_progress');
      if (!activeTrip) {
        locationSubscription?.remove();
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      socketService.connect();
      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 0 },
        (location) => {
          socketService.emit('location_update', {
            trip_id: activeTrip.id,
            vehicle_id: 'TRK-001',
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
        }
      );
    };

    setupLocationTracking();
    return () => { locationSubscription?.remove(); };
  }, [todayTrips]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  };

  const activeTrip = todayTrips.find(t => t.status === 'in_progress');
  const nextTrip = !activeTrip ? todayTrips.find(t => t.status === 'scheduled') : null;
  const heroTrip = activeTrip ?? nextTrip ?? null;
  const remainingTrips = todayTrips.filter(t => t.id !== heroTrip?.id);

  const completed = todayTrips.filter(t => t.status === 'completed').length;
  const remaining = todayTrips.filter(t => t.status !== 'completed').length;

  const handleNavigate = () => {
    const stop = MOCK_STOP_COORDS[1]; // next stop; real app derives from trip data
    router.push(
      `/(driver)/navigation?dest=${encodeURIComponent(stop.address)}&destLat=${stop.lat}&destLng=${stop.lng}`
    );
  };

  const renderTrip = ({ item }: { item: Trip }) => {
    const accent = statusAccent(item.status, c);
    return (
      <TouchableOpacity
        style={[styles.listCard, { backgroundColor: c.card, borderColor: c.border }]}
        onPress={() => router.push(`/(driver)/trip-detail?id=${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={[styles.listAccent, { backgroundColor: accent }]} />
        <View style={styles.listBody}>
          <Text style={[styles.listRef, { color: c.text }]}>{item.reference}</Text>
          <Text style={[styles.listSub, { color: c.textMuted }]}>
            {t('common.stops_count', { count: item.stops || 0 })}
          </Text>
        </View>
        <View style={styles.listRight}>
          <Text style={[styles.listTime, { color: c.textMuted }]}>
            {new Date(item.planned_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={[styles.badge, { backgroundColor: accent + '22', borderColor: accent }]}>
            <Text style={[styles.badgeTxt, { color: accent }]}>
              {item.status === 'in_progress' ? t('dashboard.in_progress') : item.status === 'completed' ? t('common.done').toUpperCase() : t('dashboard.scheduled')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.screenWrapper, { backgroundColor: c.background }]}>
      {/* Truck image seamless background */}
      <View style={[styles.bgContainer, { opacity: theme === 'dark' ? 0.15 : 0.85 }]}>
        <Image
          source={require('../../assets/images/truck_bg.png')}
          style={styles.bgImage}
          resizeMode="cover"
        />
      </View>
      {/* Theme-aware overlay for text readability */}
      <View style={[styles.overlay, {
        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.10)',
      }]} />
      <SafeAreaView style={styles.container}>
        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: c.border, backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.55)' }]}>
          <View>
            <Text style={[styles.greeting, { color: c.textMuted }]}>{t('dashboard.good_morning')}</Text>
            <Text style={[styles.driverName, { color: c.text }]}>{user?.full_name || 'Driver'}</Text>
          </View>
          <Text style={[styles.dateChip, { backgroundColor: c.card, color: c.textMuted, borderColor: c.border }]}>
            {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </Text>
        </View>

        {/* ── Stats bar ── */}
        {todayTrips.length > 0 && (
          <View style={[styles.statsBar, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.50)', borderBottomColor: c.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: c.text }]}>{todayTrips.length}</Text>
              <Text style={[styles.statLbl, { color: c.textMuted }]}>{t('common.total')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: c.success }]}>{completed}</Text>
              <Text style={[styles.statLbl, { color: c.textMuted }]}>{t('common.done')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: c.primary }]}>{remaining}</Text>
              <Text style={[styles.statLbl, { color: c.textMuted }]}>{t('common.remaining')}</Text>
            </View>
          </View>
        )}

        <FlatList
          data={remainingTrips}
          keyExtractor={(item) => item.id}
          renderItem={renderTrip}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
          ListHeaderComponent={
            heroTrip ? (
              <View style={[styles.heroCard, { backgroundColor: c.card, borderColor: c.border }]}>
                {/* Status accent strip */}
                <View
                  style={[
                    styles.heroAccent,
                    { backgroundColor: heroTrip.status === 'in_progress' ? c.primary : c.border },
                  ]}
                />

                <View style={styles.heroBody}>
                  {/* Label */}
                  <Text style={[styles.heroLabel, { color: heroTrip.status === 'in_progress' ? c.primary : c.textMuted }]}>
                    {heroTrip.status === 'in_progress' ? t('dashboard.active_trip') : t('dashboard.next_trip')}
                  </Text>

                  {/* Reference */}
                  <Text style={[styles.heroRef, { color: c.text }]}>{heroTrip.reference}</Text>
                  <Text style={[styles.heroClient, { color: c.textMuted }]}>ACME Corp Logistics</Text>

                  {/* Meta chips */}
                  <View style={styles.metaRow}>
                    <View style={[styles.metaChip, { backgroundColor: c.background, borderColor: c.border }]}>
                      <Text style={[styles.metaTxt, { color: c.textMuted }]}>
                        {t('common.stops_count', { count: heroTrip.stops || 0 })}
                      </Text>
                    </View>
                    <View style={[styles.metaChip, { backgroundColor: c.background, borderColor: c.border }]}>
                      <Text style={[styles.metaTxt, { color: c.textMuted }]}>
                        {new Date(heroTrip.planned_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={[styles.metaChip, { backgroundColor: c.background, borderColor: c.border }]}>
                      <Text style={[styles.metaTxt, { color: c.textMuted }]}>{t('common.miles', { value: '142' })}</Text>
                    </View>
                  </View>

                  {/* Next stop */}
                  {heroTrip.status === 'in_progress' && (
                    <View style={[styles.nextStopBanner, { backgroundColor: c.primary + '15', borderColor: c.primary + '40' }]}>
                      <Text style={[styles.nextStopLabel, { color: c.primary }]}>{t('dashboard.next_stop')}</Text>
                      <Text style={[styles.nextStopAddr, { color: c.text }]} numberOfLines={1}>
                        Central Distribution Centre, Reading
                      </Text>
                      <Text style={[styles.nextStopTime, { color: c.textMuted }]}>12:30 – 14:00 window</Text>
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={styles.heroActions}>
                    <TouchableOpacity
                      style={[styles.btnSecondary, { borderColor: c.primary }]}
                      onPress={() => router.push(`/(driver)/trip-detail?id=${heroTrip.id}`)}
                    >
                      <Text style={[styles.btnSecondaryTxt, { color: c.primary }]}>{t('dashboard.view_details')}</Text>
                    </TouchableOpacity>
                    {heroTrip.status === 'in_progress' && (
                      <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: c.primary }]} onPress={handleNavigate}>
                        <Text style={styles.btnPrimaryTxt}>{t('dashboard.navigate')}</Text>
                      </TouchableOpacity>
                    )}
                    {heroTrip.status === 'scheduled' && (
                      <TouchableOpacity
                        style={[styles.btnPrimary, { backgroundColor: c.primary }]}
                        onPress={() => router.push(`/(driver)/trip-detail?id=${heroTrip.id}`)}
                      >
                        <Text style={styles.btnPrimaryTxt}>{t('dashboard.start_trip')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !heroTrip && remainingTrips.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}></Text>
                <Text style={[styles.emptyTitle, { color: c.text }]}>{t('dashboard.all_clear')}</Text>
                <Text style={[styles.emptySub, { color: c.textMuted }]}>
                  {t('dashboard.no_trips')}
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1 },
  bgContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  container: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
    borderBottomWidth: 1,
  },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  driverName: { fontSize: 24, fontWeight: '700' },
  dateChip: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    borderBottomWidth: 1,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700' },
  statLbl: { fontSize: 11, fontWeight: '500', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  statDivider: { width: 1, height: 32 },

  listContent: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 40, gap: 10 },

  // ── Hero card ──
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  heroAccent: { width: 5 },
  heroBody: { flex: 1, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 6 },
  heroLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  heroRef: { fontSize: 26, fontWeight: '700', marginBottom: 2 },
  heroClient: { fontSize: 15, fontWeight: '500', marginBottom: 12 },

  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  metaTxt: { fontSize: 12, fontWeight: '500' },

  nextStopBanner: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 14,
  },
  nextStopLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  nextStopAddr: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  nextStopTime: { fontSize: 12 },

  heroActions: { flexDirection: 'row', gap: 10 },
  btnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimaryTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSecondary: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSecondaryTxt: { fontSize: 15, fontWeight: '600' },

  // ── Trip list cards ──
  listCard: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  listAccent: { width: 4 },
  listBody: { flex: 1, paddingVertical: 14, paddingLeft: 12 },
  listRef: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  listSub: { fontSize: 13 },
  listRight: { paddingVertical: 12, paddingRight: 12, alignItems: 'flex-end', justifyContent: 'space-between' },
  listTime: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

  // ── Empty state ──
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
