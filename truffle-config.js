// truffle-config.js
module.exports = {
  networks: {
      development: {
          host: "127.0.0.1",     // Localhost (Ganache)
          port: 7545,            // Your specified port
          network_id: "*",       // Match any network ID (as you had it)
          gas: 6721975,          // Gas limit for complex transactions
          gasPrice: 20000000000  // 20 Gwei, reasonable default
      },
      // Optional: Sepolia testnet (uncomment and configure if needed)
      /*
      sepolia: {
          provider: () => new HDWalletProvider({
              mnemonic: { phrase: "your 12-word mnemonic here" },
              providerOrUrl: "https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID"
          }),
          network_id: 11155111,  // Sepolia network ID
          gas: 5500000,
          gasPrice: 20000000000, // 20 Gwei
          skipDryRun: true
      }
      */
  },
  compilers: {
      solc: {
          version: "0.8.17",    // Matches Voting.sol
          settings: {
              optimizer: {
                  enabled: true,   // Optimize for gas efficiency
                  runs: 200        // Optimization runs
              }
          }
      }
  },
  contracts_build_directory: "./build/contracts" // Ensure frontend can find Voting.json
};