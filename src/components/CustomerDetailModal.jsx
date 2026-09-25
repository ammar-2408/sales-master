import React, { useState, useMemo } from 'react';
import { collection, doc, updateDoc, addDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { Users, X, Receipt, ShoppingBag, RefreshCcw, Undo2 } from 'lucide-react';
import { db, appId } from '../config/firebase';
import { formatCurrency, handleNumberInput } from '../utils/helpers';

export default function CustomerDetailModal({ activeCustomer, onClose, user, payments, sales, showToast }) {
  const [customerModalTab, setCustomerModalTab] = useState('payments');
  const [modalAmount, setModalAmount] = useState('');

  const customerHistory = useMemo(() => {
    if (!activeCustomer) return [];
    return payments.filter(p => p.customerId === activeCustomer.id).sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
  }, [payments, activeCustomer]);

  const customerPurchases = useMemo(() => {
    if (!activeCustomer) return [];
    return sales.filter(s => s.customerId === activeCustomer.id).sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
  }, [sales, activeCustomer]);

  const handleModalPayment = async () => {
    if (!activeCustomer || !modalAmount || Number(modalAmount) <= 0) return;
    const amt = Number(modalAmount);
    const pending = (activeCustomer.totalBill || 0) - (activeCustomer.totalPaid || 0);
    if (amt > pending) { showToast(`Max payment: Rs ${pending}`, 'error'); return; }
    try {
      await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, activeCustomer.id), { totalPaid: (activeCustomer.totalPaid || 0) + amt, lastPaymentDate: serverTimestamp() });
      await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/payments`), { customerId: activeCustomer.id, amount: amt, date: serverTimestamp(), type: 'Payment' });
      setModalAmount('');
      showToast('Payment Recorded!');
    } catch { showToast('Error adding payment', 'error'); }
  };

  const handleModalRefund = async () => {
    if (!activeCustomer || !modalAmount || Number(modalAmount) <= 0) return;
    const amt = Number(modalAmount);
    if (amt > (activeCustomer.totalPaid || 0)) { showToast('Cannot refund more than paid!', 'error'); return; }
    try {
      await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, activeCustomer.id), { totalPaid: Math.max(0, (activeCustomer.totalPaid || 0) - amt) });
      await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/payments`), { customerId: activeCustomer.id, amount: amt, date: serverTimestamp(), type: 'Refund' });
      setModalAmount('');
      showToast('Refund Processed!');
    } catch { showToast('Error processing refund', 'error'); }
  };

  const handleReturnItem = async (saleItem) => {
    if (!confirm('Are you sure you want to return this item?')) return;
    try {
      await runTransaction(db, async (t) => {
        const base = `artifacts/${appId}/users/${user.uid}`;
        const custRef = doc(db, `${base}/customers`, saleItem.customerId);
        const custSnap = await t.get(custRef);
        if (!custSnap.exists()) throw new Error('Customer not found!');
        t.update(doc(db, `${base}/inventory`, saleItem.dressDocId), { qty: 1 });
        t.update(custRef, { totalBill: Math.max(0, (custSnap.data().totalBill || 0) - saleItem.salePrice), lastUpdated: serverTimestamp() });
        t.delete(doc(db, `${base}/sales`, saleItem.id));
      });
      showToast('Item Returned & Stock Restored');
    } catch { showToast('Return Failed', 'error'); }
  };

  const tabs = [
    { id: 'payments',  icon: Receipt,     label: 'Payments',  activeCls: 'bg-accent/10 text-accent border-accent/30' },
    { id: 'purchases', icon: ShoppingBag, label: 'Purchases', activeCls: 'bg-info/10 text-info border-info/30' },
  ];

  const balance = (activeCustomer.totalBill || 0) - (activeCustomer.totalPaid || 0);

  return (
    <div className="ui-overlay overlay-safe animate-fade-in">
      <div className="ui-modal max-w-lg max-h-modal flex flex-col" role="dialog" aria-modal="true" aria-labelledby="customer-modal-title">

        {/* Header */}
        <div className="flex justify-between items-start gap-3 p-4 sm:p-5 shrink-0 border-b border-line">
          <div className="min-w-0">
            <h2 id="customer-modal-title" className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-fg">
              <Users size={18} className="shrink-0 text-accent"/><span className="min-w-0 break-words">{activeCustomer.name}</span>
            </h2>
            <p className="text-xs mt-0.5 uppercase font-semibold tracking-[0.04em] text-fg-subtle">Customer Account History</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="ui-icon-btn -m-1.5"><X size={20}/></button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { label: 'Total Bill', value: formatCurrency(activeCustomer.totalBill),  cls: 'text-info' },
              { label: 'Paid',       value: formatCurrency(activeCustomer.totalPaid),   cls: 'text-success' },
              { label: 'Balance',    value: formatCurrency(balance),                    cls: balance > 0 ? 'text-danger' : 'text-success' },
            ].map(s => (
              <div key={s.label} className="px-3 py-2.5 sm:p-3 rounded-lg flex sm:block items-center justify-between gap-3 sm:text-center min-w-0 bg-surface border border-line">
                <p className="text-xs uppercase font-semibold tracking-[0.04em] text-fg-subtle sm:mb-1">{s.label}</p>
                <p className={`font-bold text-sm leading-tight tabular-nums break-words ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="p-4 rounded-lg bg-surface border border-line">
            <label htmlFor="customer-modal-amount" className="ui-label">Quick Actions</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="customer-modal-amount"
                inputMode="numeric" type="number" min="0" onKeyDown={handleNumberInput}
                className="ui-input tabular-nums flex-1 min-w-0"
                placeholder="Amount"
                value={modalAmount}
                onChange={e => setModalAmount(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={handleModalPayment} className="ui-btn-primary flex-1 sm:flex-none min-h-[2.75rem] px-5">Pay</button>
                <button onClick={handleModalRefund} className="ui-btn-danger flex-1 sm:flex-none min-h-[2.75rem] px-5">Refund</button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2" role="tablist">
            {tabs.map(tab => {
              const active = customerModalTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setCustomerModalTab(tab.id)}
                  role="tab" aria-selected={active}
                  className={`ui-tab ${active ? tab.activeCls : 'ui-tab-inactive'}`}
                >
                  <tab.icon size={15}/>{tab.label}
                </button>
              );
            })}
          </div>

          {/* History list */}
          <div className="space-y-2">
            {customerModalTab === 'payments' ? (
              customerHistory.length > 0 ? customerHistory.map(rec => (
                <div key={rec.id} className="flex justify-between items-center gap-3 p-3 rounded-lg bg-surface border border-line">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-full shrink-0 ${rec.type === 'Refund' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                      {rec.type === 'Refund' ? <RefreshCcw size={14}/> : <Receipt size={14}/>}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-fg">{rec.type || 'Payment'}</p>
                      <p className="text-xs text-fg-subtle">{rec.date ? new Date(rec.date.seconds * 1000).toLocaleDateString() : '—'}</p>
                    </div>
                  </div>
                  <span className={`font-semibold text-sm shrink-0 tabular-nums ${rec.type === 'Refund' ? 'text-danger' : 'text-success'}`}>
                    {rec.type === 'Refund' ? '-' : '+'}{formatCurrency(rec.amount)}
                  </span>
                </div>
              )) : (
                <div className="ui-empty py-8 rounded-lg border border-dashed border-line">No payment history</div>
              )
            ) : (
              customerPurchases.length > 0 ? customerPurchases.map(item => (
                <div key={item.id} className="flex justify-between items-center gap-3 p-3 rounded-lg bg-surface border border-line">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-full shrink-0 bg-info/10 text-info">
                      <ShoppingBag size={14}/>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate text-fg"><span className="font-mono">{item.suitId}</span> <span className="font-normal text-xs text-fg-subtle">({item.brand})</span></p>
                      <p className="text-xs text-fg-subtle">{item.date ? new Date(item.date.seconds * 1000).toLocaleDateString() : '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-semibold text-sm tabular-nums text-fg">{formatCurrency(item.salePrice)}</span>
                    <button onClick={e => { e.stopPropagation(); handleReturnItem(item); }} title="Return Item"
                      aria-label="Return item"
                      className="ui-icon-btn text-danger hover:text-danger hover:bg-danger/10 -mr-1.5"
                    ><Undo2 size={16}/></button>
                  </div>
                </div>
              )) : (
                <div className="ui-empty py-8 rounded-lg border border-dashed border-line">No purchases found</div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}