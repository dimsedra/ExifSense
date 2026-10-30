import React, { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  Database,
  Layers,
  ShieldOff,
  FileImage,
} from 'lucide-react';
import { useHistoryStore } from '../store/useHistoryStore';
import type { HistoryFilter, HistorySession } from '../store/useHistoryStore';
import { ConfirmModal } from '../components/ConfirmModal';
import { useI18nStore } from '../store/useI18nStore';

export interface HistoryViewProps {
  embedded?: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ embedded = false }) => {
  const { currentLang, t } = useI18nStore();
  const {
    loadSessions,
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    getFilteredSessions,
    deleteSession,
    clearAllSessions,
    restoreSession,
  } = useHistoryStore();

  const [deleteTarget, setDeleteTarget] = useState<HistorySession | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const filteredSessions = getFilteredSessions();

  const handleRestore = (id: number) => {
    const success = restoreSession(id);
    if (success) {
      window.location.hash = '#/dashboard';
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget !== null) {
      deleteSession(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleConfirmClearAll = () => {
    clearAllSessions();
    setIsClearAllOpen(false);
  };

  const formatSessionDate = (isoDate: string): string => {
    try {
      const dateObj = new Date(isoDate);
      const locale =
        currentLang === 'id' ? 'id-ID' : currentLang === 'ar' ? 'ar-SA' : 'en-US';
      return `${dateObj.toLocaleDateString(locale)} ${dateObj.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return isoDate;
    }
  };

  const getSecondaryMeta = (session: HistorySession): string => {
    if (session.isSanitized) {
      const opts = session.sanitizeOptions || {
        gps: true,
        device: true,
        camera: true,
        date: true,
      };
      const removedList: string[] = [];
      if (opts.gps) removedList.push('GPS');
      if (opts.device) removedList.push(t('sanitized_device_short'));
      if (opts.camera) removedList.push(t('sanitized_camera_short'));
      if (opts.date) removedList.push(t('sanitized_date_short'));
      return removedList.length > 0
        ? `-${removedList.join(', -')}`
        : t('history_sanitized_badge');
    }

    if (session.isBatch) {
      return t('asset_count', { n: session.assetCount });
    }

    const firstAsset = session.assets[0];
    const make = String(firstAsset?.exifData?.Make || '').trim();
    const model = String(firstAsset?.exifData?.Model || '').trim();
    const device = `${make} ${model}`.trim();
    return device || t('history_unknown_device');
  };

  const getDisplayName = (session: HistorySession): string => {
    if (session.isSanitized) {
      const firstFile = session.assets[0]?.fileName || session.sessionTitle;
      return t('sanitized_session_title', { name: firstFile });
    }
    if (session.isBatch && session.assets.length > 1) {
      return t('history_more', {
        name: session.assets[0]!.fileName,
        n: session.assetCount - 1,
      });
    }
    return session.sessionTitle;
  };

  const content = (
    <section className="history-section" id="history-section">
      <div className="history-controls">
        <div className="history-filters">
          <button
            type="button"
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            data-filter="all"
            onClick={() => setFilter('all' as HistoryFilter)}
          >
            {t('filter_all')}
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'single' ? 'active' : ''}`}
            data-filter="single"
            onClick={() => setFilter('single' as HistoryFilter)}
          >
            {t('filter_single')}
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'batch' ? 'active' : ''}`}
            data-filter="batch"
            onClick={() => setFilter('batch' as HistoryFilter)}
          >
            {t('filter_batch')}
          </button>
        </div>
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            id="history-search"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          id="clear-history"
          type="button"
          className="btn-text"
          title={t('clear_history')}
          onClick={() => setIsClearAllOpen(true)}
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div id="history-list" className="history-grid">
        {filteredSessions.length === 0 ? (
          <div className="empty-history">
            <Database size={48} />
            <p>
              {searchQuery || filter !== 'all'
                ? t('history_no_matches', { query: searchQuery })
                : t('history_no_analyses')}
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const displayName = getDisplayName(session);
            const secondaryMeta = getSecondaryMeta(session);

            return (
              <div
                key={session.id}
                className={`history-card ${session.isBatch ? 'batch-item' : ''} ${
                  session.isSanitized ? 'sanitized-item' : ''
                }`}
                onClick={() => handleRestore(session.id)}
              >
                <div className="history-thumb">
                  {session.mainThumb ? (
                    <img src={session.mainThumb} alt={displayName} />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <FileImage size={24} />
                    </div>
                  )}
                  {session.isBatch && (
                    <div className="batch-badge">
                      <Layers size={10} /> {session.assetCount}
                    </div>
                  )}
                  {session.isSanitized && (
                    <div
                      className="sanitized-badge"
                      title={t('history_sanitized_badge')}
                    >
                      <ShieldOff size={10} />
                    </div>
                  )}
                </div>

                <div className="history-info">
                  <div className="history-name" title={displayName}>
                    {displayName}
                  </div>
                  <div className="history-meta">
                    <span>{formatSessionDate(session.date)}</span>
                    <span>•</span>
                    <span>{secondaryMeta}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="history-delete-btn"
                  title={t('history_delete_title')}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(session);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title={t('history_delete_confirm_title')}
        message={t('history_delete_confirm_msg', {
          name: deleteTarget ? getDisplayName(deleteTarget) : '',
        })}
        confirmLabel={t('history_delete_confirm_btn')}
        cancelLabel={t('cancel')}
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        isOpen={isClearAllOpen}
        title={t('history_clear_confirm_title')}
        message={t('history_clear_confirm_msg')}
        confirmLabel={t('history_clear_confirm_btn')}
        cancelLabel={t('cancel')}
        isDanger={true}
        onConfirm={handleConfirmClearAll}
        onCancel={() => setIsClearAllOpen(false)}
      />
    </section>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="intro-container">
      <div className="action-zone">{content}</div>
    </div>
  );
};
