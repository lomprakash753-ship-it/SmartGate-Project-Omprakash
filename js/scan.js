/**
 * SMARTGATE - Live ANPR & Hardware Simulation Engine
 * Handles step-by-step hardware scanning pipeline, OCR simulation,
 * intelligent IN/OUT auto-toggle logic, servo barrier gate animation,
 * and result card generation.
 */

class ScanModule {
    constructor() {
        this.selectedPreset = 'MP04AB1234';
        this.isScanning = false;
        this.gateTimer = null;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    render() {
        this.updatePresetChips();
        this.resetPipelineUI();
    }

    updatePresetChips() {
        document.querySelectorAll('.demo-bus-chip').forEach(chip => {
            const plate = chip.getAttribute('data-plate');
            if (plate === this.selectedPreset) {
                chip.classList.add('selected');
            } else {
                chip.classList.remove('selected');
            }
        });

        // Update plate text preview in scanning box
        const boxPlateEl = document.getElementById('camera-plate-overlay-text');
        if (boxPlateEl) {
            boxPlateEl.textContent = this.selectedPreset;
        }
    }

    resetPipelineUI() {
        // Hide result cards
        const resultCard = document.getElementById('scan-result-card');
        if (resultCard) resultCard.classList.remove('show');

        // Reset steps
        for (let i = 1; i <= 6; i++) {
            const stepEl = document.getElementById(`pipeline-step-${i}`);
            if (stepEl) {
                stepEl.className = 'pipeline-step pending';
                const iconContainer = stepEl.querySelector('.step-status-icon');
                if (iconContainer) iconContainer.innerHTML = '<i data-lucide="circle" style="width:16px;height:16px;color:var(--text-muted)"></i>';
            }
        }
        if (window.lucide) window.lucide.createIcons();
    }

    setStepActive(stepNum, statusText = '') {
        const stepEl = document.getElementById(`pipeline-step-${stepNum}`);
        if (!stepEl) return;

        stepEl.className = 'pipeline-step active';
        const iconContainer = stepEl.querySelector('.step-status-icon');
        if (iconContainer) {
            iconContainer.innerHTML = '<div class="step-spinner"></div>';
        }
        if (statusText) {
            const descEl = stepEl.querySelector('.step-desc');
            if (descEl) descEl.textContent = statusText;
        }
    }

    setStepCompleted(stepNum, statusText = '') {
        const stepEl = document.getElementById(`pipeline-step-${stepNum}`);
        if (!stepEl) return;

        stepEl.className = 'pipeline-step completed';
        const iconContainer = stepEl.querySelector('.step-status-icon');
        if (iconContainer) {
            iconContainer.innerHTML = '<i data-lucide="check-circle-2" style="width:16px;height:16px;color:var(--success)"></i>';
        }
        if (statusText) {
            const descEl = stepEl.querySelector('.step-desc');
            if (descEl) descEl.textContent = statusText;
        }
        if (window.lucide) window.lucide.createIcons();
    }

    setStepFailed(stepNum, statusText = '') {
        const stepEl = document.getElementById(`pipeline-step-${stepNum}`);
        if (!stepEl) return;

        stepEl.className = 'pipeline-step failed';
        const iconContainer = stepEl.querySelector('.step-status-icon');
        if (iconContainer) {
            iconContainer.innerHTML = '<i data-lucide="alert-circle" style="width:16px;height:16px;color:var(--danger)"></i>';
        }
        if (statusText) {
            const descEl = stepEl.querySelector('.step-desc');
            if (descEl) descEl.textContent = statusText;
        }
        if (window.lucide) window.lucide.createIcons();
    }

    // Trigger Barrier Servo Arm Animation
    triggerServoBarrier(open = true) {
        const armEl = document.getElementById('barrier-servo-arm');
        const statusEl = document.getElementById('barrier-status-text');
        const settings = window.dataStore.getSettings();

        if (armEl) {
            if (open) {
                armEl.classList.add('open');
                if (statusEl) statusEl.innerHTML = '<span style="color:var(--success);font-weight:700;">OPEN (90°)</span> - Gate Barrier Raised';
                
                // Clear any existing timer
                if (this.gateTimer) clearTimeout(this.gateTimer);

                // Auto close after configured delay
                this.gateTimer = setTimeout(() => {
                    this.triggerServoBarrier(false);
                }, (settings.autoGateCloseSeconds || 4) * 1000);
            } else {
                armEl.classList.remove('open');
                if (statusEl) statusEl.innerHTML = '<span style="color:var(--text-muted);font-weight:600;">CLOSED (0°)</span> - Gate Locked';
            }
        }
    }

    // Main Scanning Pipeline Execution
    async startScan() {
        if (this.isScanning) return;

        // Check simulated hardware health
        const system = window.dataStore.getSystemStatus();
        if (system.camera.status !== 'ONLINE') {
            window.app.showToast('Hardware Simulation Error', 'Camera CSI-0 feed is offline! Restore in System Status.', 'danger');
            window.app.playTone('error');
            return;
        }
        if (system.irSensor.status !== 'ONLINE') {
            window.app.showToast('Hardware Simulation Warning', 'IR Proximity sensor offline. Optical trigger used.', 'warning');
        }

        this.isScanning = true;
        const scanBtn = document.getElementById('btn-start-scan');
        if (scanBtn) {
            scanBtn.disabled = true;
            scanBtn.innerHTML = '<div class="step-spinner" style="margin-right:8px;"></div> SCANNING...';
        }

        // Activate camera scanning laser
        const laser = document.getElementById('scan-laser-line');
        if (laser) laser.classList.add('scanning');

        this.resetPipelineUI();
        window.app.playTone('beep');

        const delay = (ms) => new Promise(res => setTimeout(res, ms));
        const settings = window.dataStore.getSettings();
        const baseSpeed = settings.scanSpeed === 'fast' ? 300 : settings.scanSpeed === 'instant' ? 50 : 650;

        const plate = this.selectedPreset.trim().toUpperCase();
        const isUnknown = plate === 'MP04XY9999' || !window.dataStore.getBusByPlate(plate);
        const isLowConf = plate === 'MP04GH4567';

        try {
            // STEP 1: IR Sensor
            this.setStepActive(1, 'Vehicle proximity detected in gate bay');
            await delay(baseSpeed);
            window.app.playTone('beep');
            this.setStepCompleted(1, 'Proximity verified (0.8m distance)');

            // STEP 2: Camera Capture
            this.setStepActive(2, 'Triggering high-resolution CSI frame grab');
            await delay(baseSpeed);
            window.app.playTone('beep');
            this.setStepCompleted(2, '1080p Image frame buffered');

            // STEP 3: ANPR Number Plate Detection
            this.setStepActive(3, 'Running YOLOv8 license plate locator');
            await delay(baseSpeed);
            window.app.playTone('beep');
            this.setStepCompleted(3, 'Bounding box isolated [X:320, Y:480]');

            // STEP 4: OCR Optical Character Recognition
            this.setStepActive(4, 'Tesseract OCR character matrix extraction');
            await delay(baseSpeed);
            window.app.playTone('beep');
            const calculatedConf = isLowConf ? 52 : isUnknown ? 94 : Math.floor(Math.random() * 4) + 95;
            this.setStepCompleted(4, `Extracted: "${plate}" (${calculatedConf}% conf)`);

            // STEP 5: Database Verification
            this.setStepActive(5, 'Querying SQLite college fleet registry');
            await delay(baseSpeed);

            const registeredBus = window.dataStore.getBusByPlate(plate);

            if (isUnknown || !registeredBus) {
                // Unknown Bus Workflow
                this.setStepFailed(5, 'Vehicle not found in registry');
                await delay(baseSpeed * 0.7);
                this.setStepFailed(6, 'Access Denied: Unregistered vehicle');

                window.app.playTone('alert');
                window.app.showToast('ALERT: Unknown Bus Detected', `Plate ${plate} is not registered!`, 'danger');

                // Record alert in history
                window.dataStore.addHistoryEntry({
                    plateNumber: plate,
                    driverName: 'Unknown',
                    route: 'Unassigned',
                    type: 'ALERT',
                    ocrConfidence: calculatedConf,
                    verification: 'UNREGISTERED',
                    status: 'WARNING',
                    notes: 'Unauthorized vehicle attempt at Gate 01'
                });

                this.renderUnknownResult(plate, calculatedConf);
            } else if (isLowConf) {
                // Low Confidence Workflow
                this.setStepActive(5, 'Matched record with low confidence');
                await delay(baseSpeed * 0.7);
                this.setStepFailed(6, 'Manual verification required');

                window.app.playTone('alert');
                window.app.showToast('Low OCR Confidence (52%)', 'Manual operator confirmation needed.', 'warning');

                this.renderLowConfidenceResult(plate, registeredBus, calculatedConf);
            } else {
                // Successful Registered Bus Workflow
                this.setStepCompleted(5, `Verified: ${registeredBus.driverName} (${registeredBus.route})`);
                await delay(baseSpeed * 0.7);

                // Smart IN/OUT auto-determination
                const nextType = registeredBus.isInside ? 'OUT' : 'IN';
                const nextStatusText = nextType === 'IN' ? 'Campus Entry Recorded' : 'Campus Exit Recorded';
                this.setStepCompleted(6, `Access Granted: ${nextStatusText}`);

                // Open Servo Barrier Gate!
                this.triggerServoBarrier(true);
                window.app.playTone('success');
                window.app.showToast(`✓ ${nextType} Entry Recorded`, `${registeredBus.plateNumber} (${registeredBus.driverName}) verified. Gate Opened.`, 'success');

                // Save to history & update bus isInside status
                window.dataStore.addHistoryEntry({
                    plateNumber: plate,
                    driverName: registeredBus.driverName,
                    route: registeredBus.route,
                    type: nextType,
                    ocrConfidence: calculatedConf,
                    verification: 'AUTO VERIFIED',
                    status: 'SUCCESS',
                    notes: `Automated ANPR gate pass (${nextType})`
                });

                this.renderSuccessResult(registeredBus, nextType, calculatedConf);
            }
        } finally {
            this.isScanning = false;
            if (laser) laser.classList.remove('scanning');
            if (scanBtn) {
                scanBtn.disabled = false;
                scanBtn.innerHTML = '<i data-lucide="scan-line" style="margin-right:6px"></i> START BUS SCAN';
            }
            if (window.lucide) window.lucide.createIcons();
            // Refresh dashboard background stats
            if (window.dashboardModule) window.dashboardModule.updateStatistics();
        }
    }

    // Render Success Result Card
    renderSuccessResult(bus, entryType, confidence) {
        const container = document.getElementById('scan-result-card');
        if (!container) return;

        const isIN = entryType === 'IN';
        const typeBadge = isIN 
            ? '<span class="badge badge-success"><i data-lucide="arrow-down-left" style="width:12px;height:12px"></i> IN ENTRY</span>'
            : '<span class="badge badge-info"><i data-lucide="arrow-up-right" style="width:12px;height:12px"></i> OUT ENTRY</span>';

        container.innerHTML = `
            <div class="result-header-badge">
                <span class="badge badge-success"><i data-lucide="check-circle-2" style="width:12px;height:12px"></i> VERIFICATION COMPLETE</span>
                ${typeBadge}
            </div>

            <div class="result-plate-display">
                <div style="font-size:11px; color:var(--text-muted); margin-bottom:6px; font-weight:700;">NUMBER PLATE DETECTED</div>
                <div class="license-plate-badge" style="font-size:20px;">
                    <span class="plate-ind" style="font-size:10px; padding:4px 8px;">IND</span>
                    <span class="plate-text" style="font-size:18px; padding:4px 14px;">${bus.plateNumber}</span>
                </div>
                <div style="margin-top:8px; font-size:12px; color:var(--cyan-primary); font-weight:600;">
                    OCR Confidence: <strong>${confidence}%</strong>
                </div>
            </div>

            <div class="result-meta-grid">
                <div class="result-meta-item">
                    <div class="label">Assigned Driver</div>
                    <div class="val">${bus.driverName}</div>
                </div>
                <div class="result-meta-item">
                    <div class="label">Designated Route</div>
                    <div class="val">${bus.route}</div>
                </div>
                <div class="result-meta-item">
                    <div class="label">Current Status</div>
                    <div class="val" style="color:${isIN ? 'var(--success)' : 'var(--info)'}; font-weight:700;">
                        ${isIN ? 'INSIDE CAMPUS' : 'EXITED CAMPUS'}
                    </div>
                </div>
                <div class="result-meta-item">
                    <div class="label">Time Logged</div>
                    <div class="val">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            </div>

            <div class="servo-barrier-widget">
                <div class="barrier-visual">
                    <div class="barrier-post"></div>
                    <div id="barrier-servo-arm" class="barrier-arm open"></div>
                </div>
                <div>
                    <div id="barrier-status-text" style="font-size:12px;">
                        <span style="color:var(--success);font-weight:700;">OPEN (90°)</span> - Gate Barrier Raised
                    </div>
                    <div style="font-size:11px; color:var(--text-muted);">Auto-closing barrier after vehicle clear...</div>
                </div>
            </div>
        `;

        container.className = 'scan-result-card glass-panel glow-cyan-border show';
        if (window.lucide) window.lucide.createIcons();
    }

    // Render Unknown Bus Result Card
    renderUnknownResult(plate, confidence) {
        const container = document.getElementById('scan-result-card');
        if (!container) return;

        container.innerHTML = `
            <div class="result-header-badge">
                <span class="badge badge-danger"><i data-lucide="alert-octagon" style="width:12px;height:12px"></i> UNREGISTERED VEHICLE</span>
                <span class="badge badge-danger">ACCESS DENIED</span>
            </div>

            <div class="result-plate-display" style="border-color:rgba(239,68,68,0.3);">
                <div style="font-size:11px; color:var(--danger); margin-bottom:6px; font-weight:700;">⚠ UNKNOWN BUS DETECTED</div>
                <div class="license-plate-badge" style="font-size:20px; border-color:#ef4444;">
                    <span class="plate-ind" style="font-size:10px; padding:4px 8px; background:#ef4444;">IND</span>
                    <span class="plate-text" style="font-size:18px; padding:4px 14px; color:#ef4444;">${plate}</span>
                </div>
                <div style="margin-top:8px; font-size:12px; color:var(--text-secondary);">
                    OCR Confidence: <strong>${confidence}%</strong>
                </div>
            </div>

            <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); border-radius:var(--radius-md); padding:12px; margin-bottom:18px; font-size:12px; color:var(--danger);">
                This vehicle number plate does not exist in the registered fleet database. Security alert logged.
            </div>

            <div style="display:flex; gap:10px;">
                <button id="btn-unknown-manual-verify" class="btn btn-amber btn-sm" style="flex:1;">
                    <i data-lucide="clipboard-edit"></i> VERIFY MANUALLY
                </button>
                <button id="btn-unknown-register" class="btn btn-secondary btn-sm" style="flex:1;">
                    <i data-lucide="plus-circle"></i> REGISTER BUS
                </button>
            </div>
        `;

        container.className = 'scan-result-card glass-panel show';
        if (window.lucide) window.lucide.createIcons();

        // Bind quick action buttons
        const manualBtn = document.getElementById('btn-unknown-manual-verify');
        if (manualBtn) {
            manualBtn.addEventListener('click', () => {
                if (window.manualVerifyModal) {
                    window.manualVerifyModal.open({ plateNumber: plate });
                }
            });
        }

        const registerBtn = document.getElementById('btn-unknown-register');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                if (window.busesModule) {
                    window.app.navigateTo('buses');
                    setTimeout(() => {
                        window.busesModule.openAddModal(plate);
                    }, 300);
                }
            });
        }
    }

    // Render Low Confidence Result Card
    renderLowConfidenceResult(plate, bus, confidence) {
        const container = document.getElementById('scan-result-card');
        if (!container) return;

        container.innerHTML = `
            <div class="result-header-badge">
                <span class="badge badge-warning"><i data-lucide="alert-triangle" style="width:12px;height:12px"></i> LOW OCR CONFIDENCE</span>
                <span class="badge badge-warning">REQUIRES OPERATOR</span>
            </div>

            <div class="result-plate-display" style="border-color:rgba(245,158,11,0.3);">
                <div style="font-size:11px; color:var(--warning); margin-bottom:6px; font-weight:700;">LOW CONFIDENCE OCR READ</div>
                <div class="license-plate-badge" style="font-size:20px; border-color:#f59e0b;">
                    <span class="plate-ind" style="font-size:10px; padding:4px 8px; background:#f59e0b;">IND</span>
                    <span class="plate-text" style="font-size:18px; padding:4px 14px;">${plate}</span>
                </div>
                <div style="margin-top:8px; font-size:12px; color:var(--warning); font-weight:700;">
                    Confidence: ${confidence}% (Threshold: 75%)
                </div>
            </div>

            <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.25); border-radius:var(--radius-md); padding:12px; margin-bottom:18px; font-size:12px; color:var(--text-secondary);">
                Plate characters are partially obscured or blurry. Matched potential record: <strong>${bus ? bus.driverName : 'Unknown'}</strong>. Please verify manually.
            </div>

            <button id="btn-lowconf-manual-verify" class="btn btn-amber" style="width:100%;">
                <i data-lucide="clipboard-check"></i> OPEN MANUAL VERIFICATION
            </button>
        `;

        container.className = 'scan-result-card glass-panel show';
        if (window.lucide) window.lucide.createIcons();

        const verifyBtn = document.getElementById('btn-lowconf-manual-verify');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => {
                if (window.manualVerifyModal) {
                    window.manualVerifyModal.open({
                        plateNumber: plate,
                        driverName: bus ? bus.driverName : '',
                        route: bus ? bus.route : '',
                        confidence: confidence
                    });
                }
            });
        }
    }

    bindEvents() {
        // Preset selector chips click
        document.querySelectorAll('.demo-bus-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                this.selectedPreset = chip.getAttribute('data-plate');
                this.updatePresetChips();
                window.app.playTone('beep');
            });
        });

        // Start scan button
        const startBtn = document.getElementById('btn-start-scan');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startScan());
        }

        // Custom plate simulation input
        const customPlateInput = document.getElementById('custom-sim-plate');
        const customPlateBtn = document.getElementById('btn-apply-custom-plate');
        if (customPlateBtn && customPlateInput) {
            customPlateBtn.addEventListener('click', () => {
                const val = customPlateInput.value.trim().toUpperCase();
                if (val) {
                    this.selectedPreset = val;
                    this.updatePresetChips();
                    window.app.showToast('Preset Updated', `Simulating vehicle: ${val}`, 'info');
                    this.startScan();
                }
            });
        }
    }
}

// Global Scan Module Singleton
window.scanModule = new ScanModule();
