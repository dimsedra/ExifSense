import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Sliders,
  MapPin,
  Smartphone,
  Aperture,
  Calendar,
  Camera,
  MapPinOff,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  ListFilter,
  ChevronLeft,
  ChevronRight,
  Focus,
  Image as ImageIcon,
  Clock,
  FileCheck,
  Layers,
} from 'lucide-react';
import type {
  SanitizerOptions,
  SanitizerPreset,
  PrivacyScoreResult,
} from '../../core/sanitizer/types';
import type { ExifCategory } from '../../core/forensics/types';
import { categorizeExif, formatExifValue, formatLabel, parseExifDate } from '../../core/forensics/metadata';
import { useI18nStore } from '../../store/useI18nStore';

export interface SanitizerWorkspaceProps {
  options: SanitizerOptions;
  riskResult: PrivacyScoreResult;
  exifData?: Record<string, unknown>;
  onOptionToggle: (key: keyof SanitizerOptions, value: boolean) => void;
  onApplyPreset: (preset: SanitizerPreset) => void;
  activePreset?: SanitizerPreset | null;
}

const PREVIEW_CATEGORIES: Array<{
  id: ExifCategory;
  catKey: string;
  icon: React.ReactNode;
}> = [
  { id: 'Device Hardware', catKey: 'cat_hardware', icon: <Smartphone size={16} /> },
  { id: 'Exposure Settings', catKey: 'cat_exposure', icon: <Aperture size={16} /> },
  { id: 'Optics & Lens', catKey: 'cat_optics', icon: <Focus size={16} /> },
  { id: 'Image Quality', catKey: 'cat_quality', icon: <ImageIcon size={16} /> },
  { id: 'Timeline & Date', catKey: 'cat_timeline', icon: <Clock size={16} /> },
  { id: 'Geospatial', catKey: 'cat_geospatial', icon: <MapPin size={16} /> },
  { id: 'Standards & Info', catKey: 'cat_standards', icon: <FileCheck size={16} /> },
  { id: 'Miscellaneous', catKey: 'cat_misc', icon: <Layers size={16} /> },
];

