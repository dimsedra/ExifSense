import React, { useState, useRef, useLayoutEffect } from 'react';
import {
  ShieldAlert,
  Cpu,
  Sun,
  Eye,
  Sparkles,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { ForensicAsset, ExifCategory } from '../../core/forensics/types';
import {
  generateHardwareNarrative,
  generateExposureNarrative,
  generateOpticsNarrative,
  generateQualityNarrative,
  generateTimelineNarrative,
  generateGeospatialNarrative,
  generateIntegrityNarrative,
} from '../../core/narratives/narratives';
import { formatExifValue } from '../../core/forensics/metadata';
import { useI18nStore } from '../../store/useI18nStore';

export interface ExpertAnalysisTabsProps {
  asset: ForensicAsset;
}

interface TabConfig {
  id: ExifCategory;
  labelKey: string;
  defaultLabel: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  {
    id: 'Device Hardware',
    labelKey: 'tab_hardware',
    defaultLabel: 'Hardware',
    icon: <Cpu size={16} />,
  },
  {
    id: 'Exposure Settings',
    labelKey: 'tab_exposure',
    defaultLabel: 'Exposure',
    icon: <Sun size={16} />,
  },
  {
    id: 'Optics & Lens',
    labelKey: 'tab_optics',
    defaultLabel: 'Optics',
    icon: <Eye size={16} />,
  },
  {
    id: 'Image Quality',
    labelKey: 'tab_quality',
    defaultLabel: 'Quality',
    icon: <Sparkles size={16} />,
  },
  {
    id: 'Timeline & Date',
    labelKey: 'tab_timeline',
    defaultLabel: 'Timeline',
    icon: <Clock size={16} />,
  },
  {
    id: 'Geospatial',
    labelKey: 'tab_geospatial',
    defaultLabel: 'Geospatial',
    icon: <MapPin size={16} />,
  },
  {
    id: 'Standards & Info',
    labelKey: 'tab_standards',
    defaultLabel: 'Digital Integrity',
    icon: <ShieldAlert size={16} />,
  },
];

export const ExpertAnalysisTabs: React.FC<ExpertAnalysisTabsProps> = ({ asset }) => {
  const { currentLang, t } = useI18nStore();
  const [activeCategory, setActiveCategory] = useState<ExifCategory>('Device Hardware');

  const wrapperRef = useRef<HTMLDivElement>(null);
  const activePaneRef = useRef<HTMLDivElement>(null);

  // REQ-UI-005: Smooth Expert Tab Height Transitions
  useLayoutEffect(() => {
    if (!wrapperRef.current || !activePaneRef.current) return;
    const currentHeight = activePaneRef.current.offsetHeight;
    if (currentHeight > 0) {
      wrapperRef.current.style.transition = 'min-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
      wrapperRef.current.style.minHeight = `${currentHeight}px`;
    }
  }, [activeCategory, asset]);

  const getNarrativeForCategory = (cat: ExifCategory): string => {
    const exif = (asset.exifData || {}) as Record<string, unknown>;
    switch (cat) {
      case 'Device Hardware':
        return generateHardwareNarrative(exif, currentLang);
      case 'Exposure Settings':
        return generateExposureNarrative(exif, currentLang);
      case 'Optics & Lens':
        return generateOpticsNarrative(exif, currentLang);
      case 'Image Quality':
        return generateQualityNarrative(exif, currentLang);
      case 'Timeline & Date':
        return generateTimelineNarrative(exif, currentLang);
      case 'Geospatial': {
        const lat = Number(exif.latitude ?? exif.GPSLatitude);
        const lng = Number(exif.longitude ?? exif.GPSLongitude);
        return generateGeospatialNarrative(lat, lng, null, currentLang);
      }
      case 'Standards & Info':
        return generateIntegrityNarrative(asset, currentLang);
      default:
        return '';
    }
  };

  const narrativeText = getNarrativeForCategory(activeCategory);
  const categoryData = asset.categorizedExif?.[activeCategory] || {};
  const entries = Object.entries(categoryData);

  const activeIndex = TABS.findIndex((t) => t.id === activeCategory);
  const handlePrevTab = () => {
    const prevIdx = (activeIndex - 1 + TABS.length) % TABS.length;
    setActiveCategory(TABS[prevIdx]!.id);
  };
  const handleNextTab = () => {
    const nextIdx = (activeIndex + 1) % TABS.length;
    setActiveCategory(TABS[nextIdx]!.id);
  };

  return (
    <div className="expert-card card">
      {/* Tab Navigation Header */}
      <div className="expert-tabs-container">
        {/* Mobile Arrow Controls */}
        <button
          type="button"
          className="tabs-arrow left"
          onClick={handlePrevTab}
          title="Previous Tab"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '36px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={18} />
        </button>

        {TABS.map((tab) => {
          const isActive = tab.id === activeCategory;
          const hasAlert =
            tab.id === 'Standards & Info' &&
            asset.integrityAlerts &&
            asset.integrityAlerts.length > 0;

          return (
            <button
              key={tab.id}
              type="button"
              className={`expert-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveCategory(tab.id)}
            >
              {tab.icon}
              <span>{t(tab.labelKey) || tab.defaultLabel}</span>
              {hasAlert && <span className="tab-badge badge-warning" />}
            </button>
          );
        })}

        <button
          type="button"
          className="tabs-arrow right"
          onClick={handleNextTab}
          title="Next Tab"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '36px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Tab Panes Wrapper with Dynamic minHeight Transition */}
      <div className="expert-panes-wrapper" ref={wrapperRef}>
        <div className="expert-tab-pane active" ref={activePaneRef} style={{ padding: '1.5rem' }}>
          {/* Integrity Alerts if on Digital Integrity tab */}
          {activeCategory === 'Standards & Info' && asset.integrityAlerts && asset.integrityAlerts.length > 0 && (
            <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {asset.integrityAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: alert.severity === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    border: `1px solid ${alert.severity === 'critical' ? '#ef4444' : '#f59e0b'}`,
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <ShieldAlert
                    size={20}
                    color={alert.severity === 'critical' ? '#ef4444' : '#f59e0b'}
                  />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {alert.type.toUpperCase().replace(/_/g, ' ')}
                    </span>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {alert.defaultMessage}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Narrative Storytelling Bubble */}
          <div className="expert-narrative-bubble" style={{ marginBottom: '1.5rem' }}>
            <p style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {narrativeText || t('no_narrative_available') || 'No metadata narrative available.'}
            </p>
          </div>

          {/* Detailed EXIF Key-Value Table */}
          <div className="forensic-scroll-container">
            {entries.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {t('no_metadata_found') || 'No metadata properties recorded for this domain.'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 10px', width: '40%' }}>Property</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', width: '60%' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([key, val], idx) => (
                    <tr
                      key={key}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {key}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                        {formatExifValue(key, val, currentLang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
