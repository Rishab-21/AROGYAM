import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = { user: User | null; onContinue: () => void; onUseAnotherAccount: () => void };
type Mode = 'sign-in' | 'sign-up';
type Country = { iso: string; name: string; dial: string };

const COUNTRIES: Country[] = [
  { iso: 'IN', name: 'India', dial: '+91' }, { iso: 'NP', name: 'Nepal', dial: '+977' },
  { iso: 'US', name: 'United States', dial: '+1' }, { iso: 'CA', name: 'Canada', dial: '+1' },
  { iso: 'GB', name: 'United Kingdom', dial: '+44' }, { iso: 'AU', name: 'Australia', dial: '+61' },
  { iso: 'NZ', name: 'New Zealand', dial: '+64' }, { iso: 'AE', name: 'United Arab Emirates', dial: '+971' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '+966' }, { iso: 'QA', name: 'Qatar', dial: '+974' },
  { iso: 'BD', name: 'Bangladesh', dial: '+880' }, { iso: 'PK', name: 'Pakistan', dial: '+92' },
  { iso: 'LK', name: 'Sri Lanka', dial: '+94' }, { iso: 'BT', name: 'Bhutan', dial: '+975' },
  { iso: 'SG', name: 'Singapore', dial: '+65' }, { iso: 'MY', name: 'Malaysia', dial: '+60' },
  { iso: 'ID', name: 'Indonesia', dial: '+62' }, { iso: 'PH', name: 'Philippines', dial: '+63' },
  { iso: 'TH', name: 'Thailand', dial: '+66' }, { iso: 'VN', name: 'Vietnam', dial: '+84' },
  { iso: 'CN', name: 'China', dial: '+86' }, { iso: 'JP', name: 'Japan', dial: '+81' },
  { iso: 'KR', name: 'South Korea', dial: '+82' }, { iso: 'HK', name: 'Hong Kong', dial: '+852' },
  { iso: 'DE', name: 'Germany', dial: '+49' }, { iso: 'FR', name: 'France', dial: '+33' },
  { iso: 'IT', name: 'Italy', dial: '+39' }, { iso: 'ES', name: 'Spain', dial: '+34' },
  { iso: 'PT', name: 'Portugal', dial: '+351' }, { iso: 'NL', name: 'Netherlands', dial: '+31' },
  { iso: 'BE', name: 'Belgium', dial: '+32' }, { iso: 'CH', name: 'Switzerland', dial: '+41' },
  { iso: 'AT', name: 'Austria', dial: '+43' }, { iso: 'SE', name: 'Sweden', dial: '+46' },
  { iso: 'NO', name: 'Norway', dial: '+47' }, { iso: 'DK', name: 'Denmark', dial: '+45' },
  { iso: 'FI', name: 'Finland', dial: '+358' }, { iso: 'IE', name: 'Ireland', dial: '+353' },
  { iso: 'PL', name: 'Poland', dial: '+48' }, { iso: 'GR', name: 'Greece', dial: '+30' },
  { iso: 'TR', name: 'Turkey', dial: '+90' }, { iso: 'IL', name: 'Israel', dial: '+972' },
  { iso: 'ZA', name: 'South Africa', dial: '+27' }, { iso: 'NG', name: 'Nigeria', dial: '+234' },
  { iso: 'KE', name: 'Kenya', dial: '+254' }, { iso: 'EG', name: 'Egypt', dial: '+20' },
  { iso: 'BR', name: 'Brazil', dial: '+55' }, { iso: 'MX', name: 'Mexico', dial: '+52' },
  { iso: 'AR', name: 'Argentina', dial: '+54' }, { iso: 'CL', name: 'Chile', dial: '+56' },
  { iso: 'CO', name: 'Colombia', dial: '+57' }, { iso: 'RU', name: 'Russia', dial: '+7' },
  { iso: 'UA', name: 'Ukraine', dial: '+380' }, { iso: 'CZ', name: 'Czechia', dial: '+420' },
  { iso: 'RO', name: 'Romania', dial: '+40' }, { iso: 'HU', name: 'Hungary', dial: '+36' },
  { iso: 'IS', name: 'Iceland', dial: '+354' }, { iso: 'AF', name: 'Afghanistan', dial: '+93' },
];

function flagFor(iso: string) { return String.fromCodePoint(...[...iso].map((char) => char.charCodeAt(0) + 127397)); }

function normalizePhone(value: string, country: Country): string {
  let digits = value.replace(/\D/g, '');
  if (country.iso !== 'IT') digits = digits.replace(/^0+/, '');
  const full = `${country.dial}${digits}`;
  if (digits.length < 6 || digits.length > 14 || !/^\+[1-9]\d{7,14}$/.test(full)) {
    throw new Error(`Enter a valid ${country.name} phone number without the country code.`);
  }
  return full;
}

function loginEmailForPhone(phone: string) {
  return `phone-${phone.replace(/\D/g, '')}@account.arogyam.invalid`;
}

function preventClipboard(event: React.ClipboardEvent<HTMLInputElement>) { event.preventDefault(); }
function preventContextMenu(event: React.MouseEvent<HTMLInputElement>) { event.preventDefault(); }

