import React, { useState, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Archive, RotateCcw, Search } from 'lucide-react';
import { db, appId } from '../config/firebase';
import { formatCurrency } from '../utils/helpers';
import { ConfirmationModal } from '../components/ui/UIComponents';

export default function DeletedCustomers({ customers, user, showToast, setViewingCustomer, setCustomerModalTab }) {
  const [modalConfig, setModalConfig] = useState({ isOpen: false, id: null });
  const [search, setSearch] = useState('');

  const deletedCust = useMemo(() => {
    const q = search.toLowerCase();
    return customers
      .filter(c => c.status === 'deleted' && (c.name || '').toLowerCase().includes(q))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }, [customers, search]);

  const handleRestore = async () => {
    try {
      await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, modalConfig.id), { status: 'active' });
      showToast('Customer Restored');
    } catch { showToast('Error restoring', 'error'); }
    setModalConfig({ isOpen: false, id: null });
  };

  return (
    <div className="flex flex-col pb-20 md:h-full md:overflow-hidden">
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={handleRestore}
        title="Restore Customer?"
        message="This customer will appear in the main list again."
        isDanger={false}
      />

      <div className="flex flex-col md:h-full">
        <div className="shrink-0 mb-4">
          <h2 className="ui-title mb-3 flex items-center gap-2">
            <Archive size={20} className="shrink-0 text-danger"/> Deleted Customers
          </h2>
          {/* Search bar */}
          <div className="ui-search">
            <Search size={17} className="shrink-0"/>
            <input
              aria-label="Search deleted customers"
              placeholder="Search deleted customers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-xs font-semibold px-2 py-2 -my-2 -mr-1 text-fg-muted hover:text-fg">Clear</button>
            )}
          </div>
        </div>

        {deletedCust.length === 0 ? (
          <div className="flex-1 py-12 md:py-0 flex flex-col items-center justify-center ui-empty">
            <Archive size={44} className="mb-3 text-fg-disabled"/>
            <p>{search ? `No results for "${search}"` : 'No deleted customers'}</p>
          </div>
        ) : (
          <div className="flex-1 md:overflow-y-auto min-h-0 pb-4">
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {deletedCust.map(c => (
                <div
                  key={c.id}
                  onClick={() => { setViewingCustomer(c); setCustomerModalTab('payments'); }}
                  className="ui-card-interactive border-dashed p-3 sm:p-4"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <p className="font-semibold text-sm min-w-0 break-words text-fg-muted">{c.name}</p>
                    <span className="ui-badge shrink-0 bg-danger/10 text-danger border-danger/25">Deleted</span>
                  </div>
                  <div className="flex justify-between gap-2 text-xs mb-3 text-fg-subtle">
                    <span>Balance:</span>
                    <b className="font-semibold tabular-nums text-fg-muted">{formatCurrency((c.totalBill || 0) - (c.totalPaid || 0))}</b>
                  </div>
                  <div className="flex gap-1.5">
                    <button className="ui-btn-tint flex-1 bg-white/5 text-fg-muted border-line hover:text-fg">View</button>
                    <button
                      onClick={e => { e.stopPropagation(); setModalConfig({ isOpen: true, id: c.id }); }}
                      className="ui-btn-tint flex-1 gap-1.5 bg-accent/10 text-accent border-accent/25 hover:bg-accent/15"
                    >
                      <RotateCcw size={13}/> Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}