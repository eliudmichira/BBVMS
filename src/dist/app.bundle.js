(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
document.addEventListener("DOMContentLoaded", async () => {
    // Debug logging function
    function debugLog(message, data = null) {
        const timestamp = new Date().toISOString();
        if (data) {
            console.log(`[${timestamp}] ${message}`, data);
        } else {
            console.log(`[${timestamp}] ${message}`);
        }
    }
    
    // State variables
    let provider;
    let signer;
    let votingContract;
    let API_URL = 'http://localhost:8000'; // Default to direct connection
    
    // Using the most recently deployed contract address from Truffle logs
    const CONTRACT_ADDRESS = "0xb5121e15fb32F8c1003eb7fA9249b63c5CDa536d"; // Deployed contract address

    // Authentication data - accept either nationalId or voterId for backward compatibility
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const voterId = localStorage.getItem("voterId") || localStorage.getItem("nationalId");
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    
    // Check redirect count to avoid loops
    const redirectCount = parseInt(sessionStorage.getItem('redirectCounter') || '0');
    sessionStorage.setItem('redirectCounter', redirectCount + 1);
    
    // If not authenticated and haven't exceeded redirect limit, redirect to login
    if ((!token || !voterId || !isAuthenticated) && redirectCount < 1) {
        debugLog("Not authenticated, redirecting to login");
        window.location.href = "login.html?redirect_reason=not_authenticated&time=" + Date.now();
        return;
    } 
    // If redirect limit exceeded, show message but don't redirect
    else if ((!token || !voterId || !isAuthenticated) && redirectCount >= 1) {
        debugLog("Breaking redirect loop - showing message");
        
        // Show message to user
        const container = document.querySelector('.container') || document.body;
        container.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md mx-auto my-8">
                <h2 class="text-xl font-bold mb-4 text-red-600">Authentication Error</h2>
                <p class="mb-4">Unable to authenticate. Please try one of these options:</p>
                
                <div class="space-y-4">
                    <button id="clearStorageBtn" class="w-full bg-red-500 hover:bg-red-600 text-white p-2 rounded">
                        Clear Browser Storage & Reload
                    </button>
                    
                    <a href="login.html" class="block text-center bg-blue-500 hover:bg-blue-600 text-white p-2 rounded">
                        Go to Login Page
                    </a>
                </div>
            </div>
        `;
        
        // Add event listener to the emergency button
        document.getElementById('clearStorageBtn').addEventListener('click', function() {
            localStorage.clear();
            sessionStorage.clear();
            alert('Storage cleared. Page will now reload.');
            window.location.reload();
        });
        
        return;
    }
    
    // We're authenticated - reset redirect counter
    sessionStorage.removeItem('redirectCounter');
    
    // Helper for network requests with improved token handling
    const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

    async function makeApiRequest(url, options = {}) {
        try {
            const response = await fetch(url, options);
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Received non-JSON response');
            }
            return await response.json();
        } catch (error) {
            debugLog('Direct API request failed:', error);
            const path = new URL(url).pathname;
            const proxyUrl = `http://localhost:8080/proxy${path}`;
            try {
                const proxyResponse = await fetch(proxyUrl, options);
                return await proxyResponse.json();
            } catch (proxyError) {
                debugLog('Proxy API request failed:', proxyError);
                throw new Error('All API connections failed');
            }
        }
    }
    
    // Enhanced token refresh logic with improved error handling
    async function refreshToken() {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
            console.error("No refresh token available");
            return false;
        }
        
        console.log("Attempting to refresh access token");
        
        try {
            // Use a different instance of fetch to avoid recursive calls to makeApiRequest
            const response = await fetch(`${API_URL}/refresh`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    // Include the current tokens in case the server needs them for validation
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ refresh_token: refreshToken }),
                mode: 'cors',
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Token refresh failed with status ${response.status}:`, errorText);
                return false;
            }
            
            let data;
            try {
                data = await response.json();
            } catch (e) {
                console.error("Failed to parse refresh token response:", e);
                return false;
            }
            
            if (!data.token) {
                console.error("Refresh response did not contain a new token");
                return false;
            }
            
            console.log("Token refreshed successfully");
            
            // Store the new tokens
            localStorage.setItem('token', data.token);
            
            // If a new refresh token is provided, update it as well
            if (data.refresh_token) {
                localStorage.setItem('refreshToken', data.refresh_token);
            }
            
            return true;
        } catch (error) {
            console.error("Token refresh request failed:", error);
            return false;
        }
    }
    
    // Enhanced logout function with proper cleanup and error handling
    async function logout(skipApiCall = false) {
        debugLog("Initiating logout process");
        
        try {
            // Get tokens before clearing them
            const currentToken = localStorage.getItem("token");
            
            // Clear all auth data first to prevent further authenticated requests
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("voterId");
            localStorage.removeItem("nationalId");
            localStorage.removeItem("role");
            localStorage.removeItem("isAuthenticated");
            sessionStorage.clear();
            
            // Clear authentication cookies
            document.cookie.split(";").forEach(cookie => {
                const [name] = cookie.trim().split("=");
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            });
            
            // Only make API logout call if we have a token and skipApiCall is false
            if (currentToken && !skipApiCall) {
                try {
                    await fetch(`${API_URL}/logout`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentToken}`
                        },
                        mode: 'cors',
                        credentials: 'same-origin'
                    });
                    debugLog("API logout successful");
                } catch (error) {
                    debugLog("API logout error:", error);
                    // Continue with client-side logout regardless of API error
                }
            }
            
            // Disconnect from blockchain if connected
            if (provider) {
                try {
                    provider = null;
                    signer = null;
                    votingContract = null;
                    debugLog("Blockchain connection cleared");
                } catch (error) {
                    debugLog("Error clearing blockchain connection:", error);
                }
            }
            
            // Delay redirect slightly to allow for cleanup
            setTimeout(() => {
                debugLog("Redirecting to login page");
                window.location.href = "login.html?redirect_reason=signout&time=" + Date.now();
            }, 100);
            
        } catch (error) {
            debugLog("Logout error:", error);
            // Force redirect on error to ensure user is logged out
            window.location.href = "login.html?redirect_reason=error&time=" + Date.now();
        }
    }

    // Initialize Ethers.js
    async function initEthers() {
        if (!window.ethereum) {
            showFeedback("MetaMask not installed. Please install MetaMask to use this application.", true);
            return false;
        }
        
        try {
            const storedWalletAddress = localStorage.getItem('walletAddress');
            
            // Always get a fresh provider instance
            provider = new ethers.BrowserProvider(window.ethereum);
            
            // Request accounts from MetaMask
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            
            if (!accounts || accounts.length === 0) {
                throw new Error("No accounts found in MetaMask. Please unlock your wallet.");
            }
            
            // Get the current account
            const currentAddress = accounts[0];
            console.log("Connected to MetaMask with address:", currentAddress);
            
            // Store the account address
            localStorage.setItem('walletAddress', currentAddress);
            localStorage.setItem('walletConnectionTime', Date.now());
            
            // Get a signer for transactions
            signer = await provider.getSigner();
            
            // Update wallet display immediately
            initWalletDisplay();
            
            return true;
        } catch (error) {
            console.error("MetaMask connection error:", error);
            showFeedback("MetaMask connection failed: " + error.message, true);
            return false;
        }
    }

    // Add contract state tracking
    let contractState = {
        initialized: false,
        error: null,
        initializationAttempts: 0,
        maxAttempts: 3
    };

    // Enhanced contract initialization with retries
    async function initContract() {
        try {
            contractState.initializationAttempts++;
            console.log(`Attempting to initialize contract (Attempt ${contractState.initializationAttempts}/${contractState.maxAttempts})`);

            if (!signer) {
                throw new Error("Signer not initialized. Please connect your wallet first.");
            }

            const response = await fetch("/build/contracts/Voting.json");
            if (!response.ok) {
                throw new Error(`Failed to load contract ABI: ${response.statusText}`);
            }
            
            const artifact = await response.json();
            votingContract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
            
            // Verify contract connection using the signer's address instead of voterId
            // This avoids ENS resolution which isn't supported on local networks
            const signerAddress = await signer.getAddress();
            await votingContract.hasVoted(signerAddress);
            
            contractState.initialized = true;
            console.log("Contract initialized successfully");
            return votingContract;
        } catch (error) {
            console.error("Contract initialization error:", error);
            contractState.error = error;

            if (contractState.initializationAttempts < contractState.maxAttempts) {
                console.log("Retrying contract initialization...");
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
                return initContract();
            }

            showFeedback("Failed to initialize voting contract: " + error.message, true);
            throw error;
        }
    }

    // Contract state checker
    function ensureContract() {
        if (!votingContract || !contractState.initialized) {
            throw new Error("Voting contract not properly initialized. Please refresh the page and try again.");
        }
    }

    // Safe contract call with fallback and error handling
    async function safeContractCall(contractFn, fallbackValue = null, errorMessage = "Contract operation failed") {
        try {
            return await contractFn();
        } catch (error) {
            console.error(errorMessage, error);
            
            // Check for specific error types for better user messages
            if (error.message.includes("AlreadyVoted")) {
                throw new Error("You have already voted");
            } else if (error.message.includes("VotingNotActive")) {
                throw new Error("Voting is not currently active");
            } else if (error.message.includes("InvalidCandidate")) {
                throw new Error("Invalid candidate selection");
            } else if (error.message.includes("user denied")) {
                throw new Error("Transaction rejected. Please confirm in MetaMask.");
            }
            
            if (fallbackValue !== null) {
                return fallbackValue;
            }
            throw new Error(errorMessage + ": " + error.message);
        }
    }

    // Show feedback to the user
    function showFeedback(message, isError = false, targetId = "feedback") {
        const feedback = document.getElementById(targetId);
        if (!feedback) return;
        
        const container = feedback.closest('[id$="FeedbackContainer"]') || feedback.parentElement;
        if (container) {
            container.classList.remove("hidden", "bg-green-800", "bg-red-800", "dark:bg-green-800", "dark:bg-red-800");
            container.classList.add(isError ? "bg-red-800" : "bg-green-800");
            if (document.documentElement.classList.contains("dark")) {
                container.classList.add(isError ? "dark:bg-red-800" : "dark:bg-green-800");
            }
        }
        
        feedback.textContent = message;
        feedback.className = "text-white";
        
        if (container && !isError) {
            setTimeout(() => {
                container.classList.add("hidden");
            }, 5000);
        }
    }

    // Set element loading state
    function setLoading(element, isLoading, loadingText = "Loading...", originalText = null) {
        if (!element) return;
        
        if (isLoading) {
            element._originalText = element.innerHTML;
            element.disabled = true;
            element.innerHTML = `<span class="loader"></span><span>${loadingText}</span>`;
        } else {
            element.disabled = false;
            element.innerHTML = originalText || element._originalText || "Ready";
        }
    }
    
    // Enhanced API connection testing with fallback handling
    async function testApiConnection() {
        // Store original console methods
        const originalConsole = { ...console };
        let apiStatus = {
            direct: false,
            proxy: false,
            error: null
        };

        try {
            // Try direct connection first
            try {
                const response = await fetch('http://localhost:8000/api-test', {
                    method: 'GET',
                    mode: 'cors',
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 5000 // 5 second timeout
                });
                
                if (response.ok) {
                    console.log("Direct API connection successful");
                    API_URL = 'http://localhost:8000';
                    apiStatus.direct = true;
                    return true;
                }
            } catch (error) {
                console.warn("Direct API connection failed:", error.message);
                apiStatus.error = error;
            }

            // Try proxy connection
            try {
                const response = await fetch('/proxy/api-test', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 5000
                });
                
                if (response.ok) {
                    console.log("Proxy API connection successful");
                    API_URL = '/proxy';
                    apiStatus.proxy = true;
                    return true;
                }
            } catch (error) {
                console.warn("Proxy API connection failed:", error.message);
                apiStatus.error = error;
            }

            // If both attempts fail, set up fallback mode
            if (!apiStatus.direct && !apiStatus.proxy) {
                console.warn("All API connections failed, entering fallback mode");
                API_URL = '';
                
                // Set up mock data handlers
                window.useMockData = true;
                setupMockDataHandlers();
                
                // Show fallback mode notice to user
                showFeedback(
                    "Running in offline mode. Some features may be limited.", 
                    true, 
                    "apiStatus"
                );
                
                return false;
            }

        } catch (error) {
            console.error("Fatal API connection error:", error);
            apiStatus.error = error;
            return false;
        } finally {
            // Log final API status
            console.log("API Connection Status:", {
                direct: apiStatus.direct,
                proxy: apiStatus.proxy,
                fallback: (!apiStatus.direct && !apiStatus.proxy),
                error: apiStatus.error?.message
            });
        }
    }

    // Mock data handlers for fallback mode
    function setupMockDataHandlers() {
        window.mockData = {
            candidates: [
                { id: 1, name: "William Ruto", party: "UDA", voteCount: 345 },
                { id: 2, name: "Raila Odinga", party: "ODM", voteCount: 287 },
                { id: 3, name: "Martha Karua", party: "NARC-Kenya", voteCount: 156 },
                { id: 4, name: "Rigathi Gachagua", party: "UDA", voteCount: 98 }
            ],
            votes: new Map(),
            votingDates: {
                start_date: Math.floor(Date.now() / 1000) - (2 * 24 * 60 * 60), // 2 days ago
                end_date: Math.floor(Date.now() / 1000) + (5 * 24 * 60 * 60) // 5 days from now
            }
        };

        console.log("Mock data initialized:", window.mockData);
    }
    
    // Initialize wallet address display
    function initWalletDisplay() {
        const walletAddressElement = document.getElementById("walletAddress");
        const walletAddress = localStorage.getItem("walletAddress");
        
        if (walletAddressElement && walletAddress) {
            // Check if address has 0x prefix, add it if missing
            const formattedAddress = walletAddress.startsWith('0x') 
                ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
                : `0x${walletAddress.substring(0, 4)}...${walletAddress.substring(walletAddress.length - 4)}`;
            
            walletAddressElement.textContent = formattedAddress;
            walletAddressElement.title = walletAddress; // Full address in tooltip
            walletAddressElement.classList.remove("hidden");
            
            // Add data attribute for full address for easier access by other scripts
            walletAddressElement.setAttribute('data-full-address', walletAddress);
        } else if (walletAddressElement && voterId) {
            // Fallback to voterId if no wallet address is found, ensure proper formatting
            if (voterId.length > 10) {
                const formattedVoterId = `${voterId.substring(0, 6)}...${voterId.substring(voterId.length - 4)}`;
                walletAddressElement.textContent = formattedVoterId;
            } else {
                walletAddressElement.textContent = voterId;
            }
            walletAddressElement.title = voterId;
            walletAddressElement.classList.remove("hidden");
        }
    }

    // Initialize application
    async function initApp() {
        await testApiConnection();
        
        if (await initEthers()) {
            await initContract();
            initWalletDisplay();
            
            // Add listeners for MetaMask events
            setupMetaMaskListeners();
            
            // Initialize page-specific functionality
            if (document.getElementById("candidateList")) {
                await initVoterPage();
            } else if (document.getElementById("content-candidates")) {
                await initAdminPage();
            }
        }
    }

    // Setup MetaMask event listeners
    function setupMetaMaskListeners() {
        if (window.ethereum) {
            // Handle account changes
            window.ethereum.on('accountsChanged', async (accounts) => {
                console.log('MetaMask account changed:', accounts);
                
                if (accounts.length === 0) {
                    // User has disconnected all accounts
                    console.log('User disconnected from MetaMask');
                    showFeedback("MetaMask wallet disconnected. Please reconnect.", true);
                } else {
                    // Update stored wallet address
                    const currentAddress = accounts[0];
                    localStorage.setItem('walletAddress', currentAddress);
                    localStorage.setItem('walletConnectionTime', Date.now());
                    
                    // Update display
                    initWalletDisplay();
                    
                    // Refresh contract connection with new account
                    try {
                        signer = await provider.getSigner();
                        await initContract();
                        showFeedback("Wallet changed to: " + currentAddress.substring(0, 6) + "...");
                    } catch (error) {
                        console.error("Error updating contract connection:", error);
                    }
                }
            });
            
            // Handle chain changes
            window.ethereum.on('chainChanged', (chainId) => {
                console.log('MetaMask network changed:', chainId);
                // Force page reload as recommended by MetaMask
                window.location.reload();
            });
        }
    }

    // ========= VOTER PAGE FUNCTIONS =========
    async function initVoterPage() {
        try {
            ensureContract();

            const voteButton = document.getElementById("voteButton");
            const candidateList = document.getElementById("candidateList");
            const logoutButton = document.getElementById("logoutButton");
            const statusAlert = document.getElementById("statusAlert");
            
            // Show loading state
            showFeedback("Loading voting information...", false);
            
            // Load voting information with proper error handling
            await Promise.all([
                loadVotingDates().catch(error => {
                    console.error("Error loading voting dates:", error);
                    showFeedback("Failed to load voting dates", true);
                }),
                loadCandidates().catch(error => {
                    console.error("Error loading candidates:", error);
                    showFeedback("Failed to load candidates", true);
                }),
                checkVoteStatus().catch(error => {
                    console.error("Error checking vote status:", error);
                    showFeedback("Failed to check vote status", true);
                })
            ]);
            
            // Event listeners with error boundaries
            voteButton?.addEventListener("click", async (e) => {
                try {
                    await castVote();
                } catch (error) {
                    console.error("Vote casting error:", error);
                    showFeedback("Failed to cast vote: " + error.message, true);
                }
            });

            logoutButton?.addEventListener("click", async (e) => {
                try {
                    await logout();
                } catch (error) {
                    console.error("Logout error:", error);
                    window.location.href = "login.html";
                }
            });

        } catch (error) {
            console.error("Voter page initialization error:", error);
            showFeedback("Failed to initialize voting page: " + error.message, true);
        }
    }
    
    async function loadVotingDates() {
        ensureContract();
        try {
            const data = await makeApiRequest('/voting/dates');
            
            const datesDisplay = document.getElementById("datesDisplay");
            const datesLoadingIndicator = document.getElementById("datesLoadingIndicator");
            
            if (datesDisplay) {
                const start = new Date(data.start_date * 1000).toLocaleString();
                const end = new Date(data.end_date * 1000).toLocaleString();
                datesDisplay.textContent = `${start} - ${end}`;
            }
            
            if (datesLoadingIndicator) {
                datesLoadingIndicator.classList.add("hidden");
            }
            
            // Update voting status
            const now = new Date();
            const startDate = new Date(data.start_date * 1000);
            const endDate = new Date(data.end_date * 1000);
            
            let status;
            if (now < startDate) {
                status = "not_started";
            } else if (now > endDate) {
                status = "ended";
            } else {
                status = "active";
            }
            
            updateStatusAlert(status);
        } catch (error) {
            console.error("Error loading voting dates:", error);
            const datesDisplay = document.getElementById("datesDisplay");
            const datesLoadingIndicator = document.getElementById("datesLoadingIndicator");
            
            if (datesDisplay) {
                datesDisplay.textContent = "Failed to load voting dates";
            }
            
            if (datesLoadingIndicator) {
                datesLoadingIndicator.classList.add("hidden");
            }
            
            showFeedback("Error loading voting dates: " + error.message, true);
        }
    }
    
    function updateStatusAlert(status) {
        const statusAlert = document.getElementById("statusAlert");
        const statusMessage = document.getElementById("statusMessage");
        const voteButton = document.getElementById("voteButton");
        
        if (!statusAlert || !statusMessage) return;
        
        // Set global status
        window.votingStatus = status;
        
        statusAlert.classList.remove(
            "hidden", "bg-yellow-200", "bg-green-200", "bg-red-200", 
            "dark:bg-yellow-800", "dark:bg-green-800", "dark:bg-red-800"
        );
        
        switch(status) {
            case "not_started":
                statusAlert.classList.add("bg-yellow-200", "dark:bg-yellow-800");
                statusMessage.textContent = "Voting has not started yet. Please check back later.";
                if (voteButton) voteButton.disabled = true;
                break;
            case "active":
                statusAlert.classList.add("bg-green-200", "dark:bg-green-800");
                statusMessage.textContent = "Voting is currently active. Select a candidate and cast your vote!";
                if (voteButton) voteButton.disabled = window.votingStatus !== "active";
                break;
            case "ended":
                statusAlert.classList.add("bg-red-200", "dark:bg-red-800");
                statusMessage.textContent = "Voting has ended. Results are displayed below.";
                if (voteButton) voteButton.disabled = true;
                break;
            default:
                statusAlert.classList.add("hidden");
                break;
        }
        
        statusAlert.classList.add("fade-in");
    }
    
    async function loadCandidates() {
        ensureContract();
        const candidateList = document.getElementById("candidateList");
        if (!candidateList) return;
        
        try {
            candidateList.innerHTML = `
                <tr>
                    <td colspan="4" class="p-3 text-center">
                        <div class="flex justify-center">
                            <span class="loader"></span>
                            <span class="ml-2">Loading candidates...</span>
                        </div>
                    </td>
                </tr>
            `;
            
            const candidates = await safeContractCall(
                () => votingContract.getAllCandidates(),
                [],
                "Failed to load candidates"
            );
            
            const hasVoted = await safeContractCall(
                () => votingContract.hasVoted(voterId),
                false,
                "Failed to check voting status"
            );
            
            candidateList.innerHTML = "";
            
            if (candidates.length === 0) {
                candidateList.innerHTML = `<tr><td colspan="4" class="p-3 text-center">No candidates available</td></tr>`;
                return;
            }
            
            candidates.forEach(candidate => {
                const tr = document.createElement("tr");
                tr.className = "border-b border-gray-400 dark:border-gray-600";
                tr.innerHTML = `
                    <td class="p-3 border border-gray-400 dark:border-gray-600">
                        <input type="radio" id="candidate-${candidate.id}" name="candidate" value="${candidate.id}" class="focus:ring-green-500" ${hasVoted ? 'disabled' : ''}>
                        <label for="candidate-${candidate.id}" class="sr-only">Select ${candidate.name}</label>
                    </td>
                    <td class="p-3 border border-gray-400 dark:border-gray-600">${candidate.name}</td>
                    <td class="p-3 border border-gray-400 dark:border-gray-600">${candidate.party}</td>
                    <td class="p-3 border border-gray-400 dark:border-gray-600">${candidate.voteCount.toString()}</td>
                `;
                candidateList.appendChild(tr);
            });
            
            // Disable vote button if already voted
            if (hasVoted) {
                const voteButton = document.getElementById("voteButton");
                if (voteButton) {
                    voteButton.disabled = true;
                    voteButton.textContent = "You have already voted";
                }
                showFeedback("You have already cast your vote in this election");
            }
            
            // Enable vote button when a candidate is selected
            const radios = candidateList.querySelectorAll("input[type='radio']");
            radios.forEach(radio => {
                radio.addEventListener("change", () => {
                    window.selectedCandidateId = radio.value;
                    const voteButton = document.getElementById("voteButton");
                    if (voteButton) {
                        voteButton.disabled = window.votingStatus !== "active";
                    }
                });
            });
        } catch (error) {
            console.error("Error loading candidates:", error);
            candidateList.innerHTML = `<tr><td colspan="4" class="p-3 text-center">Failed to load candidates: ${error.message}</td></tr>`;
            showFeedback("Error loading candidates: " + error.message, true);
        }
    }
    
    async function checkVoteStatus() {
        ensureContract();
        const voteButton = document.getElementById("voteButton");
        if (!voteButton) return;
        
        try {
            const hasVoted = await safeContractCall(
                () => votingContract.hasVoted(voterId),
                false,
                "Failed to check vote status"
            );
            
            if (hasVoted) {
                voteButton.disabled = true;
                voteButton.textContent = "You have already voted";
                showFeedback("You have already cast your vote");
            }
        } catch (error) {
            console.error("Error checking vote status:", error);
        }
    }
    
    async function castVote() {
        ensureContract();
        const voteButton = document.getElementById("voteButton");
        if (!voteButton) return;
        
        const candidateId = document.querySelector("input[name='candidate']:checked")?.value;
        if (!candidateId) {
            showFeedback("Please select a candidate", true);
            return;
        }
        
        const originalButtonText = voteButton.innerHTML;
        setLoading(voteButton, true, "Casting vote...");
        
        const feedbackContainer = document.getElementById("feedbackContainer");
        if (feedbackContainer) {
            feedbackContainer.classList.add("hidden");
        }
        
        try {
            // Check if already voted
            const hasVoted = await safeContractCall(
                () => votingContract.hasVoted(voterId),
                false,
                "Failed to check vote status"
            );
            
            if (hasVoted) {
                showFeedback("You have already voted");
                voteButton.disabled = true;
                voteButton.innerHTML = "Already Voted";
                return;
            }
            
            // Cast vote on chain
            const tx = await safeContractCall(
                () => votingContract.vote(candidateId),
                null,
                "Vote transaction failed"
            );
            
            await tx.wait();
            
            // Submit vote to backend
            try {
                await makeApiRequest('/vote', 'POST', { candidate_id: parseInt(candidateId) });
            } catch (apiError) {
                console.warn("API vote recording failed, but blockchain vote successful:", apiError);
                // Continue since the blockchain vote worked
            }
            
            showFeedback("Your vote has been successfully recorded!");
            voteButton.disabled = true;
            voteButton.innerHTML = "Vote Cast Successfully";
            
            // Refresh candidates
            setTimeout(() => {
                loadCandidates();
            }, 2000);
        } catch (error) {
            showFeedback("Vote failed: " + error.message, true);
            setLoading(voteButton, false, originalButtonText);
        }
    }

    // ========= ADMIN PAGE FUNCTIONS =========
    async function initAdminPage() {
        // Check if user is admin
        if (role !== 'admin') {
            window.location.href = "index.html";
            return;
        }
        
        // Elements
        const addCandidateForm = document.getElementById("addCandidateForm");
        const setDatesForm = document.getElementById("setDatesForm");
        const updateDatesButton = document.getElementById("updateDatesButton");
        const tabButtons = document.querySelectorAll(".tab-button");
        const refreshCandidatesButton = document.getElementById("refreshCandidatesButton");
        const logoutButton = document.getElementById("logoutButton");
        
        // Initialize tabs
        tabButtons.forEach(button => {
            button.addEventListener("click", () => {
                tabButtons.forEach(btn => btn.classList.remove("active", "border-green-500", "text-green-500"));
                document.querySelectorAll(".tab-content").forEach(content => {
                    content.classList.remove("active");
                });
                
                button.classList.add("active", "border-green-500", "text-green-500");
                
                const tabId = button.id.replace("tab-", "content-");
                document.getElementById(tabId)?.classList.add("active");
                
                // Load content for specific tabs
                if (tabId === "content-voting-dates") {
                    loadVotingDatesAdmin();
                } else if (tabId === "content-results") {
                    loadResults();
                }
            });
        });
        
        // Event listeners
        addCandidateForm?.addEventListener("submit", handleAddCandidate);
        setDatesForm?.addEventListener("submit", handleSetDates);
        updateDatesButton?.addEventListener("click", handleUpdateDates);
        refreshCandidatesButton?.addEventListener("click", loadCandidatesAdmin);
        logoutButton?.addEventListener("click", logout);
        
        // Initial loads
        await loadCandidatesAdmin();
        
        // Initialize active tab content
        const activeTab = document.querySelector(".tab-content.active");
        if (activeTab) {
            if (activeTab.id === "content-voting-dates") {
                loadVotingDatesAdmin();
            } else if (activeTab.id === "content-results") {
                loadResults();
            }
        }
    }
    
    async function loadCandidatesAdmin() {
        const candidateList = document.getElementById("candidateList");
        if (!candidateList) return;
        
        candidateList.innerHTML = `
            <tr>
                <td colspan="4" class="p-3 text-center">
                    <div class="flex justify-center">
                        <span class="loader"></span>
                        <span class="ml-2">Loading candidates...</span>
                    </div>
                </td>
            </tr>
        `;
        
        try {
            const candidates = await safeContractCall(
                () => votingContract.getAllCandidates(),
                [],
                "Failed to load candidates"
            );
            
            candidateList.innerHTML = "";
            
            if (candidates.length === 0) {
                candidateList.innerHTML = `<tr><td colspan="4" class="p-3 text-center">No candidates have been added yet</td></tr>`;
                return;
            }
            
            candidates.forEach(candidate => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td class="p-3 border border-gray-600">${candidate.id}</td>
                    <td class="p-3 border border-gray-600">${candidate.name}</td>
                    <td class="p-3 border border-gray-600">${candidate.party}</td>
                    <td class="p-3 border border-gray-600">${candidate.voteCount.toString()}</td>
                `;
                candidateList.appendChild(row);
            });
            
            // Update results if on results tab
            if (document.getElementById("content-results")?.classList.contains("active")) {
                loadResults();
            }
        } catch (error) {
            console.error("Error loading candidates:", error);
            candidateList.innerHTML = `<tr><td colspan="4" class="p-3 text-center">Failed to load candidates: ${error.message}</td></tr>`;
            showFeedback("Failed to load candidates: " + error.message, true, "candidateFeedback");
        }
    }
    
    async function loadVotingDatesAdmin() {
        const currentDatesDisplay = document.getElementById("currentDatesDisplay");
        const datesLoadingIndicator = document.getElementById("datesLoadingIndicator");
        const votingStatusBadge = document.getElementById("votingStatusBadge");
        
        if (!currentDatesDisplay || !datesLoadingIndicator) return;
        
        datesLoadingIndicator.classList.remove("hidden");
        
        try {
            const data = await makeApiRequest('/voting/dates');
            
            if (data.start_date && data.end_date) {
                const start = new Date(data.start_date * 1000).toLocaleString();
                const end = new Date(data.end_date * 1000).toLocaleString();
                currentDatesDisplay.textContent = `${start} - ${end}`;
                
                // Pre-fill the form for update
                const startDateInput = document.getElementById("startDate");
                const endDateInput = document.getElementById("endDate");
                
                const startDateFormatted = new Date(data.start_date * 1000).toISOString().slice(0, 16);
                const endDateFormatted = new Date(data.end_date * 1000).toISOString().slice(0, 16);
                
                if (startDateInput) startDateInput.value = startDateFormatted;
                if (endDateInput) endDateInput.value = endDateFormatted;
                
                // Update status badge
                if (votingStatusBadge) {
                    const now = new Date();
                    const startDate = new Date(data.start_date * 1000);
                    const endDate = new Date(data.end_date * 1000);
                    
                    votingStatusBadge.classList.remove(
                        "bg-yellow-600", "bg-green-600", "bg-red-600", "hidden"
                    );
                    
                    if (now < startDate) {
                        votingStatusBadge.classList.add("bg-yellow-600");
                        votingStatusBadge.textContent = "Not Started";
                    } else if (now > endDate) {
                        votingStatusBadge.classList.add("bg-red-600");
                        votingStatusBadge.textContent = "Ended";
                    } else {
                        votingStatusBadge.classList.add("bg-green-600");
                        votingStatusBadge.textContent = "Active";
                    }
                }
            } else {
                currentDatesDisplay.textContent = "No voting dates have been set";
                if (votingStatusBadge) {
                    votingStatusBadge.classList.add("hidden");
                }
            }
            
            datesLoadingIndicator.classList.add("hidden");
        } catch (error) {
            console.error("Error loading voting dates:", error);
            currentDatesDisplay.textContent = "Failed to load voting dates";
            datesLoadingIndicator.classList.add("hidden");
            if (votingStatusBadge) {
                votingStatusBadge.classList.add("hidden");
            }
            showFeedback("Error loading voting dates: " + error.message, true, "datesFeedback");
        }
    }
    
    async function handleAddCandidate(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById("name");
        const partyInput = document.getElementById("party");
        const addCandidateButton = document.getElementById("addCandidateButton");
        
        if (!nameInput || !partyInput || !addCandidateButton) return;
        
        const name = nameInput.value.trim();
        const party = partyInput.value.trim();
        
        if (!name || !party) {
            showFeedback("Please fill out all fields", true, "candidateFeedback");
            return;
        }
        
        setLoading(addCandidateButton, true, "Adding candidate...");
        
        try {
            // Add candidate on blockchain
            const tx = await safeContractCall(
                () => votingContract.addCandidate(name, party),
                null,
                "Failed to add candidate"
            );
            await tx.wait();
            
            // Add to backend
            try {
                await makeApiRequest('/candidates', 'POST', { name, party });
            } catch (apiError) {
                console.warn("API candidate submission failed, but blockchain transaction succeeded:", apiError);
                // Continue since the blockchain transaction worked
            }
            
            showFeedback("Candidate added successfully!", false, "candidateFeedback");
            nameInput.value = "";
            partyInput.value = "";
            loadCandidatesAdmin();
        } catch (error) {
            showFeedback("Error adding candidate: " + error.message, true, "candidateFeedback");
        } finally {
            setLoading(addCandidateButton, false, "Add Candidate");
        }
    }
    
    async function handleSetDates(e) {
        e.preventDefault();
        
        const startDateInput = document.getElementById("startDate");
        const endDateInput = document.getElementById("endDate");
        const setDatesButton = document.getElementById("setDatesButton");
        
        if (!startDateInput || !endDateInput || !setDatesButton) return;
        
        const startDate = new Date(startDateInput.value).getTime() / 1000;
        const endDate = new Date(endDateInput.value).getTime() / 1000;
        
        if (isNaN(startDate) || isNaN(endDate)) {
            showFeedback("Please select valid dates", true, "datesFeedback");
            return;
        }
        
        if (endDate <= startDate) {
            showFeedback("End date must be after start date", true, "datesFeedback");
            return;
        }
        
        setLoading(setDatesButton, true, "Setting dates...");
        
        try {
            // Set dates on blockchain
            const tx = await safeContractCall(
                () => votingContract.setVotingDates(Math.floor(startDate), Math.floor(endDate)),
                null,
                "Failed to set voting dates"
            );
            await tx.wait();
            
            // Update backend
            try {
                await makeApiRequest('/voting/set-dates', 'POST', {
                    start_date: Math.floor(startDate),
                    end_date: Math.floor(endDate)
                });
            } catch (apiError) {
                console.warn("API date setting failed, but blockchain transaction succeeded:", apiError);
                // Continue since the blockchain transaction worked
            }
            
            showFeedback("Voting dates set successfully!", false, "datesFeedback");
            loadVotingDatesAdmin();
        } catch (error) {
            showFeedback("Error setting dates: " + error.message, true, "datesFeedback");
        } finally {
            setLoading(setDatesButton, false, "Set New Dates");
        }
    }
    
    async function handleUpdateDates() {
        const startDateInput = document.getElementById("startDate");
        const endDateInput = document.getElementById("endDate");
        const updateDatesButton = document.getElementById("updateDatesButton");
        
        if (!startDateInput || !endDateInput || !updateDatesButton) return;
        
        const startDate = new Date(startDateInput.value).getTime() / 1000;
        const endDate = new Date(endDateInput.value).getTime() / 1000;
        
        if (isNaN(startDate) || isNaN(endDate)) {
            showFeedback("Please select valid dates", true, "datesFeedback");
            return;
        }
        
        if (endDate <= startDate) {
            showFeedback("End date must be after start date", true, "datesFeedback");
            return;
        }
        
        setLoading(updateDatesButton, true, "Updating dates...");
        
        try {
            // Update dates on blockchain
            const tx = await safeContractCall(
                () => votingContract.updateVotingDates(Math.floor(startDate), Math.floor(endDate)),
                null,
                "Failed to update voting dates"
            );
            await tx.wait();
            
            // Update backend
            try {
                await makeApiRequest('/voting/update-dates', 'POST', {
                    start_date: Math.floor(startDate),
                    end_date: Math.floor(endDate)
                });
            } catch (apiError) {
                console.warn("API date update failed, but blockchain transaction succeeded:", apiError);
                // Continue since the blockchain transaction worked
            }
            
            showFeedback("Voting dates updated successfully!", false, "datesFeedback");
            loadVotingDatesAdmin();
        } catch (error) {
            showFeedback("Error updating dates: " + error.message, true, "datesFeedback");
        } finally {
            setLoading(updateDatesButton, false, "Update Existing Dates");
        }
    }
    
    async function loadResults() {
        const resultsLoadingIndicator = document.getElementById("resultsLoadingIndicator");
        const resultsLoadingText = document.getElementById("resultsLoadingText");
        const resultsTableBody = document.getElementById("resultsTableBody");
        const resultsChart = document.getElementById("resultsChart");
        
        if (!resultsLoadingIndicator || !resultsLoadingText || !resultsTableBody || !resultsChart) return;
        
        resultsLoadingIndicator.classList.remove("hidden");
        resultsLoadingText.textContent = "Loading election results...";
        
        try {
            const candidates = await safeContractCall(
                () => votingContract.getAllCandidates(),
                [],
                "Failed to load election results"
            );
            
            // Calculate total votes
            const totalVotes = candidates.reduce((sum, candidate) => sum + parseInt(candidate.voteCount), 0);
            
            // Sort candidates by vote count (descending)
            const sortedCandidates = [...candidates].sort((a, b) => b.voteCount - a.voteCount);
            
            // Prepare data for Chart.js
            const labels = sortedCandidates.map(c => c.name);
            const data = sortedCandidates.map(c => parseInt(c.voteCount));
            
            // Generate colors for the chart
            function generateColors(count) {
                const colors = [
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)',
                    'rgba(199, 199, 199, 0.6)',
                    'rgba(83, 102, 255, 0.6)',
                    'rgba(40, 159, 64, 0.6)',
                    'rgba(210, 199, 199, 0.6)'
                ];
                
                // Generate more colors if needed
                if (count > colors.length) {
                    for (let i = colors.length; i < count; i++) {
                        const r = Math.floor(Math.random() * 255);
                        const g = Math.floor(Math.random() * 255);
                        const b = Math.floor(Math.random() * 255);
                        colors.push(`rgba(${r}, ${g}, ${b}, 0.6)`);
                    }
                }
                
                return colors.slice(0, count);
            }
            
            const backgroundColors = generateColors(sortedCandidates.length);
            const borderColors = backgroundColors.map(c => c.replace('0.6', '1'));
            
            // Create or update the chart
            if (window.resultsChartInstance) {
                window.resultsChartInstance.destroy();
            }
            
            window.resultsChartInstance = new Chart(resultsChart, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Votes',
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#cbd5e1'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        x: {
                            ticks: {
                                color: '#cbd5e1'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Election Results',
                            color: '#cbd5e1',
                            font: {
                                size: 16
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const votes = context.raw;
                                    const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(2) : 0;
                                    return `Votes: ${votes} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
            
            // Update results table
            resultsTableBody.innerHTML = "";
            
            if (sortedCandidates.length === 0) {
                resultsTableBody.innerHTML = `<tr><td colspan="5" class="p-3 text-center">No candidates have been added yet</td></tr>`;
            } else {
                sortedCandidates.forEach((candidate, index) => {
                    const votes = parseInt(candidate.voteCount);
                    const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(2) : 0;
                    
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td class="p-3 border border-gray-600">${index + 1}</td>
                        <td class="p-3 border border-gray-600">${candidate.name}</td>
                        <td class="p-3 border border-gray-600">${candidate.party}</td>
                        <td class="p-3 border border-gray-600">${votes}</td>
                        <td class="p-3 border border-gray-600">${percentage}%</td>
                    `;
                    resultsTableBody.appendChild(row);
                });
            }
            
            resultsLoadingIndicator.classList.add("hidden");
            resultsLoadingText.textContent = "";
        } catch (error) {
            console.error("Error loading results:", error);
            resultsTableBody.innerHTML = `<tr><td colspan="5" class="p-3 text-center">Failed to load results: ${error.message}</td></tr>`;
            resultsLoadingIndicator.classList.add("hidden");
            resultsLoadingText.textContent = "Error loading results";
        }
    }
    
    // Theme toggling functionality
    const toggleThemeButton = document.querySelector('[onclick="toggleTheme()"]');
    if (toggleThemeButton) {
        toggleThemeButton.addEventListener("click", () => {
            document.documentElement.classList.toggle("dark");
            localStorage.theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
        });
    }
    
    // Start the application
    initApp();
});

// Add event listener to logout button
document.addEventListener("DOMContentLoaded", () => {
    const logoutButton = document.getElementById("logoutButton");
    
    if (logoutButton) {
        logoutButton.addEventListener("click", async (e) => {
            e.preventDefault();
            
            try {
                // Disable button and show loading state
                logoutButton.disabled = true;
                logoutButton.innerHTML = '<span class="loader"></span><span>Logging out...</span>';
                
                await logout();
            } catch (error) {
                console.log("Logout button error:", error);
                // Force redirect on error
                window.location.href = "login.html";
            }
        });
    } else {
        console.log("Logout button not found in DOM");
    }
});

},{}]},{},[1]);
