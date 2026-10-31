import React, { useState, useRef } from 'react';
import {
  Layers,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Clock,
  MapPin,
  Activity,
} from 'lucide-react';
import type { ForensicAsset } from '../../core/forensics/types';
import { evaluateCollectiveIntelligence } from '../../core/forensics/collective';
import { generateCollectiveNarratives } from '../../core/narratives/narratives';
import type { NarrativeSection } from '../../core/narratives/types';
import { useI18nStore } from '../../store/useI18nStore';

export interface CombinedIntelligenceCardProps {
  assets: ForensicAsset[];
  onInspectAsset?: (assetIndex: number) => void;
}

export const CombinedIntelligenceCard: React.FC<CombinedIntelligenceCardProps> = ({
  assets,
  onInspectAsset,
}) => {
  const { currentLang, t } = useI18nStore();
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  if (!assets || assets.length <= 1) {
    return null;
  }

  const collective = evaluateCollectiveIntelligence(assets);
  const narratives: NarrativeSection[] = generateCollectiveNarratives(
    collective,
    assets.length,
    currentLang
  );

  const handleToggleDetails = () => {
    const nextState = !isMatrixOpen;
    setIsMatrixOpen(nextState);

    if (nextState && window.innerWidth <= 768 && tableContainerRef.current) {
      const el = tableContainerRef.current;
      el.style.transition = 'transform 0.4s ease-out';
      el.style.transform = 'translateX(40px)';
      setTimeout(() => {
        el.style.transform = 'translateX(0)';
      }, 400);
    }
  };

  const renderStatusBadge = (presence: Record<string, boolean>) => {
    const hasGps = Boolean(presence['Geospatial']);
    const hasHardware = Boolean(presence['Device Hardware']);
    const hasTimeline = Boolean(presence['Timeline & Date']);

    if (hasGps && hasHardware && hasTimeline) {
      return (
        <span style={{ color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle2 size={14} /> {t('filter_complete', {}, 'narratives')}
        </span>
      );
    }
    if (hasHardware || hasTimeline || hasGps) {
      return (
        <span style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <AlertTriangle size={14} /> {t('privacy_score_risk')}
        </span>
      );
    }
    return (
      <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <XCircle size={14} /> {t('filter_stripped', {}, 'narratives')}
      </span>
    );
  };

  const tabIcons = [
    <ShieldCheck key="integrity" size={16} />,
    <Cpu key="hw" size={16} />,
    <Clock key="time" size={16} />,
    <MapPin key="geo" size={16} />,
  ];

  const activeSection = narratives[activeTabIdx] || narratives[0];

  return (
    <div id="combined-analysis-card" className="card expert-card mb-6">
      <div className="card-header">
        <Layers size={18} />
        <h3>{t('combined_intel')}</h3>
        <div className="forensic-badge">
          <Activity size={14} />
          <span>{t('cross_asset')}</span>
        </div>
      </div>

      <div id="combined-analysis-content" className="card-body expert-body">
        <div className="tabs-wrapper">
          <div className="expert-tabs-container combined-tabs">
            {narratives.map((section, idx) => (
              <button
                key={idx}
                type="button"
                className={`expert-tab-btn ${idx === activeTabIdx ? 'active' : ''}`}
                onClick={() => setActiveTabIdx(idx)}
              >
                {tabIcons[idx] || <Layers size={16} />}
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="expert-panes-wrapper">
          {activeSection && (
            <div className="expert-tab-pane active">
              <div
                className="expert-narrative-bubble"
                dangerouslySetInnerHTML={{
                  __html: activeSection.narrative.replace(/\n/g, '<br/>'),
                }}
              />

              <div style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleToggleDetails}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <span>{t('integrity_reconstruct_btn', {}, 'narratives')}</span>
                  <ChevronDown
                    size={16}
                    style={{
                      transform: isMatrixOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>

                {isMatrixOpen && (
                  <div
                    ref={tableContainerRef}
                    className="forensic-scroll-container"
                    style={{
                      overflowX: 'auto',
                      marginTop: '1rem',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.825rem',
                        textAlign: 'left',
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <th style={{ padding: '8px 12px' }}>{t('file_name')}</th>
                          <th style={{ padding: '8px 12px' }}>{t('analysis_integrity')}</th>
                          <th style={{ padding: '8px 12px' }}>{t('cat_hardware')}</th>
                          <th style={{ padding: '8px 12px' }}>GPS</th>
                          <th style={{ padding: '8px 12px' }} />
                        </tr>
                      </thead>
                      <tbody>
                        {collective.integrity.matrix.map((row, idx) => {
                          const asset = assets[idx];
                          const make = String(
                            asset?.exifData?.Make ||
                              asset?.exifData?.Model ||
                              t('unknown', {}, 'reports')
                          );
                          const hasGps = Boolean(
                            asset?.exifData?.latitude != null ||
                              asset?.exifData?.GPSLatitude != null
                          );

                          return (
                            <tr
                              key={idx}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                backgroundColor:
                                  idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                              }}
                            >
                              <td
                                style={{
                                  padding: '10px 12px',
                                  fontWeight: 500,
                                  color: 'var(--text-main)',
                                }}
                              >
                                {row.fileName}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                {renderStatusBadge(row.presence)}
                              </td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                                {make}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                {hasGps ? (
                                  <span style={{ color: '#22c55e' }}>{t('yes')}</span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>{t('no')}</span>
                                )}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                {onInspectAsset && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => onInspectAsset(idx)}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '0.75rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <span>{t('select_asset')}</span>
                                    <ArrowRight size={12} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
