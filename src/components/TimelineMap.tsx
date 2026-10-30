import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, ExternalLink, Map as MapIcon } from 'lucide-react';
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
  const [routeEnabled, setRouteEnabled] = useState(showPath);

  const waypoints = extractAssetCoordinates(assets);
  const activeWaypoint =
    waypoints.find((wp) => wp.assetId === activeAssetId) || waypoints[0] || null;

  useEffect(() => {
    setRouteEnabled(showPath);
  }, [showPath]);

  useEffect(() => {
    if (!mapContainerRef.current || waypoints.length === 0) return;

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
  }, [waypoints.length]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

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
      const dateStr = parsedDate ? formatFullDate(parsedDate) : t('unknown', {}, 'reports');

      const popupHtml = `
        <div style="font-family: var(--font-sans); font-size: 13px; line-height: 1.4; color: #111;">
          <strong style="display:block; margin-bottom: 4px;">${wp.fileName}</strong>
          <div>GPS: ${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}</div>
          <div>${t('file_date')}: ${dateStr}</div>
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

    if (routeEnabled && latLngs.length >= 2) {
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
      // fitBounds fallback
    }
  }, [waypoints.length, activeAssetId, routeEnabled, assets, onMarkerClick, t]);

  if (waypoints.length === 0) {
    return null;
  }

  return (
    <div id="map-container-card" className="card map-card mb-6">
      <div className="card-header">
        <div className="header-group">
          <MapPin size={18} />
          <h3>{t('geospatial_data')}</h3>
        </div>
        {waypoints.length > 1 && (
          <div className="map-controls">
            <label id="route-toggle-container" className="route-toggle">
              <input
                type="checkbox"
                id="route-toggle-checkbox"
                checked={routeEnabled}
                onChange={(e) => setRouteEnabled(e.target.checked)}
              />
              <span className="toggle-slider" />
              <span className="toggle-label">{t('show_route')}</span>
            </label>
          </div>
        )}
      </div>
      <div className="card-body p-0">
        <div id="map" ref={mapContainerRef} className="map-container" />
        <div className="map-footer">
          <div id="gps-coordinates" className="gps-coords">
            <Navigation size={14} />
            <span>
              {activeWaypoint
                ? t('gps_coords', {
                    lat: activeWaypoint.lat.toFixed(6),
                    lng: activeWaypoint.lng.toFixed(6),
                  })
                : t('no_gps')}
            </span>
          </div>
          {activeWaypoint && (
            <div className="map-actions">
              <a
                id="gmaps-link"
                href={`https://www.google.com/maps?q=${activeWaypoint.lat},${activeWaypoint.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-link"
              >
                <ExternalLink size={14} /> Google Maps
              </a>
              <a
                id="osm-link"
                href={`https://www.openstreetmap.org/?mlat=${activeWaypoint.lat}&mlon=${activeWaypoint.lng}#map=16/${activeWaypoint.lat}/${activeWaypoint.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-link"
              >
                <MapIcon size={14} /> OpenStreetMap
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
