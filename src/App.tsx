import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabase';
import type { Section, Item, ToastMessage, AppView } from './types';
import Header from './components/Header';
import Toast from './components/Toast';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import ItemCard from './components/ItemCard';

export default function App() {
  const [sections, setSections] = useState<Section[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<AppView>('search');
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>(''); // '' = all
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: secData }, { data: itemData }] = await Promise.all([
      supabase.from('sections').select('*').order('sort_order'),
      supabase.from('items').select('*').order('sort_order'),
    ]);
    setSections((secData as Section[]) ?? []);
    setItems((itemData as Item[]) ?? []);
    setLoading(false);
  }, []);

  // Check auth on mount
  useEffect(() => {
    loadData();
    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(!!data.session?.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session?.user);
    });
    return () => listener.subscription.unsubscribe();
  }, [loadData]);

  function addToast(type: 'success' | 'error', message: string) {
    const id = Date.now();
    setToasts(t => [...t, { id, type, message }]);
  }

  function removeToast(id: number) {
    setToasts(t => t.filter(x => x.id !== id));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setView('search');
    addToast('success', 'Signed out.');
  }

  // Client-side search + filter
  const filtered = useMemo(() => {
    let list = items;

    if (activeSection) {
      list = list.filter(i => i.section_id === activeSection);
    }

    if (query.length >= 2) {
      const q = query.toLowerCase();
      list = list.filter(i => {
        if (i.part_number.toLowerCase().includes(q)) return true;
        if ((i.description ?? '').toLowerCase().includes(q)) return true;
        const attrs = i.attributes ?? {};
        return Object.values(attrs).some(v => String(v).toLowerCase().includes(q));
      });
    }

    return list;
  }, [items, activeSection, query]);

  // Section counts for display
  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.section_id] = (counts[item.section_id] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const sectionMap = useMemo(() => {
    const m: Record<string, Section> = {};
    for (const s of sections) m[s.id] = s;
    return m;
  }, [sections]);

  if (loading) {
    return (
      <>
        <Header view={view} onViewChange={setView} isAdmin={isAdmin}
          onAdminClick={() => setShowLogin(true)} onSignOut={handleSignOut} />
        <div className="loading-screen">
          <div className="spinner" />
          <span>Loading hardware data…</span>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        view={view}
        onViewChange={setView}
        isAdmin={isAdmin}
        onAdminClick={() => setShowLogin(true)}
        onSignOut={handleSignOut}
      />

      {view === 'admin' && isAdmin ? (
        <div className="main-content" style={{ maxWidth: '100%' }}>
          <AdminPanel
            sections={sections}
            items={items}
            onRefresh={loadData}
            onToast={addToast}
          />
        </div>
      ) : (
        <div className="app-layout">
          {/* Desktop sidebar */}
          <aside className="sidebar">
            <div className="sidebar-heading">Sections</div>
            <button
              className={`sidebar-item${!activeSection ? ' active' : ''}`}
              onClick={() => setActiveSection('')}
            >
              <span>All Sections</span>
              <span className="sidebar-item-count">{items.length}</span>
            </button>
            {sections.map(sec => (
              <button
                key={sec.id}
                className={`sidebar-item${activeSection === sec.id ? ' active' : ''}`}
                onClick={() => setActiveSection(activeSection === sec.id ? '' : sec.id)}
              >
                <span style={{ flex: 1, textAlign: 'left', lineHeight: 1.3 }}>{sec.name}</span>
                <span className="sidebar-item-count">{sectionCounts[sec.id] ?? 0}</span>
              </button>
            ))}
          </aside>

          {/* Main content */}
          <main className="main-content">
            {/* Mobile section chips */}
            <div className="section-chips">
              <button
                className={`section-chip${!activeSection ? ' active' : ''}`}
                onClick={() => setActiveSection('')}
              >
                All ({items.length})
              </button>
              {sections.map(sec => (
                <button
                  key={sec.id}
                  className={`section-chip${activeSection === sec.id ? ' active' : ''}`}
                  onClick={() => setActiveSection(activeSection === sec.id ? '' : sec.id)}
                >
                  {sec.name} ({sectionCounts[sec.id] ?? 0})
                </button>
              ))}
            </div>

            {/* Search bar */}
            <div className="search-wrap">
              <span className="search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                className="search-input"
                type="text"
                placeholder="Search by description, part number, or attribute…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {query && (
                <button className="search-clear" onClick={() => setQuery('')} title="Clear">✕</button>
              )}
            </div>

            {/* Results summary */}
            <div className="results-bar">
              <span className="results-count">
                {query.length >= 2 || activeSection ? (
                  <><strong>{filtered.length}</strong> result{filtered.length !== 1 ? 's' : ''}
                  {query.length >= 2 && <> for "<strong>{query}</strong>"</>}
                  {activeSection && <> in <strong>{sectionMap[activeSection]?.name}</strong></>}
                  </>
                ) : (
                  <><strong>{items.length}</strong> items across <strong>{sections.length}</strong> sections</>
                )}
              </span>
            </div>

            {/* Items list */}
            {filtered.length > 0 ? (
              <div className="items-list">
                {filtered.slice(0, 300).map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    section={sectionMap[item.section_id]}
                    query={query}
                    showSection={!activeSection}
                  />
                ))}
                {filtered.length > 300 && (
                  <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>
                    Showing first 300 of {filtered.length}. Refine your search to see more.
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>No results found</h3>
                <p>Try a different search term or browse a different section.</p>
              </div>
            )}
          </main>
        </div>
      )}

      {showLogin && (
        <AdminLogin
          onSuccess={() => { setShowLogin(false); addToast('success', 'Signed in as admin.'); }}
          onClose={() => setShowLogin(false)}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  );
}
