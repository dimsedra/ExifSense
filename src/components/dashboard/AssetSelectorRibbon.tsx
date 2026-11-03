import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Images, MapPin, AlertCircle } from 'lucide-react';
import type { ForensicAsset } from '../../core/forensics/types';
import { formatFileSize } from '../StagedQueue';
import { useI18nStore } from '../../store/useI18nStore';
import { getImagePreview } from '../../services/imagePreviewCache';

export interface AssetSelectorRibbonProps {
  assets: ForensicAsset[];
  activeAssetIndex: number;
  onSelectAsset: (index: number) => void;
}

type AssetFilterType = 'all' | 'complete' | 'stripped';

const RibbonThumbnail: React.FC<{
  thumbUrl?: string;
  sha256?: string;
  fileName: string;
}> = ({ thumbUrl, sha256, fileName }) => {
  const [src, setSrc] = useState(thumbUrl || '');
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setSrc(thumbUrl || '');
    setLoadError(false);
    let active = true;

    if ((!thumbUrl || thumbUrl.startsWith('blob:')) && sha256) {
      getImagePreview(sha256)
        .then((blob) => {
          if (active && blob) {
            try {
              const url = URL.createObjectURL(blob);
              setSrc(url);
            } catch {
              // Ignore createObjectURL error
            }
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [thumbUrl, sha256]);

  if (loadError || !src) {
    return (
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
    );
  }

  return (
    <img
      src={src}
      alt={fileName}
      onError={() => setLoadError(true)}
    />
  );
};

export const AssetSelectorRibbon: React.FC<AssetSelectorRibbonProps> = ({
  assets,
  activeAssetIndex,
  onSelectAsset,
}) => {
  const { t } = useI18nStore();
  const listRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = useState<AssetFilterType>('all');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (assets.length <= 1) return;
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

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;

    const activeEl = container.querySelector('.asset-thumb-btn.active') as HTMLElement | null;
    if (!activeEl) return;

    const containerWidth = container.clientWidth;
    const elementLeft = activeEl.offsetLeft;
    const elementWidth = activeEl.offsetWidth;

    const targetScrollLeft = elementLeft - containerWidth / 2 + elementWidth / 2;
    if (typeof container.scrollTo === 'function') {
      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth',
      });
    } else {
      container.scrollLeft = Math.max(0, targetScrollLeft);
    }
  }, [activeAssetIndex]);

  if (assets.length <= 1) return null;

  return (
    <div id="asset-selector-container" className="asset-selector-wrapper">
      <div className="selector-header">
        <div className="selector-title-group">
          <Images size={18} />
          <h3>{t('select_asset')}</h3>
        </div>
        <div className="selector-controls-group">
          <div className="asset-filters">
            <button
              type="button"
              className={`asset-filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              {t('filter_all', {}, 'narratives')}
            </button>
            <button
              type="button"
              className={`asset-filter-btn ${filterType === 'complete' ? 'active' : ''}`}
              onClick={() => setFilterType('complete')}
            >
              {t('filter_complete', {}, 'narratives')}
            </button>
            <button
              type="button"
              className={`asset-filter-btn ${filterType === 'stripped' ? 'active' : ''}`}
              onClick={() => setFilterType('stripped')}
            >
              {t('filter_stripped', {}, 'narratives')}
            </button>
          </div>
          <span id="batch-count" className="badge count-badge">
            {t('asset_count', { n: assets.length })}
          </span>
        </div>
      </div>

      <div id="asset-selector-list" className="asset-selector-list" ref={listRef}>
        {assets.map((asset, idx) => {
          const isActive = idx === activeAssetIndex;
          const hasGps = Boolean(
            asset.exifData &&
              (asset.exifData.latitude != null ||
                asset.exifData.GPSLatitude != null ||
                (asset.categorizedExif?.Geospatial &&
                  Object.keys(asset.categorizedExif.Geospatial).length > 0))
          );
          const isFullyStripped = asset.integrityAlerts?.some(
            (a) => a.type === 'fully_stripped'
          );

          if (filterType === 'complete' && isFullyStripped) return null;
          if (filterType === 'stripped' && !isFullyStripped) return null;

          return (
            <button
              key={asset.id || `asset-${idx}`}
              type="button"
              className={`asset-thumb-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectAsset(idx)}
              title={asset.fileName}
            >
              <div className="asset-card-thumb">
                <RibbonThumbnail
                  thumbUrl={asset.thumbUrl}
                  sha256={asset.sha256}
                  fileName={asset.fileName}
                />
                <div className="asset-card-badges">
                  {hasGps && (
                    <div className="badge-geo" title={t('cat_geospatial')}>
                      <MapPin size={10} />
                    </div>
                  )}
                  {isFullyStripped && (
                    <div
                      className="badge-stripped"
                      title={t('filter_stripped', {}, 'narratives')}
                    >
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
