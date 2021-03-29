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

const { bn, tokens, bnToInt, timeInDays, timeInDate, deployContract, verifyAllContracts, extractWalletFromMneomonic } = require('../helpers/utils')
const { versionVerifier, upgradeVersion } = require('../loaders/versionVerifier')

const { DISTRIBUTION_INFO, META_INFO } = require("./constants")

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
  //upgradeVersion()
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n ✅ Version upgraded    \n\t\t\t\n`))
}

// Deploy All Contracts
async function setupAllContracts(versionDetails) {
  let deployedContracts = []
  const signer = await ethers.getSigner(0)

  if (hre.network.name == "hardhat" || hre.network.name == "localhost") {
    console.log(chalk.bgRed.white(`Can't deploy Uniswap dependency script on Hardhat / localhost network... try testnet / mainnet\n`))
    process.exit(1)
  }

  // Get EPNS ($PUSH) instance first
  const PushToken = await ethers.getContractAt("EPNS", versionDetails.deploy.args.pushTokenAddress)

  // Get Uniswap V2 Router instance
  const UniswapV2Router = await ethers.getContractAt("IUniswapV2Router02", META_INFO.uniswapV2Addr)

  // Get Comm Unlocked instancee
  const CommUnlocked = await ethers.getContractAt("IUniswapV2Router02", versionDetails.deploy.args.commUnlockedContract)

  // Connect secondary signer
  const mnemonic = fs.readFileSync(`../../wallets/main_mnemonic.txt`).toString().trim()
  console.log(mnemonic)

  const altWallet = extractWalletFromMneomonic()
  console.log(altWallet)

  const altSigner = new ethers.Wallet(altWallet.privateKey)

  // Check if wallet has enough balance of Ether and Push
  const pushBalance = await PushToken.balanceOf(signer.address)

  // Approve call to Uni Router


  // Deploy the pool if enough ether is present


  // Return deployed contract
  return deployedContracts
}

/**
 * @description set allowance of UniswapV2Router to the number of push tokens
 */
async function prepare() {
    let EPNSBal = await EPNS_PUSHWithSigner.balanceOf(wallet.address)
    const allowance = await EPNS_PUSHWithSigner.allowance(wallet.address, UniswapV2Router.address)
    const approve = await EPNS_PUSHWithSigner.approve(UniswapV2Router.address, EPNSBal, options)
    const result = await approve.wait()
    console.log({ EPNSBal: ethers.utils.formatEther(EPNSBal), allowance, result })
    const new_allowance = await EPNS_PUSHWithSigner.allowance(wallet.address, UniswapV2Router.address)
    console.log({new_allowance: ethers.utils.formatEther(new_allowance)})
}

/**
 * @description adds to liquidity pool (creates if pool does not exist)
 */
async function deploy() {
    options.value = ethers.utils.parseEther("1.0")
    const addLiquidity = await UniswapV2RouterWithSigner.addLiquidityETH(process.env.PUSH_CONTRACT_ADDRESS, ethers.utils.parseEther("1000000.0"), ethers.utils.parseEther("100.0"), ethers.utils.parseEther("0.000001"), wallet.address, deadline, options)
    const result = await addLiquidity.wait()
    console.log({result})
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
