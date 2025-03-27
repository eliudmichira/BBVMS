/**
 * Decentralized Voting System - Admin Dashboard
 * 
 * This module handles all the functionality for the admin dashboard including:
 * - Wallet connection
 * - Contract interaction
 * - Candidate management
 * - Voting period management
 * - Results visualization
 */

// Main application configuration
const AppConfig = {
    // Contract details - replace with your deployed contract address
    contractAddress: '0xd843e1048B66c27E36cF9a5314e920C9B77c5b4D',
    networkName: 'Localhost 7575',
    defaultImageUrl: 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_1280.png',
    // Add admin address - consider moving this to environment variable in production
    adminAddress: "0x0b26432E4c0A4DB3BcEa7fEff8e11F66468731f5"
};

// Import ABI from separate file or define here if needed
// In production, this should be imported from a separate file
const votingContractABI = [
    // ABI definition moved from HTML file
    // ...
];

/**
 * AdminDashboard class manages all functionality for the admin interface
 */
class AdminDashboard {
    constructor() {
        // Global state
        this.web3 = null;
        this.votingContract = null;
        this.accounts = [];
        this.isAdmin = false;
        this.candidatesData = [];
        this.votingStartTime = 0;
        this.votingEndTime = 0;
        this.chartInstance = null;
        this.timeRemainingInterval = null;

        // Debug mode flag
        this.isDebugMode = false;

        // Initialize application
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        this.debugLog('Application initializing...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Try auto-connecting if user has previously connected
        if (localStorage.getItem('walletConnected') === 'true') {
            this.connectWallet();
        } else {
            this.updateUIConnectionStatus(false);
        }

        // Setup debug panel toggle
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'D') {
                const debugPanel = document.getElementById('debugPanel');
                debugPanel.classList.toggle('hidden');
                this.isDebugMode = !debugPanel.classList.contains('hidden');
                this.debugLog('Debug mode ' + (this.isDebugMode ? 'enabled' : 'disabled'));
            }
        });
    }

    /**
     * Setup all event listeners for the UI
     */
    setupEventListeners() {
        // Connect wallet button
        document.getElementById('connectButton').addEventListener('click', () => this.connectWallet());
        
        // Refresh data button
        document.getElementById('refreshDataButton').addEventListener('click', () => this.refreshAllData());
        
        // Add candidate form
        document.getElementById('addCandidateForm').addEventListener('submit', (e) => this.handleAddCandidate(e));
        
        // Refresh candidates button
        document.getElementById('refreshCandidatesButton').addEventListener('click', () => this.loadCandidates());
        
        // Set dates form
        document.getElementById('setDatesForm').addEventListener('submit', (e) => this.handleSetDates(e));
        
        // Update dates button
        document.getElementById('updateDatesButton').addEventListener('click', () => this.handleUpdateDates());
        
        // Export results button
        document.getElementById('exportResultsButton').addEventListener('click', () => this.exportResults());
        
        // Logout button
        document.getElementById('logoutButton').addEventListener('click', () => this.disconnectWallet());
        
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => this.switchTab(button));
        });
        
        // Dark mode toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleDarkMode());
        
        // Clear debug button
        document.getElementById('clearDebugBtn').addEventListener('click', () => {
            document.getElementById('debugContent').innerHTML = '';
        });
    }

    /**
     * Switch between tabs in the UI
     * @param {HTMLElement} buttonElement - The tab button that was clicked
     */
    switchTab(buttonElement) {
        // Get the target content ID
        const targetId = buttonElement.getAttribute('aria-controls');
        
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Show the selected tab content
        document.getElementById(targetId).classList.add('active');
        
        // Update tab button styles
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('text-primary-600', 'dark:text-primary-400', 'border-primary-500', 'dark:border-primary-400');
            btn.classList.add('text-gray-500', 'dark:text-gray-400', 'hover:text-primary-600', 'dark:hover:text-primary-400', 'border-transparent');
        });
        
        // Style the clicked tab button
        buttonElement.classList.remove('text-gray-500', 'dark:text-gray-400', 'hover:text-primary-600', 'dark:hover:text-primary-400', 'border-transparent');
        buttonElement.classList.add('text-primary-600', 'dark:text-primary-400', 'border-primary-500', 'dark:border-primary-400');
        
        // If results tab is selected, load results data
        if (targetId === 'content-results') {
            this.loadResults();
        }
    }

    /**
     * Toggle dark/light mode
     */
    toggleDarkMode() {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
    }

    /**
     * Log messages to debug console
     * @param {string} message - Message to log
     */
    debugLog(message) {
        // Always log to console for developer
        console.log(`[Admin] ${message}`);
        
        // Only log to debug panel if available
        const debugContent = document.getElementById('debugContent');
        if (debugContent) {
            const time = new Date().toLocaleTimeString();
            debugContent.innerHTML += `<div class="py-1">[${time}] ${message}</div>`;
            debugContent.scrollTop = debugContent.scrollHeight;
        }
    }

    /**
     * Connect to Ethereum wallet (MetaMask)
     */
    async connectWallet() {
        this.debugLog('Attempting to connect wallet...');
        
        try {
            // Check if MetaMask is installed
            if (typeof window.ethereum === 'undefined') {
                this.showFeedback('candidateFeedback', 'error', 'Wallet Not Found', 'Please install MetaMask or another Ethereum wallet extension.');
                return;
            }
            
            // Request account access
            this.accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            // Initialize Web3
            this.web3 = new Web3(window.ethereum);
            
            // Initialize the contract
            this.votingContract = new this.web3.eth.Contract(votingContractABI, AppConfig.contractAddress);
            
            // Check if connected account is admin
            await this.checkAdminStatus();
            
            // Update UI with connection status
            this.updateUIConnectionStatus(true);
            
            // Load initial data
            await this.refreshAllData();
            
            // Remember that the wallet was connected
            localStorage.setItem('walletConnected', 'true');
            
            // Listen for account changes
            window.ethereum.on('accountsChanged', accounts => this.handleAccountsChanged(accounts));
            
            // Listen for chain changes
            window.ethereum.on('chainChanged', () => window.location.reload());
            
            this.debugLog('Wallet connected successfully');
        } catch (error) {
            console.error('Error connecting wallet:', error);
            this.debugLog('Error connecting wallet: ' + error.message);
            this.showFeedback('candidateFeedback', 'error', 'Connection Error', error.message);
            this.updateUIConnectionStatus(false);
        }
    }

    /**
     * Handle when user changes accounts in wallet
     * @param {Array} newAccounts - New accounts from wallet
     */
    async handleAccountsChanged(newAccounts) {
        this.debugLog('Accounts changed, updating...');
        this.accounts = newAccounts;
        
        if (newAccounts.length === 0) {
            // User disconnected their wallet
            this.disconnectWallet();
        } else {
            // Check if new account is admin
            await this.checkAdminStatus();
            await this.refreshAllData();
        }
    }

    /**
     * Disconnect the wallet
     */
    disconnectWallet() {
        this.debugLog('Disconnecting wallet...');
        
        // Clear any active intervals
        if (this.timeRemainingInterval) {
            clearInterval(this.timeRemainingInterval);
            this.timeRemainingInterval = null;
        }
        
        // Reset global variables
        this.accounts = [];
        this.isAdmin = false;
        
        // Update UI
        this.updateUIConnectionStatus(false);
        
        // Clear local storage
        localStorage.removeItem('walletConnected');
        
        // Reset UI elements to loading/default state
        document.getElementById('candidateList').innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center">Connect your wallet to view candidates</td></tr>';
        document.getElementById('totalCandidates').textContent = '-';
        document.getElementById('totalVotes').textContent = '-';
        document.getElementById('votingStatus').textContent = '-';
        document.getElementById('timeRemaining').textContent = '-';
        document.getElementById('currentDatesDisplay').textContent = 'Connect your wallet to view voting period';
        
        // Hide feedback messages
        document.getElementById('candidateFeedbackContainer').classList.add('hidden');
        document.getElementById('datesFeedbackContainer').classList.add('hidden');
        
        this.debugLog('Wallet disconnected');
    }

    /**
     * Check if connected account is the contract admin
     */
    async checkAdminStatus() {
        try {
            // Get the admin address from our config
            const adminAddress = AppConfig.adminAddress;
            this.isAdmin = (this.accounts[0].toLowerCase() === adminAddress.toLowerCase());
            
            this.debugLog(`Admin status checked: ${this.isAdmin ? 'Is admin' : 'Not admin'}`);
            this.debugLog(`Your account: ${this.accounts[0]}`);
            this.debugLog(`Admin account: ${adminAddress}`);
            
            if (!this.isAdmin) {
                this.showFeedback('candidateFeedback', 'warning', 'Limited Access', 'You are not the admin of this contract. Some functions will be disabled.');
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            this.debugLog('Error checking admin status: ' + error.message);
            this.isAdmin = false;
        }
    }

    /**
     * Update UI elements based on connection status
     * @param {boolean} connected - Whether wallet is connected
     */
    updateUIConnectionStatus(connected) {
        const connectButton = document.getElementById('connectButton');
        const walletAddress = document.getElementById('walletAddress');
        const networkInfo = document.getElementById('networkInfo');
        const contractInfo = document.getElementById('contractInfo');
        
        if (connected && this.accounts.length > 0) {
            // Update connect button
            connectButton.innerHTML = '<i class="fas fa-link-slash mr-2"></i><span>Disconnect</span>';
            connectButton.classList.remove('bg-blue-500', 'hover:bg-blue-600');
            connectButton.classList.add('bg-gray-500', 'hover:bg-gray-600');
            
            // Display wallet address
            const displayAddress = `${this.accounts[0].substring(0, 6)}...${this.accounts[0].substring(this.accounts[0].length - 4)}`;
            walletAddress.textContent = displayAddress;
            
            // Update network and contract info
            networkInfo.textContent = `Connected to ${AppConfig.networkName}`;
            contractInfo.textContent = `Contract: ${AppConfig.contractAddress.substring(0, 6)}...${AppConfig.contractAddress.substring(AppConfig.contractAddress.length - 4)}`;
        } else {
            // Reset connect button
            connectButton.innerHTML = '<i class="fas fa-plug mr-2"></i><span>Connect</span>';
            connectButton.classList.remove('bg-gray-500', 'hover:bg-gray-600');
            connectButton.classList.add('bg-blue-500', 'hover:bg-blue-600');
            
            // Clear wallet address
            walletAddress.textContent = 'Not connected';
            
            // Reset network and contract info
            networkInfo.textContent = 'Not connected to any network';
            contractInfo.textContent = 'Contract not loaded';
        }
    }

    /**
     * Refresh all data displayed in the dashboard
     */
    async refreshAllData() {
        this.debugLog('Refreshing all data...');
        
        if (!this.web3 || !this.votingContract) {
            this.debugLog('Cannot refresh data: Wallet not connected');
            return;
        }
        
        try {
            // Load data in parallel for better performance
            await Promise.all([
                this.loadCandidates(),
                this.loadVotingPeriod(),
                this.loadVotingStats()
            ]);
            
            // Update results tab data if that tab is active
            if (document.getElementById('content-results').classList.contains('active')) {
                this.loadResults();
            }
            
            this.debugLog('All data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.debugLog('Error refreshing data: ' + error.message);
        }
    }

    /**
     * Load candidates from the contract
     */
    async loadCandidates() {
        this.debugLog('Loading candidates...');
        
        const candidateList = document.getElementById('candidateList');
        if (!candidateList) return;
        
        // Show loading state
        candidateList.innerHTML = `
            <tr>
                <td colspan="4" class="px-4 py-6 text-center">
                    <div class="flex justify-center items-center space-x-2">
                        <div class="loader"></div>
                        <span>Loading candidates...</span>
                    </div>
                </td>
            </tr>
        `;
        
        try {
            if (!this.web3 || !this.votingContract) {
                throw new Error('Contract not initialized');
            }
            
            // Get candidates from contract
            const candidates = await this.votingContract.methods.getAllCandidatesWithVotes().call();
            this.debugLog(`Received ${candidates.length} candidates from contract`);
            
            // Update candidates data
            this.candidatesData = candidates;
            
            // Update total candidates counter
            document.getElementById('totalCandidates').textContent = candidates.length;
            
            // Calculate and update total votes counter
            const totalVotes = candidates.reduce((sum, candidate) => sum + parseInt(candidate.voteCount), 0);
            document.getElementById('totalVotes').textContent = totalVotes;
            
            if (candidates.length === 0) {
                candidateList.innerHTML = `
                    <tr>
                        <td colspan="4" class="px-4 py-6 text-center">
                            <p class="text-gray-500 dark:text-gray-400">No candidates found. Add new candidates to get started.</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Build candidate list HTML
            const candidateListHTML = candidates.map(candidate => `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td class="px-4 py-3">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">
                            ${candidate.id}
                        </span>
                    </td>
                    <td class="px-4 py-3">
                        <div class="flex items-center">
                            <div class="h-10 w-10 flex-shrink-0 mr-3">
                                <img class="h-10 w-10 rounded-full object-cover" 
                                     src="${candidate.imageUrl || AppConfig.defaultImageUrl}" 
                                     alt="${candidate.name}">
                            </div>
                            <div>
                                <p class="font-medium">${candidate.name}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-3">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            ${candidate.party}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-right">
                        <span class="font-medium">${candidate.voteCount}</span>
                    </td>
                </tr>
            `).join('');
            
            // Update the UI
            candidateList.innerHTML = candidateListHTML;
            
            this.debugLog('Candidates loaded successfully');
        } catch (error) {
            console.error('Error loading candidates:', error);
            this.debugLog('Error loading candidates: ' + error.message);
            
            candidateList.innerHTML = `
                <tr>
                    <td colspan="4" class="px-4 py-6 text-center">
                        <p class="text-red-500 dark:text-red-400">Error loading candidates: ${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Load voting period information from the contract
     */
    async loadVotingPeriod() {
        this.debugLog('Loading voting period...');
        
        try {
            // Get voting period
            const result = await this.votingContract.methods.getVotingPeriod().call();
            this.votingStartTime = parseInt(result[0]);
            this.votingEndTime = parseInt(result[1]);
            
            // Hide loading indicator
            document.getElementById('datesLoadingIndicator').classList.add('hidden');
            
            // Update UI with voting period
            this.updateVotingPeriodUI();
            
            this.debugLog('Voting period loaded successfully');
        } catch (error) {
            console.error('Error loading voting period:', error);
            this.debugLog('Error loading voting period: ' + error.message);
            
            document.getElementById('currentDatesDisplay').textContent = 'Error loading voting period. Please try again.';
            document.getElementById('datesLoadingIndicator').classList.add('hidden');
        }
    }

    /**
     * Load voting stats (status and time remaining)
     */
    async loadVotingStats() {
        this.debugLog('Loading voting stats...');
        
        try {
            // Get voting status
            const isActive = await this.votingContract.methods.isVotingActive().call();
            
            // Update voting status display
            const statusElement = document.getElementById('votingStatus');
            if (this.votingStartTime === 0 && this.votingEndTime === 0) {
                statusElement.textContent = 'Not Set';
                statusElement.classList.remove('text-green-500', 'text-red-500', 'text-gray-500');
                statusElement.classList.add('text-yellow-500');
            } else if (isActive) {
                statusElement.textContent = 'Active';
                statusElement.classList.remove('text-yellow-500', 'text-red-500', 'text-gray-500');
                statusElement.classList.add('text-green-500');
            } else {
                const now = Math.floor(Date.now() / 1000);
                if (now < this.votingStartTime) {
                    statusElement.textContent = 'Upcoming';
                    statusElement.classList.remove('text-green-500', 'text-red-500', 'text-yellow-500');
                    statusElement.classList.add('text-gray-500');
                }
                else {
                    statusElement.textContent = 'Ended';
                    statusElement.classList.remove('text-green-500', 'text-gray-500', 'text-yellow-500');
                    statusElement.classList.add('text-red-500');
                }
            }
            
            // Update time remaining display once
            this.updateTimeRemaining();
            
            // Clear any existing interval
            if (this.timeRemainingInterval) {
                clearInterval(this.timeRemainingInterval);
            }
            
            // Start timer to update time remaining if active or upcoming
            if (isActive || (this.votingStartTime > Math.floor(Date.now() / 1000))) {
                // Update every second
                this.timeRemainingInterval = setInterval(() => this.updateTimeRemaining(), 1000);
            }
            
            this.debugLog('Voting stats loaded successfully');
        } catch (error) {
            console.error('Error loading voting stats:', error);
            this.debugLog('Error loading voting stats: ' + error.message);
        }
    }

    /**
     * Load and display election results
     */
    async loadResults() {
        this.debugLog('Loading election results...');
        
        // Show loading indicator
        document.getElementById('resultsLoading').classList.remove('hidden');
        document.getElementById('resultStats').classList.add('hidden');
        document.getElementById('resultsTable').classList.add('hidden');
        document.getElementById('resultsChartContainer').classList.add('hidden');
        document.getElementById('exportResultsContainer').classList.add('hidden');
        
        try {
            // Make sure candidates are loaded
            if (this.candidatesData.length === 0) {
                await this.loadCandidates();
            }
            
            // If still no candidates
            if (this.candidatesData.length === 0) {
                document.getElementById('resultsLoadingText').textContent = 'No candidates found. Add candidates first.';
                return;
            }
            
            // Calculate total votes
            const totalVotes = this.candidatesData.reduce((sum, candidate) => sum + parseInt(candidate.voteCount), 0);
            document.getElementById('totalVotesCast').textContent = totalVotes;
            
            // Find leading candidate
            let leadingCandidate = { name: 'None', voteCount: 0 };
            
            this.candidatesData.forEach(candidate => {
                if (parseInt(candidate.voteCount) > parseInt(leadingCandidate.voteCount)) {
                    leadingCandidate = candidate;
                }
            });
            
            document.getElementById('leadingCandidate').textContent = totalVotes > 0 ? leadingCandidate.name : 'No votes cast';
            
            // Calculate voter turnout (if we had total eligible voters data)
            // For now, just use a placeholder
            document.getElementById('voterTurnout').textContent = totalVotes > 0 ? 'Available voters have participated' : 'No votes cast';
            
            // Build results table
            let resultsTableHTML = '';
            
            this.candidatesData.forEach(candidate => {
                const percentage = totalVotes > 0 ? ((parseInt(candidate.voteCount) / totalVotes) * 100).toFixed(2) : '0.00';
                
                resultsTableHTML += `
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td class="px-4 py-3">
                            <div class="flex items-center">
                                <div class="h-10 w-10 flex-shrink-0 mr-3">
                                    <img class="h-10 w-10 rounded-full object-cover" 
                                         src="${candidate.imageUrl || AppConfig.defaultImageUrl}" 
                                         alt="${candidate.name}">
                                </div>
                                <div>
                                    <p class="font-medium">${candidate.name}</p>
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-3">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                ${candidate.party}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-center">
                            <span class="font-medium">${candidate.voteCount}</span>
                        </td>
                        <td class="px-4 py-3 text-right">
                            <div class="flex items-center justify-end">
                                <div class="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                                    <div class="bg-primary-600 h-2 rounded-full" style="width: ${percentage}%"></div>
                                </div>
                                <span>${percentage}%</span>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            // Update table
            document.getElementById('resultsTableBody').innerHTML = resultsTableHTML;
            
            // Create chart
            this.createResultsChart();
            
            // Hide loading and show results
            document.getElementById('resultsLoading').classList.add('hidden');
            document.getElementById('resultStats').classList.remove('hidden');
            document.getElementById('resultsTable').classList.remove('hidden');
            document.getElementById('resultsChartContainer').classList.remove('hidden');
            document.getElementById('exportResultsContainer').classList.remove('hidden');
            
            this.debugLog('Election results loaded successfully');
        } catch (error) {
            console.error('Error loading results:', error);
            this.debugLog('Error loading results: ' + error.message);
            
            document.getElementById('resultsLoadingIndicator').classList.add('hidden');
            document.getElementById('resultsLoadingText').textContent = 'Error loading results. Please try again.';
        }
    }

    /**
     * Update the UI with voting period information
     */
    updateVotingPeriodUI() {
        const currentDatesDisplay = document.getElementById('currentDatesDisplay');
        const votingStatusBadge = document.getElementById('votingStatusBadge');
        const electionProgressContainer = document.getElementById('electionProgressContainer');
        
        // If voting period not set
        if (this.votingStartTime === 0 && this.votingEndTime === 0) {
            currentDatesDisplay.textContent = 'No voting period has been set.';
            votingStatusBadge.classList.add('hidden');
            electionProgressContainer.classList.add('hidden');
            return;
        }
        
        // Format dates for display
        const startDate = new Date(this.votingStartTime * 1000);
        const endDate = new Date(this.votingEndTime * 1000);
        const dateOptions = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit'
        };
        
        const formattedStart = startDate.toLocaleDateString('en-US', dateOptions);
        const formattedEnd = endDate.toLocaleDateString('en-US', dateOptions);
        
        currentDatesDisplay.textContent = `From ${formattedStart} to ${formattedEnd}`;
        
        // Show voting status badge
        votingStatusBadge.classList.remove('hidden');
        
        const now = new Date();
        
        if (now < startDate) {
            // Upcoming election
            votingStatusBadge.textContent = 'Upcoming';
            votingStatusBadge.classList.remove('bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
            votingStatusBadge.classList.add('bg-gray-100', 'text-gray-800', 'dark:bg-gray-700', 'dark:text-gray-300');
        } else if (now > endDate) {
            // Ended election
            votingStatusBadge.textContent = 'Ended';
            votingStatusBadge.classList.remove('bg-green-100', 'text-green-800', 'bg-gray-100', 'text-gray-800');
            votingStatusBadge.classList.add('bg-red-100', 'text-red-800', 'dark:bg-red-900/30', 'dark:text-red-300');
        } else {
            // Active election
            votingStatusBadge.textContent = 'Active';
            votingStatusBadge.classList.remove('bg-gray-100', 'text-gray-800', 'bg-red-100', 'text-red-800');
            votingStatusBadge.classList.add('bg-green-100', 'text-green-800', 'dark:bg-green-900/30', 'dark:text-green-300');
        }
        
        // Update election progress
        this.updateElectionProgress(startDate, endDate);
    }

    /**
     * Update election progress bar and labels
     * @param {Date} startDate - Voting start date
     * @param {Date} endDate - Voting end date
     */
    updateElectionProgress(startDate, endDate) {
        const now = new Date();
        const electionProgressContainer = document.getElementById('electionProgressContainer');
        const electionProgress = document.getElementById('electionProgress');
        const electionStartLabel = document.getElementById('electionStartLabel');
        const electionEndLabel = document.getElementById('electionEndLabel');
        const electionTimeRemaining = document.getElementById('electionTimeRemaining');
        
        // Format dates for display
        const dateOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        electionStartLabel.textContent = startDate.toLocaleDateString('en-US', dateOptions);
        electionEndLabel.textContent = endDate.toLocaleDateString('en-US', dateOptions);
        
        // Calculate progress percentage
        let progressPercentage = 0;
        
        if (now > endDate) {
            // Election ended
            progressPercentage = 100;
        } else if (now < startDate) {
            // Election not started
            progressPercentage = 0;
        } else {
            // Election in progress
            const totalDuration = endDate- startDate;
            const elapsed = now - startDate;
            progressPercentage = Math.min(100, Math.floor((elapsed / totalDuration) * 100));
        }
        
        // Update progress bar
        electionProgress.style.width = `${progressPercentage}%`;
        
        // Set progress bar color
        if (progressPercentage === 100) {
            electionProgress.classList.remove('bg-primary-500', 'bg-yellow-500');
            electionProgress.classList.add('bg-red-500');
        } else if (progressPercentage > 75) {
            electionProgress.classList.remove('bg-primary-500', 'bg-red-500');
            electionProgress.classList.add('bg-yellow-500');
        } else {
            electionProgress.classList.remove('bg-yellow-500', 'bg-red-500');
            electionProgress.classList.add('bg-primary-500');
        }
        
        // Show progress container
        electionProgressContainer.classList.remove('hidden');
        
        // Update time remaining
        this.updateTimeRemaining();
    }
 
    /**
     * Update time remaining display
     */
    updateTimeRemaining() {
        const now = Math.floor(Date.now() / 1000);
        const timeRemainingElement = document.getElementById('timeRemaining');
        const electionTimeRemaining = document.getElementById('electionTimeRemaining');
        
        // If voting period not set
        if (this.votingStartTime === 0 && this.votingEndTime === 0) {
            timeRemainingElement.textContent = 'Not Set';
            if (electionTimeRemaining) {
                electionTimeRemaining.textContent = 'Voting period not set';
            }
            return;
        }
        
        // Calculate appropriate time remaining
        let timeRemaining;
        let statusText;
        
        if (now < this.votingStartTime) {
            // Time until voting starts
            timeRemaining = this.votingStartTime - now;
            statusText = 'until voting begins';
        } else if (now < this.votingEndTime) {
            // Time until voting ends
            timeRemaining = this.votingEndTime - now;
            statusText = 'until voting ends';
        } else {
            // Voting ended
            timeRemainingElement.textContent = 'Ended';
            if (electionTimeRemaining) {
                electionTimeRemaining.textContent = 'Voting has ended';
            }
            return;
        }
        
        // Format time remaining
        const days = Math.floor(timeRemaining / 86400);
        const hours = Math.floor((timeRemaining % 86400) / 3600);
        const minutes = Math.floor((timeRemaining % 3600) / 60);
        const seconds = timeRemaining % 60;
        
        let formattedTime = '';
        
        if (days > 0) {
            formattedTime = `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            formattedTime = `${hours}h ${minutes}m ${seconds}s`;
        } else {
            formattedTime = `${minutes}m ${seconds}s`;
        }
        
        // Update UI
        timeRemainingElement.textContent = formattedTime;
        if (electionTimeRemaining) {
            electionTimeRemaining.textContent = `${formattedTime} ${statusText}`;
        }
    }
 
    /**
     * Display feedback messages to the user
     * @param {string} type - The feedback type (candidateFeedback, datesFeedback)
     * @param {string} status - The status (success, error, warning, info)
     * @param {string} title - The feedback title
     * @param {string} message - The feedback message
     */
    showFeedback(type, status, title, message) {
        const container = document.getElementById(`${type}Container`);
        const titleElement = document.getElementById(`${type}Title`);
        const messageElement = document.getElementById(`${type}`);
        const iconElement = document.getElementById(`${type}Icon`);
        
        // Set message content
        titleElement.textContent = title;
        messageElement.textContent = message;
        
        // Set appropriate styling based on status
        container.classList.remove('hidden', 'border-green-200', 'border-red-200', 'border-yellow-200', 'bg-green-50', 'bg-red-50', 'bg-yellow-50');
        titleElement.classList.remove('text-green-800', 'text-red-800', 'text-yellow-800');
        
        let iconClass = '';
        
        switch (status) {
            case 'success':
                container.classList.add('border-green-200', 'bg-green-50', 'dark:bg-green-900/20', 'dark:border-green-900');
                titleElement.classList.add('text-green-800', 'dark:text-green-300');
                iconClass = '<i class="fas fa-check-circle text-green-500"></i>';
                break;
            case 'error':
                container.classList.add('border-red-200', 'bg-red-50', 'dark:bg-red-900/20', 'dark:border-red-900');
                titleElement.classList.add('text-red-800', 'dark:text-red-300');
                iconClass = '<i class="fas fa-exclamation-circle text-red-500"></i>';
                break;
            case 'warning':
                container.classList.add('border-yellow-200', 'bg-yellow-50', 'dark:bg-yellow-900/20', 'dark:border-yellow-900');
                titleElement.classList.add('text-yellow-800', 'dark:text-yellow-300');
                iconClass = '<i class="fas fa-exclamation-triangle text-yellow-500"></i>';
                break;
            case 'info':
                container.classList.add('border-blue-200', 'bg-blue-50', 'dark:bg-blue-900/20', 'dark:border-blue-900');
                titleElement.classList.add('text-blue-800', 'dark:text-blue-300');
                iconClass = '<i class="fas fa-info-circle text-blue-500"></i>';
                break;
        }
        
        // Set icon
        iconElement.innerHTML = iconClass;
        
        // Show the container
        container.classList.remove('hidden');
        
        // Hide feedback after 5 seconds for success messages
        if (status === 'success') {
            setTimeout(() => {
                container.classList.add('hidden');
            }, 5000);
        }
    }
 
    /**
     * Create a chart to visualize election results
     */
    createResultsChart() {
        // Get canvas element
        const chartCanvas = document.getElementById('resultsChart');
        
        // If chart already exists, destroy it
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
        
        // Prepare data for the chart
        const labels = this.candidatesData.map(candidate => candidate.name);
        const votes = this.candidatesData.map(candidate => parseInt(candidate.voteCount));
        const colors = this.generateColors(this.candidatesData.length);
        
        // Create chart
        this.chartInstance = new Chart(chartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Votes',
                    data: votes,
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('0.7', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = votes.reduce((sum, vote) => sum + vote, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(2) + '%' : '0%';
                                return `Votes: ${value} (${percentage})`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }
 
    /**
     * Generate colors for chart
     * @param {number} count - Number of colors needed
     * @returns {Array} Array of colors
     */
    generateColors(count) {
        const colors = [
            'rgba(14, 165, 233, 0.7)',  // Sky blue
            'rgba(168, 85, 247, 0.7)',  // Purple
            'rgba(234, 88, 12, 0.7)',   // Orange
            'rgba(22, 163, 74, 0.7)',   // Green
            'rgba(225, 29, 72, 0.7)',   // Red
            'rgba(20, 184, 166, 0.7)',  // Teal
            'rgba(245, 158, 11, 0.7)',  // Amber
            'rgba(236, 72, 153, 0.7)',  // Pink
        ];
        
        // If we need more colors than in our predefined list, generate them
        if (count > colors.length) {
            for (let i = colors.length; i < count; i++) {
                const r = Math.floor(Math.random() * 255);
                const g = Math.floor(Math.random() * 255);
                const b = Math.floor(Math.random() * 255);
                colors.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
            }
        }
        
        return colors.slice(0, count);
    }
 
    /**
     * Handle adding a new candidate
     * @param {Event} event - Form submit event
     */
    async handleAddCandidate(event) {
        event.preventDefault();
        this.debugLog('Handling add candidate submission...');
        
        if (!this.web3 || !this.votingContract) {
            this.showFeedback('candidateFeedback', 'error', 'Connection Error', 'Please connect your wallet first.');
            return;
        }
        
        if (!this.isAdmin) {
            this.showFeedback('candidateFeedback', 'error', 'Permission Denied', 'Only the admin can add candidates.');
            return;
        }
        
        const nameInput = document.getElementById('name');
        const partyInput = document.getElementById('party');
        const imageUrlInput = document.getElementById('imageUrl');
        const addButton = document.getElementById('addCandidateButton');
        
        const name = nameInput.value.trim();
        const party = partyInput.value.trim();
        const imageUrl = imageUrlInput.value.trim() || AppConfig.defaultImageUrl;
        
        // Validate inputs
        if (!this.validateCandidateForm(name, party)) {
            return;
        }
        
        this.debugLog(`Attempting to add candidate: ${name} (${party})`);
        
        // Show loading state
        addButton.innerHTML = '<div class="loader"></div> Adding...';
        addButton.disabled = true;
        
        try {
            // Estimate gas before sending transaction
            const gasEstimate = await this.votingContract.methods.addCandidate(name, party, imageUrl).estimateGas({
                from: this.accounts[0]
            });
            
            // Add 10% buffer to gas estimate
            const gasLimit = Math.ceil(gasEstimate * 1.1);
            
            this.debugLog(`Gas estimate for adding candidate: ${gasEstimate}, using limit: ${gasLimit}`);
            
            // Call the contract method
            const transaction = await this.votingContract.methods.addCandidate(name, party, imageUrl)
                .send({ 
                    from: this.accounts[0],
                    gas: gasLimit
                });
            
            this.debugLog(`Transaction successful: ${transaction.transactionHash}`);
            
            // Show success feedback
            this.showFeedback('candidateFeedback', 'success', 'Candidate Added', 
                `${name} has been added as a candidate successfully.`);
            
            // Reset form
            document.getElementById('addCandidateForm').reset();
            
            // Refresh the candidates list
            await this.loadCandidates();
            
        } catch (error) {
            console.error('Error adding candidate:', error);
            this.debugLog(`Error adding candidate: ${error.message}`);
            
            this.showFeedback('candidateFeedback', 'error', 'Transaction Failed', 
                'Failed to add candidate. ' + error.message);
        } finally {
            // Reset button state
            addButton.innerHTML = '<i class="fas fa-plus-circle mr-2"></i>Add Candidate';
            addButton.disabled = false;
        }
    }
 
    /**
     * Validate candidate form inputs
     * @param {string} name - Candidate name
     * @param {string} party - Political party
     * @returns {boolean} Whether form is valid
     */
    validateCandidateForm(name, party) {
        if (!name) {
            this.showFeedback('candidateFeedback', 'error', 'Validation Error', 'Candidate name is required.');
            return false;
        }
        
        if (!party) {
            this.showFeedback('candidateFeedback', 'error', 'Validation Error', 'Political party is required.');
            return false;
        }
        
        if (name.length < 2) {
            this.showFeedback('candidateFeedback', 'error', 'Validation Error', 'Candidate name must be at least 2 characters long.');
            return false;
        }
        
        return true;
    }
 
    /**
     * Handle setting new voting dates
     * @param {Event} event - Form submit event
     */
    async handleSetDates(event) {
        event.preventDefault();
        
        if (!this.isAdmin) {
            this.showFeedback('datesFeedback', 'error', 'Permission Denied', 'Only the admin can set voting dates.');
            return;
        }
        
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const setButton = document.getElementById('setDatesButton');
        
        const startDateValue = startDateInput.value;
        const endDateValue = endDateInput.value;
        
        // Validate
        if (!startDateValue || !endDateValue) {
            this.showFeedback('datesFeedback', 'error', 'Validation Error', 'Start and end dates are required.');
            return;
        }
        
        const startDate = new Date(startDateValue);
        const endDate = new Date(endDateValue);
        
        if (endDate <= startDate) {
            this.showFeedback('datesFeedback', 'error', 'Validation Error', 'End date must be after start date.');
            return;
        }
        
        // Convert to Unix timestamps (seconds)
        const startTimestamp = Math.floor(startDate.getTime() / 1000);
        const endTimestamp = Math.floor(endDate.getTime() / 1000);
        
        // Show loading state
        setButton.innerHTML = '<div class="loader"></div> Setting...';
        setButton.disabled = true;
        
        try {
            // Estimate gas
            const gasEstimate = await this.votingContract.methods.setVotingPeriod(startTimestamp, endTimestamp).estimateGas({
                from: this.accounts[0]
            });
            
            // Add 10% buffer to gas estimate
            const gasLimit = Math.ceil(gasEstimate * 1.1);
            
            // Set voting period in the contract
            await this.votingContract.methods.setVotingPeriod(startTimestamp, endTimestamp).send({
                from: this.accounts[0],
                gas: gasLimit
            });
            
            // Show success feedback
            this.showFeedback('datesFeedback', 'success', 'Voting Period Set', 'The voting period has been set successfully.');
            
            // Update global variables
            this.votingStartTime = startTimestamp;
            this.votingEndTime = endTimestamp;
            
            // Update UI
            this.updateVotingPeriodUI();
            this.loadVotingStats();
            
            this.debugLog(`Voting period set: ${startDate.toLocaleString()} to ${endDate.toLocaleString()}`);
        } catch (error) {
            console.error('Error setting voting period:', error);
            this.debugLog('Error setting voting period: ' + error.message);
            
            this.showFeedback('datesFeedback', 'error', 'Transaction Failed', error.message);
        } finally {
            // Reset button
            setButton.innerHTML = '<i class="fas fa-save mr-2"></i>Set New Period';
            setButton.disabled = false;
        }
    }
 
    /**
     * Handle updating existing voting dates
     */
    async handleUpdateDates() {
        if (!this.isAdmin) {
            this.showFeedback('datesFeedback', 'error', 'Permission Denied', 'Only the admin can update voting dates.');
            return;
        }
        
        // If no existing dates
        if (this.votingStartTime === 0 && this.votingEndTime === 0) {
            this.showFeedback('datesFeedback', 'warning', 'No Dates Set', 'There are no existing dates to update. Please set new dates.');
            return;
        }
        
        // Fill the form with existing dates
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        const startDate = new Date(this.votingStartTime * 1000);
        const endDate = new Date(this.votingEndTime * 1000);
        
        // Format for datetime-local input
        const formatDateForInput = (date) => {
            return date.toISOString().slice(0, 16);
        };
        
        startDateInput.value = formatDateForInput(startDate);
        endDateInput.value = formatDateForInput(endDate);
        
        this.showFeedback('datesFeedback', 'info', 'Update Ready', 'Existing dates have been loaded. Make your changes and click "Set New Period" to update.');
    }
 
    /**
     * Export results to CSV file
     */
    exportResults() {
        if (this.candidatesData.length === 0) {
            this.showFeedback('candidateFeedback', 'warning', 'No Data', 'There are no results to export.');
            return;
        }
        
        // Calculate total votes
        const totalVotes = this.candidatesData.reduce((sum, candidate) => sum + parseInt(candidate.voteCount), 0);
        
        // Prepare CSV content
        let csvContent = 'ID,Name,Party,Votes,Percentage\n';
        
        this.candidatesData.forEach(candidate => {
            const percentage = totalVotes > 0 ? ((parseInt(candidate.voteCount) / totalVotes) * 100).toFixed(2) : '0.00';
            csvContent += `${candidate.id},"${candidate.name}","${candidate.party}",${candidate.voteCount},${percentage}%\n`;
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `election_results_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.debugLog('Results exported to CSV');
    }
 }
 
 // Initialize the application when the page loads
 document.addEventListener('DOMContentLoaded', () => {
    // Create admin dashboard instance
    const adminDashboard = new AdminDashboard();
    
    // Log initialization
    console.log('Admin Dashboard Initialized');
 });