import React, { useState, useMemo } from 'react';
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { AlertTriangle, History } from 'lucide-react';
import { db, appId } from '../config/firebase';
import { formatCurrency } from '../utils/helpers';

function StatCard({ label, value, cls }) {
  return (
    <div className="ui-card px-4 py-3 sm:p-4 flex sm:block items-center justify-between gap-3 sm:text-center min-w-0">
      <p className="text-xs uppercase font-semibold tracking-[0.04em] text-fg-subtle sm:mb-1">{label}</p>
      <p className={`text-base sm:text-lg lg:text-xl font-bold tabular-nums break-words ${cls}`}>{value}</p>
    </div>
  );
}

export default function PartnerShare({ sales, stats, user, showToast }) {
  const [mamaTab, setMamaTab] = useState('pending');
  const [selectedMamaSales, setSelectedMamaSales] = useState([]);

  const sortedPending = useMemo(() => sales.filter(s => !s.mamaPaid).sort((a, b) => (a.suitId || '').localeCompare(b.suitId || '', undefined, { numeric: true })), [sales]);
  const sortedPaid    = useMemo(() => sales.filter(s =>  s.mamaPaid).sort((a, b) => (a.suitId || '').localeCompare(b.suitId || '', undefined, { numeric: true })), [sales]);

  const handleMarkPaid = async (status) => {
    try {
      const batch = writeBatch(db);
      selectedMamaSales.forEach(id => batch.update(doc(db, `artifacts/${appId}/users/${user.uid}/sales`, id), { mamaPaid: status, mamaPaidAt: status ? serverTimestamp() : null }));
      await batch.commit();
      setSelectedMamaSales([]);
      showToast('Payment Status Updated!');
    } catch { showToast('Error updating status', 'error'); }
  };

  const toggle = (id) => setSelectedMamaSales(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const pendingAll = sales.filter(s => !s.mamaPaid);
  const allSelected = pendingAll.length > 0 && pendingAll.every(s => selectedMamaSales.includes(s.id));

  const activeList = mamaTab === 'pending' ? sortedPending : sortedPaid;

  return (
    <div className="space-y-4 pb-20">

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="Total"   value={formatCurrency(stats.mamaTotal)}   cls="text-info" />
        <StatCard label="Pending" value={formatCurrency(stats.mamaPending)} cls="text-warning" />
        <StatCard label="Paid"    value={formatCurrency(stats.mamaPaid)}    cls="text-success" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2" role="tablist">
        {[
          { id: 'pending', label: 'Pending', icon: AlertTriangle, activeCls: 'bg-warning/10 text-warning border-warning/30' },
          { id: 'paid',    label: 'History', icon: History,       activeCls: 'bg-success/10 text-success border-success/30' },
        ].map(tab => {
          const active = mamaTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setMamaTab(tab.id)}
              role="tab" aria-selected={active}
              className={`ui-tab ${active ? tab.activeCls : 'ui-tab-inactive'}`}
            >
              <tab.icon size={16}/> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Table card */}
      <div className="ui-card overflow-hidden">
        <div className="flex justify-between items-center gap-3 px-4 sm:px-5 py-3 min-h-[3.5rem] border-b border-line">
          <h3 className="ui-section-title text-sm sm:text-base flex items-center gap-2 min-w-0">
            {mamaTab === 'pending' ? <AlertTriangle size={16} className="shrink-0 text-warning"/> : <History size={16} className="shrink-0 text-success"/>}
            <span className="truncate">{mamaTab === 'pending' ? 'Pending Payments' : 'Payment History'}</span>
          </h3>
          {mamaTab === 'pending' && selectedMamaSales.length > 0 && (
            <button onClick={() => handleMarkPaid(true)}
              className="ui-btn-tint shrink-0 bg-success/10 text-success border-success/30 hover:bg-success/20"
            >Mark Paid ({selectedMamaSales.length})</button>
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-line-subtle">
          {activeList.length === 0 ? (
            <p className="ui-empty py-10">
              {mamaTab === 'pending' ? 'No pending payments' : 'No history'}
            </p>
          ) : activeList.map((s) => (
            <div key={s.id}
              onClick={() => mamaTab === 'pending' && toggle(s.id)}
              className={`flex items-center gap-3 px-4 py-3 min-h-[3.5rem] transition-colors duration-150 ${mamaTab === 'pending' ? 'cursor-pointer' : ''} ${selectedMamaSales.includes(s.id) ? 'bg-accent/10' : ''}`}
            >
              {mamaTab === 'pending' && <input type="checkbox" readOnly tabIndex={-1} checked={selectedMamaSales.includes(s.id)} className="w-5 h-5 shrink-0 accent-accent pointer-events-none"/>}
              <div className="flex-1 min-w-0">
                <p className="font-semibold font-mono text-sm truncate text-fg">{s.suitId}</p>
                <p className="text-xs truncate text-fg-subtle">{s.brand}</p>
              </div>
              <span className={`font-semibold text-sm tabular-nums shrink-0 ${mamaTab === 'pending' ? 'text-warning' : 'text-success'}`}>{formatCurrency(s.mamaShare)}</span>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-auto">
          <table className="w-full text-sm table-fixed">
            <thead className="ui-table-head">
              <tr>
                {mamaTab === 'pending' && (
                  <th className="px-4 py-3 w-14 text-center">
                    <input type="checkbox" aria-label="Select all pending" checked={allSelected} onChange={() => setSelectedMamaSales(allSelected ? [] : pendingAll.map(s => s.id))} className="w-4 h-4 accent-accent cursor-pointer align-middle"/>
                  </th>
                )}
                <th className="px-4 py-3 text-left">Item Details</th>
                {mamaTab === 'paid' && <th className="px-2 py-3 text-center">Paid Date</th>}
                <th className="px-4 py-3 text-right w-36">Share Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {activeList.length === 0 ? (
                <tr><td colSpan="3" className="ui-empty p-12">
                  {mamaTab === 'pending' ? 'No pending payments' : 'No history'}
                </td></tr>
              ) : activeList.map((s) => (
                <tr key={s.id}
                  className={`transition-colors duration-150 ${mamaTab === 'pending' ? 'cursor-pointer' : ''} ${selectedMamaSales.includes(s.id) ? 'bg-accent/10' : 'hover:bg-elevated'}`}
                  onClick={() => mamaTab === 'pending' && toggle(s.id)}
                >
                  {mamaTab === 'pending' && (
                    <td className="px-4 py-3.5 text-center">
                      <input type="checkbox" readOnly tabIndex={-1} checked={selectedMamaSales.includes(s.id)} className="w-4 h-4 accent-accent pointer-events-none align-middle"/>
                    </td>
                  )}
                  <td className="px-4 py-3.5 font-medium text-fg truncate">
                    <span className="font-mono">{s.suitId}</span> <span className="text-xs font-normal ml-1 text-fg-subtle">({s.brand})</span>
                  </td>
                  {mamaTab === 'paid' && (
                    <td className="px-2 py-3.5 text-center text-xs text-fg-subtle">
                      {s.mamaPaidAt ? new Date(s.mamaPaidAt.seconds * 1000).toLocaleDateString() : '—'}
                    </td>
                  )}
                  <td className={`px-4 py-3.5 text-right font-semibold tabular-nums ${mamaTab === 'pending' ? 'text-warning' : 'text-success'}`}>{formatCurrency(s.mamaShare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}