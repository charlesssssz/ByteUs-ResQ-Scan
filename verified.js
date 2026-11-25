function initVerifiedReportsPage() {
    // =========================================================================
    // 1. THEME PERSISTENCE & DARK MODE TOGGLE
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
    // 2. TOAST NOTIFICATION UTILITY
    // =========================================================================
    const toastContainer = document.getElementById('toast-container');

    function showToast(title, message, type = 'info') {
        if (!toastContainer) return;
        const icons = { success: '✓', warning: '⚠', info: 'ℹ' };

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
        }, 3800);
    }

    // =========================================================================
    // 3. SIDEBAR COLLAPSE & ACCOUNT DROPDOWN
    // =========================================================================
    const sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn');
    const navLinks = document.querySelectorAll('.nav a');

    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', () => {
            const collapsed = document.body.classList.toggle('sidebar-collapsed');
            sidebarCollapseBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
            sidebarCollapseBtn.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');

            navLinks.forEach(link => {
                const label = link.textContent.trim().replace(/\s+/g, ' ');
                link.setAttribute('title', label);
            });
        });
    }

    const accountToggle = document.getElementById('account-menu-toggle');
    const accountMenu = document.getElementById('account-menu');

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
    // 4. VERIFIED REPORTS DATASET (BATANGAS CITY SECTORS)
    // =========================================================================
    const verifiedReports = [
        {
            id: 'RPT-2026-0841',
            tag: 'COLLAPSE',
            title: 'Concrete seawall breach & road washout',
            desc: 'Eastern perimeter wall undermined by storm surge; single-lane passable only to emergency trucks.',
            brgy: 'Brgy. Wawa',
            sector: 's3',
            sectorLabel: 'Sector 3 (South Coast)',
            severity: 'sev',
            aiInitial: 'Severe',
            aiScore: '96%',
            decision: 'confirmed',
            officer: 'Duty Officer M. Reyes',
            role: 'Field Volunteer',
            timestamp: 'Nov 26, 2026 • 10:42 AM',
            notes: 'Barricades deployed by Brgy. Tanod. City Engineering structural team scheduled for shoreline reinforcement.'
        },
        {
            id: 'RPT-2026-0839',
            tag: 'ROOF OFF',
            title: 'Multi-household galvanized roofing torn off',
            desc: 'Four coastal residences sustained complete roof loss; 18 residents relocated to Sports Coliseum.',
            brgy: 'Brgy. Malitam',
            sector: 's3',
            sectorLabel: 'Sector 3 (South Coast)',
            severity: 'sev',
            aiInitial: 'Severe',
            aiScore: '93%',
            decision: 'confirmed',
            officer: 'Duty Officer M. Reyes',
            role: 'Field Volunteer',
            timestamp: 'Nov 26, 2026 • 10:18 AM',
            notes: 'Endorsed to MSWDO for emergency shelter kits and tarpaulin allocation.'
        },
        {
            id: 'RPT-2026-0836',
            tag: 'POWER LINE',
            title: 'Leaning primary utility pole near port access',
            desc: 'Tilted 35 degrees toward main arterial road; MERALCO line crew requested for isolation.',
            brgy: 'Brgy. Sta. Clara',
            sector: 's1',
            sectorLabel: 'Sector 1 (Poblacion & Port)',
            severity: 'sev',
            aiInitial: 'Moderate',
            aiScore: '74%',
            decision: 'reclassified',
            officer: 'Capt. R. Villanueva',
            role: 'Resident Upload',
            timestamp: 'Nov 26, 2026 • 09:55 AM',
            notes: 'Upgraded from Moderate to Severe due to live primary feeder proximity to port evacuation corridor.'
        },
        {
            id: 'RPT-2026-0832',
            tag: 'WATER',
            title: 'Knee-deep river overflow along riverside street',
            desc: 'Calumpang riverbank spillover affecting 120m stretch; light vehicles advised to take P. Burgos.',
            brgy: 'Brgy. Cuta',
            sector: 's2',
            sectorLabel: 'Sector 2 (Calumpang Basin)',
            severity: 'mod',
            aiInitial: 'Moderate',
            aiScore: '85%',
            decision: 'confirmed',
            officer: 'Duty Officer L. Santos',
            role: 'Field Volunteer',
            timestamp: 'Nov 26, 2026 • 09:31 AM',
            notes: 'Water level receding slowly at 0.1m/hr. Traffic advisory posted at Barangay Hall.'
        },
        {
            id: 'RPT-2026-0828',
            tag: 'DEBRIS',
            title: 'Uprooted narra tree blocking inner barangay lane',
            desc: 'No casualties or live wires involved; chainsaw clearing team dispatched.',
            brgy: 'Brgy. Kumintang Ilaya',
            sector: 's2',
            sectorLabel: 'Sector 2 (Calumpang Basin)',
            severity: 'mod',
            aiInitial: 'Severe',
            aiScore: '81%',
            decision: 'reclassified',
            officer: 'Duty Officer L. Santos',
            role: 'Resident Upload',
            timestamp: 'Nov 26, 2026 • 09:04 AM',
            notes: 'Reclassified from Severe to Moderate after ground verification confirmed no structural or electrical hazard.'
        },
        {
            id: 'RPT-2026-0825',
            tag: 'WATER',
            title: 'Clogged drainage inlet causing gutter flooding',
            desc: 'Ankle-deep runoff near public market perimeter; drainage maintenance crew notified.',
            brgy: 'Brgy. Poblacion 18',
            sector: 's1',
            sectorLabel: 'Sector 1 (Poblacion & Port)',
            severity: 'min',
            aiInitial: 'Minor',
            aiScore: '64%',
            decision: 'confirmed',
            officer: 'Duty Officer M. Reyes',
            role: 'Resident Upload',
            timestamp: 'Nov 26, 2026 • 08:47 AM',
            notes: 'Silt and plastic debris cleared by barangay sweepers; road fully passable.'
        },
        {
            id: 'RPT-2026-0821',
            tag: 'ROOF OFF',
            title: 'Damaged waiting shed roof panels',
            desc: 'Loose sheet metal secured by barangay maintenance volunteers; no injuries reported.',
            brgy: 'Brgy. Bolbok',
            sector: 's2',
            sectorLabel: 'Sector 2 (Calumpang Basin)',
            severity: 'mod',
            aiInitial: 'Moderate',
            aiScore: '79%',
            decision: 'confirmed',
            officer: 'Capt. R. Villanueva',
            role: 'Field Volunteer',
            timestamp: 'Nov 26, 2026 • 08:20 AM',
            notes: 'Hazard sheets removed from pedestrian walkway.'
        },
        {
            id: 'RPT-2026-0817',
            tag: 'DEBRIS',
            title: 'Fallen signage & palm fronds on coastal shoulder',
            desc: 'Minor roadside obstruction cleared without heavy equipment.',
            brgy: 'Brgy. Gulod Labac',
            sector: 's3',
            sectorLabel: 'Sector 3 (South Coast)',
            severity: 'min',
            aiInitial: 'Minor',
            aiScore: '58%',
            decision: 'confirmed',
            officer: 'Duty Officer L. Santos',
            role: 'Resident Upload',
            timestamp: 'Nov 26, 2026 • 07:52 AM',
            notes: 'Logged for post-storm municipal cleanup accounting.'
        }
    ];

    // =========================================================================
    // 5. FILTERING, SEARCH & TABLE RENDERING
    // =========================================================================
    const tableBody = document.getElementById('verified-table-body');
    const emptyState = document.getElementById('empty-ledger-state');
    const countLabel = document.getElementById('ledger-count-label');
    const searchInput = document.getElementById('verified-search');
    const sectorFilter = document.getElementById('sector-filter');
    const decisionFilter = document.getElementById('decision-filter');
    const sevTabs = document.querySelectorAll('.ledger-toolbar .tabs button');
    const resetBtn = document.getElementById('btn-reset-filters');

    const state = {
        severity: 'all',
        sector: 'all',
        decision: 'all',
        query: ''
    };

    const sevLabels = {
        sev: 'Severe',
        mod: 'Moderate',
        min: 'Minor'
    };

    function getFilteredReports() {
        return verifiedReports.filter(item => {
            if (state.severity !== 'all' && item.severity !== state.severity) return false;
            if (state.sector !== 'all' && item.sector !== state.sector) return false;
            if (state.decision !== 'all' && item.decision !== state.decision) return false;

            if (state.query) {
                const q = state.query.toLowerCase();
                const haystack = `${item.id} ${item.brgy} ${item.title} ${item.desc} ${item.officer} ${item.role}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }

    function renderTable() {
        if (!tableBody) return;
        const rows = getFilteredReports();

        if (countLabel) {
            countLabel.textContent = `Showing ${rows.length} of ${verifiedReports.length} verified records`;
        }

        if (rows.length === 0) {
            tableBody.innerHTML = '';
            if (emptyState) emptyState.hidden = false;
            return;
        }

        if (emptyState) emptyState.hidden = true;

        tableBody.innerHTML = rows.map(item => {
            const sevText = sevLabels[item.severity] || 'Moderate';
            const decisionHtml = item.decision === 'confirmed'
                ? `<span class="decision-badge confirmed">✓ AI Confirmed</span>
                   <span class="decision-sub">AI: ${item.aiInitial} (${item.aiScore})</span>`
                : `<span class="decision-badge reclassified">↻ Reclassified</span>
                   <span class="decision-sub">From ${item.aiInitial} (${item.aiScore})</span>`;

            return `
                <tr data-report-id="${item.id}">
                    <td><span class="rpt-id">${item.id}</span></td>
                    <td>
                        <div class="evidence-cell">
                            <div class="mini-thumb"><span>${item.tag}</span></div>
                            <div class="evidence-text">
                                <b>${item.title}</b>
                                <span>${item.role}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="brgy-cell">
                            <b>${item.brgy}</b>
                            <small>${item.sectorLabel}</small>
                        </div>
                    </td>
                    <td><span class="sev-pill ${item.severity}">${sevText}</span></td>
                    <td><div class="decision-cell">${decisionHtml}</div></td>
                    <td>
                        <div class="officer-cell">
                            <b>${item.officer}</b>
                            <small>MDRRMO Ops</small>
                        </div>
                    </td>
                    <td><span class="time-cell">${item.timestamp}</span></td>
                    <td class="col-right">
                        <button type="button" class="btn-inspect" data-inspect-id="${item.id}">
                            <svg class="i"><use href="#eye" /></svg> Inspect
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    sevTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            sevTabs.forEach(b => {
                b.classList.remove('on');
                b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
            });
            btn.classList.add('on');
            state.severity = btn.getAttribute('data-sev') || 'all';
            renderTable();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.query = e.target.value.trim();
            renderTable();
        });
    }

    if (sectorFilter) {
        sectorFilter.addEventListener('change', (e) => {
            state.sector = e.target.value;
            renderTable();
        });
    }

    if (decisionFilter) {
        decisionFilter.addEventListener('change', (e) => {
            state.decision = e.target.value;
            renderTable();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            state.severity = 'all';
            state.sector = 'all';
            state.decision = 'all';
            state.query = '';

            if (searchInput) searchInput.value = '';
            if (sectorFilter) sectorFilter.value = 'all';
            if (decisionFilter) decisionFilter.value = 'all';

            sevTabs.forEach(b => {
                const isAll = b.getAttribute('data-sev') === 'all';
                b.classList.toggle('on', isAll);
                b.setAttribute('aria-selected', String(isAll));
            });

            renderTable();
        });
    }

    // =========================================================================
    // 6. REPORT INSPECTION MODAL
    // =========================================================================
    const detailModal = document.getElementById('modal-report-detail');
    const closeDetailBtn = document.getElementById('btn-close-detail');
    const closeDetailFootBtn = document.getElementById('btn-close-detail-foot');
    const printSingleBtn = document.getElementById('btn-print-single');

    function openDetailModal(reportId) {
        const item = verifiedReports.find(r => r.id === reportId);
        if (!item || !detailModal) return;

        document.getElementById('detail-report-id').textContent = item.id;
        document.getElementById('detail-subtitle').textContent = `${item.brgy} • ${item.sectorLabel}`;
        document.getElementById('detail-thumb-label').textContent = item.tag;
        document.getElementById('detail-incident-title').textContent = item.title;
        document.getElementById('detail-incident-desc').textContent = item.desc;
        document.getElementById('detail-source').textContent = item.role;
        document.getElementById('detail-ai-pred').textContent = `${item.aiInitial} (${item.aiScore} confidence)`;
        document.getElementById('detail-decision').textContent = item.decision === 'confirmed'
            ? `Confirmed as ${sevLabels[item.severity]}`
            : `Reclassified from ${item.aiInitial} to ${sevLabels[item.severity]}`;
        document.getElementById('detail-officer-time').textContent = `${item.officer} • ${item.timestamp}`;
        document.getElementById('detail-officer-notes').textContent = item.notes;

        const badgesEl = document.getElementById('detail-badges');
        badgesEl.innerHTML = `
            <span class="sev-pill ${item.severity}">${sevLabels[item.severity]}</span>
            <span class="decision-badge ${item.decision}">${item.decision === 'confirmed' ? '✓ AI Confirmed' : '↻ Officer Reclassified'}</span>
        `;

        detailModal.style.display = 'flex';
    }

    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-inspect-id]');
            if (btn) {
                openDetailModal(btn.getAttribute('data-inspect-id'));
            }
        });
    }

    if (closeDetailBtn) closeDetailBtn.addEventListener('click', () => detailModal.style.display = 'none');
    if (closeDetailFootBtn) closeDetailFootBtn.addEventListener('click', () => detailModal.style.display = 'none');

    if (printSingleBtn) {
        printSingleBtn.addEventListener('click', () => {
            showToast('Verification Sheet Ready', 'Prepared individual DRRMO verification sheet for printing.', 'success');
            window.print();
        });
    }

    // =========================================================================
    // 7. SITREP MODAL & CSV EXPORT
    // =========================================================================
    const btnOpenSitrep = document.getElementById('btn-open-sitrep');
    const modalSitrep = document.getElementById('modal-sitrep-preview');
    const btnCloseSitrep = document.getElementById('btn-close-sitrep');
    const btnCancelSitrep = document.getElementById('btn-cancel-sitrep');
    const btnPrintSitrep = document.getElementById('btn-print-sitrep');
    const btnExportCsv = document.getElementById('btn-export-verified-csv');

    if (btnOpenSitrep && modalSitrep) {
        btnOpenSitrep.addEventListener('click', () => {
            const ts = document.getElementById('sitrep-timestamp');
            if (ts) ts.textContent = new Date().toLocaleString();
            modalSitrep.style.display = 'flex';
        });
    }

    if (btnCloseSitrep) btnCloseSitrep.addEventListener('click', () => modalSitrep.style.display = 'none');
    if (btnCancelSitrep) btnCancelSitrep.addEventListener('click', () => modalSitrep.style.display = 'none');

    if (btnPrintSitrep) {
        btnPrintSitrep.addEventListener('click', () => {
            showToast('SITREP Extract Prepared', 'Verified damage summary ready for print or PDF export.', 'success');
            window.print();
        });
    }

    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => {
            const rows = getFilteredReports();
            const csvData = [
                ['Report ID', 'Barangay', 'Sector', 'Incident', 'Verified Severity', 'AI Initial', 'AI Score', 'Decision', 'Verified By', 'Timestamp'],
                ...rows.map(r => [
                    r.id,
                    `"${r.brgy}"`,
                    `"${r.sectorLabel}"`,
                    `"${r.title.replace(/"/g, '""')}"`,
                    sevLabels[r.severity],
                    r.aiInitial,
                    r.aiScore,
                    r.decision === 'confirmed' ? 'AI Confirmed' : 'Reclassified',
                    `"${r.officer}"`,
                    `"${r.timestamp}"`
                ])
            ];

            const csvContent = 'data:text/csv;charset=utf-8,' + csvData.map(e => e.join(',')).join('\n');
            const link = document.createElement('a');
            link.setAttribute('href', encodeURI(csvContent));
            link.setAttribute('download', `ResQ-Scan_Verified_Reports_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            showToast('CSV Exported', `Exported ${rows.length} verified report records.`, 'success');
        });
    }

    // Close modals on Escape or Backdrop click
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (detailModal && detailModal.style.display === 'flex') detailModal.style.display = 'none';
            if (modalSitrep && modalSitrep.style.display === 'flex') modalSitrep.style.display = 'none';
        }
    });

    [detailModal, modalSitrep].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
            });
        }
    });

    // Initial render
    renderTable();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVerifiedReportsPage, { once: true });
} else {
    initVerifiedReportsPage();
}
