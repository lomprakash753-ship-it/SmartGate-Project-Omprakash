/**
 * SMARTGATE - Entry History Module
 * Manages full movement event logs, multi-criteria filtering,
 * pagination, snapshot inspector modal, and CSV export.
 */

class HistoryModule {
    constructor() {
        this.searchQuery = '';
        this.typeFilter = 'ALL';
        this.verificationFilter = 'ALL';
        this.dateFilter = '';
        this.currentPage = 1;
        this.pageSize = 8;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    render() {
        this.renderHistoryTable();
    }

    getFilteredHistory() {
        let history = window.dataStore.getHistory();

        if (this.typeFilter !== 'ALL') {
            history = history.filter(h => h.type === this.typeFilter);
        }

        if (this.verificationFilter !== 'ALL') {
            history = history.filter(h => h.verification === this.verificationFilter);
        }

        if (this.dateFilter) {
            // Compare YYYY-MM-DD or string
            const filterDateObj = new Date(this.dateFilter).toLocaleDateString('en-GB');
            history = history.filter(h => h.dateStr === filterDateObj);
        }

        if (this.searchQuery.trim() !== '') {
            const q = this.searchQuery.toLowerCase().trim();
            history = history.filter(h => 
                h.plateNumber.toLowerCase().includes(q) ||
                h.driverName.toLowerCase().includes(q) ||
                h.route.toLowerCase().includes(q) ||
                (h.notes && h.notes.toLowerCase().includes(q))
            );
        }

        return history;
    }

    renderHistoryTable() {
        const filtered = this.getFilteredHistory();
        const totalItems = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / this.pageSize));

        if (this.currentPage > totalPages) this.currentPage = totalPages;

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const paginated = filtered.slice(startIndex, startIndex + this.pageSize);

        const tbody = document.getElementById('history-table-tbody');
        const countEl = document.getElementById('history-count-badge');
        const paginationInfo = document.getElementById('history-pagination-info');
        const prevBtn = document.getElementById('history-prev-page');
        const nextBtn = document.getElementById('history-next-page');

        if (!tbody) return;

        if (countEl) countEl.textContent = `${totalItems} Total Records`;
        if (paginationInfo) paginationInfo.textContent = `Showing ${totalItems === 0 ? 0 : startIndex + 1} - ${Math.min(startIndex + this.pageSize, totalItems)} of ${totalItems} entries`;

        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;

