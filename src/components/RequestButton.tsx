import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onToast: (type: 'success' | 'error', message: string) => void;
}

export default function RequestButton({ onToast }: Props) {
  const [open,    setOpen]    = useState(false);
  const [pn,      setPn]      = useState('');
  const [desc,    setDesc]    = useState('');
  const [name,    setName]    = useState('');
  const [notes,   setNotes]   = useState('');
  const [saving,  setSaving]  = useState(false);

  async function handleSubmit() {
    if (!name.trim() || (!pn.trim() && !desc.trim())) return;
    setSaving(true);
    const { error } = await supabase.from('requests').insert({
      part_number:    pn.trim()    || null,
      description:    desc.trim()  || null,
      requester_name: name.trim(),
      notes:          notes.trim() || null,
    });
    setSaving(false);
    if (error) { onToast('error', 'Failed to submit request.'); return; }
    onToast('success', 'Request submitted — thanks!');
    setPn(''); setDesc(''); setName(''); setNotes('');
    setOpen(false);
  }

  const canSubmit = name.trim() && (pn.trim() || desc.trim());

  return (
    <>
      {/* Floating button */}
      <button className="request-fab" onClick={() => setOpen(true)} title="Request a missing item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        Request item
      </button>

      {/* Modal */}
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Request a Missing Item</h2>
            <p className="modal-subtitle">
              Can't find what you're looking for? Fill in what you know and an admin will add it.
            </p>

            <div className="form-group">
              <label className="form-label">Your Name *</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. John Smith" autoFocus />
            </div>

            <div className="form-row" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Part Number</label>
                <input className="form-input" value={pn} onChange={e => setPn(e.target.value)}
                  placeholder="e.g. L100-1234" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="e.g. M6 x 30 Hex Bolt" />
              </div>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 12px' }}>
              Fill in at least one of part number or description.
            </p>

            <div className="form-group">
              <label className="form-label">Additional Notes <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
              <textarea className="form-input" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any extra context that might help…"
                style={{ height: 72, resize: 'vertical', paddingTop: 8, paddingBottom: 8, lineHeight: 1.5 }} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }}
                onClick={handleSubmit} disabled={saving || !canSubmit}>
                {saving ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
