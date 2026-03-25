// components/FileUploadCard.tsx
import React from 'react';

interface FileUploadCardProps {
  title: string;
  icon: React.ElementType;
  accept: string;
  multiple: boolean;
  files: File[];
  dragActive: boolean;
  preview?: string | null;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (files: FileList) => void;
  onRemoveFile?: () => void;
  onClearFiles?: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  renderFileInfo?: (file: File) => React.ReactNode;
  renderFileList?: (files: File[]) => React.ReactNode;
}

export function FileUploadCard({
  title,
  icon: Icon,
  accept,
  multiple,
  files,
  dragActive,
  preview,
  onDrag,
  onDrop,
  onFileSelect,
  onRemoveFile,
  onClearFiles,
  inputRef,
  renderFileInfo,
  renderFileList,
}: FileUploadCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-bakery-900 mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5" />
        {title}
      </h2>
      
      <div 
        className={`dropzone ${dragActive ? 'dropzone-active' : 'dropzone-inactive'} ${files.length > 0 ? 'bg-bakery-50 border-bakery-500' : ''}`}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => e.target.files && onFileSelect(e.target.files)}
          className="hidden"
          id={`${title.replace(/\s/g, '-')}-input`}
        />
        <label htmlFor={`${title.replace(/\s/g, '-')}-input`} className="cursor-pointer block">
          {files.length > 0 && renderFileInfo ? (
            renderFileInfo(files[0])
          ) : (
            <>
              <div className="w-16 h-16 bg-bakery-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon className="w-8 h-8 text-bakery-400" />
              </div>
              <p className="text-lg font-medium text-bakery-900 mb-1">
                {multiple ? 'Drop payout CSVs here' : 'Drop your sales CSV here'}
              </p>
              <p className="text-sm text-bakery-500">or click to browse</p>
            </>
          )}
        </label>
      </div>

      {preview && (
        <div className="mt-4 bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Preview:</p>
          <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
            {preview}
          </pre>
        </div>
      )}

      {files.length > 0 && renderFileList && renderFileList(files)}
    </div>
  );
}