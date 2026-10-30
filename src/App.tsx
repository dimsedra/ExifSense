import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ToastContainer, showToast } from './components/ToastContainer';
import { ConfirmModal } from './components/ConfirmModal';
import { CanvasParticles } from './components/CanvasParticles';
import { TimelineMap } from './components/TimelineMap';
import { HomeView } from './views/HomeView';
import { DashboardView } from './views/DashboardView';
import { SanitizerView } from './views/SanitizerView';
import { HistoryView } from './views/HistoryView';
import { GuideView } from './views/GuideView';
import { initRouter, AppRoute, getCurrentRoute } from './router';
import { useAssetStore } from './store/useAssetStore';
import { useSanitizerStore } from './store/useSanitizerStore';
import { useHistoryStore } from './store/useHistoryStore';
import { useI18nStore } from './store/useI18nStore';
import { processSanitizerIntake } from './services/ingestionCoordinator';
import {
  generatePdfReport,
  generateJsonReport,
  generateCsvReport,
  generateMarkdownReport,
  copyReportToClipboard,
} from './core/exporter/exporter';
import { triggerBlobDownload } from './core/sanitizer/sanitizer';

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getCurrentRoute());
  const [isReuploadConfirmOpen, setIsReuploadConfirmOpen] = useState(false);

  const { assets, forensicId, resetSession, activeAssetIndex, setActiveAssetIndex, setUploadMode } =
    useAssetStore();
  const { close: resetSanitizer } = useSanitizerStore();
  const { saveSession } = useHistoryStore();
  const { currentLang, t } = useI18nStore();
  const lastSavedForensicIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unbind = initRouter(
      [
        { path: '#/' },
        {
          path: '#/dashboard',
          guard: () => useAssetStore.getState().assets.length > 0,
          redirectFallback: '#/',
        },
        { path: '#/sanitize' },
        { path: '#/history' },
        { path: '#/guide' },
      ],
      (route) => setCurrentRoute(route)
    );

    return () => unbind();
  }, []);

  useEffect(() => {
    if (assets.length > 0 && forensicId && lastSavedForensicIdRef.current !== forensicId) {
      // Only auto-save freshly processed sessions (those with fileObject present)
      const isFreshUpload = assets.some((a) => Boolean(a.fileObject));
      if (isFreshUpload) {
        lastSavedForensicIdRef.current = forensicId;
        const first = assets[0]!;
        const sessionTitle =
          assets.length === 1
            ? first.fileName
            : t('history_more', { name: first.fileName, n: assets.length - 1 });
        saveSession(assets, {
          forensicId,
          sessionTitle,
          mainThumb: first.thumbUrl || '',
        });
      }
    }
  }, [assets, forensicId, saveSession, t]);

  const handleAnalyzeNew = () => {
    resetSession();
    resetSanitizer();
    window.location.hash = '#/';
  };

  const handleSanitizeFromDashboard = async () => {
    const files = assets
      .map((a) => a.fileObject)
      .filter((f): f is File => Boolean(f));

    if (files.length === 0) {
      setIsReuploadConfirmOpen(true);
      return;
    }

    await processSanitizerIntake(files);
    window.location.hash = '#/sanitize';
  };

  const handleReuploadConfirm = () => {
    setIsReuploadConfirmOpen(false);
    resetSession();
    setUploadMode('remove');
    window.location.hash = '#/';
  };

  const handleExport = async (format: 'pdf' | 'json' | 'csv' | 'md' | 'clipboard') => {
    if (assets.length === 0) {
      return;
    }

    const first = assets[0]!;
    const meta = {
      sessionTitle:
        assets.length === 1
          ? first.fileName
          : t('history_more', { name: first.fileName, n: assets.length - 1 }),
      forensicId: forensicId || 'ES-EXPORT',
      investigatorIdentity: 'ExifSense',
      generatedAt: new Date(),
    };

    try {
      if (format === 'pdf') {
        const pdfBlob = await generatePdfReport(assets, meta, currentLang);
        triggerBlobDownload(pdfBlob, `ExifSense_Report_${forensicId || 'export'}.pdf`);
      } else if (format === 'json') {
        const jsonStr = generateJsonReport(assets, meta);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        triggerBlobDownload(blob, `ExifSense_Report_${forensicId || 'export'}.json`);
      } else if (format === 'csv') {
        const csvStr = generateCsvReport(assets, meta, currentLang);
        const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
        triggerBlobDownload(blob, `ExifSense_Matrix_${forensicId || 'export'}.csv`);
      } else if (format === 'md') {
        const mdStr = generateMarkdownReport(assets, meta, currentLang);
        const blob = new Blob([mdStr], { type: 'text/markdown' });
        triggerBlobDownload(blob, `ExifSense_Report_${forensicId || 'export'}.md`);
      } else if (format === 'clipboard') {
        await copyReportToClipboard(assets, meta, currentLang);
        showToast(t('copied_to_clipboard'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('err_sanitize_failed');
      showToast(msg);
    }
  };

  const activeAsset = assets[activeAssetIndex] || assets[0];
  const isOnDashboard = currentRoute === '#/dashboard' && assets.length > 0;

  const renderCurrentView = () => {
    switch (currentRoute) {
      case '#/dashboard':
        return (
          <DashboardView
            renderMapSlot={
              <TimelineMap
                assets={assets}
                activeAssetId={activeAsset?.id}
                showPath={true}
                onMarkerClick={setActiveAssetIndex}
              />
            }
          />
        );
      case '#/sanitize':
        return <SanitizerView />;
      case '#/history':
        return <HistoryView />;
      case '#/guide':
        return <GuideView />;
      case '#/':
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <CanvasParticles />

      <Header
        onReset={handleAnalyzeNew}
        onSanitize={() => void handleSanitizeFromDashboard()}
        showResetButton={isOnDashboard}
        showExportButton={isOnDashboard}
        showSanitizeButton={isOnDashboard}
        onExport={handleExport}
      />

      <main className="main-container" id="main-content" style={{ flex: 1 }}>
        {renderCurrentView()}
      </main>

      <ToastContainer />

      <ConfirmModal
        isOpen={isReuploadConfirmOpen}
        title={t('reupload_required_title')}
        message={t('reupload_required_msg')}
        confirmLabel={t('go_to_upload')}
        cancelLabel={t('cancel')}
        isDanger={false}
        onConfirm={handleReuploadConfirm}
        onCancel={() => setIsReuploadConfirmOpen(false)}
      />
    </div>
  );
};

export default App;
