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

  // Deploy and Setup Advisors
  deployedContracts = await setupAdvisors(PushToken, deployedContracts, signer)

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

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
