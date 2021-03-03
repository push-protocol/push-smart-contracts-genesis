# Ethereum $Push Notification Service (EPNS)
## Deployment Script and the flow

The deploy scripts are used to deploy and automate various smart contracts and their relations. In the end, the following scenarios should be acheivable after deploy.

## /scripts/Deploy.sh
This deploys the scripts responsible for deploying and verifying the:
- EPNS Token Contract ($PUSH Token)
- Vesting Contracts
- LPPool Rewards
- Staking Rewards

The scripts use **./constants.js** to pull various information and configuration. The **constants.js** file itself relies on **./config** folder to pull vesting information, number of tokens and other relevant information.

## EPNS Token Contract ($PUSH Token)
#### Description
The $PUSH Token that powers the Ethereum Push Notification Service protocol

#### Sol Files Used
- **/contracts/token/EPNS.sol**

#### Functionality
- ERC20 Functionality
- Governance Functionality
- HolderWeight Functionality (At which point the token holder weight is aggregated based on reward claims or token transfer between different holderweight)
- Burn Functionality
- Permit Functionality

## Vesting Contracts
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
The deploy scripts segregates the contracts into 5 vectors, the following rules should be achievable with a correct deployment:
- Frontend should be able to attach itself to the contract and pull relevant information
- The deployment in the end should ensure all contracts that still have ownership point to a multisig address which can only be used to control funds for revocable contracts of Advisors, Vested but not utilized tokens of community and foundation

## Vectors
### Community Vectors
The funds deposited over here are meant for use in community / ecosystem related development. The following subvectors are defined:

#### Identifier => CommunityVestedReserves
 - The deploy script should instantiate a controller contract (VestedReserves.sol) where all the allocated tokens that are not used are deposited
 - This contract is going to linearly vest the deposited tokens for the next 45 months
 - The multisig can withdraw the vested tokens and send it to any address

#### Identifier => PublicSaleReserves
- The public sale reserve is meant to be unlocked and can be sent to any address, it is used to conduct public sale for the token

#### Identifier => StrategicAllocationFactory
- The deploy script should instantiate a controller contract (FundsDistributorFactory.sol) where all the allocated tokens are deposited first
- It then reads the config file and deploys two instances (FundsDistributor) that is generated from the config/community.js (strategic)
- The first instance is named as **strategictimelock[1,2,3...]** which will take the percentage of token allocation in config for that strategic actor, the start and duration and will release all the tokens to them once the cliff is completed (plus a 60 seconds vesting)
- The first instance is named as **strategicvested[1,2,3...]** which will take the percentage of token allocation in config for that strategic actor, and will setup a linear vesting whose duration is defined in the config but the start is always after the timelock expiry
- Both these instances will allow the individual player to send the tokens to any address of their choice provided rules are followed
- The Multisig / Contract creator has no role or control in these contracts
- The total of both the contracts should never exceed the allocation specified in config

### Advisors
#### Identifier => AdvisorsFactory
- The deploy script should instantiate a controller contract (FundsDistributorFactory.sol) where all the allocated tokens are deposited first
- It then reads the config file and deploys two instances (FundsDistributor) that is generated from the config/advisors.js
- The script then deploys all advisors as per their tokens amount, duration, cliff and start time for the advisors
- The instance is named as **advisors[1,2,3...]**
- The Multisig / Contract creator can revoke the pending tokens in these contracts
- When revoked the tokens should return back to AdvisorsFactory
- The instances will allow the individual player to send the tokens to any address of their choice provided rules are followed
- The Multisig / Contract creator has to follow the cliff as specified in the config before they can claim the tokens back
- However the multisig / contract creator can create other instances of Advisors provided there is enough fund in the controller contract

### Team
#### Identifier => TeamFactory
- The deploy script should instantiate a controller contract (FundsDistributorFactory.sol) where all the allocated tokens are deposited first
- It then reads the config file and deploys two instances (FundsDistributor) that is generated from the config/team.js
- The script then deploys all advisors as per their tokens amount, duration, cliff and start time for the advisors
- The instance is named as **team[1,2,3...]**
- The Multisig / Contract creator can revoke the pending tokens in these contracts
- When revoked the tokens should return back to TeamFactory
- The instances will allow the individual player to send the tokens to any address of their choice provided rules are followed
- The Multisig / Contract creator has to follow the cliff as specified in the config before they can claim the tokens back
- However the multisig / contract creator can create other instances of Team provided there is enough fund in the controller contract

### Foundation
#### Identifier => StrategicAllocationFactory
- The deploy script should instantiate two instances that follow different vesting schedules as per the config file that is locaated in config/foundation
- The first instance is named as **FoundationAReserves** and is as per their tokens amount, duration, cliff and start time described in the config
- The second instance is named as **FoundationBReserves** and is as per their tokens amount, duration, cliff and start time described in the config, however one rule for FoundationBReserves is that it has to start after the FoundationAReserves has been completed
- The instances will allow the individual player to send the tokens to any address of their choice provided rules are followed
- The Multisig / Contract creator has no role or control in these contracts
- The total of both the contracts should never exceed the allocation specified in config

### Investors
#### Identifier => InvestorsAllocationFactory
- The deploy script should instantiate a controller contract (FundsDistributorFactory.sol) where all the allocated tokens are deposited first
- It then reads the config file and deploys two instances (FundsDistributor) that is generated from the config/investors.js
- The first instance is named as **investorstimelock[1,2,3...]** which will take the percentage of token allocation in config for that actor, the start and duration and will release all the tokens to them once the cliff is completed (plus a 60 seconds vesting)
- The first instance is named as **investorsvested[1,2,3...]** which will take the percentage of token allocation in config for that actor, and will setup a linear vesting whose duration is defined in the config but the start is always after the timelock expiry
- Both these instances will allow the individual player to send the tokens to any address of their choice provided rules are followed
- The Multisig / Contract creator has no role or control in these contracts
- The total of both the contracts should never exceed the allocation specified in config
