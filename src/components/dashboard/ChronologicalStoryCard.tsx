import React, { useState, useEffect } from 'react';
import { BookOpen, Copy, Check, ArrowRight } from 'lucide-react';
import type { ForensicAsset } from '../../core/forensics/types';
import { generateChronologicalBatchStory } from '../../core/narratives/chronological';
import { useI18nStore } from '../../store/useI18nStore';
import { useAssetStore } from '../../store/useAssetStore';
import { parseExifDate } from '../../core/forensics/metadata';
import { reverseGeocode } from '../../services/mapHelpers';

export interface ChronologicalStoryCardProps {
  assets: ForensicAsset[];
  onInspectAsset?: (assetIndex: number) => void;
}

export const ChronologicalStoryCard: React.FC<ChronologicalStoryCardProps> = ({
  assets,
  onInspectAsset,
}) => {
  const { currentLang, t } = useI18nStore();
  const { updateAssetLocation } = useAssetStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!assets || assets.length < 2) return;

    const geoAssets = assets
      .filter((a) => {
        const lat = a.exifData?.latitude ?? a.exifData?.GPSLatitude;
        const lng = a.exifData?.longitude ?? a.exifData?.GPSLongitude;
        return (
          lat != null &&
          lng != null &&
          !Number.isNaN(Number(lat)) &&
          !Number.isNaN(Number(lng))
        );
      })
      .map((a) => {
        const rawDate =
          a.exifData?.DateTimeOriginal ||
          a.exifData?.CreateDate ||
          a.exifData?.DateTime;
        const d = parseExifDate(rawDate);
        return {
          asset: a,
          time: d ? d.getTime() : a.fileDate || 0,
        };
      })
      .sort((a, b) => a.time - b.time);

    let isCancelled = false;
    const pendingAssets = geoAssets.filter(
      (item) => item.asset.locationData === undefined
    );

    if (pendingAssets.length > 0) {
      const resolveLocations = async () => {
        for (const item of pendingAssets) {
          if (isCancelled) break;
          const a = item.asset;
          const lat = Number(a.exifData.latitude ?? a.exifData.GPSLatitude);
          const lng = Number(a.exifData.longitude ?? a.exifData.GPSLongitude);
          try {
            const locData = await reverseGeocode(lat, lng);
            if (!isCancelled && locData) {
              updateAssetLocation(a.id, locData);
            }
          } catch {
            // ignore network errors
          }
        }
      };

      resolveLocations();
    }

    return () => {
      isCancelled = true;
    };
  }, [assets, updateAssetLocation]);

  if (!assets || assets.length <= 1) {
    return null;
  }

  const htmlStory = generateChronologicalBatchStory(assets, {
    locale: currentLang,
    format: 'html',
  });

  const handleCopyStory = async () => {
    const markdownStory = generateChronologicalBatchStory(assets, {
      locale: currentLang,
      format: 'markdown',
    });

    try {
      await navigator.clipboard.writeText(markdownStory.fullNarrative);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="card chronological-story-card">
      <div
        className="card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <BookOpen style={{ width: 18, height: 18, color: 'var(--accent)' }} />
          <div>
            <h3 style={{ margin: 0 }}>{t('chronological_story_title')}</h3>
          </div>
        </div>

        <button
          className="btn btn-secondary"
          onClick={handleCopyStory}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8rem',
            padding: '0.35rem 0.75rem',
          }}
          title={t('copy_story_markdown')}
        >
          {copied ? (
            <>
              <Check style={{ width: 14, height: 14, color: 'var(--accent)' }} />
              <span>{t('story_copied')}</span>
            </>
          ) : (
            <>
              <Copy style={{ width: 14, height: 14 }} />
              <span>{t('copy_story_markdown')}</span>
            </>
          )}
        </button>
      </div>

      <div
        className="chronological-lead-baseline"
        dangerouslySetInnerHTML={{ __html: htmlStory.baseline }}
      />

      <div className="chronological-timeline-steps">
        {htmlStory.steps.map((step) => (
          <div key={step.stepIndex} className="chronological-step-item">
            <div className="chronological-step-badge">
              {step.stepIndex + 1}
            </div>
            <div className="chronological-step-content">
              <p
                className="chronological-step-text"
                dangerouslySetInnerHTML={{ __html: step.narrativeText }}
              />
              {onInspectAsset && (
                <div className="chronological-step-actions">
                  <button
                    type="button"
                    className="chronological-inspect-btn"
                    onClick={() => onInspectAsset(step.assetIndex)}
                  >
                    <span>{t('inspect_asset')}</span>
                    <ArrowRight style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
