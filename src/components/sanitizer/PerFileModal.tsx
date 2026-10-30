import React, { useState, useEffect } from 'react';
import { Sliders, X } from 'lucide-react';
import type { SanitizerOptions, BatchSanitizerEntry } from '../../core/sanitizer/types';
import { useI18nStore } from '../../store/useI18nStore';

export interface PerFileModalProps {
  isOpen: boolean;
  entry: BatchSanitizerEntry | null;
  effectiveOptions: SanitizerOptions;
  onApplyOverride: (id: string, options: Partial<SanitizerOptions>) => void;
  onResetToGlobal: (id: string) => void;
  onClose: () => void;
}

export const PerFileModal: React.FC<PerFileModalProps> = ({
  isOpen,
  entry,
  effectiveOptions,
  onApplyOverride,
  onResetToGlobal,
  onClose,
}) => {
  const { t } = useI18nStore();
  const [localOptions, setLocalOptions] = useState<SanitizerOptions>(effectiveOptions);

  useEffect(() => {
    setLocalOptions(effectiveOptions);
  }, [effectiveOptions, entry?.id]);

  if (!isOpen || !entry) return null;

  const handleToggle = (key: keyof SanitizerOptions) => {
    setLocalOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleApply = () => {
    onApplyOverride(entry.id, localOptions);
    onClose();
  };

  const handleReset = () => {
    onResetToGlobal(entry.id);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '480px', textAlign: 'left' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
              {t('per_file_override_title') || 'Customize File Sanitization'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.5rem', wordBreak: 'break-all' }}>
          File: <strong style={{ color: 'var(--text-main)' }}>{entry.fileName}</strong>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--secondary)', borderRadius: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Strip GPS Location</span>
            <input
              type="checkbox"
              checked={localOptions.gps}
              onChange={() => handleToggle('gps')}
              style={{ width: '16px', height: '16px' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--secondary)', borderRadius: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Strip Device Information</span>
            <input
              type="checkbox"
              checked={localOptions.device}
              onChange={() => handleToggle('device')}
              style={{ width: '16px', height: '16px' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--secondary)', borderRadius: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Strip Camera Settings</span>
            <input
              type="checkbox"
              checked={localOptions.camera}
              onChange={() => handleToggle('camera')}
              style={{ width: '16px', height: '16px' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--secondary)', borderRadius: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Strip Date & Timestamps</span>
            <input
              type="checkbox"
              checked={localOptions.date}
              onChange={() => handleToggle('date')}
              style={{ width: '16px', height: '16px' }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            {t('reset_to_global') || 'Reset to Global'}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleApply}>
            {t('apply') || 'Apply Override'}
          </button>
        </div>
      </div>
    </div>
  );
};
