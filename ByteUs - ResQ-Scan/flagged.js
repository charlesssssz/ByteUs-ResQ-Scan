document.addEventListener('DOMContentLoaded', () => {
    // Sidebar collapse matches the admin dashboard navigation behavior.
    const sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn');
    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', () => {
            const collapsed = document.body.classList.toggle('sidebar-collapsed');
            sidebarCollapseBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
            sidebarCollapseBtn.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
            window.dispatchEvent(new Event('resize'));
        });
    }


    // =========================================================================
    // 1. DATASET OF FLAGGED REPORTS (BATANGAS CITY EOC)
    // =========================================================================
    const flaggedReports = [
        {
            id: 'inc-1',
            reportId: '#INC-1092',
            brgy: 'Brgy. Alangilan',
            location: 'Rizal Avenue, near BatStateU; secondary route blocked',
            reporter: 'Field Volunteer (Brgy. Patrol)',
            submitted: 'Nov 21, 2026 • 14:10',
            score: '89%',
            severity: 'sev',
            hazardType: 'COLLAPSE',
            coords: [13.7650, 121.0700],
            bounds: [
                [13.7605, 121.0635],
                [13.7695, 121.0765]
            ],
            notes: '',
            verified: false,
            photoSvg: `
                <svg viewBox="0 0 600 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <rect width="600" height="400" fill="#1E293B"/>
                    <rect x="120" y="80" width="360" height="240" fill="#334155" rx="4"/>
                    <!-- Road & collapsed bridge structure illustration -->
                    <polygon points="120,320 280,240 320,240 480,320" fill="#475569"/>
                    <path d="M 270 240 L 290 270 L 310 245 L 330 280" stroke="#0F172A" stroke-width="6" fill="none"/>
                    <!-- Water runoff -->
                    <path d="M 0 350 Q 300 320 600 350 L 600 400 L 0 400 Z" fill="#2563EB" opacity="0.65"/>
                    <text x="300" y="50" text-anchor="middle" fill="#94A3B8" font-size="14" font-weight="600" font-family="sans-serif">DRONE RECONNAISSANCE - SECTOR 3 ALANGILAN</text>
                </svg>
            `
        },
        {
            id: 'inc-2',
            reportId: '#INC-1093',
            brgy: 'Brgy. Sta. Clara',
            location: 'Port Access Road, near Terminal 2 passenger shed',
            reporter: 'Field Volunteer (Officer Santos)',
            submitted: 'Nov 21, 2026 • 13:58',
            score: '87%',
            severity: 'sev',
            hazardType: 'ROOF OFF',
            coords: [13.7510, 121.0480],
            bounds: [
                [13.7460, 121.0420],
                [13.7560, 121.0540]
            ],
            notes: '',
            verified: false,
            photoSvg: `
                <svg viewBox="0 0 600 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <rect width="600" height="400" fill="#1E293B"/>
                    <polygon points="150,220 300,100 450,220" fill="#475569" stroke="#94A3B8" stroke-width="3"/>
                    <path d="M 280 120 L 380 70 L 420 110" fill="#64748B" stroke="#EF4444" stroke-width="2"/>
                    <text x="300" y="50" text-anchor="middle" fill="#94A3B8" font-size="14" font-weight="600" font-family="sans-serif">PORT WAREHOUSE WIND DETACHMENT</text>
                </svg>
            `
        },
        {
            id: 'inc-3',
            reportId: '#INC-1094',
            brgy: 'Brgy. Kumintang Ilaya',
            location: 'Bridge approach near national highway culvert',
            reporter: 'Community Resident (M. Batangas)',
            submitted: 'Nov 21, 2026 • 13:45',
            score: '67%',
            severity: 'mod',
            hazardType: 'WATER',
            coords: [13.7550, 121.0300],
            bounds: [
                [13.7500, 121.0240],
                [13.7600, 121.0360]
            ],
            notes: '',
            verified: false,
            photoSvg: `
                <svg viewBox="0 0 600 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <rect width="600" height="400" fill="#1E293B"/>
                    <rect x="0" y="240" width="600" height="160" fill="#1D4ED8" opacity="0.75"/>
                    <rect x="180" y="160" width="240" height="90" fill="#475569" rx="4"/>
                    <text x="300" y="50" text-anchor="middle" fill="#94A3B8" font-size="14" font-weight="600" font-family="sans-serif">WAIST-DEEP WATER RUNOFF</text>
                </svg>
            `
        },
        {
            id: 'inc-4',
            reportId: '#INC-1095',
            brgy: 'Brgy. Libjo',
            location: 'Bypass road shoulder, near barangay outpost',
            reporter: 'Community Resident (J. Ramos)',
            submitted: 'Nov 21, 2026 • 13:22',
            score: '49%',
            severity: 'min',
            hazardType: 'DEBRIS',
            coords: [13.7380, 121.0650],
            bounds: [
                [13.7330, 121.0590],
                [13.7430, 121.0710]
            ],
            notes: '',
            verified: false,
            photoSvg: `
                <svg viewBox="0 0 600 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <rect width="600" height="400" fill="#1E293B"/>
                    <path d="M 220 280 Q 280 200 360 270" stroke="#15803D" stroke-width="12" fill="none"/>
                    <text x="300" y="50" text-anchor="middle" fill="#94A3B8" font-size="14" font-weight="600" font-family="sans-serif">FALLEN TREE LIMBS ON SHOULDER</text>
                </svg>
            `
        }
    ];

    // =========================================================================
    // 2. STATE & URL QUERY PARSER
    // =========================================================================
    const urlParams = new URLSearchParams(window.location.search);
    let currentIncidentId = urlParams.get('id') || 'inc-1';
    let currentIndex = flaggedReports.findIndex(r => r.id === currentIncidentId);
    if (currentIndex === -1) currentIndex = 0;

    let currentReport = flaggedReports[currentIndex];
    let selectedDecision = currentReport.severity;

    // Toast Utility
    const toastStack = document.getElementById('toast-stack');
    function showToast(title, message, type = 'info') {
        if (!toastStack) return;
        const toast = document.createElement('div');
        toast.className = `flagged-toast ${type}`;
        toast.innerHTML = `
            <div class="toast-body">
                <b>${title}</b>
                <p>${message}</p>
            </div>
        `;
        toastStack.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity .3s, transform .3s';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(() => toast.remove(), 320);
        }, 3600);
    }

    // =========================================================================
    // 3. MAPLIBRE MAP & HAZARD OVERLAY
    //    Uses the same Liberty streets style as the Admin Dashboard.
    //    Existing report markers, severity colors, map/photo toggle, and
    //    Streets/Satellite controls are preserved.
    // =========================================================================
    const mapElement = document.getElementById('flagged-map');
    let map = null;
    let hazardBadgeMarker = null;
    let currentMapStyle = 'streets';

    const baseMapUrls = {
        satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    };

    const baseMapAttributions = {
        satellite: 'Tiles &copy; Esri'
    };

    function buildFlaggedMapStyle(type) {
        if (type === 'satellite') {
            return {
                version: 8,
                sources: {
                    'flagged-basemap': {
                        type: 'raster',
                        tiles: [baseMapUrls.satellite],
                        tileSize: 256,
                        attribution: baseMapAttributions.satellite,
                        maxzoom: 19
                    }
                },
                layers: [{
                    id: 'flagged-basemap-layer',
                    type: 'raster',
                    source: 'flagged-basemap',
                    paint: {
                        'raster-fade-duration': 0,
                        'raster-resampling': 'linear'
                    }
                }]
            };
        }

        // Match the Admin Dashboard's default detailed street map.
        return 'https://tiles.openfreemap.org/styles/liberty';
    }

    function initMap() {
        if (!mapElement || typeof maplibregl === 'undefined') {
            console.error('MapLibre could not be loaded for the flagged report map.');
            return;
        }

        try {
            map = new maplibregl.Map({
                container: mapElement,
                style: buildFlaggedMapStyle(currentMapStyle),
                center: [currentReport.coords[1], currentReport.coords[0]],
                zoom: 14,
                attributionControl: true,
                cooperativeGestures: false
            });

            map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

            map.on('error', (event) => {
                const message = event && event.error && event.error.message ? event.error.message : '';
                if (message) console.warn('ResQ-Scan flagged map:', message);
            });

            map.on('load', () => {
                map.resize();
                renderHazardBox();
            });

            map.on('style.load', () => {
                renderHazardBox();
            });

            window.addEventListener('resize', () => map && map.resize());
            requestAnimationFrame(() => map && map.resize());
        } catch (err) {
            console.error('Error initializing MapLibre flagged map:', err);
        }
    }

    function renderHazardBox() {
        if (!map || !map.isStyleLoaded()) return;

        const sevColors = {
            sev: '#DC2626',
            mod: '#EAB308',
            min: '#16A34A'
        };
        const activeColor = sevColors[selectedDecision] || '#DC2626';
        const labelText = selectedDecision === 'sev' ? 'Severe' : selectedDecision === 'mod' ? 'Moderate' : 'Minor';

        // GeoJSON polygon follows the same report bounds as the original map.
        const ring = [
            [currentReport.bounds[0][1], currentReport.bounds[0][0]],
            [currentReport.bounds[1][1], currentReport.bounds[0][0]],
            [currentReport.bounds[1][1], currentReport.bounds[1][0]],
            [currentReport.bounds[0][1], currentReport.bounds[1][0]],
            [currentReport.bounds[0][1], currentReport.bounds[0][0]]
        ];
        const hazardFeature = {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [ring] }
        };

        if (map.getLayer('flagged-hazard-fill')) map.removeLayer('flagged-hazard-fill');
        if (map.getLayer('flagged-hazard-outline')) map.removeLayer('flagged-hazard-outline');
        if (map.getSource('flagged-hazard')) map.removeSource('flagged-hazard');

        map.addSource('flagged-hazard', {
            type: 'geojson',
            data: hazardFeature
        });

        map.addLayer({
            id: 'flagged-hazard-fill',
            type: 'fill',
            source: 'flagged-hazard',
            paint: {
                'fill-color': activeColor,
                'fill-opacity': 0.08
            }
        });

        map.addLayer({
            id: 'flagged-hazard-outline',
            type: 'line',
            source: 'flagged-hazard',
            paint: {
                'line-color': activeColor,
                'line-width': 3.5
            }
        });

        // Keep the existing severity badge at the top-center of the report bounds.
        if (hazardBadgeMarker) hazardBadgeMarker.remove();

        const topCenter = [
            (currentReport.bounds[0][1] + currentReport.bounds[1][1]) / 2,
            currentReport.bounds[1][0]
        ];
        const badgeElement = document.createElement('div');
        badgeElement.className = 'hazard-box-badge';
        badgeElement.textContent = labelText;

        hazardBadgeMarker = new maplibregl.Marker({
            element: badgeElement,
            anchor: 'bottom'
        }).setLngLat(topCenter).addTo(map);

        map.fitBounds([
            [currentReport.bounds[0][1], currentReport.bounds[0][0]],
            [currentReport.bounds[1][1], currentReport.bounds[1][0]]
        ], {
            padding: 50,
            duration: 900,
            maxZoom: 16
        });
    }

    // Switch base map only; all report details and actions remain unchanged.
    const tileStyleButtons = document.querySelectorAll('.tile-btn');
    tileStyleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tileStyleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMapStyle = btn.dataset.style === 'satellite' ? 'satellite' : 'streets';
            if (map) {
                map.setStyle(buildFlaggedMapStyle(currentMapStyle));
            }
        });
    });

    // =========================================================================
    // 4. VIEW TOGGLE: GEOSPATIAL MAP VS DISASTER PHOTO
    // =========================================================================
    const btnViewMap = document.getElementById('btn-view-map');
    const btnViewPhoto = document.getElementById('btn-view-photo');
    const photoOverlay = document.getElementById('photo-overlay');
    const mapStyleToggles = document.getElementById('map-style-toggles');
    const photoImg = document.getElementById('flagged-photo-img');
    const aiBoxTag = document.getElementById('ai-box-tag');

    if (btnViewMap && btnViewPhoto) {
        btnViewMap.addEventListener('click', () => {
            btnViewMap.classList.add('active');
            btnViewPhoto.classList.remove('active');
            if (photoOverlay) photoOverlay.style.display = 'none';
            if (mapStyleToggles) mapStyleToggles.style.display = 'inline-flex';
            if (map) setTimeout(() => map.resize(), 50);
        });

        btnViewPhoto.addEventListener('click', () => {
            btnViewPhoto.classList.add('active');
            btnViewMap.classList.remove('active');
            if (photoOverlay) photoOverlay.style.display = 'grid';
            if (mapStyleToggles) mapStyleToggles.style.display = 'none';
            if (photoImg && currentReport) {
                photoImg.src = `data:image/svg+xml;utf8,${encodeURIComponent(currentReport.photoSvg)}`;
            }
            if (aiBoxTag && currentReport) {
                aiBoxTag.textContent = `${currentReport.hazardType} • ${currentReport.score}`;
            }
        });
    }

    // =========================================================================
    // 5. RENDER CURRENT REPORT DETAILS IN UI
    // =========================================================================
    const headerReportId = document.getElementById('header-report-id');
    const queueCounterText = document.getElementById('queue-counter-text');
    const aiBadgePill = document.getElementById('ai-badge-pill');
    const aiScoreNumber = document.getElementById('ai-score-number');
    const valBarangay = document.getElementById('val-barangay');
    const valLocation = document.getElementById('val-location');
    const valReporter = document.getElementById('val-reporter');
    const valSubmitted = document.getElementById('val-submitted');
    const officerNote = document.getElementById('officer-note');
    const verifyStatusBar = document.getElementById('verify-status-bar');

    function renderReportUI(report) {
        if (!report) return;

        selectedDecision = report.severity;

        if (headerReportId) headerReportId.textContent = report.reportId;
        if (queueCounterText) queueCounterText.textContent = `${currentIndex + 1} of ${flaggedReports.length}`;

        // AI Result Card
        if (aiScoreNumber) aiScoreNumber.textContent = report.score;
        if (aiBadgePill) {
            aiBadgePill.className = `severity-badge-pill ${report.severity === 'sev' ? 'severe' : report.severity === 'mod' ? 'moderate' : 'minor'}`;
            aiBadgePill.textContent = report.severity === 'sev' ? 'Severe' : report.severity === 'mod' ? 'Moderate' : 'Minor';
        }

        if (valBarangay) valBarangay.textContent = report.brgy;
        if (valLocation) valLocation.textContent = report.location;
        if (valReporter) valReporter.textContent = report.reporter;
        if (valSubmitted) valSubmitted.textContent = report.submitted;

        // Officer Decision Triage Buttons
        updateDecisionButtons(selectedDecision);

        if (officerNote) officerNote.value = report.notes || '';
        if (verifyStatusBar) {
            verifyStatusBar.style.display = report.verified ? 'flex' : 'none';
        }

        // Update photo view if active
        if (photoImg) {
            photoImg.src = `data:image/svg+xml;utf8,${encodeURIComponent(report.photoSvg)}`;
        }
        if (aiBoxTag) {
            aiBoxTag.textContent = `${report.hazardType} • ${report.score}`;
        }

        // Update map hazard box
        renderHazardBox();

        // Update URL query state
        const newUrl = `${window.location.pathname}?id=${report.id}`;
        window.history.replaceState({ id: report.id }, '', newUrl);
    }

    function updateDecisionButtons(val) {
        const triageButtons = document.querySelectorAll('.triage-btn');
        triageButtons.forEach(btn => {
            if (btn.dataset.val === val) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // =========================================================================
    // 6. OFFICER TRIAGE BUTTONS & ACTIONS
    // =========================================================================
    const triageButtons = document.querySelectorAll('.triage-btn');
    triageButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedDecision = btn.dataset.val;
            updateDecisionButtons(selectedDecision);

            // Dynamically reflect decision on AI Result badge & map box
            if (aiBadgePill) {
                aiBadgePill.className = `severity-badge-pill ${selectedDecision === 'sev' ? 'severe' : selectedDecision === 'mod' ? 'moderate' : 'minor'}`;
                aiBadgePill.textContent = selectedDecision === 'sev' ? 'Severe' : selectedDecision === 'mod' ? 'Moderate' : 'Minor';
            }
            renderHazardBox();
        });
    });

    // Verify Report Button
    const btnVerify = document.getElementById('btn-verify-report');
    if (btnVerify) {
        btnVerify.addEventListener('click', () => {
            currentReport.verified = true;
            currentReport.severity = selectedDecision;
            currentReport.notes = officerNote ? officerNote.value : '';

            // Persist verified state
            try {
                const verifiedList = JSON.parse(localStorage.getItem('resq_verified_ids') || '[]');
                if (!verifiedList.includes(currentReport.id)) {
                    verifiedList.push(currentReport.id);
                    localStorage.setItem('resq_verified_ids', JSON.stringify(verifiedList));
                }
            } catch (e) {
                console.warn('Storage sync failed:', e);
            }

            if (verifyStatusBar) verifyStatusBar.style.display = 'flex';

            showToast(
                'Report Verified by DRRMO',
                `${currentReport.reportId} (${currentReport.brgy}) verified as ${selectedDecision.toUpperCase()}. Relief & clearance dispatched.`,
                'success'
            );

            // Auto-advance to next report after 1.4s if more exist
            setTimeout(() => {
                if (currentIndex < flaggedReports.length - 1) {
                    currentIndex++;
                    currentReport = flaggedReports[currentIndex];
                    renderReportUI(currentReport);
                }
            }, 1400);
        });
    }

    // Request New Photo Button
    const btnRequestPhoto = document.getElementById('btn-request-photo');
    if (btnRequestPhoto) {
        btnRequestPhoto.addEventListener('click', () => {
            const noteText = officerNote && officerNote.value ? officerNote.value : 'Insufficient visual clarity for damage classification.';
            showToast(
                'Photo Re-Request Dispatched',
                `Prompt sent to ${currentReport.reporter} for ${currentReport.brgy}: "${noteText}"`,
                'warning'
            );
        });
    }

    // Previous / Next Report Navigation
    const btnPrevReport = document.getElementById('btn-prev-report');
    const btnNextReport = document.getElementById('btn-next-report');

    if (btnPrevReport) {
        btnPrevReport.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                currentReport = flaggedReports[currentIndex];
                renderReportUI(currentReport);
            } else {
                showToast('Queue Notice', 'You are at the first flagged report in the queue.', 'info');
            }
        });
    }

    if (btnNextReport) {
        btnNextReport.addEventListener('click', () => {
            if (currentIndex < flaggedReports.length - 1) {
                currentIndex++;
                currentReport = flaggedReports[currentIndex];
                renderReportUI(currentReport);
            } else {
                showToast('Queue Notice', 'You are at the last flagged report in the queue.', 'info');
            }
        });
    }

    // =========================================================================
    // 7. INITIAL RENDER
    // =========================================================================
    initMap();
    renderReportUI(currentReport);

});
