/**
 * Native push notification scheduler using @capacitor/local-notifications.
 * These notifications fire even when the app is CLOSED, locked, or in the background.
 * On Android they appear in the notification drawer just like a real alarm app.
 * On iOS they appear as a system banner with sound.
 */

// Dynamically import so web-only builds don't break if Capacitor is absent
let LocalNotifications: typeof import('@capacitor/local-notifications').LocalNotifications | null = null;

async function getPlugin() {
  if (LocalNotifications) return LocalNotifications;
  try {
    const mod = await import('@capacitor/local-notifications');
    LocalNotifications = mod.LocalNotifications;
    return LocalNotifications;
  } catch {
    return null;
  }
}

/** Returns true when running inside a real Capacitor native container (Android / iOS) */
function isNative(): boolean {
  return typeof window !== 'undefined' &&
    !!(window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative;
}

/**
 * Request OS notification permission.
 * Must be called once after the user has interacted (e.g. tapped "Allow" in onboarding).
 */
export async function requestNativeNotificationPermission(): Promise<boolean> {
  const plugin = await getPlugin();
  if (!plugin) return false;
  try {
    const result = await plugin.requestPermissions();
    return result.display === 'granted';
  } catch {
    return false;
  }
}

/**
 * Schedule a medicine reminder as a native OS notification.
 * @param id      Unique integer ID (use medicine.id)
 * @param name    Medicine name, e.g. "Metformin"
 * @param dosage  Dosage string, e.g. "1 tablet"
 * @param food    Food instruction, e.g. "After food"
 * @param hour    0-23
 * @param minute  0-59
 */
export async function scheduleMedicineNotification(
  id: number,
  name: string,
  dosage: string,
  food: string,
  hour: number,
  minute: number,
): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;

  // Cancel any previous notification for this medicine first
  await cancelMedicineNotification(id);

  const at = new Date();
  at.setHours(hour, minute, 0, 0);
  if (at.getTime() <= Date.now()) {
    // If the time is already passed today, schedule for tomorrow
    at.setDate(at.getDate() + 1);
  }

  try {
    await plugin.schedule({
      notifications: [
        {
          id,
          title: `💊 ${name} — Time to take your medicine`,
          body: `${dosage}  ·  ${food}`,
          schedule: {
            at,
            repeats: true,          // Fires every day at this time
            allowWhileIdle: true,   // Works even when phone is idle/dozing
          },
          sound: 'default',
          smallIcon: 'ic_launcher_foreground',
          iconColor: '#2E8B57',
          extra: { medicineId: id, medicineName: name, dosage, food },
          channelId: 'medicine-reminders',
          ongoing: false,
        },
      ],
    });
  } catch (err) {
    console.warn('[Arogyam] Failed to schedule notification:', err);
  }
}

/**
 * Cancel a previously scheduled native notification for a medicine.
 */
export async function cancelMedicineNotification(id: number): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.cancel({ notifications: [{ id }] });
  } catch {
    // Ignore if notification didn't exist
  }
}

/**
 * Cancel ALL scheduled medicine notifications (call on full reset / profile delete).
 */
export async function cancelAllMedicineNotifications(): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    const pending = await plugin.getPending();
    if (pending.notifications.length > 0) {
      await plugin.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
  } catch {
    // Ignore
  }
}

/**
 * Create the Android notification channel for medicine reminders.
 * Must be called once at app startup on Android (safe to call on iOS too).
 */
export async function createMedicineNotificationChannel(): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin || !isNative()) return;
  try {
    // Only available on Android
    const p = plugin as unknown as {
      createChannel?: (ch: object) => Promise<void>;
    };
    if (typeof p.createChannel === 'function') {
      await p.createChannel({
        id: 'medicine-reminders',
        name: 'Medicine Reminders',
        description: 'Daily medicine alarm reminders from Arogyam',
        importance: 5,         // IMPORTANCE_HIGH — shows as heads-up popup
        visibility: 1,         // VISIBILITY_PUBLIC — shows on lock screen
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#2E8B57',
      });
    }
  } catch {
    // Ignore channel creation errors on non-Android
  }
}

/**
 * Listen for a notification being tapped by the user and open the app.
 * Returns a cleanup function.
 */
export async function listenForNotificationTap(
  onTap: (medicineId: number, medicineName: string) => void,
): Promise<() => void> {
  const plugin = await getPlugin();
  if (!plugin) return () => {};
  try {
    const listener = await plugin.addListener('localNotificationActionPerformed', (action) => {
      const extra = action.notification.extra as { medicineId?: number; medicineName?: string } | undefined;
      if (extra?.medicineId !== undefined) {
        onTap(extra.medicineId, extra.medicineName ?? '');
      }
    });
    return () => { listener.remove().catch(() => {}); };
  } catch {
    return () => {};
  }
}
