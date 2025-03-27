# Blockchain-Based Electoral Management System

A secure, transparent, and decentralized voting system built using blockchain technology.

## Overview

This system provides a robust platform for conducting secure elections using blockchain technology, ensuring transparency and immutability of votes while maintaining voter privacy.

## Features

- **Enhanced Security**: Multi-factor authentication with National ID and blockchain wallet verification
- **Interactive UI**: Dynamic particles background and modern interface design
- **MetaMask Integration**: Seamless wallet connection with real-time status updates
- **Dual Authentication**: National ID + Blockchain wallet ensures voter identity integrity
- **Admin Dashboard**: Comprehensive election management interface with real-time monitoring
- **Real-Time Results**: Immediate and transparent vote counting with blockchain verification
- **Responsive Design**: Optimized for all devices with dark/light theme support

## System Requirements

- Node.js (v14 or later)
- MetaMask browser extension
- PowerShell (Windows) or Terminal (Unix)
- Modern web browser (Chrome, Firefox, Edge)
- Git

## Installation & Setup

1. Clone the repository:
```bash
git clone https://github.com/eliudmichira/Blockchain-Based-Electoral-Management-System.git
cd Blockchain-Based-Electoral-Management-System
```

2. Install dependencies:
```bash
npm install
cd Database_API
npm install
cd ..
```

3. Configure environment:
Create `.env` files in root and Database_API directories with appropriate settings.

4. Start the services:
```bash
# Start Database API
cd Database_API
node server.js

# Start Web Server (in new terminal)
node server.js
```

## Project Structure

```
project/
├── src/
│   ├── js/
│   │   ├── pages/         # Page-specific JavaScript
│   │   └── components/    # Reusable components
│   ├── html/             # HTML templates
│   ├── css/              # Stylesheets
│   ├── assets/           # Static assets
│   └── dist/             # Bundled files
├── build/
│   └── contracts/        # Smart contract artifacts
├── public/              # Public static files
├── Database_API/        # Backend API service
└── server.js           # Main web server
```

## Author

Eliud Michira

© 2025 All rights reserved.

---
Note: This system is a proprietary solution. Unauthorized use, modification, or distribution is prohibited.