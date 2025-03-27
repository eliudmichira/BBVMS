import axios from 'axios';
import authService from './authService';

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
      // Try to refresh token
      authService.refreshToken().catch(() => {
        // If refresh fails, redirect to login
        window.location.href = '/login';
      });
    }
    return Promise.reject(error);
  }
);

// Data service for constituencies and voter information
const dataService = {
  // Get all constituencies
  getConstituencies: async () => {
    try {
      const response = await api.get('/data/constituencies');
      return response.data;
    } catch (error) {
      // If API fails, return sample data
      console.error('Error fetching constituencies:', error);
      return [
        'Westlands', 'Dagoretti North', 'Dagoretti South', 'Langata', 
        'Kibra', 'Roysambu', 'Kasarani', 'Ruaraka', 'Embakasi South',
        'Embakasi North', 'Embakasi Central', 'Embakasi East', 'Embakasi West',
        'Makadara', 'Kamukunji', 'Starehe', 'Mathare'
      ];
    }
  },
  
  // Get voter information by National ID
  getVoterByNationalId: async (nationalId) => {
    try {
      const response = await api.get(`/voters/by-national-id/${nationalId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get voter information by wallet address
  getVoterByWalletAddress: async (walletAddress) => {
    try {
      const response = await api.get(`/voters/by-wallet/${walletAddress}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Check if voter is eligible to vote
  checkVoterEligibility: async (voterId) => {
    try {
      const response = await api.get(`/voters/eligibility/${voterId}`);
      return response.data.isEligible;
    } catch (error) {
      throw error;
    }
  },
  
  // Check if voter has already voted
  checkVoterStatus: async (voterId) => {
    try {
      const response = await api.get(`/voters/status/${voterId}`);
      return response.data.hasVoted;
    } catch (error) {
      throw error;
    }
  },
  
  // Get candidates for a specific constituency
  getCandidatesByConstituency: async (constituencyId) => {
    try {
      const response = await api.get(`/candidates/constituency/${constituencyId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get all active elections
  getActiveElections: async () => {
    try {
      const response = await api.get('/elections/active');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get election details by ID
  getElectionById: async (electionId) => {
    try {
      const response = await api.get(`/elections/${electionId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get voter statistics (for admin dashboard)
  getVoterStatistics: async () => {
    try {
      const response = await api.get('/admin/voter-statistics');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Offline mode helpers
  isOfflineMode: () => {
    return localStorage.getItem('offline_mode') === 'true';
  },
  
  // Get mock data for offline mode
  getMockConstituencyData: () => {
    return [
      { id: 'westlands', name: 'Westlands' },
      { id: 'dagoretti_north', name: 'Dagoretti North' },
      { id: 'dagoretti_south', name: 'Dagoretti South' },
      { id: 'langata', name: 'Langata' },
      { id: 'kibra', name: 'Kibra' },
      { id: 'roysambu', name: 'Roysambu' },
      { id: 'kasarani', name: 'Kasarani' },
      { id: 'ruaraka', name: 'Ruaraka' },
      { id: 'embakasi_south', name: 'Embakasi South' },
      { id: 'embakasi_north', name: 'Embakasi North' },
      { id: 'embakasi_central', name: 'Embakasi Central' },
      { id: 'embakasi_east', name: 'Embakasi East' },
      { id: 'embakasi_west', name: 'Embakasi West' },
      { id: 'makadara', name: 'Makadara' },
      { id: 'kamukunji', name: 'Kamukunji' },
      { id: 'starehe', name: 'Starehe' },
      { id: 'mathare', name: 'Mathare' }
    ];
  },
  
  // Get mock candidates for offline mode
  getMockCandidates: (constituencyId) => {
    const mockCandidates = {
      'westlands': [
        { id: 1, name: 'John Doe', party: 'Party A', imageUrl: '/images/candidates/john-doe.jpg' },
        { id: 2, name: 'Jane Smith', party: 'Party B', imageUrl: '/images/candidates/jane-smith.jpg' }
      ],
      'kibra': [
        { id: 3, name: 'Alice Johnson', party: 'Party C', imageUrl: '/images/candidates/alice-johnson.jpg' },
        { id: 4, name: 'Bob Brown', party: 'Party A', imageUrl: '/images/candidates/bob-brown.jpg' }
      ]
      // Add more constituencies as needed
    };
    
    return mockCandidates[constituencyId] || [];
  }
};

export default dataService; 