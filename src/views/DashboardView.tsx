import React, { useEffect } from 'react';
import { useAssetStore } from '../store/useAssetStore';
import { useI18nStore } from '../store/useI18nStore';
import { reverseGeocode } from '../services/mapHelpers';
import { AssetSelectorRibbon } from '../components/dashboard/AssetSelectorRibbon';
import { AssetPreviewCard } from '../components/dashboard/AssetPreviewCard';
import { CombinedIntelligenceCard } from '../components/dashboard/CombinedIntelligenceCard';
import { ChronologicalStoryCard } from '../components/dashboard/ChronologicalStoryCard';
import { ExpertAnalysisTabs } from '../components/dashboard/ExpertAnalysisTabs';

export interface DashboardViewProps {
  renderMapSlot?: React.ReactNode;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ renderMapSlot }) => {
  const { assets, activeAssetIndex, setActiveAssetIndex, updateAssetLocation } = useAssetStore();
  const { t } = useI18nStore();

  const activeAsset = assets[activeAssetIndex] || assets[0];

  useEffect(() => {
    if (!activeAsset) return;
    const lat = activeAsset.exifData?.latitude ?? activeAsset.exifData?.GPSLatitude;
    const lng = activeAsset.exifData?.longitude ?? activeAsset.exifData?.GPSLongitude;

    if (lat != null && lng != null && activeAsset.locationData === undefined) {
      let isMounted = true;
      reverseGeocode(Number(lat), Number(lng)).then((locData) => {
        if (isMounted) {
          updateAssetLocation(activeAsset.id, locData);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [activeAsset, updateAssetLocation]);

  if (!assets || assets.length === 0 || !activeAsset) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
        <p>{t('no_sanitizer_target')}</p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
          onClick={() => {
            window.location.hash = '#/';
          }}
        >
          {t('return_to_home')}
        </button>
      </div>
    );
  }

  return (
    <section id="dashboard-state" className="dashboard state-container active">
      {/* 1. Full-Width Map Section */}
      {renderMapSlot}

      {/* 2. Chronological Batch Narrative (Multi-Asset Only) */}
      <ChronologicalStoryCard
        assets={assets}
        onInspectAsset={setActiveAssetIndex}
      />

      {/* 3. Combined Analysis Card (Multi-Asset Only) */}
      <CombinedIntelligenceCard
        assets={assets}
        onInspectAsset={setActiveAssetIndex}
      />

      {/* 3. Main 2-Column Dashboard Grid */}
      <div className="dashboard-grid">
        <div className="col-left">
          <AssetPreviewCard asset={activeAsset} />
        </div>

        <div className="col-right">
          <ExpertAnalysisTabs
            asset={activeAsset}
            selectorSlot={
              <AssetSelectorRibbon
                assets={assets}
                activeAssetIndex={activeAssetIndex}
                onSelectAsset={setActiveAssetIndex}
              />
            }
          />
        </div>
      </div>
    </section>
  );
};
