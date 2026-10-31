import React, { useRef, useState } from 'react';
import {
  ImagePlus,
  FileImage,
  Layers,
  ShieldOff,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useI18nStore } from '../store/useI18nStore';
import type { UploadMode } from '../store/useAssetStore';

export interface DropzoneProps {
  uploadMode: UploadMode;
  onModeChange?: (mode: UploadMode) => void;
  onFilesAccepted: (files: File[]) => void;
  isProcessing?: boolean;
}

const MODES: UploadMode[] = ['single', 'batch', 'remove'];

export const Dropzone: React.FC<DropzoneProps> = ({
  uploadMode,
  onModeChange,
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
      e.target.value = '';
    }
  };

  const handleClick = () => {
    if (!isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSelectMode = (e: React.MouseEvent, mode: UploadMode) => {
    e.stopPropagation();
    if (onModeChange) {
      onModeChange(mode);
    }
  };

  const handleCycleMode = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (!onModeChange) return;
    const idx = MODES.indexOf(uploadMode);
    const nextIdx = (idx + delta + MODES.length) % MODES.length;
    onModeChange(MODES[nextIdx]!);
  };

  const modeDescriptionKey =
    uploadMode === 'batch'
      ? 'mode_batch_desc'
      : uploadMode === 'remove'
      ? 'mode_remove_desc'
      : 'mode_single_desc';

  return (
    <div
      id="dropzone"
      className={`dropzone ${isDragOver ? 'dragover' : ''} ${
        uploadMode === 'remove' ? 'remove-mode' : ''
      }`}
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
        id="file-input"
        type="file"
        style={{ display: 'none' }}
        multiple={uploadMode !== 'single'}
        accept="image/*"
        onChange={handleFileInputChange}
        disabled={isProcessing}
      />

      {onModeChange && (
        <div className="upload-mode-container" onClick={(e) => e.stopPropagation()}>
          <button
            id="prev-mode-btn"
            type="button"
            className="mode-nav-btn"
            aria-label="Previous Mode"
            onClick={(e) => handleCycleMode(e, -1)}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="upload-mode-toggle">
            <button
              id="mode-single-btn"
              className={`mode-btn ${uploadMode === 'single' ? 'active' : ''}`}
              onClick={(e) => handleSelectMode(e, 'single')}
              type="button"
            >
              <FileImage size={16} />
              <span>{t('mode_single')}</span>
            </button>
            <button
              id="mode-batch-btn"
              className={`mode-btn ${uploadMode === 'batch' ? 'active' : ''}`}
              onClick={(e) => handleSelectMode(e, 'batch')}
              type="button"
            >
              <Layers size={16} />
              <span>{t('mode_batch')}</span>
            </button>
            <button
              id="mode-remove-btn"
              className={`mode-btn ${uploadMode === 'remove' ? 'active' : ''}`}
              onClick={(e) => handleSelectMode(e, 'remove')}
              type="button"
            >
              <ShieldOff size={16} />
              <span>{t('mode_remove')}</span>
            </button>
          </div>
          <button
            id="next-mode-btn"
            type="button"
            className="mode-nav-btn"
            aria-label="Next Mode"
            onClick={(e) => handleCycleMode(e, 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <div className="dropzone-content">
        <div className="dropzone-icon">
          {isProcessing ? <Loader2 size={48} className="animate-spin" /> : <ImagePlus size={48} />}
        </div>
        <h2>{isProcessing ? t('analyzing_text') : t('dropzone_prompt')}</h2>
        <p className="file-types-hint">{t('dropzone_hint')}</p>
        <p id="mode-description" className="mode-description">
          {t(modeDescriptionKey)}
        </p>
      </div>
    </div>
  );
};
