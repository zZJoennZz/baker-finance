// components/UnmatchedSection.tsx
import { PayoutRecord } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { AlertCircle } from 'lucide-react';

interface UnmatchedSectionProps {
  results: PayoutRecord[];
  totalUnmatched: number;
}

export function UnmatchedSection({ results, totalUnmatched }: UnmatchedSectionProps) {
  const hasUnmatched = results.some(payout => payout.uncategorized?.length > 0);
  
  if (!hasUnmatched) return null;
  
  const totalUnmatchedAmount = results.reduce(
    (sum, payout) => sum + (payout.uncategorized?.reduce((s, item) => s + item.Amount, 0) || 0),
    0
  );
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-4 bg-amber-50 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-amber-900">Unmatched Transactions</h3>
          <span className="text-sm text-amber-700">({totalUnmatched} records)</span>
        </div>
        <p className="text-sm text-amber-700 mt-1">
          These transactions couldn't be matched to any sales records. Please review them manually.
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-amber-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-amber-900">Source File</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-amber-900">Transaction Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-amber-900">Order Number</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-amber-900">Type</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-amber-900">Amount</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {results.map((payout, idx) => (
              payout.uncategorized?.map((item, itemIdx) => (
                <tr key={`${idx}-${itemIdx}`} className="hover:bg-amber-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600">{payout.filename}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.Transaction_Date)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{item.Order_Number}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                      {item.Type || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono font-medium text-amber-600">
                    {formatCurrency(item.Amount)}
                  </td>
                </tr>
              ))
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-right text-gray-700">
                Total Unmatched:
              </td>
              <td className="px-4 py-3 text-sm font-bold text-right text-amber-600">
                {formatCurrency(totalUnmatchedAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}