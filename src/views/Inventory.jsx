import React, { useState, useMemo, useRef } from 'react';
import { collection, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Search, Edit, Trash2, Package } from 'lucide-react';
import { db, appId } from '../config/firebase';
import { formatCurrency, handleNumberInput, chunkArray } from '../utils/helpers';
import { ConfirmationModal } from '../components/ui/UIComponents';

function StockBadge({ inStock }) {
  return inStock
    ? <span className="ui-badge bg-success/10 text-success border-success/25">In Stock</span>
    : <span className="ui-badge bg-danger/10 text-danger border-danger/25">Sold</span>;
}

export default function Inventory({ inventory, user, showToast }) {
  const [inventorySearch, setInventorySearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, id: null });
  const searchRef = useRef(null);

  const filteredInv = useMemo(() => {
    const up = inventorySearch.toUpperCase();
    const lo = inventorySearch.toLowerCase();
    return inventory
      .filter(i => i.suitId?.includes(up) || i.brand?.toLowerCase().includes(lo))
      .sort((a, b) => (a.suitId || '').localeCompare(b.suitId || '', undefined, { numeric: true, sensitivity: 'base' }));
  }, [inventory, inventorySearch]);

  const filteredValue = useMemo(() => filteredInv.reduce((a, i) => a + (Number(i.orgPrice) || 0), 0), [filteredInv]);

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!user || !editingItem) return;
    try {
      await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/inventory`, editingItem.id), {
        brand: editingItem.brand,
        orgPrice: Math.round(Number(editingItem.orgPrice)),
        salePrice: Math.round(Number(editingItem.salePrice)),
      });
      setEditingItem(null);
      showToast('Updated!');
    } catch { showToast('Update failed', 'error'); }
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/inventory`, modalConfig.id));
      showToast('Item removed');
    } catch { showToast('Error', 'error'); }
    setModalConfig({ isOpen: false, id: null });
  };

  return (
    <div className="flex flex-col pb-20 md:h-full md:overflow-hidden">
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={confirmDelete}
        title="Delete Item?"
        message="This cannot be undone."
        isDanger
      />

      <div className="ui-card flex-1 flex flex-col min-h-0 md:overflow-hidden">

        {/* Search header */}
        <div className="sticky md:static z-10 px-3 py-3 shrink-0 rounded-t-card bg-surface border-b border-line" style={{ top: 'var(--mobile-header-h)' }}>
          <div className="ui-search">
            <Search size={17} className="shrink-0" />
            <input
              ref={searchRef}
              aria-label="Search inventory"
              placeholder="Search by ID or brand..."
              value={inventorySearch}
              onChange={e => setInventorySearch(e.target.value)}
            />
          </div>
        </div>

        {/* Stats bar */}
        <div className="ui-table-head flex justify-between gap-3 px-4 sm:px-5 py-2.5 shrink-0 border-b border-line-subtle tabular-nums">
          <span>{filteredInv.length} Items</span>
          <span>Value: {formatCurrency(filteredValue)}</span>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden">
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 p-2">
            {filteredInv.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center p-10 ui-empty">
                <Package size={28} className="mb-2"/>
                <p>No items found</p>
              </div>
            ) : filteredInv.map(i => (
              <div key={i.id} className="p-3 rounded-lg flex flex-col justify-between bg-elevated border border-line">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <span className="font-semibold font-mono text-sm text-accent min-w-0 break-all">{i.suitId}</span>
                  <StockBadge inStock={i.qty > 0} />
                </div>
                <span className="text-xs font-medium truncate block mb-2 text-fg-muted">{i.brand}</span>
                <div className="pt-2 flex justify-between items-end gap-2 border-t border-dashed border-line">
                  <div className="min-w-0 tabular-nums">
                    <span className="block font-semibold text-sm text-fg">{formatCurrency(i.salePrice)}</span>
                    <span className="text-xs text-fg-subtle">Cost: {formatCurrency(i.orgPrice)}</span>
                  </div>
                  {i.qty > 0 && (
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => setEditingItem(i)} aria-label="Edit item" className="w-9 h-9 flex items-center justify-center rounded-lg bg-info/10 text-info transition-colors hover:bg-info/20"><Edit size={15}/></button>
                      <button onClick={() => setModalConfig({ isOpen: true, id: i.id })} aria-label="Delete item" className="w-9 h-9 flex items-center justify-center rounded-lg bg-danger/10 text-danger transition-colors hover:bg-danger/20"><Trash2 size={15}/></button>
                    </div>
                  )}
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
                  <th className="px-4 py-3 text-left w-1/6">ID</th>
                  <th className="px-2 py-3 text-left w-1/4">Brand</th>
                  <th className="px-2 py-3 text-right w-1/6">Cost</th>
                  <th className="px-2 py-3 text-right w-1/6">Sale</th>
                  <th className="px-2 py-3 text-center w-1/6">Status</th>
                  <th className="px-2 py-3 text-center w-1/6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {filteredInv.length === 0 ? (
                  <tr><td colSpan="6" className="ui-empty p-12">No items found</td></tr>
                ) : filteredInv.map(i => (
                  <tr key={i.id} className="ui-row">
                    <td className="px-4 py-2 font-semibold font-mono text-accent truncate">{i.suitId}</td>
                    <td className="px-2 py-2 font-medium truncate text-fg-muted">{i.brand}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-fg-subtle">{formatCurrency(i.orgPrice)}</td>
                    <td className="px-2 py-2 text-right tabular-nums font-semibold text-fg">{formatCurrency(i.salePrice)}</td>
                    <td className="px-2 py-2 text-center">
                      <StockBadge inStock={i.qty > 0} />
                    </td>
                    <td className="px-2 py-1 text-center">
                      {i.qty > 0 && (
                        <div className="flex justify-center gap-1">
                          <button onClick={() => setEditingItem(i)} aria-label="Edit item" className="ui-icon-btn text-info hover:text-info hover:bg-info/10"><Edit size={16}/></button>
                          <button onClick={() => setModalConfig({ isOpen: true, id: i.id })} aria-label="Delete item" className="ui-icon-btn text-danger hover:text-danger hover:bg-danger/10"><Trash2 size={16}/></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editingItem && (
        <div className="ui-overlay overlay-safe animate-fade-in">
          <div className="ui-modal max-w-sm p-6" role="dialog" aria-modal="true" aria-labelledby="edit-item-title">
            <h3 id="edit-item-title" className="text-lg font-semibold mb-5 text-center text-fg">Edit Item</h3>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label htmlFor="edit-brand" className="ui-label">Brand</label>
                <input id="edit-brand" className="ui-input" value={editingItem.brand} onChange={e => setEditingItem({ ...editingItem, brand: e.target.value })}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-cost" className="ui-label">Cost</label>
                  <input id="edit-cost" className="ui-input tabular-nums" type="number" inputMode="numeric" onKeyDown={handleNumberInput} value={editingItem.orgPrice} onChange={e => setEditingItem({ ...editingItem, orgPrice: e.target.value })}/>
                </div>
                <div>
                  <label htmlFor="edit-sale" className="ui-label">Sale</label>
                  <input id="edit-sale" className="ui-input tabular-nums" type="number" inputMode="numeric" onKeyDown={handleNumberInput} value={editingItem.salePrice} onChange={e => setEditingItem({ ...editingItem, salePrice: e.target.value })}/>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingItem(null)} className="ui-btn-secondary flex-1">Cancel</button>
                <button type="submit" className="ui-btn-primary flex-1">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}