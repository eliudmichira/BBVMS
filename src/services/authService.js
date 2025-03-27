import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors (expired token)
    if (error.response && error.response.status === 401) {
      // Clear local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_role');
      localStorage.removeItem('wallet_address');
      localStorage.removeItem('user_id');
      
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication service
const authService = {
  // Traditional login with National ID and password
  login: async (nationalId, password) => {
    try {
      const response = await api.post('/auth/login', { nationalId, password });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get wallet verification challenge
  getWalletChallenge: async (walletAddress) => {
    try {
      const response = await api.get(`/auth/verify-wallet?address=${walletAddress}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Validate signature for wallet verification
  validateSignature: async (data) => {
    try {
      const response = await api.post('/auth/validate-signature', data);
      
      // Store authentication data in localStorage
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user_role', response.data.role);
        localStorage.setItem('wallet_address', data.address);
        localStorage.setItem('user_id', response.data.userId);
        
        // Additional voter data if available
        if (response.data.voterData) {
          localStorage.setItem('voter_id', response.data.voterData.voterId);
          localStorage.setItem('constituency', response.data.voterData.constituency);
          localStorage.setItem('is_eligible', response.data.voterData.isEligible);
          localStorage.setItem('has_voted', response.data.voterData.hasVoted);
        }
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },
  
  // Get current user role
  getUserRole: () => {
    return localStorage.getItem('user_role') || 'voter';
  },
  
  // Get user data from localStorage
  getUserData: () => {
    return {
      userId: localStorage.getItem('user_id'),
      walletAddress: localStorage.getItem('wallet_address'),
      role: localStorage.getItem('user_role'),
      voterId: localStorage.getItem('voter_id'),
      constituency: localStorage.getItem('constituency'),
      isEligible: localStorage.getItem('is_eligible') === 'true',
      hasVoted: localStorage.getItem('has_voted') === 'true'
    };
  },
  
  // Logout user
  logout: () => {
    // Clear all auth-related localStorage items
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('user_id');
    localStorage.removeItem('voter_id');
    localStorage.removeItem('constituency');
    localStorage.removeItem('is_eligible');
    localStorage.removeItem('has_voted');
    
    // Redirect to login page
    window.location.href = '/login';
  },
  
  // Refresh token if needed
  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh-token');
      
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      // If refresh fails, logout
      authService.logout();
      throw error;
    }
  },
  
  // Register new voter (for admin use)
  registerVoter: async (voterData) => {
    try {
      const response = await api.post('/auth/register', voterData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Link wallet address to National ID
  linkWalletToNationalId: async (nationalId, walletAddress) => {
    try {
      const response = await api.post('/auth/link-wallet', { nationalId, walletAddress });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default authService; 