import { Language, ui } from '@/i18n';

let audioContext: AudioContext | null = null;
let soundTimer: number | null = null;
let speechTimer: number | null = null;
let isRinging = false;
let fallbackAudio: HTMLAudioElement | null = null;

function createChimeWavBlob(): Blob {
  const sampleRate = 22050;
  const duration = 1.0;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // 4 pleasant medical chime notes: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
  const notes = [
    { freq: 523.25, start: 0.0, end: 0.35 },
    { freq: 659.25, start: 0.18, end: 0.55 },
    { freq: 783.99, start: 0.36, end: 0.75 },
    { freq: 1046.5, start: 0.54, end: 0.98 },
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    for (const note of notes) {
      if (t >= note.start && t < note.end) {
        const localT = t - note.start;
        const envelope = Math.exp(-localT * 6);
        sample += Math.sin(2 * Math.PI * note.freq * localT) * envelope * 0.45;
      }
    }
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function playFallbackAudio(): void {
  try {
    if (typeof window === 'undefined') return;
    if (!fallbackAudio) {
      const blob = createChimeWavBlob();
      const url = URL.createObjectURL(blob);
      fallbackAudio = new Audio(url);
    }
    fallbackAudio.currentTime = 0;
    fallbackAudio.volume = 1.0;
    const playPromise = fallbackAudio.play();
    if (playPromise) {
      playPromise.catch(() => {});
    }
  } catch {
    // Ignore audio playback errors
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioCtx();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  } catch {
    return null;
  }
}

// Automatically unlock audio and warm up fallback player on first user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    try {
      if (!fallbackAudio) {
        const blob = createChimeWavBlob();
        const url = URL.createObjectURL(blob);
        fallbackAudio = new Audio(url);
        fallbackAudio.load();
      }
    } catch {
      // Ignore
    }
  };
  ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach((eventName) => {
    window.addEventListener(eventName, unlockAudio, { once: true, passive: true });
  });
}

export function playChimePattern(): void {
  // Play HTML5 Audio fallback (especially reliable on Android WebView)
  playFallbackAudio();

  const ctx = getAudioContext();
  if (!ctx) return;

  const runSchedule = () => {
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 pleasant medical chime
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.18);

        gain.gain.setValueAtTime(0.001, now + index * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.35, now + index * 0.18 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.18 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.18);
        osc.stop(now + index * 0.18 + 0.36);
      });
    } catch {
      // Ignore scheduling errors
    }
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(() => runSchedule()).catch(() => {});
  } else {
    runSchedule();
  }
}

export function startAlarmSound(): void {
  if (isRinging) return;
  isRinging = true;

  playChimePattern();
  if (typeof window !== 'undefined') {
    soundTimer = window.setInterval(() => {
      if (isRinging) {
        playChimePattern();
      }
    }, 1600);
  }
}

export function stopAlarmSound(): void {
  isRinging = false;
  if (soundTimer !== null) {
    clearInterval(soundTimer);
    soundTimer = null;
  }
  if (speechTimer !== null) {
    clearInterval(speechTimer);
    speechTimer = null;
  }
  if (fallbackAudio) {
    try {
      fallbackAudio.pause();
      fallbackAudio.currentTime = 0;
    } catch {
      // Ignore
    }
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

export function speakMedicineAnnouncement(name: string, dosage: string, food: string, language: Language): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const announce = () => {
    if (!isRinging) return;
    try {
      window.speechSynthesis.cancel();

      const text = language === 'hi'
        ? `दवाई लेने का समय हो गया है। कृपया ${name} लें, मात्रा: ${dosage}, ${ui('hi', food)}।`
        : `Time to take your medicine. Please take ${name}, ${dosage}, ${food}.`;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech errors
    }
  };

  announce();
  if (speechTimer !== null) clearInterval(speechTimer);
  speechTimer = window.setInterval(announce, 9000);
}

export function triggerVibration(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([500, 200, 500, 200, 500]);
    } catch {
      // Ignore vibration errors if blocked by platform
    }
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  try {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    // Strict 500ms timeout race so Android WebView never hangs indefinitely
    const requestPromise = Promise.resolve(Notification.requestPermission());
    const timeoutPromise = new Promise<string>((resolve) => setTimeout(() => resolve('denied'), 500));
    const res = await Promise.race([requestPromise, timeoutPromise]);
    return res === 'granted';
  } catch {
    return false;
  }
}

export function triggerSystemNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  try {
    if (typeof Notification.permission === 'string' && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/IMG_1169.jpg',
        badge: '/IMG_1169.jpg',
        tag: 'medicine-alarm',
      });
    }
  } catch {
    // Ignore notification errors
  }
}
