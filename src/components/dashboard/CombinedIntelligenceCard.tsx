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
import { formatNaturalDate } from '../../core/forensics/metadata';

function formatTotalDuration(
  totalMs: number,
  t: (key: string, params?: Record<string, unknown>, section?: string) => string
): string {
  if (totalMs <= 0) return `0 ${t('time_second', {}, 'narratives')}`;
  const dSec = Math.floor(totalMs / 1000) % 60;
  const dMin = Math.floor(totalMs / (1000 * 60)) % 60;
  const dHrs = Math.floor(totalMs / (1000 * 60 * 60)) % 24;
  const dDays = Math.floor(totalMs / (1000 * 60 * 60 * 24));

  const parts: string[] = [];
  if (dDays > 0) parts.push(`${dDays} ${t('time_day', {}, 'narratives')}`);
  if (dHrs > 0) parts.push(`${dHrs} ${t('time_hour', {}, 'narratives')}`);
  if (dMin > 0) parts.push(`${dMin} ${t('time_minute', {}, 'narratives')}`);
  if (dSec > 0 || parts.length === 0) {
    parts.push(`${dSec} ${t('time_second', {}, 'narratives')}`);
  }
  return parts.join(' ');
}

function formatTimelineJumpDelta(
  jump: { deltaDays: number; deltaHours: number; deltaMinutes: number; deltaSeconds: number },
  t: (key: string, params?: Record<string, unknown>, section?: string) => string
): string {
  const parts: string[] = [];
  if (jump.deltaDays > 0) parts.push(`${jump.deltaDays} ${t('time_day', {}, 'narratives')}`);
  if (jump.deltaHours > 0) parts.push(`${jump.deltaHours} ${t('time_hour', {}, 'narratives')}`);
  if (jump.deltaMinutes > 0) parts.push(`${jump.deltaMinutes} ${t('time_minute', {}, 'narratives')}`);
  if (jump.deltaSeconds > 0 || parts.length === 0) {
    parts.push(`${jump.deltaSeconds} ${t('time_second', {}, 'narratives')}`);
  }
  return parts.join(' ');
}

