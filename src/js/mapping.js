import { escapeHTML, parseDate } from './utils.js';
import { t, getCurrentLanguage } from './i18n.js';

export function initMap(lat, lng) {
    const map = L.map('map').setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    return { map };
}

export function renderMultiMarkers(assets, mapInstance) {
    if (!mapInstance) return null;
    
    // Clear existing markers if we are using a feature group
    const markers = [];
    assets.forEach(asset => {
        if (asset.exifData?.latitude != null && asset.exifData?.longitude != null) {
            const captureDate = asset.exifData.DateTimeOriginal || asset.exifData.CreateDate || asset.exifData.ModifyDate;
            const dateObj = parseDate(captureDate);
            const locale = getCurrentLanguage() === 'id' ? 'id-ID' : (getCurrentLanguage() === 'ar' ? 'ar-SA' : 'en-GB');
            const timeStr = (dateObj && !isNaN(dateObj.getTime())) ? dateObj.toLocaleString(locale, { hour12: false }) : t('unknown', {}, 'reports');
            
            const popupContent = `
                <div class="map-popup">
                    <div class="popup-title">${escapeHTML(asset.fileName)}</div>
                    <div class="popup-data">
                        <span><i data-lucide="map-pin"></i> ${asset.exifData.latitude.toFixed(6)}, ${asset.exifData.longitude.toFixed(6)}</span>
                        <span><i data-lucide="clock"></i> ${escapeHTML(timeStr)}</span>
                    </div>
                </div>
            `;

            const marker = L.marker([asset.exifData.latitude, asset.exifData.longitude])
                .bindPopup(popupContent, { maxWidth: 280, minWidth: 200, className: 'forensic-popup' });
            markers.push(marker);
        }
    });

    if (markers.length === 0) return null;

    const group = L.featureGroup(markers).addTo(mapInstance);
    mapInstance.fitBounds(group.getBounds(), { padding: [50, 50] });
    
    mapInstance.on('popupopen', () => {
        if (window.lucide) lucide.createIcons();
    });

    return group;
}

export async function renderInvestigationPath(assets, mapInstance) {
    if (!mapInstance || assets.length < 2) return null;

    // Filter and sort by time
    const sortedPoints = assets
        .filter(a => a.exifData?.latitude != null && a.exifData?.longitude != null)
        .map(a => {
            const d = parseDate(a.exifData.DateTimeOriginal || a.exifData.CreateDate || a.exifData.DateTime);
            return {
                lat: a.exifData.latitude,
                lng: a.exifData.longitude,
                time: d ? d.getTime() : NaN
            };
        })
        .filter(p => !isNaN(p.time))
        .sort((a, b) => a.time - b.time);

    if (sortedPoints.length < 2) return null;

    // Build coordinates string for OSRM: lon,lat;lon,lat...
    // Note: OSRM public demo has limits on number of waypoints (usually ~100)
    // and distance. We only do this for localized paths.
    const coordsStr = sortedPoints.map(p => `${p.lng},${p.lat}`).join(';');
    
    try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`);
        const data = await response.json();
        
        if (data.code === 'Ok' && data.routes?.[0]) {
            const route = data.routes[0].geometry;
            const polyline = L.geoJSON(route, {
                style: {
                    color: '#2563eb', // Fallback to primary blue
                    weight: 4,
                    opacity: 0.6,
                    dashArray: '10, 10'
                }
            }).addTo(mapInstance);
            return polyline;
        }
    } catch (e) {
        console.error("Routing failed, falling back to polyline:", e);
    }

    // Fallback to straight lines if routing fails or for long distances
    const straightPath = L.polyline(sortedPoints.map(p => [p.lat, p.lng]), {
        color: '#2563eb',
        weight: 3,
        opacity: 0.5,
        dashArray: '5, 10'
    }).addTo(mapInstance);
    
    return straightPath;
}

export async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`);
        const data = await response.json();
        return data;
    } catch (e) {
        console.error("Reverse geocoding failed:", e);
        return null;
    }
}

export function updateMapLinks(lat, lng, container) {
    const gMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
    const osmUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=16/${encodeURIComponent(lat)}/${encodeURIComponent(lng)}`;
    
    container.innerHTML = `
        <a href="${escapeHTML(gMapsUrl)}" target="_blank" class="map-link">
            <i data-lucide="external-link"></i> Google Maps
        </a>
        <a href="${escapeHTML(osmUrl)}" target="_blank" class="map-link">
            <i data-lucide="map"></i> OpenStreetMap
        </a>
    `;
    if (window.lucide) lucide.createIcons();
}
