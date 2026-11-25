function initDashboard() {

    // =========================================================================
    // 1. EOC DARK MODE TOGGLE & THEME PERSISTENCE
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
        // The selected base map does not need to change with the dashboard theme.
    }

    if (savedTheme === 'dark') {
        applyTheme('dark');
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            applyTheme(isDark ? 'light' : 'dark');
        });
    }

    // =========================================================================
    // 2. TOAST NOTIFICATION UTILITY (NO BROWSER ALERT)
    // =========================================================================
    const toastContainer = document.getElementById('toast-container');

    function showToast(title, message, type = 'info') {
        if (!toastContainer) return;

        const icons = {
            success: '✓',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || 'ℹ'}</div>
            <div class="toast-content">
                <b>${title}</b>
                <p>${message}</p>
            </div>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 320);
        }, 4000);
    }


    // =========================================================================
    // USER ACCOUNT DROPDOWN
    // =========================================================================
    const accountToggle = document.getElementById('account-menu-toggle');
    const accountMenu = document.getElementById('account-menu');
    const usersAccountsBtn = document.getElementById('users-accounts-btn');

    if (accountToggle && accountMenu) {
        accountToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            const open = accountMenu.hidden;
            accountMenu.hidden = !open;
            accountToggle.setAttribute('aria-expanded', String(open));
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('.account-menu-wrap')) {
                accountMenu.hidden = true;
                accountToggle.setAttribute('aria-expanded', 'false');
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !accountMenu.hidden) {
                accountMenu.hidden = true;
                accountToggle.setAttribute('aria-expanded', 'false');
                accountToggle.focus();
            }
        });
    }

    // =========================================================================
    // 3. SIDEBAR NAVIGATION ACTIVE STATE
    // =========================================================================
    const navLinks = document.querySelectorAll('.nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('href') === '#') e.preventDefault();
            navLinks.forEach(item => {
                item.classList.remove('active');
                item.removeAttribute('aria-current');
            });
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        });
    });

    // =========================================================================
    // 4. MAPLIBRE MAP & BASEMAP SWITCHING (BATANGAS CITY CENTER)
    // =========================================================================
    const mapTarget = document.getElementById('map-canvas');
    const baseMapUrls = {
        grid: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        // Keep the existing Topographic and Satellite tile services unchanged.
        topo: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
        sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    };
    const baseMapAttributions = {
        grid: 'Tiles &copy; Esri',
        topo: '&copy; OpenTopoMap',
        sat: 'Tiles &copy; Esri'
    };
    let currentViewType = 'grid';

    function buildBaseStyle(type) {
        const key = baseMapUrls[type] ? type : 'grid';

        // Disaster Grid uses OpenFreeMap's Liberty vector style for richer
        // street, road-shield, place-name and point-of-interest detail.
        // Topographic and Satellite remain on their existing raster sources.
        if (key === 'grid') {
            return 'https://tiles.openfreemap.org/styles/liberty';
        }

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
            layers: [{ id: 'resq-basemap-layer', type: 'raster', source: 'resq-basemap', paint: { 'raster-fade-duration': 0, 'raster-resampling': 'linear' } }]
        };
    }

    const mapEngine = new maplibregl.Map({
        container: mapTarget,
        style: buildBaseStyle('grid'),
        center: [121.0583, 13.7565],
        zoom: 14,
        attributionControl: true,
        cooperativeGestures: false
    });
    mapEngine.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    mapEngine.on('error', (event) => {
        const message = event && event.error && event.error.message ? event.error.message : '';
        if (message) console.warn('ResQ-Scan map:', message);
    });

    function updateMapTileLayer() {
        mapEngine.setStyle(buildBaseStyle(currentViewType));
    }

    mapEngine.on('load', () => mapEngine.resize());
    window.addEventListener('resize', () => mapEngine.resize());
    requestAnimationFrame(() => mapEngine.resize());

    // Sidebar collapse toggle (does not alter map style, zoom, or layers)
    const sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn');
    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', () => {
            const collapsed = document.body.classList.toggle('sidebar-collapsed');
            sidebarCollapseBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
            sidebarCollapseBtn.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');

            // Update navigation tooltips while labels are visually hidden.
            navLinks.forEach(link => {
                const label = link.textContent.trim().replace(/\s+/g, ' ');
                link.setAttribute('title', label);
            });

            // Recalculate the map canvas after the sidebar transition.
            window.setTimeout(() => mapEngine.resize(), 270);
        });
    }


    const tabButtons = document.querySelectorAll('.tabs button');
    tabButtons.forEach(btn => btn.addEventListener('click', () => {
        tabButtons.forEach(b => {
            b.classList.remove('on');
            b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });
        btn.classList.add('on');
        currentViewType = btn.getAttribute('data-view') || 'grid';
        updateMapTileLayer();
    }));

    const map = {
        zoomIn: () => mapEngine.zoomIn({ duration: 180 }),
        zoomOut: () => mapEngine.zoomOut({ duration: 180 }),
        flyTo: (coords, zoom = 14, opts = {}) => mapEngine.flyTo({
            center: [coords[1], coords[0]],
            zoom,
            duration: Math.round((opts.duration || 1) * 1000)
        }),
        addLayer: marker => marker && marker.addTo(),
        removeLayer: marker => marker && marker.removeFrom(),
        hasLayer: marker => !!marker && marker.isOnMap === true
    };

    const sectorSelect = document.getElementById('sector-select');
    if (sectorSelect) sectorSelect.addEventListener('change', e => {
        const val = e.target.value;
        if (val === 's1') { map.flyTo([13.7520, 121.0450], 14, { duration: 1.2 }); showToast('Sector View Updated', 'Focused on Sector 1 - Poblacion & Batangas Port Command Area.', 'info'); }
        else if (val === 's2') { map.flyTo([13.7580, 121.0600], 14, { duration: 1.2 }); showToast('Sector View Updated', 'Focused on Sector 2 - Calumpang River Basin Hazard Zone.', 'info'); }
        else { map.flyTo([13.7565, 121.0583], 13, { duration: 1.2 }); showToast('Sector View Updated', 'Focused on Sector 3 - South Coast & River Basin.', 'info'); }
    });

    function makeMapMarker(coords, html, popupHtml = '') {
        const element = document.createElement('div');
        element.className = 'maplibre-marker-host';
        element.innerHTML = html;
        const popup = new maplibregl.Popup({ offset: 18, closeButton: true, closeOnClick: true });
        let content = popupHtml;
        const marker = new maplibregl.Marker({ element, anchor: 'center' })
            .setLngLat([coords[1], coords[0]])
            .addTo(mapEngine);
        const api = {
            isOnMap: true,
            addTo: () => { if (!api.isOnMap) { marker.addTo(mapEngine); api.isOnMap = true; } return api; },
            removeFrom: () => { if (api.isOnMap) { marker.remove(); popup.remove(); api.isOnMap = false; } },
            bindPopup: htmlText => { content = htmlText; return api; },
            setPopupContent: htmlText => { content = htmlText; },
            setIcon: icon => { element.innerHTML = icon.html; },
            openPopup: () => popup.setLngLat(marker.getLngLat()).setHTML(content || '').addTo(mapEngine),
            setLatLng: next => marker.setLngLat([next[1], next[0]])
        };
        element.addEventListener('click', () => api.openPopup());
        return api;
    }

    // =========================================================================
    // 5. RADAR PULSE MAP PINS & INCIDENT DATA STORE
    // =========================================================================
    function createRadarIcon(severity) {
        const isSevere = severity === 'sev';
        return { html: `<div class="radar-marker ${severity}">${isSevere ? '<span class="pulse-wave"></span>' : ''}<span class="pin-dot"></span></div>` };
    }

    // Live Metrics Counters
    const metrics = {
        sev: 21,
        mod: 15,
        min: 7,
        aw: 23
    };

    const metricSevereCount = document.getElementById('metric-severe-count');
    const metricModerateCount = document.getElementById('metric-moderate-count');
    const metricMinorCount = document.getElementById('metric-minor-count');
    const metricQueueCount = document.getElementById('metric-queue-count');
    const navQueueCount = document.getElementById('nav-queue-count');
    const badgeQueueCount = document.getElementById('badge-queue-count');

    function updateMetricsUI() {
        if (metricSevereCount) metricSevereCount.textContent = metrics.sev;
        if (metricModerateCount) metricModerateCount.textContent = metrics.mod;
        if (metricMinorCount) metricMinorCount.textContent = metrics.min;
        if (metricQueueCount) metricQueueCount.textContent = metrics.aw;
        if (navQueueCount) navQueueCount.textContent = metrics.aw;
        if (badgeQueueCount) badgeQueueCount.textContent = `${metrics.aw} queue`;
    }

    // Barangay Geocoding Lookup for Batangas City
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

    // Incident Store
    const incidentStore = [
        {
            id: 'inc-1',
            brgy: 'Brgy. Alangilan',
            title: 'Bridge approach collapsed',
            desc: 'Critical access route impassable. Life-safety hazard.',
            severity: 'sev',
            source: 'Field Volunteer',
            score: '97%',
            time: '2m ago',
            coords: [13.7650, 121.0700],
            verified: false,
            verifiedSeverity: null,
            reclassified: false
        },
        {
            id: 'inc-2',
            brgy: 'Brgy. Sta. Clara',
            title: 'Downed primary power lines',
            desc: 'Severed cables across road; transformer blown near terminal.',
            severity: 'sev',
            source: 'Field Volunteer',
            score: '87%',
            time: '11m ago',
            coords: [13.7450, 121.0500],
            verified: false,
            verifiedSeverity: null,
            reclassified: false
        },
        {
            id: 'inc-3',
            brgy: 'Brgy. Kumintang',
            title: 'Water level waist-deep on road',
            desc: 'Flash flood runoff. Low clearance vehicles stranded.',
            severity: 'mod',
            source: 'Resident Upload',
            score: '67%',
            time: '24m ago',
            coords: [13.7550, 121.0300],
            verified: false,
            verifiedSeverity: null,
            reclassified: false
        },
        {
            id: 'inc-4',
            brgy: 'Brgy. Libjo',
            title: 'Small acacia branch on sidewalk',
            desc: 'Partial sidewalk obstruction; non-critical damage.',
            severity: 'min',
            source: 'Resident Upload',
            score: '49%',
            time: '42m ago',
            coords: [13.7380, 121.0650],
            verified: false,
            verifiedSeverity: null,
            reclassified: false
        }
    ];

    function createPopupHTML(item) {
        const sevColors = {
            sev: { label: 'Severe', color: '#DC2626', bg: '#FEE2E2' },
            mod: { label: 'Moderate', color: '#D97706', bg: '#FEF3C7' },
            min: { label: 'Minor', color: '#059669', bg: '#D1FAE5' }
        };
        const current = sevColors[item.severity] || sevColors.sev;

        return `
            <div style="font-size:12px; line-height:1.45; min-width:210px; font-family:system-ui, sans-serif;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <b style="font-size:13px; color:#0F172A;">${item.brgy}</b>
                    <span style="font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase; background:${current.bg}; color:${current.color};">
                        ${current.label}
                    </span>
                </div>
                <div style="font-weight:700; color:#1E293B; margin-bottom:4px;">${item.title}</div>
                <div style="font-size:11px; color:#64748B; margin-bottom:8px;">${item.desc}</div>
                <div style="font-size:10px; color:#475569; border-top:1px solid #E2E8F0; padding-top:6px;">
                    <div><b>Source:</b> ${item.source} • <span style="font-family:monospace;">AI: ${item.score}</span></div>
                    <div><b>Status:</b> ${item.verified ? '<span style="color:#059669; font-weight:700;">✓ Verified by DRRMO</span>' : '<span style="color:#D97706; font-weight:700;">Preliminary (Awaiting Review)</span>'}</div>
                </div>
            </div>
        `;
    }

    // Attach incident markers to the map
    incidentStore.forEach(item => {
        const marker = makeMapMarker(item.coords, createRadarIcon(item.severity).html, createPopupHTML(item));
        item.marker = marker;
    });

    // =========================================================================
    // 6. HUMAN-IN-THE-LOOP VERIFICATION WORKFLOW (CONFIRM VS RECLASSIFY)
    // =========================================================================
    const incidentList = document.getElementById('incident-list');

    function handleConfirmation(item, card) {
        if (item.verified) return;

        item.verified = true;
        item.verifiedSeverity = item.severity;

        // Decrement Awaiting Queue, Increment Severity Count
        if (metrics.aw > 0) metrics.aw--;
        metrics[item.severity]++;
        updateMetricsUI();

        // Update card visual oversight state
        const oversightContainer = card.querySelector('.human-oversight');
        if (oversightContainer) {
            oversightContainer.innerHTML = `
                <div class="verified-badge">
                    <span>✓</span> Verified: <strong>${item.severity === 'sev' ? 'Severe' : item.severity === 'mod' ? 'Moderate' : 'Minor'}</strong> <small>(DRRMO Confirmed)</small>
                </div>
            `;
        }

        card.classList.add('verified');

        // Update map marker popup
        if (item.marker) {
            item.marker.setPopupContent(createPopupHTML(item));
        }

        const sevLabel = item.severity === 'sev' ? 'Severe' : item.severity === 'mod' ? 'Moderate' : 'Minor';
        showToast('Classification Confirmed', `${item.brgy} damage validated as ${sevLabel} by DRRMO officer.`, 'success');
    }

    function handleReclassification(item, card, newSeverity) {
        if (!newSeverity || newSeverity === item.severity && item.verified) return;

        const oldSeverity = item.severity;
        const oldSevLabel = oldSeverity === 'sev' ? 'Severe' : oldSeverity === 'mod' ? 'Moderate' : 'Minor';
        const newSevLabel = newSeverity === 'sev' ? 'Severe' : newSeverity === 'mod' ? 'Moderate' : 'Minor';

        // If previously not verified, decrement awaiting queue
        if (!item.verified) {
            if (metrics.aw > 0) metrics.aw--;
        } else {
            // Already verified once, decrement previous verified category
            if (metrics[oldSeverity] > 0) metrics[oldSeverity]--;
        }

        item.severity = newSeverity;
        item.verified = true;
        item.verifiedSeverity = newSeverity;
        item.reclassified = true;

        metrics[newSeverity]++;
        updateMetricsUI();

        // Update Card Styles & Badges
        card.classList.remove('sev', 'mod', 'min');
        card.classList.add(newSeverity, 'verified');
        card.setAttribute('data-severity', newSeverity);

        const tag = card.querySelector('.r2 .tag');
        if (tag) tag.textContent = newSevLabel;

        const oversightContainer = card.querySelector('.human-oversight');
        if (oversightContainer) {
            oversightContainer.innerHTML = `
                <div class="verified-badge reclassified">
                    <span>✓</span> Reclassified: <strong>${newSevLabel}</strong> <small>(from ${oldSevLabel} • DRRMO)</small>
                </div>
            `;
        }

        // Update map marker icon & popup
        if (item.marker) {
            item.marker.setIcon(createRadarIcon(newSeverity));
            item.marker.setPopupContent(createPopupHTML(item));
        }

        showToast('Severity Reclassified', `${item.brgy} reclassified from ${oldSevLabel} to ${newSevLabel} by DRRMO officer.`, 'warning');
    }

    if (incidentList) {
        // Event delegation for confirm button
        incidentList.addEventListener('click', (e) => {
            const confirmBtn = e.target.closest('.btn-confirm');
            if (confirmBtn) {
                e.stopPropagation();
                const card = confirmBtn.closest('.inc');
                const incId = card.getAttribute('data-incident-id');
                const item = incidentStore.find(i => i.id === incId);
                if (item) {
                    handleConfirmation(item, card);
                }
                return;
            }

            // Click card to fly to marker on map
            const card = e.target.closest('.inc');
            if (card && !e.target.closest('select') && !e.target.closest('button')) {
                const incId = card.getAttribute('data-incident-id');
                const item = incidentStore.find(i => i.id === incId);
                if (item && item.marker) {
                    map.flyTo(item.coords, 15, { duration: 1.2 });
                    item.marker.openPopup();
                }
            }
        });

        // Event delegation for reclassify select dropdown
        incidentList.addEventListener('change', (e) => {
            const reclassSelect = e.target.closest('.reclass-select');
            if (reclassSelect) {
                e.stopPropagation();
                const card = reclassSelect.closest('.inc');
                const incId = card.getAttribute('data-incident-id');
                const item = incidentStore.find(i => i.id === incId);
                if (item) {
                    handleReclassification(item, card, reclassSelect.value);
                }
            }
        });
    }

    // =========================================================================
    // 7. DASHBOARD SUMMARY METRICS (INFORMATIONAL ONLY)
    // =========================================================================
    // These cards display live totals only. updateMetricsUI() refreshes the
    // counts after incident verification or reclassification. They do not
    // filter the map or the AI-flagged photo queue.

    // =========================================================================
    // 8. COMMUNITY / VOLUNTEER SUBMISSION MODAL (+ SUBMIT DAMAGE REPORT)
    // =========================================================================
    const btnOpenSubmit = document.getElementById('btn-open-submit-modal');
    const modalSubmit = document.getElementById('modal-submit-report');
    const btnCloseSubmit = document.getElementById('btn-close-submit-modal');
    const btnCancelSubmit = document.getElementById('btn-cancel-submit');
    const damageForm = document.getElementById('damage-report-form');
    const fileInput = document.getElementById('report-photo');
    const fileDropzone = document.getElementById('file-dropzone');
    const dropzonePrompt = document.getElementById('dropzone-prompt');
    const photoPreviewWrap = document.getElementById('photo-preview-wrap');
    const photoPreviewImg = document.getElementById('photo-preview-img');
    const btnRemovePhoto = document.getElementById('btn-remove-photo');
    const scanIndicator = document.getElementById('scan-indicator');
    const btnSubmitScan = document.getElementById('btn-submit-scan');

    function openSubmitModal() {
        if (modalSubmit) modalSubmit.style.display = 'flex';
    }

    function closeSubmitModal() {
        if (modalSubmit) modalSubmit.style.display = 'none';
        if (damageForm) damageForm.reset();
        resetPhotoPreview();
        if (scanIndicator) scanIndicator.style.display = 'none';
        if (btnSubmitScan) btnSubmitScan.disabled = false;
    }

    function resetPhotoPreview() {
        if (photoPreviewWrap) photoPreviewWrap.style.display = 'none';
        if (dropzonePrompt) dropzonePrompt.style.display = 'block';
        if (photoPreviewImg) photoPreviewImg.src = '';
        if (fileInput) fileInput.value = '';
    }

    if (btnOpenSubmit) btnOpenSubmit.addEventListener('click', openSubmitModal);
    if (btnCloseSubmit) btnCloseSubmit.addEventListener('click', closeSubmitModal);
    if (btnCancelSubmit) btnCancelSubmit.addEventListener('click', closeSubmitModal);

    // Instant Client-side Image Preview
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    photoPreviewImg.src = evt.target.result;
                    photoPreviewWrap.style.display = 'flex';
                    dropzonePrompt.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnRemovePhoto) {
        btnRemovePhoto.addEventListener('click', (e) => {
            e.stopPropagation();
            resetPhotoPreview();
        });
    }

    // Form Submission & Simulated AI Preliminary Scan
    if (damageForm) {
        damageForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const role = damageForm.querySelector('input[name="reporter-role"]:checked').value;
            const barangay = document.getElementById('report-barangay').value;
            const category = document.getElementById('report-category').value;
            const desc = document.getElementById('report-desc').value;

            // Show scanning state
            if (scanIndicator) scanIndicator.style.display = 'flex';
            if (btnSubmitScan) btnSubmitScan.disabled = true;

            setTimeout(() => {
                // Determine mock AI classification
                let assignedSeverity = 'mod';
                let confidence = '88%';

                if (category === 'COLLAPSE') {
                    assignedSeverity = 'sev';
                    confidence = '95%';
                } else if (category === 'ROOF OFF') {
                    assignedSeverity = 'sev';
                    confidence = '89%';
                } else if (category === 'WATER') {
                    assignedSeverity = 'mod';
                    confidence = '82%';
                } else {
                    assignedSeverity = 'min';
                    confidence = '79%';
                }

                const newId = 'inc-' + (incidentStore.length + 1);
                const coords = barangayCoordinates[barangay] || [13.7565, 121.0583];

                const newIncident = {
                    id: newId,
                    brgy: barangay,
                    title: desc || `${category} reported at ${barangay}`,
                    desc: `Visual verification underway. Telemetry flagged by ResQ-Vision.`,
                    severity: assignedSeverity,
                    source: role,
                    score: confidence,
                    time: 'Just now',
                    coords: coords,
                    verified: false,
                    verifiedSeverity: null,
                    reclassified: false
                };

                // Add to store
                incidentStore.unshift(newIncident);

                // Increment Awaiting Verification
                metrics.aw++;
                updateMetricsUI();

                // Add incident marker to the map
                const marker = makeMapMarker(coords, createRadarIcon(assignedSeverity).html, createPopupHTML(newIncident));
                newIncident.marker = marker;

                // Prepend New Incident Card to Live Queue
                const newCard = document.createElement('article');
                newCard.className = `inc ${assignedSeverity}`;
                newCard.setAttribute('data-severity', assignedSeverity);
                newCard.setAttribute('data-incident-id', newId);
                newCard.setAttribute('title', 'Click to locate on map');

                const sevTitle = assignedSeverity === 'sev' ? 'Severe' : assignedSeverity === 'mod' ? 'Moderate' : 'Minor';

                newCard.innerHTML = `
                    <div class="thumb"><span>${category}</span></div>
                    <div class="body">
                        <span class="source-tag plain-source">${role}
                        </span>
                        <div class="r1"><b>${barangay}</b><time>Just now</time></div>
                        <div class="r2"><span>AI score: <b>${confidence}</b></span><span class="tag">${sevTitle}</span></div>
                        <p class="snip">${desc}</p>
                    </div>
                    <div class="human-oversight">
                        <button class="btn-confirm" data-action="confirm" title="Validate AI prediction as ${sevTitle}">Confirm</button>
                        <div class="reclass-wrapper">
                            <select class="reclass-select" aria-label="Reclassify Severity">
                                <option value="" disabled selected>Reclassify...</option>
                                <option value="sev">Severe</option>
                                <option value="mod">Moderate</option>
                                <option value="min">Minor</option>
                            </select>
                        </div>
                    </div>
                `;

                if (incidentList) {
                    incidentList.prepend(newCard);
                }

                closeSubmitModal();

                // Smoothly focus on new report on map
                map.flyTo(coords, 15, { duration: 1.4 });
                setTimeout(() => marker.openPopup(), 1500);

                showToast(
                    'AI Preliminary Scan Complete',
                    `New ${role} damage photo for ${barangay} classified as ${sevTitle} (${confidence} confidence). Added to review queue.`,
                    'info'
                );
            }, 1200);
        });
    }

    // =========================================================================
    // 9. SITREP PDF & MSWDO BARANGAY SUMMARY MODALS (CLEAN PREVIEW)
    // =========================================================================
    const btnSitrep = document.getElementById('btn-sitrep');
    const modalSitrep = document.getElementById('modal-sitrep-preview');
    const btnCloseSitrep = document.getElementById('btn-close-sitrep-modal');
    const btnCancelSitrep = document.getElementById('btn-cancel-sitrep');
    const btnPrintSitrep = document.getElementById('btn-print-sitrep');

    const btnMswdo = document.getElementById('btn-mswdo-summary');
    const modalMswdo = document.getElementById('modal-mswdo-preview');
    const btnCloseMswdo = document.getElementById('btn-close-mswdo-modal');
    const btnCancelMswdo = document.getElementById('btn-cancel-mswdo');
    const btnExportMswdoCsv = document.getElementById('btn-export-mswdo-csv');
    const mswdoTableBody = document.getElementById('mswdo-table-body');

    // SITREP Trigger
    if (btnSitrep) {
        btnSitrep.addEventListener('click', () => {
            const timeEl = document.getElementById('sitrep-timestamp');
            if (timeEl) timeEl.textContent = new Date().toLocaleString();

            const sevEl = document.getElementById('sitrep-sev-count');
            const modEl = document.getElementById('sitrep-mod-count');
            const minEl = document.getElementById('sitrep-min-count');
            const awEl = document.getElementById('sitrep-aw-count');

            if (sevEl) sevEl.textContent = metrics.sev;
            if (modEl) modEl.textContent = metrics.mod;
            if (minEl) minEl.textContent = metrics.min;
            if (awEl) awEl.textContent = metrics.aw;

            if (modalSitrep) modalSitrep.style.display = 'flex';
        });
    }

    if (btnCloseSitrep) btnCloseSitrep.addEventListener('click', () => modalSitrep.style.display = 'none');
    if (btnCancelSitrep) btnCancelSitrep.addEventListener('click', () => modalSitrep.style.display = 'none');

    if (btnPrintSitrep) {
        btnPrintSitrep.addEventListener('click', () => {
            showToast('SITREP Report Generated', 'Official SITREP PDF preview prepared for printing and transmission to NDRRMC.', 'success');
            window.print();
        });
    }

    // MSWDO Summary Trigger
    if (btnMswdo) {
        btnMswdo.addEventListener('click', () => {
            if (mswdoTableBody) {
                // Aggregate counts per barangay
                const aggregated = {};

                incidentStore.forEach(i => {
                    if (!aggregated[i.brgy]) {
                        aggregated[i.brgy] = { sev: 0, mod: 0, min: 0, aw: 0, verifiedCount: 0, total: 0 };
                    }
                    aggregated[i.brgy].total++;
                    if (i.verified) {
                        aggregated[i.brgy].verifiedCount++;
                        aggregated[i.brgy][i.severity]++;
                    } else {
                        aggregated[i.brgy].aw++;
                    }
                });

                mswdoTableBody.innerHTML = Object.entries(aggregated).map(([brgy, d]) => {
                    const priority = d.sev > 0 ? '<span style="color:#DC2626; font-weight:800;">Tier 1 (High)</span>'
                        : d.mod > 0 ? '<span style="color:#D97706; font-weight:700;">Tier 2 (Moderate)</span>'
                        : '<span style="color:#059669; font-weight:600;">Tier 3 (Standard)</span>';

                    const status = d.aw === 0 ? '<span style="color:#059669; font-weight:700;">✓ Fully Verified</span>'
                        : `<span style="color:#D97706;">${d.aw} Pending Review</span>`;

                    return `
                        <tr>
                            <td><b>${brgy}</b></td>
                            <td style="color:#DC2626; font-weight:700;">${d.sev}</td>
                            <td style="color:#D97706; font-weight:700;">${d.mod}</td>
                            <td style="color:#059669; font-weight:700;">${d.min}</td>
                            <td>${d.aw}</td>
                            <td>${status}</td>
                            <td>${priority}</td>
                        </tr>
                    `;
                }).join('');
            }

            if (modalMswdo) modalMswdo.style.display = 'flex';
        });
    }

    if (btnCloseMswdo) btnCloseMswdo.addEventListener('click', () => modalMswdo.style.display = 'none');
    if (btnCancelMswdo) btnCancelMswdo.addEventListener('click', () => modalMswdo.style.display = 'none');

    // CSV Download
    if (btnExportMswdoCsv) {
        btnExportMswdoCsv.addEventListener('click', () => {
            const csvRows = [
                ['Barangay', 'Severe Damage', 'Moderate Damage', 'Minor Damage', 'Awaiting Verification', 'DRRMO Status'],
                ...incidentStore.map(i => [
                    i.brgy,
                    i.severity === 'sev' && i.verified ? '1' : '0',
                    i.severity === 'mod' && i.verified ? '1' : '0',
                    i.severity === 'min' && i.verified ? '1' : '0',
                    i.verified ? '0' : '1',
                    i.verified ? 'DRRMO Confirmed' : 'Preliminary AI'
                ])
            ];

            const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `ResQ-Scan_MSWDO_Barangay_Summary_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            showToast('CSV Exported', 'Barangay summary downloaded for MSWDO logistics planning.', 'success');
        });
    }

    // Close modals on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modalSubmit && modalSubmit.style.display === 'flex') closeSubmitModal();
            if (modalSitrep && modalSitrep.style.display === 'flex') modalSitrep.style.display = 'none';
            if (modalMswdo && modalMswdo.style.display === 'flex') modalMswdo.style.display = 'none';
        }
    });

    // Close modals on backdrop click
    [modalSubmit, modalSitrep, modalMswdo].forEach(m => {
        if (m) {
            m.addEventListener('click', (e) => {
                if (e.target === m) m.style.display = 'none';
            });
        }
    });

    // =========================================================================
    // 10. GIS HAZARD OVERLAYS (FLOOD BASIN, EVAC ROUTES, DRONE GRID)
    // =========================================================================
    let overlaySequence = 0;
    const activeGeoOverlays = new Set();
    function makeGeoOverlay(geometry, paint, type) {
        const id = `resq-overlay-${++overlaySequence}`;
        const sourceId = `${id}-source`;
        const layerId = `${id}-layer`;
        const wrapper = {
            isOnMap: false,
            addTo() {
                wrapper.isOnMap = true;
                activeGeoOverlays.add(wrapper);
                addOverlayToStyle();
                return wrapper;
            },
            removeFrom() {
                wrapper.isOnMap = false;
                activeGeoOverlays.delete(wrapper);
                if (mapEngine.getLayer(layerId)) mapEngine.removeLayer(layerId);
                if (mapEngine.getSource(sourceId)) mapEngine.removeSource(sourceId);
            }
        };
        function addOverlayToStyle() {
            if (!wrapper.isOnMap || !mapEngine.isStyleLoaded()) return;
            if (!mapEngine.getSource(sourceId)) {
                mapEngine.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', geometry, properties: {} } });
            }
            if (!mapEngine.getLayer(layerId)) {
                mapEngine.addLayer({ id: layerId, type, source: sourceId, paint });
            }
        }
        wrapper._restore = addOverlayToStyle;
        return wrapper;
    }
    function makePolygonLayer(latlonCoords, stroke, fill, dash = [5, 5]) {
        const coordinates = latlonCoords.map(c => [c[1], c[0]]);
        coordinates.push(coordinates[0]);
        return makeGeoOverlay(
            { type: 'Polygon', coordinates: [coordinates] },
            { 'fill-color': fill, 'fill-outline-color': stroke, 'fill-opacity': 0.9 },
            'fill'
        );
    }
    function makeLineLayer(latlonCoords, color) {
        return makeGeoOverlay(
            { type: 'LineString', coordinates: latlonCoords.map(c => [c[1], c[0]]) },
            { 'line-color': color, 'line-width': 3, 'line-dasharray': [2, 2] },
            'line'
        );
    }
    mapEngine.on('style.load', () => activeGeoOverlays.forEach(overlay => overlay._restore()));
    const floodHazardPolygon = makePolygonLayer([[13.7420,121.0450],[13.7480,121.0580],[13.7580,121.0620],[13.7640,121.0540],[13.7530,121.0400]], '#2563EB', 'rgba(59,130,246,0.25)');
    const evacShelter1 = makeMapMarker([13.7540,121.0620], '<div class="evac-marker">E</div>', '<b>Batangas City Sports Coliseum</b><br>Designated Evac Center (Capacity: 2,500)');
    const evacShelter2 = makeMapMarker([13.7680,121.0520], '<div class="evac-marker">E</div>', '<b>BatStateU Pablo Borbon Gymnasium</b><br>Designated Evac Center (Capacity: 1,800)');
    const evacRouteLine = makeLineLayer([[13.7450,121.0500],[13.7500,121.0550],[13.7540,121.0620]], '#10B981');
    const evacLayerGroup = { isOnMap: false, addTo: () => { evacShelter1.addTo(); evacShelter2.addTo(); evacRouteLine.addTo(); evacLayerGroup.isOnMap = true; return evacLayerGroup; }, removeFrom: () => { evacShelter1.removeFrom(); evacShelter2.removeFrom(); evacRouteLine.removeFrom(); evacLayerGroup.isOnMap = false; } };
    floodHazardPolygon.addTo(); evacLayerGroup.addTo();

    const chkFlood = document.getElementById('ov-flood');
    const chkEvac = document.getElementById('ov-evac');
    if (chkFlood) chkFlood.addEventListener('change', e => e.target.checked ? floodHazardPolygon.addTo() : floodHazardPolygon.removeFrom());
    if (chkEvac) chkEvac.addEventListener('change', e => e.target.checked ? evacLayerGroup.addTo() : evacLayerGroup.removeFrom());

}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard, { once: true });
} else {
    initDashboard();
}
