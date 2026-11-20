import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { colors } from '../../constants/colors';

type ShiftState = 'clocked_out' | 'clocked_in' | 'on_break';

export default function AttendanceScreen() {
  const { theme } = useThemeStore();
  const c = colors[theme];
  const styles = getStyles(c);

  const [shiftState, setShiftState] = useState<ShiftState>('clocked_out');
  const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (shiftState === 'clocked_in' && shiftStartTime) {
      interval = setInterval(() => {
        const diff = Math.floor((new Date().getTime() - shiftStartTime.getTime()) / 60000);
        const hours = Math.floor(diff / 60).toString().padStart(2, '0');
        const minutes = (diff % 60).toString().padStart(2, '0');
        setElapsedTime(`${hours}:${minutes}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [shiftState, shiftStartTime]);

  const handleStartShift = () => {
    setShiftStartTime(new Date());
    setShiftState('clocked_in');
  };

  const handleTakeBreak = () => {
    setBreakStartTime(new Date());
    setShiftState('on_break');
  };

  const handleResumeShift = () => {
    setBreakStartTime(null);
    setShiftState('clocked_in');
  };

  const handleEndShift = () => {
    Alert.alert('End Shift', 'Are you sure you want to end your shift?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Shift', style: 'destructive', onPress: () => {
        setShiftState('clocked_out');
        setShiftStartTime(null);
        setBreakStartTime(null);
        setElapsedTime('00:00');
      }}
    ]);
  };

  if (shiftState === 'clocked_out') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerCard}>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text style={styles.instructionText}>You are currently clocked out.</Text>
        </View>
        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleStartShift}>
            <Text style={styles.primaryButtonText}>Start shift</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerCard}>
        <Text style={styles.instructionText}>
          {shiftState === 'on_break' ? 'Currently on break' : 'Shift in progress'}
        </Text>
        <Text style={styles.elapsedTimeText}>{shiftState === 'on_break' ? '--:--' : elapsedTime}</Text>
        
        {shiftStartTime && (
          <Text style={styles.metaText}>
            Started: {shiftStartTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
        )}
        
        {shiftState === 'on_break' && breakStartTime && (
          <Text style={styles.metaText}>
            Break started: {breakStartTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
        )}
      </View>

      <View style={styles.bottomSection}>
        {shiftState === 'clocked_in' ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleTakeBreak}>
            <Text style={styles.secondaryButtonText}>Take break</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={handleResumeShift}>
            <Text style={styles.primaryButtonText}>Resume shift</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.destructiveButton} onPress={handleEndShift}>
          <Text style={styles.destructiveButtonText}>End shift</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (c: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    justifyContent: 'space-between',
  },
  centerCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dateText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: c.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 17,
    color: c.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  elapsedTimeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: c.text,
    marginVertical: 16,
  },
  metaText: {
    fontSize: 14,
    color: c.textMuted,
    marginTop: 8,
  },
  bottomSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.background,
    gap: 12,
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
  secondaryButton: {
    height: 48,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: c.primary,
    fontSize: 17,
    fontWeight: 'bold',
  },
  destructiveButton: {
    height: 48,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.danger,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  destructiveButtonText: {
    color: c.danger,
    fontSize: 17,
    fontWeight: 'bold',
  },
});
