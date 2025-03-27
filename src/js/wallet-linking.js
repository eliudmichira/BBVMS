/**
 * IEBC Blockchain Voting System - Wallet Linking
 * 
 * This script handles the process of linking a National ID to a MetaMask wallet
 * for secure voter verification in the IEBC Blockchain Voting System.
 */

document.addEventListener('DOMContentLoaded', function() {
  // State management
  const state = {
    nationalId: '',
    mobileNumber: '',
    walletAddress: '',
    challenge: '',
    signature: '',
    verificationHash: '',
    currentStep: 1
  };

  // API configuration
  const API_BASE_URL = 'http://localhost:8000'; // Update this as needed
  const API_ENDPOINTS = {
    verifyNationalId: '/api/verify-national-id',
    linkWallet: '/api/link-wallet',
    checkWalletLinkage: '/api/check-wallet-linkage'
  };

  // DOM Elements
  const elements = {
    // Step indicators
    progressSteps: document.getElementById('progress-steps'),
    stepCircles: Array.from({length: 4}, (_, i) => document.getElementById(`step-circle-${i+1}`)),
    connectors: Array.from({length: 3}, (_, i) => document.getElementById(`connector-${i+1}-${i+2}`)),
    
    // Step content containers
    stepContents: Array.from({length: 4}, (_, i) => document.getElementById(`step-content-${i+1}`)),
    
    // Step 1: ID Verification
    idVerificationForm: document.getElementById('id-verification-form'),
    nationalIdInput: document.getElementById('national-id'),
    mobileNumberInput: document.getElementById('mobile-number'),
    verifyIdBtn: document.getElementById('verify-id-btn'),
    idVerificationFeedback: document.getElementById('id-verification-feedback'),
    
    // Step 2: Wallet Connection
    connectWalletBtn: document.getElementById('connect-wallet-btn'),
    walletStatus: document.getElementById('wallet-status'),
    walletAddressDisplay: document.getElementById('wallet-address'),
    walletConnectionFeedback: document.getElementById('wallet-connection-feedback'),
    
    // Step 3: Message Signing
    verificationMessage: document.getElementById('verification-message'),
    signMessageBtn: document.getElementById('sign-message-btn'),
    signatureStatus: document.getElementById('signature-status'),
    signatureDisplay: document.getElementById('signature'),
    messageSigningFeedback: document.getElementById('message-signing-feedback'),
    
    // Step 4: Confirmation
    confirmedNationalId: document.getElementById('confirmed-national-id'),
    confirmedWalletAddress: document.getElementById('confirmed-wallet-address'),
    verificationHash: document.getElementById('verification-hash')
  };

  // Initialize the UI
  function initializeUI() {
    // Set up event listeners
    elements.idVerificationForm.addEventListener('submit', handleIdVerification);
    elements.connectWalletBtn.addEventListener('click', handleWalletConnection);
    elements.signMessageBtn.addEventListener('click', handleMessageSigning);
    
    // Check for MetaMask availability
    checkMetaMaskAvailability();
  }

  // Helper functions
  function showFeedback(element, message, isError) {
    if (!element) return;
    
    element.textContent = message;
    element.classList.remove('hidden', 'bg-green-100', 'bg-red-100', 'text-green-800', 'text-red-800');
    
    if (isError) {
      element.classList.add('bg-red-100', 'text-red-800');
    } else {
      element.classList.add('bg-green-100', 'text-green-800');
    }
    
    element.classList.remove('hidden');
  }

  function setLoading(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
      const originalText = button.textContent;
      button.setAttribute('data-original-text', originalText);
      button.disabled = true;
      button.innerHTML = `<span class="loader"></span> Processing...`;
    } else {
      const originalText = button.getAttribute('data-original-text') || 'Submit';
      button.textContent = originalText;
      button.disabled = false;
    }
  }

  function goToStep(step) {
    if (step < 1 || step > 4) return;
    
    state.currentStep = step;
    
    // Update step indicators
    elements.stepCircles.forEach((circle, index) => {
      if (index + 1 < step) {
        // Completed steps
        circle.classList.remove('active');
        circle.classList.add('completed');
        circle.innerHTML = '✓';
      } else if (index + 1 === step) {
        // Current step
        circle.classList.add('active');
        circle.classList.remove('completed');
        circle.textContent = index + 1;
      } else {
        // Future steps
        circle.classList.remove('active', 'completed');
        circle.textContent = index + 1;
      }
    });
    
    // Update connectors
    elements.connectors.forEach((connector, index) => {
      if (index + 1 < step) {
        connector.classList.add('active');
      } else {
        connector.classList.remove('active');
      }
    });
    
    // Show the current step's content
    elements.stepContents.forEach((content, index) => {
      if (index + 1 === step) {
        content.classList.remove('hidden');
      } else {
        content.classList.add('hidden');
      }
    });
  }

  // Check if MetaMask is available
  function checkMetaMaskAvailability() {
    if (typeof window.ethereum === 'undefined') {
      // MetaMask is not installed
      showFeedback(elements.idVerificationFeedback, 'MetaMask is not installed. You need MetaMask to link your wallet.', true);
      
      // Disable the submit button
      elements.verifyIdBtn.disabled = true;
      
      // Add a button to install MetaMask
      const installButton = document.createElement('a');
      installButton.href = 'https://metamask.io/download.html';
      installButton.target = '_blank';
      installButton.className = 'mt-4 inline-block w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700';
      installButton.textContent = 'Install MetaMask';
      
      elements.idVerificationFeedback.insertAdjacentElement('afterend', installButton);
    }
  }

  // Step 1: Handle ID Verification
  async function handleIdVerification(e) {
    e.preventDefault();
    
    // Get input values
    const nationalId = elements.nationalIdInput.value.trim();
    const mobileNumber = elements.mobileNumberInput.value.trim();
    
    // Validate inputs
    if (!nationalId || !mobileNumber) {
      showFeedback(elements.idVerificationFeedback, 'Please fill in all fields.', true);
      return;
    }
    
    // Basic validation for National ID
    if (nationalId.length < 6) {
      showFeedback(elements.idVerificationFeedback, 'Please enter a valid National ID.', true);
      return;
    }
    
    // Basic validation for mobile number
    if (!mobileNumber.startsWith('+')) {
      showFeedback(elements.idVerificationFeedback, 'Mobile number should include country code (e.g., +254).', true);
      return;
    }
    
    // Show loading state
    setLoading(elements.verifyIdBtn, true);
    
    try {
      // Save to state
      state.nationalId = nationalId;
      state.mobileNumber = mobileNumber;
      
      // Call API to verify National ID
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.verifyNationalId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          national_id: nationalId,
          mobile_number: mobileNumber
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Store the challenge
        state.challenge = data.challenge;
        
        // Show success message
        showFeedback(elements.idVerificationFeedback, 'National ID verified successfully! Please connect your wallet in the next step.', false);
        
        // Wait a moment before proceeding to next step
        setTimeout(() => {
          goToStep(2);
        }, 1500);
      } else {
        // Show error message
        showFeedback(elements.idVerificationFeedback, data.message || 'National ID verification failed. Please check your information and try again.', true);
      }
    } catch (error) {
      console.error('Error during National ID verification:', error);
      showFeedback(elements.idVerificationFeedback, 'An error occurred. Please try again later.', true);
    } finally {
      // Reset loading state
      setLoading(elements.verifyIdBtn, false);
    }
  }

  // Step 2: Handle Wallet Connection
  async function handleWalletConnection() {
    // Show loading state
    setLoading(elements.connectWalletBtn, true);
    
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        showFeedback(elements.walletConnectionFeedback, 'MetaMask is not installed. Please install MetaMask to continue.', true);
        return;
      }
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const walletAddress = accounts[0];
      
      // Save to state
      state.walletAddress = walletAddress;
      
      // Update UI
      elements.walletAddressDisplay.textContent = walletAddress;
      elements.walletStatus.classList.remove('hidden');
      
      // Show success message
      showFeedback(elements.walletConnectionFeedback, 'Wallet connected successfully! Please sign the verification message in the next step.', false);
      
      // Set up the verification message for the next step
      elements.verificationMessage.textContent = state.challenge;
      
      // Wait a moment before proceeding to next step
      setTimeout(() => {
        goToStep(3);
      }, 1500);
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      
      if (error.code === 4001) {
        // User rejected the request
        showFeedback(elements.walletConnectionFeedback, 'Wallet connection rejected. Please approve the connection in MetaMask.', true);
      } else {
        showFeedback(elements.walletConnectionFeedback, 'Error connecting to wallet. Please try again.', true);
      }
    } finally {
      // Reset loading state
      setLoading(elements.connectWalletBtn, false);
    }
  }

  // Step 3: Handle Message Signing
  async function handleMessageSigning() {
    // Show loading state
    setLoading(elements.signMessageBtn, true);
    
    try {
      // Check if we have the necessary information
      if (!state.walletAddress || !state.challenge) {
        showFeedback(elements.messageSigningFeedback, 'Missing wallet address or challenge message. Please go back and try again.', true);
        return;
      }
      
      // Request signature from MetaMask
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [state.challenge, state.walletAddress]
      });
      
      // Save to state
      state.signature = signature;
      
      // Update UI
      elements.signatureDisplay.textContent = `${signature.substring(0, 20)}...${signature.substring(signature.length - 20)}`;
      elements.signatureStatus.classList.remove('hidden');
      
      // Call API to link wallet with National ID
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.linkWallet}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          national_id: state.nationalId,
          wallet_address: state.walletAddress,
          signature: state.signature,
          challenge: state.challenge
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Store the verification hash
        state.verificationHash = data.verification_hash;
        
        // Update confirmation screen
        elements.confirmedNationalId.textContent = state.nationalId;
        elements.confirmedWalletAddress.textContent = state.walletAddress;
        elements.verificationHash.textContent = state.verificationHash;
        
        // Show success message
        showFeedback(elements.messageSigningFeedback, 'Signature verified! Your National ID has been successfully linked to your wallet.', false);
        
        // Wait a moment before proceeding to next step
        setTimeout(() => {
          goToStep(4);
        }, 1500);
      } else {
        // Show error message
        showFeedback(elements.messageSigningFeedback, data.message || 'Signature verification failed. Please try again.', true);
      }
    } catch (error) {
      console.error('Error signing message:', error);
      
      if (error.code === 4001) {
        // User rejected the signature request
        showFeedback(elements.messageSigningFeedback, 'Signature request rejected. Please approve the signature in MetaMask.', true);
      } else {
        showFeedback(elements.messageSigningFeedback, 'Error during signature. Please try again.', true);
      }
    } finally {
      // Reset loading state
      setLoading(elements.signMessageBtn, false);
    }
  }

  // Offline Mode Support
  function setupOfflineMode() {
    // Detect if we're in offline mode
    const isOffline = localStorage.getItem('offlineMode') === 'true';
    
    if (isOffline) {
      // Intercept fetch calls for our APIs
      const originalFetch = window.fetch;
      window.fetch = async function(url, options) {
        if (typeof url === 'string' && url.includes('api/verify-national-id')) {
          console.log('Mock: verifyNationalId API call', options);
          return new Response(JSON.stringify({
            success: true,
            message: 'National ID verified successfully',
            challenge: `IEBC-Verify-${Math.random().toString(36).substring(2)}-${Date.now()}`
          }));
        }
        
        if (typeof url === 'string' && url.includes('api/link-wallet')) {
          console.log('Mock: linkWallet API call', options);
          return new Response(JSON.stringify({
            success: true,
            message: 'Wallet successfully linked to National ID',
            verification_hash: `mock-hash-${Math.random().toString(36).substring(2)}`
          }));
        }
        
        if (typeof url === 'string' && url.includes('api/check-wallet-linkage')) {
          console.log('Mock: checkWalletLinkage API call', options);
          return new Response(JSON.stringify({
            success: true,
            isLinked: false
          }));
        }
        
        // For all other requests, use the original fetch
        return originalFetch.apply(this, arguments);
      };
      
      // Display offline mode notification
      const offlineNotice = document.createElement('div');
      offlineNotice.className = 'mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-md text-sm';
      offlineNotice.textContent = 'Running in offline mode. Some features may be simulated.';
      
      document.querySelector('main').insertAdjacentElement('afterbegin', offlineNotice);
    }
  }

  // Initialization
  initializeUI();
  setupOfflineMode();
}); 