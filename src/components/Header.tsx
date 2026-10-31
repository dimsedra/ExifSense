import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldOff,
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
  onSanitize?: () => void;
  showResetButton?: boolean;
  showExportButton?: boolean;
  showSanitizeButton?: boolean;
  onExport?: (format: 'pdf' | 'json' | 'csv' | 'md' | 'clipboard') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  onOpenGuide,
  onSanitize,
  showResetButton = false,
  showExportButton = false,
  showSanitizeButton = false,
  onExport,
}) => {
  const { currentLang, setLanguage, t } = useI18nStore();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

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
          id="home-logo"
          dir="ltr"
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
          <button
            className="btn btn-secondary"
            id="guide-btn"
            title={t('guide_btn')}
            onClick={() => {
              if (onOpenGuide) {
                onOpenGuide();
              } else {
                window.location.hash = '#/guide';
              }
            }}
          >
            <BookOpen size={18} />
            <span>{t('guide_btn')}</span>
          </button>

          <div className="lang-selector" id="lang-selector-container" ref={langRef}>
            <button
              className="btn btn-secondary"
              id="lang-toggle"
              title={t('guide_nav_header_title')}
              onClick={(e) => {
                e.stopPropagation();
                setLangMenuOpen((prev) => !prev);
              }}
            >
              <Languages size={18} />
              <span id="current-lang-label">{langLabels[currentLang] || 'EN'}</span>
              <ChevronDown size={14} className="chevron-icon" />
            </button>
            {langMenuOpen && (
              <div className="lang-dropdown active" id="lang-dropdown">
                <button
                  className={`lang-option ${currentLang === 'en' ? 'active' : ''}`}
                  onClick={() => handleSelectLang('en')}
                >
                  English
                </button>
                <button
                  className={`lang-option ${currentLang === 'id' ? 'active' : ''}`}
                  onClick={() => handleSelectLang('id')}
                >
                  Bahasa Indonesia
                </button>
                <button
                  className={`lang-option ${currentLang === 'ar' ? 'active' : ''}`}
                  onClick={() => handleSelectLang('ar')}
                >
                  العربية
                </button>
              </div>
            )}
          </div>

          {showExportButton && (
            <div className="export-dropdown" id="export-container" ref={exportRef}>
              <button
                className="btn btn-secondary"
                id="export-main-btn"
                title={t('export_report')}
                onClick={(e) => {
                  e.stopPropagation();
                  setExportMenuOpen((prev) => !prev);
                }}
              >
                <Download size={18} />
                <span>{t('export_report')}</span>
              </button>
              {exportMenuOpen && (
                <div className="export-menu active" id="export-menu">
                  <button id="export-pdf-btn" onClick={() => handleExportClick('pdf')}>
                    <FileText size={16} /> {t('pdf_doc')}
                  </button>
                  <button id="export-md-btn" onClick={() => handleExportClick('md')}>
                    <FileCode size={16} /> {t('md_file')}
                  </button>
                  <button id="export-json-btn" onClick={() => handleExportClick('json')}>
                    <FileJson size={16} /> {t('json_file')}
                  </button>
                  <button id="export-csv-btn" onClick={() => handleExportClick('csv')}>
                    <Table size={16} /> {t('csv_dataset')}
                  </button>
                  <button id="export-copy-btn" onClick={() => handleExportClick('clipboard')}>
                    <ClipboardCopy size={16} /> {t('copy_clipboard')}
                  </button>
                </div>
              )}
            </div>
          )}

          {showResetButton && onReset && (
            <button
              className="btn btn-secondary"
              id="reset-btn"
              title={t('analyze_new')}
              onClick={onReset}
            >
              <RotateCcw size={18} />
              <span>{t('analyze_new')}</span>
            </button>
          )}

          {showSanitizeButton && onSanitize && (
            <button
              className="btn btn-primary"
              id="sanitize-main-btn"
              title={t('sanitize_asset')}
              onClick={onSanitize}
            >
              <ShieldOff size={18} />
              <span>{t('sanitize_asset')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
