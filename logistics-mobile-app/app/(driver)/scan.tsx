import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Modal, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { colors } from '../../constants/colors';
import { useThemeStore } from '../../store/themeStore';
import SignaturePad, { SignaturePadRef } from '../../components/SignaturePad';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { api } from '../../services/api';
import { queuePOD, syncOfflinePODs, initOfflineQueue } from '../../services/offlineQueue';

type PodJob = {
  shipment_id: string;
  shipment_reference: string;
  job_reference: string;
  customer_reference: string | null;
  from_city: string | null;
  to_city: string | null;
  to_name: string | null;
  pallets: number;
  trip_reference: string;
};

type PodResult = {
  podReference: string | null;
  capturedAt: Date;
  lat: number | null;
  lng: number | null;
  invoices: string[];
  offline: boolean;
};

type Service = { id: string; label: string; selected: boolean };

const INITIAL_SERVICES: Service[] = [
  { id: 'waiting_time', label: 'Waiting time', selected: false },
  { id: 'tail_lift', label: 'Tail lift assistance provided', selected: false },
  { id: 'inside_delivery', label: 'Inside delivery / manual unloading', selected: false },
  { id: 'weekend_delivery', label: 'Weekend / out of hours delivery', selected: false },
];

const hhmm = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

// Build a multipart file part that works on both native (uri object) and web (Blob).
async function filePart(uri: string, name: string, type: string): Promise<Blob | any> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    return await res.blob();
  }
  return { uri, name, type };
}

