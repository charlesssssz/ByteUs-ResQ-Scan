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
    // 4. LEAFLET MAP & TILE SWITCHING (BATANGAS CITY)
    // =========================================================================
    const mapCanvas = document.getElementById('user-map-canvas');
    const mapState = document.getElementById('user-map-state');
    let map = null;
    let currentTileLayer = null;
    let currentViewType = 'grid';
    const reportMarkerGroup = typeof L !== 'undefined' ? L.layerGroup() : null;

    function getTileConfig(viewType) {
        if (viewType === 'sat') {
            return {
                primary: {
                    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    options: { maxZoom: 19, attribution: 'Tiles &copy; Esri' }
                },
                fallback: {
                    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    options: { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }
                }
            };
        } else if (viewType === 'topo') {
            return {
                primary: {
                    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                    options: { maxZoom: 17, attribution: '&copy; OpenStreetMap contributors, SRTM' }
                },
                fallback: {
                    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    options: { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }
                }
            };
        }
        return {
            primary: {
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                options: { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }
            },
            fallback: {
                url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
                options: { maxZoom: 19, attribution: '&copy; CARTO &copy; OpenStreetMap', subdomains: 'abcd' }
            }
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

    function updateMapTileLayer() {
        if (!map) return;
        const mapEl = document.getElementById('user-map-canvas');
        if (mapEl) {
            mapEl.classList.toggle('view-sat', currentViewType === 'sat');
        }

        const cfg = getTileConfig(currentViewType);
        if (currentTileLayer) {
            map.removeLayer(currentTileLayer);
        }

        let failedTiles = 0;
        let layerLoaded = false;

        currentTileLayer = L.tileLayer(cfg.primary.url, cfg.primary.options).addTo(map);

        currentTileLayer.on('tileload', () => {
            layerLoaded = true;
            showMapState(null);
        });

        currentTileLayer.on('tileerror', () => {
            failedTiles++;
            if (!layerLoaded && failedTiles >= 3 && cfg.fallback) {
                map.removeLayer(currentTileLayer);
                currentTileLayer = L.tileLayer(cfg.fallback.url, cfg.fallback.options).addTo(map);
                failedTiles = 0;
            } else if (failedTiles >= 8) {
                showMapState('error');
            }
        });
    }

    function createRadarIcon(severity) {
        const isSevere = severity === 'sev';
        return L.divIcon({
            className: 'radar-pin-container',
            html: `
                <div class="radar-marker ${severity}">
                    ${isSevere ? '<span class="pulse-wave"></span>' : ''}
                    <span class="pin-dot"></span>
                </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12]
        });
    }

    function addReportMarkerToGroup(rep) {
        if (!reportMarkerGroup || typeof L === 'undefined') return null;
        const marker = L.marker(rep.coords, {
            icon: createRadarIcon(rep.severity)
        }).bindPopup(`
            <div style="font-size:12px; line-height:1.45; min-width:200px;">
                <b style="font-size:13px; color:#0F172A;">${escapeHtml(rep.brgy)}</b>
                <div style="font-weight:700; color:#1E293B; margin-top:2px;">${escapeHtml(rep.title)}</div>
                <div style="font-size:11px; color:#64748B; margin:4px 0;">${escapeHtml(rep.desc)}</div>
                <div style="font-size:10px; border-top:1px solid #E2E8F0; padding-top:4px; color:#475569;">
                    <b>Status:</b> ${escapeHtml(rep.status)}
                </div>
            </div>
        `);
        reportMarkerGroup.addLayer(marker);
        rep.marker = marker;
        return marker;
    }

    function syncReportMarkers() {
        if (!reportMarkerGroup) return;
        reportMarkerGroup.clearLayers();
        userReports.forEach(rep => addReportMarkerToGroup(rep));
    }

    const shelterIcon = typeof L !== 'undefined' ? L.divIcon({
        className: 'shelter-pin',
        html: '<div style="background:#059669; width:22px; height:22px; border-radius:6px; border:2px solid #fff; box-shadow:0 1px 6px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; font-weight:800;">E</div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    }) : null;

    if (typeof L !== 'undefined' && mapCanvas) {
        try {
            map = L.map('user-map-canvas', {
                zoomControl: false,
                preferCanvas: true
            }).setView([13.7565, 121.0583], 13);

            L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);
            updateMapTileLayer();
            window.__userMapReady = true;

            [80, 300, 700].forEach(ms => setTimeout(() => { if (map) map.invalidateSize(); }, ms));
            window.addEventListener('resize', () => { if (map) map.invalidateSize(); });

            const floodHazardPolygon = L.polygon([
                [13.7420, 121.0450],
                [13.7480, 121.0580],
                [13.7580, 121.0620],
                [13.7640, 121.0540],
                [13.7530, 121.0400]
            ], {
                color: '#2563EB',
                fillColor: '#3B82F6',
                fillOpacity: 0.25,
                weight: 2,
                dashArray: '5, 5'
            }).bindPopup('<b>Calumpang River Flood Risk Zone</b><br>100-Year Inundation Hazard Model').addTo(map);

            const evacShelter1 = L.marker([13.7540, 121.0620], { icon: shelterIcon }).bindPopup('<b>Batangas City Sports Coliseum</b><br>Status: OPEN (2,125 / 2,500 capacity)');
            const evacShelter2 = L.marker([13.7680, 121.0520], { icon: shelterIcon }).bindPopup('<b>BatStateU Pablo Borbon Gymnasium</b><br>Status: OPEN (720 / 1,800 capacity)');
            const evacRouteLine = L.polyline([
                [13.7450, 121.0500],
                [13.7500, 121.0550],
                [13.7540, 121.0620]
            ], { color: '#10B981', weight: 3, dashArray: '6, 6', opacity: 0.85 });

            const evacLayerGroup = L.layerGroup([evacShelter1, evacShelter2, evacRouteLine]).addTo(map);
            reportMarkerGroup.addTo(map);

            const chkFlood = document.getElementById('user-ov-flood');
            const chkEvac = document.getElementById('user-ov-evac');
            const chkIncidents = document.getElementById('user-ov-incidents');

            if (chkFlood) chkFlood.addEventListener('change', (e) => e.target.checked ? map.addLayer(floodHazardPolygon) : map.removeLayer(floodHazardPolygon));
            if (chkEvac) chkEvac.addEventListener('change', (e) => e.target.checked ? map.addLayer(evacLayerGroup) : map.removeLayer(evacLayerGroup));
            if (chkIncidents) chkIncidents.addEventListener('change', (e) => e.target.checked ? map.addLayer(reportMarkerGroup) : map.removeLayer(reportMarkerGroup));
        } catch (err) {
            console.error('Error initializing user map:', err);
        }
    }

    // Load initial reports from backend (with graceful fallback)
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
            tabButtons.forEach(b => b.classList.remove('on'));
            btn.classList.add('on');
            currentViewType = btn.getAttribute('data-view');
            updateMapTileLayer();
        });
    });

    const zoomInBtn = document.getElementById('user-zoom-in');
    const zoomOutBtn = document.getElementById('user-zoom-out');
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => { if (map) map.zoomIn(); });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => { if (map) map.zoomOut(); });

    const mapCard = document.getElementById('map-card');
    const fsLink = document.getElementById('user-fullscreen-gis');
    if (fsLink && mapCard) {
        fsLink.addEventListener('click', (e) => {
            e.preventDefault();
            const on = mapCard.classList.toggle('map-full');
            fsLink.textContent = on ? 'Exit Full Screen' : 'Full Screen GIS View';
            setTimeout(() => { if (map) map.invalidateSize(); }, 60);
        });
    }

    document.querySelectorAll('.btn-view-route').forEach(btn => {
        btn.addEventListener('click', () => {
            const coordsStr = btn.getAttribute('data-coords');
            const name = btn.getAttribute('data-name');
            if (coordsStr && map) {
                const [lat, lng] = coordsStr.split(',').map(Number);
                map.flyTo([lat, lng], 15, { duration: 1.2 });
                showToast('Evacuation Shelter Located', `Focused map on ${name}. Safe routes highlighted in green.`, 'info');
                if (mapCard) mapCard.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

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
            const barangay = document.getElementById('user-barangay').value;
            const category = document.getElementById('user-category').value;
            const desc = document.getElementById('user-desc').value.trim();
            const file = fileInput && fileInput.files ? fileInput.files[0] : null;
            const coords = barangayCoordinates[barangay] || [13.7565, 121.0583];

            if (btnSubmit) btnSubmit.disabled = true;

            let savedReport = null;

            try {
                const fd = new FormData();
                fd.append('role', role);
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

            if (map && typeof L !== 'undefined') {
                const sosMarker = L.marker(coords, {
                    icon: L.divIcon({
                        className: 'sos-map-marker',
                        html: '<div style="background:#D92D20;width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 14px rgba(217,45,32,0.8);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:11px;animation:dp 1s infinite;">SOS</div>',
                        iconSize: [28, 28],
                        iconAnchor: [14, 14]
                    })
                }).bindPopup(`
                    <div style="font-size:12px; line-height:1.4; color:#B42318;">
                        <b style="font-size:14px;">Live SOS Rescue Dispatch</b>
                        <div style="font-weight:700; margin-top:2px;">${escapeHtml(barangay)} - ${escapeHtml(sosType)}</div>
                        <div><b>Location:</b> ${escapeHtml(address)}</div>
                        <div><b>People:</b> ${escapeHtml(people)}</div>
                        <div><b>Contact:</b> ${escapeHtml(contact)}</div>
                    </div>
                `);

                sosMarker.addTo(map);
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

            const opts = [...sel.options];
            const searchable = opts.length > 5;
            let search = null;
            if (searchable) {
                const searchWrap = document.createElement('div');
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
            }

            const items = opts.map(o => {
                const d = document.createElement('div');
                d.className = 'dd-opt';
                d.setAttribute('role', 'option');
                d.dataset.value = o.value;
                d.textContent = o.textContent;
                if (o.disabled) d.setAttribute('aria-disabled', 'true');
                menu.appendChild(d);
                return d;
            });

            const empty = document.createElement('div');
            empty.className = 'dd-empty';
            empty.textContent = 'No matches found';
            empty.hidden = true;
            menu.appendChild(empty);

            const label = btn.querySelector('.dd-label');
            function sync() {
                const o = sel.options[sel.selectedIndex];
                const ph = !o || o.disabled || o.value === '';
                label.textContent = o ? o.textContent : '';
                label.classList.toggle('ph', ph);
                items.forEach((d, i) => d.setAttribute('aria-selected', String(!ph && opts[i] === o)));
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

            items.forEach(d => d.addEventListener('click', (e) => {
                e.stopPropagation();
                if (d.getAttribute('aria-disabled') !== 'true') pick(d);
            }));

            if (search) {
                search.addEventListener('input', () => { filter(search.value); mark(0); });
                search.addEventListener('click', e => e.stopPropagation());
            }

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

            const formParent = sel.closest('form');
            if (formParent) formParent.addEventListener('reset', () => setTimeout(sync, 0));
            sync();
        });
    }

    document.addEventListener('click', () => document.querySelectorAll('.dd.open').forEach(x => x.classList.remove('open')));
    enhanceSelects();
});