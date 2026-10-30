import React, { useRef, useState } from 'react';
import { UploadCloud, Layers, ShieldCheck, Loader2 } from 'lucide-react';
import { useI18nStore } from '../store/useI18nStore';
import type { UploadMode } from '../store/useAssetStore';

export interface DropzoneProps {
  uploadMode: UploadMode;
  onFilesAccepted: (files: File[]) => void;
  isProcessing?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  uploadMode,
  onFilesAccepted,
  isProcessing = false,
}) => {
  const { t } = useI18nStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesAccepted(filesArray);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesAccepted(filesArray);
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  const handleClick = () => {
    if (!isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getModeDetails = () => {
    switch (uploadMode) {
      case 'batch':
        return {
          icon: <Layers size={48} />,
          title: t('dropzone_title_batch') || 'Drop Photos for Collective Analysis',
          subtitle: t('dropzone_subtitle_batch') || 'Compare hardware signatures & timeline spread (up to 50)',
        };
      case 'remove':
        return {
          icon: <ShieldCheck size={48} />,
          title: t('dropzone_title_remove') || 'Drop Image for Instant Sanitization',
          subtitle: t('dropzone_subtitle_remove') || 'Surgically strip GPS, device, and timeline metadata',
        };
      case 'single':
      default:
        return {
          icon: <UploadCloud size={48} />,
          title: t('dropzone_title_single') || 'Drop Image for Forensic Inspection',
          subtitle: t('dropzone_subtitle_single') || 'Inspect EXIF, detect manipulation, calculate hashes',
        };
    }
  };

  const details = getModeDetails();

  return (
    <div
      className={`dropzone ${isDragOver ? 'dragover' : ''} ${uploadMode === 'remove' ? 'remove-mode' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        multiple={uploadMode === 'batch'}
        accept="image/jpeg,image/png,image/gif,image/webp,image/tiff,image/heic,image/heif,.cr2,.raw"
        onChange={handleFileInputChange}
        disabled={isProcessing}
      />

      <div className="dropzone-content">
        <div className="dropzone-icon">
          {isProcessing ? <Loader2 size={48} className="animate-spin" /> : details.icon}
        </div>
        <h2>{isProcessing ? (t('analyzing_text') || 'Analyzing Evidence...') : details.title}</h2>
        <p>{details.subtitle}</p>
        <span className="file-types-hint">JPEG, PNG, WEBP, TIFF, HEIC, CR2, RAW</span>
      </div>
    </div>
  );
};
