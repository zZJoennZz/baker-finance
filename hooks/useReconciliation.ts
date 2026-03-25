// hooks/useReconciliation.ts - Updated with clearSalesFile
import { useState, useCallback } from 'react';
import { ReconciliationResult } from '@/types';

export function useReconciliation() {
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [salesPreview, setSalesPreview] = useState<string | null>(null);
  const [payoutFiles, setPayoutFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateCSV = useCallback((file: File): boolean => {
    return file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
  }, []);

  const handleSalesUpload = useCallback(async (file: File) => {
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
      setError('Failed to read file');
    }
  }, [validateCSV]);

  const clearSalesFile = useCallback(() => {
    setSalesFile(null);
    setSalesPreview(null);
    setError(null);
  }, []);

  const handlePayoutUpload = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(validateCSV);
    
    if (validFiles.length !== fileArray.length) {
      setError('Some files were skipped (only CSV allowed)');
    }
    
    setPayoutFiles(prev => [...prev, ...validFiles]);
  }, [validateCSV]);

  const removePayoutFile = useCallback((index: number) => {
    setPayoutFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearPayoutFiles = useCallback(() => {
    setPayoutFiles([]);
  }, []);

  const processData = useCallback(async () => {
    if (!salesFile || payoutFiles.length === 0) return;
    
    setProcessing(true);
    setProcessingStatus('Uploading files...');
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('sales', salesFile);
      payoutFiles.forEach(file => formData.append('payouts', file));
      
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
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during processing');
    } finally {
      setProcessing(false);
      setProcessingStatus('');
    }
  }, [salesFile, payoutFiles]);

  const resetApp = useCallback(() => {
    setSalesFile(null);
    setPayoutFiles([]);
    setResult(null);
    setSalesPreview(null);
    setError(null);
  }, []);

  return {
    // State
    salesFile,
    salesPreview,
    payoutFiles,
    processing,
    processingStatus,
    result,
    error,
    
    // Actions
    handleSalesUpload,
    clearSalesFile,
    handlePayoutUpload,
    removePayoutFile,
    clearPayoutFiles,
    processData,
    resetApp,
    setError,
  };
}