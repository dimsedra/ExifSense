import React, { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  RotateCcw,
  Clock,
  Layers,
  FileImage,
  ShieldCheck,
  Calendar,
  Camera,
} from 'lucide-react';
import { useHistoryStore } from '../store/useHistoryStore';
import type { HistoryFilter } from '../store/useHistoryStore';
import { ConfirmModal } from '../components/ConfirmModal';
import { showToast } from '../components/ToastContainer';
import { useI18nStore } from '../store/useI18nStore';

export const HistoryView: React.FC = () => {
  const { t } = useI18nStore();
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

  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const filteredSessions = getFilteredSessions();

  const handleRestore = (id: number) => {
    const success = restoreSession(id);
    if (success) {
      showToast(t('session_restored') || 'Historical session restored to workspace!');
      window.location.hash = '#/dashboard';
    } else {
      showToast('Failed to restore session');
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTargetId !== null) {
      deleteSession(deleteTargetId);
      setDeleteTargetId(null);
      showToast('Session removed from history');
    }
  };

  const handleConfirmClearAll = () => {
    clearAllSessions();
    setIsClearAllOpen(false);
    showToast('All investigation history cleared');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
            {t('investigation_history') || 'Investigation History'}
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {t('history_subtitle') || 'Review, restore, or export previously analyzed forensic sessions.'}
          </p>
        </div>

        {filteredSessions.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setIsClearAllOpen(true)}
            style={{ color: 'var(--danger, #ef4444)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Trash2 size={16} />
            <span>{t('clear_all_history') || 'Clear History'}</span>
          </button>
        )}
      </div>

      {/* Controls: Search and Filter Pills */}
      <div className="history-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder={t('search_history_placeholder') || 'Search sessions by filename, forensic ID, camera...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="history-filters">
          <button
            type="button"
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all' as HistoryFilter)}
          >
            {t('filter_all') || 'All'}
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'single' ? 'active' : ''}`}
            onClick={() => setFilter('single' as HistoryFilter)}
          >
            {t('filter_single') || 'Single'}
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'batch' ? 'active' : ''}`}
            onClick={() => setFilter('batch' as HistoryFilter)}
          >
            {t('filter_batch') || 'Batch'}
          </button>
        </div>
      </div>

      {/* Session Cards Grid */}
      {filteredSessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <Clock size={40} style={{ opacity: 0.4, marginBottom: '1rem', color: 'var(--text-muted)' }} />
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>
            {t('no_history_records') || 'No Historical Sessions Recorded'}
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {searchQuery
              ? 'No sessions matched your search criteria.'
              : 'Investigate photos in the workspace to automatically save sessions here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {filteredSessions.map((session) => {
            const firstAsset = session.assets[0];
            const make = String(firstAsset?.exifData?.Make || firstAsset?.exifData?.Model || 'Unknown Device');

            return (
              <div
                key={session.id}
                className="card"
                style={{
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, border-color 0.2s',
                }}
                onClick={() => handleRestore(session.id)}
              >
                <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '99px',
                          backgroundColor: session.isBatch ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: session.isBatch ? '#3b82f6' : '#10b981',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {session.isBatch ? <Layers size={10} /> : <FileImage size={10} />}
                        {session.isBatch ? `Batch (${session.assetCount})` : 'Single'}
                      </span>
                      {session.isSanitized && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '99px',
                            backgroundColor: 'rgba(234, 88, 12, 0.15)',
                            color: '#ea580c',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <ShieldCheck size={10} /> Sanitized
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetId(session.id);
                      }}
                      title="Delete Session"
                      style={{ padding: '4px', color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <h4
                    style={{
                      margin: '0 0 0.5rem 0',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={session.sessionTitle}
                  >
                    {session.sessionTitle}
                  </h4>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={12} />
                      <span>{session.date}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Camera size={12} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {make}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderTop: '1px solid var(--border-color)',
                    background: 'var(--secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                    {session.forensicId}
                  </span>
                  <span style={{ color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <RotateCcw size={12} /> Restore
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Single Session Confirmation Dialog */}
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        title="Delete History Session"
        message="Are you sure you want to permanently remove this forensic investigation record from local storage?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Clear All Confirmation Dialog */}
      <ConfirmModal
        isOpen={isClearAllOpen}
        title="Clear All Investigation History"
        message="Are you sure you want to erase all 20 historical sessions? This action cannot be undone."
        confirmLabel="Clear All"
        cancelLabel="Cancel"
        isDanger={true}
        onConfirm={handleConfirmClearAll}
        onCancel={() => setIsClearAllOpen(false)}
      />
    </div>
  );
};
