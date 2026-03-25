// components/PayoutTable.tsx
import { PayoutItem } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface PayoutTableProps {
  data: PayoutItem[];
}

export function PayoutTable({ data }: PayoutTableProps) {
  const totalAmount = data.reduce((sum, item) => sum + item.Amount, 0);
  const totalSales = data.filter(item => item.Type === 'Sale').reduce((sum, item) => sum + item.Amount, 0);
  const totalRefunds = data.filter(item => item.Type === 'Refund').reduce((sum, item) => sum + Math.abs(item.Amount), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-bakery-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-bakery-900">Transaction Date</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-bakery-900">Order Number</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-bakery-900">Type</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-bakery-900">Category</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-bakery-900">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((item, idx) => (
            <tr key={idx} className={`hover:bg-gray-50 transition-colors ${item.Type === 'Refund' ? 'bg-red-50/30' : ''}`}>
              <td className="px-4 py-3 text-sm text-gray-600">
                {formatDate(item.Transaction_Date || item.Payout_Date)}
              </td>
              <td className="px-4 py-3 text-sm font-mono text-gray-900">
                {item.Order_Number}
              </td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.Type === 'Refund' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {item.Type}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className="px-2 py-1 bg-bakery-100 text-bakery-700 rounded-full text-xs">
                  {item.Category}
                </span>
              </td>
              <td className={`px-4 py-3 text-sm text-right font-mono font-medium ${
                item.Type === 'Refund' ? 'text-red-600' : 'text-gray-900'
              }`}>
                {item.Type === 'Refund' ? '-' : ''}{formatCurrency(Math.abs(item.Amount))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 border-t border-gray-200">
          <tr>
            <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-right text-gray-700">
              Total:
            </td>
            <td className="px-4 py-3 text-sm font-bold text-right text-bakery-900">
              {formatCurrency(totalAmount + totalRefunds)}
            </td>
          </tr>
          <tr className="bg-gray-50">
            <td colSpan={4} className="px-4 py-2 text-xs text-right text-gray-500">
              Sales Total:
            </td>
            <td className="px-4 py-2 text-xs text-right text-green-600 font-medium">
              {formatCurrency(totalSales)}
            </td>
          </tr>
          {totalRefunds > 0 && (
            <tr className="bg-gray-50">
              <td colSpan={4} className="px-4 py-2 text-xs text-right text-gray-500">
                Refunds Total:
              </td>
              <td className="px-4 py-2 text-xs text-right text-red-600 font-medium">
                -{formatCurrency(totalRefunds)}
              </td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
}