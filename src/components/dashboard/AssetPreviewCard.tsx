import React from 'react';
import { Image as ImageIcon, Copy, Check } from 'lucide-react';
import type { ForensicAsset } from '../../core/forensics/types';
import { formatFileSize } from '../StagedQueue';
import { showToast } from '../ToastContainer';
import { useI18nStore } from '../../store/useI18nStore';

export interface AssetPreviewCardProps {
  asset: ForensicAsset;
}

export const AssetPreviewCard: React.FC<AssetPreviewCardProps> = ({ asset }) => {
  const { currentLang, t } = useI18nStore();
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopyHash = async (hash: string, label: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedKey(label);
      showToast(t('hash_copied'));
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const locale =
    currentLang === 'id' ? 'id-ID' : currentLang === 'ar' ? 'ar-SA' : 'en-US';
  const formattedDate = asset.fileDate
    ? new Date(asset.fileDate).toLocaleString(locale)
    : t('unknown', {}, 'reports');

  return (
    <div className="card image-card">
      <div className="card-header">
        <ImageIcon size={18} />
        <h3>{t('source_file')}</h3>
      </div>

      <div className="card-body">
        <div className="image-preview-wrapper">
          {asset.thumbUrl ? (
            <img id="preview-image" src={asset.thumbUrl} alt={asset.fileName} />
          ) : (
            <div
              id="preview-image"
              style={{
                minHeight: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#111213',
                color: '#a1a1aa',
              }}
            >
              <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                <ImageIcon size={40} style={{ opacity: 0.6, marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{asset.fileName}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  {formatFileSize(asset.fileSize)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div id="file-basic-info" className="file-basic-info">
          <div className="info-item">
            <span className="info-label">{t('file_name')}</span>
            <span className="info-value" title={asset.fileName}>
              {asset.fileName}
            </span>
          </div>

          <div className="info-item">
            <span className="info-label">{t('file_type')}</span>
            <span className="info-value">
              {asset.fileType || t('unknown', {}, 'reports')}
            </span>
          </div>

          <div className="info-item">
            <span className="info-label">{t('file_size')}</span>
            <span className="info-value">{formatFileSize(asset.fileSize)}</span>
          </div>

          <div className="info-item">
            <span className="info-label">{t('file_date')}</span>
            <span className="info-value">{formattedDate}</span>
          </div>

          <div className="info-item">
            <span className="info-label">SHA-256</span>
            <div className="info-value">
              <div className="hash-value-container">
                <span className="hash-text" title={asset.sha256}>
                  {asset.sha256 || 'N/A'}
                </span>
                {asset.sha256 && (
                  <button
                    type="button"
                    className="btn-copy-hash"
                    onClick={() => void handleCopyHash(asset.sha256, 'SHA-256')}
                    title="Copy SHA-256"
                  >
                    {copiedKey === 'SHA-256' ? (
                      <Check size={13} color="#22c55e" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="info-item">
            <span className="info-label">SHA-1</span>
            <div className="info-value">
              <div className="hash-value-container">
                <span className="hash-text" title={asset.sha1}>
                  {asset.sha1 || 'N/A'}
                </span>
                {asset.sha1 && (
                  <button
                    type="button"
                    className="btn-copy-hash"
                    onClick={() => void handleCopyHash(asset.sha1, 'SHA-1')}
                    title="Copy SHA-1"
                  >
                    {copiedKey === 'SHA-1' ? (
                      <Check size={13} color="#22c55e" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
