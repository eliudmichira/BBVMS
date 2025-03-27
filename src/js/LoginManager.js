export class LoginManager {
    constructor(authService, walletService) {
        this.authService = authService;
        this.walletService = walletService;
        this.loginAttempts = 0;
        this.maxAttempts = 3;
        this.cooldownTimer = null;
    }

    async initialize() {
        this.setupEventListeners();
        await this.initializeCsrfToken();
        this.setupDebugPanel();
    }

    async initializeCsrfToken() {
        try {
            const response = await fetch('/api/csrf-token');
            const data = await response.json();
            document.getElementById('csrfToken').value = data.token;
        } catch (error) {
            console.error('Failed to fetch CSRF token:', error);
            this.showFeedback('login', {
                message: 'Failed to initialize security token',
                status: 'error'
            });
        }
    }

    setupEventListeners() {
        // MetaMask connection
        document.getElementById('connectMetamask')?.addEventListener('click', 
            () => this.handleMetaMaskConnection());

        // Password validation
        document.getElementById('password')?.addEventListener('input', 
            (e) => this.handlePasswordInput(e));

        // Form submission
        document.getElementById('loginForm')?.addEventListener('submit', 
            (e) => this.handleLoginSubmit(e));

        // Password visibility toggle
        document.getElementById('togglePassword')?.addEventListener('click', 
            () => this.togglePasswordVisibility());
    }

    async handleMetaMaskConnection() {
        try {
            this.showLoading('connectMetamask', true);
            const address = await this.walletService.connect();
            
            document.getElementById('voterId').value = address;
            document.getElementById('connectMetamask').classList.add('hidden');
            document.getElementById('loginForm').classList.remove('hidden');
            
            this.showFeedback('login', {
                message: 'Wallet connected successfully',
                status: 'success'
            });
        } catch (error) {
            this.showFeedback('login', {
                message: `Failed to connect wallet: ${error.message}`,
                status: 'error'
            });
        } finally {
            this.showLoading('connectMetamask', false);
        }
    }

    handlePasswordInput(event) {
        const password = event.target.value;
        const strength = this.calculatePasswordStrength(password);
        
        this.updatePasswordStrength(strength);
        this.updateRequirements(password);
        this.updateLoginButton(strength.score >= 2);
    }

    calculatePasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };

        score = Object.values(checks).filter(Boolean).length;

        return {
            score,
            checks
        };
    }

    showFeedback(type, { message, status = 'info', title = '', duration = 5000 }) {
        const container = document.getElementById(`${type}Feedback`);
        if (!container) return;

        const statusStyles = {
            success: {
                bgColor: 'bg-green-600',
                icon: 'fa-check-circle',
                borderColor: 'border-green-500'
            },
            error: {
                bgColor: 'bg-red-600',
                icon: 'fa-exclamation-circle',
                borderColor: 'border-red-500'
            },
            warning: {
                bgColor: 'bg-yellow-600',
                icon: 'fa-exclamation-triangle',
                borderColor: 'border-yellow-500'
            },
            info: {
                bgColor: 'bg-blue-600',
                icon: 'fa-info-circle',
                borderColor: 'border-blue-500'
            }
        };

        const styles = statusStyles[status] || statusStyles.info;

        // Update feedback UI
        container.className = `mt-3 p-3 rounded-md border text-sm slide-up ${styles.bgColor} ${styles.borderColor} bg-opacity-10`;
        container.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${styles.icon} mr-2"></i>
                <span>${message}</span>
            </div>
        `;

        container.classList.remove('hidden');

        if (duration > 0) {
            setTimeout(() => {
                container.classList.add('slide-down');
                setTimeout(() => {
                    container.classList.add('hidden');
                    container.classList.remove('slide-down');
                }, 300);
            }, duration);
        }

        // Log to debug panel
        this.debugLog(`${status.toUpperCase()}: ${message}`);
    }

    // ... rest of the implementation
}