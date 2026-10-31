import React, { useState, useEffect } from 'react';
import { Sliders, MapPin, Smartphone, Aperture, Calendar } from 'lucide-react';
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
    <div id="perfile-modal" className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card perfile-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-icon warning">
            <Sliders size={24} />
          </div>
          <h3>{t('customize_file_options')}</h3>
          <p id="perfile-modal-filename" className="text-muted text-sm">
            {entry.fileName}
          </p>
        </div>

        <div className="modal-body perfile-modal-body">
          <label className="perfile-toggle-row">
            <span>
              <MapPin size={16} /> <span>{t('cat_gps_removal')}</span>
            </span>
            <input
              type="checkbox"
              id="perfile-opt-gps"
              checked={localOptions.gps}
              onChange={() => handleToggle('gps')}
            />
          </label>
          <label className="perfile-toggle-row">
            <span>
              <Smartphone size={16} /> <span>{t('cat_device_removal')}</span>
            </span>
            <input
              type="checkbox"
              id="perfile-opt-device"
              checked={localOptions.device}
              onChange={() => handleToggle('device')}
            />
          </label>
          <label className="perfile-toggle-row">
            <span>
              <Aperture size={16} /> <span>{t('cat_camera_removal')}</span>
            </span>
            <input
              type="checkbox"
              id="perfile-opt-camera"
              checked={localOptions.camera}
              onChange={() => handleToggle('camera')}
            />
          </label>
          <label className="perfile-toggle-row">
            <span>
              <Calendar size={16} /> <span>{t('sanitize_toggle_date')}</span>
            </span>
            <input
              type="checkbox"
              id="perfile-opt-date"
              checked={localOptions.date}
              onChange={() => handleToggle('date')}
            />
          </label>
        </div>

        <div className="modal-footer">
          <button
            id="perfile-cancel-btn"
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            {t('cancel')}
          </button>
          <button
            id="perfile-reset-btn"
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
          >
            {t('reset_to_global')}
          </button>
          <button
            id="perfile-save-btn"
            type="button"
            className="btn btn-primary"
            onClick={handleApply}
          >
            {t('apply')}
          </button>
        </div>
      </div>
    </div>
  );
};
