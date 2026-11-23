import { supabase } from '@/lib/supabase';

export type CloudProfile = {
  name: string; age: string; gender: string; height: string; weight: string;
  conditions: string[]; food: string; steps: number; water: number;
  nominee: string; relationship: string; phone: string;
};
export type CloudMedicine = { id: number; name: string; dosage: string; time: string; food: string; paused: boolean; taken: boolean };
export type CloudAppointment = { id: number; title: string; doctor: string; location: string; date: string; time: string };
export type CloudDailyHealth = {
  date: string; heartRate: number | null; systolic: number | null; diastolic: number | null;
  temperature: number | null; steps: number; water: number; sleep: number | null; distance: number | null;
  source: 'band' | 'phone' | 'manual';
};

export async function loadCloudData(userId: string, localDate: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const [profileResult, medicineResult, appointmentResult, readingResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('medicines').select('*').eq('user_id', userId).order('local_id'),
    supabase.from('appointments').select('*').eq('user_id', userId).order('local_id'),
    supabase.from('health_readings').select('*').eq('user_id', userId).eq('local_date', localDate).maybeSingle(),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (medicineResult.error) throw medicineResult.error;
  if (appointmentResult.error) throw appointmentResult.error;
  if (readingResult.error) throw readingResult.error;
  const row = profileResult.data;
  const profile: CloudProfile | null = row ? {
    name: row.name ?? '', age: row.age == null ? '' : String(row.age), gender: row.gender ?? '',
    height: row.height_cm == null ? '' : String(row.height_cm), weight: row.weight_kg == null ? '' : String(row.weight_kg),
    conditions: row.conditions ?? [], food: row.food_preference ?? '', steps: row.daily_step_goal ?? 10000,
    water: row.daily_water_goal_ml ?? 0, nominee: row.nominee_name ?? '', relationship: row.nominee_relationship ?? '', phone: row.nominee_phone ?? '',
  } : null;
  const medicines: CloudMedicine[] = (medicineResult.data ?? []).map((item) => ({
    id: Number(item.local_id), name: item.name, dosage: item.dosage, time: String(item.reminder_time).slice(0, 5),
    food: item.food_instruction, paused: item.is_paused, taken: item.is_taken,
  }));
  const appointments: CloudAppointment[] = (appointmentResult.data ?? []).map((item) => ({
    id: Number(item.local_id), title: item.title, doctor: item.doctor, location: item.location,
    date: item.appointment_date, time: String(item.appointment_time).slice(0, 5),
  }));
  const reading = readingResult.data;
  const dailyHealth: CloudDailyHealth | null = reading ? {
    date: reading.local_date, heartRate: reading.heart_rate_bpm, systolic: reading.systolic_mmhg,
    diastolic: reading.diastolic_mmhg, temperature: reading.temperature_c, steps: reading.steps ?? 0,
    water: reading.water_ml ?? 0, sleep: reading.sleep_hours, distance: reading.distance_km,
    source: reading.source,
  } : null;
  return { profile, medicines, appointments, dailyHealth };
}

export async function saveCloudData(userId: string, profile: CloudProfile, medicines: CloudMedicine[], appointments: CloudAppointment[], dailyHealth?: CloudDailyHealth) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const now = new Date().toISOString();
  const profileResult = await supabase.from('profiles').upsert({
    id: userId, name: profile.name, age: profile.age ? Number(profile.age) : null,
    gender: profile.gender || null, height_cm: profile.height ? Number(profile.height) : null,
    weight_kg: profile.weight ? Number(profile.weight) : null, conditions: profile.conditions,
    food_preference: profile.food || null, daily_step_goal: profile.steps || 10000,
    daily_water_goal_ml: profile.water || 0, nominee_name: profile.nominee,
    nominee_relationship: profile.relationship, nominee_phone: profile.phone, updated_at: now,
  });
  if (profileResult.error) throw profileResult.error;
  const medicineRows = medicines.map((item) => ({
    user_id: userId, local_id: item.id, name: item.name, dosage: item.dosage,
    reminder_time: item.time, food_instruction: item.food, is_paused: item.paused,
    is_taken: item.taken, updated_at: now,
  }));
  if (medicineRows.length) {
    const result = await supabase.from('medicines').upsert(medicineRows, { onConflict: 'user_id,local_id' });
    if (result.error) throw result.error;
  }
  const appointmentRows = appointments.map((item) => ({
    user_id: userId, local_id: item.id, title: item.title, doctor: item.doctor,
    location: item.location, appointment_date: item.date, appointment_time: item.time, updated_at: now,
  }));
  if (appointmentRows.length) {
    const result = await supabase.from('appointments').upsert(appointmentRows, { onConflict: 'user_id,local_id' });
    if (result.error) throw result.error;
  }
  if (dailyHealth) {
    const result = await supabase.from('health_readings').upsert({
      user_id: userId, local_date: dailyHealth.date, recorded_at: now,
      heart_rate_bpm: dailyHealth.heartRate, systolic_mmhg: dailyHealth.systolic,
      diastolic_mmhg: dailyHealth.diastolic, temperature_c: dailyHealth.temperature,
      steps: dailyHealth.steps, water_ml: dailyHealth.water, sleep_hours: dailyHealth.sleep,
      distance_km: dailyHealth.distance, source: dailyHealth.source,
    }, { onConflict: 'user_id,local_date' });
    if (result.error) throw result.error;
  }
}

export async function deleteCloudRecord(table: 'medicines' | 'appointments', userId: string, localId: number) {
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq('user_id', userId).eq('local_id', localId);
  if (error) throw error;
}
