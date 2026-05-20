import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Section, Item, ItemStatus } from '../types';

interface Props {
  sections: Section[];
  items: Item[];
  onRefresh: () => void;
  onToast: (type: 'success' | 'error', message: string) => void;
}

type AdminTab = 'items' | 'sections';

const STATUSES: { value: ItemStatus; label: string }[] = [
  { value: 'active',      label: 'Active'      },
  { value: 'obsolete',    label: 'Obsolete'    },
  { value: 'no_location', label: 'No Location' },
];

export default function AdminPanel({ sections, items, onRefresh, onToast }: Props) {
  const [tab, setTab] = useState<AdminTab>('items');

  // ── Items state ──────────────────────────────────────────────
  const [searchQ,       setSearchQ]       = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [showAddItem,   setShowAddItem]   = useState(false);

  const [newPN,        setNewPN]        = useState('');
  const [newDesc,      setNewDesc]      = useState('');
  const [newSectionId, setNewSectionId] = useState('');
  const [newStatus,    setNewStatus]    = useState<ItemStatus>('active');
  const [newAttrVals,  setNewAttrVals]  = useState<Record<string, string>>({});
  const [savingItem,   setSavingItem]   = useState(false);

  const [editItemId,    setEditItemId]    = useState<string | null>(null);
  const [editPN,        setEditPN]        = useState('');
  const [editDesc,      setEditDesc]      = useState('');
  const [editStatus,    setEditStatus]    = useState<ItemStatus>('active');
  const [editSectionId, setEditSectionId] = useState('');
  const [editAttrVals,  setEditAttrVals]  = useState<Record<string, string>>({});

  // ── Sections state ───────────────────────────────────────────
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSecName,     setNewSecName]     = useState('');
  const [savingSec,      setSavingSec]      = useState(false);
  const [editSecId,      setEditSecId]      = useState<string | null>(null);
  const [editSecName,    setEditSecName]    = useState('');
  const [editSecCols,    setEditSecCols]    = useState<string[]>([]);
  const [savingSecEdit,  setSavingSecEdit]  = useState(false);

  // ── Helpers ───────────────────────────────────────────────────
  function sectionById(id: string) { return sections.find(s => s.id === id); }

  function handleNewSectionChange(id: string) {
    setNewSectionId(id);
    const cols = sectionById(id)?.columns ?? [];
    const blank: Record<string, string> = {};
    cols.slice(1).forEach(c => { blank[c] = ''; });
    setNewAttrVals(blank);
    setNewDesc('');
  }

  function startEditItem(item: Item) {
    const sec  = sectionById(item.section_id);
    const cols = sec?.columns ?? [];
    const vals: Record<string, string> = {};
    cols.slice(1).forEach(c => { vals[c] = String(item.attributes?.[c] ?? ''); });
    setEditItemId(item.id);
    setEditPN(item.part_number);
    setEditDesc(item.description ?? '');
    setEditStatus(item.status);
    setEditSectionId(item.section_id);
    setEditAttrVals(vals);
  }

  function startEditSection(sec: Section) {
    setEditSecId(sec.id);
    setEditSecName(sec.name);
    setEditSecCols([...sec.columns]);
  }

  // ── Item CRUD ─────────────────────────────────────────────────
  async function handleAddItem() {
    if (!newPN.trim() || !newSectionId) return;
    setSavingItem(true);
    const attrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(newAttrVals)) {
      if (v.trim()) attrs[k] = v.trim();
    }
    const { error } = await supabase.from('items').insert({
      part_number: newPN.trim(),
      description: newDesc.trim() || null,
      section_id:  newSectionId,
      status:      newStatus,
      attributes:  attrs,
    });
    setSavingItem(false);
    if (error) { onToast('error', 'Failed to add item.'); return; }
    onToast('success', 'Item added.');
    setNewPN(''); setNewDesc(''); setNewSectionId('');
    setNewStatus('active'); setNewAttrVals({});
    setShowAddItem(false);
    onRefresh();
  }

  async function handleSaveItem() {
    if (!editItemId) return;
    const attrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(editAttrVals)) {
      if (v.trim()) attrs[k] = v.trim();
    }
    const { error } = await supabase.from('items').update({
      part_number: editPN.trim(),
      description: editDesc.trim() || null,
      status:      editStatus,
      section_id:  editSectionId,
      attributes:  attrs,
    }).eq('id', editItemId);
    if (error) { onToast('error', 'Failed to save.'); return; }
    onToast('success', 'Item updated.');
    setEditItemId(null);
    onRefresh();
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('Delete this item?')) return;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) { onToast('error', 'Failed to delete.'); return; }
    onToast('success', 'Item deleted.');
    onRefresh();
  }

  // ── Section CRUD ──────────────────────────────────────────────
  async function handleAddSection() {
    if (!newSecName.trim()) return;
    setSavingSec(true);
    const slug = newSecName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const maxOrder = sections.reduce((m, s) => Math.max(m, s.sort_order), 0);
    const { error } = await supabase.from('sections').insert({
      name: newSecName.trim(), slug, sort_order: maxOrder + 1, columns: [],
    });
    setSavingSec(false);
    if (error) { onToast('error', 'Failed to add section.'); return; }
    onToast('success', 'Section added.');
    setNewSecName(''); setShowAddSection(false);
    onRefresh();
  }

  async function handleSaveSection() {
    if (!editSecId) return;
    setSavingSecEdit(true);
    const cleanCols = editSecCols.map(c => c.trim()).filter(Boolean);
    const { error } = await supabase.from('sections').update({
      name:    editSecName.trim(),
      columns: cleanCols,
    }).eq('id', editSecId);
    setSavingSecEdit(false);
    if (error) { onToast('error', 'Failed to save section.'); return; }
    onToast('success', 'Section saved.');
    setEditSecId(null);
    onRefresh();
  }

  async function handleDeleteSection(id: string) {
    const count = items.filter(i => i.section_id === id).length;
    if (!confirm(`Delete this section and all ${count} items in it?`)) return;
    const { error } = await supabase.from('sections').delete().eq('id', id);
    if (error) { onToast('error', 'Failed to delete section.'); return; }
    onToast('success', 'Section deleted.');
    onRefresh();
  }

  // ── Filtered items ────────────────────────────────────────────
  const filteredItems = items.filter(it => {
    if (filterSection && it.section_id !== filterSection) return false;
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (
      it.part_number.toLowerCase().includes(q) ||
      (it.description ?? '').toLowerCase().includes(q)
    );
  });

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <h2>Admin Panel</h2>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {items.length} items · {sections.length} sections
        </span>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab${tab === 'items' ? ' active' : ''}`} onClick={() => setTab('items')}>
          Items ({items.length})
        </button>
        <button className={`admin-tab${tab === 'sections' ? ' active' : ''}`} onClick={() => setTab('sections')}>
          Sections &amp; Columns ({sections.length})
        </button>
      </div>

      {/* ════════ ITEMS TAB ════════ */}
      {tab === 'items' && (
        <>
          {showAddItem && (
            <div className="add-form">
              <h3>Add New Item</h3>
              <div className="form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Part Number *</label>
                  <input className="form-input" value={newPN}
                    onChange={e => setNewPN(e.target.value)} placeholder="e.g. L100-0999" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Section *</label>
                  <select className="form-select" value={newSectionId}
                    onChange={e => handleNewSectionChange(e.target.value)}>
                    <option value="">— select —</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Status</label>
                  <select className="form-select" value={newStatus}
                    onChange={e => setNewStatus(e.target.value as ItemStatus)}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {!newSectionId && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0' }}>
                  Select a section to see its attribute fields.
                </p>
              )}

              {newSectionId && (() => {
                const sec  = sectionById(newSectionId)!;
                const cols = sec.columns;
                return (
                  <div className="attr-fields-grid" style={{ marginTop: 12 }}>
                    {/* First col = description */}
                    {cols[0] && (
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">{cols[0]}</label>
                        <input className="form-input" value={newDesc}
                          onChange={e => setNewDesc(e.target.value)}
                          placeholder={`Enter ${cols[0].toLowerCase()}…`} />
                      </div>
                    )}
                    {/* Rest = attributes */}
                    {cols.slice(1).map(col => (
                      <div className="form-group" key={col} style={{ margin: 0 }}>
                        <label className="form-label">{col}</label>
                        <input className="form-input" value={newAttrVals[col] ?? ''}
                          onChange={e => setNewAttrVals(v => ({ ...v, [col]: e.target.value }))}
                          placeholder={`Enter ${col.toLowerCase()}…`} />
                      </div>
                    ))}
                    {cols.length === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', gridColumn: '1/-1' }}>
                        This section has no columns defined. Go to Sections &amp; Columns to add them.
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setShowAddItem(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ width: 'auto', padding: '0 20px' }}
                  onClick={handleAddItem} disabled={savingItem || !newPN.trim() || !newSectionId}>
                  {savingItem ? 'Saving…' : 'Add Item'}
                </button>
              </div>
            </div>
          )}

          {!showAddItem && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <input className="form-input" style={{ flex: '1 1 200px', height: 38 }}
                placeholder="Search items…" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
              <select className="form-select" style={{ flex: '1 1 180px', height: 38 }}
                value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                <option value="">All sections</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '0 16px', height: 38 }}
                onClick={() => setShowAddItem(true)}>
                + Add Item
              </button>
            </div>
          )}

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Description</th>
                  <th>Section</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.slice(0, 200).map(item => {
                  const sec    = sectionById(item.section_id);
                  const isEdit = editItemId === item.id;
                  return (
                    <tr key={item.id}>
                      {isEdit ? (
                        <>
                          <td>
                            <input className="form-input" style={{ height: 32, fontSize: 12 }}
                              value={editPN} onChange={e => setEditPN(e.target.value)} />
                          </td>
                          <td colSpan={2}>
                            <div className="attr-fields-grid" style={{ '--cols': '2' } as React.CSSProperties}>
                              {sec?.columns[0] && (
                                <div key="__desc">
                                  <div className="inline-field-label">{sec.columns[0]}</div>
                                  <input className="form-input" style={{ height: 30, fontSize: 12 }}
                                    value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                                </div>
                              )}
                              {(sec?.columns ?? []).slice(1).map(col => (
                                <div key={col}>
                                  <div className="inline-field-label">{col}</div>
                                  <input className="form-input" style={{ height: 30, fontSize: 12 }}
                                    value={editAttrVals[col] ?? ''}
                                    onChange={e => setEditAttrVals(v => ({ ...v, [col]: e.target.value }))} />
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              <select className="form-select" style={{ height: 30, fontSize: 12, flex: 1 }}
                                value={editSectionId} onChange={e => setEditSectionId(e.target.value)}>
                                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                              <select className="form-select" style={{ height: 30, fontSize: 12, flex: 1 }}
                                value={editStatus} onChange={e => setEditStatus(e.target.value as ItemStatus)}>
                                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                            </div>
                          </td>
                          <td />
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <button className="btn btn-primary"
                                style={{ height: 30, padding: '0 12px', fontSize: 12, width: 'auto' }}
                                onClick={handleSaveItem}>Save</button>
                              <button className="btn btn-secondary"
                                style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                                onClick={() => setEditItemId(null)}>Cancel</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td><span className="pn">{item.part_number}</span></td>
                          <td style={{ maxWidth: 260 }}>
                            {item.description ?? <em style={{ color: 'var(--text-muted)' }}>—</em>}
                          </td>
                          <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{sec?.name ?? '—'}</td>
                          <td>
                            {item.status !== 'active' && (
                              <span className={`badge badge-${item.status === 'obsolete' ? 'obsolete' : 'no-location'}`}>
                                {item.status === 'obsolete' ? 'Obsolete' : 'No Location'}
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-secondary"
                                style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                                onClick={() => startEditItem(item)}>Edit</button>
                              <button className="btn btn-danger"
                                style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                                onClick={() => handleDeleteItem(item.id)}>Delete</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    No items found.
                  </td></tr>
                )}
                {filteredItems.length > 200 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                    Showing first 200 of {filteredItems.length}. Use search to filter.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ════════ SECTIONS & COLUMNS TAB ════════ */}
      {tab === 'sections' && (
        <>
          {showAddSection ? (
            <div className="add-form">
              <h3>Add New Section</h3>
              <div className="form-group">
                <label className="form-label">Section Name *</label>
                <input className="form-input" value={newSecName}
                  onChange={e => setNewSecName(e.target.value)}
                  placeholder="e.g. L108 – Rivets"
                  onKeyDown={e => e.key === 'Enter' && handleAddSection()} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                You can define attribute columns after creating the section.
              </p>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setShowAddSection(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ width: 'auto', padding: '0 20px' }}
                  onClick={handleAddSection} disabled={savingSec || !newSecName.trim()}>
                  {savingSec ? 'Saving…' : 'Add Section'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '0 16px', height: 38 }}
                onClick={() => setShowAddSection(true)}>
                + Add Section
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sections.map(sec => {
              const isEdit = editSecId === sec.id;
              const count  = items.filter(i => i.section_id === sec.id).length;
              return (
                <div key={sec.id} className={`section-edit-card${isEdit ? ' editing' : ''}`}>
                  <div className="section-edit-header">
                    {isEdit ? (
                      <input className="form-input"
                        style={{ fontWeight: 600, fontSize: 14, height: 36, flex: 1 }}
                        value={editSecName} onChange={e => setEditSecName(e.target.value)} />
                    ) : (
                      <span className="section-edit-name">{sec.name}</span>
                    )}
                    <span className="section-edit-count">{count} item{count !== 1 ? 's' : ''}</span>
                    {!isEdit && (
                      <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                        <button className="btn btn-secondary"
                          style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                          onClick={() => startEditSection(sec)}>Edit Columns</button>
                        <button className="btn btn-danger"
                          style={{ height: 30, padding: '0 10px', fontSize: 12 }}
                          onClick={() => handleDeleteSection(sec.id)}>Delete</button>
                      </div>
                    )}
                  </div>

                  {/* Column editor */}
                  {isEdit && (
                    <>
                      <div className="columns-editor">
                        <div className="attrs-editor-label" style={{ marginBottom: 8 }}>
                          Columns — the first column is used as the item description
                        </div>
                        {editSecCols.map((col, i) => (
                          <div className="attr-row" key={i}>
                            <span className="col-index">{i === 0 ? 'Desc' : i + 1}</span>
                            <input className="form-input" value={col}
                              onChange={e => {
                                const a = [...editSecCols];
                                a[i] = e.target.value;
                                setEditSecCols(a);
                              }}
                              placeholder={i === 0 ? 'e.g. Description' : 'e.g. Diameter'}
                            />
                            <button className="btn-icon" title="Remove"
                              onClick={() => setEditSecCols(a => a.filter((_, j) => j !== i))}>×</button>
                          </div>
                        ))}
                        <button className="btn btn-ghost"
                          style={{ height: 32, fontSize: 12, marginTop: 4 }}
                          onClick={() => setEditSecCols(a => [...a, ''])}>
                          + Add column
                        </button>
                      </div>
                      <div className="form-actions">
                        <button className="btn btn-secondary" onClick={() => setEditSecId(null)}>Cancel</button>
                        <button className="btn btn-primary" style={{ width: 'auto', padding: '0 20px' }}
                          onClick={handleSaveSection} disabled={savingSecEdit}>
                          {savingSecEdit ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Column preview */}
                  {!isEdit && sec.columns.length > 0 && (
                    <div className="columns-preview">
                      {sec.columns.map((col, i) => (
                        <span key={i} className={`col-chip${i === 0 ? ' col-chip-desc' : ''}`}>
                          {i === 0 && <span className="col-chip-label">desc </span>}
                          {col}
                        </span>
                      ))}
                    </div>
                  )}
                  {!isEdit && sec.columns.length === 0 && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0 2px' }}>
                      No columns defined yet.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
