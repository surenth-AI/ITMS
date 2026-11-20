import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { useThemeStore } from '../../store/themeStore';
import api from '../../services/api';
import { startTrip } from '../../services/tripService';

type StopStatus = 'completed' | 'arrived' | 'pending';

interface Stop {
  id: string;
  address: string;
  window: string;
  status: StopStatus;
  lat: number;
  lng: number;
}

const MOCK_STOPS: Stop[] = [
  { id: '1', address: '14 Logistics Way, London',                window: '09:00 – 11:00', status: 'completed', lat: 51.5155, lng: -0.0922 },
  { id: '2', address: 'Central Distribution Centre, Reading',    window: '12:30 – 14:00', status: 'arrived',   lat: 51.4543, lng: -0.9781 },
  { id: '3', address: 'Port Authority, Bristol',                 window: '16:00 – 17:00', status: 'pending',   lat: 51.4545, lng: -2.5879 },
];

const ISSUE_TYPES = ['breakdown', 'accident', 'medical', 'cargo_damage', 'other'] as const;

function stopIcon(status: StopStatus, c: any) {
  if (status === 'completed') return { name: 'checkmark-circle' as const, color: c.success };
  if (status === 'arrived')   return { name: 'location'         as const, color: c.primary };
  return                             { name: 'ellipse-outline'  as const, color: c.border  };
}