export const SanitizerWorkspace: React.FC<SanitizerWorkspaceProps> = ({
  options,
  riskResult,
  exifData = {},
  onOptionToggle,
  onApplyPreset,
  activePreset,
}) => {
  const { currentLang, t } = useI18nStore();
  const [activePreviewCat, setActivePreviewCat] =
    useState<ExifCategory>('Device Hardware');

  const lat = Number(exifData.latitude ?? exifData.GPSLatitude);
  const lng = Number(exifData.longitude ?? exifData.GPSLongitude);
  const hasGps = !Number.isNaN(lat) && !Number.isNaN(lng);
  const coordsStr = hasGps ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '';

  const make = String(exifData.Make || '').trim();
  const model = String(exifData.Model || '').trim();
  const deviceStr = `${make} ${model}`.trim();
  const hasDevice = Boolean(deviceStr || exifData.Software);

  const fNum = exifData.FNumber ? `f/${exifData.FNumber}` : '';
  const iso = exifData.ISO ? `ISO ${exifData.ISO}` : '';
  const focal = exifData.FocalLength ? `${exifData.FocalLength}mm` : '';
  const camStr = [fNum, iso, focal].filter(Boolean).join(' • ');
  const hasCamera = Boolean(camStr || exifData.ExposureTime || exifData.LensModel);

  const rawDate =
    exifData.DateTimeOriginal || exifData.CreateDate || exifData.ModifyDate;
  const parsedDate = rawDate ? parseExifDate(rawDate) : null;
  const locale =
    currentLang === 'id' ? 'id-ID' : currentLang === 'ar' ? 'ar-SA' : 'en-US';
  const dateStr = parsedDate
    ? parsedDate.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const hasDate = Boolean(rawDate);

  const isSafe = riskResult.isSafe;
  const categorized = categorizeExif(exifData);

  const isCategoryRemoved = (cat: ExifCategory): boolean => {
    const isRemoveAll =
      options.gps && options.device && options.camera && options.date;
    if (isRemoveAll) return true;
    if (cat === 'Geospatial' && options.gps) return true;
    if (cat === 'Device Hardware' && options.device) return true;
    if ((cat === 'Exposure Settings' || cat === 'Optics & Lens') && options.camera)
      return true;
    if (cat === 'Timeline & Date' && options.date) return true;
    return false;
  };

  const previewIndex = PREVIEW_CATEGORIES.findIndex(
    (c) => c.id === activePreviewCat
  );
  const handlePrevPreview = () => {
    const prev =
      (previewIndex - 1 + PREVIEW_CATEGORIES.length) % PREVIEW_CATEGORIES.length;
    setActivePreviewCat(PREVIEW_CATEGORIES[prev]!.id);
  };
  const handleNextPreview = () => {
    const next = (previewIndex + 1) % PREVIEW_CATEGORIES.length;
    setActivePreviewCat(PREVIEW_CATEGORIES[next]!.id);
  };

  const activeCatEntries = Object.entries(categorized[activePreviewCat] || {});
  const activeCatRemoved = isCategoryRemoved(activePreviewCat);

  const renderChecklistItem = (
    present: boolean,
    willStrip: boolean,
    riskText: string,
    safeText: string,
    noneText: string
  ) => {
    if (!present) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
          }}
        >
          <MinusCircle
            size={18}
            style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {noneText}
          </span>
        </div>
      );
    }
    if (willStrip) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
          }}
        >
          <CheckCircle2
            size={18}
            style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }}
          />
          <span style={{ fontSize: '0.85rem', color: '#10b981', lineHeight: 1.4 }}>
            {safeText}
          </span>
        </div>
      );
    }
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          padding: '0.75rem',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
        }}
      >
        <AlertTriangle
          size={18}
          style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }}
        />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
          {riskText}
        </span>
      </div>
    );
  };

  return (
    <>
      {/* 1. Quick Presets Card */}
      <div className="card mb-4">
        <div className="card-header">
          <Sliders size={18} />
          <h3>{t('sanitize_presets_title')}</h3>
        </div>
        <div className="card-body">
          <p className="text-muted text-sm mb-3">{t('sanitize_presets_desc')}</p>
          <div className="preset-buttons-grid">
            <button
              id="preset-max-privacy"
              type="button"
              className={`btn btn-secondary preset-btn ${
                activePreset === 'max-privacy' ? 'active' : ''
              }`}
              onClick={() => onApplyPreset('max-privacy')}
            >
              <ShieldCheck size={16} />
              <span>{t('preset_max_privacy')}</span>
            </button>
            <button
              id="preset-photo-share"
              type="button"
              className={`btn btn-secondary preset-btn ${
                activePreset === 'photo-share' ? 'active' : ''
              }`}
              onClick={() => onApplyPreset('photo-share')}
            >
              <Camera size={16} />
              <span>{t('preset_photo_share')}</span>
            </button>
            <button
              id="preset-location-only"
              type="button"
              className={`btn btn-secondary preset-btn ${
                activePreset === 'location-only' ? 'active' : ''
              }`}
              onClick={() => onApplyPreset('location-only')}
            >
              <MapPinOff size={16} />
              <span>{t('preset_location_only')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Selective Metadata Controls Card */}
      <div className="card mb-4">
        <div className="card-header">
          <ShieldOff size={18} />
          <h3>{t('selective_controls_title')}</h3>
        </div>
        <div className="card-body">
          <div className="sanitize-toggles-list">
            <label className="toggle-row" htmlFor="opt-gps">
              <div className="toggle-info">
                <div className="toggle-title">
                  <MapPin size={16} />
                  <span>{t('cat_gps_removal')}</span>
                </div>
                <div
                  id="detail-gps"
                  className={`toggle-detail ${hasGps ? 'found' : ''}`}
                >
                  {hasGps ? coordsStr : t('no_location_found')}
                </div>
              </div>
              <div className="switch-control">
                <input
                  type="checkbox"
                  id="opt-gps"
                  checked={options.gps}
                  onChange={(e) => onOptionToggle('gps', e.target.checked)}
                />
                <span className="slider round" />
              </div>
            </label>

            <label className="toggle-row" htmlFor="opt-device">
              <div className="toggle-info">
                <div className="toggle-title">
                  <Smartphone size={16} />
                  <span>{t('cat_device_removal')}</span>
                </div>
                <div
                  id="detail-device"
                  className={`toggle-detail ${hasDevice ? 'found' : ''}`}
                >
                  {hasDevice ? deviceStr || String(exifData.Software) : t('no_device_found')}
                </div>
              </div>
              <div className="switch-control">
                <input
                  type="checkbox"
                  id="opt-device"
                  checked={options.device}
                  onChange={(e) => onOptionToggle('device', e.target.checked)}
                />
                <span className="slider round" />
              </div>
            </label>

            <label className="toggle-row" htmlFor="opt-camera">
              <div className="toggle-info">
                <div className="toggle-title">
                  <Aperture size={16} />
                  <span>{t('cat_camera_removal')}</span>
                </div>
                <div
                  id="detail-camera"
                  className={`toggle-detail ${hasCamera ? 'found' : ''}`}
                >
                  {hasCamera ? camStr || 'EXIF' : t('no_exposure_found')}
                </div>
              </div>
              <div className="switch-control">
                <input
                  type="checkbox"
                  id="opt-camera"
                  checked={options.camera}
                  onChange={(e) => onOptionToggle('camera', e.target.checked)}
                />
                <span className="slider round" />
              </div>
            </label>

            <label className="toggle-row" htmlFor="opt-date">
              <div className="toggle-info">
                <div className="toggle-title">
                  <Calendar size={16} />
                  <span>{t('sanitize_toggle_date')}</span>
                </div>
                <div
                  id="detail-date"
                  className={`toggle-detail ${hasDate ? 'found' : ''}`}
                >
                  {hasDate ? dateStr || String(rawDate) : t('no_date_found')}
                </div>
              </div>
              <div className="switch-control">
                <input
                  type="checkbox"
                  id="opt-date"
                  checked={options.date}
                  onChange={(e) => onOptionToggle('date', e.target.checked)}
                />
                <span className="slider round" />
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* 3. Image Privacy Analysis Card */}
      <div id="sanitize-privacy-analysis-card" className="card mb-6">
        <div className="card-header">
          <ShieldAlert size={18} />
          <h3>{t('privacy_analysis')}</h3>
        </div>
        <div id="sanitize-privacy-analysis-content" className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                borderRadius: '8px',
                background: isSafe
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(245, 158, 11, 0.1)',
                border: `1px solid ${
                  isSafe ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'
                }`,
              }}
            >
              <div
                style={{
                  color: isSafe ? '#10b981' : '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: isSafe
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(245, 158, 11, 0.15)',
                  flexShrink: 0,
                }}
              >
                {isSafe ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
              </div>
              <div>
                <h4
                  style={{
                    margin: '0 0 0.25rem 0',
                    color: isSafe ? '#10b981' : '#f59e0b',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  {isSafe ? t('privacy_score_safe') : t('privacy_score_risk')}
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                  }}
                >
                  {isSafe ? t('privacy_desc_safe') : t('privacy_desc_risk')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {renderChecklistItem(
                hasGps,
                options.gps,
                t('privacy_item_gps_risk', { coords: coordsStr }),
                t('privacy_item_gps_safe'),
                t('privacy_item_gps_none')
              )}
              {renderChecklistItem(
                hasDate,
                options.date,
                t('privacy_item_date_risk', { time: dateStr || String(rawDate) }),
                t('privacy_item_date_safe'),
                t('privacy_item_date_none')
              )}
              {renderChecklistItem(
                hasDevice,
                options.device,
                t('privacy_item_device_risk', {
                  device: deviceStr || String(exifData.Software),
                }),
                t('privacy_item_device_safe'),
                t('privacy_item_device_none')
              )}
              {renderChecklistItem(
                hasCamera,
                options.camera,
                t('privacy_item_camera_risk', { settings: camStr || 'EXIF' }),
                t('privacy_item_camera_safe'),
                t('privacy_item_camera_none')
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Reactive Metadata Preview Card */}
      <div id="sanitize-metadata-preview-card" className="card mb-6">
        <div className="card-header">
          <ListFilter size={18} />
          <h3>{t('metadata_preview')}</h3>
        </div>
        <div
          id="sanitize-metadata-preview-content"
          className="card-body p-0"
          style={{ borderTop: '1px solid var(--border-color)' }}
        >
          <div className="tabs-wrapper">
            <button
              type="button"
              className="tabs-arrow left"
              onClick={handlePrevPreview}
              aria-label="Previous Category"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="expert-tabs-container metadata-tabs">
              {PREVIEW_CATEGORIES.map((cat) => {
                const count = Object.keys(categorized[cat.id] || {}).length;
                const removed = isCategoryRemoved(cat.id);
                const isActive = cat.id === activePreviewCat;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`expert-tab-btn ${isActive ? 'active' : ''} ${
                      removed && count > 0 ? 'status-removed-tab' : ''
                    }`}
                    onClick={() => setActivePreviewCat(cat.id)}
                  >
                    {cat.icon}
                    <span>{t(cat.catKey)}</span>
                    <span
                      className="tab-badge"
                      style={
                        removed && count > 0
                          ? { background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }
                          : undefined
                      }
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="tabs-arrow right"
              onClick={handleNextPreview}
              aria-label="Next Category"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="expert-panes-wrapper">
            <div className="expert-tab-pane active">
              {activeCatEntries.length === 0 ? (
                <div className="empty-category-msg">
                  {t('no_metadata_tags', {}, 'narratives')}
                </div>
              ) : (
                <div className="data-grid">
                  {activeCatEntries.map(([key, val]) => (
                    <div
                      key={key}
                      className={`data-item ${activeCatRemoved ? 'item-removed' : ''}`}
                      style={
                        activeCatRemoved
                          ? { opacity: 0.5, borderColor: 'rgba(239, 68, 68, 0.2)' }
                          : undefined
                      }
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <span className="data-label" style={{ marginBottom: 0 }}>
                          {formatLabel(key)}
                        </span>
                        {activeCatRemoved ? (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              color: '#ef4444',
                              fontFamily: 'var(--font-mono)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#ef4444',
                              }}
                            />
                            {t('status_removed')}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              color: '#10b981',
                              fontFamily: 'var(--font-mono)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#10b981',
                              }}
                            />
                            {t('status_kept')}
                          </span>
                        )}
                      </div>
                      <span
                        className="data-value"
                        style={
                          activeCatRemoved
                            ? {
                                textDecoration: 'line-through',
                                color: 'var(--text-muted)',
                              }
                            : undefined
                        }
                      >
                        {formatExifValue(key, val, currentLang)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
