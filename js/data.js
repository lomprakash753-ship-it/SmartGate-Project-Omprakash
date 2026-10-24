/**
 * SMARTGATE - Frontend Data & API Service Adapter
 * 
 * ARCHITECTURE NOTE FOR BACKEND INTEGRATION:
 * This module acts as the Single Source of Truth for all frontend data.
 * Currently, it simulates backend endpoints using browser `localStorage` and seed datasets.
 * 
 * When the backend (Node.js / Python FastAPI / Django / Flask / Go) is ready:
 * 1. Set `USE_MOCK_DATA: false` or specify `API_BASE_URL`.
 * 2. Replace the localStorage operations inside each method with standard `fetch()` / Axios calls.
 * 3. The UI components (dashboard.js, scan.js, buses.js, etc.) will NOT require any changes!
 */

const API_CONFIG = {
    USE_MOCK_DATA: false,
    API_BASE_URL: 'http://localhost:3000/api', // Target endpoint for future backend
    STORAGE_KEYS: {
        BUSES: 'smartgate_buses',
        HISTORY: 'smartgate_history',
        SYSTEM: 'smartgate_system_status',
        SETTINGS: 'smartgate_settings',
        AUTH: 'smartgate_auth'
    }
};

// Default Seed Fleet Data (Used for initial prototype demo)
const DEFAULT_BUSES = [
    {
        id: 'BUS-001',
        plateNumber: 'MP04AB1234',
        driverName: 'Ramesh Kumar',
        phone: '9876543210',
        route: 'Bhopal - College',
        status: 'ACTIVE',
        isInside: true,
        lastEntry: 'Today, 08:42 AM',
        capacity: 52,
        model: 'Tata Starbus Ultra'
    },
    {
        id: 'BUS-002',
        plateNumber: 'MP04CD5678',
        driverName: 'Amit Sharma',
        phone: '9876543211',
        route: 'Sehore - College',
        status: 'ACTIVE',
        isInside: true,
        lastEntry: 'Today, 09:15 AM',
        capacity: 45,
        model: 'Ashok Leyland Lynx'
    },
    {
        id: 'BUS-003',
        plateNumber: 'MP04EF9012',
        driverName: 'Suresh Patel',
        phone: '9876543212',
        route: 'Raisen - College',
        status: 'ACTIVE',
        isInside: false,
        lastEntry: 'Yesterday, 05:10 PM',
        capacity: 50,
        model: 'Eicher Skyline Pro'
    },
    {
        id: 'BUS-004',
        plateNumber: 'MP04GH4567',
        driverName: 'Dinesh Verma',
        phone: '9876543213',
        route: 'Hoshangabad - College',
        status: 'ACTIVE',
        isInside: false,
        lastEntry: 'Yesterday, 04:50 PM',
        capacity: 48,
        model: 'Tata Starbus'
    },
    {
        id: 'BUS-005',
        plateNumber: 'MP04JK8821',
        driverName: 'Vikram Singh',
        phone: '9876543214',
        route: 'Vidisha - College',
        status: 'ACTIVE',
        isInside: true,
        lastEntry: 'Today, 09:30 AM',
        capacity: 55,
        model: 'BharatBenz Cruiser'
    },
    {
        id: 'BUS-006',
        plateNumber: 'MP04MN3344',
        driverName: 'Sunil Rathore',
        phone: '9876543215',
        route: 'Kolar - College',
        status: 'INACTIVE',
        isInside: false,
        lastEntry: '3 days ago',
        capacity: 40,
        model: 'Swaraj Mazda'
    }
];

