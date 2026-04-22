import type { Item, Section } from '../types';

interface Props {
  item: Item;
  section: Section | undefined;
  query: string;
  showSection: boolean;
}

export function highlight(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : part
  );
}

// Used in global search (all-sections view) — shows all attrs inline
export default function ItemCard({ item, section, query, showSection }: Props) {
  const attrs = item.attributes ?? {};
  const attrEntries = Object.entries(attrs).filter(([, v]) => v);

  return (
    <div className="item-row">
      <div className="item-row-main">
        <span className="item-pn">{highlight(item.part_number, query)}</span>
        <span className="item-desc">
          {item.description
            ? highlight(item.description, query)
            : <em style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</em>
          }
        </span>
        <div className="item-row-right">
          {showSection && section && (
            <span className="item-section-tag">{section.name}</span>
          )}
          {item.status === 'obsolete' && <span className="badge badge-obsolete">Obsolete</span>}
          {item.status === 'no_location' && <span className="badge badge-no-location">No Location</span>}
        </div>
      </div>
      {attrEntries.length > 0 && (
        <div className="item-row-attrs">
          {attrEntries.map(([k, v]) => (
            <span key={k} className="attr-pill">
              <span className="attr-pill-key">{k}</span>
              <span className="attr-pill-val">{highlight(String(v), query)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