export default function PhoneAuthScreen({ user, onContinue, onUseAnotherAccount }: Props) {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [phone, setPhone] = useState('');
  const [countryIso, setCountryIso] = useState('IN');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const blockPasswordClipboard = (event: React.ClipboardEvent<HTMLInputElement>) => preventClipboard(event);
  const blockPasswordShortcuts = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const key = event.key.toLowerCase();
    if (((event.metaKey || event.ctrlKey) && ['c', 'v', 'x'].includes(key)) || (event.shiftKey && key === 'insert')) event.preventDefault();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (!supabase) { setMessage('This app build is missing its Supabase project settings.'); return; }
    if (mode === 'sign-up' && password !== confirmPassword) { setMessage('The passwords do not match.'); return; }
    if (password.length < 8) { setMessage('Use a password with at least 8 characters.'); return; }
    setBusy(true);
    try {
      const country = COUNTRIES.find((item) => item.iso === countryIso) ?? COUNTRIES[0];
      const normalizedPhone = normalizePhone(phone, country);
      const loginEmail = loginEmailForPhone(normalizedPhone);
      if (mode === 'sign-up') {
        const { data, error } = await supabase.functions.invoke<{ ok: boolean; error?: string }>('phone-account', {
          body: { phone: normalizedPhone, password },
        });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || 'Could not create your account.');
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (signInError) throw signInError;
        setMessage('Account created. Opening your private health space…');
        onContinue();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw error;
        setMessage('Signed in. Loading your saved data…');
        onContinue();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not complete sign-in. Please check your details and try again.');
    } finally { setBusy(false); }
  };

  if (user) return <main className="auth-page"><section className="auth-card auth-card-continue">
    <img className="auth-logo" src="/IMG_1169.jpg" alt="Arogyam" />
    <span className="auth-kicker"><LockKeyhole size={15} /> YOUR PRIVATE HEALTH SPACE</span>
    <h1>Welcome back</h1><p className="auth-subtitle">Continue to your Arogyam account.</p>
    <div className="auth-phone-badge"><Phone size={18} /> {user.user_metadata?.phone_number || user.phone || 'Phone account'}</div>
    <button className="primary-button full auth-submit" onClick={onContinue}>Continue securely <ArrowRight size={19} /></button>
    <button className="text-button" onClick={onUseAnotherAccount}>Use another account</button>
  </section></main>;

  return <main className="auth-page"><section className="auth-card">
    <img className="auth-logo" src="/IMG_1169.jpg" alt="Arogyam" />
    <span className="auth-kicker"><LockKeyhole size={15} /> YOUR PRIVATE HEALTH SPACE</span>
    <h1>{mode === 'sign-in' ? 'Welcome to Arogyam' : 'Create your account'}</h1>
    <p className="auth-subtitle">{mode === 'sign-in' ? 'Sign in to see your health information on this device.' : 'Your account keeps your information available on your other devices.'}</p>
    <div className="auth-tabs" role="tablist" aria-label="Account access">
      <button type="button" role="tab" aria-selected={mode === 'sign-in'} className={mode === 'sign-in' ? 'active' : ''} onClick={() => { setMode('sign-in'); setMessage(''); }}>Log in</button>
      <button type="button" role="tab" aria-selected={mode === 'sign-up'} className={mode === 'sign-up' ? 'active' : ''} onClick={() => { setMode('sign-up'); setMessage(''); }}>Create account</button>
    </div>
    <form className="auth-form" onSubmit={(event) => void submit(event)}>
      <label className="auth-label">Phone number
        <span className="auth-phone-entry">
          <span className="auth-country-picker"><span aria-hidden="true">{flagFor(countryIso)}</span><select aria-label="Country" value={countryIso} onChange={(event) => setCountryIso(event.target.value)}>{COUNTRIES.map((country) => <option value={country.iso} key={country.iso}>{country.name} ({country.dial})</option>)}</select><strong>{COUNTRIES.find((country) => country.iso === countryIso)?.dial}</strong></span>
          <input className="auth-phone-number" type="tel" autoComplete="tel-national" inputMode="numeric" required value={phone} onChange={(event) => setPhone(event.target.value.replace(/[^\d\s()-]/g, ''))} placeholder="98765 43210" aria-label="Phone number without country code" />
        </span>
      </label>
      <label className="auth-label">Password
        <span className="auth-input-wrap"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} onCopy={blockPasswordClipboard} onCut={blockPasswordClipboard} onPaste={blockPasswordClipboard} onContextMenu={preventContextMenu} onKeyDown={blockPasswordShortcuts} spellCheck={false} /></span>
      </label>
      {mode === 'sign-up' && <label className="auth-label">Confirm password
        <span className="auth-input-wrap"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} onCopy={blockPasswordClipboard} onCut={blockPasswordClipboard} onPaste={blockPasswordClipboard} onContextMenu={preventContextMenu} onKeyDown={blockPasswordShortcuts} spellCheck={false} /></span>
      </label>}
      <button type="button" className="auth-show-password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}{showPassword ? 'Hide password' : 'Show password'}</button>
      <p className="auth-hint">Use at least 8 characters. Copy and paste are disabled in password fields.</p>
      <button className="primary-button full auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'sign-in' ? 'Log in securely' : 'Create account'}<ArrowRight size={19} /></button>
    </form>
    {message && <p className={`auth-message ${message.includes('created, but') ? 'auth-warning' : ''}`} role="status">{message}</p>}
    <p className="auth-privacy">Your health profile, medicines, and appointments are saved in your private Supabase account.</p>
  </section></main>;
}
