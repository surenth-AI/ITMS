// Web build: the SQLite offline queue is native-only (expo-sqlite on web needs
// extra wasm and header setup). On web, PODs are always sent online.
export const initOfflineQueue = () => {};

export const queuePOD = (_shipmentId: string, _payload: unknown) => {
  throw new Error('Offline POD queue is not available on web');
};

export const syncOfflinePODs = async () => {};
