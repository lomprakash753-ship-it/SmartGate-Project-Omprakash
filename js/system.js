/**
 * SMARTGATE - System Status & Settings Controller
 * Handles hardware health diagnostics, simulated offline faults,
 * diagnostic terminal log streaming, application preferences,
 * manual verification modal, and factory reset.
 */

class SystemModule {
    constructor() {
        this.logStreamInterval = null;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    render() {
        this.renderHardwareGrid();
        this.renderSettingsForm();
        this.startLogTerminal();
    }

    renderHardwareGrid() {
        const system = window.dataStore.getSystemStatus();
        const container = document.getElementById('system-hardware-grid');
        if (!container) return;

        const hwKeys = [
            { key: 'irSensor', label: 'IR Proximity Sensor', port: 'GPIO 17 (Pin 11)', metric: `Ping: ${system.irSensor.ping || '12ms'}` },
            { key: 'camera', label: 'Wide-Angle HD Camera', port: 'CSI-0 Ribbon / 1080p', metric: `Framerate: ${system.camera.fps || '30 FPS'}` },
            { key: 'raspberryPi', label: 'Raspberry Pi 4 Model B', port: '4GB LPDDR4 / Quad Core', metric: `Temp: ${system.raspberryPi.temp || '44°C'} | CPU: ${system.raspberryPi.cpuUsage || '18%'}` },
            { key: 'database', label: 'Local SQLite DB Engine', port: 'In-Memory / Persistent Store', metric: `Latency: ${system.database.latency || '4ms'}` },
            { key: 'network', label: 'Campus LAN & Cloud Sync', port: 'Ethernet eth0 / 1 Gbps', metric: `Signal: ${system.network.signal || '100%'}` },
            { key: 'servoGate', label: 'Servo Barrier Gate', port: 'PWM GPIO 18 (Pin 12)', metric: `Angle: ${system.servoGate.angle || '0°'}` }
        ];

        container.innerHTML = hwKeys.map(hw => {
            const data = system[hw.key] || { status: 'ONLINE' };
            const isOnline = data.status === 'ONLINE';

            return `
                <div class="hw-component-card ${isOnline ? '' : 'offline-card'}">
                    <div class="hw-top">
                        <div class="hw-info">
                            <h3>${hw.label}</h3>
                            <p>${hw.port}</p>
                        </div>
                        <span class="badge ${isOnline ? 'badge-success' : 'badge-danger'}">
                            <span class="status-dot ${isOnline ? 'green' : 'red'}"></span>
                            ${data.status}
                        </span>
                    </div>

                    <div class="hw-metrics">
                        <span><i data-lucide="activity" style="width:13px;height:13px;display:inline;"></i> ${hw.metric}</span>
                    </div>

                    <div class="hw-actions">
                        <span style="font-size:11px; color:var(--text-muted);">Simulated Status</span>
                        <button class="btn btn-sm ${isOnline ? 'btn-danger' : 'btn-success'}" onclick="window.systemModule.toggleOffline('${hw.key}')">
                            <i data-lucide="${isOnline ? 'power-off' : 'refresh-cw'}" style="width:12px;height:12px"></i>
                            ${isOnline ? 'Simulate Offline' : 'Restore Online'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    }

    toggleOffline(componentKey) {
        const system = window.dataStore.getSystemStatus();
        const current = system[componentKey]?.status || 'ONLINE';
        const next = current === 'ONLINE' ? 'OFFLINE' : 'ONLINE';

        window.dataStore.setComponentStatus(componentKey, next);

        if (next === 'OFFLINE') {
            window.app.showToast('Fault Simulated', `${componentKey} set to OFFLINE state for demo testing.`, 'warning');
            window.app.playTone('alert');
        } else {
            window.app.showToast('Hardware Restored', `${componentKey} is back ONLINE.`, 'success');
            window.app.playTone('beep');
        }

        this.renderHardwareGrid();
        if (window.dashboardModule) window.dashboardModule.updateHardwareGlance();
        if (window.dashboardModule) window.dashboardModule.updateStatistics();
    }

    restoreAll() {
        window.dataStore.restoreSystemStatus();
        window.app.showToast('All Systems Restored', 'All simulated hardware components are now ONLINE.', 'success');
        window.app.playTone('success');
        this.renderHardwareGrid();
        if (window.dashboardModule) {
            window.dashboardModule.updateHardwareGlance();
            window.dashboardModule.updateStatistics();
        }
    }

    // Diagnostic Terminal Stream
    startLogTerminal() {
        const terminal = document.getElementById('system-terminal-logs');
        if (!terminal) return;

        if (this.logStreamInterval) clearInterval(this.logStreamInterval);

        const appendLog = (hw, msg, type = '') => {
            const time = new Date().toLocaleTimeString();
            const line = document.createElement('div');
            line.className = `terminal-line ${type}`;
            line.innerHTML = `<span class="term-time">[${time}]</span> <span class="term-hw">[${hw}]</span> ${msg}`;
            terminal.appendChild(line);
            terminal.scrollTop = terminal.scrollHeight;

            if (terminal.children.length > 40) {
                terminal.removeChild(terminal.firstChild);
            }
        };

        // Initial logs
        terminal.innerHTML = '';
        appendLog('SYSTEM', 'SmartGate Daemon initialized. Ready for bus entry scans.', 'succ');
        appendLog('CSI_CAM', 'Video stream active at 1080p @ 30 FPS. Auto-exposure locked.');
        appendLog('IR_GPIO17', 'Beam sensor calibrated. Baseline distance: 2.4m');
        appendLog('SERVO_18', 'Barrier gate locked at 0° resting position.');

        const randomEvents = [
            { hw: 'ANPR_ENGINE', msg: 'Heartbeat check: Inference latency 42ms.', type: '' },
            { hw: 'IR_GPIO17', msg: 'Ambient light adjustment completed.', type: '' },
            { hw: 'DATABASE', msg: 'Fleet table integrity verified (0 errors).', type: 'succ' },
            { hw: 'CLOUD_SYNC', msg: 'Payload telemetry queued for synchronization.', type: '' }
        ];

        this.logStreamInterval = setInterval(() => {
            const rand = randomEvents[Math.floor(Math.random() * randomEvents.length)];
            appendLog(rand.hw, rand.msg, rand.type);
        }, 5000);
    }

    // Settings Page Form Handling
    renderSettingsForm() {
        const settings = window.dataStore.getSettings();

        const soundSwitch = document.getElementById('setting-sound-effects');
        if (soundSwitch) soundSwitch.checked = settings.soundEffects;

        const speedSelect = document.getElementById('setting-scan-speed');
        if (speedSelect) speedSelect.value = settings.scanSpeed || 'normal';

        const gateSecInput = document.getElementById('setting-gate-timer');
        if (gateSecInput) gateSecInput.value = settings.autoGateCloseSeconds || 4;

        const ocrThreshInput = document.getElementById('setting-ocr-threshold');
        const ocrThreshVal = document.getElementById('setting-ocr-val');
        if (ocrThreshInput) {
            ocrThreshInput.value = settings.ocrThreshold || 75;
            if (ocrThreshVal) ocrThreshVal.textContent = `${settings.ocrThreshold || 75}%`;
        }
    }

    saveSettings() {
        const settings = window.dataStore.getSettings();

        const soundSwitch = document.getElementById('setting-sound-effects');
        if (soundSwitch) settings.soundEffects = soundSwitch.checked;

        const speedSelect = document.getElementById('setting-scan-speed');
        if (speedSelect) settings.scanSpeed = speedSelect.value;

        const gateSecInput = document.getElementById('setting-gate-timer');
        if (gateSecInput) settings.autoGateCloseSeconds = parseInt(gateSecInput.value, 10) || 4;

        const ocrThreshInput = document.getElementById('setting-ocr-threshold');
        if (ocrThreshInput) settings.ocrThreshold = parseInt(ocrThreshInput.value, 10) || 75;

        window.dataStore.saveSettings(settings);
        window.app.showToast('Settings Saved', 'Preferences have been updated.', 'success');
    }

    resetAllData() {
        if (confirm('Are you sure you want to reset all data? This will restore original sample buses, logs, and settings.')) {
            window.dataStore.resetAllData();
            window.app.showToast('Demo Data Reset', 'All records restored to factory demonstration state.', 'info');
            window.app.playTone('success');
            setTimeout(() => {
                window.location.reload();
            }, 800);
        }
    }

    bindEvents() {
        // Restore all button
        const restoreBtn = document.getElementById('btn-restore-system');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => this.restoreAll());
        }

        // Settings save triggers
        const settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('change', () => this.saveSettings());
        }

        const ocrSlider = document.getElementById('setting-ocr-threshold');
        if (ocrSlider) {
            ocrSlider.addEventListener('input', (e) => {
                const valEl = document.getElementById('setting-ocr-val');
                if (valEl) valEl.textContent = `${e.target.value}%`;
                this.saveSettings();
            });
        }

        // Reset demo data button
        const resetDataBtn = document.getElementById('btn-reset-demo-data');
        if (resetDataBtn) {
            resetDataBtn.addEventListener('click', () => this.resetAllData());
        }
    }
}

// Manual Verification Modal Helper Class
class ManualVerifyModal {
    constructor() {
        this.bindEvents();
    }

    open(data = {}) {
        const modal = document.getElementById('modal-manual-verify');
        if (!modal) return;

        const plateInput = document.getElementById('mv-input-plate');
        const driverInput = document.getElementById('mv-input-driver');
        const routeInput = document.getElementById('mv-input-route');
        const typeSelect = document.getElementById('mv-input-type');
        const notesInput = document.getElementById('mv-input-notes');

        if (plateInput) plateInput.value = data.plateNumber || '';
        if (driverInput) driverInput.value = data.driverName || '';
        if (routeInput) routeInput.value = data.route || '';
        if (notesInput) notesInput.value = data.notes || 'Manual officer gate override verification';

        // Auto-select IN or OUT if bus is known
        if (data.plateNumber) {
            const bus = window.dataStore.getBusByPlate(data.plateNumber);
            if (bus) {
                if (driverInput && !driverInput.value) driverInput.value = bus.driverName;
                if (routeInput && !routeInput.value) routeInput.value = bus.route;
                if (typeSelect) typeSelect.value = bus.isInside ? 'OUT' : 'IN';
            }
        }

        modal.classList.add('open');
    }

    close() {
        const modal = document.getElementById('modal-manual-verify');
        if (modal) modal.classList.remove('open');
    }

    submit(e) {
        e.preventDefault();
        const plate = document.getElementById('mv-input-plate').value.trim().toUpperCase();
        const driver = document.getElementById('mv-input-driver').value.trim() || 'Manual Entry';
        const route = document.getElementById('mv-input-route').value.trim() || 'Campus Gate';
        const type = document.getElementById('mv-input-type').value;
        const notes = document.getElementById('mv-input-notes').value.trim();

        if (!plate) {
            window.app.showToast('Error', 'Please provide a valid bus number plate.', 'danger');
            return;
        }

        // Add manual verified history log
        window.dataStore.addHistoryEntry({
            plateNumber: plate,
            driverName: driver,
            route: route,
            type: type,
            ocrConfidence: 100,
            verification: 'MANUAL VERIFIED',
            status: 'MANUAL',
            notes: notes || 'Verified manually by gate security officer'
        });

        // Trigger servo gate open
        if (window.scanModule) {
            window.scanModule.triggerServoBarrier(true);
        }

        window.app.playTone('success');
        window.app.showToast('Manual Entry Recorded', `✓ Vehicle ${plate} marked as ${type}. Gate opened.`, 'success');
        this.close();

        // Refresh views
        if (window.dashboardModule) window.dashboardModule.render();
        if (window.historyModule) window.historyModule.render();
        if (window.busesModule) window.busesModule.render();
        if (window.reportsModule) window.reportsModule.render();
    }

    bindEvents() {
        const form = document.getElementById('form-manual-verify');
        if (form) {
            form.addEventListener('submit', (e) => this.submit(e));
        }

        document.querySelectorAll('.close-mv-modal').forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });
    }
}

// Global Singletons
window.systemModule = new SystemModule();
window.manualVerifyModal = new ManualVerifyModal();