export default function TripDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const c = colors[theme];

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [issueModal, setIssueModal] = useState(false);

  const fetchTrip = async () => {
    try {
      if (params.id) {
        const res = await api.get(`/trips/${params.id}`);
        setTrip(res.data);
      }
    } catch {
      // trip not found — handled below
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrip(); }, [params.id]);

  const handlePrimaryAction = async () => {
    if (!trip) return;
    if (trip.status === 'scheduled') {
      await startTrip(trip.id);
      fetchTrip();
    } else if (trip.status === 'in_progress') {
      const nextStop = MOCK_STOPS.find(s => s.status === 'arrived') ?? MOCK_STOPS[1];
      router.push(
        `/(driver)/navigation?dest=${encodeURIComponent(nextStop.address)}&destLat=${nextStop.lat}&destLng=${nextStop.lng}`
      );
    } else {
      router.back();
    }
  };

  const handleReportIssue = async (type: string) => {
    setIssueModal(false);
    try {
      await api.post('/incidents', {
        trip_id: trip.id,
        vehicle_id: trip.vehicle_id,
        incident_type: type,
        description: `Driver reported: ${type}`,
      });
      Alert.alert('Reported', 'The dispatcher has been notified.');
      fetchTrip();
    } catch {
      Alert.alert('Error', 'Could not report the issue. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[s.center, { backgroundColor: c.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={c.textMuted} />
        <Text style={[s.notFoundTxt, { color: c.textMuted }]}>Trip not found</Text>
      </View>
    );
  }

  const isReady      = trip.status === 'scheduled';
  const isInProgress = trip.status === 'in_progress';
  const primaryLabel = isReady ? 'Start Trip' : isInProgress ? 'Navigate to Next Stop' : 'Back to Dashboard';

  const completedCount = MOCK_STOPS.filter(s => s.status === 'completed').length;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: c.background }]} edges={['bottom']}>

      {/* ── Header ── */}
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <View style={s.headerTop}>
          <Text style={[s.ref, { color: c.text }]}>{trip.reference}</Text>
          <View style={[
            s.statusBadge,
            { backgroundColor: isInProgress ? c.primary : isReady ? c.border : c.success }
          ]}>
            <Text style={[s.statusTxt, { color: isReady ? c.textMuted : '#fff' }]}>
              {trip.status.toUpperCase().replace('_', ' ')}
            </Text>
          </View>
        </View>
        <Text style={[s.client, { color: c.textMuted }]}>ACME Corp Logistics</Text>

        {/* Meta chips */}
        <View style={s.metaRow}>
          {[
            `${MOCK_STOPS.length} stops`,
            `${completedCount}/${MOCK_STOPS.length} done`,
            '142 mi',
            new Date(trip.planned_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ].map((label) => (
            <View key={label} style={[s.chip, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[s.chipTxt, { color: c.textMuted }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Stop timeline ── */}
      <FlatList
        data={MOCK_STOPS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        renderItem={({ item, index }) => {
          const icon = stopIcon(item.status, c);
          const isActive = item.status === 'arrived';
          const isLast = index === MOCK_STOPS.length - 1;

          return (
            <View style={s.stopRow}>
              {/* Timeline spine */}
              <View style={s.spine}>
                <View style={[s.spineCircle, {
                  backgroundColor: isActive ? c.primary : item.status === 'completed' ? c.success : c.card,
                  borderColor: isActive ? c.primary : item.status === 'completed' ? c.success : c.border,
                }]}>
                  <Ionicons
                    name={icon.name}
                    size={14}
                    color={item.status === 'pending' ? c.border : '#fff'}
                  />
                </View>
                {!isLast && (
                  <View style={[s.spineLine, {
                    backgroundColor: item.status === 'completed' ? c.success : c.border,
                  }]} />
                )}
              </View>

              {/* Stop card */}
              <View style={[
                s.stopCard,
                { borderColor: isActive ? c.primary : c.border, backgroundColor: c.card },
                isActive && { borderColor: c.primary, borderWidth: 1.5 },
              ]}>
                <View style={s.stopCardTop}>
                  <Text style={[s.stopAddr, { color: c.text }]} numberOfLines={2}>{item.address}</Text>
                  {isInProgress && item.status !== 'completed' && (
                    <TouchableOpacity
                      style={[s.navBtn, { backgroundColor: c.primary }]}
                      onPress={() => router.push(
                        `/(driver)/navigation?dest=${encodeURIComponent(item.address)}&destLat=${item.lat}&destLng=${item.lng}`
                      )}
                    >
                      <Ionicons name="navigate" size={14} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={s.stopMeta}>
                  <Ionicons name="time-outline" size={13} color={c.textMuted} />
                  <Text style={[s.stopWindow, { color: c.textMuted }]}>{item.window}</Text>
                  {isActive && (
                    <View style={[s.activePill, { backgroundColor: c.primary + '20' }]}>
                      <Text style={[s.activePillTxt, { color: c.primary }]}>Current Stop</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* ── Bottom actions ── */}
      <View style={[s.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
        <TouchableOpacity style={[s.primaryBtn, { backgroundColor: c.primary }]} onPress={handlePrimaryAction}>
          <Text style={s.primaryBtnTxt}>{primaryLabel}</Text>
        </TouchableOpacity>
        {isInProgress && (
          <TouchableOpacity
            style={[s.secondaryBtn, { borderColor: c.danger, marginTop: 10 }]}
            onPress={() => setIssueModal(true)}
          >
            <Ionicons name="warning-outline" size={16} color={c.danger} style={{ marginRight: 6 }} />
            <Text style={[s.secondaryBtnTxt, { color: c.danger }]}>Report Issue</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Report issue modal ── */}
      <Modal visible={issueModal} animationType="slide" transparent>
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setIssueModal(false)}
        />
        <View style={[s.sheet, { backgroundColor: c.background }]}>
          <View style={[s.sheetHandle, { backgroundColor: c.border }]} />
          <Text style={[s.sheetTitle, { color: c.text }]}>Report Issue</Text>
          {ISSUE_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[s.issueRow, { borderBottomColor: c.border }]}
              onPress={() => handleReportIssue(type)}
            >
              <Text style={[s.issueTxt, { color: c.text }]}>
                {type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[s.cancelBtn, { backgroundColor: c.card, borderColor: c.border, marginTop: 12 }]}
            onPress={() => setIssueModal(false)}
          >
            <Text style={[s.cancelTxt, { color: c.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundTxt: { marginTop: 12, fontSize: 16 },

  // ── Header ──
  header: { padding: 16, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  ref: { fontSize: 26, fontWeight: '700', flex: 1, marginRight: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  client: { fontSize: 15, marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  chipTxt: { fontSize: 12, fontWeight: '500' },

  // ── Timeline ──
  listContent: { padding: 16, paddingBottom: 8 },
  stopRow: { flexDirection: 'row', marginBottom: 8 },
  spine: { width: 36, alignItems: 'center' },
  spineCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  spineLine: { width: 2, flex: 1, marginTop: 2, marginBottom: -4 },

  stopCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginLeft: 8,
    marginBottom: 4,
  },
  stopCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  stopAddr: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8, lineHeight: 20 },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stopWindow: { fontSize: 13, flex: 1 },
  activePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  activePillTxt: { fontSize: 11, fontWeight: '700' },

  // ── Footer ──
  footer: { padding: 16, borderTopWidth: 1 },
  primaryBtn: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnTxt: { fontSize: 15, fontWeight: '600' },

  // ── Issue modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  issueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  issueTxt: { fontSize: 16 },
  cancelBtn: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 16, fontWeight: '600' },
});
