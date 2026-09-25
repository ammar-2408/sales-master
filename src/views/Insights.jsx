import React, { useState, useMemo } from 'react';
import { AlertCircle, Trophy, CheckCircle, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';

export default function Insights({ customers, setViewingCustomer, setCustomerModalTab }) {
  const [insightView, setInsightView] = useState(null);

  const riskCustomers = useMemo(() => {
    const now = new Date();
    return customers.filter(c => {
      if (c.status === 'deleted') return false;
      const bal = (c.totalBill || 0) - (c.totalPaid || 0);
      if (bal <= 0) return false;
      const lastActivity = c.lastPaymentDate || c.lastUpdated || c.joinedAt;
      if (!lastActivity) return false;
      const diffDays = Math.ceil(Math.abs(now - new Date(lastActivity.seconds * 1000)) / (1000 * 60 * 60 * 24));
      return diffDays > 30;
    });
  }, [customers]);

  const highVolumeCustomers = useMemo(() =>
    customers.filter(c => c.status !== 'deleted' && ((c.totalBill || 0) - (c.totalPaid || 0)) > 10000),
    [customers]);

  const activeList  = insightView === 'risk' ? riskCustomers : highVolumeCustomers;
  const isRiskView  = insightView === 'risk';

  const insightCards = [
    {
      id: 'risk',
      icon: AlertCircle,
      iconCls: 'bg-danger/10 text-danger',
      hoverCls: 'hover:border-danger/40',
      count: riskCustomers.length,
      title: 'Payment Risk',
      desc: 'Customers with pending balance and no payment in the last 30 days.',
    },
    {
      id: 'highVol',
      icon: Trophy,
      iconCls: 'bg-warning/10 text-warning',
      hoverCls: 'hover:border-warning/40',
      count: highVolumeCustomers.length,
      title: 'High Debt Volume',
      desc: 'Customers with remaining balance greater than Rs 10,000.',
    },
  ];

  return (
    <div className="flex flex-col pb-20 md:h-full md:overflow-hidden">
      <div className="flex flex-col md:h-full">

        {/* Landing cards */}
        {!insightView && (
          <>
            <h2 className="ui-title mb-5">Business Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:overflow-y-auto">
              {insightCards.map(card => (
                <div
                  key={card.id}
                  onClick={() => setInsightView(card.id)}
                  className={`ui-card-interactive p-5 sm:p-6 ${card.hoverCls}`}
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className={`p-3 rounded-xl ${card.iconCls}`}>
                      <card.icon size={22}/>
                    </div>
                    <span className="text-4xl font-bold tabular-nums text-fg">{card.count}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-1 text-fg">{card.title}</h3>
                  <p className="text-sm text-fg-subtle">{card.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Detail view */}
        {insightView && (
          <div className="flex flex-col md:h-full md:overflow-hidden">
            <div className="shrink-0 mb-4">
              <button
                onClick={() => setInsightView(null)}
                className="ui-btn-secondary mb-4 px-3"
              >
                <ArrowLeft size={16}/> Back to Insights
              </button>
              <h3 className="ui-title flex items-center gap-2">
                {isRiskView
                  ? <AlertCircle size={20} className="shrink-0 text-danger"/>
                  : <Trophy size={20} className="shrink-0 text-warning"/>}
                {isRiskView ? 'Payment Risk List' : 'High Debt Customers'}
              </h3>
              <p className="text-sm mt-1 text-fg-subtle">
                {isRiskView ? "Customers who owe money and haven't paid in 30+ days." : 'Customers with pending balance exceeding Rs 10,000.'}
              </p>
            </div>

            <div className="flex-1 md:overflow-y-auto min-h-0 pb-4">
              {activeList.length === 0 ? (
                <div className="py-12 md:py-0 md:h-full flex flex-col items-center justify-center text-center">
                  <div className="p-6 rounded-full mb-4 bg-surface">
                    <CheckCircle size={48} className={isRiskView ? 'text-success' : 'text-info'}/>
                  </div>
                  <h4 className="text-lg font-semibold mb-1 text-fg">{isRiskView ? 'No Risk Customers' : 'No High Debt'}</h4>
                  <p className="text-sm text-fg-subtle">{isRiskView ? 'Everyone has paid recently or has no due balance.' : 'No customer currently exceeds the high debt limit.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeList.map(c => {
                    const lastActivity = c.lastPaymentDate || c.lastUpdated || c.joinedAt;
                    const balance = (c.totalBill || 0) - (c.totalPaid || 0);
                    return (
                      <div
                        key={c.id}
                        onClick={() => { setViewingCustomer(c); setCustomerModalTab('payments'); }}
                        className="ui-card-interactive p-4"
                      >
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <p className="font-semibold text-base truncate text-fg">{c.name}</p>
                          <span className={`font-semibold text-sm whitespace-nowrap tabular-nums ${isRiskView ? 'text-danger' : 'text-warning'}`}>{formatCurrency(balance)}</span>
                        </div>
                        <div className="space-y-1 mb-3 text-xs text-fg-subtle">
                          <div className="flex justify-between gap-2"><span>Total Bill:</span><span className="tabular-nums text-fg-muted">{formatCurrency(c.totalBill)}</span></div>
                          <div className="flex justify-between gap-2"><span>Last Active:</span><span className="tabular-nums text-fg-muted">{lastActivity ? new Date(lastActivity.seconds * 1000).toLocaleDateString() : 'N/A'}</span></div>
                        </div>
                        <button className="ui-btn-tint w-full bg-white/5 text-fg-muted border-line hover:text-fg">View Details</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}