// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
require('dotenv').config()

const moment = require('moment')
const hre = require("hardhat");

const fs = require("fs");
const chalk = require("chalk");
const { config, ethers } = require("hardhat");

const { bn, tokens, bnToInt, timeInDays, timeInDate, deployContract, verifyAllContracts } = require('../helpers/utils')
const { versionVerifier, upgradeVersion } = require('../loaders/versionVerifier')
const { verifyTokensAmount } = require('../loaders/tokenAmountVerifier')

const {
  VESTING_INFO,
  DISTRIBUTION_INFO,
  META_INFO,
  STAKING_INFO
} = require("./constants/constants")

// Primary Function
async function main() {
  // Version Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Version Checks \n-----------------------\n`))
  const versionDetails = versionVerifier(["pushTokenAddress"])
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Version Control Passed \n\t\t\t\n`))

  // Token Verification Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Token Verification Checks \n-----------------------\n`))
  verifyTokensAmount();
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Token Verification Passed \n\t\t\t\n`))

  // First deploy all contracts
  console.log(chalk.bgBlack.bold.green(`\n📡 Deploying Contracts \n-----------------------\n`));
  const deployedContracts = await setupAllContracts(versionDetails);
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n All Contracts Deployed \n\t\t\t\n`));

  // Try to verify
  console.log(chalk.bgBlack.bold.green(`\n📡 Verifying Contracts \n-----------------------\n`));
  await verifyAllContracts(deployedContracts, versionDetails);
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n All Contracts Verified \n\t\t\t\n`));

  // Upgrade Version
  console.log(chalk.bgBlack.bold.green(`\n📟 Upgrading Version   \n-----------------------\n`))
  upgradeVersion()
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n ✅ Version upgraded    \n\t\t\t\n`))
}

// Secondary Functions
// Deploy All Contracts
async function setupAllContracts(versionDetails) {
  let deployedContracts = [];
  const signer = await ethers.getSigner(0)

  // Get EPNS ($PUSH) instance first
  const PushToken = await ethers.getContractAt("EPNS", versionDetails.deploy.args.pushTokenAddress)

  // Next Deploy Vesting Factory Contracts
  // Deploy and Setup Investors
  deployedContracts = await setupInvestors(PushToken, deployedContracts, signer)

  return deployedContracts;
}

// Module Deploy - Community
async function setupCommunity(PushToken, deployedContracts, signer) {
  // Setup community reserves
  deployedContracts = await setupCommReserves(PushToken, deployedContracts, signer)

  // Setup Strategic
  deployedContracts = await setupStrategic(PushToken, deployedContracts, signer)

  return deployedContracts
}

