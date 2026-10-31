import React, { useState, useRef, useLayoutEffect } from 'react';
import {
  ShieldCheck,
  Smartphone,
  Aperture,
  Focus,
  Image as ImageIcon,
  Clock,
  MapPin,
  Cpu,
  FileCheck,
  Layers,
  ListPlus,
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
import { formatExifValue, formatLabel } from '../../core/forensics/metadata';
import { useI18nStore } from '../../store/useI18nStore';

export interface ExpertAnalysisTabsProps {
  asset: ForensicAsset;
  selectorSlot?: React.ReactNode;
}

interface NarrativeTabConfig {
  id: ExifCategory;
  analysisKey: string;
  catKey: string;
  icon: React.ReactNode;
}

const NARRATIVE_TABS: NarrativeTabConfig[] = [
  {
    id: 'Standards & Info',
    analysisKey: 'analysis_integrity',
    catKey: 'cat_standards',
    icon: <ShieldCheck size={16} />,
  },
  {
    id: 'Geospatial',
    analysisKey: 'analysis_geospatial',
    catKey: 'cat_geospatial',
    icon: <MapPin size={16} />,
  },
  {
    id: 'Device Hardware',
    analysisKey: 'analysis_hardware',
    catKey: 'cat_hardware',
    icon: <Smartphone size={16} />,
  },
  {
    id: 'Exposure Settings',
    analysisKey: 'analysis_exposure',
    catKey: 'cat_exposure',
    icon: <Aperture size={16} />,
  },
  {
    id: 'Optics & Lens',
    analysisKey: 'analysis_optics',
    catKey: 'cat_optics',
    icon: <Focus size={16} />,
  },
  {
    id: 'Image Quality',
    analysisKey: 'analysis_quality',
    catKey: 'cat_quality',
    icon: <ImageIcon size={16} />,
  },
  {
    id: 'Timeline & Date',
    analysisKey: 'analysis_timeline',
    catKey: 'cat_timeline',
    icon: <Clock size={16} />,
  },
];

const RAW_CATEGORIES: Array<{
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

export const ExpertAnalysisTabs: React.FC<ExpertAnalysisTabsProps> = ({
  asset,
  selectorSlot,
}) => {
  const { currentLang, t } = useI18nStore();
  const [activeNarrativeTab, setActiveNarrativeTab] =
    useState<ExifCategory>('Standards & Info');
  const [activeRawCategory, setActiveRawCategory] =
    useState<ExifCategory>('Device Hardware');

  const wrapperRef = useRef<HTMLDivElement>(null);
  const activePaneRef = useRef<HTMLDivElement>(null);
  const rawMetadataRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!wrapperRef.current || !activePaneRef.current) return;
    const currentHeight = activePaneRef.current.offsetHeight;
    if (currentHeight > 0) {
      wrapperRef.current.style.transition =
        'min-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
      wrapperRef.current.style.minHeight = `${currentHeight}px`;
    }
  }, [activeNarrativeTab, asset]);

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
        const locName =
          (asset.locationData?.display_name as string) ||
          asset.locationName ||
          null;
        return generateGeospatialNarrative(lat, lng, locName, currentLang);
      }
      case 'Standards & Info':
        return generateIntegrityNarrative(asset, currentLang);
      default:
        return '';
    }
  };

  const narrativeText = getNarrativeForCategory(activeNarrativeTab);
  const activeTabConfig =
    NARRATIVE_TABS.find((item) => item.id === activeNarrativeTab) || NARRATIVE_TABS[0]!;

  const activeIndex = NARRATIVE_TABS.findIndex((item) => item.id === activeNarrativeTab);
  const handlePrevTab = () => {
    const prevIdx = (activeIndex - 1 + NARRATIVE_TABS.length) % NARRATIVE_TABS.length;
    setActiveNarrativeTab(NARRATIVE_TABS[prevIdx]!.id);
  };
  const handleNextTab = () => {
    const nextIdx = (activeIndex + 1) % NARRATIVE_TABS.length;
    setActiveNarrativeTab(NARRATIVE_TABS[nextIdx]!.id);
  };

  const rawIndex = RAW_CATEGORIES.findIndex((item) => item.id === activeRawCategory);
  const handlePrevRaw = () => {
    const prevIdx = (rawIndex - 1 + RAW_CATEGORIES.length) % RAW_CATEGORIES.length;
    setActiveRawCategory(RAW_CATEGORIES[prevIdx]!.id);
  };
  const handleNextRaw = () => {
    const nextIdx = (rawIndex + 1) % RAW_CATEGORIES.length;
    setActiveRawCategory(RAW_CATEGORIES[nextIdx]!.id);
  };

  const rawData = asset.categorizedExif?.[activeRawCategory] || {};
  const rawEntries = Object.entries(rawData);
  const activeRawCatConfig =
    RAW_CATEGORIES.find((item) => item.id === activeRawCategory) || RAW_CATEGORIES[0]!;

  return (
    <>
      <div id="expert-analysis-card" className="card expert-card mb-6">
        {selectorSlot}

        <div className="card-header">
          <Cpu size={18} />
          <h3 id="individual-analysis-title">
            {t('dynamic_asset_analysis', { name: asset.fileName })}
          </h3>
          <span className="badge">{t('forensic_grade')}</span>
        </div>

        <div id="expert-analysis-content" className="card-body expert-body">
          <div className="tabs-wrapper">
            <button
              type="button"
              className="tabs-arrow left"
              onClick={handlePrevTab}
              aria-label="Previous Tab"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="expert-tabs-container">
              {NARRATIVE_TABS.map((tab) => {
                const isActive = tab.id === activeNarrativeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`expert-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveNarrativeTab(tab.id)}
                  >
                    {tab.icon}
                    <span>{t(tab.analysisKey)}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="tabs-arrow right"
              onClick={handleNextTab}
              aria-label="Next Tab"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="expert-panes-wrapper" ref={wrapperRef}>
            <div className="expert-tab-pane active" ref={activePaneRef}>
              <div
                className="expert-narrative-bubble"
                dangerouslySetInnerHTML={{
                  __html: (narrativeText || t('no_data_narrative', {}, 'narratives')).replace(
                    /\n/g,
                    '<br/>'
                  ),
                }}
              />

              {activeNarrativeTab !== 'Standards & Info' && (
                <div className="expert-pane-actions">
                  <button
                    type="button"
                    className="btn-link jump-to-cat-btn"
                    onClick={() => {
                      setActiveRawCategory(activeNarrativeTab);
                      rawMetadataRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                      });
                    }}
                  >
                    <ListPlus size={14} />{' '}
                    {t('view_details', { cat: t(activeTabConfig.catKey) })}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Categorized Raw Metadata Tabs */}
      <div id="metadata-container" className="metadata-container" ref={rawMetadataRef}>
        <div className="tabs-wrapper">
          <button
            type="button"
            className="tabs-arrow left"
            onClick={handlePrevRaw}
            aria-label="Previous Category"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="expert-tabs-container metadata-tabs">
            {RAW_CATEGORIES.map((cat) => {
              const isActive = cat.id === activeRawCategory;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`expert-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveRawCategory(cat.id)}
                >
                  {cat.icon}
                  <span>{t(cat.catKey)}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="tabs-arrow right"
            onClick={handleNextRaw}
            aria-label="Next Category"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="expert-panes-wrapper">
          <div className="expert-tab-pane active">
            <div className="card">
              <div className="card-header">
                {activeRawCatConfig.icon}
                <h3>{t(activeRawCatConfig.catKey)}</h3>
              </div>
              <div className="card-body">
                {rawEntries.length === 0 ? (
                  <div className="text-muted" style={{ padding: '24px', textAlign: 'center', opacity: 0.7 }}>
                    {t('no_metadata_tags', {}, 'narratives')}
                  </div>
                ) : (
                  <div className="data-grid">
                    {rawEntries.map(([key, val]) => (
                      <div key={key} className="data-item">
                        <div className="data-label" title={key}>
                          {formatLabel(key)}
                        </div>
                        <div className="data-value">
                          {formatExifValue(key, val, currentLang)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
