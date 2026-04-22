import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabase';
import type { Section, Item, ToastMessage, AppView } from './types';
import Header from './components/Header';
import Toast from './components/Toast';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import ItemCard from './components/ItemCard';
import SectionTable from './components/SectionTable';

export default function App() {
  const [sections, setSections] = useState<Section[]>([]);
  const [items, setItems]     = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView]               = useState<AppView>('search');
  const [query, setQuery]             = useState('');
  const [activeSection, setActiveSection] = useState<string>(''); // '' = all
  const [toasts, setToasts]           = useState<ToastMessage[]>([]);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [showLogin, setShowLogin]     = useState(false);

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

  useEffect(() => {
    loadData();
    supabase.auth.getSession().then(({ data }) => setIsAdmin(!!data.session?.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setIsAdmin(!!s?.user));
    return () => listener.subscription.unsubscribe();
  }, [loadData]);

  function addToast(type: 'success' | 'error', message: string) {
    setToasts(t => [...t, { id: Date.now(), type, message }]);
  }
  function removeToast(id: number) {
    setToasts(t => t.filter(x => x.id !== id));
  }
  async function handleSignOut() {
    await supabase.auth.signOut();
    setView('search');
    addToast('success', 'Signed out.');
  }

  // Whether we're in "searching" mode (query has 2+ chars)
  const isSearching = query.length >= 2;

  // Items filtered for the current query
  const filteredItems = useMemo(() => {
    if (!isSearching && !activeSection) return items;
    let list = activeSection ? items.filter(i => i.section_id === activeSection) : items;
    if (isSearching) {
      const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter(i => {
        const haystack = [
          i.part_number,
          i.description ?? '',
          ...Object.values(i.attributes ?? {}).map(String),
        ].join(' ').toLowerCase();
        return tokens.every(tok => haystack.includes(tok));
      });
    }
    return list;
  }, [items, activeSection, query, isSearching]);

  // Per-section filtered counts for sidebar
  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const list = isSearching
      ? filteredItems
      : items;
    for (const item of list) {
      counts[item.section_id] = (counts[item.section_id] ?? 0) + 1;
    }
    return counts;
  }, [items, filteredItems, isSearching]);

  const sectionMap = useMemo(() => {
    const m: Record<string, Section> = {};
    for (const s of sections) m[s.id] = s;
    return m;
  }, [sections]);

  // When a section is active and not searching: show all items for that section
  // When searching: show filtered results
  // When no section and not searching: show section tables
  const showMode: 'all-tables' | 'section-table' | 'search-results' =
    isSearching ? 'search-results'
    : activeSection ? 'section-table'
    : 'all-tables';

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
      <Header view={view} onViewChange={setView} isAdmin={isAdmin}
        onAdminClick={() => setShowLogin(true)} onSignOut={handleSignOut} />

      {view === 'admin' && isAdmin ? (
        <div className="main-content" style={{ maxWidth: '100%' }}>
          <AdminPanel sections={sections} items={items} onRefresh={loadData} onToast={addToast} />
        </div>
      ) : (
        <div className="app-layout">
          {/* ── Desktop sidebar ── */}
          <aside className="sidebar">
            <div className="sidebar-heading">Sections</div>
            <button
              className={`sidebar-item${!activeSection ? ' active' : ''}`}
              onClick={() => setActiveSection('')}
            >
              <span>All Sections</span>
              <span className="sidebar-item-count">
                {isSearching ? filteredItems.length : items.length}
              </span>
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

          {/* ── Main ── */}
          <main className="main-content">
            {/* Mobile chips */}
            <div className="section-chips">
              <button className={`section-chip${!activeSection ? ' active' : ''}`}
                onClick={() => setActiveSection('')}>
                All ({isSearching ? filteredItems.length : items.length})
              </button>
              {sections.map(sec => (
                <button key={sec.id}
                  className={`section-chip${activeSection === sec.id ? ' active' : ''}`}
                  onClick={() => setActiveSection(activeSection === sec.id ? '' : sec.id)}>
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
                placeholder="Search by description, part number, or any attribute…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              />
              {query && (
                <button className="search-clear" onClick={() => setQuery('')} title="Clear">✕</button>
              )}
            </div>

            {/* ── Content modes ── */}

            {showMode === 'search-results' && (
              <>
                <div className="results-bar">
                  <span className="results-count">
                    <strong>{filteredItems.length}</strong> result{filteredItems.length !== 1 ? 's' : ''} for{' '}
                    "<strong>{query}</strong>"
                    {activeSection && <> in <strong>{sectionMap[activeSection]?.name}</strong></>}
                  </span>
                </div>
                {filteredItems.length > 0 ? (
                  <div className="items-list">
                    {filteredItems.slice(0, 300).map(item => (
                      <ItemCard key={item.id} item={item}
                        section={sectionMap[item.section_id]}
                        query={query}
                        showSection={!activeSection}
                      />
                    ))}
                    {filteredItems.length > 300 && (
                      <div className="limit-note">
                        Showing 300 of {filteredItems.length} — refine your search to narrow down.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <h3>No results found</h3>
                    <p>Try a different term or clear the search to browse by section.</p>
                  </div>
                )}
              </>
            )}

            {showMode === 'section-table' && (() => {
              const sec = sectionMap[activeSection];
              if (!sec) return null;
              const secItems = items.filter(i => i.section_id === activeSection);
              return <SectionTable section={sec} items={secItems} query={query} />;
            })()}

            {showMode === 'all-tables' && (
              <div className="all-tables">
                {sections.map(sec => {
                  const secItems = items.filter(i => i.section_id === sec.id);
                  return (
                    <SectionTable key={sec.id} section={sec} items={secItems} query="" />
                  );
                })}
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