async function setupCommReserves(PushToken, deployedContracts, signer) {
  // Deploying Community Reservoir
  const commInitialParams = VESTING_INFO.community.breakdown.commreservoir.deposit
  const commReservoirArgs = [META_INFO.multisigOwnerEventual, commInitialParams.start, commInitialParams.cliff, commInitialParams.duration, true, "Community Vested Reserves"]
  const CommReservoir = await deployContract("VestedReserves", commReservoirArgs, "CommunityVestedReserves")
  deployedContracts.push(CommReservoir)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, CommReservoir, VESTING_INFO.community.breakdown.commreservoir.deposit.tokens, signer)

  // Lastly transfer ownership of community reservoir contract
  console.log(chalk.bgBlue.white(`Changing CommReservoir ownership to eventual owner`))

  const txCommReservoir = await CommReservoir.transferOwnership(META_INFO.multisigOwnerEventual)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${txCommReservoir.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txCommReservoir.hash}`))

  return deployedContracts
}

async function setupStrategic(PushToken, deployedContracts, signer) {
  const strategicFactoryArgs = [PushToken.address, VESTING_INFO.community.breakdown.strategic.deposit.start, VESTING_INFO.community.breakdown.strategic.deposit.cliff, "StrategicAllocationFactory"]
  const StrategicAllocationFactory = await deployContract("FundsDistributorFactory", strategicFactoryArgs, "StrategicAllocationFactory")
  deployedContracts.push(StrategicAllocationFactory)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, StrategicAllocationFactory, VESTING_INFO.community.breakdown.strategic.deposit.tokens, signer)

  // Deploy Factory Instances of Strategic Allocation
  console.log(chalk.bgBlue.white(`Deploying all instances of Strategic Allocation`));

  let count = 0
  const identity = "strategic"

  if(Object.entries(VESTING_INFO.community.breakdown.strategic.factory).length > 0){
    for await (const [key, value] of Object.entries(VESTING_INFO.community.breakdown.strategic.factory)) {
      count = count + 1
      const uniqueTimelockId = `${identity}timelock${count}`
      const uniqueVestedId = `${identity}vested${count}`

      const allocation = value
      const filename = `${StrategicAllocationFactory.filename} -> ${key} (Instance)`

      const tokensInt = bnToInt(bn(allocation.tokens))
      const releaseBuffer = 60 * 10 // 600 seconds

      // split it, timelock
      const timelockStart = allocation.timelocked.start
      const timelockCliff = allocation.timelocked.cliff
      const timelockDuration = timelockCliff + releaseBuffer // add a release buffer of 10 mins

      const timelockTokensInt = Math.floor(tokensInt * (allocation.timelocked.perc / 100))
      const timelockTokens = tokens(timelockTokensInt)

      // vested
      const vestedStart = timelockStart + timelockCliff + releaseBuffer
      const vestedCliff = 0
      const vestedDuration = allocation.vested.duration

      const vestedToknesInt = tokensInt - timelockTokensInt
      const vestedTokens = tokens(vestedToknesInt)

      // Deploy Strategic Allocation Instance
      console.log(chalk.bgBlue.white(`Deploying Strategic Allocation Instance:`), chalk.green(`${filename}`))
      console.log(chalk.bgBlack.gray(`Breakdown: ${tokensInt} [${allocation.tokens}] Tokens`));
      console.log(chalk.bgBlack.gray(`Timelock --> Tokens: ${timelockTokensInt} [${timelockTokens}] Tokens, Start: ${timelockStart} [${timeInDate(timelockStart)}], Cliff: ${timelockCliff} [${timeInDays(timelockCliff)} Days], Duration: ${timelockDuration} [${timeInDays(timelockDuration)} Days]`));
      console.log(chalk.bgBlack.gray(`Vested --> Tokens: ${vestedToknesInt} [${vestedTokens}] Tokens, Start: ${vestedStart} [${timeInDate(vestedStart)}], Cliff: ${vestedCliff} [${timeInDays(vestedCliff)} Days], Duration: ${vestedDuration} [${timeInDays(vestedDuration)} Days]`));

      // keep a tab on contract artifacts
      const contractArtifacts = await ethers.getContractFactory("FundsDistributor")

      // Deploy Timelock
      const txTimelock = await StrategicAllocationFactory.deployFundee(
        allocation.address,
        timelockStart,
        timelockCliff,
        timelockDuration,
        allocation.revocable,
        timelockTokens,
        uniqueTimelockId
      )

      const resultTimelock = await txTimelock.wait()
      const deployedTimelockAddr = resultTimelock["events"][0].address

      console.log(chalk.bgBlack.white(`Transaction hash [Timelock]:`), chalk.gray(`${txTimelock.hash}`));
      console.log(chalk.bgBlack.white(`Transaction etherscan [Timelock]:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txTimelock.hash}`));

      let deployedTimelockContract = await contractArtifacts.attach(deployedTimelockAddr)

      const instanceTimelockArgs = [allocation.address, timelockStart, timelockCliff, timelockDuration, allocation.revocable, uniqueTimelockId]
      deployedTimelockContract.filename = `${StrategicAllocationFactory.filename} -> ${key} (Timelock Instance)`
      deployedTimelockContract.deployargs = instanceTimelockArgs

      deployedContracts.push(deployedTimelockContract)

      // Deploy Vested
      const txVested = await StrategicAllocationFactory.deployFundee(
        allocation.address,
        vestedStart,
        vestedCliff,
        vestedDuration,
        allocation.revocable,
        vestedTokens,
        uniqueVestedId
      )

      const resultVested = await txTimelock.wait()
      const deployedVestedAddr = resultVested["events"][0].address

      console.log(chalk.bgBlack.white(`Transaction hash [Vested]:`), chalk.gray(`${txVested.hash}`));
      console.log(chalk.bgBlack.white(`Transaction etherscan [Vested]:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txVested.hash}`));

      let deployedVestedContract = await contractArtifacts.attach(deployedVestedAddr)

      const instanceVestedArgs = [allocation.address, vestedStart, vestedCliff, vestedDuration, allocation.revocable, uniqueVestedId]
      deployedVestedContract.customid = key
      deployedVestedContract.filename = `${StrategicAllocationFactory.filename} -> ${key} (Vested Instance)`
      deployedVestedContract.deployargs = instanceVestedArgs

      deployedContracts.push(deployedVestedContract)
    }
  } else {
    console.log(chalk.bgBlack.red('No Strategic Allocation Instances Found'))
  }

  // Lastly transfer ownership of startegic allocation factory contract
  console.log(chalk.bgBlue.white(`Changing StrategicAllocationFactory ownership to eventual owner`))

  const tx = await StrategicAllocationFactory.transferOwnership(META_INFO.multisigOwnerEventual)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

  return deployedContracts;
}

// Module Deploy - Advisors
async function setupAdvisors(PushToken, deployedContracts, signer) {
  const advisorsFactoryArgs = [PushToken.address, VESTING_INFO.advisors.deposit.start, VESTING_INFO.advisors.deposit.cliff, "AdvisorsFactory"]
  const AdvisorsFactory = await deployContract("FundsDistributorFactory", advisorsFactoryArgs, "AdvisorsFactory")
  deployedContracts.push(AdvisorsFactory)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, AdvisorsFactory, VESTING_INFO.advisors.deposit.tokens, signer)

  // Deploy Factory Instances of Advisors
  console.log(chalk.bgBlue.white(`Deploying all instances of Advisors`));

  let count = 0
  const identity = "advisors"

  if(Object.entries(VESTING_INFO.advisors.factory).length > 0){
    for await (const [key, value] of Object.entries(VESTING_INFO.advisors.factory)) {
      count = count + 1
      const uniqueId = `${identity}${count}`

      const allocation = value
      const filename = `${AdvisorsFactory.filename} -> ${key} (Instance)`

      // Deploy Advisor Instance
      console.log(chalk.bgBlue.white(`Deploying Advisors Instance:`), chalk.green(`${filename}`))

      const tx = await AdvisorsFactory.deployFundee(
        allocation.address,
        allocation.start,
        allocation.cliff,
        allocation.duration,
        allocation.revocable,
        allocation.tokens,
        uniqueId
      )

      const result = await tx.wait()
      const deployedAddress = result["events"][0].address

      console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`));
      console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`));

      const contractArtifacts = await ethers.getContractFactory("FundsDistributor")
      let deployedContract = await contractArtifacts.attach(deployedAddress)

      const instanceArgs = [allocation.address, allocation.start, allocation.cliff, allocation.duration, allocation.tokens, uniqueId]
      deployedContract.customid = key
      deployedContract.filename = `${AdvisorsFactory.filename} -> ${key} (Instance)`
      deployedContract.deployargs = instanceArgs

      deployedContracts.push(deployedContract)
    }
  } else {
    console.log(chalk.bgBlack.red('No Advisors Instances Found'))
  }

  // Lastly transfer ownership of advisors contract
  console.log(chalk.bgBlue.white(`Changing AdvisorsFactory ownership to eventual owner`))

  const tx = await AdvisorsFactory.transferOwnership(META_INFO.multisigOwnerEventual)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

  return deployedContracts;
}

// Module Deploy - Team
async function setupTeam(PushToken, deployedContracts, signer) {
  const teamFactoryArgs = [PushToken.address, VESTING_INFO.team.deposit.start, VESTING_INFO.team.deposit.cliff, "TeamFactory"]
  const TeamFactory = await deployContract("FundsDistributorFactory", teamFactoryArgs, "TeamFactory")
  deployedContracts.push(TeamFactory)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, TeamFactory, VESTING_INFO.team.deposit.tokens, signer)

  // Deploy Factory Instances of Team
  console.log(chalk.bgBlue.white(`Deploying all instances of Team Members`));

  let count = 0
  const identity = "team"

  if(Object.entries(VESTING_INFO.team.factory).length > 0){
    for await (const [key, value] of Object.entries(VESTING_INFO.team.factory)) {
      count = count + 1
      const uniqueId = `${identity}${count}`

      const allocation = value
      const filename = `${TeamFactory.filename} -> ${key} (Instance)`

      // Deploy Team Instance
      console.log(chalk.bgBlue.white(`Deploying Team Instance:`), chalk.green(`${filename}`))

      const tx = await TeamFactory.deployFundee(
        allocation.address,
        allocation.start,
        allocation.cliff,
        allocation.duration,
        allocation.revocable,
        allocation.tokens,
        uniqueId
      )

      const result = await tx.wait()
      const deployedAddress = result["events"][0].address

      console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`));
      console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`));

      const contractArtifacts = await ethers.getContractFactory("FundsDistributor")
      const deployedContract = await contractArtifacts.attach(deployedAddress)

      const instanceArgs = [allocation.address, allocation.start, allocation.cliff, allocation.duration, allocation.revocable, uniqueId]
      deployedContract.filename = `${TeamFactory.filename} -> ${key} (Instance)`
      deployedContract.deployargs = instanceArgs

      deployedContracts.push(deployedContract)
    }
  } else {
    console.log(chalk.bgBlack.red('No Team Instances Found'))
  }

  // Lastly transfer ownership of team factory contract
  console.log(chalk.bgBlue.white(`Changing TeamFactory ownership to eventual owner`))

  const tx = await TeamFactory.transferOwnership(META_INFO.multisigOwnerEventual)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

  return deployedContracts;
}

// Module Deploy - Foundation
async function setupFoundation(PushToken, deployedContracts, signer) {
  // Deploying Foundation Reserves A
  const foundationAParams = VESTING_INFO.foundation.depositA
  const foundationAArgs = [META_INFO.multisigOwnerEventual, foundationAParams.start, foundationAParams.cliff, foundationAParams.duration, true, "FoundationAReserves"]
  const FoundationAReserves = await deployContract("VestedReserves", foundationAArgs, "FoundationAReserves")
  deployedContracts.push(FoundationAReserves)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, FoundationAReserves, VESTING_INFO.foundation.depositA.tokens, signer)

  // Lastly transfer ownership of community reservoir contract
  console.log(chalk.bgBlue.white(`Changing FoundationAReserves ownership to eventual owner`))

  const txFoundationAReservoir = await FoundationAReserves.transferOwnership(META_INFO.multisigOwnerEventual)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${txFoundationAReservoir.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txFoundationAReservoir.hash}`))

  // Deploying Foundation Reserves B
  const foundationBParams = VESTING_INFO.foundation.depositB
  const foundationBArgs = [META_INFO.multisigOwnerEventual, foundationBParams.start, foundationBParams.cliff, foundationBParams.duration, true, "FoundationBReserves"]
  const FoundationBReserves = await deployContract("VestedReserves", foundationBArgs, "FoundationBReserves")
  deployedContracts.push(FoundationBReserves)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, FoundationBReserves, VESTING_INFO.foundation.depositB.tokens, signer)

  // Lastly transfer ownership of community reservoir contract
  console.log(chalk.bgBlue.white(`Changing FoundationAReserves ownership to eventual owner`))

  const txFoundationBReservior = await FoundationBReserves.transferOwnership(META_INFO.multisigOwnerEventual)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${txFoundationBReservior.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txFoundationBReservior.hash}`))

  return deployedContracts
}

// Module Deploy - Investors
async function setupInvestors(PushToken, deployedContracts, signer) {
  const investorsFactoryArgs = [PushToken.address, VESTING_INFO.investors.deposit.start, VESTING_INFO.community.breakdown.strategic.deposit.cliff, "StrategicAllocationFactory"]
  const InvestorsAllocationFactory = await deployContract("FundsDistributorFactory", investorsFactoryArgs, "InvestorsAllocationFactory")
  deployedContracts.push(InvestorsAllocationFactory)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, InvestorsAllocationFactory, VESTING_INFO.investors.deposit.tokens, signer)

  // Deploy Factory Instances of Strategic Allocation
  console.log(chalk.bgBlue.white(`Deploying all instances of Investors Allocation`));

  let count = 0
  const identity = "strategic"

  if(Object.entries(VESTING_INFO.investors.factory).length > 0){
    for await (const [key, value] of Object.entries(VESTING_INFO.investors.factory)) {
      count = count + 1
      const uniqueTimelockId = `${identity}timelock${count}`
      const uniqueVestedId = `${identity}vested${count}`

      const allocation = value
      const filename = `${InvestorsAllocationFactory.filename} -> ${key} (Instance)`

      const tokensInt = bnToInt(bn(allocation.tokens))
      const releaseBuffer = 60 * 10 // 600 seconds

      // split it, timelock
      const timelockStart = allocation.timelocked.start
      const timelockCliff = allocation.timelocked.cliff
      const timelockDuration = timelockCliff + releaseBuffer // add a release buffer of 10 mins

      const timelockTokensInt = Math.floor(tokensInt * (allocation.timelocked.perc / 100))
      const timelockTokens = tokens(timelockTokensInt)

      // vested
      const vestedStart = timelockStart + timelockCliff + releaseBuffer
      const vestedCliff = 0
      const vestedDuration = allocation.vested.duration

      const vestedToknesInt = tokensInt - timelockTokensInt
      const vestedTokens = tokens(vestedToknesInt)

      // Deploy Strategic Allocation Instance
      console.log(chalk.bgBlue.white(`Deploying Investors Allocation Instance:`), chalk.green(`${filename}`))
      console.log(chalk.bgBlack.gray(`Breakdown: ${tokensInt} [${allocation.tokens}] Tokens`));
      console.log(chalk.bgBlack.gray(`Timelock --> Tokens: ${timelockTokensInt} [${timelockTokens}] Tokens, Start: ${timelockStart}, Cliff: ${timelockCliff}, Duration: ${timelockDuration}`));
      console.log(chalk.bgBlack.gray(`Vested --> Tokens: ${vestedToknesInt} [${vestedTokens}] Tokens, Start: ${vestedStart}, Cliff: ${vestedCliff}, Duration: ${vestedDuration}`));

      // keep a tab on contract artifacts
      const contractArtifacts = await ethers.getContractFactory("FundsDistributor")

      // Deploy Timelock
      const txTimelock = await InvestorsAllocationFactory.deployFundee(
        allocation.address,
        timelockStart,
        timelockCliff,
        timelockDuration,
        allocation.revocable,
        timelockTokens,
        uniqueTimelockId
      )

      const resultTimelock = await txTimelock.wait()
      const deployedTimelockAddr = resultTimelock["events"][0].address

      console.log(chalk.bgBlack.white(`Transaction hash [Timelock]:`), chalk.gray(`${txTimelock.hash}`));
      console.log(chalk.bgBlack.white(`Transaction etherscan [Timelock]:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txTimelock.hash}`));

      let deployedTimelockContract = await contractArtifacts.attach(deployedTimelockAddr)

      const instanceTimelockArgs = [allocation.address, timelockStart, timelockCliff, timelockDuration, allocation.revocable, uniqueTimelockId]
      deployedTimelockContract.customid = `${key}_timelock`
      deployedTimelockContract.filename = `${InvestorsAllocationFactory.filename} -> ${key} (Timelock Instance)`
      deployedTimelockContract.deployargs = instanceTimelockArgs

      deployedContracts.push(deployedTimelockContract)

      // Deploy Vested
      const txVested = await InvestorsAllocationFactory.deployFundee(
        allocation.address,
        vestedStart,
        vestedCliff,
        vestedDuration,
        allocation.revocable,
        vestedTokens,
        uniqueVestedId
      )

      const resultVested = await txTimelock.wait()
      const deployedVestedAddr = resultVested["events"][0].address

      console.log(chalk.bgBlack.white(`Transaction hash [Vested]:`), chalk.gray(`${txVested.hash}`));
      console.log(chalk.bgBlack.white(`Transaction etherscan [Vested]:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txVested.hash}`));

      let deployedVestedContract = await contractArtifacts.attach(deployedVestedAddr)

      const instanceVestedArgs = [allocation.address, vestedStart, vestedCliff, vestedDuration, allocation.revocable, uniqueVestedId]
      deployedVestedContract.customid = `${key}_timelock`
      deployedVestedContract.filename = `${InvestorsAllocationFactory.filename} -> ${key} (Vested Instance)`
      deployedVestedContract.deployargs = instanceVestedArgs

      deployedContracts.push(deployedVestedContract)
    }
  } else {
    console.log(chalk.bgBlack.red('No Investors Allocation Instances Found'))
  }

  // Lastly transfer ownership of startegic allocation factory contract
  console.log(chalk.bgBlue.white(`Changing InvestorsAllocationFactory ownership to eventual owner`))

  const tx = await InvestorsAllocationFactory.transferOwnership(META_INFO.multisigOwnerEventual)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

  return deployedContracts;
}

// Module Deploy - Community Vault
async function setupCommunityVault(PushToken, deployedContracts, signer) {
  console.log(chalk.bgBlue.white(`Deploying Community Vault Contract`));

  // Deploying Community Vault Contract
  const CommunityVault = await deployContract("CommunityVault", [PushToken.address], "CommunityVault")
  deployedContracts.push(CommunityVault)

  const yieldFarmPUSHInitialArgs = STAKING_INFO.stakingInfo.pushToken

  // Next transfer appropriate funds
  await distributeInitialFunds(
    PushToken,
    CommunityVault,
    STAKING_INFO.stakingInfo.helpers.getPushDistributionAmount().add(STAKING_INFO.stakingInfo.helpers.getLiquidityDistributionAmount()),
    signer
  )

  // console.log(chalk.bgBlue.white(`Deploying Staking Contract`));
  //
  // // Deploying Staking Contract
  // const stakingInitialArgs = STAKING_INFO.stakingInfo.staking
  // const stakingArgs = [yieldFarmPUSHInitialArgs.epoch1Start, stakingInitialArgs.epochDuration]
  // const StakingInstance = await deployContract("Staking", stakingArgs, "Staking")
  // deployedContracts.push(StakingInstance)
  //
  // console.log(chalk.bgBlue.white(`Deploying PUSH Yield Farming Contract`));
  // // Deploying PUSH token Yield Farming Contract
  // const yieldFarmPUSHArgs = [
  //   PushToken.address,
  //   PushToken.address,
  //   StakingInstance.address,
  //   CommunityVault.address,
  //   yieldFarmPUSHInitialArgs.startAmount.mul(ethers.BigNumber.from(10).pow(18)).toString(),
  //   yieldFarmPUSHInitialArgs.deprecation.mul(ethers.BigNumber.from(10).pow(18)).toString(),
  //   yieldFarmPUSHInitialArgs.nrOfEpochs.toString()
  // ]
  // const yieldFarmPUSHInstance = await deployContract("YieldFarm", yieldFarmPUSHArgs, "YieldFarm")
  // deployedContracts.push(yieldFarmPUSHInstance)
  //
  // console.log(chalk.bgBlue.white(`Setting allowance for Staking contracts to spend tokens from CommunityVault`))
  // await CommunityVault.setAllowance(yieldFarmPUSHInstance.address, STAKING_INFO.stakingInfo.helpers.getPushDistributionAmount())
  //
  // // Lastly transfer ownership of community reservoir contract
  // console.log(chalk.bgBlue.white(`Changing CommunityVault ownership to eventual owner`))
  //
  // const txCommunityVault = await CommunityVault.transferOwnership(META_INFO.multisigOwnerEventual)
  //
  // console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${txCommunityVault.hash}`))
  // console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txCommunityVault.hash}`))

  return deployedContracts
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
