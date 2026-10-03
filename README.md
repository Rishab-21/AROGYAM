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

The AI assistant is served by a Supabase Edge Function so the API key stays secret. It uses the deployed `GEMINI_API_KEY` secret and sends only the health-related profile fields and current readings needed for a short answer. Emergency nominee phone details are not sent to Gemini. The app falls back to a friendly reply when the key is unavailable.

## PWA

The app is installable. The manifest is at `public/manifest.webmanifest` and the service worker at `public/sw.js`. The uploaded logo is used as the app icon, splash, and header brand.
