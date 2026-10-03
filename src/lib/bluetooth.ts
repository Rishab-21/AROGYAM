import { AROGYAM_SERVICE_UUID, AROGYAM_DATA_CHAR_UUID, BandReading } from '@/config/bluetooth';

interface BluetoothCharacteristic {
  addEventListener(type: string, listener: (event: Event) => void): void;
  startNotifications(): Promise<void>;
}

interface BluetoothService {
  getCharacteristic(characteristic: string): Promise<BluetoothCharacteristic>;
}

interface BluetoothGatt {
  connect(): Promise<BluetoothGatt>;
  getPrimaryService(service: string): Promise<BluetoothService>;
  connected: boolean;
  disconnect(): void;
}

interface BluetoothDevice {
  gatt: BluetoothGatt;
}

interface BluetoothNavigator {
  bluetooth: {
    requestDevice(options: unknown): Promise<BluetoothDevice>;
  };
}

/**
 * Connect to the Arogyam health band via Web Bluetooth.
 * Returns a function to disconnect, or null if unsupported.
 */
export async function connectBand(onReading: (reading: BandReading) => void): Promise<(() => void) | null> {
  if (!('bluetooth' in navigator)) return null;
  try {
    const nav = navigator as unknown as BluetoothNavigator;
    const device = await nav.bluetooth.requestDevice({
      filters: [{ services: [AROGYAM_SERVICE_UUID] }],
      optionalServices: ['heart_rate', 'blood_pressure', 'health_thermometer', 'battery_service'],
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(AROGYAM_SERVICE_UUID);
    const characteristic = await service.getCharacteristic(AROGYAM_DATA_CHAR_UUID);
    characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as unknown as { value: { buffer: ArrayBuffer } };
      const decoder = new TextDecoder();
      const json = decoder.decode(target.value.buffer);
      try { onReading(JSON.parse(json) as BandReading); } catch { /* ignore malformed frame */ }
    });
    await characteristic.startNotifications();
    return () => { if (device.gatt.connected) device.gatt.disconnect(); };
  } catch {
    return null;
  }
}

/** Generate a realistic simulated reading every 3 seconds for demo mode. */
export function simulatedReading(): BandReading {
  return {
    hr: 68 + Math.floor(Math.random() * 13),
    sys: 118 + Math.floor(Math.random() * 8),
    dia: 78 + Math.floor(Math.random() * 6),
    temp: Number((36.4 + Math.random() * 0.4).toFixed(1)),
    steps: 3200 + Math.floor(Math.random() * 600),
    water: 400 + Math.floor(Math.random() * 200),
    sleep: Number((6.8 + Math.random() * 0.8).toFixed(1)),
    dist: Number((2.2 + Math.random() * 0.5).toFixed(1)),
  };
}
