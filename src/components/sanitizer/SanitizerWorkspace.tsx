import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Cpu,
  Camera,
  Calendar,
} from 'lucide-react';
import type {
  SanitizerOptions,
  SanitizerPreset,
  PrivacyScoreResult,
} from '../../core/sanitizer/types';
import { useI18nStore } from '../../store/useI18nStore';

export interface SanitizerWorkspaceProps {
  options: SanitizerOptions;
  riskResult: PrivacyScoreResult;
  onOptionToggle: (key: keyof SanitizerOptions, value: boolean) => void;
  onApplyPreset: (preset: SanitizerPreset) => void;
  activePreset?: SanitizerPreset | null;
}

export const SanitizerWorkspace: React.FC<SanitizerWorkspaceProps> = ({
  options,
  riskResult,
  onOptionToggle,
  onApplyPreset,
  activePreset,
}) => {
  const { t } = useI18nStore();

  const isSafe = riskResult.isSafe;

  return (
    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      {/* Live Privacy Risk Alert Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          backgroundColor: isSafe ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 88, 12, 0.1)',
          border: `1px solid ${isSafe ? '#10b981' : '#ea580c'}`,
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ color: isSafe ? '#10b981' : '#ea580c' }}>
          {isSafe ? <ShieldCheck size={36} /> : <ShieldAlert size={36} />}
        </div>
        <div>
          <h4
            style={{
              margin: '0 0 0.25rem 0',
              fontSize: '1rem',
              fontWeight: 700,
              color: isSafe ? '#10b981' : '#ea580c',
            }}
          >
            {isSafe
              ? t('privacy_protected') || 'Protected: All Sensitive Metadata Selected for Removal'
              : t('privacy_risk_detected') || 'Privacy Risk: Sensitive Metadata Remains Unstripped'}
          </h4>
          <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            {isSafe
              ? t('safe_to_publish_desc') ||
                'No identifying device serials, coordinates, or timestamps will remain in the output.'
              : t('privacy_risk_desc') ||
                'Some private tags are still enabled. Choose a preset or toggle individual options below.'}
          </p>
        </div>
      </div>

      {/* Quick Preset Buttons */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            marginBottom: '0.75rem',
          }}
        >
          {t('quick_presets') || 'Quick Presets'}
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${activePreset === 'max-privacy' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onApplyPreset('max-privacy')}
          >
            {t('preset_max_privacy') || 'Max Privacy'}
          </button>
          <button
            type="button"
            className={`btn ${activePreset === 'photo-share' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onApplyPreset('photo-share')}
          >
            {t('preset_photo_share') || 'Safe Photo Share'}
          </button>
          <button
            type="button"
            className={`btn ${activePreset === 'location-only' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onApplyPreset('location-only')}
          >
            {t('preset_location_only') || 'Location Only'}
          </button>
        </div>
      </div>

      {/* Category Strip Checkboxes */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            marginBottom: '0.75rem',
          }}
        >
          {t('strip_categories') || 'Metadata Categories to Strip'}
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* GPS Toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              background: 'var(--secondary)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={options.gps}
              onChange={(e) => onOptionToggle('gps', e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <MapPin size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                GPS Location
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Coords, Altitude</div>
            </div>
          </label>

          {/* Device Toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              background: 'var(--secondary)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={options.device}
              onChange={(e) => onOptionToggle('device', e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <Cpu size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Device Hardware
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Make, Model, Serial</div>
            </div>
          </label>

          {/* Camera Settings Toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              background: 'var(--secondary)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={options.camera}
              onChange={(e) => onOptionToggle('camera', e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <Camera size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Camera Settings
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ISO, Aperture, Shutter</div>
            </div>
          </label>

          {/* Date & Timeline Toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              background: 'var(--secondary)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={options.date}
              onChange={(e) => onOptionToggle('date', e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <Calendar size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Date & Timestamps
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Original, Mod, Create</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
