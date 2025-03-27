import { ethers } from 'ethers';

/**
 * Utility functions for blockchain interactions
 */
const blockchainUtils = {
  /**
   * Check if MetaMask is installed
   * @returns {boolean} True if MetaMask is installed
   */
  isMetaMaskInstalled: () => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  },
  
  /**
   * Get the current Ethereum provider
   * @returns {Object} Ethereum provider
   */
  getProvider: () => {
    if (!blockchainUtils.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed');
    }
    return new ethers.providers.Web3Provider(window.ethereum);
  },
  
  /**
   * Connect to MetaMask wallet
   * @returns {Promise<string>} Wallet address
   */
  connectWallet: async () => {
    try {
      const provider = blockchainUtils.getProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      return await signer.getAddress();
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      throw error;
    }
  },
  
  /**
   * Sign a message with the connected wallet
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Signature
   */
  signMessage: async (message) => {
    try {
      const provider = blockchainUtils.getProvider();
      const signer = provider.getSigner();
      return await signer.signMessage(message);
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  },
  
  /**
   * Verify a signature
   * @param {string} message - Original message
   * @param {string} signature - Signature to verify
   * @param {string} address - Address that signed the message
   * @returns {boolean} True if signature is valid
   */
  verifySignature: (message, signature, address) => {
    try {
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  },
  
  /**
   * Format a wallet address for display
   * @param {string} address - Wallet address
   * @param {number} startChars - Number of characters to show at start
   * @param {number} endChars - Number of characters to show at end
   * @returns {string} Formatted address
   */
  formatAddress: (address, startChars = 6, endChars = 4) => {
    if (!address) return '';
    return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
  },
  
  /**
   * Get the network name
   * @returns {Promise<string>} Network name
   */
  getNetworkName: async () => {
    try {
      const provider = blockchainUtils.getProvider();
      const network = await provider.getNetwork();
      
      const networks = {
        1: 'Ethereum Mainnet',
        3: 'Ropsten Testnet',
        4: 'Rinkeby Testnet',
        5: 'Goerli Testnet',
        42: 'Kovan Testnet',
        56: 'Binance Smart Chain',
        97: 'BSC Testnet',
        137: 'Polygon Mainnet',
        80001: 'Mumbai Testnet'
      };
      
      return networks[network.chainId] || `Chain ID: ${network.chainId}`;
    } catch (error) {
      console.error('Error getting network:', error);
      return 'Unknown Network';
    }
  },
  
  /**
   * Generate a random challenge message
   * @param {string} prefix - Prefix for the challenge
   * @returns {string} Challenge message
   */
  generateChallenge: (prefix = 'IEBC-Verify') => {
    const randomString = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now();
    return `${prefix}-${randomString}-${timestamp}`;
  },
  
  /**
   * Check if the user has switched accounts
   * @param {string} storedAddress - Previously stored address
   * @returns {Promise<boolean>} True if account has changed
   */
  hasAccountChanged: async (storedAddress) => {
    try {
      const currentAddress = await blockchainUtils.connectWallet();
      return currentAddress.toLowerCase() !== storedAddress.toLowerCase();
    } catch (error) {
      console.error('Error checking account change:', error);
      return false;
    }
  }
};

export default blockchainUtils; 