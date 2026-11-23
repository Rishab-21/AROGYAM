# AROGYAM — Your Health Companion

A mobile-first health PWA for everyday care: medicine reminders, health band readings, AI guidance, and emergency help. Built with React + Vite + TypeScript + Tailwind CSS.

## Getting started

The app opens directly into a short first-time setup (name, age, conditions, goals, emergency nominee). No login or account is needed. All data is stored locally on the phone.

## Bluetooth health band

The app connects to a custom health band through Web Bluetooth.

- **Custom service UUID:** `12345678-1234-5678-1234-56789abcdef0`
- **Data characteristic UUID:** `12345678-1234-5678-1234-56789abcdef1`
- **Standard services also requested:** `heart_rate`, `blood_pressure`, `health_thermometer`, `battery_service`

### Data format

The band streams a JSON object on the data characteristic:

```json
{ "hr": 72, "sys": 120, "dia": 80, "temp": 36.6, "steps": 3400, "water": 500, "sleep": 7.2, "dist": 2.4 }
```

| Field  | Meaning                          |
|--------|----------------------------------|
| `hr`   | Heart rate (BPM)                 |
| `sys`  | Systolic blood pressure (mmHg)   |
| `dia`  | Diastolic blood pressure (mmHg)  |
| `temp` | Body temperature (°C)            |
| `steps`| Steps today                      |
| `water`| Water consumed today (ml)        |
| `sleep`| Hours slept last night           |
| `dist` | Distance travelled today (km)    |

UUIDs and parsing live in `src/config/bluetooth.ts` and `src/lib/bluetooth.ts`. Update the UUIDs there to match your hardware. A simulated band mode is available when no hardware is connected.

## AI health assistant

The AI assistant is served by the Supabase Edge Function at `supabase/functions/ai-assistant/index.ts`; the Gemini API key must remain server-side. The installed app sends requests over Wi-Fi or mobile data to the Supabase URL configured at build time. Android already has the required Internet permission. A working Internet connection alone is not enough: deploy the Edge Function and add `GEMINI_API_KEY` under **Supabase Dashboard → Project Settings → Edge Functions → Secrets**, then redeploy the function. Do not place the Gemini key in a `VITE_*` variable or in the app bundle. Deploy with `npx supabase functions deploy ai-assistant --project-ref <project-ref>` after installing/logging into the Supabase CLI. If the function or key is missing, the app now reports that setup is required instead of showing a pretend AI answer.

## PWA

The app is installable. The manifest is at `public/manifest.webmanifest` and the service worker at `public/sw.js`. The uploaded logo is used as the app icon, splash, and header brand.

## Phone steps and Android home-screen widget

The native Android app reads steps from the phone's `TYPE_STEP_COUNTER` sensor and asks for Android's Activity Recognition permission. Counts are kept on the device and reset by day. A phone without that sensor will show that step tracking is unavailable; the browser preview cannot access Android's native step sensor.

To add the widget on Android, long-press the home screen, open **Widgets**, and choose **Arogyam**. The widget shows today's phone steps and water total, and its **Add 250 ml water** button works without opening the app. The widget is an Android native feature and is not included in the web preview or the iOS target.

Blood pressure, body temperature, heart rate, and sleep are shown as unavailable until a compatible external sensor supplies real readings. The phone's step sensor does not measure these values.
# AROGYAM_2.0
