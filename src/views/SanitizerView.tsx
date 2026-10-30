import React, { useState } from 'react';
import {
  Download,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useSanitizerStore } from '../store/useSanitizerStore';
import { SanitizerWorkspace } from '../components/sanitizer/SanitizerWorkspace';
import { PerFileModal } from '../components/sanitizer/PerFileModal';
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
  } = useSanitizerStore();

  const [activePreset, setActivePreset] = useState<SanitizerPreset | null>('max-privacy');
  const [isPerFileOpen, setIsPerFileOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ completed: number; total: number } | null>(null);

  const isBatch = batchEntries.length > 0;
  const currentEntry = isBatch ? batchEntries[batchActiveIndex] : null;
  const targetFile = isBatch ? currentEntry?.file : activeFile;
  const targetExif = (isBatch ? currentEntry?.exifData : activeExif) || {};

  const currentOptions = isBatch && currentEntry
    ? getEffectiveOptions(currentEntry.id)
    : globalOptions;

  const riskResult = evaluatePrivacyRisk(targetExif, currentOptions);

  const handleApplyPreset = (preset: SanitizerPreset) => {
    setActivePreset(preset);
    applyPreset(preset);
  };

  const handleDownload = async () => {
    if (!targetFile && !isBatch) return;

    try {
      setIsDownloading(true);

      if (isBatch) {
        setDownloadProgress({ completed: 0, total: batchEntries.length });
        const results = await sanitizeBatch(
          batchEntries,
          globalOptions,
          (completed, total) => {
            setDownloadProgress({ completed, total });
          }
        );

        for (const item of results) {
          triggerBlobDownload(item.cleanedBlob, item.fileName);
        }
        showToast(`Sanitized and downloaded ${results.length} photo(s)!`);
      } else if (activeFile) {
        const isStripAll =
          globalOptions.gps &&
          globalOptions.device &&
          globalOptions.camera &&
          globalOptions.date;

        let cleanedBlob: Blob;
        if (isStripAll) {
          cleanedBlob = await stripAllMetadata(activeFile);
        } else {
          cleanedBlob = await stripSpecificMetadata(activeFile, globalOptions);
        }

        const fileName = (activeFile as File).name
          ? `cleaned_${(activeFile as File).name}`
          : 'cleaned_image.jpg';

        triggerBlobDownload(cleanedBlob, fileName);
        showToast('Sanitized photo downloaded successfully!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sanitization failed';
      showToast(msg);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  if (!activeFile && batchEntries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
        <ShieldCheck size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
        <p>{t('no_sanitizer_target') || 'No images loaded for sanitization. Drop a photo to start.'}</p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
          onClick={() => {
            window.location.hash = '#/';
          }}
        >
          {t('return_to_home') || 'Return to Home'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Batch Navigation Toolbar if multiple photos */}
      {isBatch && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '0.75rem 1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={batchActiveIndex === 0}
              onClick={() => setBatchActiveIndex(batchActiveIndex - 1)}
              style={{ padding: '4px 8px' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Photo {batchActiveIndex + 1} of {batchEntries.length}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={batchActiveIndex === batchEntries.length - 1}
              onClick={() => setBatchActiveIndex(batchActiveIndex + 1)}
              style={{ padding: '4px 8px' }}
            >
              <ChevronRight size={16} />
            </button>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              ({currentEntry?.fileName})
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsPerFileOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
          >
            <Sliders size={14} />
            <span>Customize This File</span>
          </button>
        </div>
      )}

      {/* Main Sanitizer Options & Risk Workspace */}
      <SanitizerWorkspace
        options={currentOptions}
        riskResult={riskResult}
        onOptionToggle={(key, val) => {
          setActivePreset(null);
          setGlobalOption(key, val);
        }}
        onApplyPreset={handleApplyPreset}
        activePreset={activePreset}
      />

      {/* Download Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.25rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {isBatch
              ? `Ready to Sanitize All ${batchEntries.length} Files`
              : 'Ready to Download Cleaned Image'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Processing executes 100% locally in browser memory without server uploads.
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleDownload}
          disabled={isDownloading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
        >
          {isDownloading ? (
            <span>
              {downloadProgress
                ? `Sanitizing (${downloadProgress.completed}/${downloadProgress.total})...`
                : 'Sanitizing...'}
            </span>
          ) : (
            <>
              <Download size={18} />
              <span>{isBatch ? 'Download All Sanitized' : 'Download Cleaned Photo'}</span>
            </>
          )}
        </button>
      </div>

      {/* Per File Customization Modal (Batch) */}
      {isBatch && (
        <PerFileModal
          isOpen={isPerFileOpen}
          entry={currentEntry}
          effectiveOptions={currentOptions}
          onApplyOverride={setOverride}
          onResetToGlobal={resetOverride}
          onClose={() => setIsPerFileOpen(false)}
        />
      )}
    </div>
  );
};