export default function PODScreen() {
  const { theme } = useThemeStore();
  const c = colors[theme];
  const params = useLocalSearchParams<{ shipmentId?: string }>();

  const [jobs, setJobs] = useState<PodJob[]>([]);
  const [job, setJob] = useState<PodJob | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [documentUris, setDocumentUris] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignatureModalVisible, setIsSignatureModalVisible] = useState(false);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES.map(s => ({ ...s })));
  const [minutesOnSite, setMinutesOnSite] = useState('');
  const [result, setResult] = useState<PodResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signatureRef = useRef<SignaturePadRef>(null);

  useEffect(() => {
    initOfflineQueue();
    syncOfflinePODs();
  }, []);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const res = await api.get('/driver/pod-jobs');
      const list: PodJob[] = res.data.jobs || [];
      setJobs(list);
      setJob(current =>
        list.find(j => j.shipment_id === (params.shipmentId || current?.shipment_id)) || list[0] || null);
    } catch {
      setError('Could not load your jobs. Check the connection and try again.');
    } finally {
      setLoadingJobs(false);
    }
  }, [params.shipmentId]);

  useFocusEffect(useCallback(() => { if (!result) loadJobs(); }, [loadJobs, result]));

  const resetForm = () => {
    setDocumentUris([]);
    setSignature(null);
    setRecipientName('');
    setPhotoUri(null);
    setServices(INITIAL_SERVICES.map(s => ({ ...s })));
    setMinutesOnSite('');
    setError(null);
  };

  const pickImage = async (quality: number) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted && Platform.OS !== 'web') {
      setError('Camera access is required.');
      return null;
    }
    const res = await ImagePicker.launchCameraAsync({ quality });
    return !res.canceled && res.assets[0] ? res.assets[0].uri : null;
  };

  const handleDocumentScan = async () => {
    const uri = await pickImage(0.8);
    if (uri) setDocumentUris(prev => [...prev, uri]);
  };

  const handlePhotoCapture = async () => {
    const uri = await pickImage(0.7);
    if (uri) setPhotoUri(uri);
  };

  const handleSignatureOK = (signatureBase64: string) => {
    setSignature(signatureBase64);
    setIsSignatureModalVisible(false);
  };

  const waitingSelected = services.some(s => s.id === 'waiting_time' && s.selected);
  const hasEvidence = documentUris.length > 0 || !!signature || !!photoUri;
  const waitingValid = !waitingSelected || Number(minutesOnSite) > 0;
  const canSubmit = !!job && hasEvidence && waitingValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!job || !canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    const capturedAt = new Date();
    try {
      let lat: number | null = null, lng: number | null = null;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }

      const additional_services = services.filter(s => s.selected).map(s =>
        s.id === 'waiting_time' ? { id: s.id, minutes_on_site: Number(minutesOnSite) } : s.id);

      const net = await Network.getNetworkStateAsync();
      const isOnline = Platform.OS === 'web' || (net.isConnected && net.isInternetReachable);

      if (!isOnline) {
        queuePOD(job.shipment_id, {
          documentUri: documentUris[0] || null, signatureBase64: signature, recipientName,
          photoUri, lat, lng, additional_services,
        });
        setResult({ podReference: null, capturedAt, lat, lng, invoices: [], offline: true });
        return;
      }

      const base = `/v1/shipments/${job.shipment_id}/pod`;
      let documentUrl = null;
      if (documentUris[0]) {
        const form = new FormData();
        form.append('document', await filePart(documentUris[0], 'signed_document.jpg', 'image/jpeg'), 'signed_document.jpg');
        documentUrl = (await api.post(`${base}/document`, form)).data.document_url;
      }
      let signatureUrl = null;
      if (signature) {
        signatureUrl = (await api.post(`${base}/signature`, {
          signature_base64: signature, recipient_name: recipientName,
        })).data.signature_url;
      }
      let photoUrl = null;
      if (photoUri) {
        const form = new FormData();
        form.append('photo', await filePart(photoUri, 'delivery_photo.jpg', 'image/jpeg'), 'delivery_photo.jpg');
        photoUrl = (await api.post(`${base}/photo`, form)).data.photo_url;
      }
      const submit = await api.post(`${base}/submit`, {
        document_url: documentUrl,
        signature_url: signatureUrl,
        recipient_name: recipientName,
        photo_url: photoUrl,
        lat,
        lng,
        was_offline: false,
        additional_services,
      });
      setResult({
        podReference: submit.data.pod_reference,
        capturedAt,
        lat,
        lng,
        invoices: submit.data.invoices_raised || [],
        offline: false,
      });
    } catch (err) {
      console.error(err);
      setError('Failed to submit POD. Nothing was lost; try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextJob = () => {
    setResult(null);
    resetForm();
    setJob(null);
    loadJobs();
  };

  // ---------- Result: POD landed on the job ----------
  if (result && job) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Text style={[styles.headerTitle, { color: c.text }]}>Proof of Delivery</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.resultCard, { backgroundColor: c.card, borderColor: c.success }]}>
            <Ionicons name="checkmark-circle" size={40} color={c.success} />
            <Text style={[styles.resultTitle, { color: c.text }]}>
              {result.offline ? 'POD saved on the phone' : 'POD on the job'}
            </Text>
            <Text style={[styles.jobRef, { color: c.text }]}>{job.job_reference}</Text>
            {result.podReference && <Text style={{ color: c.textMuted, marginTop: 2 }}>{result.podReference}</Text>}
          </View>

          <View style={[styles.stampRow, { borderColor: c.border }]}>
            <Ionicons name="time-outline" size={20} color={c.text} />
            <Text style={[styles.stampText, { color: c.text }]}>Delivered {hhmm(result.capturedAt)}</Text>
          </View>
          {result.lat !== null && result.lng !== null && (
            <View style={[styles.stampRow, { borderColor: c.border }]}>
              <Ionicons name="location" size={20} color={c.text} />
              <Text style={[styles.stampText, { color: c.text }]}>
                {job.to_city ? `${job.to_city}  ` : ''}({result.lat.toFixed(3)}, {result.lng.toFixed(3)})
              </Text>
            </View>
          )}
          {signature && (
            <View style={[styles.stampRow, { borderColor: c.border }]}>
              <Ionicons name="create-outline" size={20} color={c.text} />
              <Text style={[styles.stampText, { color: c.text }]}>Signed{recipientName ? ` by ${recipientName}` : ''}</Text>
            </View>
          )}
          {photoUri && (
            <View style={[styles.stampRow, { borderColor: c.border }]}>
              <Ionicons name="camera-outline" size={20} color={c.text} />
              <Text style={[styles.stampText, { color: c.text }]}>Photo of the load attached</Text>
            </View>
          )}
          {result.offline && (
            <Text style={{ color: c.textMuted, marginTop: 12 }}>It uploads automatically when signal returns.</Text>
          )}
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: c.primary }]} onPress={nextJob}>
            <Text style={styles.submitBtnText}>Next job</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------- Capture ----------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>Proof of Delivery</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Job */}
        {loadingJobs ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: 24 }} />
        ) : !job ? (
          <Text style={{ color: c.textMuted, marginBottom: 24 }}>No jobs waiting for a POD on your active trips.</Text>
        ) : (
          <View style={[styles.jobCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.jobRef, { color: c.text }]}>{job.job_reference}</Text>
            <Text style={{ color: c.text, marginTop: 4 }}>
              {job.from_city} to {job.to_city || job.to_name}
            </Text>
            <Text style={{ color: c.textMuted, marginTop: 2 }}>
              {job.pallets ? `${job.pallets} pallets` : job.shipment_reference}
              {job.customer_reference ? `  ·  Ref ${job.customer_reference}` : ''}
            </Text>
            {jobs.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {jobs.map(j => (
                  <TouchableOpacity key={j.shipment_id} onPress={() => setJob(j)}
                    style={[styles.jobChip, { borderColor: j.shipment_id === job.shipment_id ? c.primary : c.border }]}>
                    <Text style={{ color: c.text, fontSize: 12 }}>{j.job_reference}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* 1. Document */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>1. Signed document (optional)</Text>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c.primary }]} onPress={handleDocumentScan}>
            <Ionicons name="document-outline" size={22} color="#fff" />
            <Text style={styles.actionBtnText}>Photograph signed document</Text>
          </TouchableOpacity>
          {documentUris.length > 0 && (
            <View style={styles.previewContainer}>
              {documentUris.map((uri, idx) => <Image key={idx} source={{ uri }} style={styles.previewImage} />)}
            </View>
          )}
        </View>

        {/* 2. Signature */}
        <View style={[styles.section, { borderTopColor: c.border, borderTopWidth: 1, paddingTop: 20 }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>2. Signature</Text>
          <TextInput
            value={recipientName}
            onChangeText={setRecipientName}
            placeholder="Received by (name)"
            placeholderTextColor={c.textMuted}
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
          />
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: c.card, borderWidth: 1, borderColor: c.primary, marginTop: 10 }]}
            onPress={() => setIsSignatureModalVisible(true)}
          >
            <Ionicons name="create-outline" size={22} color={c.primary} />
            <Text style={[styles.actionBtnText, { color: c.primary }]}>{signature ? 'Edit signature' : 'Open signature pad'}</Text>
          </TouchableOpacity>
          {signature && (
            <View style={[styles.capturedRow]}>
              <Ionicons name="checkmark-circle" size={18} color={c.success} />
              <Text style={{ color: c.success, fontWeight: '500' }}>Signature captured</Text>
            </View>
          )}
        </View>

        {/* 3. Photo */}
        <View style={[styles.section, { borderTopColor: c.border, borderTopWidth: 1, paddingTop: 20 }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>3. Photo of the load</Text>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c.card, borderWidth: 1, borderColor: c.border }]} onPress={handlePhotoCapture}>
            <Ionicons name="camera" size={22} color={c.text} />
            <Text style={[styles.actionBtnText, { color: c.text }]}>Take photo</Text>
          </TouchableOpacity>
          {photoUri && (
            <Image source={{ uri: photoUri }} style={[styles.previewImage, { marginTop: 12, width: '100%', height: 180 }]} resizeMode="cover" />
          )}
        </View>

        {/* 4. Extra services */}
        <View style={[styles.section, { borderTopColor: c.border, borderTopWidth: 1, paddingTop: 20 }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>4. Extra services</Text>
          {services.map((srv, index) => (
            <View key={srv.id}>
              <TouchableOpacity
                style={[styles.checkboxRow, { backgroundColor: c.card, borderColor: srv.selected ? c.primary : c.border }]}
                onPress={() => {
                  const next = services.map((s, i) => (i === index ? { ...s, selected: !s.selected } : s));
                  setServices(next);
                }}
              >
                <Ionicons name={srv.selected ? 'checkbox' : 'square-outline'} size={22} color={srv.selected ? c.primary : c.textMuted} />
                <Text style={[styles.checkboxLabel, { color: c.text }]}>{srv.label}</Text>
              </TouchableOpacity>
              {srv.id === 'waiting_time' && srv.selected && (
                <View style={styles.minutesRow}>
                  <Text style={{ color: c.text }}>Minutes on site</Text>
                  <TextInput
                    value={minutesOnSite}
                    onChangeText={t => setMinutesOnSite(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={c.textMuted}
                    style={[styles.input, styles.minutesInput, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {error && <Text style={[styles.errorText]}>{error}</Text>}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit ? c.primary : c.textMuted }]}
          disabled={!canSubmit}
          onPress={handleSubmit}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit POD</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={isSignatureModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsSignatureModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: c.text }}>Sign below</Text>
            <TouchableOpacity onPress={() => setIsSignatureModalVisible(false)}>
              <Ionicons name="close" size={24} color={c.text} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <SignaturePad ref={signatureRef} onOK={handleSignatureOK} penColor={c.text} backgroundColor={c.card} />
          </View>
          <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'flex-end', gap: 12, borderTopWidth: 1, borderTopColor: c.border }}>
            <TouchableOpacity onPress={() => { signatureRef.current?.clearSignature(); setSignature(null); }} style={[styles.secondaryBtn, { borderColor: c.border }]}>
              <Text style={[styles.secondaryBtnText, { color: c.text }]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => signatureRef.current?.readSignature()} style={[styles.secondaryBtn, { borderColor: c.primary, backgroundColor: c.primary }]}>
              <Text style={[styles.secondaryBtnText, { color: '#fff' }]}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  jobCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 24 },
  jobRef: { fontSize: 18, fontWeight: '700' },
  jobChip: { borderWidth: 1, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 10 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  previewContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  previewImage: { width: 100, height: 140, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  capturedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  secondaryBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
  secondaryBtnText: { fontWeight: '600', fontSize: 14 },
  footer: { padding: 20, borderTopWidth: 1 },
  submitBtn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 8, gap: 10 },
  checkboxLabel: { fontSize: 15, fontWeight: '500', flex: 1 },
  minutesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 12, gap: 12 },
  minutesInput: { width: 90, textAlign: 'right', paddingVertical: 8 },
  resultCard: { alignItems: 'center', borderWidth: 1.5, borderRadius: 16, padding: 20, marginBottom: 20 },
  resultTitle: { fontSize: 18, fontWeight: '700', marginTop: 8, marginBottom: 6 },
  stampRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  stampText: { fontSize: 16, fontWeight: '500', flexShrink: 1 },
  errorText: { color: '#DF5A4E', marginTop: 8 },
});
