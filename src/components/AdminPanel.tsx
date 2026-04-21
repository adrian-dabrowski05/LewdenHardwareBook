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

interface AttrPair { key: string; value: string; }

const STATUSES: { value: ItemStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'obsolete', label: 'Obsolete' },
  { value: 'no_location', label: 'No Location' },
];

export default function AdminPanel({ sections, items, onRefresh, onToast }: Props) {
  const [tab, setTab] = useState<AdminTab>('items');
  const [searchQ, setSearchQ] = useState('');
  const [filterSection, setFilterSection] = useState('');

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [newPN, setNewPN] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSection, setNewSection] = useState('');
  const [newStatus, setNewStatus] = useState<ItemStatus>('active');
  const [newAttrs, setNewAttrs] = useState<AttrPair[]>([{ key: '', value: '' }]);
  const [savingItem, setSavingItem] = useState(false);

  // Add section form
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSecName, setNewSecName] = useState('');
  const [savingSec, setSavingSec] = useState(false);

  // Edit item
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editPN, setEditPN] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<ItemStatus>('active');
  const [editAttrs, setEditAttrs] = useState<AttrPair[]>([]);
  const [editSectionId, setEditSectionId] = useState('');

  function attrsToObj(pairs: AttrPair[]): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const { key, value } of pairs) {
      if (key.trim()) obj[key.trim()] = value;
    }
    return obj;
  }

  function objToAttrs(obj: Record<string, string>): AttrPair[] {
    const pairs = Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }));
    return pairs.length > 0 ? pairs : [{ key: '', value: '' }];
  }

  // Items filtered
  const filteredItems = items.filter(it => {
    if (filterSection && it.section_id !== filterSection) return false;
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (
      it.part_number.toLowerCase().includes(q) ||
      (it.description ?? '').toLowerCase().includes(q)
    );
  });

  async function handleAddItem() {
    if (!newPN.trim() || !newSection) return;
    setSavingItem(true);
    const { error } = await supabase.from('items').insert({
      part_number: newPN.trim(),
      description: newDesc.trim() || null,
      section_id: newSection,
      status: newStatus,
      attributes: attrsToObj(newAttrs),
    });
    setSavingItem(false);
    if (error) { onToast('error', 'Failed to add item.'); return; }
    onToast('success', 'Item added.');
    setNewPN(''); setNewDesc(''); setNewSection(''); setNewStatus('active');
    setNewAttrs([{ key: '', value: '' }]); setShowAddItem(false);
    onRefresh();
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('Delete this item?')) return;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) { onToast('error', 'Failed to delete.'); return; }
    onToast('success', 'Item deleted.');
    onRefresh();
  }

  function startEdit(item: Item) {
    setEditItemId(item.id);
    setEditPN(item.part_number);
    setEditDesc(item.description ?? '');
    setEditStatus(item.status);
    setEditSectionId(item.section_id);
    setEditAttrs(objToAttrs(item.attributes ?? {}));
  }

  async function handleSaveEdit() {
    if (!editItemId) return;
    const { error } = await supabase.from('items').update({
      part_number: editPN.trim(),
      description: editDesc.trim() || null,
      status: editStatus,
      section_id: editSectionId,
      attributes: attrsToObj(editAttrs),
    }).eq('id', editItemId);
    if (error) { onToast('error', 'Failed to save.'); return; }
    onToast('success', 'Item updated.');
    setEditItemId(null);
    onRefresh();
  }

  async function handleAddSection() {
    if (!newSecName.trim()) return;
    setSavingSec(true);
    const slug = newSecName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const maxOrder = sections.reduce((m, s) => Math.max(m, s.sort_order), 0);
    const { error } = await supabase.from('sections').insert({
      name: newSecName.trim(), slug, sort_order: maxOrder + 1,
    });
    setSavingSec(false);
    if (error) { onToast('error', 'Failed to add section (slug may already exist).'); return; }
    onToast('success', 'Section added.');
    setNewSecName(''); setShowAddSection(false);
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
          Sections ({sections.length})
        </button>
      </div>

      {/* ---- ITEMS TAB ---- */}
      {tab === 'items' && (
        <>
          {showAddItem ? (
            <div className="add-form">
              <h3>Add New Item</h3>
              <div className="form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Part Number *</label>
                  <input className="form-input" value={newPN} onChange={e => setNewPN(e.target.value)} placeholder="e.g. L100-0999" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Section *</label>
                  <select className="form-select" value={newSection} onChange={e => setNewSection(e.target.value)}>
                    <option value="">— select —</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Status</label>
                  <select className="form-select" value={newStatus} onChange={e => setNewStatus(e.target.value as ItemStatus)}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Item description" />
              </div>

              <div className="attrs-editor">
                <div className="attrs-editor-label">Attributes (optional)</div>
                {newAttrs.map((pair, i) => (
                  <div className="attr-row" key={i}>
                    <input className="form-input" placeholder="Key (e.g. Diameter)" value={pair.key}
                      onChange={e => { const a = [...newAttrs]; a[i] = { ...a[i], key: e.target.value }; setNewAttrs(a); }} />
                    <input className="form-input" placeholder="Value (e.g. M4)" value={pair.value}
                      onChange={e => { const a = [...newAttrs]; a[i] = { ...a[i], value: e.target.value }; setNewAttrs(a); }} />
                    <button className="btn-icon" onClick={() => setNewAttrs(a => a.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
                <button className="btn btn-ghost" style={{ height: 32, fontSize: 12 }}
                  onClick={() => setNewAttrs(a => [...a, { key: '', value: '' }])}>
                  + Add attribute
                </button>
              </div>

              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setShowAddItem(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ width: 'auto', padding: '0 20px' }}
                  onClick={handleAddItem} disabled={savingItem || !newPN.trim() || !newSection}>
                  {savingItem ? 'Saving…' : 'Add Item'}
                </button>
              </div>
            </div>
          ) : (
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
                  <th>Attributes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.slice(0, 200).map(item => {
                  const sec = sections.find(s => s.id === item.section_id);
                  const isEdit = editItemId === item.id;
                  return (
                    <tr key={item.id}>
                      {isEdit ? (
                        <>
                          <td>
                            <input className="form-input" style={{ height: 32, fontSize: 12 }}
                              value={editPN} onChange={e => setEditPN(e.target.value)} />
                          </td>
                          <td>
                            <input className="form-input" style={{ height: 32, fontSize: 12 }}
                              value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                          </td>
                          <td>
                            <select className="form-select" style={{ height: 32, fontSize: 12 }}
                              value={editSectionId} onChange={e => setEditSectionId(e.target.value)}>
                              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </td>
                          <td>
                            <select className="form-select" style={{ height: 32, fontSize: 12 }}
                              value={editStatus} onChange={e => setEditStatus(e.target.value as ItemStatus)}>
                              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </td>
                          <td colSpan={1}>
                            <div className="attrs-editor" style={{ maxWidth: 320 }}>
                              {editAttrs.map((pair, i) => (
                                <div className="attr-row" key={i} style={{ marginBottom: 4 }}>
                                  <input className="form-input" style={{ height: 28, fontSize: 11 }} placeholder="Key"
                                    value={pair.key} onChange={e => { const a = [...editAttrs]; a[i] = { ...a[i], key: e.target.value }; setEditAttrs(a); }} />
                                  <input className="form-input" style={{ height: 28, fontSize: 11 }} placeholder="Value"
                                    value={pair.value} onChange={e => { const a = [...editAttrs]; a[i] = { ...a[i], value: e.target.value }; setEditAttrs(a); }} />
                                  <button className="btn-icon" style={{ width: 28, height: 28 }}
                                    onClick={() => setEditAttrs(a => a.filter((_, j) => j !== i))}>×</button>
                                </div>
                              ))}
                              <button style={{ fontSize: 11, padding: '2px 8px', cursor: 'pointer', background: 'none', border: '1px solid var(--border)', borderRadius: 4 }}
                                onClick={() => setEditAttrs(a => [...a, { key: '', value: '' }])}>+ Add</button>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-primary" style={{ height: 30, padding: '0 10px', fontSize: 12, width: 'auto' }}
                                onClick={handleSaveEdit}>Save</button>
                              <button className="btn btn-secondary" style={{ height: 30, padding: '0 10px', fontSize: 12 }}
                                onClick={() => setEditItemId(null)}>Cancel</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td><span className="pn">{item.part_number}</span></td>
                          <td style={{ maxWidth: 280 }}>{item.description ?? <em style={{ color: 'var(--text-muted)' }}>—</em>}</td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{sec?.name ?? '—'}</td>
                          <td>
                            {item.status !== 'active' && (
                              <span className={`badge badge-${item.status === 'obsolete' ? 'obsolete' : 'no-location'}`}>
                                {item.status === 'obsolete' ? 'Obsolete' : 'No Location'}
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {Object.keys(item.attributes ?? {}).length} attr{Object.keys(item.attributes ?? {}).length !== 1 ? 's' : ''}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-secondary" style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                                onClick={() => startEdit(item)}>Edit</button>
                              <button className="btn btn-danger" style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                                onClick={() => handleDeleteItem(item.id)}>Delete</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No items found.</td></tr>
                )}
                {filteredItems.length > 200 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                    Showing first 200 of {filteredItems.length}. Use search to filter.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ---- SECTIONS TAB ---- */}
      {tab === 'sections' && (
        <>
          {showAddSection ? (
            <div className="add-form">
              <h3>Add New Section</h3>
              <div className="form-group">
                <label className="form-label">Section Name *</label>
                <input className="form-input" value={newSecName} onChange={e => setNewSecName(e.target.value)}
                  placeholder="e.g. Rivets" onKeyDown={e => e.key === 'Enter' && handleAddSection()} />
              </div>
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

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Items</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sections.map(sec => {
                  const count = items.filter(i => i.section_id === sec.id).length;
                  return (
                    <tr key={sec.id}>
                      <td style={{ fontWeight: 500 }}>{sec.name}</td>
                      <td><span className="pn">{sec.slug}</span></td>
                      <td>{count}</td>
                      <td>
                        <button className="btn btn-danger" style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                          onClick={() => handleDeleteSection(sec.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
