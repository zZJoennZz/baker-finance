'use client'
import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FileSpreadsheet, 
  Calculator, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Trash2,
  FileText,
  Calendar,
  Search,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function App() {
  const [salesFile, setSalesFile] = useState<any>(null);
  const [salesPreview, setSalesPreview] = useState<any>(null);
  const [payoutFiles, setPayoutFiles] = useState<any>([]);
  const [processing, setProcessing] = useState<any>(false);
  const [processingStatus, setProcessingStatus] = useState<any>('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [dragActive, setDragActive] = useState<any>(false);
  const [expandedPayouts, setExpandedPayouts] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState<any>('');
  const [categoryFilter, setCategoryFilter] = useState<any>('all');

  const validateCSV = (file: any) => {
    return file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
  };

  const handleSalesUpload = async (file: any) => {
    if (!validateCSV(file)) {
      setError('Please upload a valid CSV file');
      return;
    }
    setError(null);
    setSalesFile(file);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').slice(0, 6);
      setSalesPreview(lines.join('\n'));
    } catch (err) {
      console.error('Error reading file:', err);
    }
  };

  const handlePayoutUpload = (files: any) => {
    const validFiles = Array.from(files).filter(validateCSV);
    if (validFiles.length !== files.length) {
      setError('Some files were skipped (only CSV allowed)');
    }
    setPayoutFiles((prev: any) => [...prev, ...validFiles]);
  };

  const removePayoutFile = (idx: any) => {
    setPayoutFiles((prev: any) => prev.filter((_: any, i: any) => i !== idx));
  };

  const processData = async () => {
    if (!salesFile || payoutFiles.length === 0) return;
    
    setProcessing(true);
    setProcessingStatus('Uploading files...');
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('sales', salesFile);
      payoutFiles.forEach((file: any) => {
        formData.append('payouts', file);
      });
      
      setProcessingStatus('Processing on server...');
      
      const response = await fetch('/api/reconcile', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Processing failed');
      }
      
      const data = await response.json();
      setResult(data);
      
      // Expand all payouts by default
      // const allExpanded = new Set(data.results.map((_, idx) => idx));
      // setExpandedPayouts(allExpanded);
      
    } catch (err: any) {
      console.error('Processing error:', err);
      setError(err.message || 'An error occurred during processing');
    } finally {
      setProcessing(false);
      setProcessingStatus('');
    }
  };

  const downloadExcel = () => {
    if (!result?.excel) return;
    
    const binaryString = atob(result.excel);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetApp = () => {
    setSalesFile(null);
    setPayoutFiles([]);
    setResult(null);
    setSalesPreview(null);
    setError(null);
    setSearchTerm('');
    setCategoryFilter('all');
    setExpandedPayouts(new Set());
  };

  const togglePayout = (idx: any) => {
    const newExpanded = new Set(expandedPayouts);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedPayouts(newExpanded);
  };

  const expandAll = () => {
    if (!result?.results) return;
    const allExpanded = new Set(result.results.map((_: any, idx: any) => idx));
    setExpandedPayouts(allExpanded);
  };

  const collapseAll = () => {
    setExpandedPayouts(new Set());
  };

  const formatCurrency = (amount: any) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Filter data based on search and category
  const filterData = (data: any) => {
    if (!data) return [];
    
    let filtered = [...data];
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.Order_Number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.Category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.Category === categoryFilter);
    }
    
    return filtered;
  };

  const getUniqueCategories = () => {
    if (!result?.results) return [];
    const categories = new Set();
    result.results.forEach((payout: any) => {
      payout.data.forEach((item: any) => {
        categories.add(item.Category);
      });
    });
    return ['all', ...Array.from(categories)];
  };

  const getTotalMatched = () => {
    if (!result?.results) return 0;
    return result.results.reduce((sum: any, payout: any) => sum + payout.data.length, 0);
  };

  const getTotalUnmatched = () => {
    if (!result?.results) return 0;
    return result.results.reduce((sum: any, payout: any) => sum + payout.uncategorized.length, 0);
  };

  const UploadScreen = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-bakery-900 mb-2">BakerFinance</h1>
        <p className="text-bakery-600">Sales & Payout Reconciliation Tool</p>
      </div>

      {/* Sales Upload */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-bakery-900 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Step 1: Upload Sales Data
        </h2>
        
        <div 
          className={`dropzone ${dragActive ? 'dropzone-active' : 'dropzone-inactive'} ${salesFile ? 'bg-bakery-50 border-bakery-500' : ''}`}
          onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files[0];
            if (file) handleSalesUpload(file);
          }}
        >
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleSalesUpload(e.target.files[0])}
            className="hidden"
            id="sales-input"
          />
          <label htmlFor="sales-input" className="cursor-pointer block">
            {salesFile ? (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-bakery-100 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8 text-bakery-600" />
                </div>
                <p className="text-lg font-medium text-bakery-900">{salesFile.name}</p>
                <p className="text-sm text-green-600 flex items-center justify-center gap-1">
                  <CheckCircle className="w-4 h-4" /> File loaded
                </p>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setSalesFile(null);
                    setSalesPreview(null);
                  }}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-bakery-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="w-8 h-8 text-bakery-400" />
                </div>
                <p className="text-lg font-medium text-bakery-900 mb-1">Drop your sales CSV here</p>
                <p className="text-sm text-bakery-500">or click to browse</p>
              </>
            )}
          </label>
        </div>

        {salesPreview && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Preview:</p>
            <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
              {salesPreview}
            </pre>
          </div>
        )}
      </div>

      {/* Payout Upload */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-bakery-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Step 2: Upload Payout Files
        </h2>
        
        <div 
          className={`dropzone ${dragActive ? 'dropzone-active' : 'dropzone-inactive'} ${payoutFiles.length > 0 ? 'bg-bakery-50 border-bakery-500' : ''}`}
          onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const files = Array.from(e.dataTransfer.files);
            handlePayoutUpload(files);
          }}
        >
          <input
            type="file"
            accept=".csv"
            multiple
            onChange={(e) => e.target.files && handlePayoutUpload(Array.from(e.target.files))}
            className="hidden"
            id="payouts-input"
          />
          <label htmlFor="payouts-input" className="cursor-pointer block">
            <div className="w-16 h-16 bg-bakery-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-bakery-400" />
            </div>
            <p className="text-lg font-medium text-bakery-900 mb-1">Drop payout CSVs here</p>
            <p className="text-sm text-bakery-500">Upload multiple files at once</p>
          </label>
        </div>

        {payoutFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-bakery-900">
                Selected files ({payoutFiles.length}):
              </p>
              <button onClick={() => setPayoutFiles([])} className="text-xs text-red-500">
                Clear all
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {payoutFiles.map((file: any, idx: any) => (
                <div key={idx} className="flex justify-between items-center bg-bakery-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-bakery-500" />
                    <span className="text-sm text-bakery-900">{file.name}</span>
                  </div>
                  <button onClick={() => removePayoutFile(idx)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Process Button */}
      <div className="flex justify-center">
        <button
          onClick={processData}
          disabled={!salesFile || payoutFiles.length === 0 || processing}
          className="btn-primary px-8 py-3 text-lg flex items-center gap-2"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Calculator className="w-5 h-5" />
              Process Data
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );

  const ResultsScreen = () => {
    const categories = getUniqueCategories();
    const totalMatched = getTotalMatched();
    const totalUnmatched = getTotalUnmatched();
    
    // Helper to format payout date range
    const formatPayoutDateRange = (payout: any) => {
      if (!payout.payout_dates) return 'No date available';
      const { min, max } = payout.payout_dates;
      if (min === max || !max) {
        return formatDate(min);
      }
      return `${formatDate(min)} - ${formatDate(max)}`;
    };
    
    return (
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="bg-gradient-to-r from-bakery-700 to-bakery-800 text-white rounded-xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold">Reconciliation Results</h1>
              <p className="text-bakery-200 mt-1">
                {result.results.length} payout files processed
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={expandAll} className="px-3 py-1 bg-white/20 rounded-lg text-sm hover:bg-white/30">
                Expand All
              </button>
              <button onClick={collapseAll} className="px-3 py-1 bg-white/20 rounded-lg text-sm hover:bg-white/30">
                Collapse All
              </button>
              <button onClick={downloadExcel} className="btn-primary bg-white text-bakery-800 hover:bg-bakery-100">
                <Download className="w-4 h-4 mr-2" />
                Download Excel
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm text-bakery-200">Total Payouts</p>
              <p className="text-2xl font-bold">{formatCurrency(result.stats.total_payouts)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm text-bakery-200">Matched Sales</p>
              <p className="text-2xl font-bold">{formatCurrency(result.stats.total_sales_matched)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm text-bakery-200">Match Rate</p>
              <p className="text-2xl font-bold">
                {((result.stats.total_sales_matched / result.stats.total_payouts) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm text-bakery-200">Transactions</p>
              <p className="text-2xl font-bold">
                {totalMatched + totalUnmatched}
              </p>
              <p className="text-xs text-bakery-200">
                {totalMatched} matched, {totalUnmatched} unmatched
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        {/* <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by order or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bakery-500 w-64"
                />
              </div>
              
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bakery-500"
              >
                {categories.map((cat: any) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>
            
            {(searchTerm || categoryFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                }}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear filters
              </button>
            )}
          </div>
        </div> */}

        {/* Payout Tables */}
        <div className="space-y-6">
          {result.results.map((payout: any, idx: any) => {
            const filteredData = filterData(payout.data);
            const isExpanded = expandedPayouts.has(idx);
            const unmatchedCount = payout.uncategorized?.length || 0;
            const totalAmount = filteredData.reduce((sum, item) => sum + item.Amount, 0);
            const payoutDateRange = formatPayoutDateRange(payout);
            
            return (
              <div key={idx} className="bg-gray rounded-xl shadow-md overflow-hidden">
                {/* Payout Header - Shows Payout Date */}
                <div 
                  className="p-4 bg-gradient-to-r from-bakery-50 to-white border-b border-gray-200 cursor-pointer hover:from-bakery-100 transition-colors"
                  onClick={() => togglePayout(idx)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-bakery-600" />
                          <h3 className="text-lg font-semibold text-bakery-900">
                            Payout: {payoutDateRange}
                          </h3>
                        </div>
                        {unmatchedCount > 0 && (
                          <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                            {unmatchedCount} unmatched
                          </span>
                        )}
                      </div>
                      <div className="flex gap-6 text-sm">
                        <div className="text-gray-600">
                          <span className="font-medium">{filteredData.length}</span> matched transactions
                        </div>
                        <div className="text-gray-600">
                          Total: <span className="font-semibold text-bakery-700">{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="text-gray-500 text-xs">
                          Source: {payout.filename}
                        </div>
                      </div>
                    </div>
                    <div className="text-bakery-600">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Payout Table - Shows Transaction Date */}
                {isExpanded && filteredData.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-bakery-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-bakery-900">
                            Transaction Date
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-bakery-900">
                            Order Number
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-bakery-900">
                            Category
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-bakery-900">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredData.map((item, itemIdx) => (
                          <tr key={itemIdx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatDate(item.Transaction_Date || item.Payout_Date)}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">
                              {item.Order_Number}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 bg-bakery-100 text-bakery-700 rounded-full text-xs">
                                {item.Category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-mono font-medium text-gray-900">
                              {formatCurrency(item.Amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t border-gray-200">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-right text-gray-700">
                            Total:
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-right text-bakery-900">
                            {formatCurrency(totalAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {isExpanded && filteredData.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No transactions match your filters
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Unmatched Records Section */}
        {result.results.some((payout: any) => payout.uncategorized?.length > 0) && (
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-amber-900">Payout Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-amber-900">Transaction Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-amber-900">Order Number</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-amber-900">Gross Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.results.map((payout: any, idx: any) => (
                    payout.uncategorized?.map((item: any, itemIdx: any) => (
                      <tr key={`${idx}-${itemIdx}`} className="hover:bg-amber-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(item.Payout_Date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(item.Transaction_Date || item.Payout_Date)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">
                          {item.Order_Number}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono font-medium text-red-600">
                          {formatCurrency(item.Gross_Amount || item.Amount)}
                        </td>
                      </tr>
                    ))
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-right text-gray-700">
                      Total Unmatched:
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-right text-red-600">
                      {formatCurrency(
                        result.results.reduce(
                          (sum: any, payout: any) => sum + (payout.uncategorized?.reduce(
                            (s: any, item: any) => s + (item.Gross_Amount || item.Amount), 0
                          ) || 0),
                          0
                        )
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <button onClick={resetApp} className="btn-secondary">
            Start Over
          </button>
          <button onClick={downloadExcel} className="btn-primary">
            <Download className="w-4 h-4 mr-2" />
            Download Full Report (Excel)
          </button>
        </div>
      </div>
    );
  };

  const ProcessingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="relative"
      >
        <div className="w-24 h-24 border-4 border-bakery-200 border-t-bakery-600 rounded-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Calculator className="w-10 h-10 text-bakery-600" />
        </div>
      </motion.div>
      
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-bakery-900">Processing Data...</h2>
        <p className="text-bakery-600 max-w-md">
          {processingStatus || `Matching ${payoutFiles.length} payout files with sales records...`}
        </p>
      </div>

      <div className="w-72 bg-gray-200 rounded-full h-2 overflow-hidden">
        <motion.div 
          className="h-full bg-bakery-600"
          animate={{ 
            width: ["0%", "100%"],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      <p className="text-xs text-bakery-400 text-center max-w-sm">
        Analyzing order numbers, calculating category proportions, and generating report...
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-bakery-50">
      <div className="container mx-auto px-4 py-8">
        {processing ? (
          <ProcessingScreen />
        ) : result ? (
          <ResultsScreen />
        ) : (
          <UploadScreen />
        )}
      </div>
    </div>
  );
}