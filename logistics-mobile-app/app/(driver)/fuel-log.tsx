import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { colors } from '../../constants/colors';
import api from '../../services/api';

export default function FuelLogScreen() {
  const { theme } = useThemeStore();
  const c = colors[theme];
  const styles = getStyles(c);
  const router = useRouter();

  const [litres, setLitres] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [stationName, setStationName] = useState('');
  const [odometer, setOdometer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!litres || !costPerUnit || !odometer) {
      Alert.alert('Missing Fields', 'Please fill in litres, cost, and odometer.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/fuel-logs', {
        vehicle_id: 'TRK-001',
        litres: parseFloat(litres),
        cost_per_unit: parseFloat(costPerUnit),
        odometer_km: parseInt(odometer),
      });
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to record fuel log.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Vehicle Fuel Type</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value="Diesel"
            editable={false}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Litres Filled</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={c.textMuted}
            keyboardType="decimal-pad"
            value={litres}
            onChangeText={setLitres}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Cost Per Litre</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={c.textMuted}
            keyboardType="decimal-pad"
            value={costPerUnit}
            onChangeText={setCostPerUnit}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Station Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter station name"
            placeholderTextColor={c.textMuted}
            value={stationName}
            onChangeText={setStationName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Odometer (km)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={c.textMuted}
            keyboardType="number-pad"
            value={odometer}
            onChangeText={setOdometer}
          />
        </View>

        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Add Receipt Photo (Optional)</Text>
        </TouchableOpacity>

      </ScrollView>
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={[styles.primaryButton, submitting && { opacity: 0.5 }]} 
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>{submitting ? 'Submitting...' : 'Submit Fuel Log'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (c: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: c.textMuted,
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 0,
    paddingHorizontal: 16,
    fontSize: 17,
    color: c.text,
    backgroundColor: c.background,
  },
  disabledInput: {
    backgroundColor: c.card,
    color: c.textMuted,
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
    marginTop: 8,
  },
  secondaryButtonText: {
    color: c.primary,
    fontSize: 17,
    fontWeight: 'bold',
  },
  bottomSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.background,
  },
  primaryButton: {
    height: 52,
    backgroundColor: c.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
