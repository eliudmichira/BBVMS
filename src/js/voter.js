// Configuration
const API_URL = "http://localhost:8000";
const CONTRACT_ADDRESS = "0xa95f9E532a1Cd51fD03052A8E5f04528287f8fca";

// State variables
let provider;
let signer;
let votingContract;
let selectedCandidateId = null;
let votingStatus = null;

document.addEventListener("DOMContentLoaded", async () => {
    // Get authentication data
    const token = localStorage.getItem("token");
    const voterId = localStorage.getItem("voterId");
    const role = localStorage.getItem("role");
    
    // Check if user is logged in
    if (!token || !voterId) {
        window.location.href = "login.html";
        return;
    }
    
    // DOM Elements
    const walletAddress = document.getElementById("walletAddress");
    const logoutButton = document.getElementById("logoutButton");
    const voteButton = document.getElementById("voteButton");
    const candidateList = document.getElementById("candidateList");
    const statusAlert = document.getElementById("statusAlert");
    const statusMessage = document.getElementById("statusMessage");
    const feedback = document.getElementById("feedback");
    const feedbackContainer = document.getElementById("feedbackContainer");
    
    // Display wallet address
    if (voterId) {
        walletAddress.textContent = `${voterId.substring(0, 6)}...${voterId.substring(voterId.length - 4)}`;
        walletAddress.title = voterId;
        walletAddress.classList.remove("hidden");
    }
    
    // Helper Functions
    function showFeedback(message, isError = false) {
        if (!feedback || !feedbackContainer) return;
        
        feedbackContainer.classList.remove("hidden", "bg-green-800", "bg-red-800");
        feedbackContainer.classList.add(isError ? "bg-red-800" : "bg-green-800");
        feedback.textContent = message;
        feedback.className = "text-white";
        
        // Auto-hide success messages after 5 seconds
        if (!isError) {
            setTimeout(() => {
                feedbackContainer.classList.add("hidden");
            }, 5000);
        }
    }
    
    function setLoading(button, isLoading, loadingText = "Processing...", originalText = null) {
        if (!button) return;
        
        if (isLoading) {
            button._originalText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = `<span class="loader"></span><span>${loadingText}</span>`;
        } else {
            button.disabled = false;
            button.innerHTML = originalText || button._originalText || "Ready";
        }
    }
    
    function updateVotingStatus(status) {
        votingStatus = status;
        
        if (!statusAlert || !statusMessage || !voteButton) return;
        
        statusAlert.classList.remove(
            "hidden", "bg-yellow-200", "bg-green-200", "bg-red-200", 
            "dark:bg-yellow-800", "dark:bg-green-800", "dark:bg-red-800"
        );
        
        switch(status) {
            case "not_started":
                statusAlert.classList.add("bg-yellow-200", "dark:bg-yellow-800");
                statusMessage.textContent = "Voting has not started yet. Please check back later.";
                voteButton.disabled = true;
                break;
            case "active":
                statusAlert.classList.add("bg-green-200", "dark:bg-green-800");
                statusMessage.textContent = "Voting is currently active. Select a candidate and cast your vote!";
                voteButton.disabled = selectedCandidateId === null;
                break;
            case "ended":
                statusAlert.classList.add("bg-red-200", "dark:bg-red-800");
                statusMessage.textContent = "Voting has ended. Results are displayed below.";
                voteButton.disabled = true;
                break;
            default:
                statusAlert.classList.add("hidden");
                break;
        }
        
        statusAlert.classList.add("fade-in");
    }
    
    // Initialize Ethers.js with improved error handling
    async function initWeb3() {
        if (!window.ethereum) {
            showFeedback("MetaMask not installed. Please install MetaMask to use this application.", true);
            return false;
        }
        
        try {
            provider = new ethers.BrowserProvider(window.ethereum);
            await window.ethereum.request({ method: "eth_requestAccounts" });
            signer = await provider.getSigner();
            
            // Load contract
            await initContract();
            return true;
        } catch (error) {
            console.error("MetaMask connection error:", error);
            
            // Provide more specific error messages for common issues
            if (error.code === 4001) {
                showFeedback("You rejected the MetaMask connection request. Please connect to continue.", true);
            } else if (error.code === -32002) {
                showFeedback("MetaMask connection request pending. Please open MetaMask to connect.", true);
            } else {
                showFeedback("MetaMask connection failed: " + error.message, true);
            }
            
            return false;
        }
    }
    
    // Load Voting contract with better error handling
    async function initContract() {
        try {
            const response = await fetch("/build/contracts/Voting.json");
            if (!response.ok) {
                throw new Error(`Failed to load contract ABI: ${response.statusText}`);
            }
            
            const artifact = await response.json();
            votingContract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
            return votingContract;
        } catch (error) {
            console.error("Contract initialization error:", error);
            throw new Error("Failed to initialize voting contract: " + error.message);
        }
    }
    
    // Safe contract call with better error handling
    async function safeContractCall(contractFn, fallbackValue = null, errorMessage = "Contract operation failed") {
        try {
            return await contractFn();
        } catch (error) {
            console.error(errorMessage, error);
            
            // Check for specific error types for better user messages
            let userMessage = error.message;
            
            // Extract custom errors from the contract
            if (error.message.includes("AlreadyVoted")) {
                userMessage = "You have already voted in this election";
            } else if (error.message.includes("VotingNotActive")) {
                userMessage = "Voting is not currently active";
            } else if (error.message.includes("InvalidCandidate")) {
                userMessage = "Invalid candidate selection";
            } else if (error.message.includes("user denied")) {
                userMessage = "Transaction rejected. Please confirm in MetaMask.";
            } else if (error.message.includes("insufficient funds")) {
                userMessage = "Insufficient funds to complete this transaction";
            } else if (error.message.includes("network changed")) {
                userMessage = "Network changed. Please make sure you're connected to the correct network.";
            } else if (error.message.includes("already pending")) {
                userMessage = "You have a pending transaction. Please wait for it to complete.";
            }
            
            // If we have a fallback value, return it instead of throwing
            if (fallbackValue !== null) {
                return fallbackValue;
            }
            
            throw new Error(userMessage);
        }
    }
    
    // Helper function for making API requests with token handling
    async function makeApiRequest(endpoint, method = 'GET', data = null) {
        // Get the most current token
        const currentToken = localStorage.getItem('token');
        const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            }
        };
        
        if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                // Handle 401 Unauthorized specially
                if (response.status === 401) {
                    // Token expired, redirect to login
                    logout(true);
                    throw new Error("Session expired. Please login again.");
                }
                
                // Try to parse error response
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { detail: await response.text() };
                }
                
                throw new Error(errorData.detail || `Request failed with status ${response.status}`);
            }
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
        } catch (error) {
            console.error("API request failed:", error);
            throw error;
        }
    }
    
    // Advanced logout function with proper cleanup
    async function logout(skipApiCall = false) {
        console.log("Logging out user");
        
        // Get tokens before we clear them, for the API call
        const currentToken = localStorage.getItem("token");
        
        // First clear local storage to prevent any further authenticated requests
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("voterId");
        localStorage.removeItem("role");
        sessionStorage.clear();
        
        // Clear any authentication cookies
        document.cookie.split(";").forEach(cookie => {
            const [name] = cookie.trim().split("=");
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        
        // Only make the API logout call if we have a token and skipApiCall is false
        if (currentToken && !skipApiCall) {
            try {
                // Use fetch directly to avoid dependency on makeApiRequest
                await fetch(`${API_URL}/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentToken}`
                    }
                });
                console.log("API logout successful");
            } catch (error) {
                console.error("API logout error:", error);
                // Continue with client-side logout
            }
        }
        
        // Redirect to login page
        window.location.href = "login.html";
    }
    
    // Load voting dates with improved error handling
    async function loadVotingDates() {
        try {
            const datesDisplay = document.getElementById("datesDisplay");
            const datesLoadingIndicator = document.getElementById("datesLoadingIndicator");
            
            if (datesLoadingIndicator) {
                datesLoadingIndicator.classList.remove("hidden");
            }
            
            // First try to get from blockchain for most accurate data
            let votingStart, votingEnd;
            try {
                votingStart = await safeContractCall(
                    () => votingContract.getVotingStart(),
                    0,
                    "Failed to get voting start date from blockchain"
                );
                
                votingEnd = await safeContractCall(
                    () => votingContract.getVotingEnd(),
                    0,
                    "Failed to get voting end date from blockchain"
                );
                
                // Convert from BigInt if needed
                votingStart = typeof votingStart === 'bigint' ? Number(votingStart) : votingStart;
                votingEnd = typeof votingEnd === 'bigint' ? Number(votingEnd) : votingEnd;
                
                console.log("Got voting dates from blockchain:", {start: votingStart, end: votingEnd});
            } catch (blockchainError) {
                console.warn("Couldn't get voting dates from blockchain, falling back to API:", blockchainError);
                // Fallback to API if blockchain call fails
            }
            
            // If blockchain data unavailable, try API
            if (!votingStart || !votingEnd) {
                const data = await makeApiRequest('/voting/dates');
                votingStart = data.start_date;
                votingEnd = data.end_date;
                console.log("Got voting dates from API:", {start: votingStart, end: votingEnd});
            }
            
            if (datesDisplay && votingStart && votingEnd) {
                const start = new Date(votingStart * 1000).toLocaleString();
                const end = new Date(votingEnd * 1000).toLocaleString();
                datesDisplay.textContent = `${start} - ${end}`;
            }
            
            if (datesLoadingIndicator) {
                datesLoadingIndicator.classList.add("hidden");
            }
            
            // Update voting status
            if (votingStart && votingEnd) {
                const now = Date.now() / 1000;
                
                if (now < votingStart) {
                    updateVotingStatus("not_started");
                } else if (now > votingEnd) {
                    updateVotingStatus("ended");
                } else {
                    updateVotingStatus("active");
                }
            }
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
    
    // Load candidates with improved error handling
    async function loadCandidates() {
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
            
            // Check if user has already voted
            const hasVoted = await safeContractCall(
                () => votingContract.hasVoted(voterId),
                false,
                "Failed to check vote status"
            );
            
            // Load candidates
            const candidates = await safeContractCall(
                () => votingContract.getCandidates(),
                [],
                "Failed to load candidates"
            );
            
            candidateList.innerHTML = "";
            
            if (candidates.length === 0) {
                candidateList.innerHTML = `<tr><td colspan="4" class="p-3 text-center">No candidates have been added yet</td></tr>`;
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
            if (hasVoted && voteButton) {
                voteButton.disabled = true;
                voteButton.textContent = "You have already voted";
                voteButton.classList.add("bg-gray-500");
                voteButton.classList.remove("bg-green-600", "hover:bg-green-700");
                showFeedback("You have already cast your vote in this election");
            }
            
            // Add event listeners to radios
            const radios = candidateList.querySelectorAll("input[type='radio']");
            radios.forEach(radio => {
                radio.addEventListener("change", () => {
                    selectedCandidateId = radio.value;
                    if (voteButton && votingStatus === "active" && !hasVoted) {
                        voteButton.disabled = false;
                    }
                });
            });
        } catch (error) {
            console.error("Error loading candidates:", error);
            candidateList.innerHTML = `<tr><td colspan="4" class="p-3 text-center">Failed to load candidates: ${error.message}</td></tr>`;
            showFeedback("Error loading candidates: " + error.message, true);
        }
    }
    
    // Cast vote with enhanced validation and error handling
    async function castVote() {
        if (!voteButton) return;

        // Validate candidate selection
        if (!selectedCandidateId) {
            showFeedback("Please select a candidate", true);
            return;
        }

        // Set loading state
        setLoading(voteButton, true, "Casting vote...");

        // Clear any previous feedback
        if (feedbackContainer) {
            feedbackContainer.classList.add("hidden");
        }

        let candidateCard; // Declare candidateCard here

        try {
            // Double-check if already voted
            const hasVoted = await safeContractCall(
                () => votingContract.hasVoted(voterId),
                false,
                "Failed to check vote status"
            );

            if (hasVoted) {
                showFeedback("You have already voted");
                voteButton.disabled = true;
                voteButton.innerHTML = "Already Voted";
                voteButton.classList.add("bg-gray-500");
                voteButton.classList.remove("bg-green-600", "hover:bg-green-700");
                return;
            }
            
            // Check if voting is active
            const now = Math.floor(Date.now() / 1000);
            const votingStart = await safeContractCall(
                () => votingContract.getVotingStart(),
                0,
                "Failed to get voting start date"
            );
            const votingEnd = await safeContractCall(
                () => votingContract.getVotingEnd(),
                0,
                "Failed to get voting end date"
            );

            
            // Convert from BigInt if needed
            const startTime = typeof votingStart === 'bigint' ? Number(votingStart) : votingStart;
            const endTime = typeof votingEnd === 'bigint' ? Number(votingEnd) : votingEnd;
            
            if (now < startTime) {
                showFeedback("Voting has not started yet", true);
                setLoading(voteButton, false, "Vote");
                return;
            }
            
            if (now > endTime) {
                showFeedback("Voting has ended", true);
                setLoading(voteButton, false, "Vote");
                return;
            }
            
            // Cast vote on chain with enhanced error handling
            showFeedback("Please confirm the transaction in MetaMask...");
            
            const tx = await safeContractCall(
                () => votingContract.vote(selectedCandidateId),
                null,
                "Vote transaction failed"
            );
            
            showFeedback("Transaction submitted! Waiting for confirmation...");
            
            // Add timeout handling to transaction confirmation
            const receipt = await Promise.race([
                tx.wait(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Transaction confirmation timeout")), 60000)
                )
            ]);
            
            console.log("Vote transaction confirmed:", receipt.hash);
            
            // Submit vote to backend
            try {
                await makeApiRequest('/vote', 'POST', { candidate_id: parseInt(selectedCandidateId) });
                console.log("Vote recorded in backend");
            } catch (apiError) {
                console.warn("API vote recording failed, but blockchain vote successful:", apiError);
                // Continue since the blockchain vote worked
            }
            
            showFeedback("Your vote has been successfully recorded!");
            voteButton.disabled = true;
            voteButton.innerHTML = "Vote Cast Successfully";
            voteButton.classList.add("bg-gray-500");
            voteButton.classList.remove("bg-green-600", "hover:bg-green-700");
            
            // Refresh candidates and check vote status
            setTimeout(() => {
                loadCandidates();
            }, 2000);
        } catch (error) {
            console.error("Vote failed:", error);
            showFeedback("Vote failed: " + error.message, true);
            setLoading(voteButton, false, "Vote");
        }
    }
    
    // Event listeners
    voteButton?.addEventListener("click", castVote);
    logoutButton?.addEventListener("click", () => logout());
    
    // Initialize application
    async function initApp() {
        if (await initWeb3()) {
            // Initialize voter functionality
            await loadVotingDates();
            await loadCandidates();
        }
    }
    
    // Start the app
    initApp();
});