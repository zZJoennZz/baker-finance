// components/StatsHeader.tsx
import { Download, ChevronUp, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface StatsHeaderProps {
  stats: {
    total_payouts: number;
    total_fees: number;
    total_refunds: number;
    total_adjustments: number;
    total_sales_matched: number;
  };
  totalMatched: number;
  totalUnmatched: number;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onDownload: () => void;
}

export function StatsHeader({ 
  stats, 
  totalMatched, 
  totalUnmatched, 
  onExpandAll, 
  onCollapseAll, 
  onDownload 
}: StatsHeaderProps) {
  const netReceived = stats.total_payouts - stats.total_fees - stats.total_refunds + stats.total_adjustments;
  const matchRate = (stats.total_sales_matched / stats.total_payouts) * 100;

  return (
    <div className="bg-gradient-to-r from-bakery-700 to-bakery-800 text-white rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-bold">Reconciliation Results</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onExpandAll} className="px-3 py-1 bg-white/20 rounded-lg text-sm hover:bg-white/30">
            Expand All
          </button>
          <button onClick={onCollapseAll} className="px-3 py-1 bg-white/20 rounded-lg text-sm hover:bg-white/30">
            Collapse All
          </button>
          <button onClick={onDownload} className="btn-primary bg-white text-bakery-800 hover:bg-bakery-100">
            <Download className="w-4 h-4 mr-2" />
            Download Excel
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4 mt-6">
        <StatCard title="Total Gross" value={formatCurrency(stats.total_payouts)} />
        <StatCard title="Total Fees" value={`-${formatCurrency(stats.total_fees)}`} />
        <StatCard title="Total Refunds" value={`-${formatCurrency(stats.total_refunds)}`} />
        <StatCard title="Net Received" value={formatCurrency(netReceived)} />
      </div>
      
      <div className="grid grid-cols-3 gap-4 mt-4">
        <StatCard 
          title="Matched Sales" 
          value={formatCurrency(stats.total_sales_matched)} 
          size="sm"
        />
        <StatCard 
          title="Match Rate" 
          value={`${matchRate.toFixed(1)}%`} 
          size="sm"
        />
        <StatCard 
          title="Transactions" 
          value={`${totalMatched + totalUnmatched}`}
          subtitle={`${totalMatched} matched, ${totalUnmatched} unmatched`}
          size="sm"
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, size = 'default' }: { 
  title: string; 
  value: string; 
  subtitle?: string;
  size?: 'default' | 'sm';
}) {
  return (
    <div className="bg-white/10 rounded-lg p-3">
      <p className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-bakery-200`}>{title}</p>
      <p className={`${size === 'sm' ? 'text-lg' : 'text-2xl'} font-bold`}>{value}</p>
      {subtitle && <p className="text-xs text-bakery-200">{subtitle}</p>}
    </div>
  );
}