import { Capacitor, registerPlugin } from '@capacitor/core';

type StepReading = { steps: number; water?: number; available: boolean };
type PhoneHealthPlugin = {
  start(): Promise<StepReading>;
  addListener(eventName: 'steps' | 'water', listener: (reading: StepReading) => void): Promise<{ remove: () => void }>;
  updateWidget(data: { steps: number; water: number; stepGoal: number; waterGoal: number }): Promise<void>;
};

const PhoneHealth = registerPlugin<PhoneHealthPlugin>('PhoneHealth');

export const isNativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
export async function startPhoneStepTracking(): Promise<StepReading> {
  if (!isNativeAndroid()) return { steps: 0, available: false };
  return PhoneHealth.start();
}
export async function listenForPhoneSteps(listener: (reading: StepReading) => void) {
  if (!isNativeAndroid()) return { remove: () => undefined };
  return PhoneHealth.addListener('steps', listener);
}
export async function listenForPhoneWater(listener: (reading: StepReading) => void) {
  if (!isNativeAndroid()) return { remove: () => undefined };
  return PhoneHealth.addListener('water', listener);
}
export async function updatePhoneWidget(data: { steps: number; water: number; stepGoal: number; waterGoal: number }) {
  if (isNativeAndroid()) await PhoneHealth.updateWidget(data);
}
