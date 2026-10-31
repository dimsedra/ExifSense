import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Play,
  History,
  UploadCloud,
  Activity,
  Lock,
  ShieldAlert,
  ShieldOff,
  Smartphone,
} from 'lucide-react';
import { useAssetStore } from '../store/useAssetStore';
import { useI18nStore } from '../store/useI18nStore';
import { Dropzone } from '../components/Dropzone';
import { StagedQueue } from '../components/StagedQueue';
import { ConfirmModal } from '../components/ConfirmModal';
import { HistoryView } from './HistoryView';
import { showToast } from '../components/ToastContainer';
import {
  processSingleAsset,
  processBatchAssets,
  processSanitizerIntake,
} from '../services/ingestionCoordinator';

export type HomeTab = 'upload' | 'history';

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

  const [activeTab, setActiveTab] = useState<HomeTab>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const actionZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSwitchToHistory = () => {
      setActiveTab('history');
      actionZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener('switch-to-history', handleSwitchToHistory);
    return () => window.removeEventListener('switch-to-history', handleSwitchToHistory);
  }, []);

  const handleFilesAccepted = async (files: File[]) => {
    if (files.length === 0) return;

    if (uploadMode === 'single') {
      try {
        setIsProcessing(true);
        await processSingleAsset(files[0]!);
        window.location.hash = '#/dashboard';
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t('err_invalid_files');
        showToast(msg);
      } finally {
        setIsProcessing(false);
      }
    } else if (uploadMode === 'batch') {
      stageFiles(files);
      setIsBatchConfirmOpen(true);
    } else if (uploadMode === 'remove') {
      try {
        setIsProcessing(true);
        await processSanitizerIntake(files);
        window.location.hash = '#/sanitize';
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t('err_sanitize_failed');
        showToast(msg);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleProcessBatch = async () => {
    setIsBatchConfirmOpen(false);
    const currentStaged = useAssetStore.getState().stagedFiles;
    if (currentStaged.length === 0) return;
    try {
      setIsProcessing(true);
      await processBatchAssets(currentStaged);
      clearStagedFiles();
      window.location.hash = '#/dashboard';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('err_invalid_files');
      showToast(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="intro-state" className="intro-container">
      {/* Hero Section */}
      <div className="intro-hero">
        <div className="intro-badge">
          <Shield size={16} />
          <span>{t('hero_badge')}</span>
        </div>
        <h1>
          {t('hero_title_part1')}{' '}
          <span className="highlight">{t('hero_title_span')}</span>
        </h1>
        <p>{t('hero_desc')}</p>

        <div className="intro-cta">
          <button
            id="start-analysis-btn"
            type="button"
            className="btn-primary-large"
            onClick={() => {
              setActiveTab('upload');
              actionZoneRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
            }}
          >
            <Play size={20} className="rtl-flip-icon" />
            <span>{t('begin_investigation')}</span>
          </button>
          <button
            id="view-history-btn"
            type="button"
            className="btn-outline-large"
            onClick={() => {
              setActiveTab('history');
              actionZoneRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
            }}
          >
            <History size={20} />
            <span>{t('review_history')}</span>
          </button>
        </div>
      </div>

      {/* Main Action Zone (Tabs) */}
      <div className="action-zone" ref={actionZoneRef}>
        <div className="tabs-container">
          <div className="tabs">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              data-tab="tab-upload"
              onClick={() => setActiveTab('upload')}
            >
              <UploadCloud size={18} />
              <span>{t('tab_new')}</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              data-tab="tab-history"
              onClick={() => setActiveTab('history')}
            >
              <History size={18} />
              <span>{t('tab_history')}</span>
            </button>
          </div>

          <div className="tab-panes-wrapper">
            {activeTab === 'upload' ? (
              <div id="tab-upload" className="tab-content active">
                <section className="analysis-section" id="analysis-section">
                  <Dropzone
                    uploadMode={uploadMode}
                    onModeChange={setUploadMode}
                    onFilesAccepted={handleFilesAccepted}
                    isProcessing={isProcessing}
                  />

                  {uploadMode === 'batch' && (
                    <StagedQueue
                      stagedFiles={stagedFiles}
                      onRemove={removeStagedFile}
                      onClear={clearStagedFiles}
                      onProcess={handleProcessBatch}
                      isProcessing={isProcessing}
                    />
                  )}

                  <div className="forensic-advisory mt-6">
                    <div className="advisory-header">
                      <Smartphone size={18} />
                      <span>{t('advisory_title')}</span>
                    </div>
                    <div className="advisory-body">
                      <p>
                        <strong>{t('advisory_mobile_warn')}</strong>
                      </p>
                      <p>{t('advisory_recommend')}</p>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div id="tab-history" className="tab-content active">
                <HistoryView embedded />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feature Bento Grid */}
      <div className="intro-features">
        <div className="feature-card col-span-2">
          <div className="feature-icon">
            <Activity size={24} />
          </div>
          <div className="feature-text">
            <h3>{t('feature_image_analysis_title')}</h3>
            <p>{t('feature_image_analysis_desc')}</p>
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <Lock size={24} />
          </div>
          <div className="feature-text">
            <h3>{t('feature_secure_title')}</h3>
            <p>{t('feature_secure_desc')}</p>
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <ShieldAlert size={24} />
          </div>
          <div className="feature-text">
            <h3>{t('feature_spoof_title')}</h3>
            <p>{t('feature_spoof_desc')}</p>
          </div>
        </div>

        <div className="feature-card col-span-2">
          <div className="feature-icon">
            <ShieldOff size={24} />
          </div>
          <div className="feature-text">
            <h3>{t('feature_sanitize_title')}</h3>
            <p>{t('feature_sanitize_desc')}</p>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isBatchConfirmOpen}
        title={t('batch_confirm_title')}
        message={t('batch_confirm_msg', { count: stagedFiles.length })}
        confirmLabel={t('process_now')}
        cancelLabel={t('add_more')}
        isDanger={false}
        onConfirm={() => void handleProcessBatch()}
        onCancel={() => setIsBatchConfirmOpen(false)}
      />
    </div>
  );
};
