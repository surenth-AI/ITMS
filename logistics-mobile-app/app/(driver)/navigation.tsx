/**
 * Navigation screen — works in Expo Go without a custom build.
 *
 * Architecture:
 *  - expo-location (Expo Go compatible) provides live GPS.
 *  - OSRM REST API provides turn-by-turn steps and route info.
 *  - Native maps (Google Maps / Apple Maps) handle actual driving navigation
 *    via Linking — the right tool for the job; they have offline maps, voice
 *    guidance, and real-time traffic.
 *  - This screen tracks current step by GPS proximity and shows ETA / distance.
 *
 * To embed an interactive map inside the app, use EAS Build (not Expo Go):
 *   - react-native-maps  → native map component
 *   - react-native-webview + Leaflet → WebView approach
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { useThemeStore } from '../../store/themeStore';

// ─── Types ────────────────────────────────────────────────────────────────────
type Coord = { latitude: number; longitude: number };

interface OsrmStep {
  distance: number;
  duration: number;
  name: string;
  maneuver: { type: string; modifier?: string; location: [number, number] };
}

// ─── OSRM fetch ───────────────────────────────────────────────────────────────
async function fetchRoute(from: Coord, to: Coord) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
      `?overview=false&steps=true`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error('osrm_error');
    const data = await res.json();
    const route = data.routes[0];
    return {
      distance: route.distance as number,
      duration: route.duration as number,
      steps: (route.legs[0]?.steps ?? []) as OsrmStep[],
    };
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

// ─── Instruction helpers ──────────────────────────────────────────────────────
const ARROWS: Record<string, string> = {
  left: '←', 'sharp left': '←', right: '→', 'sharp right': '→',
  'slight left': '↖', 'slight right': '↗', uturn: '↩', straight: '↑',
};

function stepIcon(step: OsrmStep): { name: React.ComponentProps<typeof Ionicons>['name']; color?: string } {
  const { type, modifier = '' } = step.maneuver;
  if (type === 'arrive') return { name: 'flag', color: '#22C55E' };
  if (type === 'depart') return { name: 'navigate' };
  if (modifier.includes('left')) return { name: 'arrow-back' };
  if (modifier.includes('right')) return { name: 'arrow-forward' };
  if (type === 'roundabout' || type === 'rotary') return { name: 'refresh' };
  return { name: 'arrow-up' };
}

function stepText(step: OsrmStep): string {
  const { type, modifier = '' } = step.maneuver;
  const road = step.name || 'the road';
  if (type === 'depart') return `Head ${modifier || 'straight'} on ${road}`;
  if (type === 'arrive') return 'Arrive at destination';
  if (type === 'turn') return `Turn ${modifier} onto ${road}`;
  if (type === 'merge') return `Merge ${modifier} onto ${road}`;
  if (type === 'roundabout' || type === 'rotary') return `Take the roundabout onto ${road}`;
  if (type === 'fork') return `Keep ${modifier} at the fork`;
  if (type === 'off ramp') return 'Take the exit';
  return `Continue on ${road}`;
}

function fmtDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function fmtDuration(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;
}

function fmtETA(s: number): string {
  return new Date(Date.now() + s * 1000)
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function haversine(a: Coord, b: Coord): number {
  const R = 6371000;
  const d1 = ((b.latitude - a.latitude) * Math.PI) / 180;
  const d2 = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x =
    Math.sin(d1 / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
    Math.cos((b.latitude * Math.PI) / 180) *
    Math.sin(d2 / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ─── Open native maps ─────────────────────────────────────────────────────────
function openGoogleMaps(lat: number, lng: number, label: string) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(label)}&travelmode=driving`;
  Linking.openURL(url);
}

function openAppleMaps(lat: number, lng: number, label: string) {
  const url = `maps://?daddr=${lat},${lng}&q=${encodeURIComponent(label)}&dirflg=d`;
  Linking.openURL(url);
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function NavigationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const c = colors[theme];

  const [phase, setPhase] = useState<'locating' | 'routing' | 'ready' | 'noperm' | 'noroute'>('locating');
  const [steps, setSteps] = useState<OsrmStep[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);

  const stepsRef = useRef<OsrmStep[]>([]);
  const stepIdxRef = useRef(0);
  const locSub = useRef<Location.LocationSubscription | null>(null);
  const listRef = useRef<FlatList>(null);

  const destLat = parseFloat(params.destLat as string) || 51.5074;
  const destLng = parseFloat(params.destLng as string) || -0.1278;
  const dest: Coord = { latitude: destLat, longitude: destLng };
  const destLabel = (params.dest as string) || 'Destination';

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setPhase('noperm'); return; }

      setPhase('routing');
      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      if (cancelled) return;

      const from: Coord = { latitude: initial.coords.latitude, longitude: initial.coords.longitude };

      try {
        const route = await fetchRoute(from, dest);
        if (cancelled) return;
        stepsRef.current = route.steps;
        setSteps(route.steps);
        setRouteInfo({ distance: route.distance, duration: route.duration });
        setPhase('ready');
      } catch {
        if (!cancelled) setPhase('noroute');
      }

      // Watch GPS for step advancement and speed
      locSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 3000, distanceInterval: 10 },
        (loc) => {
          const p: Coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          if (loc.coords.speed != null && loc.coords.speed >= 0) {
            setSpeed(loc.coords.speed * 3.6); // m/s → km/h
          }
          // Advance step on proximity
          const nextIdx = stepIdxRef.current + 1;
          const nextStep = stepsRef.current[nextIdx];
          if (nextStep) {
            const manLoc = nextStep.maneuver.location;
            const manCoord: Coord = { latitude: manLoc[1], longitude: manLoc[0] };
            if (haversine(p, manCoord) < 50) {
              stepIdxRef.current = nextIdx;
              setStepIdx(nextIdx);
              listRef.current?.scrollToIndex({ index: nextIdx, animated: true, viewPosition: 0.3 });
            }
          }
        }
      );
    })();

    return () => {
      cancelled = true;
      locSub.current?.remove();
    };
  }, []);

  // ── Loading ──
  if (phase === 'locating' || phase === 'routing') {
    return (
      <View style={[s.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[s.loadTxt, { color: c.textMuted }]}>
          {phase === 'locating' ? 'Getting your location…' : 'Fetching route from OSRM…'}
        </Text>
      </View>
    );
  }

  // ── No permission ──
  if (phase === 'noperm') {
    return (
      <View style={[s.center, { backgroundColor: c.background }]}>
        <Ionicons name="location-outline" size={48} color={c.textMuted} />
        <Text style={[s.errTitle, { color: c.text }]}>Location access denied</Text>
        <Text style={[s.errSub, { color: c.textMuted }]}>
          Enable location in device Settings to use navigation.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: c.primary }]}>
          <Text style={s.backBtnTxt}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStep = steps[stepIdx] ?? null;
  const currentIcon = currentStep ? stepIcon(currentStep) : null;

  const renderStep = ({ item, index }: { item: OsrmStep; index: number }) => {
    const isActive = index === stepIdx;
    const isDone = index < stepIdx;
    const icon = stepIcon(item);
    return (
      <View style={[
        s.stepRow,
        { borderColor: c.border },
        isActive && { backgroundColor: c.primary + '12', borderColor: c.primary },
      ]}>
        <View style={[
          s.stepIconWrap,
          { backgroundColor: isDone ? c.success + '20' : isActive ? c.primary + '20' : c.card },
        ]}>
          <Ionicons
            name={isDone ? 'checkmark' : icon.name}
            size={18}
            color={isDone ? c.success : isActive ? c.primary : c.textMuted}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[s.stepTxt, { color: isDone ? c.textMuted : c.text }]}
            numberOfLines={2}
          >
            {stepText(item)}
          </Text>
          {item.distance > 0 && (
            <Text style={[s.stepMeta, { color: c.textMuted }]}>
              {fmtDist(item.distance)}  ·  {fmtDuration(item.duration)}
            </Text>
          )}
        </View>
        {isActive && (
          <View style={[s.activeDot, { backgroundColor: c.primary }]} />
        )}
      </View>
    );
  };

  return (
    <View style={[s.root, { backgroundColor: c.background }]}>

      {/* ── Current instruction card ── */}
      <View style={[s.instrCard, { backgroundColor: c.primary }]}>
        <View style={s.instrInner}>
          <View style={[s.instrIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            {currentIcon && (
              <Ionicons name={currentIcon.name} size={28} color="#fff" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.instrMain} numberOfLines={2}>
              {currentStep ? stepText(currentStep) : (phase === 'noroute' ? 'Route unavailable' : 'Follow the route')}
            </Text>
            {currentStep && currentStep.distance > 0 && (
              <Text style={s.instrSub}>in {fmtDist(currentStep.distance)}</Text>
            )}
          </View>
        </View>

        {/* Stats row inside card */}
        {routeInfo && (
          <View style={[s.statsRow, { borderTopColor: 'rgba(255,255,255,0.2)' }]}>
            <View style={s.statItem}>
              <Text style={s.statVal}>{fmtETA(routeInfo.duration)}</Text>
              <Text style={s.statLbl}>Arrival</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
            <View style={s.statItem}>
              <Text style={s.statVal}>{Math.round(routeInfo.duration / 60)} min</Text>
              <Text style={s.statLbl}>{fmtDist(routeInfo.distance)}</Text>
            </View>
            {speed !== null && (
              <>
                <View style={[s.statDivider, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
                <View style={s.statItem}>
                  <Text style={s.statVal}>{Math.round(speed)}</Text>
                  <Text style={s.statLbl}>km/h</Text>
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {/* ── Destination label ── */}
      <View style={[s.destBar, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Ionicons name="location" size={15} color={c.success} />
        <Text style={[s.destTxt, { color: c.textMuted }]} numberOfLines={1}>  {destLabel}</Text>
      </View>

      {/* ── Step list ── */}
      {steps.length > 0 ? (
        <FlatList
          ref={listRef}
          data={steps}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderStep}
          contentContainerStyle={s.list}
          onScrollToIndexFailed={() => {}}
        />
      ) : (
        <View style={s.center}>
          <Ionicons name="warning-outline" size={36} color={c.textMuted} />
          <Text style={[s.errSub, { color: c.textMuted, marginTop: 8 }]}>
            Route steps unavailable. GPS is still active.
          </Text>
        </View>
      )}

      {/* ── Bottom actions ── */}
      <View style={[s.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
        {/* Open native maps */}
        <View style={s.mapsRow}>
          <TouchableOpacity
            style={[s.mapsBtn, { backgroundColor: '#4285F4' }]}
            onPress={() => openGoogleMaps(destLat, destLng, destLabel)}
          >
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={s.mapsBtnTxt}>Google Maps</Text>
          </TouchableOpacity>
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[s.mapsBtn, { backgroundColor: c.card, borderWidth: 1, borderColor: c.border }]}
              onPress={() => openAppleMaps(destLat, destLng, destLabel)}
            >
              <Ionicons name="map" size={16} color={c.text} />
              <Text style={[s.mapsBtnTxt, { color: c.text }]}>Apple Maps</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[s.endBtn, { borderColor: c.danger }]}
          onPress={() => router.back()}
        >
          <Text style={[s.endBtnTxt, { color: c.danger }]}>End Navigation</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadTxt: { marginTop: 16, fontSize: 15 },
  errTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  errSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  instrCard: {
    marginHorizontal: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  instrInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    paddingTop: 16,
  },
  instrIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instrMain: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 24 },
  instrSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },

  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 32, alignSelf: 'center', marginHorizontal: 8 },

  destBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  destTxt: { fontSize: 13, flex: 1 },

  list: { paddingVertical: 8 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 3,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  stepIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTxt: { fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 2 },
  stepMeta: { fontSize: 12 },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },

  footer: {
    borderTopWidth: 1,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    gap: 10,
  },
  mapsRow: { flexDirection: 'row', gap: 10 },
  mapsBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  mapsBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  endBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endBtnTxt: { fontSize: 15, fontWeight: '700' },
  backBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
