import React from 'react';
import { useAssetStore } from '../store/useAssetStore';
import { AssetSelectorRibbon } from '../components/dashboard/AssetSelectorRibbon';
import { AssetPreviewCard } from '../components/dashboard/AssetPreviewCard';
import { CombinedIntelligenceCard } from '../components/dashboard/CombinedIntelligenceCard';
import { ExpertAnalysisTabs } from '../components/dashboard/ExpertAnalysisTabs';

export interface DashboardViewProps {
  renderMapSlot?: React.ReactNode;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ renderMapSlot }) => {
  const { assets, activeAssetIndex, setActiveAssetIndex } = useAssetStore();

  if (!assets || assets.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
        <p>No active investigation session. Please upload images from the home workspace.</p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
          onClick={() => {
            window.location.hash = '#/';
          }}
        >
          Return to Home
        </button>
      </div>
    );
  }

  const activeAsset = assets[activeAssetIndex] || assets[0]!;

  return (
    <div className="dashboard-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
      {/* Multi-Asset Selector Ribbon (Batch Mode) */}
      <AssetSelectorRibbon
        assets={assets}
        activeAssetIndex={activeAssetIndex}
        onSelectAsset={setActiveAssetIndex}
      />

      <div className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
        {/* Left Column: Asset Preview & Cryptographic Hashes */}
        <div className="col-left">
          <AssetPreviewCard asset={activeAsset} />
        </div>

        {/* Right Column: Collective Intelligence, Map Slot, and Expert Analysis Panes */}
        <div className="col-right">
          {/* Collective Multi-Asset Matrix */}
          <CombinedIntelligenceCard
            assets={assets}
            onInspectAsset={setActiveAssetIndex}
          />

          {/* Interactive Map Slot */}
          {renderMapSlot}

          {/* 7-Category Forensic Expert Analysis */}
          <ExpertAnalysisTabs asset={activeAsset} />
        </div>
      </div>
    </div>
  );
};
