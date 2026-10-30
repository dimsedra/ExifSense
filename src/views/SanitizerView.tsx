import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Download,
  Sliders,
  Layers,
  ShieldCheck,
  Image as ImageIcon,
  MapPin,
  EyeOff,
} from 'lucide-react';
import { useSanitizerStore } from '../store/useSanitizerStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { SanitizerWorkspace } from '../components/sanitizer/SanitizerWorkspace';
import { PerFileModal } from '../components/sanitizer/PerFileModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { formatFileSize } from '../components/StagedQueue';
import {
  evaluatePrivacyRisk,
  stripSpecificMetadata,
  stripAllMetadata,
  sanitizeBatch,
  triggerBlobDownload,
} from '../core/sanitizer/sanitizer';
import type { SanitizerPreset } from '../core/sanitizer/types';
import { showToast } from '../components/ToastContainer';
import { useI18nStore } from '../store/useI18nStore';

export const SanitizerView: React.FC = () => {
  const { t } = useI18nStore();
  const {
    activeFile,
    activeExif,
    batchEntries,
    batchActiveIndex,
    globalOptions,
    setGlobalOption,
    applyPreset,
    setBatchActiveIndex,
    setOverride,
    resetOverride,
    getEffectiveOptions,
    close,
  } = useSanitizerStore();
  const { saveSession } = useHistoryStore();

  const [activePreset, setActivePreset] = useState<SanitizerPreset | null>('max-privacy');
  const [customizeEntryIndex, setCustomizeEntryIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<L.Map | null>(null);

  const isBatch = batchEntries.length > 0;
  const currentEntry = isBatch ? batchEntries[batchActiveIndex] : null;
  const targetFile = isBatch ? currentEntry?.file : activeFile;
  const targetExif = (isBatch ? currentEntry?.exifData : activeExif) || {};

  const currentOptions =
    isBatch && currentEntry ? getEffectiveOptions(currentEntry.id) : globalOptions;

  const riskResult = evaluatePrivacyRisk(targetExif, currentOptions);

  const lat = Number(targetExif.latitude ?? targetExif.GPSLatitude);
  const lng = Number(targetExif.longitude ?? targetExif.GPSLongitude);
  const hasGps = !Number.isNaN(lat) && !Number.isNaN(lng);

  // Create object URL for active file preview
  useEffect(() => {
    if (!targetFile) {
      setPreviewUrl('');
      return;
    }
    const existingThumb = (currentEntry as { thumbUrl?: string } | null)?.thumbUrl;
    if (existingThumb) {
      setPreviewUrl(existingThumb);
      return;
    }
    try {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(targetFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      }
    } catch {
      setPreviewUrl('');
    }
  }, [targetFile, currentEntry]);

  // Mini map initialization when GPS coordinates exist
  useEffect(() => {
    if (!hasGps || !miniMapContainerRef.current) {
      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
      }
      return;
    }

    if (miniMapInstanceRef.current) {
      miniMapInstanceRef.current.remove();
      miniMapInstanceRef.current = null;
    }

    const map = L.map(miniMapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([lat, lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.marker([lat, lng]).addTo(map);
    miniMapInstanceRef.current = map;

    return () => {
      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
      }
    };
  }, [hasGps, lat, lng, batchActiveIndex]);

  const handleApplyPreset = (preset: SanitizerPreset) => {
    setActivePreset(preset);
    applyPreset(preset);
  };

  const handleCancel = () => {
    close();
    window.location.hash = '#/';
  };

  const handleDownload = async () => {
    if (!targetFile && !isBatch) return;

    try {
      setIsDownloading(true);

      if (isBatch) {
        const results = await sanitizeBatch(batchEntries, globalOptions);
        for (const item of results) {
          triggerBlobDownload(item.cleanedBlob, item.fileName);
        }

        const firstEntry = batchEntries[0];
        if (firstEntry) {
          saveSession(
            batchEntries.map((entry) => ({
              id: entry.id,
              fileName: entry.fileName,
              fileSize: entry.file.size,
              fileType: entry.file.type || 'image/jpeg',
              fileDate: Date.now(),
              sha256: '',
              sha1: '',
              actualWidth: null,
              actualHeight: null,
              exifData: entry.exifData || {},
              categorizedExif: {
                'Device Hardware': {},
                'Exposure Settings': {},
                'Optics & Lens': {},
                'Image Quality': {},
                'Timeline & Date': {},
                'Geospatial': {},
                'Standards & Info': {},
                'Miscellaneous': {},
              },
              integrityAlerts: [],
              thumbUrl: (entry as { thumbUrl?: string }).thumbUrl || previewUrl,
            })),
            {
              isSanitized: true,
              sanitizeOptions: globalOptions,
              mainThumb: (firstEntry as { thumbUrl?: string }).thumbUrl || previewUrl,
            }
          );
        }
        setIsCompleteModalOpen(true);
      } else if (activeFile) {
        const isStripAll =
          globalOptions.gps &&
          globalOptions.device &&
          globalOptions.camera &&
          globalOptions.date;

        const cleanedBlob = isStripAll
          ? await stripAllMetadata(activeFile)
          : await stripSpecificMetadata(activeFile, globalOptions);

        const rawName = (activeFile as File).name || 'image.jpg';
        const fileName = `cleaned_${rawName}`;

        triggerBlobDownload(cleanedBlob, fileName);
        setIsCompleteModalOpen(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('err_sanitize_failed');
      showToast(msg);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!activeFile && batchEntries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
        <ShieldCheck size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
        <p>{t('no_sanitizer_target')}</p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
          onClick={() => {
            window.location.hash = '#/';
          }}
        >
          {t('return_to_home')}
        </button>
      </div>
    );
  }

  const fileDisplayName =
    currentEntry?.fileName || (activeFile as File | null)?.name || 'image.jpg';
  const fileDisplaySize = targetFile ? formatFileSize(targetFile.size) : '0 B';
  const fileDisplayType = targetFile?.type || 'image/jpeg';
  const modalEntry =
    customizeEntryIndex !== null ? batchEntries[customizeEntryIndex] || null : null;
  const modalOptions = modalEntry
    ? getEffectiveOptions(modalEntry.id)
    : currentOptions;

  return (
    <section id="sanitize-state" className="dashboard sanitize-view">
      <div className="dashboard-grid">
        {/* Left Column: Batch Selector, Image Preview & Mini Map */}
        <div className="col-left">
          {batchEntries.length > 1 && (
            <>
              <div id="sanitize-batch-indicator" className="batch-indicator">
                <Layers size={16} />
                <span>
                  {t('batch')}: {batchActiveIndex + 1} / {batchEntries.length}
                </span>
              </div>

              <div id="sanitize-selector" className="sanitize-selector">
                {batchEntries.map((entry, idx) => {
                  const thumb = (entry as { thumbUrl?: string }).thumbUrl;
                  return (
                    <div
                      key={entry.id}
                      className={`sanitize-selector-thumb ${
                        idx === batchActiveIndex ? 'active' : ''
                      }`}
                      onClick={() => setBatchActiveIndex(idx)}
                    >
                      {thumb ? (
                        <img src={thumb} alt={entry.fileName} />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '58px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#18181b',
                            color: '#71717a',
                          }}
                        >
                          <ImageIcon size={20} />
                        </div>
                      )}
                      <button
                        type="button"
                        className="sanitize-selector-customize"
                        title={t('customize_options')}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomizeEntryIndex(idx);
                        }}
                      >
                        <Sliders size={12} />
                      </button>
                      <span className="sanitize-selector-name">{entry.fileName}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Source File Card */}
          <div className="card image-card">
            <div className="card-header">
              <ImageIcon size={18} />
              <h3>{t('source_file')}</h3>
            </div>
            <div className="card-body">
              <div className="image-preview-wrapper">
                {previewUrl ? (
                  <img
                    id="sanitize-preview-image"
                    src={previewUrl}
                    alt={fileDisplayName}
                  />
                ) : (
                  <div
                    id="sanitize-preview-image"
                    style={{
                      minHeight: '200px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#111213',
                      color: '#a1a1aa',
                    }}
                  >
                    <ImageIcon size={40} style={{ opacity: 0.6 }} />
                  </div>
                )}
              </div>
              <div id="sanitize-file-info" className="file-basic-info">
                <div className="info-item">
                  <span className="info-label">{t('file_name')}</span>
                  <span className="info-value" title={fileDisplayName}>
                    {fileDisplayName}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('file_size')}</span>
                  <span className="info-value">{fileDisplaySize}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('file_type')}</span>
                  <span className="info-value">{fileDisplayType}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mini Map Preview */}
          {hasGps && (
            <div id="sanitize-map-card" className="card map-card mt-4">
              <div className="card-header">
                <div className="header-group">
                  <MapPin size={18} />
                  <h3>{t('geospatial_data')}</h3>
                </div>
              </div>
              <div className="card-body p-0" style={{ position: 'relative' }}>
                <div
                  id="sanitize-map"
                  ref={miniMapContainerRef}
                  className="map-container"
                  style={{ height: '200px' }}
                />
                {currentOptions.gps && (
                  <div id="sanitize-privacy-overlay" className="privacy-overlay">
                    <EyeOff size={24} />
                    <span>{t('location_hidden')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Presets, Controls, Privacy Analysis, Preview, Actions */}
        <div className="col-right">
          <SanitizerWorkspace
            options={currentOptions}
            riskResult={riskResult}
            exifData={targetExif}
            onOptionToggle={(key, val) => {
              setActivePreset(null);
              setGlobalOption(key, val);
            }}
            onApplyPreset={handleApplyPreset}
            activePreset={activePreset}
          />

          <div
            className="sanitize-actions"
            style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}
          >
            <button
              id="cancel-sanitize-btn"
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, justifyContent: 'center', padding: '1rem' }}
              onClick={handleCancel}
            >
              {t('cancel')}
            </button>
            <button
              id="confirm-sanitize-btn"
              type="button"
              className="btn-primary-large"
              style={{ flex: 2, justifyContent: 'center', padding: '1rem' }}
              onClick={() => void handleDownload()}
              disabled={isDownloading}
            >
              <Download size={18} />
              <span>
                {isDownloading
                  ? t('processing')
                  : batchEntries.length > 1
                  ? t('download_all_sanitized')
                  : t('download_cleaned')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Per File Customization Modal */}
      {isBatch && (
        <PerFileModal
          isOpen={customizeEntryIndex !== null}
          entry={modalEntry}
          effectiveOptions={modalOptions}
          onApplyOverride={setOverride}
          onResetToGlobal={resetOverride}
          onClose={() => setCustomizeEntryIndex(null)}
        />
      )}

      {/* Sanitization Complete Modal */}
      <ConfirmModal
        isOpen={isCompleteModalOpen}
        title={t('sanitization_complete_title')}
        message={t('sanitization_complete_msg')}
        confirmLabel={t('done')}
        cancelLabel={t('cancel')}
        isDanger={false}
        onConfirm={() => {
          setIsCompleteModalOpen(false);
          close();
          window.location.hash = '#/';
        }}
        onCancel={() => setIsCompleteModalOpen(false)}
      />
    </section>
  );
};
