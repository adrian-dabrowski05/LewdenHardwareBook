import { useState } from 'react';
import type { Item, Section } from '../types';

interface Props {
  item: Item;
  section: Section | undefined;
  query: string;
  showSection: boolean;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : part
  );
}

export default function ItemCard({ item, section, query, showSection }: Props) {
  const [expanded, setExpanded] = useState(false);

  const attrs = item.attributes ?? {};
  const attrEntries = Object.entries(attrs).filter(([, v]) => v);

  return (
    <div className={`item-card${expanded ? ' expanded' : ''}`}>
      <div className="item-card-header" onClick={() => setExpanded(e => !e)}>
        <span className="item-pn">
          {highlight(item.part_number, query)}
        </span>

        <span className="item-desc">
          {item.description
            ? highlight(item.description, query)
            : <em style={{ color: 'var(--text-muted)' }}>No description</em>
          }
        </span>

        {showSection && section && (
          <span className="item-section-tag">{section.name}</span>
        )}

        <div className="item-badges">
          {item.status === 'obsolete' && (
            <span className="badge badge-obsolete">Obsolete</span>
          )}
          {item.status === 'no_location' && (
            <span className="badge badge-no-location">No Location</span>
          )}
        </div>

        <span className="item-chevron">▼</span>
      </div>

      {expanded && (
        attrEntries.length > 0 ? (
          <div className="item-attrs">
            {attrEntries.map(([k, v]) => (
              <div key={k} className="attr-cell">
                <span className="attr-key">{k}</span>
                <span className="attr-val">{highlight(String(v), query)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="item-no-attrs">No additional attributes.</div>
        )
      )}
    </div>
  );
}
