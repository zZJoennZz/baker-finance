// types.ts - Updated with category totals
export interface CategoryTotals {
  sales_amount: number;
  refund_amount: number;
  net_amount: number;
  transaction_count: number;
}

export interface PayoutRecord {
  filename: string;
  data: PayoutItem[];
  category_totals: Record<string, CategoryTotals>; // Grouped by category
  uncategorized: UncategorizedItem[];
  total_orders: number;
  matched_orders: number;
  payout_dates: {
    min: string;
    max: string;
  };
  breakdown: Breakdown;
}

export interface PayoutItem {
  Transaction_Date: string;
  Payout_Date: string;
  Order_Number: string;
  Category: string;
  Amount: number;
  Type: 'Sale' | 'Refund';
}

export interface UncategorizedItem {
  Transaction_Date: string;
  Payout_Date: string;
  Order_Number: string;
  Category: string;
  Amount: number;
  Type: string;
}

export interface Breakdown {
  gross_amount: number;
  fees: number;
  net_amount: number;
  refunds: number;
  adjustments: number;
}

export interface Stats {
  total_payouts: number;
  total_sales_matched: number;
  total_fees: number;
  total_refunds: number;
  total_adjustments: number;
  categories: Record<string, number>;
}

export interface ReconciliationResult {
  excel: string;
  results: PayoutRecord[];
  stats: Stats;
}