// Default Seed Movement History Logs
const DEFAULT_HISTORY = [
    {
        id: 'LOG-1001',
        timestamp: new Date(Date.now() - 3600000 * 6.5).toISOString(),
        timeStr: '08:42 AM',
        dateStr: new Date().toLocaleDateString('en-GB'),
        plateNumber: 'MP04AB1234',
        driverName: 'Ramesh Kumar',
        route: 'Bhopal - College',
        type: 'IN',
        ocrConfidence: 96,
        verification: 'AUTO VERIFIED',
        status: 'SUCCESS',
        gate: 'MAIN GATE 01',
        notes: 'Routine morning route entry'
    },
    {
        id: 'LOG-1002',
        timestamp: new Date(Date.now() - 3600000 * 5.8).toISOString(),
        timeStr: '09:15 AM',
        dateStr: new Date().toLocaleDateString('en-GB'),
        plateNumber: 'MP04CD5678',
        driverName: 'Amit Sharma',
        route: 'Sehore - College',
        type: 'IN',
        ocrConfidence: 94,
        verification: 'AUTO VERIFIED',
        status: 'SUCCESS',
        gate: 'MAIN GATE 01',
        notes: 'Routine morning route entry'
    },
    {
        id: 'LOG-1003',
        timestamp: new Date(Date.now() - 3600000 * 5.2).toISOString(),
        timeStr: '09:30 AM',
        dateStr: new Date().toLocaleDateString('en-GB'),
        plateNumber: 'MP04JK8821',
        driverName: 'Vikram Singh',
        route: 'Vidisha - College',
        type: 'IN',
        ocrConfidence: 97,
        verification: 'AUTO VERIFIED',
        status: 'SUCCESS',
        gate: 'MAIN GATE 01',
        notes: 'Arrived on schedule'
    },
    {
        id: 'LOG-1004',
        timestamp: new Date(Date.now() - 3600000 * 4.5).toISOString(),
        timeStr: '10:21 AM',
        dateStr: new Date().toLocaleDateString('en-GB'),
        plateNumber: 'MP04XY9999',
        driverName: 'Unknown',
        route: 'Unassigned',
        type: 'ALERT',
        ocrConfidence: 94,
        verification: 'UNREGISTERED',
        status: 'WARNING',
        gate: 'MAIN GATE 01',
        notes: 'Unauthorized vehicle attempt - Security intercepted'
    },
    {
        id: 'LOG-1005',
        timestamp: new Date(Date.now() - 3600000 * 3.8).toISOString(),
        timeStr: '11:05 AM',
        dateStr: new Date().toLocaleDateString('en-GB'),
        plateNumber: 'MP04GH4567',
        driverName: 'Dinesh Verma',
        route: 'Hoshangabad - College',
        type: 'IN',
        ocrConfidence: 54,
        verification: 'MANUAL VERIFIED',
        status: 'MANUAL',
        gate: 'MAIN GATE 01',
        notes: 'Low OCR confidence due to dust on plate. Verified by Guard'
    },
    {
        id: 'LOG-1006',
        timestamp: new Date(Date.now() - 3600000 * 2.1).toISOString(),
        timeStr: '12:40 PM',
        dateStr: new Date().toLocaleDateString('en-GB'),
        plateNumber: 'MP04GH4567',
        driverName: 'Dinesh Verma',
        route: 'Hoshangabad - College',
        type: 'OUT',
        ocrConfidence: 93,
        verification: 'AUTO VERIFIED',
        status: 'SUCCESS',
        gate: 'MAIN GATE 01',
        notes: 'Midday maintenance trip'
    }
];

// Simulated Hardware Component Diagnostics
const DEFAULT_SYSTEM = {
    irSensor: { status: 'ONLINE', name: 'IR Proximity Sensor (GPIO 17)', ping: '12ms', lastActive: 'Just now' },
    camera: { status: 'ONLINE', name: 'Wide-Angle HD ANPR Camera (CSI-0)', fps: '30 FPS', lastActive: 'Just now' },
    raspberryPi: { status: 'ONLINE', name: 'Raspberry Pi 4 Model B (4GB)', temp: '44°C', cpuUsage: '18%' },
    database: { status: 'ONLINE', name: 'Local SQLite / Storage Engine', latency: '4ms', sync: 'Synchronized' },
    network: { status: 'ONLINE', name: 'Campus LAN & Cloud Sync', bandwidth: '1 Gbps', signal: '100%' },
    servoGate: { status: 'ONLINE', name: 'Servo Barrier Gate Controller', angle: '0° (Closed)', lastTrigger: '12:40 PM' }
};

// Application Prototype Preferences
const DEFAULT_SETTINGS = {
    demoMode: true,
    autoRefresh: true,
    soundEffects: true,
    scanSpeed: 'normal',
    ocrThreshold: 75,
    autoGateCloseSeconds: 4,
    showHardwareBanner: true,
    darkMode: true
};

