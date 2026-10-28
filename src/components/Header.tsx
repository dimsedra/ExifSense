import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  BookOpen,
  Languages,
  ChevronDown,
  Download,
  FileText,
  FileJson,
  Table,
  FileCode,
  ClipboardCopy,
  RotateCcw,
} from 'lucide-react';
import { useI18nStore } from '../store/useI18nStore';
import type { SupportedLanguage } from '../store/useI18nStore';

export interface HeaderProps {
  onReset?: () => void;
  onOpenGuide?: () => void;
  showResetButton?: boolean;
  showExportButton?: boolean;
  onExport?: (format: 'pdf' | 'json' | 'csv' | 'md' | 'clipboard') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  onOpenGuide,
  showResetButton = false,
  showExportButton = false,
  onExport,
}) => {
  const { currentLang, setLanguage, t } = useI18nStore();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleSelectLang = (lang: SupportedLanguage) => {
    void setLanguage(lang);
    setLangMenuOpen(false);
  };

  const handleExportClick = (format: 'pdf' | 'json' | 'csv' | 'md' | 'clipboard') => {
    setExportMenuOpen(false);
    if (onExport) {
      onExport(format);
    }
  };

  const langLabels: Record<SupportedLanguage, string> = {
    en: 'EN',
    id: 'ID',
    ar: 'AR',
  };

  return (
    <header className="header">
      <div className="header-container">
        <div
          className="logo"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            window.location.hash = '#/';
          }}
        >
          <ShieldCheck className="logo-icon" size={28} />
          <h1>
            EXIF<span>SENSE</span>
          </h1>
        </div>

        <div className="header-actions">
          {/* Guide Action */}
          <button
            className="btn btn-secondary"
            id="guide-btn"
            title={t('guide_btn') || 'Guide'}
            onClick={() => {
              if (onOpenGuide) {
                onOpenGuide();
              } else {
                window.location.hash = '#/guide';
              }
            }}
          >
            <BookOpen size={16} />
            <span>{t('guide_btn') || 'Guide'}</span>
          </button>

          {/* Language Switcher */}
          <div className="lang-selector" id="lang-selector-container" ref={langRef}>
            <button
              className="btn btn-secondary"
              id="lang-toggle"
              title="Switch Language"
              onClick={(e) => {
                e.stopPropagation();
                setLangMenuOpen((prev) => !prev);
              }}
            >
              <Languages size={16} />
              <span id="current-lang-label">{langLabels[currentLang] || 'EN'}</span>
              <ChevronDown size={14} className="chevron-icon" />
            </button>
            {langMenuOpen && (
              <div className="lang-dropdown" id="lang-dropdown">
                <button
                  className="lang-option"
                  onClick={() => handleSelectLang('en')}
                >
                  English
                </button>
                <button
                  className="lang-option"
                  onClick={() => handleSelectLang('id')}
                >
                  Bahasa Indonesia
                </button>
                <button
                  className="lang-option"
                  onClick={() => handleSelectLang('ar')}
                >
                  العربية
                </button>
              </div>
            )}
          </div>

          {/* Export Menu Dropdown */}
          {showExportButton && (
            <div className="export-dropdown" id="export-container" ref={exportRef}>
              <button
                className="btn btn-secondary"
                id="export-main-btn"
                title={t('export_report') || 'Export Report'}
                onClick={(e) => {
                  e.stopPropagation();
                  setExportMenuOpen((prev) => !prev);
                }}
              >
                <Download size={16} />
                <span>{t('export_report') || 'Export Report'}</span>
              </button>
              {exportMenuOpen && (
                <div className="export-menu" id="export-menu">
                  <button onClick={() => handleExportClick('pdf')}>
                    <FileText size={16} /> {t('pdf_doc') || 'PDF Document'}
                  </button>
                  <button onClick={() => handleExportClick('json')}>
                    <FileJson size={16} /> {t('json_metadata') || 'JSON Metadata'}
                  </button>
                  <button onClick={() => handleExportClick('csv')}>
                    <Table size={16} /> {t('csv_matrix') || 'CSV Matrix'}
                  </button>
                  <button onClick={() => handleExportClick('md')}>
                    <FileCode size={16} /> {t('md_report') || 'Markdown Report'}
                  </button>
                  <button onClick={() => handleExportClick('clipboard')}>
                    <ClipboardCopy size={16} /> {t('copy_summary') || 'Copy Summary'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Reset Action */}
          {showResetButton && onReset && (
            <button
              className="btn btn-ghost"
              id="reset-btn"
              title={t('reset_session') || 'Reset Session'}
              onClick={onReset}
            >
              <RotateCcw size={16} />
              <span>{t('reset_session') || 'Reset'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
