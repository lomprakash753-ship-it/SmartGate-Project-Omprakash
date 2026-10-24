/**
 * SMARTGATE - Core Application Controller
 * Handles Navigation, Authentication, Global Notifications, Web Audio Synthesizer,
 * Presentation Mode, and Lifecycle Events.
 */

class SmartGateApp {
    constructor() {
        this.currentView = 'dashboard';
        this.audioCtx = null;
        this.presentationMode = false;
        this.init();
    }

    init() {
        this.checkAuth();
        this.initLucide();
        this.startClock();
        this.bindEvents();
        this.checkInitialRoute();
    }

    initLucide() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // Web Audio Synthesizer for High-Tech Feedback (Zero External MP3s Needed)
    playTone(type = 'beep') {
        const settings = window.dataStore.getSettings();
        if (!settings.soundEffects) return;

        try {
            if (!this.audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioCtx = new AudioContext();
            }
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const ctx = this.audioCtx;
            const now = ctx.currentTime;

            if (type === 'beep') {
                // Short tech scan blip
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'success') {
                // Two-tone success chime
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

                osc1.frequency.setValueAtTime(587.33, now); // D5
                osc1.frequency.setValueAtTime(880, now + 0.12); // A5

                osc1.connect(gain);
                gain.connect(ctx.destination);
                osc1.start(now);
                osc1.stop(now + 0.35);
            } else if (type === 'alert' || type === 'error') {
                // Low warning buzz
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.setValueAtTime(180, now + 0.1);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.3);
            }
        } catch (e) {
            console.warn('Audio Context error or not permitted:', e);
        }
    }

    // Authentication Handling
    checkAuth() {
        const isAuth = sessionStorage.getItem('smartgate_logged_in') === 'true';
        const loginView = document.getElementById('login-view');
        const appShell = document.getElementById('app-shell');

        if (isAuth) {
            if (loginView) loginView.style.display = 'none';
            if (appShell) appShell.style.display = 'flex';
        } else {
            if (loginView) loginView.style.display = 'flex';
            if (appShell) appShell.style.display = 'none';
        }
    }

    login(username, password) {
        if (username.trim().toLowerCase() === 'admin' && password.trim() === 'admin123') {
            sessionStorage.setItem('smartgate_logged_in', 'true');
            this.showToast('Login Successful', 'Welcome to SmartGate Control Hub', 'success');
            this.playTone('success');
            this.checkAuth();
            this.navigateTo('dashboard');
            return true;
        } else {
            this.showToast('Authentication Failed', 'Invalid demo credentials. Use admin / admin123', 'danger');
            this.playTone('error');
            return false;
        }
    }

    logout() {
        sessionStorage.removeItem('smartgate_logged_in');
        this.showToast('Logged Out', 'Session terminated safely.', 'info');
        this.checkAuth();
    }

    // Real-Time Clock Widget
    startClock() {
        const updateClock = () => {
            const now = new Date();
            const timeEl = document.getElementById('header-live-time');
            const dateEl = document.getElementById('header-live-date');

            if (timeEl) {
                timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }
            if (dateEl) {
                dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            }
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    // View Navigation Router
    navigateTo(viewName) {
        this.currentView = viewName;

        // Update nav item active states
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.getAttribute('data-view') === viewName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Toggle View Sections
        document.querySelectorAll('.view-section').forEach(sec => {
            if (sec.id === `view-${viewName}`) {
                sec.classList.add('active');
            } else {
                sec.classList.remove('active');
            }
        });

        // Trigger view-specific render handlers
        if (viewName === 'dashboard' && window.dashboardModule) {
            window.dashboardModule.render();
        } else if (viewName === 'scan' && window.scanModule) {
            window.scanModule.render();
        } else if (viewName === 'buses' && window.busesModule) {
            window.busesModule.render();
        } else if (viewName === 'history' && window.historyModule) {
            window.historyModule.render();
        } else if (viewName === 'reports' && window.reportsModule) {
            window.reportsModule.render();
        } else if (viewName === 'system' && window.systemModule) {
            window.systemModule.render();
        }

        // Re-init icons for dynamic templates
        this.initLucide();
    }

    checkInitialRoute() {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        this.navigateTo(hash);
    }

    // Presentation Mode Toggle
    togglePresentationMode(enable = null) {
        if (enable === null) {
            this.presentationMode = !this.presentationMode;
        } else {
            this.presentationMode = enable;
        }

        if (this.presentationMode) {
            document.body.classList.add('presentation-active');
            this.navigateTo('scan');
            this.showToast('Presentation Mode Activated', 'Controls streamlined for presentation & projector view.', 'info');
        } else {
            document.body.classList.remove('presentation-active');
            this.showToast('Standard Mode Restored', 'Full sidebar and controls restored.', 'info');
        }
    }

    // Global Toast Notification System
    showToast(title, message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle-2';
        if (type === 'warning') iconName = 'alert-triangle';
        if (type === 'danger') iconName = 'alert-octagon';

        toast.innerHTML = `
            <div class="toast-icon">
                <i data-lucide="${iconName}"></i>
            </div>
            <div class="toast-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i data-lucide="x"></i>
            </button>
        `;

        container.appendChild(toast);
        this.initLucide();

        setTimeout(() => {
            toast.style.transition = 'all 0.3s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Global Event Listeners
    bindEvents() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const u = document.getElementById('login-username').value;
                const p = document.getElementById('login-password').value;
                this.login(u, p);
            });
        }

        // Fill demo creds shortcut
        const demoCredsBtn = document.getElementById('fill-demo-creds');
        if (demoCredsBtn) {
            demoCredsBtn.addEventListener('click', () => {
                document.getElementById('login-username').value = 'admin';
                document.getElementById('login-password').value = 'admin123';
                this.showToast('Demo Credentials Filled', 'Click "Sign In" or press Enter', 'info');
            });
        }

        // Navigation clicks
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.getAttribute('data-view');
                if (view) {
                    this.navigateTo(view);
                    window.location.hash = view;
                }
            });
        });

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Presentation mode triggers
        const presBtn = document.getElementById('btn-presentation-mode');
        if (presBtn) {
            presBtn.addEventListener('click', () => this.togglePresentationMode());
        }

        const exitPresBtn = document.getElementById('btn-exit-presentation');
        if (exitPresBtn) {
            exitPresBtn.addEventListener('click', () => this.togglePresentationMode(false));
        }

        // Mobile sidebar toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');
        if (mobileMenuBtn && sidebar) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
            });
        }
    }
}

// Global App Singleton
window.app = new SmartGateApp();
