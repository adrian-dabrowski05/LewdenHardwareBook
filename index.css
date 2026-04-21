import { useState } from 'react';
import type { AppView } from '../types';

interface Props {
  view: AppView;
  onViewChange: (v: AppView) => void;
  isAdmin: boolean;
  onAdminClick: () => void;
  onSignOut: () => void;
}

export default function Header({ view, onViewChange, isAdmin, onAdminClick, onSignOut }: Props) {
  const [imgError, setImgError] = useState(false);
  const base = (import.meta as any).env.BASE_URL as string;

  return (
    <header className="header">
      <div className="header-logo">
        {!imgError ? (
          <img
            src={`${base}logo.png`}
            alt="Lewden"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="header-logo-fallback">L</div>
        )}
        <div>
          <div className="header-title">Hardware Book</div>
          <div className="header-subtitle">Lewden Internal Reference</div>
        </div>
      </div>

      <div className="header-spacer" />

      <nav className="header-nav">
        <button
          className={`header-nav-btn${view === 'search' ? ' active' : ''}`}
          onClick={() => onViewChange('search')}
        >
          🔍 Search
        </button>

        {isAdmin ? (
          <>
            <button
              className={`header-nav-btn admin-btn${view === 'admin' ? ' active' : ''}`}
              onClick={() => onViewChange('admin')}
            >
              ⚙ Admin
            </button>
            <button className="header-nav-btn" onClick={onSignOut} title="Sign out">
              ↩
            </button>
          </>
        ) : (
          <button className="header-nav-btn admin-btn" onClick={onAdminClick}>
            🔒 Admin
          </button>
        )}
      </nav>
    </header>
  );
}
