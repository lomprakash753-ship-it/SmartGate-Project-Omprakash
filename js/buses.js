/**
 * SMARTGATE - Bus Management Module
 * Handles Fleet CRUD operations, search and status filtering,
 * modal dialogs, and persistence with LocalStorage.
 */

class BusesModule {
    constructor() {
        this.searchQuery = '';
        this.statusFilter = 'ALL';
        this.editingBusId = null;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    render() {
        this.renderBusTable();
    }

    getFilteredBuses() {
        let buses = window.dataStore.getBuses();

        if (this.statusFilter !== 'ALL') {
            buses = buses.filter(b => b.status === this.statusFilter);
        }

        if (this.searchQuery.trim() !== '') {
            const q = this.searchQuery.toLowerCase().trim();
            buses = buses.filter(b => 
                b.plateNumber.toLowerCase().includes(q) ||
                b.driverName.toLowerCase().includes(q) ||
                b.route.toLowerCase().includes(q) ||
                b.id.toLowerCase().includes(q)
            );
        }

        return buses;
    }

    renderBusTable() {
        const buses = this.getFilteredBuses();
        const tbody = document.getElementById('buses-table-tbody');
        const countEl = document.getElementById('buses-count-badge');
        if (!tbody) return;

        if (countEl) countEl.textContent = `${buses.length} Vehicles`;

        if (buses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 36px; color: var(--text-muted);">
                        <i data-lucide="search-x" style="width: 32px; height: 32px; margin-bottom: 8px; color: var(--text-muted);"></i>
                        <div>No matching registered buses found.</div>
                        <div style="font-size: 11px; margin-top: 4px;">Try modifying your search filter or add a new bus.</div>
                    </td>
                </tr>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        tbody.innerHTML = buses.map(bus => {
            const statusBadge = bus.status === 'ACTIVE'
                ? '<span class="badge badge-success"><span class="status-dot green"></span> ACTIVE</span>'
                : '<span class="badge badge-danger"><span class="status-dot red"></span> INACTIVE</span>';

            const insideBadge = bus.isInside
                ? '<span class="badge badge-cyan"><i data-lucide="map-pin" style="width:10px;height:10px"></i> INSIDE</span>'
                : '<span class="badge" style="background:rgba(255,255,255,0.06);color:var(--text-muted)">OUTSIDE</span>';

            return `
                <tr>
                    <td>
                        <span style="font-family:'JetBrains Mono', monospace; font-size:11px; color:var(--text-muted);">${bus.id}</span>
                    </td>
                    <td>
                        <div class="license-plate-badge">
                            <span class="plate-ind">IND</span>
                            <span class="plate-text">${bus.plateNumber}</span>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight:600; color:var(--text-primary);">${bus.driverName}</div>
                        <div style="font-size:11px; color:var(--text-muted);">${bus.model || 'Standard College Bus'}</div>
                    </td>
                    <td>
                        <span style="font-family:'JetBrains Mono', monospace; font-size:12px; color:var(--text-secondary);">${bus.phone}</span>
                    </td>
                    <td>
                        <div style="font-weight:500;">${bus.route}</div>
                    </td>
                    <td>${insideBadge}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-secondary btn-icon btn-sm" title="Edit Bus" onclick="window.busesModule.openEditModal('${bus.id}')">
                                <i data-lucide="edit-3" style="width:14px;height:14px"></i>
                            </button>
                            <button class="btn btn-secondary btn-icon btn-sm" title="Toggle Status" onclick="window.busesModule.toggleStatus('${bus.id}')">
                                <i data-lucide="power" style="width:14px;height:14px; color:${bus.status === 'ACTIVE' ? 'var(--warning)' : 'var(--success)'}"></i>
                            </button>
                            <button class="btn btn-secondary btn-icon btn-sm" title="Delete Bus" onclick="window.busesModule.confirmDelete('${bus.id}')">
                                <i data-lucide="trash-2" style="width:14px;height:14px; color:var(--danger)"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    }

    // Modal Operations
    openAddModal(prefillPlate = '') {
        this.editingBusId = null;
        const modal = document.getElementById('modal-bus-form');
        const titleEl = document.getElementById('modal-bus-title');
        const form = document.getElementById('form-bus-details');

        if (form) form.reset();
        if (titleEl) titleEl.textContent = 'Register New College Bus';

        if (prefillPlate) {
            const plateInput = document.getElementById('bus-input-plate');
            if (plateInput) plateInput.value = prefillPlate;
        }

        if (modal) modal.classList.add('open');
    }

    openEditModal(busId) {
        const bus = window.dataStore.getBuses().find(b => b.id === busId);
        if (!bus) return;

        this.editingBusId = busId;
        const modal = document.getElementById('modal-bus-form');
        const titleEl = document.getElementById('modal-bus-title');

        if (titleEl) titleEl.textContent = `Edit Bus: ${bus.plateNumber}`;

        document.getElementById('bus-input-plate').value = bus.plateNumber;
        document.getElementById('bus-input-driver').value = bus.driverName;
        document.getElementById('bus-input-phone').value = bus.phone;
        document.getElementById('bus-input-route').value = bus.route;
        document.getElementById('bus-input-status').value = bus.status;
        document.getElementById('bus-input-model').value = bus.model || '';

        if (modal) modal.classList.add('open');
    }

    closeModal() {
        const modal = document.getElementById('modal-bus-form');
        if (modal) modal.classList.remove('open');
        this.editingBusId = null;
    }

   async saveBusForm(e) {
    e.preventDefault();

    const plate = document.getElementById('bus-input-plate').value.trim().toUpperCase();
    const driver = document.getElementById('bus-input-driver').value.trim();
    const phone = document.getElementById('bus-input-phone').value.trim();
    const route = document.getElementById('bus-input-route').value.trim();
    const status = document.getElementById('bus-input-status').value;
    const model = document.getElementById('bus-input-model').value.trim();

    if (!plate || !driver || !route) {
        window.app.showToast('Validation Error', 'Please complete all required fields.', 'danger');
        return;
    }

    const existing = window.dataStore.getBusByPlate(plate);
    if (existing && (!this.editingBusId || existing.id !== this.editingBusId)) {
        window.app.showToast('Duplicate Plate', `Vehicle ${plate} is already registered!`, 'danger');
        return;
    }

    try {
        if (this.editingBusId) {
            window.dataStore.updateBus(this.editingBusId, {
                plateNumber: plate,
                driverName: driver,
                phone,
                route,
                status,
                model: model || 'College Bus'
            });
            window.app.showToast('Bus Updated', `Information saved for ${plate}`, 'success');
        } else {
            const response = await fetch('http://localhost:3000/api/buses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bus_number: plate,
                    driver_name: driver,
                    phone,
                    route,
                    status,
                    capacity: 50,
                    model: model || 'College Bus'
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Bus save failed');
            }

            window.dataStore.addBus({
                plateNumber: plate,
                driverName: driver,
                phone,
                route,
                status,
                model: model || 'College Bus'
            });

            window.app.showToast('Bus Registered', `New vehicle ${plate} saved in MySQL.`, 'success');
        }

        window.app.playTone('success');
        this.closeModal();
        this.render();

        if (window.dashboardModule) {
            window.dashboardModule.updateStatistics();
        }

    } catch (error) {
        console.error('Bus save error:', error);
        window.app.showToast('Database Error', error.message, 'danger');
    }
}

    toggleStatus(busId) {
        const bus = window.dataStore.toggleBusStatus(busId);
        if (bus) {
            window.app.showToast('Status Toggled', `${bus.plateNumber} is now ${bus.status}`, 'info');
            this.render();
        }
    }

    confirmDelete(busId) {
        const bus = window.dataStore.getBuses().find(b => b.id === busId);
        if (!bus) return;

        if (confirm(`Are you sure you want to remove bus ${bus.plateNumber} (${bus.driverName}) from the system?`)) {
            window.dataStore.deleteBus(busId);
            window.app.showToast('Bus Removed', `Vehicle ${bus.plateNumber} deleted from database.`, 'info');
            this.render();
            if (window.dashboardModule) window.dashboardModule.updateStatistics();
        }
    }

    bindEvents() {
        // Search filter input
        const searchInput = document.getElementById('buses-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.renderBusTable();
            });
        }

        // Status filter select
        const statusSelect = document.getElementById('buses-status-filter');
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.renderBusTable();
            });
        }

        // Add Bus button
        const addBtn = document.getElementById('btn-add-bus');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openAddModal());
        }

        // Bus form submit
        const busForm = document.getElementById('form-bus-details');
        if (busForm) {
            busForm.addEventListener('submit', (e) => this.saveBusForm(e));
        }

        // Modal close buttons
        document.querySelectorAll('.close-bus-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
    }
}

// Global Buses Module Singleton
window.busesModule = new BusesModule();
