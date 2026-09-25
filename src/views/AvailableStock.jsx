import React, { useState, useMemo, useRef } from 'react';
import { Search, Package } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';

export default function AvailableStock({ inventory }) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);

  const availableItems = useMemo(() => {
    const up = searchQuery.toUpperCase();
    const lo = searchQuery.toLowerCase();
    return inventory
      .filter(i => i.qty > 0 && (i.suitId?.includes(up) || i.brand?.toLowerCase().includes(lo)))
      .sort((a, b) => (a.suitId || '').localeCompare(b.suitId || '', undefined, { numeric: true, sensitivity: 'base' }));
  }, [inventory, searchQuery]);

  const totalValue = useMemo(() => availableItems.reduce((a, i) => a + (Number(i.orgPrice) || 0), 0), [availableItems]);

  return (
    <div className="flex flex-col pb-20 md:h-full md:overflow-hidden">
      <div className="ui-card flex-1 flex flex-col md:overflow-hidden min-h-0">

        {/* Search */}
        <div className="sticky md:static z-10 px-3 py-3 shrink-0 rounded-t-card bg-surface border-b border-line" style={{ top: 'var(--mobile-header-h)' }}>
          <div className="ui-search">
            <Search size={17} className="shrink-0"/>
            <input
              ref={searchRef}
              aria-label="Search available stock"
              placeholder="Search available stock..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Stats bar */}
        <div className="ui-table-head flex justify-between gap-3 px-4 sm:px-5 py-2.5 shrink-0 border-b border-line-subtle tabular-nums">
          <span>{availableItems.length} Available</span>
          <span>Value: {formatCurrency(totalValue)}</span>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden">
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 p-2">
            {availableItems.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center p-10 ui-empty">
                <Package size={28} className="mb-2"/>No available stock found.
              </div>
            ) : availableItems.map(i => (
              <div key={i.id} className="p-3 rounded-lg flex flex-col justify-between bg-elevated border border-line">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <span className="font-semibold font-mono text-sm text-accent min-w-0 break-all">{i.suitId}</span>
                  <span className="ui-badge bg-success/10 text-success border-success/25">In Stock</span>
                </div>
                <span className="text-xs font-medium truncate block mb-2 text-fg-muted">{i.brand}</span>
                <div className="pt-2 border-t border-dashed border-line tabular-nums">
                  <span className="block font-semibold text-sm text-fg">{formatCurrency(i.salePrice)}</span>
                  <span className="text-xs text-fg-subtle">Cost: {formatCurrency(i.orgPrice)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="ui-table-head sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left w-1/5">ID</th>
                  <th className="px-2 py-3 text-left w-1/4">Brand</th>
                  <th className="px-2 py-3 text-right w-1/5">Cost</th>
                  <th className="px-2 py-3 text-right w-1/5">Sale Price</th>
                  <th className="px-2 py-3 text-center w-1/5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {availableItems.length === 0 ? (
                  <tr><td colSpan="5" className="ui-empty p-12">No available stock found.</td></tr>
                ) : availableItems.map((i) => (
                  <tr key={i.id} className="ui-row">
                    <td className="px-4 py-3.5 font-semibold font-mono text-accent truncate">{i.suitId}</td>
                    <td className="px-2 py-3.5 font-medium truncate text-fg-muted">{i.brand}</td>
                    <td className="px-2 py-3.5 text-right tabular-nums text-fg-subtle">{formatCurrency(i.orgPrice)}</td>
                    <td className="px-2 py-3.5 text-right tabular-nums font-semibold text-fg">{formatCurrency(i.salePrice)}</td>
                    <td className="px-2 py-3.5 text-center">
                      <span className="ui-badge bg-success/10 text-success border-success/25">In Stock</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
