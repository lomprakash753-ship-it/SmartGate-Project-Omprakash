/**
 * SMARTGATE - Dashboard Module
 * Controls summary statistics, live camera monitor simulation,
 * hardware status overview, and real-time recent activity feed.
 */

class DashboardModule {
    constructor() {
        this.cameraTimestampInterval = null;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    render() {
        this.updateStatistics();
        this.updateHardwareGlance();
        this.renderRecentActivity();
        this.startCameraClock();
    }

    // Calculate and animate statistical metrics
    updateStatistics() {
        const buses = window.dataStore.getBuses();
        const history = window.dataStore.getHistory();
        const todayStr = new Date().toLocaleDateString('en-GB');

        const totalBuses = buses.length;
        const currentlyInside = buses.filter(b => b.isInside).length;
        const todayEntries = history.filter(h => h.dateStr === todayStr && h.type === 'IN').length;
        const todayExits = history.filter(h => h.dateStr === todayStr && h.type === 'OUT').length;
        const unknownAttempts = history.filter(h => h.type === 'ALERT' || h.verification === 'UNREGISTERED').length;

        // Check if any hardware is offline
        const system = window.dataStore.getSystemStatus();
        const hasOffline = Object.values(system).some(hw => hw.status !== 'ONLINE');
        const systemStatusText = hasOffline ? 'DEGRADED' : 'ONLINE';
        const systemStatusClass = hasOffline ? 'c-amber' : 'c-green';

        this.setCounterValue('stat-total-buses', totalBuses);
        this.setCounterValue('stat-currently-inside', currentlyInside);
        this.setCounterValue('stat-today-entries', todayEntries);
        this.setCounterValue('stat-today-exits', todayExits);
        this.setCounterValue('stat-unknown-attempts', unknownAttempts);

        const statusEl = document.getElementById('stat-system-status');
        if (statusEl) {
            statusEl.textContent = systemStatusText;
            const cardEl = document.getElementById('card-system-status');
            if (cardEl) {
                cardEl.className = `metric-card ${systemStatusClass}`;
            }
        }
    }

    setCounterValue(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = String(value).padStart(2, '0');
        }
    }

    // Hardware status preview ribbon
    updateHardwareGlance() {
        const system = window.dataStore.getSystemStatus();
        const container = document.getElementById('hardware-glance-items');
        if (!container) return;

        container.innerHTML = `
            <div class="hw-glance-item">
                <span class="status-dot ${system.irSensor.status === 'ONLINE' ? 'green' : 'red'}"></span>
                <span>IR Sensor: <strong>${system.irSensor.status}</strong></span>
            </div>
            <div class="hw-glance-item">
                <span class="status-dot ${system.camera.status === 'ONLINE' ? 'green' : 'red'}"></span>
                <span>Camera: <strong>${system.camera.status}</strong></span>
            </div>
            <div class="hw-glance-item">
                <span class="status-dot ${system.raspberryPi.status === 'ONLINE' ? 'green' : 'red'}"></span>
                <span>Raspberry Pi: <strong>${system.raspberryPi.status}</strong></span>
            </div>
            <div class="hw-glance-item">
                <span class="status-dot ${system.database.status === 'ONLINE' ? 'green' : 'red'}"></span>
                <span>Database: <strong>${system.database.status}</strong></span>
            </div>
            <div class="hw-glance-item">
                <span class="status-dot ${system.network.status === 'ONLINE' ? 'green' : 'red'}"></span>
                <span>LAN/Sync: <strong>${system.network.status}</strong></span>
            </div>
        `;
    }

    // Render Recent Activity Table on Dashboard
    renderRecentActivity() {
        const history = window.dataStore.getHistory().slice(0, 6);
        const tbody = document.getElementById('dashboard-recent-activity-tbody');
        if (!tbody) return;

        if (history.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
                        No entry logs recorded yet today.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = history.map(item => {
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
                        <span style="font-family:'JetBrains Mono', monospace; font-weight:600; color:var(--text-muted);">${item.timeStr}</span>
                    </td>
                    <td>
                        <div class="license-plate-badge" style="font-size:12px;">
                            <span class="plate-ind" style="font-size:8px; padding:2px 4px;">IND</span>
                            <span class="plate-text" style="font-size:11px; padding:2px 6px;">${item.plateNumber}</span>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight:600;">${item.driverName}</div>
                        <div style="font-size:11px; color:var(--text-muted);">${item.route}</div>
                    </td>
                    <td>${typeBadge}</td>
                    <td>${verifBadge}</td>
                    <td>
                        <span style="font-family:'JetBrains Mono', monospace; font-weight:700; color:${item.ocrConfidence > 70 ? 'var(--cyan-primary)' : 'var(--warning)'}">
                            ${item.ocrConfidence}%
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    }

    // Camera Live HUD Timestamp
    startCameraClock() {
        if (this.cameraTimestampInterval) clearInterval(this.cameraTimestampInterval);
        const updateCamTime = () => {
            const el = document.getElementById('camera-hud-live-time');
            if (el) {
                el.textContent = new Date().toISOString().replace('T', ' ').substring(0, 19);
            }
        };
        updateCamTime();
        this.cameraTimestampInterval = setInterval(updateCamTime, 1000);
    }

    bindEvents() {
        // Quick Scan CTA from Dashboard
        const scanBtn = document.getElementById('btn-dashboard-scan-bus');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => {
                window.app.navigateTo('scan');
                // Automatically kick off scan after smooth transition
                setTimeout(() => {
                    if (window.scanModule) window.scanModule.startScan();
                }, 350);
            });
        }

        // Quick Capture Camera button
        const captureBtn = document.getElementById('btn-dashboard-capture-cam');
        if (captureBtn) {
            captureBtn.addEventListener('click', () => {
                window.app.playTone('beep');
                window.app.showToast('Snapshot Captured', 'Gate Camera 01 frame saved to temporary buffer.', 'info');
            });
        }
    }
}

// Global Dashboard Singleton
window.dashboardModule = new DashboardModule();
