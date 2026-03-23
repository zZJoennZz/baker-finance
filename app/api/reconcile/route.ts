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
  payout_dates: any,
}

// Helper function to sanitize sheet names for Excel
function sanitizeSheetName(name: string): string {
  // Excel forbidden characters: : \ / ? * [ ]
  let sanitized = name.replace(/[:\\\/\?\*\[\]]/g, '_');
  
  // Replace any other special characters (including |) with underscore
  // This regex matches any character that's not a letter, number, underscore, or hyphen
  sanitized = sanitized.replace(/[^a-zA-Z0-9_\-]/g, '_');
  
  // Replace multiple underscores with single underscore
  sanitized = sanitized.replace(/_+/g, '_');
  
  // Remove leading/trailing underscores
  sanitized = sanitized.replace(/^_+|_+$/g, '');
  
  // Ensure first character is a letter or underscore (Excel requirement)
  if (sanitized.length > 0 && !/^[A-Za-z_]/.test(sanitized)) {
    sanitized = 'Sheet_' + sanitized;
  }
  
  // If empty after sanitization, provide a default
  if (sanitized.length === 0) {
    sanitized = 'Sheet';
  }
  
  // Trim to Excel's 31 character limit
  if (sanitized.length > 31) {
    sanitized = sanitized.slice(0, 31);
  }
  
  return sanitized;
}

// Helper function to create unique sheet names
function getUniqueSheetName(baseName: string, existingNames: Set<string>): string {
  // First sanitize the base name
  let sanitized = sanitizeSheetName(baseName);
  
  // If the name is already taken, add a number suffix
  if (existingNames.has(sanitized)) {
    let counter = 1;
    let uniqueName = '';
    
    // Try different suffixes until we find a unique name within 31 chars
    while (counter <= 100) {
      const suffix = `_${counter}`;
      const maxBaseLength = 31 - suffix.length;
      
      // Truncate base name if needed
      let truncatedBase = sanitized;
      if (sanitized.length > maxBaseLength) {
        truncatedBase = sanitized.slice(0, maxBaseLength);
        // Remove trailing underscore if we truncated in the middle of one
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
    
    // Standardize sales column names
    const salesDF = salesData.map((row: any) => ({
      Order_Number: row['Order name'] || row['Order_Number'] || '',
      Sales_ID: row['Sale ID'] || row['Sales_ID'] || '',
      Category: row['Product type'] || row['Category'] || 'Uncategorized',
      Amount: parseFloat(row['Total sales'] || row['Amount'] || 0)
    })).filter(row => row.Order_Number);

    // Group sales by order number to get totals
    const salesTotals = new Map();
    salesDF.forEach(row => {
      const current = salesTotals.get(row.Order_Number) || 0;
      salesTotals.set(row.Order_Number, current + row.Amount);
    });

    // Process each payout file
    const results: PayoutRecord[] = [];
    const summaryStats = {
      total_payouts: 0,
      total_sales_matched: 0,
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
          payout_dates: [],
        });
        continue;
      }

      // Process each payout transaction
      const processedData: any[] = [];
      const uncategorizedData: any[] = [];
      let totalPayoutAmount = 0;
      for (const row of payoutData) {
        const orderNumber = row[orderCol];
        const grossAmount = parseFloat(row['Amount'] || row['Gross_Amount'] || 0);
        const payoutDate = row['Payout Date'] || row['Payout_Date'] || '';
        
        totalPayoutAmount += grossAmount;

        // Find matching sales for this order
        const matchingSales = salesDF.filter(sale => sale.Order_Number === orderNumber);
        
        if (matchingSales.length === 0) {
          // Uncategorized transaction
          uncategorizedData.push({
            Order_Number: orderNumber,
            Payout_Date: payoutDate,
            Gross_Amount: grossAmount,
            Category: 'Uncategorized'
          });
          continue;
        }

        // Calculate total sales for this order
        const orderTotalSales = salesTotals.get(orderNumber) || 1;
        
        // Distribute payout amount proportionally across sales
        for (const sale of matchingSales) {
          const scaledAmount = (sale.Amount / orderTotalSales) * grossAmount;
          
          const record = {
            Transaction_Date: row['Transaction Date'] || row['Transaction_Date'] || payoutDate,
            Payout_Date: payoutDate,
            Category: sale.Category,
            Amount: scaledAmount,
            Order_Number: orderNumber
          };
          
          processedData.push(record);
          
          // Update stats
          if (sale.Category !== 'Uncategorized') {
            summaryStats.categories[sale.Category] = 
              (summaryStats.categories[sale.Category] || 0) + scaledAmount;
            summaryStats.total_sales_matched += scaledAmount;
          }
        }
      }

      summaryStats.total_payouts += totalPayoutAmount;

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
        matched_orders: payoutData.length - uncategorizedData.length
      });
    }

    // Create Excel file with unique sheet names
    const workbook = XLSX.utils.book_new();
    const usedSheetNames = new Set<string>();
    
    // Create summary sheet with all data
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
    
    // Create individual sheets per file
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      
      if (result.data.length > 0) {
        const sheet = XLSX.utils.json_to_sheet(result.data);
        // Extract base name from filename without extension
        let baseName = result.filename.replace(/\.csv$/i, '');
        
        // If the filename is too long, use a shorter identifier
        if (baseName.length > 25) {
          // Use index for long filenames to ensure uniqueness
          baseName = `File_${i + 1}`;
        }
        
        const sheetName = getUniqueSheetName(baseName, usedSheetNames);
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
      }
      
      // Uncategorized sheet
      if (result.uncategorized.length > 0) {
        const uncSheet = XLSX.utils.json_to_sheet(result.uncategorized);
        let baseName = `Uncat_${result.filename.replace(/\.csv$/i, '')}`;
        
        // If the filename is too long, use a shorter identifier
        if (baseName.length > 23) { // Leave room for "Uncat_" prefix and suffix
          baseName = `Uncat_${i + 1}`;
        }
        
        const uncSheetName = getUniqueSheetName(baseName, usedSheetNames);
        XLSX.utils.book_append_sheet(workbook, uncSheet, uncSheetName);
      }
    }
    
    // Generate Excel buffer
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