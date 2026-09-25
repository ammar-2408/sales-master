import React, { useState, useRef } from 'react';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Plus, Save } from 'lucide-react';
import { db, appId } from '../config/firebase';
import { handleNumberInput, chunkArray } from '../utils/helpers';

function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="ui-label">{children}</label>
  );
}

export default function AddStock({ inventory, user, showToast }) {
  const [dressForm, setDressForm] = useState({ suitIds: '', brand: '', orgPrice: '', salePrice: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const idsInputRef = useRef(null);

  const handleAddDress = async (e) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    if (!dressForm.suitIds.trim())                               { showToast('Product IDs missing!', 'error');   return; }
    if (!dressForm.brand.trim())                                 { showToast('Brand required!', 'error');         return; }
    if (!dressForm.orgPrice || Number(dressForm.orgPrice) <= 0) { showToast('Invalid Cost Price', 'error');      return; }
    if (!dressForm.salePrice || Number(dressForm.salePrice) <= 0){ showToast('Invalid Sale Price', 'error');     return; }
    if (Number(dressForm.salePrice) < Number(dressForm.orgPrice)){ showToast('Sale Price < Cost!', 'error');     return; }

    setIsSubmitting(true);
    const newSuitIds = dressForm.suitIds.split(/[\s,]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
    const uniqueInputIds = new Set(newSuitIds);
    if (newSuitIds.length === 0)                          { showToast('Invalid IDs', 'error'); setIsSubmitting(false); return; }
    if (uniqueInputIds.size !== newSuitIds.length)        { showToast('Duplicate IDs in input!', 'error'); setIsSubmitting(false); return; }
    const duplicates = newSuitIds.filter(id => inventory.some(i => i.suitId === id));
    if (duplicates.length > 0)                            { showToast(`Already exists: ${duplicates.join(', ')}`, 'error'); setIsSubmitting(false); return; }

    try {
      const batches = chunkArray(newSuitIds, 450);
      for (const chunk of batches) {
        const batch = writeBatch(db);
        chunk.forEach(id => {
          const docRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/inventory`));
          batch.set(docRef, {
            suitId: id,
            brand: dressForm.brand.trim(),
            qty: 1,
            orgPrice: Math.round(Number(dressForm.orgPrice)),
            salePrice: Math.round(Number(dressForm.salePrice)),
            createdAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
      setDressForm({ suitIds: '', brand: '', orgPrice: '', salePrice: '' });
      showToast(`Added ${newSuitIds.length} item${newSuitIds.length > 1 ? 's' : ''} successfully!`);
    } catch { showToast('Failed to add stock', 'error'); }
    finally  { setIsSubmitting(false); }
  };

  return (
    <div className="flex flex-col md:h-full md:overflow-y-auto items-center pb-20 md:py-8 md:px-4">
      <div className="ui-card my-auto w-full max-w-xl p-5 sm:p-8">

        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 bg-accent/15 text-accent">
            <Plus size={28}/>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-fg">Add New Stock</h2>
          <p className="mt-1 text-sm text-fg-subtle">Enter details below to add items to inventory.</p>
        </div>

        <form onSubmit={handleAddDress} className="space-y-5">
          <div>
            <Label htmlFor="stock-ids">Product IDs (comma or space separated)</Label>
            <textarea
              id="stock-ids"
              ref={idsInputRef}
              required
              className="ui-input font-mono resize-none min-h-[6rem]"
              value={dressForm.suitIds}
              onChange={e => setDressForm({ ...dressForm, suitIds: e.target.value })}
              placeholder="A1, A2, B1..."
            />
          </div>

          <div>
            <Label htmlFor="stock-brand">Brand Name</Label>
            <input
              id="stock-brand"
              required
              className="ui-input"
              value={dressForm.brand}
              onChange={e => setDressForm({ ...dressForm, brand: e.target.value })}
              placeholder="e.g. Khaadi, Gul Ahmed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="stock-cost">Cost Price</Label>
              <input
                id="stock-cost"
                inputMode="numeric" type="number" onKeyDown={handleNumberInput}
                className="ui-input tabular-nums"
                value={dressForm.orgPrice}
                onChange={e => setDressForm({ ...dressForm, orgPrice: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="stock-sale">Sale Price</Label>
              <input
                id="stock-sale"
                inputMode="numeric" type="number" onKeyDown={handleNumberInput}
                className="ui-input tabular-nums"
                value={dressForm.salePrice}
                onChange={e => setDressForm({ ...dressForm, salePrice: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="ui-btn-primary w-full min-h-[2.75rem]"
          >
            <Save size={16}/> {isSubmitting ? 'Adding...' : 'Save Stock'}
          </button>
        </form>
      </div>
    </div>
  );
}