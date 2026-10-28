import React, { useState } from 'react';
import {
  FileText,
  Layers,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useAssetStore } from '../store/useAssetStore';
import { useI18nStore } from '../store/useI18nStore';
import { Dropzone } from '../components/Dropzone';
import { StagedQueue } from '../components/StagedQueue';
import { showToast } from '../components/ToastContainer';
import {
  processSingleAsset,
  processBatchAssets,
  processSanitizerIntake,
} from '../services/ingestionCoordinator';

export const HomeView: React.FC = () => {
  const { t } = useI18nStore();
  const {
    uploadMode,
    setUploadMode,
    stagedFiles,
    stageFiles,
    removeStagedFile,
    clearStagedFiles,
  } = useAssetStore();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesAccepted = async (files: File[]) => {
    if (files.length === 0) return;

    if (uploadMode === 'single') {
      try {
        setIsProcessing(true);
        await processSingleAsset(files[0]!);
        showToast(t('analysis_complete') || 'Forensic analysis completed');
        window.location.hash = '#/dashboard';
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to analyze asset';
        showToast(msg);
      } finally {
        setIsProcessing(false);
      }
    } else if (uploadMode === 'batch') {
      stageFiles(files);
      showToast(`${files.length} file(s) staged for batch analysis`);
    } else if (uploadMode === 'remove') {
      try {
        setIsProcessing(true);
        await processSanitizerIntake(files);
        showToast(t('sanitizer_ready') || 'Photos ready for sanitization');
        window.location.hash = '#/sanitize';
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to ingest files for sanitization';
        showToast(msg);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleProcessBatch = async () => {
    if (stagedFiles.length === 0) return;
    try {
      setIsProcessing(true);
      await processBatchAssets(stagedFiles);
      clearStagedFiles();
      showToast(t('batch_analysis_complete') || 'Batch forensic analysis completed');
      window.location.hash = '#/dashboard';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze batch assets';
      showToast(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="intro-container">
      {/* Hero Section */}
      <section className="intro-hero">
        <h1>
          FORENSIC <span>INTELLIGENCE</span>
        </h1>
        <p>
          {t('hero_subtitle') ||
            'Client-side image verification, manipulation heuristics, timeline reconstruction, and surgical privacy sanitization.'}
        </p>

        {/* Mode Switcher */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div className="upload-mode-toggle">
            <button
              className={`mode-btn ${uploadMode === 'single' ? 'active' : ''}`}
              onClick={() => setUploadMode('single')}
              type="button"
            >
              <FileText size={14} style={{ display: 'inline', marginRight: '6px' }} />
              {t('mode_single') || 'Single Asset'}
            </button>
            <button
              className={`mode-btn ${uploadMode === 'batch' ? 'active' : ''}`}
              onClick={() => setUploadMode('batch')}
              type="button"
            >
              <Layers size={14} style={{ display: 'inline', marginRight: '6px' }} />
              {t('mode_batch') || 'Batch Analysis'}
            </button>
            <button
              className={`mode-btn ${uploadMode === 'remove' ? 'active' : ''}`}
              onClick={() => setUploadMode('remove')}
              type="button"
            >
              <ShieldCheck size={14} style={{ display: 'inline', marginRight: '6px' }} />
              {t('mode_remove') || 'Remove Metadata'}
            </button>
          </div>
        </div>

        {/* File Ingestion Dropzone */}
        <Dropzone
          uploadMode={uploadMode}
          onFilesAccepted={handleFilesAccepted}
          isProcessing={isProcessing}
        />

        {/* Staged Queue for Batch Upload */}
        {uploadMode === 'batch' && (
          <StagedQueue
            stagedFiles={stagedFiles}
            onRemove={removeStagedFile}
            onClear={clearStagedFiles}
            onProcess={handleProcessBatch}
            isProcessing={isProcessing}
          />
        )}
      </section>

      {/* Feature Bento Grid */}
      <div className="intro-features">
        <div className="feature-card col-span-2">
          <div className="feature-icon">
            <ShieldAlert size={28} />
          </div>
          <div className="feature-text">
            <h3>{t('feat_integrity_title') || 'Digital Integrity & Tamper Heuristics'}</h3>
            <p>
              {t('feat_integrity_desc') ||
                'Detect editing software signatures, chronological anomalies, dimension mismatches, and stripped EXIF tags.'}
            </p>
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <MapPin size={28} />
          </div>
          <div className="feature-text">
            <h3>{t('feat_geo_title') || 'Geospatial & Timeline Paths'}</h3>
            <p>
              {t('feat_geo_desc') ||
                'Reconstruct flight paths, travel velocities, and GPS coordinates directly on an interactive map.'}
            </p>
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <Clock size={28} />
          </div>
          <div className="feature-text">
            <h3>{t('feat_collective_title') || 'Collective Intelligence'}</h3>
            <p>
              {t('feat_collective_desc') ||
                'Compare multi-asset serial numbers, hardware models, and chronological capture jumps across sets.'}
            </p>
          </div>
        </div>

        <div className="feature-card col-span-2">
          <div className="feature-icon">
            <ShieldCheck size={28} />
          </div>
          <div className="feature-text">
            <h3>{t('feat_sanitizer_title') || 'Zero-Knowledge Privacy Sanitizer'}</h3>
            <p>
              {t('feat_sanitizer_desc') ||
                'Surgically eliminate location, device, and timestamp tracking tags 100% locally in your browser memory.'}
            </p>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setUploadMode('remove');
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>{t('open_sanitizer_studio') || 'Open Sanitizer Studio'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
