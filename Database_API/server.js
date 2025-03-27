const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.DB_PORT || 8000;

// Database configuration
const DB_FILE = path.join(__dirname, 'users.json');

// Database utility functions
function initDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }));
        console.log('User database initialized at', DB_FILE);
    }
}

function loadUsers() {
    try {
        initDatabase();
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data).users || [];
    } catch (error) {
        console.error('Error loading users database:', error);
        return [];
    }
}

function saveUsers(users) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users }, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving users database:', error);
        return false;
    }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt };
}

function verifyPassword(password, hash, salt) {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
}

function findUserByNationalId(nationalId) {
    console.log(`Looking for user with National ID: ${nationalId}`);
    if (!nationalId) {
        console.log('Invalid National ID provided (null or empty)');
        return null;
    }
    
    try {
        const users = loadUsers();
        const user = users.find(user => user.nationalId === nationalId);
        console.log(user ? `User found: ${user.id}` : 'User not found');
        return user || null;
    } catch (error) {
        console.error('Error finding user by National ID:', error);
        return null;
    }
}

function findUserByWalletAddress(walletAddress) {
    console.log(`Looking for user with wallet address: ${walletAddress}`);
    if (!walletAddress) {
        console.log('Invalid wallet address provided (null or empty)');
        return null;
    }
    
    try {
        const users = loadUsers();
        const user = users.find(user => user.walletAddress === walletAddress);
        console.log(user ? `User found: ${user.id}` : 'User not found');
        return user || null;
    } catch (error) {
        console.error('Error finding user by wallet address:', error);
        return null;
    }
}

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register new user
app.post('/api/register', (req, res) => {
    const { nationalId, password, walletAddress } = req.body;
    
    if (!nationalId || !password || !walletAddress) {
        return res.status(400).json({
            success: false,
            message: 'National ID, password, and wallet address are required'
        });
    }
    
    const users = loadUsers();
    
    // Check if user already exists
    if (users.some(user => user.nationalId === nationalId)) {
        return res.status(400).json({ 
            success: false, 
            message: 'User with this National ID already exists' 
        });
    }
    
    // Check if wallet is already linked
    if (users.some(user => user.walletAddress === walletAddress)) {
        return res.status(400).json({ 
            success: false, 
            message: 'This wallet address is already linked to another account' 
        });
    }
    
    // Hash password
    const { hash, salt } = hashPassword(password);
    
    // Create new user
    const newUser = {
        id: crypto.randomUUID(),
        nationalId,
        passwordHash: hash,
        passwordSalt: salt,
        walletAddress,
        created: new Date().toISOString(),
        lastLogin: null,
        role: 'voter'
    };
    
    // Add user to database
    users.push(newUser);
    
    // Save updated users
    if (saveUsers(users)) {
        res.status(201).json({ 
            success: true, 
            message: 'User created successfully',
            user: {
                id: newUser.id,
                nationalId: newUser.nationalId,
                walletAddress: newUser.walletAddress,
                role: newUser.role
            }
        });
    } else {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to save user' 
        });
    }
});

// Login with National ID and password
app.post('/api/login', (req, res) => {
    const { nationalId, password } = req.body;
    
    if (!nationalId || !password) {
        return res.status(400).json({
            success: false,
            message: 'National ID and password are required'
        });
    }
    
    const user = findUserByNationalId(nationalId);
    
    if (!user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid credentials' 
        });
    }
    
    if (verifyPassword(password, user.passwordHash, user.passwordSalt)) {
        // Update last login time
        const users = loadUsers();
        const index = users.findIndex(u => u.nationalId === nationalId);
        
        if (index !== -1) {
            users[index].lastLogin = new Date().toISOString();
            saveUsers(users);
        }
        
        // Generate a simple token for session management
        const token = Buffer.from(Math.random().toString() + Date.now().toString()).toString('base64');
        
        res.json({
            success: true,
            message: 'Authentication successful',
            token,
            expiresIn: 3600,
            user: {
                id: user.id,
                nationalId: user.nationalId,
                walletAddress: user.walletAddress,
                role: user.role
            }
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'Invalid credentials' 
        });
    }
});

// Verify National ID
app.post('/api/verify-national-id', (req, res) => {
    // Accept both camelCase and snake_case for compatibility
    const nationalId = req.body.nationalId || req.body.national_id;
    const mobileNumber = req.body.mobileNumber || req.body.mobile_number;
    
    if (!nationalId || !mobileNumber) {
        return res.status(400).json({
            success: false,
            message: 'National ID and mobile number are required'
        });
    }
    
    // Check if user already exists
    const user = findUserByNationalId(nationalId);
    
    // Generate a challenge for verification
    const challenge = `IEBC-Verify-${Math.random().toString(36).substring(2)}-${Date.now()}`;
    
    if (user) {
        // For simplicity, we're not validating the mobile number here
        res.json({
            success: true,
            message: 'National ID verified successfully',
            challenge
        });
    } else {
        // For demo purposes, we'll consider all IDs valid
        res.json({
            success: true,
            message: 'National ID verified successfully. You will need to create an account.',
            challenge
        });
    }
});

// Link wallet to National ID
app.post('/api/link-wallet', (req, res) => {
    // Accept both camelCase and snake_case for compatibility
    const nationalId = req.body.nationalId || req.body.national_id;
    const walletAddress = req.body.walletAddress || req.body.wallet_address;
    const signature = req.body.signature;
    const challenge = req.body.challenge;
    
    if (!nationalId || !walletAddress || !signature) {
        return res.status(400).json({
            success: false,
            message: 'National ID, wallet address, and signature are required'
        });
    }
    
    const users = loadUsers();
    const userIndex = users.findIndex(user => user.nationalId === nationalId);
    
    if (userIndex === -1) {
        return res.status(400).json({ 
            success: false, 
            message: 'National ID not found' 
        });
    }
    
    // Check if wallet is already linked to another account
    if (users.some(user => user.walletAddress === walletAddress && user.nationalId !== nationalId)) {
        return res.status(400).json({ 
            success: false, 
            message: 'This wallet address is already linked to another account' 
        });
    }
    
    // Update user's wallet address
    users[userIndex].walletAddress = walletAddress;
    
    // Save updated users
    if (saveUsers(users)) {
        res.json({ 
            success: true, 
            message: 'Wallet address linked successfully',
            user: {
                id: users[userIndex].id,
                nationalId: users[userIndex].nationalId,
                walletAddress: users[userIndex].walletAddress
            }
        });
    } else {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to link wallet address' 
        });
    }
});

// Check if wallet is linked
app.post('/api/check-wallet-linkage', (req, res) => {
    // Accept both camelCase and snake_case for compatibility
    const walletAddress = req.body.walletAddress || req.body.wallet_address;
    
    if (!walletAddress) {
        return res.status(400).json({
            success: false,
            message: 'Wallet address is required'
        });
    }
    
    const user = findUserByWalletAddress(walletAddress);
    
    if (user) {
        res.json({
            success: true,
            message: 'Wallet is linked',
            user: {
                nationalId: user.nationalId,
                walletAddress: user.walletAddress
            }
        });
    } else {
        res.json({
            success: false,
            message: 'Wallet is not linked to any National ID'
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Database API server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}/health`);
}); 