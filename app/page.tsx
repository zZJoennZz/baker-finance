// app/page.tsx - Final fixed version
'use client';

import { useReconciliation } from '@/hooks/useReconciliation';
import { UploadScreen } from '@/components/UploadScreen';
import { ResultsScreen } from '@/components/ResultsScreen';
import { ProcessingScreen } from '@/components/ProcessingScreen';

export default function App() {
  const {
    salesFile,
    salesPreview,
    payoutFiles,
    processing,
    processingStatus,
    result,
    error,
    handleSalesUpload,
    clearSalesFile,
    handlePayoutUpload,
    removePayoutFile,
    clearPayoutFiles,
    processData,
    resetApp,
    setError,
  } = useReconciliation();

  const handleDownloadExcel = () => {
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

  if (processing) {
    return (
      <div className="min-h-screen bg-bakery-50">
        <div className="container mx-auto px-4 py-8">
          <ProcessingScreen status={processingStatus} fileCount={payoutFiles.length} />
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-bakery-50">
        <div className="container mx-auto px-4 py-8">
          <ResultsScreen 
            result={result} 
            onDownloadExcel={handleDownloadExcel} 
            onReset={resetApp} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bakery-50">
      <div className="container mx-auto px-4 py-8">
        <UploadScreen
          salesFile={salesFile}
          salesPreview={salesPreview}
          payoutFiles={payoutFiles}
          processing={processing}
          processingStatus={processingStatus}
          error={error}
          onSalesUpload={handleSalesUpload}
          onPayoutUpload={handlePayoutUpload}
          onRemovePayoutFile={removePayoutFile}
          onClearPayoutFiles={clearPayoutFiles}
          onProcessData={processData}
          onRemoveSalesFile={clearSalesFile}
        />
      </div>
    </div>
  );
}