        if (paginated.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <i data-lucide="file-x-2" style="width: 32px; height: 32px; margin-bottom: 8px; color: var(--text-muted);"></i>
                        <div>No matching entry logs found.</div>
                        <div style="font-size: 11px; margin-top: 4px;">Try resetting your search query or date filter.</div>
                    </td>
                </tr>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        tbody.innerHTML = paginated.map(item => {
            let typeBadge = '';
            if (item.type === 'IN') {
                typeBadge = '<span class="badge badge-success"><i data-lucide="arrow-down-left" style="width:12px;height:12px"></i> IN</span>';
            } else if (item.type === 'OUT') {
                typeBadge = '<span class="badge badge-info"><i data-lucide="arrow-up-right" style="width:12px;height:12px"></i> OUT</span>';
            } else {
                typeBadge = '<span class="badge badge-danger"><i data-lucide="alert-octagon" style="width:12px;height:12px"></i> ALERT</span>';
            }

            let verifBadge = '';
            if (item.verification === 'AUTO VERIFIED') {
                verifBadge = '<span class="badge badge-success">AUTO VERIFIED</span>';
            } else if (item.verification === 'MANUAL VERIFIED') {
                verifBadge = '<span class="badge badge-warning">MANUAL</span>';
            } else {
                verifBadge = '<span class="badge badge-danger">UNREGISTERED</span>';
            }

            return `
                <tr>
                    <td>
                        <div style="font-family:'JetBrains Mono', monospace; font-weight:600; color:var(--text-primary);">${item.timeStr}</div>
                        <div style="font-size:11px; color:var(--text-muted);">${item.dateStr}</div>
                    </td>
                    <td>
                        <div class="license-plate-badge">
                            <span class="plate-ind">IND</span>
                            <span class="plate-text">${item.plateNumber}</span>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight:600; color:var(--text-primary);">${item.driverName}</div>
                        <div style="font-size:11px; color:var(--text-muted);">${item.route}</div>
                    </td>
                    <td>${typeBadge}</td>
                    <td>
                        <span style="font-family:'JetBrains Mono', monospace; font-weight:700; color:${item.ocrConfidence >= 75 ? 'var(--cyan-primary)' : 'var(--warning)'}">
                            ${item.ocrConfidence}%
                        </span>
                    </td>
                    <td>${verifBadge}</td>
                    <td>
                        <div style="font-size:12px; color:var(--text-secondary); max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.notes || ''}">
                            ${item.notes || 'Normal pass'}
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-secondary btn-icon btn-sm" title="View Camera Snapshot" onclick="window.historyModule.openSnapshotModal('${item.id}')">
                            <i data-lucide="camera" style="width:14px;height:14px"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    }

    // Snapshot Inspector Modal
    openSnapshotModal(logId) {
        const item = window.dataStore.getHistory().find(h => h.id === logId);
        if (!item) return;

        const modal = document.getElementById('modal-snapshot-viewer');
        if (!modal) return;

        const content = document.getElementById('snapshot-modal-content');
        if (content) {
            content.innerHTML = `
                <div style="position:relative; aspect-ratio:16/9; background:#04070e; border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--border-medium); margin-bottom:18px;">
                    <div style="position:absolute; top:10px; left:12px; font-family:'JetBrains Mono',monospace; font-size:11px; color:rgba(255,255,255,0.8);">
                        CCTV 01 • GATE ENTRANCE • SNAPSHOT #${item.id}
                    </div>
                    <div style="position:absolute; top:10px; right:12px; font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--cyan-primary);">
                        ${item.dateStr} ${item.timeStr}
                    </div>

                    <!-- Bus Visual Graphic -->
                    <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
                        <div style="font-size:72px; color:rgba(255,255,255,0.08); display:flex; flex-direction:column; align-items:center;">
                            <i data-lucide="bus" style="width:96px; height:96px;"></i>
                        </div>
                    </div>

                    <!-- Number Plate Bounding Overlay -->
                    <div style="position:absolute; bottom:25%; left:50%; transform:translateX(-50%); border:2px solid var(--cyan-primary); padding:6px 14px; background:rgba(0,0,0,0.6); border-radius:4px;">
                        <span style="font-family:'JetBrains Mono',monospace; font-weight:800; font-size:15px; color:#ffffff;">
                            ${item.plateNumber}
                        </span>
                        <span style="font-size:10px; color:var(--cyan-primary); margin-left:8px; font-family:'JetBrains Mono',monospace;">
                            ${item.ocrConfidence}% OCR
                        </span>
                    </div>
                </div>

                <div class="result-meta-grid" style="margin-bottom:0;">
                    <div class="result-meta-item">
                        <div class="label">Event Log ID</div>
                        <div class="val" style="font-family:'JetBrains Mono',monospace;">${item.id}</div>
                    </div>
                    <div class="result-meta-item">
                        <div class="label">Action Type</div>
                        <div class="val">${item.type} ENTRY</div>
                    </div>
                    <div class="result-meta-item">
                        <div class="label">Driver & Route</div>
                        <div class="val">${item.driverName} (${item.route})</div>
                    </div>
                    <div class="result-meta-item">
                        <div class="label">Verification Method</div>
                        <div class="val">${item.verification}</div>
                    </div>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }

        modal.classList.add('open');
    }

    closeSnapshotModal() {
        const modal = document.getElementById('modal-snapshot-viewer');
        if (modal) modal.classList.remove('open');
    }

    // CSV Export
    exportCSV() {
        const history = this.getFilteredHistory();
        if (history.length === 0) {
            window.app.showToast('No Data', 'There are no entry records matching current filters to export.', 'warning');
            return;
        }

        const headers = ['Log ID', 'Date', 'Time', 'Plate Number', 'Driver Name', 'Route', 'Movement Type', 'OCR Confidence', 'Verification Status', 'Gate', 'Notes'];
        const csvRows = [headers.join(',')];

        history.forEach(item => {
            const row = [
                `"${item.id}"`,
                `"${item.dateStr}"`,
                `"${item.timeStr}"`,
                `"${item.plateNumber}"`,
                `"${item.driverName}"`,
                `"${item.route}"`,
                `"${item.type}"`,
                `"${item.ocrConfidence}%"`,
                `"${item.verification}"`,
                `"${item.gate || 'MAIN GATE 01'}"`,
                `"${(item.notes || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `SmartGate_Movement_History_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.app.showToast('Export Successful', `Downloaded ${history.length} movement records as CSV.`, 'success');
        window.app.playTone('beep');
    }

    bindEvents() {
        // Search
        const searchInput = document.getElementById('history-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.currentPage = 1;
                this.renderHistoryTable();
            });
        }

        // Type filter
        const typeSelect = document.getElementById('history-type-filter');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                this.typeFilter = e.target.value;
                this.currentPage = 1;
                this.renderHistoryTable();
            });
        }

        // Verification filter
        const verifSelect = document.getElementById('history-verif-filter');
        if (verifSelect) {
            verifSelect.addEventListener('change', (e) => {
                this.verificationFilter = e.target.value;
                this.currentPage = 1;
                this.renderHistoryTable();
            });
        }

        // Date filter
        const dateInput = document.getElementById('history-date-filter');
        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                this.dateFilter = e.target.value;
                this.currentPage = 1;
                this.renderHistoryTable();
            });
        }

        // Reset filters button
        const resetBtn = document.getElementById('history-reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.searchQuery = '';
                this.typeFilter = 'ALL';
                this.verificationFilter = 'ALL';
                this.dateFilter = '';
                if (searchInput) searchInput.value = '';
                if (typeSelect) typeSelect.value = 'ALL';
                if (verifSelect) verifSelect.value = 'ALL';
                if (dateInput) dateInput.value = '';
                this.currentPage = 1;
                this.renderHistoryTable();
                window.app.showToast('Filters Reset', 'Displaying all history entries.', 'info');
            });
        }

        // Pagination buttons
        const prevBtn = document.getElementById('history-prev-page');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderHistoryTable();
                }
            });
        }

        const nextBtn = document.getElementById('history-next-page');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentPage++;
                this.renderHistoryTable();
            });
        }

        // Export CSV button
        const exportBtn = document.getElementById('btn-history-export-csv');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCSV());
        }

        // Close snapshot modal
        document.querySelectorAll('.close-snapshot-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeSnapshotModal());
        });
    }
}

// Global History Module Singleton
window.historyModule = new HistoryModule();
