import React from 'react';
import { X, Play, Trash2, FileImage } from 'lucide-react';
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
    <div className="staged-files-container">
      <div className="staged-files-header">
        <div className="staged-files-title">
          <FileImage size={18} />
          <span>
            {t('staged_files_title') || 'Staged for Analysis'} ({stagedFiles.length}/50)
          </span>
        </div>
        <button
          className="clear-staged-btn"
          onClick={onClear}
          disabled={isProcessing}
          title={t('clear_all') || 'Clear all'}
        >
          <Trash2 size={14} style={{ display: 'inline', marginRight: '4px' }} />
          {t('clear_all') || 'Clear All'}
        </button>
      </div>

      <div className="staged-files-list">
        {stagedFiles.map((file, idx) => (
          <div key={`${file.name}-${idx}`} className="staged-file-item">
            <div className="staged-file-info">
              <span className="staged-file-name" title={file.name}>
                {file.name}
              </span>
              <span className="staged-file-size">{formatFileSize(file.size)}</span>
            </div>
            <button
              className="remove-staged-item"
              onClick={() => onRemove(idx)}
              disabled={isProcessing}
              title={t('remove') || 'Remove'}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'right' }}>
        <button
          className="btn btn-primary"
          onClick={onProcess}
          disabled={isProcessing || stagedFiles.length === 0}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Play size={16} />
          <span>{t('process_assets_btn') || 'Process Assets'}</span>
        </button>
      </div>
    </div>
  );
};
