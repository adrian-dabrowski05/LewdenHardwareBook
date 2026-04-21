import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

export default function AdminLogin({ onSuccess, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError('Invalid email or password.');
    } else {
      onSuccess();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Admin Login</h2>
        <p className="modal-subtitle">Sign in to manage sections and items.</p>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div style={{ marginTop: 20 }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
