# Ethereum $Push Notification Service (EPNS)
## Deployment Script and the flow

The deploy scripts are used to deploy and automate various smart contracts and their relations. In the end, the following scenarios should be acheivable after deploy.

## /scripts/Deploy.sh
This deploys the scripts that is responsible for deploying and verifying the:
- EPNS Token Contract ($PUSH Token)
- Vesting Contracts
- LPPool Rewards
- Staking Rewards

The scripts uses **./constants.js** to pull various information and configuration. The **constants.js** file itself relies on **./config** folder to pull vesting information, number of tokens and other relevant information.

## EPNS Token Contract ($PUSH Token)
#### Description
The $PUSH Token that powers the Ethereum Push Notification Service protocol

#### Sol Files Used
- **/contracts/token/EPNS.sol**

#### Functionality
-- ERC20 Functionality
-- Governance Functionality
-- HolderWeight Functionality (At which point the token holder weight is aggregated based on reward claims or token transfer between different holderweight)
-- Burn Functionality
-- Permit Functionality

## EPNS Token Contract ($PUSH Token)
#### Description
The Vesting / Timelock contracts through which token release is regulated for various actors of the ecosystem (Community, Advisors, Team, Foundation, Investors)

#### Sol Files Used
- **/contracts/token/EPNS.sol**
- **/contracts/vesting/FundsDistributor.sol**
- **/contracts/vesting/FundsDistributorFactory.sol**
- **/contracts/vesting/Reserves.sol**
- **/contracts/vesting/TokenVesting.sol**
- **/contracts/vesting/VestedReserves.sol**

#### Functionality
-- ERC20 Functionality
-- Governance Functionality
-- HolderWeight Functionality (At which point the token holder weight is aggregated based on reward claims or token transfer between different holderweight)
-- Burn Functionality
-- Permit Functionality
