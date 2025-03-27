const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

/**
 * IMPORTANT: To start this server in PowerShell:
 * 1. Use: cd .. ; node server.js    (note the semicolon instead of &&)
 * 2. Or better, run directly: node server.js
 * 
 * PowerShell doesn't support the && operator - use ; instead
 */

const app = express();
const PORT = process.env.PORT || 8080;

// Enhanced CORS config
app.use(cors({
  origin: 'http://localhost:8080',  // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Updated CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://fonts.googleapis.com; connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 ws://localhost:8000 wss://localhost:8000; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https://*; frame-src 'self'"
  );
  next();
});

// Debug middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with updated paths
app.use('/js', express.static(path.join(__dirname, 'src/js')));
app.use('/js/pages', express.static(path.join(__dirname, 'src/js/pages')));
app.use('/js/components', express.static(path.join(__dirname, 'src/js/components')));
app.use('/css', express.static(path.join(__dirname, 'src/css')));
app.use('/assets', express.static(path.join(__dirname, 'src/assets')));
app.use('/dist', express.static(path.join(__dirname, 'src/dist')));
app.use('/build/contracts', express.static(path.join(__dirname, 'build/contracts')));
app.use(express.static(path.join(__dirname, 'public')));

// Mock API endpoints for development
app.get('/api/data/constituencies', (req, res) => {
  const constituencies = [
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
  res.json(constituencies);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Web server running. Database API should be running at http://localhost:8000'
  });
});

// Proxy for Database API status
app.get('/api/db-status', async (req, res) => {
  try {
    const response = await fetch('http://localhost:8000/health');
    const data = await response.json();
    res.json({
      web_server: { status: 'ok', timestamp: new Date().toISOString() },
      database_api: data
    });
  } catch (error) {
    res.json({
      web_server: { status: 'ok', timestamp: new Date().toISOString() },
      database_api: { status: 'error', message: 'Cannot connect to Database API' }
    });
  }
});

// Add proxy endpoint for API testing
app.get('/proxy/api-test', async (req, res) => {
  try {
    const response = await fetch('http://localhost:8000/api-test');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(200).json({ 
      status: 'error', 
      message: 'Cannot connect to Database API',
      timestamp: new Date().toISOString()
    });
  }
});

// Add proxy endpoint for voting dates
app.get('/proxy/voting/dates', (req, res) => {
  // Current timestamp in seconds
  const now = Math.floor(Date.now() / 1000);
  
  // Mock voting dates (one hour ago to one hour from now)
  res.json({
    start_date: now - 3600,
    end_date: now + 3600
  });
});

// Serve static files from the src/html directory for development
app.use(express.static(path.join(__dirname, 'src', 'html')));

// Fallback route for HTML files in development
app.get('/:page.html', (req, res) => {
  const page = req.params.page;
  res.sendFile(path.join(__dirname, 'src', 'html', `${page}.html`));
});

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'index.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/login.html'));
});

app.get('/link-wallet.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/link-wallet.html'));
});

app.get('/react-wallet-linking.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/react-wallet-linking.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
  console.log(`Login page available at http://localhost:${PORT}/login.html`);
  console.log(`React wallet linking page available at http://localhost:${PORT}/react-wallet-linking.html`);
  console.log(`IMPORTANT: Make sure the Database API is running at http://localhost:8000`);
}); 