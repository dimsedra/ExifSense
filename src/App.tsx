import React, { useState, useEffect } from 'react';
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
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const { assets, forensicId, resetSession, activeAssetIndex, setActiveAssetIndex } = useAssetStore();
  const { close: resetSanitizer } = useSanitizerStore();
  const { saveSession } = useHistoryStore();
  const { currentLang, t } = useI18nStore();

  // Initialize Hash Router with guards
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

  // Auto-save session to history when assets are loaded
  useEffect(() => {
    if (assets.length > 0 && forensicId) {
      saveSession(assets, {
        forensicId,
        sessionTitle: assets.length === 1 ? assets[0]!.fileName : `Batch (${assets.length} photos)`,
      });
    }
  }, [assets, forensicId, saveSession]);

  const handleResetSession = () => {
    resetSession();
    resetSanitizer();
    setIsResetConfirmOpen(false);
    showToast(t('session_reset_complete') || 'Investigation session reset');
    window.location.hash = '#/';
  };

  const handleExport = async (format: 'pdf' | 'json' | 'csv' | 'md' | 'clipboard') => {
    if (assets.length === 0) {
      showToast('No active assets to export');
      return;
    }

    const meta = {
      sessionTitle: assets.length === 1 ? assets[0]!.fileName : `Batch (${assets.length} photos)`,
      forensicId: forensicId || 'ES-EXPORT',
      investigatorIdentity: 'ExifSense Forensic Analyst',
      generatedAt: new Date(),
    };

    try {
      if (format === 'pdf') {
        const pdfBlob = await generatePdfReport(assets, meta, currentLang);
        triggerBlobDownload(pdfBlob, `ExifSense_Report_${forensicId || 'export'}.pdf`);
        showToast('PDF Document exported successfully');
      } else if (format === 'json') {
        const jsonStr = generateJsonReport(assets, meta);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        triggerBlobDownload(blob, `ExifSense_Report_${forensicId || 'export'}.json`);
        showToast('JSON Metadata exported successfully');
      } else if (format === 'csv') {
        const csvStr = generateCsvReport(assets, meta, currentLang);
        const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
        triggerBlobDownload(blob, `ExifSense_Matrix_${forensicId || 'export'}.csv`);
        showToast('CSV Matrix exported successfully');
      } else if (format === 'md') {
        const mdStr = generateMarkdownReport(assets, meta, currentLang);
        const blob = new Blob([mdStr], { type: 'text/markdown' });
        triggerBlobDownload(blob, `ExifSense_Report_${forensicId || 'export'}.md`);
        showToast('Markdown Report exported successfully');
      } else if (format === 'clipboard') {
        await copyReportToClipboard(assets, meta, currentLang);
        showToast('Forensic summary copied to clipboard!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      showToast(msg);
    }
  };

  const activeAsset = assets[activeAssetIndex] || assets[0];

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
      {/* Background Particles */}
      <CanvasParticles />

      {/* Global Navigation Header */}
      <Header
        onReset={() => setIsResetConfirmOpen(true)}
        showResetButton={assets.length > 0}
        showExportButton={assets.length > 0}
        onExport={handleExport}
      />

      {/* Active View Container */}
      <main id="main-content" style={{ flex: 1 }}>
        {renderCurrentView()}
      </main>

      {/* Global Toast Container */}
      <ToastContainer />

      {/* Session Reset Confirmation Dialog */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Reset Active Investigation"
        message="Are you sure you want to clear all loaded assets, analysis cache, and start a fresh session?"
        confirmLabel="Reset Session"
        cancelLabel="Cancel"
        isDanger={true}
        onConfirm={handleResetSession}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};

export default App;
