# Ethereum $Push Notification Service (EPNS)
## PUSH Tokens and Time Vesting Smart Contracts

[![Build Status](https://travis-ci.com/ethereum-push-notification-service/epns-smart-contracts-staging.svg?token=3pZwaXsWcsvpExABUhSW&branch=master)](https://travis-ci.com/ethereum-push-notification-service/epns-smart-contracts-staging)

The repo contains smart contracts that form the **$PUSH** token functionality and all the vesting contracts functionality including their test cases.

## Setup

  - Clone repo
  - Run **npm install**
  - Run **npm start** first to setup **enviroment variables**
  - Run **hardhat** functions
  - Read more about Hardhat here: https://hardhat.org/

### Initial Setup Example
```sh
npm install
npm start
npx hardhat [operations]
```

## Compiling
For compiling the smart contracts placed under contracts
```sh
npx hardhat compile
```

## Testing
The test folder contains various test cases in different test files.

### Run Entire Testcases
```sh
npx hardhat test
```

### Run Specific Testcases
```sh
npx hardhat test ./test/EPNS.NonERC20.test
npx hardhat test ./test/EPNS.StandardERC20.test
```

## Deploy
To deploy smart contracts on a selected network

### Deploy on the default network
```sh
npx hardhat run scripts/deploy.js
```

### Deploy on different network
```sh
npx hardhat run scripts/deploy.js --network ropsten
```
