import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Modal } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { colors } from '../../constants/colors';
import { useAlertStore, Alert } from '../../store/alertStore';

export default function AlertsScreen() {
  const { theme } = useThemeStore();
  const c = colors[theme];
  const styles = getStyles(c);
  const { alerts, markAsRead } = useAlertStore();

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const handleAlertPress = (alert: Alert) => {
    markAsRead(alert.id);
    setSelectedAlert(alert);
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'critical') return c.danger;
    if (severity === 'warning') return c.warning;
    return c.primary; // info blue/indigo
  };

  const renderAlertItem = ({ item }: { item: Alert }) => {
    const isCritical = item.severity === 'critical';

    return (
      <TouchableOpacity 
        style={[styles.alertItem, isCritical && styles.criticalAlertItem]} 
        onPress={() => handleAlertPress(item)}
      >
        <View style={styles.alertContentRow}>
          <Text style={styles.alertMessage} numberOfLines={2}>{item.message}</Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.alertTime}>
          {new Date(item.timestamp).toLocaleString([], {hour: '2-digit', minute:'2-digit', day: 'numeric', month: 'short'})}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={alerts}
        keyExtractor={item => item.id}
        renderItem={renderAlertItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyMessage}>No active alerts.</Text>
          </View>
        }
      />

      <Modal visible={!!selectedAlert} animationType="slide" presentationStyle="formSheet">
        {selectedAlert && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={[styles.modalHeader, { backgroundColor: getSeverityColor(selectedAlert.severity) }]}>
                <Text style={styles.modalHeaderText}>{selectedAlert.severity.toUpperCase()} ALERT</Text>
              </View>
              
              <View style={styles.modalBody}>
                <Text style={styles.modalMessage}>{selectedAlert.message}</Text>
                
                <Text style={styles.modalTime}>
                  Received: {new Date(selectedAlert.timestamp).toLocaleString()}
                </Text>

                {selectedAlert.severity === 'warning' && (
                  <View style={styles.actionHighlightBox}>
                    <Text style={styles.actionHighlightText}>Please follow dispatch instructions immediately.</Text>
                  </View>
                )}
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.primaryButton} onPress={() => setSelectedAlert(null)}>
                  <Text style={styles.primaryButtonText}>Got it</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (c: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  listContent: {
    paddingVertical: 8,
  },
  alertItem: {
    backgroundColor: c.card,
    padding: 16,
    minHeight: 64,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: c.border,
  },
  criticalAlertItem: {
    borderLeftColor: c.danger,
  },
  alertContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  alertMessage: {
    fontSize: 17,
    color: c.text,
    fontWeight: '500',
    flex: 1,
    lineHeight: 24,
  },
  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.primary,
    marginLeft: 12,
    marginTop: 4,
  },
  alertTime: {
    fontSize: 14,
    color: c.textMuted,
    marginTop: 8,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyMessage: {
    fontSize: 17,
    fontWeight: '500',
    color: c.text,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: c.background,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  modalHeader: {
    padding: 16,
    alignItems: 'center',
  },
  modalHeaderText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalBody: {
    flex: 1,
    padding: 24,
  },
  modalMessage: {
    fontSize: 22,
    fontWeight: 'bold',
    color: c.text,
    lineHeight: 30,
    marginBottom: 16,
  },
  modalTime: {
    fontSize: 14,
    color: c.textMuted,
    marginBottom: 24,
  },
  actionHighlightBox: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.warning,
    padding: 16,
    borderRadius: 8,
  },
  actionHighlightText: {
    fontSize: 17,
    color: c.text,
    fontWeight: '500',
  },
  modalFooter: {
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
