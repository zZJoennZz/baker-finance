// components/CategoryTotalsCard.tsx
import { CategoryTotals } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface CategoryTotalsCardProps {
  categoryTotals: Record<string, CategoryTotals>;
}

export function CategoryTotalsCard({ categoryTotals }: CategoryTotalsCardProps) {
  const categories = Object.entries(categoryTotals);
  
  if (categories.length === 0) return null;
  
  return (
    <div className="mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700">Category Breakdown</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Category</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Sales</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Refunds</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Net</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Transactions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map(([category, totals]) => (
              <tr key={category} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-left font-medium text-gray-900">
                  <span className="px-2 py-1 bg-bakery-100 text-bakery-700 rounded-full text-xs">
                    {category}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-green-600">
                  {formatCurrency(totals.sales_amount)}
                </td>
                <td className="px-4 py-2 text-right text-red-600">
                  -{formatCurrency(totals.refund_amount)}
                </td>
                <td className="px-4 py-2 text-right font-semibold text-bakery-700">
                  {formatCurrency(totals.net_amount)}
                </td>
                <td className="px-4 py-2 text-right text-gray-600">
                  {totals.transaction_count}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total</td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-green-600">
                {formatCurrency(categories.reduce((sum, [_, t]) => sum + t.sales_amount, 0))}
              </td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-red-600">
                -{formatCurrency(categories.reduce((sum, [_, t]) => sum + t.refund_amount, 0))}
              </td>
              <td className="px-4 py-2 text-right text-sm font-bold text-bakery-800">
                {formatCurrency(categories.reduce((sum, [_, t]) => sum + t.net_amount, 0))}
              </td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                {categories.reduce((sum, [_, t]) => sum + t.transaction_count, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}