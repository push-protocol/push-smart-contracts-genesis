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

const { bn, tokens, bnToInt, timeInDays, timeInDate, deployContract, verifyAllContracts, sendFromCommUnlocked, extractWalletFromMneomonic } = require('../helpers/utils')
const { versionVerifier, upgradeVersion } = require('../loaders/versionVerifier')

const { DISTRIBUTION_INFO, VESTING_INFO, META_INFO } = require("./constants")

// Primary Function
async function main() {
  // Version Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Version Checks \n-----------------------\n`))
  const versionDetails = versionVerifier(["pushTokenAddress", "commUnlockedContract", "polkaWalletAddress", "amountETHForPolka"])
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
  const PushToken = await ethers.getContractAt("EPNS", versionDetails.deploy.args.pushTokenAddress)

  // Get Comm Unlocked instance
  const CommUnlocked = await ethers.getContractAt("Reserves", versionDetails.deploy.args.commUnlockedContract)

  // Get tokens / eth requirements
  const reqTokens = bn(DISTRIBUTION_INFO.community.unlocked.launch.polkastarter)
  const reqEth = ethers.utils.parseEther((versionDetails.deploy.args.amountETHForPolka + 1).toString()) // For handling fees

  // Check if wallet has exact push balance to avoid mishaps
  let pushBalance = await PushToken.balanceOf(versionDetails.deploy.args.polkaWalletAddress)

  if (pushBalance < reqTokens) {
    // Transfer from Comm Unlocked, doing this again will result in bad things
    await sendFromCommUnlocked(PushToken, CommUnlocked, signer, versionDetails.deploy.args.polkaWalletAddress, reqTokens)
    pushBalance = await PushToken.balanceOf(versionDetails.deploy.args.polkaWalletAddress)
  }

  console.log(chalk.bgBlack.white(`Check - Push Balance of ${versionDetails.deploy.args.polkaWalletAddress}`), chalk.green(`${bnToInt(pushBalance)} PUSH`), chalk.bgBlack.white(`Required: ${bnToInt(reqTokens)} PUSH`))
  if (pushBalance < reqTokens) {
    console.log(chalk.bgRed.white(`Not enough $PUSH Balance.`), chalk.bgGray.white(`Req bal:`), chalk.green(`${bnToInt(reqTokens)} PUSH tokens`), chalk.bgGray.white(`Wallet bal:`), chalk.red(`${bnToInt(pushBalance)} PUSH tokens\n`))
    process.exit(1)
  }

  let ethBalance = await ethers.provider.getBalance(versionDetails.deploy.args.polkaWalletAddress)
  console.log(chalk.bgBlack.white(`Check - Eth Balance of ${versionDetails.deploy.args.polkaWalletAddress}`), chalk.green(`${ethers.utils.formatUnits(ethBalance)} ETH`), chalk.bgBlack.white(`Required: ${ethers.utils.formatUnits(reqEth)} ETH`))
  if (ethBalance < reqEth) {
    // try to send eth from main account
    console.log(chalk.bgBlack.white(`Sending ETH Balance to `), chalk.grey(`${versionDetails.deploy.args.polkaWalletAddress}`))

    const tx = await signer.sendTransaction({
      to: versionDetails.deploy.args.polkaWalletAddress,
      value: reqEth
    })

    await tx.wait()
    ethBalance = await PushToken.balanceOf(versionDetails.deploy.args.polkaWalletAddress)
    console.log(chalk.bgBlack.white(`Receiver ETH Balance After Transfer:`), chalk.yellow(`${ethers.utils.formatUnits(ethBalance)} ETH`))

    console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
    console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))
  }

  if (ethBalance < reqEth) {
    console.log(chalk.bgRed.white(`Not enough Eth`), chalk.bgGray.white(`Req bal:`), chalk.green(`${ethers.utils.formatEther(reqEth)} ETH`), chalk.bgGray.white(`Wallet bal:`), chalk.red(`${ethers.utils.formatEther(ethBalance)} ETH\n`))
    process.exit(1)
  }

  // Return deployed contract
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
