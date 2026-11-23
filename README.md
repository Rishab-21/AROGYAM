# AROGYAM — Your Health Companion

A mobile-first health PWA for everyday care: medicine reminders, health band readings, AI guidance, and emergency help. Built with React + Vite + TypeScript + Tailwind CSS.

## Getting started

Every launch shows an animated Arogyam logo, then the account screen. Users create an account or log in with a selected-country phone number and password. A Supabase Edge Function creates a confirmed account using a private deterministic email alias internally, while storing the phone number in account metadata; the user enters no email and receives no SMS. Signup asks for the password twice, and password fields block copy and paste actions. Deploy `phone-account` with `npx supabase functions deploy phone-account --project-ref pdbbgjpdxrgdfbngphro`.

Profile, medicines, appointments, and a per-day snapshot of activity and available vitals sync to the signed-in user's Supabase account. Existing data on a device is never uploaded to a different account without a merge choice. When signing in on another device, choose the account's saved data to load it. Row Level Security limits each account to its own database rows; this stores one current-day snapshot, not a continuous sensor history.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the app's build environment. The publishable key is designed for client apps; never use a Supabase secret or service-role key in a `VITE_*` variable. For local development, put the two values in `.env`.

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

The AI assistant is served by the Supabase Edge Function at `supabase/functions/ai-assistant/index.ts`; Gemini API keys must remain server-side. The installed app sends requests over Wi-Fi or mobile data to the Supabase URL configured at build time. Android already has the required Internet permission. A root `.env` value is for local app development and does **not** automatically become a deployed Edge Function secret. In **Supabase Dashboard → Project Settings → Edge Functions → Secrets**, add `GEMINI_API_KEY` and deploy the function. Do not put a Gemini key in a `VITE_*` variable or the app bundle. Deploy with `npx supabase functions deploy ai-assistant --project-ref <project-ref>` after installing and logging into the Supabase CLI. A missing function returns 404; a missing server secret returns `AI_NOT_CONFIGURED`.

For key fallback, add `GEMINI_API_KEYS` as a comma- or newline-separated list of backup Gemini keys in the same Supabase secrets page. The function tries configured keys and supported models when a request fails. This can help if one key is invalid or has its own exhausted quota, but it cannot guarantee uninterrupted service: keys that share the same Google Cloud project may share quotas, and outages, billing limits, or exhausted backup quotas still stop requests. Keep backup keys in server-side secrets only.

## PWA

The app is installable. The manifest is at `public/manifest.webmanifest` and the service worker at `public/sw.js`. The uploaded logo is used as the app icon, splash, and header brand.

## Phone steps and Android home-screen widget

The native Android app reads steps from the phone's `TYPE_STEP_COUNTER` sensor and asks for Android's Activity Recognition permission. Counts are kept on the device and reset by day. A phone without that sensor will show that step tracking is unavailable; the browser preview cannot access Android's native step sensor.

To add the widget on Android, long-press the home screen, open **Widgets**, and choose **Arogyam**. The widget shows today's phone steps and water total, and its **Add 250 ml water** button works without opening the app. The widget is an Android native feature and is not included in the web preview or the iOS target.

Blood pressure, body temperature, heart rate, and sleep are shown as unavailable until a compatible external sensor supplies real readings. The phone's step sensor does not measure these values.
# AROGYAM_2.0
