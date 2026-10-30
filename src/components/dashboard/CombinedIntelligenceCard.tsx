import React, { useState, useRef } from 'react';
import { Layers, ChevronDown, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
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
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  if (!assets || assets.length <= 1) {
    return null;
  }

  const collective = evaluateCollectiveIntelligence(assets);
  const narratives: NarrativeSection[] = generateCollectiveNarratives(collective, assets.length, currentLang);

  // REQ-UI-006: Mobile Scroll Nudge for Verification Matrices
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
          <CheckCircle2 size={14} /> Clean
        </span>
      );
    }
    if (hasHardware || hasTimeline || hasGps) {
      return (
        <span style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <AlertTriangle size={14} /> Partial
        </span>
      );
    }
    return (
      <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <XCircle size={14} /> Stripped
      </span>
    );
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <Layers size={18} />
        <h3>
          {t('collective_intelligence') || 'Collective Intelligence'} ({assets.length} {t('assets') || 'Assets'})
        </h3>
      </div>

      <div className="card-body">
        {/* Collective Storytelling Narratives */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {narratives.map((section, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '0.4rem' }}>
                {section.title}
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {section.narrative}
              </p>
            </div>
          ))}
        </div>

        {/* REQ-UI-006: Verification Matrix Table inside collapsible Details */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <button
            type="button"
            onClick={handleToggleDetails}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              padding: '0.5rem 0',
            }}
          >
            <span>{t('integrity_matrix_title') || 'Integrity Verification Matrix'}</span>
            <ChevronDown
              size={18}
              style={{
                transform: isMatrixOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </button>

          {isMatrixOpen && (
            <div
              ref={tableContainerRef}
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
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 12px' }}>File</th>
                    <th style={{ padding: '8px 12px' }}>Integrity</th>
                    <th style={{ padding: '8px 12px' }}>Hardware</th>
                    <th style={{ padding: '8px 12px' }}>GPS</th>
                    <th style={{ padding: '8px 12px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {collective.integrity.matrix.map((row, idx) => {
                    const asset = assets[idx];
                    const make = String(asset?.exifData?.Make || asset?.exifData?.Model || 'Unknown');
                    const hasGps = Boolean(asset?.exifData?.latitude != null);

                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--text-main)' }}>
                          {row.fileName}
                        </td>
                        <td style={{ padding: '10px 12px' }}>{renderStatusBadge(row.presence)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{make}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {hasGps ? (
                            <span style={{ color: '#22c55e' }}>Yes</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>No</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {onInspectAsset && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => onInspectAsset(idx)}
                              style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>Inspect</span>
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
    </div>
  );
};
