/** Custom BLE service UUID used by the Arogyam health band. Match this to your hardware firmware. */
export const AROGYAM_SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';

/** Characteristic inside the custom service that streams the JSON vitals payload. */
export const AROGYAM_DATA_CHAR_UUID = '12345678-1234-5678-1234-56789abcdef1';

/** Standard GATT services requested alongside the custom one. */
export const OPTIONAL_SERVICES = [
  'heart_rate',
  'blood_pressure',
  'health_thermometer',
  'battery_service',
  AROGYAM_SERVICE_UUID,
];

/** Expected JSON shape emitted by the band on the data characteristic. */
export interface BandReading {
  hr: number;   // heart rate (BPM)
  sys: number;  // systolic blood pressure (mmHg)
  dia: number;  // diastolic blood pressure (mmHg)
  temp: number; // body temperature (°C)
  steps: number;
  water: number; // millilitres consumed today
  sleep: number; // hours slept last night
  dist: number;  // distance travelled today (km)
}

/** Thresholds that trigger an emergency check. Adjust to your needs. */
export const EMERGENCY_THRESHOLDS = {
  hrHigh: 130, hrLow: 45,
  sysHigh: 180, sysLow: 90,
  tempHigh: 39, tempLow: 35,
};
