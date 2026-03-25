// components/PayoutSection.tsx - Updated with category totals
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { PayoutRecord } from '@/types';
import { BreakdownCard } from './BreakdownCard';
import { CategoryTotalsCard } from './CategoryTotalsCard';
import { PayoutTable } from './PayoutTable';
import { formatCurrency } from '@/utils/formatters';

interface PayoutSectionProps {
  payout: PayoutRecord;
  index: number;
  isExpanded: boolean;
  dateRange: string;
  unmatchedCount: number;
  onToggle: () => void;
}

export function PayoutSection({ 
  payout, 
  index, 
  isExpanded, 
  dateRange, 
  unmatchedCount, 
  onToggle 
}: PayoutSectionProps) {
  const totalAmount = payout.data.reduce((sum, item) => sum + item.Amount, 0);
  const totalRefunds = payout.data
    .filter(item => item.Type === 'Refund')
    .reduce((sum, item) => sum + Math.abs(item.Amount), 0);
  const totalSales = payout.data
    .filter(item => item.Type === 'Sale')
    .reduce((sum, item) => sum + item.Amount, 0);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div 
        className="p-4 bg-gradient-to-r from-bakery-50 to-white border-b border-gray-200 cursor-pointer hover:from-bakery-100 transition-colors"
        onClick={onToggle}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-bakery-600" />
                <h3 className="text-lg font-semibold text-bakery-900">
                  Payout: {dateRange}
                </h3>
              </div>
              {unmatchedCount > 0 && (
                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                  {unmatchedCount} unmatched
                </span>
              )}
            </div>
            <div className="flex gap-6 text-sm mb-2">
              <div className="text-gray-600">
                <span className="font-medium">{payout.data.length}</span> total items
              </div>
              <div className="text-gray-600">
                Sales: <span className="font-semibold text-green-600">{formatCurrency(totalSales)}</span>
              </div>
              <div className="text-gray-600">
                Refunds: <span className="font-semibold text-red-600">-{formatCurrency(totalRefunds)}</span>
              </div>
              <div className="text-gray-600">
                Net: <span className="font-semibold text-bakery-700">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="text-gray-500 text-xs">
                Source: {payout.filename}
              </div>
            </div>
            
            <BreakdownCard breakdown={payout.breakdown} refunds={totalRefunds} />
            
            {/* Category Totals Section - NEW */}
            <CategoryTotalsCard categoryTotals={payout.category_totals} />
          </div>
          <div className="text-bakery-600 ml-4">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {isExpanded && payout.data.length > 0 && (
        <PayoutTable data={payout.data} />
      )}

      {isExpanded && payout.data.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No transactions match your filters
        </div>
      )}
    </div>
  );
}