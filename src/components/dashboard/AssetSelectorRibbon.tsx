import React, { useEffect, useRef } from 'react';
import { Image as ImageIcon, MapPin, AlertCircle } from 'lucide-react';
import type { ForensicAsset } from '../../core/forensics/types';
import { formatFileSize } from '../StagedQueue';
import { useI18nStore } from '../../store/useI18nStore';

export interface AssetSelectorRibbonProps {
  assets: ForensicAsset[];
  activeAssetIndex: number;
  onSelectAsset: (index: number) => void;
}

export const AssetSelectorRibbon: React.FC<AssetSelectorRibbonProps> = ({
  assets,
  activeAssetIndex,
  onSelectAsset,
}) => {
  const { t } = useI18nStore();
  const listRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation: Left/Right arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (assets.length <= 1) return;

      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = (activeAssetIndex + 1) % assets.length;
        onSelectAsset(nextIndex);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = (activeAssetIndex - 1 + assets.length) % assets.length;
        onSelectAsset(prevIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [assets.length, activeAssetIndex, onSelectAsset]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[activeAssetIndex] as HTMLElement | undefined;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeAssetIndex]);

  if (assets.length <= 1) return null;

  return (
    <div className="asset-selector-wrapper">
      <div className="selector-header">
        <span>{t('investigation_assets') || 'Investigation Assets'}</span>
        <span className="count-badge">
          {activeAssetIndex + 1} / {assets.length}
        </span>
      </div>

      <div className="asset-selector-list" ref={listRef}>
        {assets.map((asset, idx) => {
          const isActive = idx === activeAssetIndex;
          const hasGps = Boolean(
            asset.exifData &&
              (asset.exifData.latitude != null ||
                asset.exifData.GPSLatitude != null ||
                (asset.categorizedExif?.Geospatial &&
                  Object.keys(asset.categorizedExif.Geospatial).length > 0))
          );
          const hasAlerts = asset.integrityAlerts && asset.integrityAlerts.length > 0;

          return (
            <button
              key={asset.id || `asset-${idx}`}
              type="button"
              className={`asset-thumb-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectAsset(idx)}
              title={asset.fileName}
            >
              <div className="asset-card-thumb">
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#18181b',
                    color: '#71717a',
                  }}
                >
                  <ImageIcon size={24} />
                </div>
                <div className="asset-card-badges">
                  {hasGps && (
                    <div className="badge-geo" title="Has GPS Coordinates">
                      <MapPin size={10} />
                    </div>
                  )}
                  {hasAlerts && (
                    <div className="badge-stripped" title="Integrity Alerts Flagged">
                      <AlertCircle size={10} />
                    </div>
                  )}
                </div>
              </div>

              <div className="asset-card-info">
                <span className="asset-card-name">{asset.fileName}</span>
                <span className="asset-card-size">{formatFileSize(asset.fileSize)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
