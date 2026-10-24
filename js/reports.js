/**
 * SMARTGATE - Reports & Analytics Module
 * Renders interactive Chart.js visualizations (IN vs OUT, Hourly Traffic, Classification),
 * summary analytical metrics, printable daily report modal, and CSV exporter.
 */

class ReportsModule {
    constructor() {
        this.charts = {};
        this.init();
    }

    init() {
        this.bindEvents();
    }

    render() {
        this.updateSummaryCards();
        this.renderCharts();
    }

    updateSummaryCards() {
        const buses = window.dataStore.getBuses();
        const history = window.dataStore.getHistory();
        const todayStr = new Date().toLocaleDateString('en-GB');

        const todayEntries = history.filter(h => h.dateStr === todayStr && h.type === 'IN').length;
        const todayExits = history.filter(h => h.dateStr === todayStr && h.type === 'OUT').length;
        const currentlyInside = buses.filter(b => b.isInside).length;
        const unknownAttempts = history.filter(h => h.type === 'ALERT' || h.verification === 'UNREGISTERED').length;

        const setEl = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(val).padStart(2, '0');
        };

        setEl('report-stat-entries', todayEntries);
        setEl('report-stat-exits', todayExits);
        setEl('report-stat-inside', currentlyInside);
        setEl('report-stat-unknown', unknownAttempts);
    }

    renderCharts() {
        if (!window.Chart) {
            console.warn('Chart.js CDN is not yet loaded.');
            return;
        }

        // Global Chart Defaults for Tech Theme
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';
        Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

        const history = window.dataStore.getHistory();

        // 1. IN vs OUT Entries Chart
        this.renderInOutChart(history);

        // 2. Hourly Gate Traffic Distribution Chart
        this.renderHourlyTrafficChart(history);

        // 3. Vehicle Classification Doughnut Chart
        this.renderClassificationChart(history);

        // 4. Weekly Route Volume Chart
        this.renderRouteVolumeChart(history);
    }

    renderInOutChart(history) {
        const ctx = document.getElementById('chart-in-out-canvas');
        if (!ctx) return;

        if (this.charts.inOut) this.charts.inOut.destroy();

        // Count per day
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Today'];
        const inData = [14, 16, 18, 15, 17, history.filter(h => h.type === 'IN').length];
        const outData = [12, 14, 15, 13, 16, history.filter(h => h.type === 'OUT').length];

        this.charts.inOut = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [
                    {
                        label: 'IN Entries',
                        data: inData,
                        backgroundColor: 'rgba(16, 185, 129, 0.75)',
                        borderColor: '#10b981',
                        borderWidth: 1.5,
                        borderRadius: 6
                    },
                    {
                        label: 'OUT Exits',
                        data: outData,
                        backgroundColor: 'rgba(14, 165, 233, 0.75)',
                        borderColor: '#0ea5e9',
                        borderWidth: 1.5,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    renderHourlyTrafficChart(history) {
        const ctx = document.getElementById('chart-hourly-traffic-canvas');
        if (!ctx) return;

        if (this.charts.hourly) this.charts.hourly.destroy();

        const hours = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
        const trafficData = [2, 12, 18, 6, 4, 3, 5, 4, 8, 16, 11];

        this.charts.hourly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Vehicles / Hour',
                    data: trafficData,
                    fill: true,
                    backgroundColor: 'rgba(0, 229, 255, 0.12)',
                    borderColor: '#00e5ff',
                    borderWidth: 2.5,
                    tension: 0.4,
                    pointBackgroundColor: '#00e5ff',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    renderClassificationChart(history) {
        const ctx = document.getElementById('chart-classification-canvas');
        if (!ctx) return;

        if (this.charts.classification) this.charts.classification.destroy();

        const autoCount = history.filter(h => h.verification === 'AUTO VERIFIED').length || 15;
        const manualCount = history.filter(h => h.verification === 'MANUAL VERIFIED').length || 3;
        const alertCount = history.filter(h => h.verification === 'UNREGISTERED' || h.type === 'ALERT').length || 2;

        this.charts.classification = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Auto Verified', 'Manual Verified', 'Unknown Alerts'],
                datasets: [{
                    data: [autoCount, manualCount, alertCount],
                    backgroundColor: [
                        '#10b981',
                        '#f59e0b',
                        '#ef4444'
                    ],
                    borderColor: '#10172a',
                    borderWidth: 3,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } }
                },
                cutout: '70%'
            }
        });
    }

    renderRouteVolumeChart(history) {
        const ctx = document.getElementById('chart-route-volume-canvas');
        if (!ctx) return;

        if (this.charts.routes) this.charts.routes.destroy();

        const routes = ['Bhopal', 'Sehore', 'Raisen', 'Hoshangabad', 'Vidisha', 'Kolar'];
        const volume = [24, 18, 14, 12, 10, 6];

        this.charts.routes = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: routes,
                datasets: [{
                    label: 'Total Trips',
                    data: volume,
                    backgroundColor: 'rgba(139, 92, 246, 0.75)',
                    borderColor: '#8b5cf6',
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    // Generate Printable Daily Report Modal
    openDailyReportModal() {
        const modal = document.getElementById('modal-daily-report');
        if (!modal) return;

        const buses = window.dataStore.getBuses();
        const history = window.dataStore.getHistory();
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-GB');

        const inCount = history.filter(h => h.type === 'IN').length;
        const outCount = history.filter(h => h.type === 'OUT').length;
        const alertCount = history.filter(h => h.type === 'ALERT').length;
        const insideCount = buses.filter(b => b.isInside).length;

        const reportBody = document.getElementById('daily-report-body');
        if (reportBody) {
            reportBody.innerHTML = `
                <div style="border-bottom:2px solid var(--border-medium); padding-bottom:16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h2 style="font-size:18px; color:var(--text-primary); margin-bottom:4px;">CAMPUS GATE PASS DAILY AUDIT REPORT</h2>
                        <div style="font-size:12px; color:var(--text-secondary);">Generated on ${now.toLocaleString()} • SmartGate AI System</div>
                    </div>
                    <div class="badge badge-success">VERIFIED LOG</div>
                </div>

                <div class="reports-summary-cards" style="margin-bottom:20px;">
                    <div class="metric-card" style="padding:12px;">
                        <div class="metric-label">Total Movements</div>
                        <div class="metric-value">${inCount + outCount + alertCount}</div>
                    </div>
                    <div class="metric-card" style="padding:12px;">
                        <div class="metric-label">In Entries</div>
                        <div class="metric-value" style="color:var(--success);">${inCount}</div>
                    </div>
                    <div class="metric-card" style="padding:12px;">
                        <div class="metric-label">Out Exits</div>
                        <div class="metric-value" style="color:var(--info);">${outCount}</div>
                    </div>
                    <div class="metric-card" style="padding:12px;">
                        <div class="metric-label">Security Alerts</div>
                        <div class="metric-value" style="color:var(--danger);">${alertCount}</div>
                    </div>
                </div>

                <h3 style="font-size:14px; margin-bottom:10px; color:var(--cyan-primary);">Vehicles Currently Inside Campus (${insideCount})</h3>
                <div style="background:var(--bg-dark); border-radius:var(--radius-md); padding:12px; margin-bottom:18px; border:1px solid var(--border-subtle);">
                    ${buses.filter(b => b.isInside).map(b => `
                        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-subtle); font-size:12px;">
                            <span style="font-family:'JetBrains Mono',monospace; font-weight:700;">${b.plateNumber}</span>
                            <span>${b.driverName} (${b.route})</span>
                            <span style="color:var(--text-muted);">${b.lastEntry}</span>
                        </div>
                    `).join('') || '<div style="color:var(--text-muted); font-size:12px;">No buses currently on campus.</div>'}
                </div>

                <div style="font-size:11px; color:var(--text-muted); text-align:center; padding-top:10px;">
                    Software Prototype Demo • Smart College Bus Entry Management System
                </div>
            `;
        }

        modal.classList.add('open');
    }

    closeDailyReportModal() {
        const modal = document.getElementById('modal-daily-report');
        if (modal) modal.classList.remove('open');
    }

    bindEvents() {
        // Daily report button
        const reportBtn = document.getElementById('btn-generate-daily-report');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => this.openDailyReportModal());
        }

        // Close report modal
        document.querySelectorAll('.close-report-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeDailyReportModal());
        });

        // Print report
        const printBtn = document.getElementById('btn-print-report');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }

        // Export report CSV
        const exportBtn = document.getElementById('btn-reports-export-csv');
        if (exportBtn && window.historyModule) {
            exportBtn.addEventListener('click', () => window.historyModule.exportCSV());
        }
    }
}

// Global Reports Module Singleton
window.reportsModule = new ReportsModule();
