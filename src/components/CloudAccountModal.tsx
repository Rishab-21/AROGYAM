import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Cloud, LockKeyhole, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = { user: User; onClose: () => void; onSignOut: () => void };

export default function CloudAccountModal({ user, onClose, onSignOut }: Props) {
  const [busy, setBusy] = useState(false);
  const signOut = async () => {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (!error) onSignOut();
  };

  return <div className="modal-backdrop"><section className="modal-sheet cloud-account-modal" role="dialog" aria-modal="true" aria-labelledby="cloud-account-title">
    <div className="modal-header"><div><span className="eyebrow"><Cloud size={15} /> AROGYAM ACCOUNT</span><h2 id="cloud-account-title">Your account</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}><X /></button></div>
    <div className="cloud-user"><LockKeyhole size={18} /><span>{user.user_metadata?.phone_number || user.phone || 'Phone account'}</span></div>
    <p className="cloud-message">Your profile, medicines, and appointments are saved to your private account. Sign in with this phone number and password on another device to load your data there.</p>
    <button className="outline-button full" disabled={busy} onClick={() => void signOut()}>{busy ? 'Signing out…' : 'Sign out'}</button>
  </section></div>;
}
