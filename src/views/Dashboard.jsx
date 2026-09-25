import React from 'react';
import { Layers, TrendingUp, CreditCard, Wallet, Package, Users } from 'lucide-react';
import { Card } from '../components/ui/UIComponents';
import { formatCurrency } from '../utils/helpers';

export default function Dashboard({ stats, sales }) {
  return (
    <div className="space-y-5 pb-20">

      {/* Row 1 — 5 KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <Card title="Capital"         value={formatCurrency(stats.capital)}       subtext="Total Investment"  icon={Layers}     />
        <Card title="Net Profit"      value={formatCurrency(stats.profit)}        subtext="After Partner Share" icon={TrendingUp} />
        <Card title="Pending"         value={formatCurrency(stats.receivable)}    subtext="Customer Debt"     icon={CreditCard} />
        <Card title="Received"        value={formatCurrency(stats.received)}      subtext="Cash Collected"    icon={Wallet}     />
        <div className="col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-1">
          <Card title="Stock Available" value={`${stats.stockCount} Items`}         subtext={`Val: ${formatCurrency(stats.stockValue)}`} icon={Package} highlight />
        </div>
      </div>

      {/* Row 2 — Partner Share card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card
          title="Partner Share Given"
          value={formatCurrency(stats.mamaTotal)}
          subtext={`Paid: ${formatCurrency(stats.mamaPaid)}  ·  Due: ${formatCurrency(stats.mamaPending)}`}
          icon={Users}
        />
      </div>

      {/* Recent Sales */}
      <div className="ui-card overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-line">
          <h3 className="ui-section-title">Recent Sales</h3>
        </div>
        <div className="divide-y divide-line-subtle">
          {sales.length === 0 ? (
            <p className="ui-empty py-10">No sales yet</p>
          ) : (
            sales.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="ui-row flex justify-between items-center gap-3 px-4 sm:px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate text-fg">{s.customerName}</p>
                  <p className="font-mono text-xs mt-0.5 text-fg-subtle">{s.suitId}</p>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <p className="font-semibold text-sm text-success">+{formatCurrency(s.salePrice)}</p>
                  <p className="text-xs mt-0.5 text-fg-subtle">Profit: {formatCurrency(s.profit - s.mamaShare)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}