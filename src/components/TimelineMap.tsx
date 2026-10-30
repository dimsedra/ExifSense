import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { ForensicAsset } from '../core/forensics/types';
import { extractAssetCoordinates } from '../services/mapHelpers';
import { parseExifDate, formatFullDate } from '../core/forensics/metadata';
import { useI18nStore } from '../store/useI18nStore';

export interface TimelineMapProps {
  assets: ForensicAsset[];
  activeAssetId?: string;
  showPath?: boolean;
  onMarkerClick?: (assetIndex: number) => void;
}

export const TimelineMap: React.FC<TimelineMapProps> = ({
  assets,
  activeAssetId,
  showPath = true,
  onMarkerClick,
}) => {
  const { t } = useI18nStore();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.FeatureGroup | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);

  const waypoints = extractAssetCoordinates(assets);

  // Initialize and tear down Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = waypoints[0]?.lat ?? 20.0;
      const initialLng = waypoints[0]?.lng ?? 0.0;
      const initialZoom = waypoints.length > 0 ? 12 : 2;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers, polyline route, and active highlight
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean previous markers and polylines
    if (markersLayerRef.current) {
      map.removeLayer(markersLayerRef.current);
      markersLayerRef.current = null;
    }
    if (polylineLayerRef.current) {
      map.removeLayer(polylineLayerRef.current);
      polylineLayerRef.current = null;
    }

    if (waypoints.length === 0) return;

    const markers: L.Marker[] = [];
    const latLngs: L.LatLngExpression[] = [];

    waypoints.forEach((wp) => {
      const asset = assets.find((a) => a.id === wp.assetId);
      const isHighlighted = wp.assetId === activeAssetId;
      latLngs.push([wp.lat, wp.lng]);

      const captureDate =
        asset?.exifData?.DateTimeOriginal ||
        asset?.exifData?.CreateDate ||
        asset?.exifData?.DateTime;
      const parsedDate = captureDate ? parseExifDate(captureDate) : null;
      const dateStr = parsedDate ? formatFullDate(parsedDate) : 'Unknown';

      const popupHtml = `
        <div style="font-family: var(--font-sans); font-size: 13px; line-height: 1.4; color: #111;">
          <strong style="display:block; margin-bottom: 4px;">${wp.fileName}</strong>
          <div>GPS: ${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}</div>
          <div>Date: ${dateStr}</div>
        </div>
      `;

      let icon: L.DivIcon;
      if (isHighlighted) {
        icon = L.divIcon({
          className: 'highlighted-forensic-marker',
          html: `
            <div style="
              background: #ef4444; 
              width: 22px; 
              height: 22px; 
              border-radius: 50%; 
              border: 3px solid #ffffff; 
              box-shadow: 0 0 10px rgba(239,68,68,0.8);
            "></div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
      } else {
        icon = L.divIcon({
          className: 'standard-forensic-marker',
          html: `
            <div style="
              background: #0ea5e9; 
              width: 14px; 
              height: 14px; 
              border-radius: 50%; 
              border: 2px solid #ffffff; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.4);
            "></div>
          `,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
      }

      const marker = L.marker([wp.lat, wp.lng], { icon }).bindPopup(popupHtml);
      marker.on('click', () => {
        if (onMarkerClick) {
          const originalIdx = assets.findIndex((a) => a.id === wp.assetId);
          if (originalIdx >= 0) {
            onMarkerClick(originalIdx);
          }
        }
      });

      markers.push(marker);
    });

    const featureGroup = L.featureGroup(markers).addTo(map);
    markersLayerRef.current = featureGroup;

    // Render connecting polyline if batch mode and showPath is true
    if (showPath && latLngs.length >= 2) {
      const polyline = L.polyline(latLngs, {
        color: '#f59e0b',
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.85,
      }).addTo(map);
      polylineLayerRef.current = polyline;
    }

    try {
      map.fitBounds(featureGroup.getBounds(), { padding: [50, 50], maxZoom: 15 });
    } catch {
      // fitBounds on point or small container fallback
    }
  }, [waypoints.length, activeAssetId, showPath, assets, onMarkerClick]);

  if (waypoints.length === 0) {
    return (
      <div className="card map-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3>{t('geospatial_map') || 'Geospatial Travel Mapping'}</h3>
        </div>
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          {t('no_gps_recorded') || 'No GPS coordinates found in loaded image metadata.'}
        </div>
      </div>
    );
  }

  return (
    <div className="card map-card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <h3>
          {t('geospatial_map') || 'Geospatial Travel Mapping'} ({waypoints.length} {t('geotagged_assets') || 'Geotagged'})
        </h3>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div id="map" ref={mapContainerRef} style={{ height: '420px', width: '100%' }} />
      </div>
    </div>
  );
};
