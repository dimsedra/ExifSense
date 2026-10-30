import React from 'react';
import { useAssetStore } from '../store/useAssetStore';
import { useI18nStore } from '../store/useI18nStore';
import { AssetSelectorRibbon } from '../components/dashboard/AssetSelectorRibbon';
import { AssetPreviewCard } from '../components/dashboard/AssetPreviewCard';
import { CombinedIntelligenceCard } from '../components/dashboard/CombinedIntelligenceCard';
import { ExpertAnalysisTabs } from '../components/dashboard/ExpertAnalysisTabs';

export interface DashboardViewProps {
  renderMapSlot?: React.ReactNode;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ renderMapSlot }) => {
  const { assets, activeAssetIndex, setActiveAssetIndex } = useAssetStore();
  const { t } = useI18nStore();

  if (!assets || assets.length === 0) {
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

  const activeAsset = assets[activeAssetIndex] || assets[0]!;

  return (
    <section id="dashboard-state" className="dashboard">
      {/* 1. Full-Width Map Section */}
      {renderMapSlot}

      {/* 2. Combined Analysis Card (Multi-Asset Only) */}
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
