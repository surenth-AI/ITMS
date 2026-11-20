import * as SQLite from 'expo-sqlite';
import * as Network from 'expo-network';
import { api } from './api';

const db = SQLite.openDatabaseSync('pod_queue.db');

// Initialize the database table
export const initOfflineQueue = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS pod_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipmentId TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending'
    );
  `);
};

export const queuePOD = (shipmentId: string, payload: any) => {
  db.runSync(
    'INSERT INTO pod_queue (shipmentId, payload, status) VALUES (?, ?, ?)',
    shipmentId,
    JSON.stringify(payload),
    'pending'
  );
};

export const syncOfflinePODs = async () => {
  const netInfo = await Network.getNetworkStateAsync();
  if (!netInfo.isConnected || !netInfo.isInternetReachable) return;

  const rows = db.getAllSync('SELECT * FROM pod_queue WHERE status = ?', 'pending');
  if (rows.length === 0) return;

  for (const row of rows as any[]) {
    try {
      const payload = JSON.parse(row.payload);
      
      // Step 1: Upload document if exists
      let documentUrl = null;
      if (payload.documentUri) {
        const formData = new FormData();
        formData.append('document', {
          uri: payload.documentUri,
          name: 'scanned_doc.pdf',
          type: 'application/pdf',
        } as any);
        const docRes = await api.post(`/v1/shipments/${row.shipmentId}/pod/document`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        documentUrl = docRes.data.document_url;
      }

      // Step 2: Upload signature if exists
      let signatureUrl = null;
      if (payload.signatureBase64) {
        const sigRes = await api.post(`/v1/shipments/${row.shipmentId}/pod/signature`, {
          signature_base64: payload.signatureBase64,
          recipient_name: payload.recipientName,
        });
        signatureUrl = sigRes.data.signature_url;
      }

      // Step 3: Upload photo if exists
      let photoUrl = null;
      if (payload.photoUri) {
        const photoData = new FormData();
        photoData.append('photo', {
          uri: payload.photoUri,
          name: 'delivery_photo.jpg',
          type: 'image/jpeg',
        } as any);
        const photoRes = await api.post(`/v1/shipments/${row.shipmentId}/pod/photo`, photoData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        photoUrl = photoRes.data.photo_url;
      }

      // Step 4: Final Submit
      await api.post(`/v1/shipments/${row.shipmentId}/pod/submit`, {
        document_url: documentUrl,
        signature_url: signatureUrl,
        recipient_name: payload.recipientName,
        photo_url: photoUrl,
        lat: payload.lat,
        lng: payload.lng,
        was_offline: true,
        additional_services: payload.additional_services || [],
      });

      // Mark as done
      db.runSync('UPDATE pod_queue SET status = ? WHERE id = ?', 'completed', row.id);

    } catch (e) {
      console.error('Failed to sync POD for shipment:', row.shipmentId, e);
    }
  }
};
