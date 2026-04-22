import type { Item, Section } from '../types';
import { highlight } from './ItemCard';

interface Props {
  section: Section;
  items: Item[];
  query: string;
}

export default function SectionTable({ section, items, query }: Props) {
  // columns from section definition, fallback to keys from first item
  const cols: string[] = section.columns?.length
    ? section.columns
    : items.length > 0
      ? Object.keys(items[0].attributes ?? {})
      : [];

  return (
    <div className="section-table-wrap">
      <div className="section-table-header">
        <span className="section-table-title">{section.name}</span>
        <span className="section-table-count">{items.length} items</span>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-pn">Part Number</th>
              {section.columns[0] && (
                <th className="col-desc">{section.columns[0]}</th>
              )}
              {cols.slice(1).map(col => (
                <th key={col}>{col}</th>
              ))}
              <th className="col-status">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const attrs = item.attributes ?? {};
              return (
                <tr key={item.id} className={item.status !== 'active' ? 'row-muted' : ''}>
                  <td className="col-pn">
                    <span className="item-pn">{highlight(item.part_number, query)}</span>
                  </td>
                  {/* Description column */}
                  {section.columns[0] && (
                    <td className="col-desc">
                      {item.description
                        ? highlight(item.description, query)
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                  )}
                  {/* Attribute columns */}
                  {cols.slice(1).map(col => (
                    <td key={col}>
                      {attrs[col]
                        ? highlight(String(attrs[col]), query)
                        : <span style={{ color: 'var(--text-light)' }}>—</span>
                      }
                    </td>
                  ))}
                  <td className="col-status">
                    {item.status === 'obsolete' && <span className="badge badge-obsolete">Obsolete</span>}
                    {item.status === 'no_location' && <span className="badge badge-no-location">No Location</span>}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={cols.length + 2} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  No items match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
