import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FileSpreadsheet, 
  Calculator, 
  FileText,
  CheckCircle,
  Trash2,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface UploadScreenProps {
  salesFile: File | null;
  salesPreview: string | null;
  payoutFiles: File[];
  processing: boolean;
  processingStatus: string;
  error: string | null;
  onSalesUpload: (file: File) => void;
  onPayoutUpload: (files: FileList | File[]) => void;
  onRemovePayoutFile: (index: number) => void;
  onClearPayoutFiles: () => void;
  onProcessData: () => void;
  onRemoveSalesFile: () => void;
}
import { FileUploadCard } from './FileUploadCard';

export function UploadScreen({
  salesFile,
  salesPreview,
  payoutFiles,
  processing,
  processingStatus,
  error,
  onSalesUpload,
  onPayoutUpload,
  onRemovePayoutFile,
  onClearPayoutFiles,
  onProcessData,
  onRemoveSalesFile,
}: UploadScreenProps) {
  const salesInputRef = useRef<HTMLInputElement>(null);
  const payoutsInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent, isSales: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (isSales && files[0]) {
      onSalesUpload(files[0]);
    } else if (!isSales) {
      onPayoutUpload(files);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-bakery-900 mb-2">BakerFinance</h1>
        <p className="text-bakery-600">Sales & Payout Reconciliation Tool</p>
      </div>

      {/* Sales Upload */}
      <FileUploadCard
        title="Step 1: Upload Sales Data"
        icon={FileSpreadsheet}
        accept=".csv"
        multiple={false}
        files={salesFile ? [salesFile] : []}
        preview={salesPreview}
        dragActive={dragActive}
        onDrag={handleDrag}
        onDrop={(e) => handleDrop(e, true)}
        onFileSelect={(files) => onSalesUpload(files[0])}
        onRemoveFile={onRemoveSalesFile}
        inputRef={salesInputRef}
        renderFileInfo={(file) => (
          <div className="space-y-3">
            <div className="w-16 h-16 bg-bakery-100 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8 text-bakery-600" />
            </div>
            <p className="text-lg font-medium text-bakery-900">{file.name}</p>
            <p className="text-sm text-green-600 flex items-center justify-center gap-1">
              <CheckCircle className="w-4 h-4" /> File loaded
            </p>
          </div>
        )}
      />

      {/* Payout Upload */}
      <FileUploadCard
        title="Step 2: Upload Payout Files"
        icon={Upload}
        accept=".csv"
        multiple={true}
        files={payoutFiles}
        dragActive={dragActive}
        onDrag={handleDrag}
        onDrop={(e) => handleDrop(e, false)}
        onFileSelect={onPayoutUpload}
        onClearFiles={onClearPayoutFiles}
        inputRef={payoutsInputRef}
        renderFileList={(files) => (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-bakery-900">
                Selected files ({files.length}):
              </p>
              <button onClick={onClearPayoutFiles} className="text-xs text-red-500">
                Clear all
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {files.map((file, idx) => (
                <div key={idx} className="flex justify-between items-center bg-bakery-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-bakery-500" />
                    <span className="text-sm text-bakery-900">{file.name}</span>
                  </div>
                  <button onClick={() => onRemovePayoutFile(idx)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      />

      {/* Process Button */}
      <div className="flex justify-center">
        <button
          onClick={onProcessData}
          disabled={!salesFile || payoutFiles.length === 0 || processing}
          className="btn-primary px-8 py-3 text-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {processingStatus || 'Processing...'}
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
}