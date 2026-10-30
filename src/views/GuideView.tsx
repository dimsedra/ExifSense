import React, { useState } from 'react';
import {
  BookOpen,
  Compass,
  Map,
  Zap,
  Lock,
  Activity,
  ShieldAlert,
  ShieldOff,
  PanelTop,
  UploadCloud,
  LayoutDashboard,
  History,
  Search,
  Layers,
  Play,
} from 'lucide-react';
import { useI18nStore } from '../store/useI18nStore';

export type GuideTab = 'overview' | 'navigation' | 'features';

export const GuideView: React.FC = () => {
  const { t } = useI18nStore();
  const [activeTab, setActiveTab] = useState<GuideTab>('overview');

  const overviewItems = [
    { icon: <Lock size={20} />, key: 'feat_secure' },
    { icon: <Activity size={20} />, key: 'feat_integrity' },
    { icon: <ShieldAlert size={20} />, key: 'feat_spoof' },
    { icon: <ShieldOff size={20} />, key: 'feat_sanitize_overview' },
  ];

  const navigationItems = [
    { icon: <PanelTop size={20} />, key: 'nav_header' },
    { icon: <UploadCloud size={20} />, key: 'nav_upload' },
    { icon: <LayoutDashboard size={20} />, key: 'nav_dashboard' },
    { icon: <History size={20} />, key: 'nav_history' },
  ];

  const featureItems = [
    { icon: <Search size={20} />, key: 'feat_analyze' },
    { icon: <Layers size={20} />, key: 'feat_batch' },
    { icon: <ShieldOff size={20} />, key: 'feat_sanitize' },
  ];

  return (
    <div id="guide-state" className="guide-page">
      <div className="guide-header">
        <div className="guide-header-icon">
          <BookOpen size={24} />
        </div>
        <h2>{t('guide_title')}</h2>
      </div>

      <div className="guide-tabs-container">
        <button
          type="button"
          className={`guide-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          data-guide-tab="guide-overview"
          onClick={() => setActiveTab('overview')}
        >
          <Compass size={16} />
          <span>{t('guide_tab_overview')}</span>
        </button>
        <button
          type="button"
          className={`guide-tab-btn ${activeTab === 'navigation' ? 'active' : ''}`}
          data-guide-tab="guide-navigation"
          onClick={() => setActiveTab('navigation')}
        >
          <Map size={16} />
          <span>{t('guide_tab_navigation')}</span>
        </button>
        <button
          type="button"
          className={`guide-tab-btn ${activeTab === 'features' ? 'active' : ''}`}
          data-guide-tab="guide-features"
          onClick={() => setActiveTab('features')}
        >
          <Zap size={16} />
          <span>{t('guide_tab_features')}</span>
        </button>
      </div>

      <div className="guide-panes-wrapper">
        {activeTab === 'overview' && (
          <div id="guide-overview" className="guide-tab-pane active">
            <p className="guide-intro-text">{t('guide_overview_intro')}</p>
            <div className="guide-feature-grid">
              {overviewItems.map((item) => (
                <div key={item.key} className="guide-feature-item">
                  <div className="guide-feature-icon">{item.icon}</div>
                  <div className="guide-feature-text">
                    <h4>{t(`guide_${item.key}_title`)}</h4>
                    <p>{t(`guide_${item.key}_desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="guide-cta-row">
              <button
                id="guide-start-btn"
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  window.location.hash = '#/';
                }}
              >
                <Play size={16} className="rtl-flip-icon" />
                <span>{t('guide_btn_start')}</span>
              </button>
              <button
                id="guide-history-btn"
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  window.location.hash = '#/';
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('switch-to-history'));
                  }, 50);
                }}
              >
                <History size={16} />
                <span>{t('guide_btn_history')}</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'navigation' && (
          <div id="guide-navigation" className="guide-tab-pane active">
            <div className="guide-feature-grid">
              {navigationItems.map((item) => (
                <div key={item.key} className="guide-feature-item">
                  <div className="guide-feature-icon">{item.icon}</div>
                  <div className="guide-feature-text">
                    <h4>{t(`guide_${item.key}_title`)}</h4>
                    <p>{t(`guide_${item.key}_desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div id="guide-features" className="guide-tab-pane active">
            <div className="guide-feature-grid">
              {featureItems.map((item) => (
                <div key={item.key} className="guide-feature-item">
                  <div className="guide-feature-icon">{item.icon}</div>
                  <div className="guide-feature-text">
                    <h4>{t(`guide_${item.key}_title`)}</h4>
                    <p>{t(`guide_${item.key}_desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
