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

const { bn, tokens, bnToInt, timeInDays, timeInDate,distributeInitialFunds, deployContract, verifyAllContracts } = require('../helpers/utils')
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
  //verifyTokensAmount();
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

  // Deploy and Setup Community Vault for Future Vesting
  deployedContracts = await setupCommunityVault(PushToken, deployedContracts, signer)

  return deployedContracts;
}

// Module Deploy - Community Vault
async function setupCommunityVault(PushToken, deployedContracts, signer) {
  console.log(chalk.bgBlue.white(`Deploying Community Vault Contract`));

  // Deploying Community Vault Contract
  const CommunityVault = await deployContract("CommunityVault", [PushToken.address], "CommunityVault")
  deployedContracts.push(CommunityVault)

  //const yieldFarmPUSHInitialArgs = STAKING_INFO.stakingInfo.pushToken

  // Next transfer appropriate funds
  // await distributeInitialFunds(
  //   PushToken,
  //   CommunityVault,
  //   STAKING_INFO.stakingInfo.helpers.getPushDistributionAmount().add(STAKING_INFO.stakingInfo.helpers.getLiquidityDistributionAmount()),
  //   signer
  // )

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