class DataStore {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem(API_CONFIG.STORAGE_KEYS.BUSES)) {
            localStorage.setItem(API_CONFIG.STORAGE_KEYS.BUSES, JSON.stringify(DEFAULT_BUSES));
        }
        if (!localStorage.getItem(API_CONFIG.STORAGE_KEYS.HISTORY)) {
            localStorage.setItem(API_CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(DEFAULT_HISTORY));
        }
        if (!localStorage.getItem(API_CONFIG.STORAGE_KEYS.SYSTEM)) {
            localStorage.setItem(API_CONFIG.STORAGE_KEYS.SYSTEM, JSON.stringify(DEFAULT_SYSTEM));
        }
        if (!localStorage.getItem(API_CONFIG.STORAGE_KEYS.SETTINGS)) {
            localStorage.setItem(API_CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        }
    }

    // =========================================================================
    // BUS FLEET SERVICE (Endpoints / Methods)
    // Future Backend: GET /api/buses, POST /api/buses, PUT /api/buses/:id
    // =========================================================================

    /**
     * Fetch all registered buses
     * @returns {Array<Object>} List of bus objects
     */
    getBuses() {
        try {
            return JSON.parse(localStorage.getItem(API_CONFIG.STORAGE_KEYS.BUSES)) || DEFAULT_BUSES;
        } catch (e) {
            return DEFAULT_BUSES;
        }
    }

    /**
     * Save/Sync bus list
     */
    saveBuses(buses) {
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.BUSES, JSON.stringify(buses));
    }

    /**
     * Find bus by plate number
     */
    getBusByPlate(plateNumber) {
        const cleanPlate = (plateNumber || '').replace(/\s+/g, '').toUpperCase();
        return this.getBuses().find(b => b.plateNumber.replace(/\s+/g, '').toUpperCase() === cleanPlate);
    }

    /**
     * Register a new bus in the fleet
     */
    addBus(bus) {
    const newBus = {
        plateNumber: bus.plateNumber.toUpperCase().trim(),
        driverName: bus.driverName || '',
        phone: bus.phone || '',
        route: bus.route || '',
        capacity: bus.capacity || 50,
        model: bus.model || ''
    };

    fetch(`${API_CONFIG.API_BASE_URL}/buses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            bus_number: newBus.plateNumber,
            driver_name: newBus.driverName,
            phone: newBus.phone,
            route: newBus.route,
            capacity: newBus.capacity,
            model: newBus.model
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Bus save nahi hui');
        }
        return response.json();
    })
    .then(data => {
        console.log('Bus MySQL mein save ho gayi:', data);
        alert('New bus successfully MySQL mein save ho gayi!');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Bus save nahi hui. Backend check karein.');
    });

    return newBus;
}

    /**
     * Update vehicle campus presence (Inside / Outside)
     */
    setBusInsideStatus(plateNumber, isInside, timeStr) {
        const buses = this.getBuses();
        const cleanPlate = (plateNumber || '').replace(/\s+/g, '').toUpperCase();
        const bus = buses.find(b => b.plateNumber.replace(/\s+/g, '').toUpperCase() === cleanPlate);
        if (bus) {
            bus.isInside = isInside;
            bus.lastEntry = `Today, ${timeStr}`;
            this.saveBuses(buses);
        }
    }

    // =========================================================================
    // ENTRY LOGS & MOVEMENT SERVICE
    // Future Backend: GET /api/history, POST /api/scan/record
    // =========================================================================

    /**
     * Fetch movement history logs
     */
    getHistory() {
        try {
            return JSON.parse(localStorage.getItem(API_CONFIG.STORAGE_KEYS.HISTORY)) || DEFAULT_HISTORY;
        } catch (e) {
            return DEFAULT_HISTORY;
        }
    }

    /**
     * Save/Sync history logs
     */
    saveHistory(history) {
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(history));
    }

    /**
     * Record a new gate movement entry (IN / OUT / ALERT)
     */
   addHistoryEntry(entry) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    const newEntry = {
        id: 'LOG-' + Date.now(),
        timestamp: now.toISOString(),
        timeStr: timeStr,
        dateStr: now.toLocaleDateString('en-GB'),
        gate: 'MAIN GATE 01',
        ...entry
    };

    // Frontend par turant history update
    const history = this.getHistory();
    history.unshift(newEntry);
    this.saveHistory(history);

    // Bus ki IN/OUT status update
    if (entry.plateNumber &&
        (entry.type === 'IN' || entry.type === 'OUT')) {
        this.setBusInsideStatus(
            entry.plateNumber,
            entry.type === 'IN',
            timeStr
        );
    }

    // MySQL backend mein record save
    fetch(`${API_CONFIG.API_BASE_URL}/history`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            bus_number: entry.plateNumber,
            movement_type: entry.type,
            driver_name: entry.driverName,
            route: entry.route,
            verification: entry.verification,
            status: entry.status,
            notes: entry.notes
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('History save failed');
        }
        return response.json();
    })
    .then(data => console.log('MySQL record saved:', data))
    .catch(error => console.error('Backend error:', error));

    return newEntry;
}

    // =========================================================================
    // HARDWARE SIMULATION TELEMETRY SERVICE
    // Future Backend: GET /api/system/health, WS /ws/hardware/telemetry
    // =========================================================================

    getSystemStatus() {
        try {
            return JSON.parse(localStorage.getItem(API_CONFIG.STORAGE_KEYS.SYSTEM)) || DEFAULT_SYSTEM;
        } catch (e) {
            return DEFAULT_SYSTEM;
        }
    }

    saveSystemStatus(system) {
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.SYSTEM, JSON.stringify(system));
    }

    setComponentStatus(componentKey, status) {
        const system = this.getSystemStatus();
        if (system[componentKey]) {
            system[componentKey].status = status;
            this.saveSystemStatus(system);
        }
    }

    restoreSystemStatus() {
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.SYSTEM, JSON.stringify(DEFAULT_SYSTEM));
        return DEFAULT_SYSTEM;
    }

    // =========================================================================
    // PROTOTYPE PREFERENCES & DEMO RESET
    // =========================================================================

    getSettings() {
        try {
            return JSON.parse(localStorage.getItem(API_CONFIG.STORAGE_KEYS.SETTINGS)) || DEFAULT_SETTINGS;
        } catch (e) {
            return DEFAULT_SETTINGS;
        }
    }

    saveSettings(settings) {
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }

    resetAllData() {
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.BUSES, JSON.stringify(DEFAULT_BUSES));
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(DEFAULT_HISTORY));
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.SYSTEM, JSON.stringify(DEFAULT_SYSTEM));
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
}

// Global data service adapter singleton
window.dataStore = new DataStore();
