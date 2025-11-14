# CipherWaveSync - Encrypted Message System

<div align="center">
  <img src="frontend/app/icon.svg" alt="CipherWaveSync Logo" width="120"/>
  
  **A decentralized encrypted messaging platform powered by FHEVM technology**
  
  [🚀 Live Demo](https://cipher-wave-sync.vercel.app/) | [📖 Documentation](https://docs.zama.ai/fhevm)
</div>

## 🌟 Overview

CipherWaveSync is an innovative encrypted messaging system that leverages Fully Homomorphic Encryption (FHE) to enable secure, private communication on the blockchain. Built on Zama's FHEVM protocol, it allows users to submit and manage encrypted messages that remain confidential throughout their lifecycle.

### 🎥 Demo Video

![Demo Video](./cipher-wave-sync-demo.mp4)

Watch the full demonstration to see CipherWaveSync in action!

### Key Features

- 🔐 **End-to-End Encryption**: Messages are encrypted using FHE technology
- 🎨 **Modern UI**: Beautiful, responsive interface built with Next.js and TailwindCSS
- 🔗 **Blockchain Integration**: Secure storage on Ethereum-compatible networks
- 🔑 **Wallet Authentication**: MetaMask integration for secure user authentication
- 📊 **Real-time Visualization**: Animated waveform display for enhanced UX
- ✅ **Comprehensive Testing**: Full test coverage for smart contracts

## 🚀 Quick Start

For detailed FHEVM instructions see:
[FHEVM Hardhat Quick Start Tutorial](https://docs.zama.ai/protocol/solidity-guides/getting-started/quick-start-tutorial)

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm or yarn/pnpm**: Package manager

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   ```bash
   npx hardhat vars set MNEMONIC

   # Set your Infura API key for network access
   npx hardhat vars set INFURA_API_KEY

   # Optional: Set Etherscan API key for contract verification
   npx hardhat vars set ETHERSCAN_API_KEY
   ```

3. **Compile and test**

   ```bash
   npm run compile
   npm run test
   ```

4. **Deploy to local network**

   ```bash
   # Start a local FHEVM-ready node
   npx hardhat node
   # Deploy to local network
   npx hardhat deploy --network localhost
   ```

5. **Deploy to Sepolia Testnet**

   ```bash
   # Deploy to Sepolia
   npx hardhat deploy --network sepolia
   # Verify contract on Etherscan
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
   ```

6. **Test on Sepolia Testnet**

   ```bash
   # Once deployed, you can run a simple test on Sepolia.
   npx hardhat test --network sepolia
   ```

## 📁 Project Structure

```
cipher-wave-sync/
├── contracts/                    # Smart contract source files
│   ├── EncryptedMessages.sol    # Main encrypted messaging contract
│   └── FHECounter.sol           # Example FHE counter contract
├── frontend/                     # Next.js frontend application
│   ├── app/                     # Next.js app directory
│   ├── components/              # React components
│   ├── hooks/                   # Custom React hooks
│   ├── fhevm/                   # FHEVM integration utilities
│   └── abi/                     # Contract ABIs
├── deploy/                      # Deployment scripts
├── tasks/                       # Hardhat custom tasks
├── test/                        # Test files
├── hardhat.config.ts            # Hardhat configuration
└── package.json                 # Dependencies and scripts
```

## 📜 Available Scripts

| Script             | Description              |
| ------------------ | ------------------------ |
| `npm run compile`  | Compile all contracts    |
| `npm run test`     | Run all tests            |
| `npm run coverage` | Generate coverage report |
| `npm run lint`     | Run linting checks       |
| `npm run clean`    | Clean build artifacts    |

## 📚 Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Setup Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [FHEVM Testing Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat/write_test)
- [FHEVM Hardhat Plugin](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/zama-ai/fhevm/issues)
- **Documentation**: [FHEVM Docs](https://docs.zama.ai)
- **Community**: [Zama Discord](https://discord.gg/zama)

## 🎯 Use Cases

- **Private Messaging**: Send encrypted messages that remain confidential on-chain
- **Secure Data Storage**: Store sensitive information with FHE protection
- **Confidential Voting**: Enable private voting mechanisms
- **Anonymous Transactions**: Conduct transactions with enhanced privacy

## 🛠️ Technology Stack

- **Smart Contracts**: Solidity 0.8.24 with FHEVM
- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: TailwindCSS, shadcn/ui
- **Blockchain**: Ethereum, Hardhat
- **Encryption**: Zama FHEVM Protocol
- **Wallet**: MetaMask integration via wagmi

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ using FHEVM technology by Zama**
