import React, { useState, useMemo } from 'react';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Search, MinusCircle } from 'lucide-react';
import { db, appId } from '../config/firebase';
import { formatCurrency, handleNumberInput } from '../utils/helpers';

export default function Sales({ inventory, customers, user, showToast }) {
  const [cart, setCart] = useState([]);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [saleForm, setSaleForm] = useState({ customerName: '', paidAmount: '' });
  const [showSaleCustomerSuggestions, setShowSaleCustomerSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableItems = useMemo(() => {
    if (!itemSearchQuery) return [];
    const q = itemSearchQuery.toLowerCase();
    return inventory
      .filter(i => i.qty > 0 && !cart.some(c => c.id === i.id) && (i.suitId.toLowerCase().includes(q) || i.brand.toLowerCase().includes(q)))
      .sort((a, b) => a.suitId.localeCompare(b.suitId, undefined, { numeric: true }))
      .slice(0, 5);
  }, [inventory, itemSearchQuery, cart]);

  const saleCustomerMatches = useMemo(() => {
    if (!saleForm.customerName) return [];
    const q = saleForm.customerName.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) && c.status !== 'deleted').slice(0, 5);
  }, [customers, saleForm.customerName]);

  const addToCart    = (item) => { setCart([...cart, item]); setItemSearchQuery(''); };
  const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));

  const handleProcessSale = async (e) => {
    e.preventDefault();
    if (!user || isSubmitting) return;
    if (cart.length === 0) { showToast('Cart is empty!', 'error'); return; }
    if (!saleForm.customerName.trim()) { showToast('Customer name required', 'error'); return; }

    setIsSubmitting(true);
    try {
      await runTransaction(db, async (t) => {
        const userRef = `artifacts/${appId}/users/${user.uid}`;
        const itemsToSell = [];
        for (const cartItem of cart) {
          const itemRef  = doc(db, `${userRef}/inventory/${cartItem.id}`);
          const itemSnap = await t.get(itemRef);
          if (!itemSnap.exists() || itemSnap.data().qty < 1) throw new Error(`Item ${cartItem.suitId} no longer available!`);
          itemsToSell.push({ ref: itemRef, data: itemSnap.data(), id: cartItem.id });
        }
        let custRef;
        const existing = customers.find(c => c.name.toLowerCase().trim() === saleForm.customerName.trim().toLowerCase() && c.status !== 'deleted');
        if (existing) custRef = doc(db, `${userRef}/customers/${existing.id}`);
        else custRef = doc(collection(db, `${userRef}/customers`));
        const custSnap = await t.get(custRef);
        const totalSale = itemsToSell.reduce((s, i) => s + i.data.salePrice, 0);
        const paid = Number(saleForm.paidAmount) || 0;
        const updateData = {
          totalBill: (custSnap.exists() ? custSnap.data().totalBill || 0 : 0) + totalSale,
          totalPaid: (custSnap.exists() ? custSnap.data().totalPaid || 0 : 0) + paid,
          lastUpdated: serverTimestamp(), status: 'active'
        };
        if (paid > 0) updateData.lastPaymentDate = serverTimestamp();
        if (custSnap.exists()) t.update(custRef, updateData);
        else t.set(custRef, { name: saleForm.customerName, ...updateData, joinedAt: serverTimestamp() });
        if (paid > 0) {
          const payRef = doc(collection(db, `${userRef}/payments`));
          t.set(payRef, { customerId: custRef.id, amount: paid, date: serverTimestamp(), type: 'Sale Initial' });
        }
        for (const item of itemsToSell) {
          t.update(item.ref, { qty: 0 });
          const profit = item.data.salePrice - item.data.orgPrice;
          t.set(doc(collection(db, `${userRef}/sales`)), {
            customerId: custRef.id, customerName: saleForm.customerName, suitId: item.data.suitId,
            dressDocId: item.id, brand: item.data.brand, orgPrice: item.data.orgPrice,
            salePrice: item.data.salePrice, profit, mamaShare: Math.max(0, Math.round(profit * 0.2)),
            mamaPaid: false, date: serverTimestamp()
          });
        }
      });
      setCart([]);
      setSaleForm({ customerName: '', paidAmount: '' });
      showToast(`Sold ${cart.length} item${cart.length > 1 ? 's' : ''} successfully!`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cartTotal = cart.reduce((s, i) => s + i.salePrice, 0);

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="ui-card p-4 sm:p-6">

        <h2 className="ui-title mb-5">POS Terminal</h2>

        {/* Item search */}
        <div className="relative mb-6">
          <label htmlFor="pos-item-search" className="ui-label">Search Product</label>
          <div className="ui-search">
            <Search size={17} className="shrink-0" />
            <input
              id="pos-item-search"
              placeholder="Type ID or brand..."
              value={itemSearchQuery}
              onChange={e => setItemSearchQuery(e.target.value)}
            />
          </div>
          {availableItems.length > 0 && (
            <div className="ui-dropdown z-20 divide-y divide-line-subtle">
              {availableItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="ui-dropdown-item flex justify-between items-center gap-3"
                >
                  <span className="font-semibold font-mono text-sm shrink-0 text-accent">{item.suitId}</span>
                  <span className="text-sm min-w-0 flex-1 truncate text-center text-fg-muted">{item.brand}</span>
                  <span className="font-semibold text-sm shrink-0 tabular-nums text-fg">{formatCurrency(item.salePrice)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="mb-6 rounded-lg overflow-hidden border border-line">
          <div className="ui-table-head flex justify-between px-4 py-2.5 border-b border-line">
            <span>Items ({cart.length})</span>
            <span>Total</span>
          </div>
          {cart.length === 0 ? (
            <p className="ui-empty py-8">Cart is empty</p>
          ) : (
            <div className="divide-y divide-line-subtle">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center gap-3 px-4 py-3 animate-slide-in">
                  <div className="min-w-0">
                    <p className="font-semibold font-mono text-sm text-fg">{item.suitId}</p>
                    <p className="text-xs mt-0.5 truncate text-fg-subtle">{item.brand}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold text-sm tabular-nums text-fg">{formatCurrency(item.salePrice)}</span>
                    <button onClick={() => removeFromCart(item.id)} aria-label="Remove from cart" className="p-2.5 -m-2.5 rounded-full text-danger transition-colors hover:bg-danger/10">
                      <MinusCircle size={18}/>
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center px-4 py-3 bg-canvas">
                <span className="font-semibold text-sm text-fg">Total Bill</span>
                <span className="font-bold text-lg tabular-nums text-fg">{formatCurrency(cartTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Customer & payment */}
        <div className="space-y-4">
          <div className="relative">
            <label htmlFor="pos-customer" className="ui-label">Customer Name</label>
            <input
              id="pos-customer"
              className="ui-input"
              autoComplete="off"
              placeholder="Type customer name..."
              value={saleForm.customerName}
              onChange={e => { setSaleForm({ ...saleForm, customerName: e.target.value }); setShowSaleCustomerSuggestions(true); }}
              onFocus={() => { setShowSaleCustomerSuggestions(true); }}
              onBlur={() => { setTimeout(() => setShowSaleCustomerSuggestions(false), 200); }}
            />
            {showSaleCustomerSuggestions && saleCustomerMatches.length > 0 && (
              <div className="ui-dropdown z-50 divide-y divide-line-subtle">
                {saleCustomerMatches.map((c) => (
                  <div key={c.id} onMouseDown={() => { setSaleForm({ ...saleForm, customerName: c.name }); setShowSaleCustomerSuggestions(false); }}
                    className="ui-dropdown-item"
                  >{c.name}</div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="pos-paid" className="ui-label">Paid Amount (optional)</label>
            <input
              id="pos-paid"
              inputMode="numeric" type="number"
              onKeyDown={handleNumberInput}
              className="ui-input tabular-nums"
              placeholder="0"
              value={saleForm.paidAmount}
              onChange={e => setSaleForm({ ...saleForm, paidAmount: e.target.value })}
            />
          </div>

          <button
            onClick={handleProcessSale}
            disabled={isSubmitting || cart.length === 0}
            className="ui-btn-primary w-full min-h-[2.75rem]"
          >
            Confirm Sale
          </button>
        </div>
      </div>
    </div>
  );
}