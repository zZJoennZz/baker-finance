import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export const config = {
  api: {
    bodyParser: false,
    maxDuration: 60,
  },
};

interface PayoutRecord {
  filename: string;
  data: any[];
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
    
    // Separate positive sales and negative refunds
    const salesDF = salesData.map((row: any) => ({
      Order_Number: row['Order name'] || row['Order_Number'] || '',
      Sales_ID: row['Sale ID'] || row['Sales_ID'] || '',
      Category: row['Product type'] || row['Category'] || 'Uncategorized',
      Amount: parseFloat(row['Total sales'] || row['Amount'] || 0)
    })).filter(row => row.Order_Number);

    const positiveSales = salesDF.filter(row => row.Amount > 0);
    const refundSales = salesDF.filter(row => row.Amount < 0);
    
    // Group positive sales by order number
    const salesTotals = new Map();
    positiveSales.forEach(row => {
      const current = salesTotals.get(row.Order_Number) || 0;
      salesTotals.set(row.Order_Number, current + row.Amount);
    });
    
    // Group refunds by order number with their categories
    const refundsByOrder = new Map();
    refundSales.forEach(row => {
      const refunds = refundsByOrder.get(row.Order_Number) || [];
      refunds.push({
        Category: row.Category,
        Amount: Math.abs(row.Amount) // Store as positive for display
      });
      refundsByOrder.set(row.Order_Number, refunds);
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
      
      for (const row of payoutData) {
        const orderNumber = row[orderCol];
        const grossAmount = parseFloat(row['Amount'] || row['Gross_Amount'] || 0);
        const feeAmount = parseFloat(row['Fee'] || row['Fee_Amount'] || 0);
        const netAmount = parseFloat(row['Net'] || row['Net_Amount'] || 0);
        const refundAmount = parseFloat(row['Refund'] || row['Refund_Amount'] || 0);
        const adjustmentAmount = parseFloat(row['Adjustment'] || row['Adjustment_Amount'] || 0);
        const payoutDate = row['Payout Date'] || row['Payout_Date'] || '';
        const transactionType = (row['Type'] || row['Transaction Type'] || '').toLowerCase();
        
        breakdown.gross_amount += grossAmount;
        breakdown.fees += feeAmount;
        breakdown.net_amount += netAmount;
        breakdown.refunds += refundAmount;
        breakdown.adjustments += adjustmentAmount;

        // Check for refunds in this order
        const orderRefunds = refundsByOrder.get(orderNumber) || [];
        
        // Find matching sales for this order
        const matchingSales = positiveSales.filter(sale => sale.Order_Number === orderNumber);
        
        if (matchingSales.length === 0 && orderRefunds.length === 0) {
          // Uncategorized transaction
          uncategorizedData.push({
            Transaction_Date: row['Transaction Date'] || row['Transaction_Date'] || payoutDate,
            Payout_Date: payoutDate,
            Order_Number: orderNumber,
            Category: 'Uncategorized',
            Amount: grossAmount,
            Type: transactionType || 'Unknown'
          });
          continue;
        }

        // Process each transaction - combine sales and refunds
        const orderItems = [];
        
        // Add sales items
        if (matchingSales.length > 0) {
          const orderTotalSales = salesTotals.get(orderNumber) || 1;
          for (const sale of matchingSales) {
            const scaledAmount = (sale.Amount / orderTotalSales) * grossAmount;
            orderItems.push({
              Transaction_Date: row['Transaction Date'] || row['Transaction_Date'] || payoutDate,
              Payout_Date: payoutDate,
              Category: sale.Category,
              Amount: scaledAmount,
              Type: 'Sale',
              Order_Number: orderNumber
            });
            
            summaryStats.categories[sale.Category] = 
              (summaryStats.categories[sale.Category] || 0) + scaledAmount;
            summaryStats.total_sales_matched += scaledAmount;
          }
        }
        
        // Add refund items
        if (orderRefunds.length > 0) {
          for (const refund of orderRefunds) {
            orderItems.push({
              Transaction_Date: row['Transaction Date'] || row['Transaction_Date'] || payoutDate,
              Payout_Date: payoutDate,
              Category: refund.Category,
              Amount: -refund.Amount, // Negative amount for refunds
              Type: 'Refund',
              Order_Number: orderNumber
            });
            summaryStats.total_refunds += refund.Amount;
          }
        }
        
        processedData.push(...orderItems);
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
        uncategorized: uncategorizedData,
        total_orders: payoutData.length,
        matched_orders: processedData.filter(item => item.Type !== 'Refund').length,
        breakdown: breakdown
      });
    }

    // Create Excel file
    const workbook = XLSX.utils.book_new();
    const usedSheetNames = new Set<string>();
    
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