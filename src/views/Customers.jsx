import React, { useState, useMemo } from 'react';
import { collection, doc, updateDoc, addDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { Wallet, Archive, Users, Receipt, ShoppingBag, Search } from 'lucide-react';
import { db, appId } from '../config/firebase';
import { formatCurrency, handleNumberInput } from '../utils/helpers';
import { ConfirmationModal } from '../components/ui/UIComponents';

export default function Customers({ customers, payments, sales, user, showToast, setViewingCustomer, setCustomerModalTab }) {
  const [paymentCustomerSearch, setPaymentCustomerSearch] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ customerId: '', amount: '' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, id: null, extraData: null });

  const paymentCustomerMatches = useMemo(() => {
    if (!paymentCustomerSearch) return [];
    const q = paymentCustomerSearch.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) && c.status !== 'deleted').slice(0, 5);
  }, [customers, paymentCustomerSearch]);

  const selectPaymentCustomer = (c) => {
    setPaymentForm({ ...paymentForm, customerId: c.id });
    setPaymentCustomerSearch(c.name);
    setCustomerSearch(c.name);
    setShowCustomerSuggestions(false);
    setViewingCustomer(c);
    setCustomerModalTab('payments');
  };

  const filteredCust = useMemo(() => {
    return customers
      .filter(c => c.status !== 'deleted' && (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()))
      .sort((a, b) => {
        const balA = (a.totalBill || 0) - (a.totalPaid || 0);
        const balB = (b.totalBill || 0) - (b.totalPaid || 0);
        if ((balA <= 0) !== (balB <= 0)) return balA <= 0 ? 1 : -1;
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      });
  }, [customers, customerSearch]);

  const handleAddPayment = async () => {
    const cust = customers.find(c => c.id === paymentForm.customerId);
    if (!cust) { showToast('Select a valid customer', 'error'); return; }
    const pending = (cust.totalBill || 0) - (cust.totalPaid || 0);
    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) { showToast('Amount must be positive', 'error'); return; }
    if (amt > pending) { showToast(`Max payment: Rs ${pending}`, 'error'); return; }
    try {
      await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, paymentForm.customerId), { totalPaid: (cust.totalPaid || 0) + amt, lastPaymentDate: serverTimestamp() });
      await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/payments`), { customerId: paymentForm.customerId, amount: amt, date: serverTimestamp(), type: 'Payment' });
      setPaymentForm({ customerId: '', amount: '' });
      setPaymentCustomerSearch('');
      showToast('Payment Recorded!');
    } catch { showToast('Error adding payment', 'error'); }
  };

  const confirmAction = async () => {
    try {
      if (modalConfig.type === 'DELETE') {
        await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, modalConfig.id), { status: 'deleted' });
        showToast('Customer Removed');
      } else if (modalConfig.type === 'RETURN_ITEM') {
        const s = modalConfig.extraData;
        await runTransaction(db, async (t) => {
          const base = `artifacts/${appId}/users/${user.uid}`;
          const custRef = doc(db, `${base}/customers`, s.customerId);
          const custSnap = await t.get(custRef);
          if (!custSnap.exists()) throw new Error('Customer not found!');
          const newBill = Math.max(0, (custSnap.data().totalBill || 0) - s.salePrice);
          t.update(doc(db, `${base}/inventory`, s.dressDocId), { qty: 1 });
          t.update(custRef, { totalBill: newBill, lastUpdated: serverTimestamp() });
          t.delete(doc(db, `${base}/sales`, s.id));
        });
        showToast('Item Returned & Stock Restored');
      }
    } catch (e) { showToast('Action Failed', 'error'); }
    setModalConfig({ isOpen: false, type: null, id: null, extraData: null });
  };

  return (
    <div className="flex flex-col gap-4 pb-20 md:h-full md:overflow-hidden">
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={confirmAction}
        title={modalConfig.type === 'DELETE' ? 'Remove Customer?' : 'Return Item?'}
        message={modalConfig.type === 'DELETE' ? 'Customer will be moved to Deleted Customers.' : 'Item will be added back to stock and bill reduced.'}
        isDanger
      />

      {/* Quick Payment Bar */}
      <div className="ui-card shrink-0 p-4">
        <h3 className="ui-section-title mb-3 flex items-center gap-2">
          <Wallet size={17} className="text-accent"/> Quick Payment
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              className="ui-input"
              aria-label="Search customer for payment"
              autoComplete="off"
              placeholder="Search customer..."
              value={paymentCustomerSearch}
              onChange={e => { setPaymentCustomerSearch(e.target.value); setCustomerSearch(e.target.value); setShowCustomerSuggestions(true); setPaymentForm(p => ({ ...p, customerId: '' })); }}
              onFocus={() => setShowCustomerSuggestions(true)}
              onBlur={() => { setTimeout(() => setShowCustomerSuggestions(false), 200); }}
            />
            {showCustomerSuggestions && paymentCustomerMatches.length > 0 && (
              <div className="ui-dropdown top-full z-50 divide-y divide-line-subtle">
                {paymentCustomerMatches.map((c) => (
                  <div key={c.id} onMouseDown={() => selectPaymentCustomer(c)}
                    className="ui-dropdown-item"
                  >{c.name}</div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              inputMode="numeric" type="number" onKeyDown={handleNumberInput}
              aria-label="Payment amount"
              className="ui-input tabular-nums flex-1 min-w-0 sm:flex-none sm:w-[140px]"
              placeholder="Amount"
              value={paymentForm.amount}
              onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            />
            <button onClick={handleAddPayment} className="ui-btn-primary min-h-[2.75rem] px-5">Add</button>
          </div>
        </div>
      </div>

      {/* Search customers */}
      <div className="ui-search shrink-0 sticky md:static z-10 bg-surface" style={{ top: 'calc(var(--mobile-header-h) + 0.5rem)' }}>
        <Search size={17} className="shrink-0"/>
        <input
          aria-label="Filter customers"
          placeholder="Filter customers..."
          value={customerSearch}
          onChange={e => setCustomerSearch(e.target.value)}
        />
      </div>

      {/* Customer grid */}
      <div className="flex-1 md:overflow-y-auto">
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {filteredCust.map(c => {
            const bal = (c.totalBill || 0) - (c.totalPaid || 0);
            const cleared = bal <= 0;
            return (
              <div
                key={c.id}
                className={`ui-card-interactive relative p-3 sm:p-4 h-fit ${cleared ? '' : 'hover:border-danger/40'}`}
                onClick={() => { setViewingCustomer(c); setCustomerModalTab('payments'); }}
              >
                <h4 className="font-semibold text-sm truncate mb-2 text-fg">{c.name}</h4>
                <span className="ui-badge bg-info/10 text-info border-info/25 tabular-nums">
                  Total: {formatCurrency(c.totalBill || 0)}
                </span>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-fg-subtle">Remaining:</span>
                    <b className={`tabular-nums text-right font-semibold ${bal > 0 ? 'text-danger' : 'text-fg-subtle'}`}>{formatCurrency(bal)}</b>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-fg-subtle">Paid:</span>
                    <b className="tabular-nums text-right font-semibold text-success">{formatCurrency(c.totalPaid || 0)}</b>
                  </div>
                </div>
                <div className="mt-3 flex gap-1.5">
                  <button className="ui-btn-tint flex-1 bg-accent/10 text-accent border-accent/25 hover:bg-accent/15">View Details</button>
                  {cleared && (
                    <button
                      onClick={e => { e.stopPropagation(); setModalConfig({ isOpen: true, type: 'DELETE', id: c.id }); }}
                      className="ui-btn-tint flex-1 bg-danger/10 text-danger border-danger/25 hover:bg-danger/15"
                    >Remove</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}