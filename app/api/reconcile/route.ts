// api/reconcile/route.ts - CORRECTED VERSION
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export const config = {
  api: {
    bodyParser: false,
    maxDuration: 60,
  },
};

interface CategoryTotals {
  sales_amount: number;
  refund_amount: number;
  net_amount: number;
  transaction_count: number;
}

interface PayoutRecord {
  filename: string;
  data: any[];
  category_totals: Record<string, CategoryTotals>;
  uncategorized: any[];
  total_orders: number;
  matched_orders: number;
  payout_dates: any;
  breakdown: {
    gross_amount: number;
    fees: number;
    net_amount: number;
    refunds: number;
    adjustments: number;
  };
}

function sanitizeSheetName(name: string): string {
  let sanitized = name.replace(/[:\\\/\?\*\[\]]/g, '_');
  sanitized = sanitized.replace(/[^a-zA-Z0-9_\-]/g, '_');
  sanitized = sanitized.replace(/_+/g, '_');
  sanitized = sanitized.replace(/^_+|_+$/g, '');
  
  if (sanitized.length > 0 && !/^[A-Za-z_]/.test(sanitized)) {
    sanitized = 'Sheet_' + sanitized;
  }
  
  if (sanitized.length === 0) {
    sanitized = 'Sheet';
  }
  
  if (sanitized.length > 31) {
    sanitized = sanitized.slice(0, 31);
  }
  
  return sanitized;
}

