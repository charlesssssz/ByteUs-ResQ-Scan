document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.RESQ_API_BASE || 'http://localhost:5000/api';
    const MAX_FILE_BYTES = 5 * 1024 * 1024;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    // =========================================================================
    // 1. THEME PERSISTENCE & TOGGLE
    // =========================================================================
    const themeToggleBtn = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('resq_theme') || 'light';

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem('resq_theme', theme);
        if (window.__userMapReady && typeof updateMapTileLayer === 'function') {
            updateMapTileLayer();
        }
    }

    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            applyTheme(isDark ? 'light' : 'dark');
        });
    }

    // =========================================================================
    // 2. TOAST NOTIFICATION UTILITY
    // =========================================================================
    const toastContainer = document.getElementById('toast-container');

    function showToast(title, message, type = 'info') {
        if (!toastContainer) return;

        const icons = {
            success: '<svg class="i" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
            warning: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
            error: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            info: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <b>${escapeHtml(title)}</b>
                <p>${escapeHtml(message)}</p>
            </div>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 320);
        }, 4200);
    }

    function escapeHtml(str = '') {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Dismiss Advisory Banner
    const btnDismissAdvisory = document.getElementById('btn-dismiss-advisory');
    if (btnDismissAdvisory) {
        btnDismissAdvisory.addEventListener('click', () => {
            const banner = btnDismissAdvisory.closest('.advisory-ticker');
            if (banner) banner.style.display = 'none';
        });
    }

    // Quick Card trigger to jump to report section
    const cardTriggerReport = document.getElementById('card-trigger-report');
    if (cardTriggerReport) {
        cardTriggerReport.addEventListener('click', () => {
            const reportSec = document.getElementById('report-section');
            if (reportSec) {
                reportSec.scrollIntoView({ behavior: 'smooth' });
                const fileInput = document.getElementById('user-photo-file');
                if (fileInput && !fileInput.classList.contains('has-preview')) {
                    fileInput.click();
                }
            }
        });
    }

    // =========================================================================
    // 3. BATANGAS CITY DATA & REPORTS STATE
    // =========================================================================
    const barangayCoordinates = {
        'Brgy. Malitam': [13.7450, 121.0500],
        'Brgy. Alangilan': [13.7650, 121.0700],
        'Brgy. Sta. Clara': [13.7510, 121.0480],
        'Brgy. Kumintang': [13.7550, 121.0300],
        'Brgy. Libjo': [13.7380, 121.0650],
        'Brgy. Balagtas': [13.7820, 121.0760],
        'Brgy. Bolbok': [13.7710, 121.0600],
        'Brgy. Cuta': [13.7460, 121.0580],
        'Brgy. Gulod Labac': [13.7410, 121.0720],
        'Brgy. Wawa': [13.7360, 121.0510]
    };
    // Spelling aliases used by the barangay dropdown (same coordinates as above)
    barangayCoordinates['Brgy. Santa Clara'] = barangayCoordinates['Brgy. Sta. Clara'];
    barangayCoordinates['Brgy. Kumintang Ilaya'] = barangayCoordinates['Brgy. Kumintang'];
    barangayCoordinates['Brgy. Gulod Labak'] = barangayCoordinates['Brgy. Gulod Labac'];

    const fallbackReports = [
        {
            id: 'rep-1',
            brgy: 'Brgy. Sta. Clara',
            category: 'DEBRIS',
            title: 'Downed primary power lines on bypass route',
            desc: 'Severed cables across access road near terminal.',
            severity: 'sev',
            status: 'Verified by MDRRMO',
            statusCode: 'verified',
            time: '25m ago',
            score: '87%',
            photoUrl: '',
            coords: [13.7510, 121.0480]
        },
        {
            id: 'rep-2',
            brgy: 'Brgy. Kumintang',
            category: 'WATER',
            title: 'Water runoff impassable near bridge approach',
            desc: 'Culvert drainage obstructed; light vehicles cannot pass.',
            severity: 'mod',
            status: 'Pending MDRRMO Review',
            statusCode: 'pending',
            time: '1h ago',
            score: '67%',
            photoUrl: '',
            coords: [13.7550, 121.0300]
        }
    ];

    let userReports = [];
    let latestAiClassification = null;
    let userManuallyPickedCategory = false;

    function normalizeReport(row) {
        const lat = Number(row.lat) || (barangayCoordinates[row.barangay || row.brgy] || [13.7565, 121.0583])[0];
        const lng = Number(row.lng) || (barangayCoordinates[row.barangay || row.brgy] || [13.7565, 121.0583])[1];
        const confNum = typeof row.ai_confidence === 'number'
            ? `${Math.round(row.ai_confidence)}%`
            : (row.score || '82%');

        let photoUrl = row.photo_url || row.photoUrl || '';
        if (photoUrl && photoUrl.startsWith('/uploads')) {
            const serverBase = API_BASE.replace(/\/api\/?$/, '');
            photoUrl = `${serverBase}${photoUrl}`;
        }

        return {
            id: row.id,
            brgy: row.barangay || row.brgy || 'Brgy. Malitam',
            category: row.category || row.ai_category || 'WATER',
            title: row.description || row.ai_summary || row.title || 'Damage report submitted',
            desc: row.ai_summary || row.desc || `Submitted by ${row.role || 'Community Resident'}.`,
            role: row.role || 'Community Resident',
            severity: row.severity || row.ai_severity || 'mod',
            status: row.status || 'Pending MDRRMO Review',
            statusCode: row.status_code || row.statusCode || 'pending',
            time: row.time || (row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'),
            score: confNum,
            photoUrl: photoUrl,
            coords: [lat, lng],
            marker: null
        };
    }

    function openReportDetailModal(rep) {
        const modal = document.getElementById('modal-report-detail');
        const body = document.getElementById('detail-modal-body');
        const titleEl = document.getElementById('detail-modal-title');
        const subEl = document.getElementById('detail-sub');
        if (!modal || !body || !rep) return;

        const sevLabel = rep.severity === 'sev' ? 'Severe' : rep.severity === 'mod' ? 'Moderate' : 'Minor';
        if (titleEl) titleEl.textContent = `${rep.brgy} • ${rep.category}`;
        if (subEl) subEl.textContent = `Submitted ${rep.time} • ${rep.status}`;

        body.innerHTML = `
            ${rep.photoUrl ? `<img src="${escapeHtml(rep.photoUrl)}" alt="Uploaded damage photo" class="detail-photo">` : ''}
            <p class="tc-desc"><b>Report Notes:</b> ${escapeHtml(rep.title)}</p>
            <p class="tc-desc"><b>Gemini Assessment:</b> ${escapeHtml(rep.desc)}</p>
            <div class="detail-kv">
                <div><span>Severity</span><b>${escapeHtml(sevLabel)}</b></div>
                <div><span>AI Confidence</span><b>${escapeHtml(rep.score)}</b></div>
                <div><span>Reporter</span><b>${escapeHtml(rep.role || 'Community Resident')}</b></div>
                <div><span>Coordinates</span><b>${rep.coords[0].toFixed(4)}, ${rep.coords[1].toFixed(4)}</b></div>
            </div>
            <div class="modal-foot">
                <button type="button" class="btn-primary" id="btn-detail-locate">Locate Pin on Map</button>
                <button type="button" class="btn-cancel" id="btn-detail-close-foot">Close</button>
            </div>
        `;

        modal.style.display = 'flex';
        const closeBtn = document.getElementById('btn-close-detail');
        if (closeBtn) closeBtn.focus();

        const locateBtn = document.getElementById('btn-detail-locate');
        if (locateBtn) {
            locateBtn.addEventListener('click', () => {
                closeReportDetailModal();
                if (map) {
                    map.flyTo(rep.coords, 15, { duration: 1.1 });
                    if (rep.marker) setTimeout(() => rep.marker.openPopup(), 1150);
                    const mapEl = document.getElementById('map-card');
                    if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }

        const closeFoot = document.getElementById('btn-detail-close-foot');
        if (closeFoot) closeFoot.addEventListener('click', closeReportDetailModal);
    }

    function closeReportDetailModal() {
        const modal = document.getElementById('modal-report-detail');
        if (modal) modal.style.display = 'none';
    }

    const btnCloseDetail = document.getElementById('btn-close-detail');
    const modalDetail = document.getElementById('modal-report-detail');
    if (btnCloseDetail) btnCloseDetail.addEventListener('click', closeReportDetailModal);
    if (modalDetail) {
        modalDetail.addEventListener('click', (e) => {
            if (e.target === modalDetail) closeReportDetailModal();
        });
    }

    function renderUserReports() {
        const container = document.getElementById('my-reports-list');
        const badge = document.getElementById('reports-badge');
        const countHeader = document.getElementById('my-reports-count');

        if (badge) badge.textContent = `${userReports.length} Reports`;
        if (countHeader) countHeader.textContent = userReports.length;

        if (!container) return;

        if (!userReports.length) {
            container.innerHTML = `
                <div class="empty-reports-state">
                    <b>No damage reports yet</b>
                    <span>Upload a damage photo above to run Gemini classification and submit to MDRRMO.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = userReports.map((rep, idx) => {
            const isVerified = rep.statusCode === 'verified';
            const sevLabel = rep.severity === 'sev' ? 'Severe' : rep.severity === 'mod' ? 'Moderate' : 'Minor';

            return `
                <article class="timeline-card" data-index="${idx}">
                    <div class="tc-top">
                        <b>${escapeHtml(rep.brgy)}</b>
                        <time class="tc-time">${escapeHtml(rep.time)}</time>
                    </div>
                    ${rep.photoUrl ? `
                        <div class="tc-photo-preview">
                            <img src="${escapeHtml(rep.photoUrl)}" alt="Damage photograph" class="tc-card-img" loading="lazy" />
                        </div>
                    ` : ''}
                    <div class="tc-meta">
                        <span class="tag-severity ${escapeHtml(rep.severity)}">${escapeHtml(sevLabel)}</span>
                        <span>AI Confidence: <b>${escapeHtml(rep.score)}</b></span>
                    </div>
                    <p class="tc-desc">${escapeHtml(rep.title)}</p>
                    <div class="tc-stepper">
                        <span class="step-dot done" title="Submitted"></span>
                        <span class="step-line done"></span>
                        <span class="step-dot done" title="AI Scanned"></span>
                        <span class="step-line ${isVerified ? 'done' : ''}"></span>
                        <span class="step-dot ${isVerified ? 'done' : 'active'}" title="${isVerified ? 'Verified' : 'Pending Verification'}"></span>
                    </div>
                    <span class="tc-status-pill ${escapeHtml(rep.statusCode)}">
                        ${isVerified ? 'Verified by MDRRMO • Team Dispatched' : 'Preliminary Review Queue'}
                    </span>
                </article>
            `;
        }).join('');

        container.querySelectorAll('.timeline-card').forEach(card => {
            card.addEventListener('click', () => {
                const idx = Number(card.getAttribute('data-index'));
                const rep = userReports[idx];
                if (rep) openReportDetailModal(rep);
            });
        });
    }

    // =========================================================================
    // 4. MAPLIBRE MAP — SAME BASEMAP ENGINE / STYLE AS ADMIN DASHBOARD
    //    User portal overlays, report pins, controls and map interactions remain.
    // =========================================================================
    const mapCanvas = document.getElementById('user-map-canvas');
    const mapState = document.getElementById('user-map-state');
    let mapEngine = null;
    let currentViewType = 'grid';
    const reportMarkers = [];
    const shelterMarkers = [];
    const overlayVisibility = { flood: true, evac: true, incidents: true };

    const baseMapUrls = {
        grid: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        topo: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
        sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    };
    const baseMapAttributions = {
        grid: 'Tiles &copy; Esri',
        topo: '&copy; OpenTopoMap',
        sat: 'Tiles &copy; Esri'
    };

    function buildBaseStyle(type) {
        const key = baseMapUrls[type] ? type : 'grid';
        if (key === 'grid') return 'https://tiles.openfreemap.org/styles/liberty';
        return {
            version: 8,
            sources: {
                'resq-basemap': {
                    type: 'raster',
                    tiles: [baseMapUrls[key]],
                    tileSize: 256,
                    attribution: baseMapAttributions[key],
                    maxzoom: key === 'topo' ? 17 : 19
                }
            },
            layers: [{
                id: 'resq-basemap-layer',
                type: 'raster',
                source: 'resq-basemap',
                paint: { 'raster-fade-duration': 0, 'raster-resampling': 'linear' }
            }]
        };
    }

    function showMapState(kind) {
        if (!mapState) return;
        if (!kind) { mapState.hidden = true; return; }
        mapState.hidden = false;
        mapState.innerHTML = kind === 'loading'
            ? '<div><div class="map-spinner"></div><b>Loading map data…</b>Batangas City Spatial Grid</div>'
            : '<div><b>Map tiles could not be loaded</b><p style="font-size:12px;color:var(--muted);margin:4px 0 8px;">Network or ad-blocker may be restricting tile domains.</p><button type="button" id="map-retry">Retry Loading Tiles</button></div>';
        const retry = document.getElementById('map-retry');
        if (retry) retry.addEventListener('click', updateMapTileLayer);
    }

    function safeMapPopup(html) {
        return new maplibregl.Popup({ offset: 18, closeButton: true, closeOnClick: true }).setHTML(html);
    }

    function createMapMarker(coords, html, popupHtml = '') {
        const el = document.createElement('div');
        el.className = 'maplibre-marker-host';
        if (html.includes('background:#059669')) el.classList.add('shelter-pin-host');
        el.innerHTML = html;
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([coords[1], coords[0]])
            .addTo(mapEngine);
        let popupContent = popupHtml;
        let popup = null;
        const api = {
            isOnMap: true,
            addTo: () => {
                if (!api.isOnMap) { marker.addTo(mapEngine); api.isOnMap = true; }
                return api;
            },
            removeFrom: () => {
                if (api.isOnMap) {
                    marker.remove();
                    if (popup) popup.remove();
                    api.isOnMap = false;
                }
            },
            bindPopup: htmlText => { popupContent = htmlText; return api; },
            setPopupContent: htmlText => { popupContent = htmlText; },
            setIcon: icon => { el.innerHTML = icon.html; },
            openPopup: () => {
                if (popup) popup.remove();
                popup = safeMapPopup(popupContent || '').setLngLat(marker.getLngLat()).addTo(mapEngine);
            },
            setLatLng: next => marker.setLngLat([next[1], next[0]])
        };
        el.addEventListener('click', () => api.openPopup());
        return api;
    }

    const reportMarkerGroup = {
        markers: [],
        addLayer(marker) {
            if (marker && !this.markers.includes(marker)) this.markers.push(marker);
            if (overlayVisibility.incidents && marker) marker.addTo();
        },
        clearLayers() {
            this.markers.forEach(marker => marker.removeFrom());
            this.markers = [];
        },
        addTo() {
            overlayVisibility.incidents = true;
            this.markers.forEach(marker => marker.addTo());
            return this;
        },
        removeFrom() {
            overlayVisibility.incidents = false;
            this.markers.forEach(marker => marker.removeFrom());
            return this;
        }
    };

    function createRadarIcon(severity) {
        const isSevere = severity === 'sev';
        return {
            html: `<div class="radar-marker ${severity}">${isSevere ? '<span class="pulse-wave"></span>' : ''}<span class="pin-dot"></span></div>`
        };
    }

    function addReportMarkerToGroup(rep) {
        if (!mapEngine || !rep || !Array.isArray(rep.coords)) return null;
        const marker = createMapMarker(rep.coords, createRadarIcon(rep.severity).html, `
            <div style="font-size:12px;line-height:1.45;min-width:200px;">
                <b style="font-size:13px;color:#0F172A;">${escapeHtml(rep.brgy)}</b>
                <div style="font-weight:700;color:#1E293B;margin-top:2px;">${escapeHtml(rep.title)}</div>
                <div style="font-size:11px;color:#64748B;margin:4px 0;">${escapeHtml(rep.desc)}</div>
                <div style="font-size:10px;border-top:1px solid #E2E8F0;padding-top:4px;color:#475569;">
                    <b>Status:</b> ${escapeHtml(rep.status)}
                </div>
            </div>
        `);
        reportMarkerGroup.addLayer(marker);
        rep.marker = marker;
        return marker;
    }

    function syncReportMarkers() {
        if (!reportMarkerGroup || !mapEngine) return;
        reportMarkerGroup.clearLayers();
        userReports.forEach(rep => addReportMarkerToGroup(rep));
    }

    function addUserOverlayLayers() {
        if (!mapEngine || mapEngine.getSource('user-flood-zone')) return;

        mapEngine.addSource('user-flood-zone', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [121.0450, 13.7420], [121.0580, 13.7480],
                        [121.0620, 13.7580], [121.0540, 13.7640],
                        [121.0400, 13.7530], [121.0450, 13.7420]
                    ]]
                }
            }
        });
        mapEngine.addLayer({
            id: 'user-flood-fill', type: 'fill', source: 'user-flood-zone',
            paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.25 }
        });
        mapEngine.addLayer({
            id: 'user-flood-outline', type: 'line', source: 'user-flood-zone',
            paint: { 'line-color': '#2563EB', 'line-width': 2, 'line-dasharray': [2, 2] }
        });

        mapEngine.addSource('user-evac-route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: [[121.0500, 13.7450], [121.0550, 13.7500], [121.0620, 13.7540]]
                }
            }
        });
        mapEngine.addLayer({
            id: 'user-evac-route-line', type: 'line', source: 'user-evac-route',
            paint: { 'line-color': '#10B981', 'line-width': 3, 'line-dasharray': [2, 2], 'line-opacity': 0.85 }
        });

        shelterMarkers.forEach(marker => marker.removeFrom());
        shelterMarkers.length = 0;
        const shelterHtml = '<div style="background:#059669;width:22px;height:22px;border-radius:6px;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:800;">E</div>';
        shelterMarkers.push(createMapMarker([13.7540, 121.0620], shelterHtml,
            '<b>Batangas City Sports Coliseum</b><br>Status: OPEN (2,125 / 2,500 capacity)'));
        shelterMarkers.push(createMapMarker([13.7680, 121.0520], shelterHtml,
            '<b>BatStateU Pablo Borbon Gymnasium</b><br>Status: OPEN (720 / 1,800 capacity)'));

        applyOverlayVisibility();
    }

    function applyOverlayVisibility() {
        if (!mapEngine || !mapEngine.isStyleLoaded()) return;
        ['user-flood-fill', 'user-flood-outline'].forEach(id => {
            if (mapEngine.getLayer(id)) mapEngine.setLayoutProperty(id, 'visibility', overlayVisibility.flood ? 'visible' : 'none');
        });
        ['user-evac-route-line'].forEach(id => {
            if (mapEngine.getLayer(id)) mapEngine.setLayoutProperty(id, 'visibility', overlayVisibility.evac ? 'visible' : 'none');
        });
        shelterMarkers.forEach(marker => overlayVisibility.evac ? marker.addTo() : marker.removeFrom());
        if (overlayVisibility.incidents) reportMarkerGroup.addTo();
        else reportMarkerGroup.removeFrom();
    }

    function updateMapTileLayer() {
        if (!mapEngine) return;
        showMapState('loading');
        mapEngine.setStyle(buildBaseStyle(currentViewType));
        mapEngine.once('style.load', () => {
            addUserOverlayLayers();
            showMapState(null);
            applyOverlayVisibility();
        });
    }

    if (typeof maplibregl !== 'undefined' && mapCanvas) {
        try {
            mapEngine = new maplibregl.Map({
                container: mapCanvas,
                style: buildBaseStyle('grid'),
                center: [121.0583, 13.7565],
                zoom: 14,
                attributionControl: true,
                cooperativeGestures: false
            });
            mapEngine.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
            mapEngine.on('load', () => {
                addUserOverlayLayers();
                showMapState(null);
                mapEngine.resize();
                window.__userMapReady = true;
            });
            mapEngine.on('error', event => {
                const message = event && event.error && event.error.message ? event.error.message : '';
                if (message) console.warn('ResQ-Scan user map:', message);
            });
            window.addEventListener('resize', () => mapEngine && mapEngine.resize());
            [80, 300, 700].forEach(ms => setTimeout(() => mapEngine && mapEngine.resize(), ms));
        } catch (err) {
            console.error('Error initializing user map:', err);
            showMapState('error');
        }
    }

    // GIS overlay controls
    const chkFlood = document.getElementById('user-ov-flood');
    const chkEvac = document.getElementById('user-ov-evac');
    const chkIncidents = document.getElementById('user-ov-incidents');
    if (chkFlood) chkFlood.addEventListener('change', e => {
        overlayVisibility.flood = e.target.checked; applyOverlayVisibility();
    });
    if (chkEvac) chkEvac.addEventListener('change', e => {
        overlayVisibility.evac = e.target.checked; applyOverlayVisibility();
        shelterMarkers.forEach(marker => overlayVisibility.evac ? marker.addTo() : marker.removeFrom());
    });
    if (chkIncidents) chkIncidents.addEventListener('change', e => {
        overlayVisibility.incidents = e.target.checked; applyOverlayVisibility();
    });

    // Reports load from backend (with graceful fallback)
    async function loadReportsFromBackend() {
        try {
            const res = await fetch(`${API_BASE}/reports`);
            if (!res.ok) throw new Error('Failed to fetch reports');
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.reports || []);
            userReports = list.map(normalizeReport);
        } catch {
            userReports = fallbackReports.map(normalizeReport);
        }
        renderUserReports();
        syncReportMarkers();
    }
    loadReportsFromBackend();

    const tabButtons = document.querySelectorAll('.tabs button');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => {
                b.classList.remove('on');
                b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
            });
            btn.classList.add('on');
            currentViewType = btn.getAttribute('data-view') || 'grid';
            updateMapTileLayer();
        });
    });

    const zoomInBtn = document.getElementById('user-zoom-in');
    const zoomOutBtn = document.getElementById('user-zoom-out');
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => mapEngine && mapEngine.zoomIn({ duration: 180 }));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => mapEngine && mapEngine.zoomOut({ duration: 180 }));

    const mapCard = document.getElementById('map-card');
    const fsLink = document.getElementById('user-fullscreen-gis');
    if (fsLink && mapCard) {
        fsLink.addEventListener('click', e => {
            e.preventDefault();
            const on = mapCard.classList.toggle('map-full');
            fsLink.textContent = on ? 'Exit Full Screen' : 'Full Screen GIS View';
            setTimeout(() => mapEngine && mapEngine.resize(), 60);
        });
    }

    document.querySelectorAll('.btn-view-route').forEach(btn => {
        btn.addEventListener('click', () => {
            const coordsStr = btn.getAttribute('data-coords');
            const name = btn.getAttribute('data-name');
            if (coordsStr && mapEngine) {
                const [lat, lng] = coordsStr.split(',').map(Number);
                mapEngine.flyTo({ center: [lng, lat], zoom: 15, duration: 1200 });
                showToast('Evacuation Shelter Located', `Focused map on ${name}. Safe routes highlighted in green.`, 'info');
                if (mapCard) mapCard.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Compatibility adapter for existing portal actions that focus a report.
    const map = {
        flyTo: (coords, zoom = 14, opts = {}) => mapEngine && mapEngine.flyTo({
            center: [coords[1], coords[0]], zoom, duration: Math.round((opts.duration || 1) * 1000)
        })
    };

    // =========================================================================
    // 5. PHOTO UPLOAD + INSTANT GEMINI CLASSIFICATION + REPORT SUBMISSION
    // =========================================================================
    const form = document.getElementById('citizen-report-form');
    const dropzone = document.getElementById('user-dropzone');
    const fileInput = document.getElementById('user-photo-file');
    const dropzonePrompt = document.getElementById('user-dropzone-prompt');
    const photoPreviewWrap = document.getElementById('user-photo-preview-wrap');
    const photoPreviewImg = document.getElementById('user-photo-preview-img');
    const btnChangePhoto = document.getElementById('btn-user-change-photo');
    const aiScanningBox = document.getElementById('user-ai-scanning');
    const aiResultCard = document.getElementById('user-ai-result');
    const categorySelect = document.getElementById('user-category');
    const btnSubmit = document.getElementById('btn-submit-report');
    const btnReset = document.getElementById('btn-reset-report');

    function setCategoryValue(val, fromAi = false) {
        if (!categorySelect || !val) return;
        const exists = [...categorySelect.options].some(o => o.value === val);
        if (!exists) return;
        if (fromAi && userManuallyPickedCategory) return;
        categorySelect.value = val;
        categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function renderAiResultCard(ai) {
        if (!aiResultCard || !ai) return;
        const sevEl = document.getElementById('ai-res-severity');
        const confEl = document.getElementById('ai-res-confidence');
        const catEl = document.getElementById('ai-res-category');
        const sumEl = document.getElementById('ai-res-summary');
        const warnEl = document.getElementById('ai-res-warn');

        const sevKey = ['sev', 'mod', 'min'].includes(ai.severity) ? ai.severity : 'mod';
        const sevText = sevKey === 'sev' ? 'Severe' : sevKey === 'mod' ? 'Moderate' : 'Minor';
        const confText = typeof ai.confidence === 'number' ? `${Math.round(ai.confidence)}%` : (ai.confidence || '85%');

        if (sevEl) {
            sevEl.className = `tag-severity ${sevKey}`;
            sevEl.textContent = sevText;
        }
        if (confEl) confEl.textContent = confText;
        if (catEl) catEl.textContent = ai.category || 'WATER';
        if (sumEl) sumEl.textContent = ai.summary || 'Preliminary visual damage assessment completed.';

        if (warnEl) {
            if (ai.is_valid_disaster_image === false) {
                warnEl.textContent = 'Notice: Uploaded image may not show disaster infrastructure damage. Please verify before submitting.';
                warnEl.style.display = 'block';
            } else {
                warnEl.style.display = 'none';
                warnEl.textContent = '';
            }
        }

        // Also update preview box inside upload dropzone
        const boxEl = document.getElementById('user-ai-result-box');
        const boxCat = document.getElementById('user-ai-category-badge');
        const boxSev = document.getElementById('user-ai-severity-badge');
        const boxConf = document.getElementById('user-ai-conf-val');
        const boxSum = document.getElementById('user-ai-summary-text');

        if (boxEl) {
            if (boxCat) boxCat.textContent = ai.category || 'DAMAGE';
            if (boxSev) {
                boxSev.className = `ai-severity-badge ${sevKey}`;
                boxSev.textContent = sevText;
            }
            if (boxConf) boxConf.textContent = confText;
            if (boxSum) boxSum.textContent = ai.summary || 'Gemini Vision classified visible damage features.';
            boxEl.style.display = 'flex';
        }

        aiResultCard.style.display = 'flex';
    }

    function resetPhotoAndAi() {
        latestAiClassification = null;
        if (photoPreviewWrap) photoPreviewWrap.style.display = 'none';
        const boxEl = document.getElementById('user-ai-result-box');
        if (boxEl) boxEl.style.display = 'none';
        if (dropzonePrompt) dropzonePrompt.style.display = 'block';
        if (photoPreviewImg) photoPreviewImg.src = '';
        if (fileInput) {
            fileInput.value = '';
            fileInput.classList.remove('has-preview');
        }
        if (aiScanningBox) aiScanningBox.style.display = 'none';
        if (aiResultCard) aiResultCard.style.display = 'none';
    }

    async function classifyUploadedPhoto(file) {
        if (!file) return;

        const isAllowedType = ALLOWED_TYPES.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name || '');
        if (!isAllowedType) {
            showToast('Unsupported File Type', 'Please upload a JPG, PNG, or WEBP image.', 'warning');
            return;
        }

        if (file.size > MAX_FILE_BYTES) {
            showToast('File Too Large', 'Maximum allowed image size is 5MB.', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
            if (photoPreviewImg) photoPreviewImg.src = evt.target.result;
            if (photoPreviewWrap) photoPreviewWrap.style.display = 'flex';
            if (dropzonePrompt) dropzonePrompt.style.display = 'none';
            if (fileInput) fileInput.classList.add('has-preview');
        };
        reader.readAsDataURL(file);

        if (aiScanningBox) aiScanningBox.style.display = 'flex';
        if (aiResultCard) aiResultCard.style.display = 'none';
        if (btnSubmit) btnSubmit.disabled = true;

        try {
            const fd = new FormData();
            fd.append('photo', file);
            const brgyEl = document.getElementById('user-barangay');
            const descEl = document.getElementById('user-desc');
            if (brgyEl) fd.append('barangay', brgyEl.value);
            if (descEl && descEl.value.trim()) fd.append('description', descEl.value.trim());

            const res = await fetch(`${API_BASE}/classify-photo`, {
                method: 'POST',
                body: fd
            });

            if (!res.ok) {
                throw new Error('Gemini classification endpoint returned an error');
            }

            const data = await res.json();
            const ai = data.classification || data;
            latestAiClassification = ai;
            renderAiResultCard(ai);
            if (ai.category) setCategoryValue(ai.category, true);

            showToast(
                'Gemini AI Classification Ready',
                `Detected ${ai.category || 'damage'} (${Math.round(ai.confidence || 85)}% confidence).`,
                'success'
            );
        } catch {
            latestAiClassification = null;
            showToast(
                'AI Service Unavailable',
                'Could not reach Gemini backend right now. You can still choose a category manually and submit.',
                'warning'
            );
        } finally {
            if (aiScanningBox) aiScanningBox.style.display = 'none';
            if (btnSubmit) btnSubmit.disabled = false;
        }
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) classifyUploadedPhoto(file);
        });
    }

    if (dropzone) {
        ['dragenter', 'dragover'].forEach(evtName => {
            dropzone.addEventListener(evtName, (e) => {
                e.preventDefault();
                dropzone.classList.add('drag-over');
            });
        });
        ['dragleave', 'drop'].forEach(evtName => {
            dropzone.addEventListener(evtName, (e) => {
                e.preventDefault();
                dropzone.classList.remove('drag-over');
            });
        });
        dropzone.addEventListener('drop', (e) => {
            const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (file && fileInput) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;
                classifyUploadedPhoto(file);
            }
        });
    }

    if (btnChangePhoto) {
        btnChangePhoto.addEventListener('click', (e) => {
            e.stopPropagation();
            if (fileInput) {
                fileInput.classList.remove('has-preview');
                fileInput.click();
            }
        });
    }

    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            userManuallyPickedCategory = true;
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (form) form.reset();
            userManuallyPickedCategory = false;
            resetPhotoAndAi();
            if (btnSubmit) btnSubmit.disabled = false;
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const role = form.querySelector('input[name="user-role"]:checked').value;
            const district = document.getElementById('user-district').value;
            const municipality = document.getElementById('user-municipality').value;
            const barangay = document.getElementById('user-barangay').value;
            const category = document.getElementById('user-category').value;

            if (!district || !municipality || !barangay) {
                showToast('Location Incomplete', 'Please select a district, city / municipality, and barangay.', 'warning');
                return;
            }
            const desc = document.getElementById('user-desc').value.trim();
            const file = fileInput && fileInput.files ? fileInput.files[0] : null;
            const coords = barangayCoordinates[barangay] || [13.7565, 121.0583];

            if (btnSubmit) btnSubmit.disabled = true;

            let savedReport = null;

            try {
                const fd = new FormData();
                fd.append('role', role);
                fd.append('district', district);
                fd.append('municipality', municipality);
                fd.append('barangay', barangay);
                fd.append('category', category);
                fd.append('description', desc);
                fd.append('lat', String(coords[0]));
                fd.append('lng', String(coords[1]));
                if (file) fd.append('photo', file);
                if (latestAiClassification) {
                    fd.append('ai_classification', JSON.stringify(latestAiClassification));
                }

                const res = await fetch(`${API_BASE}/reports`, {
                    method: 'POST',
                    body: fd
                });

                if (!res.ok) throw new Error('Failed to save report');
                const data = await res.json();
                savedReport = normalizeReport(data.report || data);
            } catch {
                const fallbackSev = latestAiClassification?.severity || (category === 'COLLAPSE' || category === 'ROOF OFF' ? 'sev' : 'mod');
                const fallbackConf = latestAiClassification?.confidence ? `${Math.round(latestAiClassification.confidence)}%` : '84%';
                savedReport = normalizeReport({
                    id: 'rep-' + Date.now(),
                    role,
                    district,
                    municipality,
                    barangay,
                    category,
                    description: desc,
                    ai_summary: latestAiClassification?.summary || `Submitted by ${role}.`,
                    severity: fallbackSev,
                    score: fallbackConf,
                    status: 'Pending MDRRMO Review',
                    status_code: 'pending',
                    time: 'Just now',
                    photoUrl: photoPreviewImg && photoPreviewImg.src ? photoPreviewImg.src : '',
                    lat: coords[0],
                    lng: coords[1]
                });
            }

            userReports.unshift(savedReport);
            renderUserReports();
            const addedMarker = addReportMarkerToGroup(savedReport);

            if (map && addedMarker) {
                map.flyTo(savedReport.coords, 15, { duration: 1.2 });
                setTimeout(() => addedMarker.openPopup(), 1300);
            }

            form.reset();
            userManuallyPickedCategory = false;
            resetPhotoAndAi();
            if (btnSubmit) btnSubmit.disabled = false;

            showToast(
                'Damage Report Submitted',
                `${savedReport.brgy} (${savedReport.category}) queued for MDRRMO review.`,
                'success'
            );

            const reportsSec = document.getElementById('my-reports-section');
            if (reportsSec) reportsSec.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // =========================================================================
    // 6. EMERGENCY SOS MODAL & IMMEDIATE DISPATCH
    // =========================================================================
    const btnOpenSos = document.getElementById('btn-open-sos');
    const btnSidebarSos = document.getElementById('btn-sidebar-sos');
    const modalSos = document.getElementById('modal-sos-dispatch');
    const btnCloseSos = document.getElementById('btn-close-sos');
    const btnCancelSos = document.getElementById('btn-cancel-sos');
    const sosForm = document.getElementById('sos-form');
    let lastFocusedBeforeModal = null;

    function openSosModal() {
        lastFocusedBeforeModal = document.activeElement;
        if (modalSos) {
            modalSos.style.display = 'flex';
            const firstRadio = modalSos.querySelector('input[name="sos-type"]');
            if (firstRadio) firstRadio.focus();
        }
    }

    function closeSosModal() {
        if (modalSos) modalSos.style.display = 'none';
        if (sosForm) sosForm.reset();
        if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
            lastFocusedBeforeModal.focus();
        }
    }

    if (btnOpenSos) btnOpenSos.addEventListener('click', openSosModal);
    if (btnSidebarSos) btnSidebarSos.addEventListener('click', openSosModal);
    if (btnCloseSos) btnCloseSos.addEventListener('click', closeSosModal);
    if (btnCancelSos) btnCancelSos.addEventListener('click', closeSosModal);

    if (modalSos) {
        modalSos.addEventListener('click', (e) => {
            if (e.target === modalSos) closeSosModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modalSos && modalSos.style.display === 'flex') closeSosModal();
            if (modalDetail && modalDetail.style.display === 'flex') closeReportDetailModal();
            const fsCard = document.getElementById('map-card');
            if (fsLink && fsCard && fsCard.classList.contains('map-full')) fsLink.click();
        }
    });

    if (sosForm) {
        sosForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const sosType = sosForm.querySelector('input[name="sos-type"]:checked').value;
            const barangay = document.getElementById('sos-barangay').value;
            const people = document.getElementById('sos-people-count').value;
            const address = document.getElementById('sos-address').value.trim();
            const contact = document.getElementById('sos-contact').value.trim();
            const coords = barangayCoordinates[barangay] || [13.7565, 121.0583];

            try {
                await fetch(`${API_BASE}/sos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sos_type: sosType,
                        barangay,
                        people_count: people,
                        address,
                        contact,
                        lat: coords[0],
                        lng: coords[1]
                    })
                });
            } catch {
                // Still show immediate local SOS feedback on map & toast
            }

            closeSosModal();

            showToast(
                'SOS Alert Dispatched to CDRRMO',
                `Emergency alert received for ${barangay} (${sosType}, ${people} persons). Contact: ${contact}.`,
                'error'
            );

            if (mapEngine) {
                const sosMarker = createMapMarker(coords,
                    '<div style="background:#D92D20;width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 14px rgba(217,45,32,.8);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:11px;animation:dp 1s infinite;">SOS</div>',
                    `<div style="font-size:12px;line-height:1.4;color:#B42318;">
                        <b style="font-size:14px;">Live SOS Rescue Dispatch</b>
                        <div style="font-weight:700;margin-top:2px;">${escapeHtml(barangay)} - ${escapeHtml(sosType)}</div>
                        <div><b>Location:</b> ${escapeHtml(address)}</div>
                        <div><b>People:</b> ${escapeHtml(people)}</div>
                        <div><b>Contact:</b> ${escapeHtml(contact)}</div>
                    </div>`
                );
                map.flyTo(coords, 15, { duration: 1.2 });
                setTimeout(() => sosMarker.openPopup(), 1400);

                const mapCardEl = document.getElementById('map-card');
                if (mapCardEl) mapCardEl.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // =========================================================================
    // 7. SCROLL-SPY NAVIGATION HIGHLIGHT
    // =========================================================================
    const navLinks = [...document.querySelectorAll('.user-nav .nav-item, .mobile-quick-nav .mnav-link')];
    const sectionIds = ['report-section', 'map-card', 'shelters-section', 'my-reports-section'];
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    if ('IntersectionObserver' in window && sections.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const hash = `#${entry.target.id}`;
                    navLinks.forEach(link => {
                        link.classList.toggle('active', link.getAttribute('href') === hash);
                    });
                }
            });
        }, { rootMargin: '-25% 0px -55% 0px' });

        sections.forEach(sec => observer.observe(sec));
    }

    // =========================================================================
    // 8. MODERN ACCESSIBLE CUSTOM DROPDOWN ENGINE
    // =========================================================================
    function enhanceSelects(root = document) {
        root.querySelectorAll('select').forEach(sel => {
            if (sel.dataset.dd) return;
            sel.dataset.dd = '1';

            const wrap = document.createElement('div');
            wrap.className = 'dd';
            sel.parentNode.insertBefore(wrap, sel);
            wrap.appendChild(sel);
            sel.tabIndex = -1;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dd-btn';
            btn.setAttribute('aria-haspopup', 'listbox');
            btn.setAttribute('aria-expanded', 'false');
            if (sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label'));
            btn.innerHTML = '<span class="dd-label"></span><svg class="i chev"><use href="#chevron-down" /></svg>';

            const menu = document.createElement('div');
            menu.className = 'dd-menu';
            menu.setAttribute('role', 'listbox');
            wrap.append(btn, menu);

            let opts = [];
            let items = [];
            let search = null;
            let searchWrap = null;
            const empty = document.createElement('div');
            empty.className = 'dd-empty';
            empty.textContent = 'No matches found';
            empty.hidden = true;

            const label = btn.querySelector('.dd-label');
            function sync() {
                const o = sel.options[sel.selectedIndex];
                const ph = !o || o.disabled || o.value === '';
                label.textContent = o ? o.textContent : '';
                label.classList.toggle('ph', ph);
                btn.disabled = sel.disabled;
                items.forEach((d, i) => d.setAttribute('aria-selected', String(!ph && opts[i] === o)));
            }

            // Builds the menu from the select's CURRENT options (re-run via 'dd:refresh')
            function build() {
                menu.innerHTML = '';
                opts = [...sel.options];
                search = null;
                if (opts.length > 5) {
                    searchWrap = document.createElement('div');
                    searchWrap.className = 'dd-search-wrap';
                    searchWrap.innerHTML = `
                    <svg class="i dd-search-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" class="dd-search" placeholder="Search options..." aria-label="Search options">
                `;
                    search = searchWrap.querySelector('.dd-search');
                    menu.appendChild(searchWrap);
                    search.addEventListener('input', () => { filter(search.value); mark(0); });
                    search.addEventListener('click', e => e.stopPropagation());
                }

                items = opts.map(o => {
                    const d = document.createElement('div');
                    d.className = 'dd-opt';
                    d.setAttribute('role', 'option');
                    d.dataset.value = o.value;
                    d.textContent = o.textContent;
                    if (o.disabled) d.setAttribute('aria-disabled', 'true');
                    d.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (d.getAttribute('aria-disabled') !== 'true') pick(d);
                    });
                    menu.appendChild(d);
                    return d;
                });

                empty.hidden = true;
                menu.appendChild(empty);
                sync();
            }

            const visible = () => items.filter(d => d.getAttribute('aria-disabled') !== 'true' && d.style.display !== 'none');
            let hl = -1;
            function mark(i) {
                const v = visible();
                items.forEach(d => d.classList.remove('hl'));
                if (!v.length) return;
                hl = (i + v.length) % v.length;
                v[hl].classList.add('hl');
                v[hl].scrollIntoView({ block: 'nearest' });
            }

            function close() {
                wrap.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
            }

            function open() {
                document.querySelectorAll('.dd.open').forEach(x => x.classList.remove('open'));
                const r = btn.getBoundingClientRect();
                wrap.classList.toggle('up', window.innerHeight - r.bottom < 300 && r.top > 300);
                wrap.classList.toggle('right', r.left + 260 > window.innerWidth);
                wrap.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
                if (search) { search.value = ''; filter(''); search.focus(); }
                mark(Math.max(0, visible().findIndex(d => d.getAttribute('aria-selected') === 'true')));
            }

            function filter(q) {
                q = q.trim().toLowerCase();
                let n = 0;
                items.forEach(d => {
                    const m = !q || d.textContent.toLowerCase().includes(q);
                    d.style.display = m ? '' : 'none';
                    if (m) n++;
                });
                empty.hidden = n > 0;
            }

            function pick(d) {
                sel.value = d.dataset.value;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                sync();
                close();
                btn.focus();
            }

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                wrap.classList.contains('open') ? close() : open();
            });

            wrap.addEventListener('keydown', (e) => {
                const isOpen = wrap.classList.contains('open');
                if (e.key === 'Escape' && isOpen) { e.stopPropagation(); close(); btn.focus(); }
                else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (!isOpen) open(); else mark(hl + (e.key === 'ArrowDown' ? 1 : -1));
                } else if (e.key === 'Enter' && isOpen) {
                    const v = visible(); if (v[hl]) { e.preventDefault(); pick(v[hl]); }
                } else if (e.key === 'Tab') close();
            });

            sel.addEventListener('change', sync);
            sel.addEventListener('dd:refresh', build);

            const formParent = sel.closest('form');
            if (formParent) formParent.addEventListener('reset', () => setTimeout(sync, 0));
            build();
        });
    }

    document.addEventListener('click', () => document.querySelectorAll('.dd.open').forEach(x => x.classList.remove('open')));

    // =========================================================================
    // 9. CASCADING LOCATION DROPDOWNS (District > City / Municipality > Barangay)
    // =========================================================================
    const poblacionBarangays = Array.from({ length: 24 }, (_, i) => `Barangay ${i + 1} (Poblacion)`);

    const BATANGAS_CITY_BARANGAYS = [
        // Poblacion (Barangay 1‑24)
        'Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5', 'Barangay 6',
        'Barangay 7', 'Barangay 8', 'Barangay 9', 'Barangay 10', 'Barangay 11', 'Barangay 12',
        'Barangay 13', 'Barangay 14', 'Barangay 15', 'Barangay 16', 'Barangay 17', 'Barangay 18',
        'Barangay 19', 'Barangay 20', 'Barangay 21', 'Barangay 22', 'Barangay 23', 'Barangay 24',
        // Other barangays
        'Alangilan', 'Balagtas', 'Balete', 'Banaba Center', 'Banaba Ibaba', 'Banaba Kanluran',
        'Banaba Silangan', 'Bilogo', 'Bolbok', 'Bukal', 'Calicanto', 'Catandala', 'Concepcion',
        'Conde Itaas', 'Conde Labak', 'Cuta', 'Dalig', 'Dela Paz', 'Dela Paz Pulot Aplaya',
        'Dela Paz Pulot Itaas', 'Domoclay', 'Dumantay', 'Gulod Itaas', 'Gulod Labak',
        'Haligue Kanluran', 'Haligue Silangan', 'Ilijan', 'Kumba', 'Kumintang Ibaba',
        'Kumintang Ilaya', 'Libjo', 'Liponpon', 'Maapas', 'Mabacong (Matoco)', 'Mahabang Dahilig',
        'Mahabang Parang', 'Mahacot Kanluran', 'Mahacot Silangan', 'Malalim', 'Malibayo', 'Malitam',
        'Maruclap', 'Pagkilatan', 'Paharang Kanluran', 'Paharang Silangan', 'Pallocan Kanluran',
        'Pallocan Silangan', 'Pinamucan', 'Pinamucan Ibaba', 'Pinamucan Silangan', 'Sampaga',
        'San Agapito', 'San Agustin Kanluran', 'San Agustin Silangan', 'San Andres', 'San Antonio',
        'San Isidro', 'San Jose Sico', 'San Miguel', 'San Nicolas', 'San Pablo', 'San Pascual',
        'San Pedro', 'Santa Clara', 'Santa Rita Aplaya', 'Santa Rita Karsada', 'Santo Domingo',
        'Santo Niño', 'Simlong', 'Sirang Lupa', 'Sorosoro Ibaba', 'Sorosoro Ilaya', 'Sorosoro Karsada',
        'Tabangao Ambulong', 'Tabangao Aplaya (Tabangao Proper)', 'Tabangao Dao', 'Talahib Pandayan',
        'Talahib Payapa', 'Talumpok Kanluran', 'Talumpok Silangan', 'Tinga Itaas', 'Tinga Labak',
        'Tulo', 'Wawa'
    ];

    const DISTRICT_PLACES = {
        '1st District': [
            'Balayan', 'Calaca City', 'Calatagan', 'Lemery',
            'Lian', 'Nasugbu', 'Taal', 'Tuy'
        ],
        '2nd District': [
            'Bauan', 'Lobo', 'Mabini', 'San Luis', 'San Pascual', 'Tingloy'
        ],
        '3rd District': [
            'Agoncillo', 'Alitagtag', 'Balete', 'Cuenca', 'Laurel', 'Malvar',
            'Mataasnakahoy', 'San Nicolas', 'Santa Teresita', 'Santo Tomas City',
            'Talisay', 'Tanauan City'
        ],
        '4th District': [
            'Ibaan', 'Padre Garcia', 'Rosario', 'San Jose', 'San Juan', 'Taysan'
        ],
        '5th District': [
            'Batangas City'
        ],
        '6th District': [
            'Lipa City'
        ]
    };

    const BATANGAS_PLACES = {
        "Agoncillo": ["Adia", "Bagong Sikat", "Balangon", "Bangin", "Banyaga", "Barigon", "Bilibinwang", "Coral na Munti", "Guitna", "Mabini", "Pamiga", "Panhulan", "Pansipit", "Poblacion", "Pook", "San Jacinto", "San Teodoro", "Santa Cruz", "Santo Tomas", "Subic Ibaba", "Subic Ilaya"],
        "Alitagtag": ["Balagbag", "Concepcion", "Concordia", "Dalipit East", "Dalipit West", "Dominador East", "Dominador West", "Munlawin Norte", "Munlawin Sur", "Muzon Primero", "Muzon Segundo", "Pinagkurusan", "Ping-As", "Poblacion East", "Poblacion West", "San Jose", "San Juan", "Santa Cruz", "Tadlac"],
        "Balayan": ["Baclaran", "Barangay 1 (Poblacion)", "Barangay 2 (Poblacion)", "Barangay 3 (Poblacion)", "Barangay 4 (Poblacion)", "Barangay 5 (Poblacion)", "Barangay 6 (Poblacion)", "Barangay 7 (Poblacion)", "Barangay 8 (Poblacion)", "Barangay 9 (Poblacion)", "Barangay 10 (Poblacion)", "Barangay 11 (Poblacion)", "Barangay 12 (Poblacion)", "Calan", "Caloocan", "Calzada", "Canda", "Carenahan", "Caybunga", "Cayponce", "Dalig", "Dao", "Dilao", "Duhatan", "Durungao", "Gimalas", "Gumamela", "Lagnas", "Lanatan", "Langgangan", "Lucban Pook", "Lucban Putol", "Magabe", "Malalay", "Munting Tubig", "Navotas", "Palikpikan", "Patugo", "Pooc", "Sambat", "Sampaga", "San Juan", "San Piro", "Santol", "Sukol", "Tactac", "Taludtud", "Tanggoy"],
        "Balete": ["Alangilan", "Calawit", "Looc", "Magapi", "Makina", "Malabanan", "Paligawan", "Palsara", "Poblacion", "Sala", "Sampalocan", "San Sebastian", "Solis"],
        "Batangas City": BATANGAS_CITY_BARANGAYS,
        "Bauan": ["Alagao", "Aplaya", "As-Is", "Bagong Silang", "Baguilawa", "Balayong", "Barangay I (Poblacion)", "Barangay II (Poblacion)", "Barangay III (Poblacion)", "Barangay IV (Poblacion)", "Bolo", "Colvo", "Cupang", "Durungao", "Gulibay", "Inicbulan", "Locloc", "Magalang-Galang", "Malindig", "Manalupong", "Manghinao Proper", "Manghinao Uno", "New Danglayan", "Orense", "Pitugo", "Rizal", "Sampaguita", "San Agustin", "San Andres Proper", "San Andres Uno", "San Diego", "San Miguel", "San Pablo", "San Pedro", "San Roque", "San Teodoro", "San Vicente", "Santa Maria", "Santo Domingo", "Sinala"],
        "Calaca City": ["Baclas", "Bagong Tubig", "Balimbing", "Bambang", "Barangay 1 (Poblacion)", "Barangay 2 (Poblacion)", "Barangay 3 (Poblacion)", "Barangay 4 (Poblacion)", "Barangay 5 (Poblacion)", "Barangay 6 (Poblacion)", "Bisaya", "Cahil", "Calantas", "Caluangan", "Camastilisan", "Coral ni Bacal", "Coral ni Lopez (Sugod)", "Dacanlao", "Dila", "Loma", "Lumbang Calzada", "Lumbang na Bata", "Lumbang na Matanda", "Madalunot", "Makina", "Matipok", "Munting Coral", "Niyugan", "Pantay", "Puting Bato East", "Puting Bato West", "Puting Kahoy", "Quisumbing", "Salong", "San Rafael", "Sinisian", "Taklang Anak", "Talisay", "Tamayo", "Timbain"],
        "Calatagan": ["Bagong Silang", "Baha", "Balibago", "Balitoc", "Barangay 1 (Poblacion)", "Barangay 2 (Poblacion)", "Barangay 3 (Poblacion)", "Barangay 4 (Poblacion)", "Biga", "Bucal", "Carlosa", "Carretunan", "Encarnacion", "Gulod", "Hukay", "Lucsuhin", "Luya", "Paraiso", "Quilitisan", "Real", "Sambungan", "Santa Ana", "Talibayog", "Talisay", "Tanagan"],
        "Cuenca": ["Balagbag", "Barangay 1 (Poblacion)", "Barangay 2 (Poblacion)", "Barangay 3 (Poblacion)", "Barangay 4 (Poblacion)", "Barangay 5 (Poblacion)", "Barangay 6 (Poblacion)", "Barangay 7 (Poblacion)", "Barangay 8 (Poblacion)", "Bungahan", "Calumayin", "Dalipit East", "Dalipit West", "Dita", "Don Juan", "Emmanuel", "Ibabao", "Labac", "Pinagkaisahan", "San Felipe", "San Isidro"],
        "Ibaan": ["Bago", "Balanga", "Bungahan", "Calamias", "Catandala", "Coliat", "Dayapan", "Lapu-Lapu", "Lucsuhin", "Mabalor", "Malainin", "Matala", "Munting-Tubig", "Palindan", "Pangao", "Panghayaan", "Poblacion", "Quilo", "Sabang", "Salaban I", "Salaban II", "San Agustin", "Sandalan", "Santo Niño", "Talaibon", "Tulay na Patpat"],
        "Laurel": ["As-Is", "Balakilong", "Barangay 1 (Poblacion)", "Barangay 2 (Poblacion)", "Barangay 3 (Poblacion)", "Barangay 4 (Poblacion)", "Barangay 5 (Poblacion)", "Berinayan", "Bugaan East", "Bugaan West", "Buso-Buso", "Dayap Itaas", "Gulod", "J. Leviste", "Molinete", "Niyugan", "Paliparan", "San Gabriel", "San Gregorio", "Santa Maria", "Ticub"],
        "Lemery": ["Anak-Dagat", "Arumahan", "Ayao-Iyao", "Bagong Pook", "Bagong Sikat", "Balanga", "Bukal", "Cahilan I", "Cahilan II", "Dayapan", "District I (Poblacion)", "District II (Poblacion)", "District III (Poblacion)", "District IV (Poblacion)", "Dita", "Gulod", "Lucky", "Maguihan", "Mahabang Dahilig", "Mahayahay", "Maigsing Dahilig", "Maligaya", "Malinis", "Masalisi", "Mataas na Bayan", "Matingain I", "Matingain II", "Mayasang", "Niugan", "Nonong Casto", "Palanas", "Payapa Ibaba", "Payapa Ilaya", "Rizal", "Sambal Ibaba", "Sambal Ilaya", "San Isidro Ibaba", "San Isidro Itaas", "Sangalang", "Sinisian East", "Sinisian West", "Talaga", "Tubigan", "Tubuan", "Wawa Ibaba", "Wawa Ilaya"],
        "Lian": ["Bagong Pook", "Balibago", "Barangay 1 (Poblacion)", "Barangay 2 (Poblacion)", "Barangay 3 (Poblacion)", "Barangay 4 (Poblacion)", "Barangay 5 (Poblacion)", "Binubusan", "Bungahan", "Cumba", "Humayingan", "Kapito", "Lumaniag", "Luyahan", "Malaruhatan", "Matabungkay", "Prenza", "Puting-Kahoy", "San Diego"],
        "Lipa City": ["Adya", "Anilao", "Anilao-Labac", "Antipolo del Norte", "Antipolo del Sur", "Bagong Pook", "Balintawak", "Banaybanay", "Barangay 12 (Poblacion)", "Bolbok", "Bugtong na Pulo", "Bulacnin", "Bulaklakan", "Calamias", "Cumba", "Dagatan", "Duhatan", "Halang", "Inosloban", "Kayumanggi", "Latag", "Lodlod", "Lumbang", "Mabini", "Malagonlong", "Malitlit", "Marauoy", "Mataas na Lupa", "Munting Pulo", "Pagolingin Bata", "Pagolingin East", "Pagolingin West", "Pangao", "Pinagkawitan", "Pinagtongulan", "Plaridel", "Poblacion Barangay 1", "Poblacion Barangay 2", "Poblacion Barangay 3", "Poblacion Barangay 4", "Poblacion Barangay 5", "Poblacion Barangay 6", "Poblacion Barangay 7", "Poblacion Barangay 8", "Poblacion Barangay 9", "Poblacion Barangay 9-A", "Poblacion Barangay 10", "Poblacion Barangay 11", "Pusil", "Quezon", "Rizal", "Sabang", "Sampaguita", "San Benito", "San Carlos", "San Celestino", "San Francisco", "San Guillermo", "San Jose", "San Lucas", "San Salvador", "San Sebastian (Balagbag)", "Santo Niño", "Santo Toribio", "Sapac", "Sico", "Talisay", "Tambo", "Tangob", "Tanguay", "Tibig", "Tipacan"],
        "Lobo": ["Apar", "Balatbat", "Balibago", "Banalo", "Biga", "Bignay", "Calo", "Calumpit", "Fabrica", "Jaybanga", "Lagadlarin", "Mabilog na Bundok", "Malabrigo", "Malalim na Sanog", "Malapad na Parang", "Masaguitsit", "Nagtalongtong", "Nagtoctoc", "Olo-Olo", "Pinaghawanan", "Poblacion", "San Miguel", "San Nicolas", "Sawang", "Soloc", "Tayuman"],
        "Mabini": ["Anilao East", "Anilao Proper", "Bagalangit", "Bulacan", "Calamias", "Estrella", "Gasang", "Laurel", "Ligaya", "Mainaga", "Mainit", "Majuben", "Malimatoc I", "Malimatoc II", "Nag-Iba", "Pilahan", "Poblacion", "Pulang Lupa", "Pulong Anahao", "Pulong Balibaguhan", "Pulong Niogan", "Saguing", "Sampaguita", "San Francisco", "San Jose", "San Juan", "San Teodoro", "Santa Ana", "Santa Mesa", "Santo Niño", "Santo Tomas", "Solo", "Talaga East", "Talaga Proper"],
        "Malvar": ["Bagong Pook", "Bilucao (San Isidro Western)", "Bulihan", "Luta del Norte", "Luta del Sur", "Poblacion", "San Andres", "San Fernando", "San Gregorio", "San Isidro East", "San Juan", "San Pedro I (Eastern)", "San Pedro II (Western)", "San Pioquinto", "Santiago"],
        "Mataasnakahoy": ["Barangay II-A (Poblacion)", "Bayorbor", "Bubuyan", "Calingatan", "District I (Poblacion)", "District II (Poblacion)", "District III (Poblacion)", "District IV (Poblacion)", "Kinalaglagan", "Loob", "Lumang Lipa", "Manggahan", "Nangkaan", "San Sebastian", "Santol", "Upa"],
        "Nasugbu": ["Aga", "Balaytigui", "Banilad", "Barangay 1 (Poblacion)", "Barangay 2 (Poblacion)", "Barangay 3 (Poblacion)", "Barangay 4 (Poblacion)", "Barangay 5 (Poblacion)", "Barangay 6 (Poblacion)", "Barangay 7 (Poblacion)", "Barangay 8 (Poblacion)", "Barangay 9 (Poblacion)", "Barangay 10 (Poblacion)", "Barangay 11 (Poblacion)", "Barangay 12 (Poblacion)", "Bilaran", "Bucana", "Bulihan", "Bunducan", "Butucan", "Calayo", "Catandaan", "Cogunan", "Dayap", "Kaylaway", "Kayrilaw", "Latag", "Looc", "Lumbangan", "Malapad na Bato", "Mataas na Pulo", "Maugat", "Munting Indan", "Natipuan", "Pantalan", "Papaya", "Putat", "Reparo", "Talangan", "Tumalim", "Utod", "Wawa"],
        "Padre Garcia": ["Banaba", "Banaybanay", "Bawi", "Bukal", "Castillo", "Cawongan", "Manggas", "Maugat East", "Maugat West", "Pansol", "Payapa", "Poblacion", "Quilo-Quilo North", "Quilo-Quilo South", "San Felipe", "San Miguel", "Tamak", "Tangob"],
        "Rosario": ["Alupay", "Antipolo", "Bagong Pook", "Balibago", "Barangay A (Poblacion)", "Barangay B (Poblacion)", "Barangay C (Poblacion)", "Barangay D (Poblacion)", "Barangay E (Poblacion)", "Bayawang", "Baybayin", "Bulihan", "Cahigam", "Calantas", "Colongan", "Itlugan", "Leviste (Tubahan)", "Lumbangan", "Maalas-As", "Mabato", "Mabunga", "Macalamcam A", "Macalamcam B", "Malaya", "Maligaya", "Marilag", "Masaya", "Matamis", "Mavalor", "Mayuro", "Namuco", "Namunga", "Nasi", "Natu", "Palakpak", "Pinagsibaan", "Putingkahoy", "Quilib", "Salao", "San Carlos", "San Ignacio", "San Isidro", "San Jose", "San Roque", "Santa Cruz", "Timbugan", "Tiquiwan", "Tulos"],
        "San Jose": ["Aguila", "Anus", "Aya", "Bagong Pook", "Balagtasin", "Balagtasin I", "Banaybanay I", "Banaybanay II", "Bigain I", "Bigain II", "Bigain South", "Calansayan", "Dagatan", "Don Luis", "Galamay-Amo", "Lalayat", "Lapolapo I", "Lapolapo II", "Lepute", "Lumil", "Mojon-Tampoy", "Natunuan", "Palanca", "Pinagtung-Ulan", "Poblacion Barangay I", "Poblacion Barangay II", "Poblacion Barangay III", "Poblacion Barangay IV", "Sabang", "Salaban", "Santo Cristo", "Taysan", "Tugtug"],
        "San Juan": ["Abung", "Balagbag", "Barualte", "Bataan", "Buhay na Sapa", "Bulsa", "Calicanto", "Calitcalit", "Calubcub I", "Calubcub II", "Catmon", "Coloconto", "Escribano", "Hugom", "Imelda (Tubog)", "Janaojanao", "Laiya-Aplaya", "Laiya-Ibabao", "Libato", "Lipahan", "Mabalanoy", "Maraykit", "Muzon", "Nagsaulay", "Palahanan I", "Palahanan II", "Palingowak", "Pinagbayanan", "Poblacion", "Poctol", "Pulangbato", "Putingbuhangin", "Quipot", "Sampiro", "Sapangan", "Sico I", "Sico II", "Subukin", "Talahiban I", "Talahiban II", "Ticalan", "Tipaz"],
        "San Luis": ["Abiacao", "Bagong Tubig", "Balagtasin", "Balite", "Banoyo", "Boboy", "Bonliw", "Calumpang East", "Calumpang West", "Dulangan", "Durungao", "Locloc", "Luya", "Mahabang Parang", "Manggahan", "Muzon", "Poblacion", "San Antonio", "San Isidro", "San Jose", "San Martin", "Santa Monica", "Taliba", "Talon", "Tejero", "Tungal"],
        "San Nicolas": ["Abelo", "Alas-As", "Balete", "Baluk-Baluk", "Bancoro", "Bangin", "Calangay", "Hipit", "Maabud North", "Maabud South", "Munlawin", "Pansipit", "Poblacion", "Pulang-Bato", "Santo Niño", "Sinturisan", "Tagudtod", "Talang"],
        "San Pascual": ["Alalum", "Antipolo", "Balimbing", "Banaba", "Bayanan", "Danglayan", "del Pilar", "Gelerang Kawayan", "Ilat North", "Ilat South", "Kaingin", "Laurel", "Malaking Pook", "Mataas na Lupa", "Natunuan North", "Natunuan South", "Padre Castillo", "Palsahingin", "Pila", "Poblacion", "Pook ni Banal", "Pook ni Kapitan", "Resplandor", "Sambat", "San Antonio", "San Mariano", "San Mateo", "Santa Elena", "Santo Niño"],
        "Santa Teresita": ["Antipolo", "Bihis", "Burol", "Calayaan", "Calumala", "Cuta East", "Cutang Cawayan", "Irukan", "Pacifico", "Poblacion I", "Poblacion II", "Poblacion III", "Saimsim", "Sampa", "Sinipian", "Tambo Ibaba", "Tambo Ilaya"],
        "Santo Tomas City": ["Barangay I (Poblacion)", "Barangay II (Poblacion)", "Barangay III (Poblacion)", "Barangay IV (Poblacion)", "San Agustin", "San Antonio", "San Bartolome", "San Felix", "San Fernando", "San Francisco", "San Isidro Norte", "San Isidro Sur", "San Joaquin", "San Jose", "San Juan", "San Luis", "San Miguel", "San Pablo", "San Pedro", "San Rafael", "San Roque", "San Vicente", "Santa Ana", "Santa Anastacia", "Santa Clara", "Santa Cruz", "Santa Elena", "Santa Maria", "Santa Teresita", "Santiago"],
        "Taal": ["Apacay", "Balisong", "Bihis", "Bolbok", "Buli", "Butong", "Carasuche", "Cawit", "Caysasay", "Cubamba", "Cultihan", "Gahol", "Halang", "Iba", "Ilog", "Imamawo", "Ipil", "Laguile", "Latag", "Luntal", "Mahabang Lodlod", "Niogan", "Pansol", "Poblacion 1", "Poblacion 2", "Poblacion 3", "Poblacion 4", "Poblacion 5", "Poblacion 6", "Poblacion 7", "Poblacion 8", "Poblacion 9", "Poblacion 10", "Poblacion 11", "Poblacion 12", "Poblacion 13", "Poblacion 14", "Pook", "Seiran", "Tatlong Maria", "Tierra Alta", "Tulo"],
        "Talisay": ["Aya", "Balas", "Banga", "Buco", "Caloocan", "Leynes", "Miranda", "Poblacion Barangay 1", "Poblacion Barangay 2", "Poblacion Barangay 3", "Poblacion Barangay 4", "Poblacion Barangay 5", "Poblacion Barangay 6", "Poblacion Barangay 7", "Poblacion Barangay 8", "Quiling", "Sampaloc", "San Guillermo", "Santa Maria", "Tranca", "Tumaway"],
        "Tanauan City": ["Altura Bata", "Altura Matanda", "Altura-South", "Ambulong", "Bagbag", "Bagumbayan", "Balele", "Banadero", "Banjo East", "Banjo Laurel (Banjo West)", "Bilog-Bilog", "Boot", "Cale", "Darasa", "Gonzales", "Hidalgo", "Janopol", "Janopol Oriental", "Laurel", "Luyos", "Mabini", "Malaking Pulo", "Maria Paz", "Maugat", "Montaña (Ik-Ik)", "Natatas", "Pagaspas", "Pantay Bata", "Pantay Matanda", "Poblacion Barangay 1", "Poblacion Barangay 2", "Poblacion Barangay 3", "Poblacion Barangay 4", "Poblacion Barangay 5", "Poblacion Barangay 6", "Poblacion Barangay 7", "Sala", "Sambat", "San Jose", "Santol (Doña Jacoba Garcia)", "Santor", "Sulpoc", "Suplang", "Talaga", "Tinurik", "Trapiche", "Ulango", "Wawa"],
        "Taysan": ["Bacao", "Bilogo", "Bukal", "Dagatan", "Guinhawa", "Laurel", "Mabayabas", "Mahanadiong", "Mapulo", "Mataas na Lupa", "Pag-Asa", "Panghayaan", "Pinagbayanan", "Piña", "Poblacion East", "Poblacion West", "San Isidro", "San Marcelino", "Santo Niño", "Tilambo"],
        "Tingloy": ["Barangay 13 (Poblacion 1)", "Barangay 14 (Poblacion 2)", "Barangay 15 (Poblacion 3)", "Corona", "Gamao", "Makawayan", "Marikaban", "Papaya", "Pisa", "San Isidro", "San Jose", "San Juan", "San Pedro", "Santo Tomas", "Talahib"],
        "Tuy": ["Acle", "Bayudbud", "Bolboc", "Burgos (Poblacion)", "Dalima", "Dao", "Guinhawa", "Lumbangan", "Luna (Poblacion)", "Luntal", "Magahis", "Malibu", "Mataywanac", "Palincaro", "Putol", "Rillo (Poblacion)", "Rizal (Poblacion)", "Sabang", "San Jose", "Talon", "Toong", "Tuyon-Tuyon"]
    };

    const DEFAULT_DISTRICT = '5th District';
    const distSel = document.getElementById('user-district');
    const munSel = document.getElementById('user-municipality');
    const brgySel = document.getElementById('user-barangay');

    function fillSelect(sel, entries, placeholder, emptyText) {
        if (!sel) return;
        sel.innerHTML = '';
        const ph = document.createElement('option');
        ph.value = '';
        ph.disabled = true;
        ph.selected = true;
        ph.textContent = entries.length ? placeholder : emptyText;
        sel.appendChild(ph);
        entries.forEach(e => {
            const o = document.createElement('option');
            o.value = e.value;
            o.textContent = e.label;
            sel.appendChild(o);
        });
        sel.disabled = entries.length === 0;
        sel.dispatchEvent(new Event('dd:refresh'));
    }

    function populateMunicipalities() {
        const towns = DISTRICT_PLACES[distSel.value] || [];
        fillSelect(
            munSel,
            towns.map(t => ({ value: t, label: t })),
            'Select city / municipality',
            'Select a district first'
        );
        if (towns.length === 1) {
            munSel.value = towns[0];
            munSel.dispatchEvent(new Event('dd:refresh'));
        }
        populateBarangays();
    }

    function populateBarangays() {
        const town = munSel.value;
        const list = BATANGAS_PLACES[town] || [];
        const suffix = town && town !== 'Batangas City' ? ', ' + town : '';
        fillSelect(
            brgySel,
            list.map(n => ({ value: 'Brgy. ' + n.replace(/^Barangay /, '') + suffix, label: n })),
            'Select barangay',
            town ? 'No barangays listed' : 'Select a city / municipality first'
        );
    }

    function initLocationDropdowns() {
        if (!distSel || !munSel || !brgySel) return;
        fillSelect(
            distSel,
            Object.keys(DISTRICT_PLACES).map(d => ({ value: d, label: d })),
            'Select district',
            'No districts available'
        );
        distSel.value = DEFAULT_DISTRICT;
        distSel.dispatchEvent(new Event('dd:refresh'));
        populateMunicipalities();
    }

    if (distSel && munSel && brgySel) {
        distSel.addEventListener('change', populateMunicipalities);
        munSel.addEventListener('change', populateBarangays);
        if (form) form.addEventListener('reset', () => setTimeout(initLocationDropdowns, 0));
        initLocationDropdowns();
    }

    enhanceSelects();
});
