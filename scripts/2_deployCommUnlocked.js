// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
require('dotenv').config()

const moment = require('moment')
const hre = require("hardhat")

const fs = require("fs")
const chalk = require("chalk")
const { config, ethers } = require("hardhat")

const { bn, tokens, bnToInt, timeInDays, timeInDate, deployContract, verifyAllContracts, distributeInitialFunds } = require('../helpers/utils')
const { versionVerifier, upgradeVersion } = require('../loaders/versionVerifier')

const {
  VESTING_INFO,
  DISTRIBUTION_INFO,
  META_INFO
} = require("./constants");

// Primary Function
async function main() {
  // Version Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Version Checks \n-----------------------\n`))
  const versionDetails = versionVerifier(["pushTokenAddress"])
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Version Control Passed \n\t\t\t\n`))

  // First deploy all contracts
  console.log(chalk.bgBlack.bold.green(`\n📡 Deploying Contracts \n-----------------------\n`))
  const deployedContracts = await setupAllContracts(versionDetails)
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n All Contracts Deployed \n\t\t\t\n`))

  // Try to verify
  console.log(chalk.bgBlack.bold.green(`\n📡 Verifying Contracts \n-----------------------\n`))
  await verifyAllContracts(deployedContracts, versionDetails)
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n All Contracts Verified \n\t\t\t\n`))

  // Upgrade Version
  console.log(chalk.bgBlack.bold.green(`\n📟 Upgrading Version   \n-----------------------\n`))
  upgradeVersion()
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n ✅ Version upgraded    \n\t\t\t\n`))
}

// Deploy All Contracts
async function setupAllContracts(versionDetails) {
  let deployedContracts = []
  const signer = await ethers.getSigner(0)

  // Get EPNS ($PUSH) instance first
  const contractArtifacts = await ethers.getContractFactory("EPNS")
  const PushToken = await contractArtifacts.attach(versionDetails.deploy.args.pushTokenAddress)

  // Setup Public Sale
  deployedContracts = await setupCommUnlocked(PushToken, deployedContracts, signer)

  // Deploy the pool
  return deployedContracts
}

async function setupCommUnlocked(PushToken, deployedContracts, signer) {
  // Deploying Public Sale
  const publicSaleArgs = [PushToken.address, "CommUnlockedReserves"]
  const PublicSaleReserves = await deployContract("Reserves", publicSaleArgs, "CommUnlockedReserves")
  deployedContracts.push(PublicSaleReserves)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, PublicSaleReserves, VESTING_INFO.community.breakdown.unlocked.deposit.tokens, signer)

  // Lastly transfer ownership of public sale contract
  // console.log(chalk.bgBlue.white(`Changing PublicSale ownership to eventual owner`))
  //
  // const txPublicSale = await PublicSaleReserves.transferOwnership(META_INFO.eventualOwner)
  //
  // console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${txPublicSale.hash}`))
  // console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txPublicSale.hash}`))

  return deployedContracts
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
