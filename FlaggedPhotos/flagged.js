document.addEventListener('DOMContentLoaded', () => {

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
    // 3. LEAFLET MAP INITIALIZATION & BOUNDING BOX
    // =========================================================================
    const mapElement = document.getElementById('flagged-map');
    let map = null;
    let tileLayer = null;
    let hazardBoxLayer = null;
    let hazardBadgeMarker = null;
    let currentMapStyle = 'streets';

    const tileConfigs = {
        streets: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attr: '&copy; OpenStreetMap contributors'
        },
        satellite: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attr: '&copy; Esri &mdash; Earthstar Geographics'
        }
    };

    function initMap() {
        if (!mapElement || typeof L === 'undefined') return;

        try {
            map = L.map('flagged-map', {
                zoomControl: true,
                preferCanvas: true
            }).setView(currentReport.coords, 14);

            tileLayer = L.tileLayer(tileConfigs[currentMapStyle].url, {
                attribution: tileConfigs[currentMapStyle].attr,
                maxZoom: 19
            }).addTo(map);

            setTimeout(() => { if (map) map.invalidateSize(); }, 100);
            setTimeout(() => { if (map) map.invalidateSize(); }, 400);

            renderHazardBox();
        } catch (err) {
            console.error('Error initializing Leaflet map:', err);
        }
    }

    function renderHazardBox() {
        if (!map || typeof L === 'undefined') return;

        // Clean previous overlays
        if (hazardBoxLayer) { map.removeLayer(hazardBoxLayer); hazardBoxLayer = null; }
        if (hazardBadgeMarker) { map.removeLayer(hazardBadgeMarker); hazardBadgeMarker = null; }

        const sevColors = {
            sev: '#DC2626',
            mod: '#EAB308',
            min: '#16A34A'
        };
        const activeColor = sevColors[selectedDecision] || '#DC2626';
        const labelText = selectedDecision === 'sev' ? 'Severe' : selectedDecision === 'mod' ? 'Moderate' : 'Minor';

        // 1. Red Bounding Box outlining the affected sector
        hazardBoxLayer = L.rectangle(currentReport.bounds, {
            color: activeColor,
            weight: 3.5,
            fillColor: activeColor,
            fillOpacity: 0.08,
            dashArray: null
        }).addTo(map);

        // 2. Severe Badge Marker anchored right at top center of bounding box
        const topCenter = [
            currentReport.bounds[1][0],
            (currentReport.bounds[0][1] + currentReport.bounds[1][1]) / 2
        ];

        hazardBadgeMarker = L.marker(topCenter, {
            icon: L.divIcon({
                className: 'hazard-box-marker-container',
                html: `<div class="hazard-box-badge" style="background:${activeColor};">${labelText}</div>`,
                iconSize: [60, 22],
                iconAnchor: [30, 26]
            })
        }).addTo(map);

        map.flyToBounds(currentReport.bounds, { padding: [50, 50], duration: 1.0 });
    }

    // Switch Tile Layer (Streets vs Satellite)
    const tileStyleButtons = document.querySelectorAll('.tile-btn');
    tileStyleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tileStyleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMapStyle = btn.dataset.style;
            if (map && tileLayer) {
                map.removeLayer(tileLayer);
                tileLayer = L.tileLayer(tileConfigs[currentMapStyle].url, {
                    attribution: tileConfigs[currentMapStyle].attr,
                    maxZoom: 19
                }).addTo(map);
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
            if (map) setTimeout(() => map.invalidateSize(), 50);
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
