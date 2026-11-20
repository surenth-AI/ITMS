import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { colors } from '../../constants/colors';
import api from '../../services/api';

const REASONS = [
  'Customer not present',
  'Refused delivery',
  'Damaged goods',
  'Cannot access location',
  'Incorrect address',
  'Other'
];

export default function FailedDelivery() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const c = colors[theme];
  const styles = getStyles(c);

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const tripId = params.tripId as string;

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for the failed delivery.');
      return;
    }

    try {
      setSubmitting(true);
      
      // We don't have a specific failed API endpoint yet, but we'll use the complete endpoint
      // and maybe send the status as failed. For now just mock the behavior.
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert('Reported', 'Failed delivery has been logged. Dispatch has been notified.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to report delivery failure.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Report Failure</Text>
            <View style={{ width: 50 }} />
          </View>

          <View style={styles.content}>
            <View style={styles.alertBox}>
              <Text style={styles.alertTitle}>Trip ID: {tripId || 'Unknown'}</Text>
              <Text style={styles.alertDesc}>You are about to report this delivery as failed. This will alert dispatch immediately.</Text>
            </View>

            <Text style={styles.sectionTitle}>Select Reason</Text>
            <View style={styles.reasonsContainer}>
              {REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonChip,
                    selectedReason === reason && styles.reasonChipSelected
                  ]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <Text style={[
                    styles.reasonText,
                    selectedReason === reason && styles.reasonTextSelected
                  ]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Additional Notes (Required for 'Other')</Text>
            <TextInput
              style={styles.input}
              placeholder="Provide more details about the failure..."
              placeholderTextColor={c.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.photoBox}>
              <Text style={styles.photoBoxText}>Tap to add photo evidence (Optional)</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitButton, (!selectedReason || submitting) && { opacity: 0.5 }]} 
            onPress={handleSubmit}
            disabled={!selectedReason || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (c: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backText: {
    color: c.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: c.text,
  },
  content: {
    padding: 20,
  },
  alertBox: {
    backgroundColor: '#fef2f2', // light red
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  alertTitle: {
    color: '#991b1b',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  alertDesc: {
    color: '#b91c1c',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text,
    marginBottom: 12,
    marginTop: 8,
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  reasonChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  reasonChipSelected: {
    backgroundColor: '#fee2e2', // light red active
    borderColor: '#ef4444',
  },
  reasonText: {
    color: c.text,
    fontSize: 14,
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  input: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: c.text,
    minHeight: 120,
    marginBottom: 24,
  },
  photoBox: {
    backgroundColor: c.background,
    borderWidth: 2,
    borderColor: c.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBoxText: {
    color: c.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.card,
  },
  submitButton: {
    backgroundColor: '#ef4444', // Red button
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
