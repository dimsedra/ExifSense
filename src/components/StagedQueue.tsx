import React from 'react';
import { X, Play, Layers, FileImage } from 'lucide-react';
import { useI18nStore } from '../store/useI18nStore';

export interface StagedQueueProps {
  stagedFiles: File[];
  onRemove: (index: number) => void;
  onClear: () => void;
  onProcess: () => void;
  isProcessing?: boolean;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const StagedQueue: React.FC<StagedQueueProps> = ({
  stagedFiles,
  onRemove,
  onClear,
  onProcess,
  isProcessing = false,
}) => {
  const { t } = useI18nStore();

  if (stagedFiles.length === 0) {
    return null;
  }

  return (
    <div id="staged-files-container" className="staged-files-container">
      <div className="staged-files-header">
        <div className="staged-files-title">
          <Layers size={18} />
          <span>{t('staged_files_title')}</span>
          <span id="staged-count-badge" className="badge">
            {stagedFiles.length}
          </span>
        </div>
        <button
          id="clear-staging-btn"
          type="button"
          className="clear-staged-btn"
          onClick={onClear}
          disabled={isProcessing}
        >
          {t('clear_staging')}
        </button>
      </div>

      <div id="staged-files-list" className="staged-files-list">
        {stagedFiles.map((file, idx) => (
          <div key={`${file.name}-${idx}`} className="staged-file-item">
            <div className="staged-file-info">
              <FileImage size={16} />
              <span className="staged-file-name" title={file.name}>
                {file.name}
              </span>
              <span className="staged-file-size">({formatFileSize(file.size)})</span>
            </div>
            <button
              type="button"
              className="remove-staged-item"
              onClick={() => onRemove(idx)}
              disabled={isProcessing}
              title={t('remove')}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <button
        id="process-staged-btn"
        type="button"
        className="btn-primary-large"
        style={{ width: '100%', justifyContent: 'center' }}
        onClick={onProcess}
        disabled={isProcessing || stagedFiles.length === 0}
      >
        <Play size={18} />
        <span>{t('process_staged_btn')}</span>
      </button>
    </div>
  );
};
