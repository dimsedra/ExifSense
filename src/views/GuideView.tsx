import React, { useState } from 'react';
import {
  BookOpen,
  Info,
  Compass,
  Sparkles,
  ShieldAlert,
  MapPin,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useI18nStore } from '../store/useI18nStore';

export type GuideTab = 'overview' | 'navigation' | 'features';

export const GuideView: React.FC = () => {
  const { t } = useI18nStore();
  const [activeTab, setActiveTab] = useState<GuideTab>('overview');

  return (
    <div className="guide-page" style={{ padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div className="guide-header">
        <div className="guide-header-icon">
          <BookOpen size={24} />
        </div>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-main)' }}>
            {t('guide_title') || 'ExifSense User Guide'}
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {t('guide_subtitle') || 'Learn how to perform client-side image forensics and surgical privacy stripping.'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="guide-tabs-container">
        <button
          type="button"
          className={`guide-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Info size={16} />
          <span>{t('guide_tab_overview') || 'Overview'}</span>
        </button>
        <button
          type="button"
          className={`guide-tab-btn ${activeTab === 'navigation' ? 'active' : ''}`}
          onClick={() => setActiveTab('navigation')}
        >
          <Compass size={16} />
          <span>{t('guide_tab_navigation') || 'Navigation'}</span>
        </button>
        <button
          type="button"
          className={`guide-tab-btn ${activeTab === 'features' ? 'active' : ''}`}
          onClick={() => setActiveTab('features')}
        >
          <Sparkles size={16} />
          <span>{t('guide_tab_features') || 'Key Features'}</span>
        </button>
      </div>

      {/* Pane Content */}
      <div
        className="card"
        style={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          padding: '2rem',
          minHeight: '350px',
        }}
      >
        {activeTab === 'overview' && (
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--accent)', marginBottom: '0.75rem' }}>
              Client-Side Forensic Intelligence
            </h3>
            <p style={{ lineHeight: 1.7, color: 'var(--text-main)', marginBottom: '1.5rem' }}>
              ExifSense is a private, zero-knowledge metadata inspection tool. Unlike typical cloud EXIF analyzers,
              ExifSense computes cryptographic digests (SHA-256 and SHA-1), evaluates manipulation heuristics,
              reconstructs GPS flight coordinates, and strips tracking tags completely inside your web browser.
              No uploaded file, metadata string, or coordinate ever touches an external server.
            </p>

            <h4 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Core Guarantees
            </h4>
            <ul style={{ lineHeight: 1.7, color: 'var(--text-muted)', paddingLeft: '1.25rem', margin: 0 }}>
              <li><strong>Zero Cloud Network Transfer</strong>: 100% of image decoding and parsing runs via Web Crypto and WebAssembly/Canvas.</li>
              <li><strong>Forensic Session IDs</strong>: Every inspection batch receives an immutable session tracker for chain of custody.</li>
              <li><strong>Full Report Portability</strong>: Export findings as multi-page vector PDF, JSON, CSV matrix, or Markdown.</li>
            </ul>
          </div>
        )}

        {activeTab === 'navigation' && (
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--accent)', marginBottom: '0.75rem' }}>
              Workspace Navigation
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', lineHeight: 1.6 }}>
              <div style={{ background: 'var(--secondary)', padding: '1rem', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--text-main)' }}>Single Asset Mode</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Drop a single photo to immediately view camera hardware, exposure triangles, cryptographic hashes, and interactive GPS map location.
                </p>
              </div>

              <div style={{ background: 'var(--secondary)', padding: '1rem', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--text-main)' }}>Batch Analysis Mode</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Stage up to 50 photos to compare camera serial numbers, chronologically reconstruct travel timelines, and inspect cross-asset integrity verification matrices.
                </p>
              </div>

              <div style={{ background: 'var(--secondary)', padding: '1rem', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--text-main)' }}>Sanitizer Studio</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Surgically eliminate location, device, and timestamp tracking tags before posting photos on social media or public forums.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div style={{ background: 'var(--secondary)', padding: '1.25rem', borderRadius: '12px' }}>
              <ShieldAlert size={24} style={{ color: '#ef4444', marginBottom: '0.5rem' }} />
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Tamper Detection</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Flags software artifacts (Photoshop, Canva, GIMP), future capture dates, and dimension mismatches.
              </p>
            </div>

            <div style={{ background: 'var(--secondary)', padding: '1.25rem', borderRadius: '12px' }}>
              <MapPin size={24} style={{ color: '#0ea5e9', marginBottom: '0.5rem' }} />
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Geospatial Mapping</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Plots geotagged photos on Leaflet OpenStreetMap with connected polylines and velocity warnings.
              </p>
            </div>

            <div style={{ background: 'var(--secondary)', padding: '1.25rem', borderRadius: '12px' }}>
              <Clock size={24} style={{ color: '#f59e0b', marginBottom: '0.5rem' }} />
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Timeline Reconstruction</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Computes delta jumps between consecutive captures and highlights UTC time discrepancies.
              </p>
            </div>

            <div style={{ background: 'var(--secondary)', padding: '1.25rem', borderRadius: '12px' }}>
              <Layers size={24} style={{ color: '#10b981', marginBottom: '0.5rem' }} />
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Collective Intelligence</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Cross-compares camera body serial numbers to identify multi-camera clusters and mixed gear.
              </p>
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'right' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              window.location.hash = '#/';
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>{t('return_to_workspace') || 'Return to Workspace'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
