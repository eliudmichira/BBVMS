import { AuthService } from './services/AuthService.js';
// ethers is loaded from CDN in the HTML file

class LoginManager {
    constructor() {
        this.authService = new AuthService('http://localhost:8000');
        this.loginAttempts = 0;
        this.lastAttemptTime = 0;
        this.cooldownPeriod = 5 * 60 * 1000; // 5 minutes
        this.maxAttempts = 3;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // ... existing event listener setup code ...

        // Add password strength checker
        document.getElementById('password').addEventListener('input', (e) => {
            this.updatePasswordStrength(e.target.value);
        });

        // Add password visibility toggle
        document.getElementById('togglePassword').addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            const icon = document.querySelector('#togglePassword i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    updatePasswordStrength(password) {
        const strength = this.calculatePasswordStrength(password);
        const strengthBar = document.getElementById('strengthBar');
        const strengthText = document.getElementById('strengthText');
        
        document.getElementById('passwordStrength').classList.remove('hidden');
        
        strengthBar.style.width = `${strength.score * 25}%`;
        strengthBar.className = `h-full transition-all duration-300 ${this.getStrengthColor(strength.score)}`;
        strengthText.textContent = this.getStrengthText(strength.score);
        
        // Enable/disable login button based on password strength
        document.getElementById('loginButton').disabled = strength.score < 2;
    }

    // ... rest of the implementation
}

// Initialize the login manager
const loginManager = new LoginManager();

document.addEventListener("DOMContentLoaded", () => {
    // API Configuration
    let API_URL = '/proxy'; // Default to proxy mode
    
    // DOM Elements
    const connectMetamaskBtn = document.getElementById("connectMetamask");
    const loginForm = document.getElementById("loginForm");
    const voterIdInput = document.getElementById("voterId");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("loginButton");
    const registerButton = document.getElementById("registerButton");
    const feedbackContainer = document.getElementById("feedbackContainer");
    const feedback = document.getElementById("feedback");
    const testConnectionBtn = document.getElementById("testConnectionBtn");
    const connectionStatus = document.getElementById("connectionStatus");
    const apiConnectionType = document.getElementById("apiConnectionType");
    
    // Debug Panel Elements
    const debugPanel = document.getElementById("debugPanel");
    const debugContent = document.getElementById("debugContent");
    const closeDebugPanel = document.getElementById("closeDebugPanel");
    
    // Web3 Variables
    let provider;
    let signer;
    
    // Check if already logged in
    if (localStorage.getItem('token') && localStorage.getItem('voterId')) {
        const role = localStorage.getItem("role");
        window.location.href = role === "admin" ? "admin.html" : "index.html";
        return;
    }

    // Debug Logger
    function debugLog(message, data = null) {
        if (!debugPanel || !debugContent) return;
        
        const timestamp = new Date().toLocaleTimeString();
        let content = `<div class="mb-1"><span class="text-gray-400">${timestamp}</span> ${message}</div>`;
        
        if (data) {
            if (typeof data === 'object') {
                content += `<pre class="text-green-400 text-xs mt-1 mb-2 overflow-x-auto">${JSON.stringify(data, null, 2)}</pre>`;
            } else {
                content += `<pre class="text-green-400 text-xs mt-1 mb-2">${data}</pre>`;
            }
        }
        
        debugContent.innerHTML = content + debugContent.innerHTML;
        console.log(message, data);
    }
    
    // Set API URL based on dropdown selection
    apiConnectionType?.addEventListener("change", () => {
        API_URL = apiConnectionType.value === "direct" ? 'http://localhost:8000' : '/proxy';
        debugLog(`API URL changed to: ${API_URL}`);
        testConnection();
    });
    
    // Helper Functions
    function showFeedback(message, isError = false) {
        if (!feedbackContainer || !feedback) return;
        
        feedbackContainer.classList.remove("hidden", "bg-green-800", "bg-red-800");
        feedbackContainer.classList.add(isError ? "bg-red-800" : "bg-green-800");
        feedback.textContent = message;
        feedback.className = "text-white";
        
        debugLog(isError ? `Error: ${message}` : `Success: ${message}`);
    }

    function setLoading(element, isLoading, originalText) {
        if (!element) return;
        
        if (isLoading) {
            element.disabled = true;
            element.innerHTML = '';
            const loader = document.createElement('span');
            loader.className = 'loader';
            element.appendChild(loader);
            const span = document.createElement('span');
            span.textContent = 'Processing...';
            element.appendChild(span);
        } else {
            element.disabled = false;
            element.innerHTML = originalText;
        }
    }
    
    // Web3 Connection
    async function initWeb3() {
        debugLog("Initializing Web3");
        if (window.ethereum) {
            try {
                // Request account access
                await window.ethereum.request({ method: "eth_requestAccounts" });
                
                // Initialize provider and signer
                provider = new ethers.BrowserProvider(window.ethereum);
                signer = await provider.getSigner();
                debugLog("Web3 initialized successfully");
                return true;
            } catch (error) {
                debugLog("MetaMask connection error", error);
                throw new Error(error.message || "Failed to connect to MetaMask");
            }
        } else {
            debugLog("MetaMask not installed");
            throw new Error("MetaMask not installed. Please install MetaMask to use this application.");
        }
    }
    
    // API Request Function with token refresh and improved error handling
    async function makeRequest(url, method = 'GET', body = null, headers = {}, retries = 2, retryCount = 0) {
        // If we have an auth token, include it in the request (except for login/register endpoints)
        const token = localStorage.getItem('token');
        if (token && !url.endsWith('/login') && !url.endsWith('/register')) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            mode: 'cors',
            credentials: 'same-origin'
        };
        
        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(body);
        }
        
        debugLog(`Making ${method} request to: ${url}`, options);
        
        try {
            let response;
            try {
                response = await fetch(url, options);
            } catch (networkError) {
                debugLog(`Network error: ${networkError.message}`, networkError);
                throw new Error("Network error. Please check your connection and try again.");
            }
            
            // Debug response headers
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            debugLog(`Response headers:`, responseHeaders);
            
            // Handle unauthorized responses directly
            if (response.status === 401 && token && retryCount < 1) {
                debugLog("Received 401 Unauthorized, attempting token refresh");
                
                // Only attempt token refresh if we have a refresh token
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    debugLog("No refresh token available, cannot refresh");
                    throw new Error("Session expired. Please login again.");
                }
                
                try {
                    // Attempt to refresh the token
                    const refreshResponse = await fetch(`${API_URL}/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refresh_token: refreshToken }),
                        mode: 'cors',
                        credentials: 'same-origin'
                    });
                    
                    if (!refreshResponse.ok) {
                        debugLog("Token refresh failed", await refreshResponse.text());
                        throw new Error("Session expired. Please login again.");
                    }
                    
                    const refreshData = await refreshResponse.json();
                    
                    if (!refreshData.token) {
                        debugLog("Refresh response missing token", refreshData);
                        throw new Error("Authentication failed. Please login again.");
                    }
                    
                    // Store new tokens
                    localStorage.setItem('token', refreshData.token);
                    if (refreshData.refresh_token) {
                        localStorage.setItem('refreshToken', refreshData.refresh_token);
                    }
                    
                    debugLog("Token refresh successful, retrying original request");
                    
                    // Retry the original request with new token
                    return makeRequest(url, method, body, headers, retries, retryCount + 1);
                } catch (refreshError) {
                    debugLog("Token refresh error", refreshError);
                    
                    // Clear authentication data on refresh failure
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    
                    throw new Error("Session expired. Please login again.");
                }
            }
            
            // Get the response as text first
            const responseText = await response.text();
            debugLog(`Raw response: ${responseText.substring(0, 500)}`);
            
            // Try to parse as JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                debugLog(`JSON parse error:`, parseError);
                // If not valid JSON, keep as text
                if (responseText.includes('<!DOCTYPE html>')) {
                    throw new Error("Received HTML instead of JSON. API server may be misconfigured.");
                }
                data = { message: responseText || "Unknown server error" };
            }
            
            if (!response.ok) {
                throw new Error(data.detail || data.message || `Request failed with status ${response.status}`);
            }
            
            debugLog(`Request successful: ${response.status}`, data);
            return data;
        } catch (error) {
            debugLog(`Request failed: ${error.message}`, error);
            
            // Retry logic for network errors
            if (retries > 0 && (error.message.includes('fetch') || error.message.includes('network'))) {
                debugLog(`Retrying request... (${retries} attempts left)`);
                return makeRequest(url, method, body, headers, retries - 1, retryCount);
            }
            
            throw error;
        }
    }
    
    // Test API Connection
    async function testConnection() {
        try {
            connectionStatus.textContent = "Testing connection...";
            connectionStatus.className = "mt-2 text-sm text-center text-yellow-400";
            
            // Try both connection methods
            let success = false;
            
            // Try proxy first
            try {
                const proxyUrl = '/proxy/api-test';
                debugLog(`Testing proxy connection with ${proxyUrl}`);
                const proxyResponse = await fetch(proxyUrl);
                
                // Get response text for debugging
                const responseText = await proxyResponse.text();
                debugLog(`Proxy response: ${responseText.substring(0, 100)}`);
                
                if (proxyResponse.ok) {
                    connectionStatus.textContent = "Proxy connection successful!";
                    connectionStatus.className = "mt-2 text-sm text-center text-green-400";
                    API_URL = '/proxy';
                    success = true;
                    debugLog("Proxy connection successful");
                }
            } catch (proxyError) {
                debugLog("Proxy connection failed", proxyError);
            }
            
            // Try direct if proxy failed
            if (!success) {
                try {
                    const directUrl = 'http://localhost:8000/api-test';
                    debugLog(`Testing direct connection with ${directUrl}`);
                    const directResponse = await fetch(directUrl, { mode: 'cors' });
                    
                    // Get response text for debugging
                    const responseText = await directResponse.text();
                    debugLog(`Direct response: ${responseText.substring(0, 100)}`);
                    
                    if (directResponse.ok) {
                        connectionStatus.textContent = "Direct connection successful!";
                        connectionStatus.className = "mt-2 text-sm text-center text-green-400";
                        API_URL = 'http://localhost:8000';
                        success = true;
                        debugLog("Direct connection successful");
                    }
                } catch (directError) {
                    debugLog("Direct connection failed", directError);
                }
            }
            
            // If both methods failed
            if (!success) {
                connectionStatus.textContent = "Could not connect to API server.";
                connectionStatus.className = "mt-2 text-sm text-center text-red-400";
                debugLog("All connection methods failed");
            }
            
            return success;
        } catch (error) {
            connectionStatus.textContent = `Connection failed: ${error.message}`;
            connectionStatus.className = "mt-2 text-sm text-center text-red-400";
            debugLog("Connection test error", error);
            return false;
        }
    }
    
    // Enhanced login function with proper token storage and error handling
    async function login(voterId, password) {
        debugLog(`Attempting to login for voter: ${voterId}`);
        
        try {
            const loginUrl = `${API_URL}/login`;
            const data = await makeRequest(loginUrl, 'POST', { voter_id: voterId, password });
            
            // Validate the response contains required authentication tokens
            if (!data.token) {
                debugLog("Server response missing token", data);
                throw new Error("Authentication failed: Invalid server response");
            }
            
            // Clear any existing authentication data first
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('voterId');
            localStorage.removeItem('role');
            
            // Store authentication data
            localStorage.setItem('token', data.token);
            
            // Always store refresh token if provided, even if it's empty
            // This helps in determining if token refresh is possible
            if ('refresh_token' in data) {
                localStorage.setItem('refreshToken', data.refresh_token || '');
                debugLog("Refresh token stored", { hasRefreshToken: !!data.refresh_token });
            } else {
                debugLog("No refresh token in response");
            }
            
            // Store token expiration if provided
            if (data.expires_in) {
                const expiresAt = Date.now() + (data.expires_in * 1000);
                localStorage.setItem('tokenExpiresAt', expiresAt.toString());
                debugLog("Token expiration stored", { expiresAt: new Date(expiresAt).toISOString() });
            }
            
            debugLog("Login successful", data);
            return data;
        } catch (error) {
            debugLog("Login failed", error);
            
            // Enhanced error handling with more specific messages
            if (error.message.includes("Invalid credentials") || error.message.includes("incorrect")) {
                throw new Error("Invalid username or password. Please try again.");
            } else if (error.message.includes("password_hash") || error.message.includes("database")) {
                throw new Error("Database error. Please contact support.");
            } else if (error.message.includes("rate limit") || error.message.includes("too many")) {
                throw new Error("Too many login attempts. Please try again later.");
            } else if (error.message.includes("account locked") || error.message.includes("suspended")) {
                throw new Error("Your account has been locked. Please contact an administrator.");
            } else if (error.message.includes("Network") || error.message.includes("connection")) {
                throw new Error("Network error. Please check your connection and try again.");
            } else {
                throw new Error(`Login failed: ${error.message}`);
            }
        }
    }
    
    // Register Function
    async function register(voterId, password, role = 'voter') {
        debugLog(`Attempting to register voter: ${voterId}, role: ${role}`);
        
        try {
            const registerUrl = `${API_URL}/register`;
            const data = await makeRequest(registerUrl, 'POST', { voter_id: voterId, password, role });
            
            debugLog("Registration successful", data);
            return data;
        } catch (error) {
            debugLog("Registration failed", error);
            throw error;
        }
    }
    
    // Event Handlers
    connectMetamaskBtn?.addEventListener("click", async () => {
        const originalButtonText = connectMetamaskBtn.innerHTML;
        setLoading(connectMetamaskBtn, true, originalButtonText);
        
        feedbackContainer?.classList.add("hidden");
        
        try {
            await initWeb3();
            const address = await signer.getAddress();
            if (voterIdInput) voterIdInput.value = address;
            connectMetamaskBtn.classList.add("hidden");
            loginForm?.classList.remove("hidden");
        } catch (error) {
            showFeedback("MetaMask connection failed: " + error.message, true);
        } finally {
            setLoading(connectMetamaskBtn, false, originalButtonText);
        }
    });
    
    loginForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const voterId = voterIdInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!voterId || !password) {
            showFeedback("Please fill in all fields", true);
            return;
        }
        
        const originalButtonText = loginButton.innerHTML;
        setLoading(loginButton, true, originalButtonText);
        
        feedbackContainer?.classList.add("hidden");
        
        try {
            const result = await login(voterId, password);
            localStorage.setItem("role", result.role);
            localStorage.setItem("voterId", voterId);
            showFeedback("Login successful! Redirecting...");
            setTimeout(() => {
                window.location.href = result.role === "admin" ? "admin.html" : "index.html";
            }, 1500);
        } catch (error) {
            showFeedback(error.message, true);
            setLoading(loginButton, false, originalButtonText);
        }
    });
    
    registerButton?.addEventListener("click", async () => {
        const voterId = voterIdInput?.value.trim();
        const password = passwordInput?.value.trim();
        
        if (!voterId || !password) {
            showFeedback("Please connect MetaMask and enter a password", true);
            return;
        }
        
        if (password.length < 6) {
            showFeedback("Password must be at least 6 characters", true);
            return;
        }
        
        const originalButtonText = registerButton.innerHTML;
        setLoading(registerButton, true, originalButtonText);
        
        feedbackContainer?.classList.add("hidden");
        
        try {
            await register(voterId, password);
            showFeedback("Registration successful! You can now login");
            setLoading(registerButton, false, originalButtonText);
        } catch (error) {
            showFeedback("Registration failed: " + error.message, true);
            setLoading(registerButton, false, originalButtonText);
        }
    });
    
    // Test Connection Button
    testConnectionBtn?.addEventListener("click", testConnection);
    
    // Debug Panel Toggle
    document.addEventListener("keydown", (e) => {
        if (e.altKey && e.key === 'd') {
            debugPanel?.classList.toggle("hidden");
        }
    });
    
    closeDebugPanel?.addEventListener("click", () => {
        debugPanel?.classList.add("hidden");
    });
    
    // Initial setup
    debugLog("Page loaded, testing API connection...");
    testConnection();
});
