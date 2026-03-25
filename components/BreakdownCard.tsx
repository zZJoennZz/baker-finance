// components/BreakdownCard.tsx
import { Breakdown } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface BreakdownCardProps {
  breakdown: Breakdown;
  refunds: number;
}

export function BreakdownCard({ breakdown, refunds }: BreakdownCardProps) {
  return (
    <div className="grid grid-cols-5 gap-3 mt-2 pt-2 border-t border-bakery-200">
      <BreakdownItem 
        label="Gross Amount" 
        value={formatCurrency(breakdown.gross_amount)} 
        bgColor="bg-green-50" 
        textColor="text-green-700"
        labelColor="text-green-600"
      />
      <BreakdownItem 
        label="Fees" 
        value={`-${formatCurrency(breakdown.fees)}`} 
        bgColor="bg-red-50" 
        textColor="text-red-700"
        labelColor="text-red-600"
      />
      <BreakdownItem 
        label="Refunds" 
        value={`-${formatCurrency(refunds)}`} 
        bgColor="bg-orange-50" 
        textColor="text-orange-700"
        labelColor="text-orange-600"
      />
      <BreakdownItem 
        label="Adjustments" 
        value={formatCurrency(breakdown.adjustments)} 
        bgColor="bg-yellow-50" 
        textColor="text-yellow-700"
        labelColor="text-yellow-600"
      />
      <BreakdownItem 
        label="Net Amount" 
        value={formatCurrency(breakdown.net_amount)} 
        bgColor="bg-blue-50" 
        textColor="text-blue-700"
        labelColor="text-blue-600"
      />
    </div>
  );
}

interface BreakdownItemProps {
  label: string;
  value: string;
  bgColor: string;
  textColor: string;
  labelColor: string;
}

function BreakdownItem({ label, value, bgColor, textColor, labelColor }: BreakdownItemProps) {
  return (
    <div className={`${bgColor} rounded-lg p-2 text-center`}>
      <p className={`text-xs ${labelColor} font-medium`}>{label}</p>
      <p className={`text-sm font-bold ${textColor}`}>{value}</p>
    </div>
  );
}