function getUniqueSheetName(baseName: string, existingNames: Set<string>): string {
  let sanitized = sanitizeSheetName(baseName);
  
  if (existingNames.has(sanitized)) {
    let counter = 1;
    let uniqueName = '';
    
    while (counter <= 100) {
      const suffix = `_${counter}`;
      const maxBaseLength = 31 - suffix.length;
      
      let truncatedBase = sanitized;
      if (sanitized.length > maxBaseLength) {
        truncatedBase = sanitized.slice(0, maxBaseLength);
        truncatedBase = truncatedBase.replace(/_$/, '');
      }
      
      uniqueName = truncatedBase + suffix;
      
      if (!existingNames.has(uniqueName)) {
        break;
      }
      counter++;
    }
    
    sanitized = uniqueName;
  }
  
  existingNames.add(sanitized);
  return sanitized;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const salesFile = formData.get('sales') as File;
    const payoutFiles = formData.getAll('payouts') as File[];

    if (!salesFile || payoutFiles.length === 0) {
      return NextResponse.json(
        { error: 'Sales file and at least one payout file required' },
        { status: 400 }
      );
    }

    // Parse sales CSV
    const salesText = await salesFile.text();
    const salesData = Papa.parse(salesText, { header: true, skipEmptyLines: true }).data;
    
    // Create a map of sales by order number with their categories and amounts
    // Each order can have multiple line items (different products)
    const salesByOrder = new Map();
    salesData.forEach((row: any) => {
      const orderNumber = row['Order name'] || row['Order_Number'] || '';
      const category = row['Product type'] || row['Category'] || 'Uncategorized';
      const amount = parseFloat(row['Total sales'] || row['Amount'] || 0);
      
      if (!orderNumber) return;
      
      if (!salesByOrder.has(orderNumber)) {
        salesByOrder.set(orderNumber, []);
      }
      
      salesByOrder.get(orderNumber).push({
        category,
        amount,
        type: amount > 0 ? 'Sale' : 'Refund'
      });
    });

    const results: PayoutRecord[] = [];
    const summaryStats = {
      total_payouts: 0,
      total_sales_matched: 0,
      total_fees: 0,
      total_refunds: 0,
      total_adjustments: 0,
      categories: {} as Record<string, number>
    };

    for (const payoutFile of payoutFiles) {
      const payoutText = await payoutFile.text();
      let payoutData: any[] = Papa.parse(payoutText, { header: true, skipEmptyLines: true }).data;

      // Detect order column
      let orderCol = '';
      for (const key of Object.keys(payoutData[0] || {})) {
        const lowerKey = key.toLowerCase();
        if (['order', 'order name', 'order #', 'order id', 'order_number'].includes(lowerKey)) {
          orderCol = key;
          break;
        }
      }

      if (!orderCol) {
        results.push({
          filename: payoutFile.name,
          data: [],
          category_totals: {},
          uncategorized: [],
          total_orders: 0,
          matched_orders: 0,
          payout_dates: { min: '', max: '' },
          breakdown: {
            gross_amount: 0,
            fees: 0,
            net_amount: 0,
            refunds: 0,
            adjustments: 0
          }
        });
        continue;
      }

      let breakdown = {
        gross_amount: 0,
        fees: 0,
        net_amount: 0,
        refunds: 0,
        adjustments: 0
      };

      const processedData: any[] = [];
      const uncategorizedData: any[] = [];
      const categoryTotals: Record<string, CategoryTotals> = {};

      for (const row of payoutData) {
        const orderNumber = row[orderCol];
        const grossAmount = parseFloat(row['Amount'] || row['Gross_Amount'] || 0);
        const feeAmount = parseFloat(row['Fee'] || row['Fee_Amount'] || 0);
        const netAmount = parseFloat(row['Net'] || row['Net_Amount'] || 0);
        const refundAmount = parseFloat(row['Refund'] || row['Refund_Amount'] || 0);
        const adjustmentAmount = parseFloat(row['Adjustment'] || row['Adjustment_Amount'] || 0);
        const payoutDate = row['Payout Date'] || row['Payout_Date'] || '';
        const transactionDate = row['Transaction Date'] || row['Transaction_Date'] || payoutDate;
        const transactionType = (row['Type'] || row['Transaction Type'] || '').toLowerCase();
        
        breakdown.gross_amount += grossAmount;
        breakdown.fees += feeAmount;
        breakdown.net_amount += netAmount;
        breakdown.refunds += refundAmount;
        breakdown.adjustments += adjustmentAmount;
        
        // Find matching sales for this order
        const matchingSales = salesByOrder.get(orderNumber) || [];
        
        if (matchingSales.length === 0) {
          // Uncategorized transaction - no matching sales found
          uncategorizedData.push({
            Transaction_Date: transactionDate,
            Payout_Date: payoutDate,
            Order_Number: orderNumber,
            Category: 'Uncategorized',
            Amount: grossAmount,
            Type: transactionType || 'Unknown'
          });
          continue;
        }
        
        // For each matching sale line item, create a transaction record
        // This ensures 1:1 mapping between sales line items and payout items
        for (const sale of matchingSales) {
          const isRefund = sale.type === 'Refund';
          const amount = isRefund ? -Math.abs(sale.amount) : sale.amount;
          
          const transaction = {
            Transaction_Date: transactionDate,
            Payout_Date: payoutDate,
            Order_Number: orderNumber,
            Category: sale.category,
            Amount: amount,
            Type: isRefund ? 'Refund' : 'Sale'
          };
          
          processedData.push(transaction);
          
          // Update category totals
          if (!categoryTotals[sale.category]) {
            categoryTotals[sale.category] = {
              sales_amount: 0,
              refund_amount: 0,
              net_amount: 0,
              transaction_count: 0
            };
          }
          
          if (isRefund) {
            categoryTotals[sale.category].refund_amount += Math.abs(amount);
            categoryTotals[sale.category].net_amount += amount; // amount is negative here
          } else {
            categoryTotals[sale.category].sales_amount += amount;
            categoryTotals[sale.category].net_amount += amount;
          }
          categoryTotals[sale.category].transaction_count += 1;
          
          // Update summary stats
          if (isRefund) {
            summaryStats.total_refunds += Math.abs(amount);
          } else {
            summaryStats.total_sales_matched += amount;
          }
          summaryStats.categories[sale.category] = 
            (summaryStats.categories[sale.category] || 0) + amount;
        }
      }

      summaryStats.total_payouts += breakdown.gross_amount;
      summaryStats.total_fees += breakdown.fees;
      summaryStats.total_adjustments += breakdown.adjustments;

      results.push({
        filename: payoutFile.name,
        payout_dates: {
          min: payoutData.reduce((min, row) => {
            const date = row['Payout Date'] || row['Payout_Date'] || '';
            return date < min ? date : min;
          }, '9999-12-31'),
          max: payoutData.reduce((max, row) => {
            const date = row['Payout Date'] || row['Payout_Date'] || '';
            return date > max ? date : max;
          }, '')
        },
        data: processedData,
        category_totals: categoryTotals,
        uncategorized: uncategorizedData,
        total_orders: payoutData.length,
        matched_orders: processedData.filter(item => item.Type !== 'Refund').length,
        breakdown: breakdown
      });
    }

    // Create Excel file
    const workbook = XLSX.utils.book_new();
    const usedSheetNames = new Set<string>();
    
    // Create a summary sheet with category totals
    const categorySummaryData: any[] = [];
    results.forEach(result => {
      Object.entries(result.category_totals).forEach(([category, totals]) => {
        categorySummaryData.push({
          'Payout File': result.filename,
          'Category': category,
          'Sales Amount': totals.sales_amount,
          'Refund Amount': totals.refund_amount,
          'Net Amount': totals.net_amount,
          'Transaction Count': totals.transaction_count
        });
      });
    });
    
    if (categorySummaryData.length > 0) {
      const categorySheet = XLSX.utils.json_to_sheet(categorySummaryData);
      const categorySheetName = getUniqueSheetName('Category_Summary', usedSheetNames);
      XLSX.utils.book_append_sheet(workbook, categorySheet, categorySheetName);
    }
    
    const allData = results.flatMap(result => 
      result.data.map(row => ({
        Source_File: result.filename,
        ...row
      }))
    );
    
    if (allData.length > 0) {
      const summarySheet = XLSX.utils.json_to_sheet(allData);
      const summarySheetName = getUniqueSheetName('Summary_All', usedSheetNames);
      XLSX.utils.book_append_sheet(workbook, summarySheet, summarySheetName);
    }
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      
      // Create a category totals sheet for this payout
      if (Object.keys(result.category_totals).length > 0) {
        const categoryData = Object.entries(result.category_totals).map(([category, totals]) => ({
          Category: category,
          'Sales Amount': totals.sales_amount,
          'Refund Amount': totals.refund_amount,
          'Net Amount': totals.net_amount,
          'Transaction Count': totals.transaction_count
        }));
        const categorySheet = XLSX.utils.json_to_sheet(categoryData);
        let baseName = `${result.filename.replace(/\.csv$/i, '')}_Categories`;
        
        if (baseName.length > 25) {
          baseName = `File_${i + 1}_Categories`;
        }
        
        const sheetName = getUniqueSheetName(baseName, usedSheetNames);
        XLSX.utils.book_append_sheet(workbook, categorySheet, sheetName);
      }
      
      if (result.data.length > 0) {
        const sheet = XLSX.utils.json_to_sheet(result.data);
        let baseName = result.filename.replace(/\.csv$/i, '');
        
        if (baseName.length > 25) {
          baseName = `File_${i + 1}`;
        }
        
        const sheetName = getUniqueSheetName(baseName, usedSheetNames);
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
      }
      
      if (result.uncategorized.length > 0) {
        const uncSheet = XLSX.utils.json_to_sheet(result.uncategorized);
        let baseName = `Uncat_${result.filename.replace(/\.csv$/i, '')}`;
        
        if (baseName.length > 23) {
          baseName = `Uncat_${i + 1}`;
        }
        
        const uncSheetName = getUniqueSheetName(baseName, usedSheetNames);
        XLSX.utils.book_append_sheet(workbook, uncSheet, uncSheetName);
      }
    }
    
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const excelBase64 = excelBuffer.toString('base64');
    
    return NextResponse.json({
      excel: excelBase64,
      results: results,
      stats: summaryStats
    });
    
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}