function formatGeoDistance(km: number, meters: number): string {
  if (km >= 1) {
    return `${km.toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

function getToggleLabel(
  tabIdx: number,
  t: (key: string, params?: Record<string, unknown>, section?: string) => string
): string {
  switch (tabIdx) {
    case 0:
      return t('integrity_reconstruct_btn', {}, 'narratives');
    case 1:
      return t('hw_reconstruct_btn', {}, 'narratives');
    case 2:
      return t('reconstruct_btn', {}, 'narratives');
    case 3:
      return t('geo_reconstruct_btn', {}, 'narratives');
    default:
      return t('integrity_reconstruct_btn', {}, 'narratives');
  }
}

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
  const [expandedTabs, setExpandedTabs] = useState<Record<number, boolean>>({});
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

  const isCurrentOpen = Boolean(expandedTabs[activeTabIdx]);

  const handleToggleDetails = () => {
    const nextState = !isCurrentOpen;
    setExpandedTabs((prev) => ({
      ...prev,
      [activeTabIdx]: nextState,
    }));

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

  const showToggleButton =
    activeTabIdx === 0 ||
    activeTabIdx === 1 ||
    (activeTabIdx === 2 &&
      (collective.timeline.startTime !== null ||
        collective.timeline.jumps.length > 0 ||
        collective.timeline.missingAssets.length > 0)) ||
    (activeTabIdx === 3 &&
      (collective.geospatial.maxSpreadKm > 0 ||
        collective.geospatial.jumps.length > 0));

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

              {showToggleButton && (
                <div style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleToggleDetails}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <span>{getToggleLabel(activeTabIdx, t)}</span>
                    <ChevronDown
                      size={16}
                      style={{
                        transform: isCurrentOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </button>

                  {isCurrentOpen && (
                    <>
                      {activeTabIdx === 0 && (
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

                      {activeTabIdx === 1 && (
                        <div
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
                                <th style={{ padding: '8px 12px' }}>Make</th>
                                <th style={{ padding: '8px 12px' }}>Model</th>
                                <th style={{ padding: '8px 12px' }}>Software</th>
                                <th style={{ padding: '8px 12px' }}>Lens Model</th>
                                <th style={{ padding: '8px 12px' }}>Body Serial</th>
                                <th style={{ padding: '8px 12px' }}>Lens Serial</th>
                                <th style={{ padding: '8px 12px' }} />
                              </tr>
                            </thead>
                            <tbody>
                              {collective.hardware.details.map((hw, idx) => (
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
                                    {hw.fileName}
                                  </td>
                                  <td
                                    style={{
                                      padding: '10px 12px',
                                      color: hw.make !== '-' ? 'var(--text-main)' : 'var(--text-muted)',
                                    }}
                                  >
                                    {hw.make}
                                  </td>
                                  <td
                                    style={{
                                      padding: '10px 12px',
                                      color: hw.model !== '-' ? 'var(--text-main)' : 'var(--text-muted)',
                                    }}
                                  >
                                    {hw.model}
                                  </td>
                                  <td
                                    style={{
                                      padding: '10px 12px',
                                      color: hw.software !== '-' ? 'var(--text-main)' : 'var(--text-muted)',
                                    }}
                                  >
                                    {hw.software}
                                  </td>
                                  <td
                                    style={{
                                      padding: '10px 12px',
                                      color: hw.lensModel !== '-' ? 'var(--text-main)' : 'var(--text-muted)',
                                    }}
                                  >
                                    {hw.lensModel}
                                  </td>
                                  <td
                                    style={{
                                      padding: '10px 12px',
                                      color: hw.bodySerial !== '-' ? 'var(--text-main)' : 'var(--text-muted)',
                                    }}
                                  >
                                    {hw.bodySerial}
                                  </td>
                                  <td
                                    style={{
                                      padding: '10px 12px',
                                      color: hw.lensSerial !== '-' ? 'var(--text-main)' : 'var(--text-muted)',
                                    }}
                                  >
                                    {hw.lensSerial}
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
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {activeTabIdx === 2 && (
                        <div
                          className="forensic-scroll-container timeline-reconstruction"
                          style={{
                            marginTop: '1rem',
                            borderTop: '1px solid var(--border-color)',
                            paddingTop: '12px',
                          }}
                        >
                          <div className="forensic-stats-grid">
                            <div>
                              <strong style={{ color: 'var(--text-main)' }}>
                                {t('reconstruct_start', {}, 'narratives')}
                              </strong>
                              <br />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                {collective.timeline.startTime
                                  ? formatNaturalDate(collective.timeline.startTime, currentLang)
                                  : '-'}
                              </span>
                            </div>
                            <div>
                              <strong style={{ color: 'var(--text-main)' }}>
                                {t('reconstruct_end', {}, 'narratives')}
                              </strong>
                              <br />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                {collective.timeline.endTime
                                  ? formatNaturalDate(collective.timeline.endTime, currentLang)
                                  : '-'}
                              </span>
                            </div>
                            <div className="forensic-stats-full-row">
                              <strong style={{ color: 'var(--text-main)' }}>
                                {t('reconstruct_total', {}, 'narratives')}
                              </strong>
                              <br />
                              <span style={{ color: '#22c55e', fontWeight: 600 }}>
                                {formatTotalDuration(collective.timeline.totalDurationMs, t)}
                              </span>
                            </div>
                          </div>

                          {collective.timeline.jumps.length > 0 && (
                            <>
                              <div className="forensic-jumps-heading" style={{ marginTop: '12px' }}>
                                {t('reconstruct_jumps', {}, 'narratives')}
                              </div>
                              <div className="timeline-jumps-list">
                                {collective.timeline.jumps.map((jump, idx) => (
                                  <div key={idx} className="forensic-jump-row">
                                    <span className="jump-filename" title={jump.fromFileName}>
                                      {jump.fromFileName}
                                    </span>
                                    <span className="jump-delta">
                                      ➡ (+{formatTimelineJumpDelta(jump, t)})
                                    </span>
                                    <span
                                      className="jump-filename"
                                      style={{ textAlign: 'right' }}
                                      title={jump.toFileName}
                                    >
                                      {jump.toFileName}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}

                          {collective.timeline.missingAssets.length > 0 && (
                            <div style={{ marginTop: '12px', color: '#ef4444', fontSize: '13px' }}>
                              <strong>
                                {t(
                                  'reconstruct_missing',
                                  { count: collective.timeline.missingAssets.length },
                                  'narratives'
                                )}
                              </strong>
                              <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                                {collective.timeline.missingAssets.map((name, idx) => (
                                  <li key={idx} style={{ marginBottom: '2px' }}>
                                    {name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {activeTabIdx === 3 && (
                        <div
                          className="forensic-scroll-container geo-reconstruction"
                          style={{
                            marginTop: '1rem',
                            borderTop: '1px solid var(--border-color)',
                            paddingTop: '12px',
                          }}
                        >
                          <div className="forensic-stats-grid">
                            <div>
                              <strong style={{ color: 'var(--text-main)' }}>
                                {t('geo_max_spread', {}, 'narratives')}
                              </strong>
                              <br />
                              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                                {formatGeoDistance(
                                  collective.geospatial.maxSpreadKm,
                                  collective.geospatial.maxSpreadKm * 1000
                                )}
                              </span>
                            </div>
                            <div>
                              <strong style={{ color: 'var(--text-main)' }}>
                                {t('geo_reconstruct_range', {}, 'narratives')}
                              </strong>
                              <br />
                              <span style={{ color: '#22c55e', fontWeight: 600 }}>
                                {formatGeoDistance(
                                  collective.geospatial.totalPathDistanceKm,
                                  collective.geospatial.totalPathDistanceKm * 1000
                                )}
                              </span>
                            </div>
                            <div
                              className="forensic-stats-full-row"
                              style={{ color: 'var(--text-muted)', fontSize: '11px' }}
                            >
                              {t('geo_reconstruct_note', {}, 'narratives')}
                            </div>
                          </div>

                          {collective.geospatial.jumps.length > 0 && (
                            <>
                              <div className="forensic-jumps-heading" style={{ marginTop: '12px' }}>
                                {t('geo_reconstruct_jumps', {}, 'narratives')}
                              </div>
                              <div className="timeline-jumps-list">
                                {collective.geospatial.jumps.map((jump, idx) => (
                                  <div key={idx} className="forensic-jump-row">
                                    <span className="jump-filename" title={jump.fromFileName}>
                                      {jump.fromFileName}
                                    </span>
                                    <span className="jump-delta">
                                      ➡ (+{formatGeoDistance(jump.distanceKm, jump.distanceMeters)})
                                    </span>
                                    <span
                                      className="jump-filename"
                                      style={{ textAlign: 'right' }}
                                      title={jump.toFileName}
                                    >
                                      {jump.toFileName}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
