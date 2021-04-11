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
const { verifyTokensAmount } = require('../loaders/tokenAmountVerifier')

const { DISTRIBUTION_INFO, VESTING_INFO, META_INFO } = require("./constants/constants")

// Primary Function
async function main() {
  // Version Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Version Checks \n-----------------------\n`))
  const versionDetails = versionVerifier(["pushTokenAddress", "commUnlockedContract", "amountETHForPool", "gasInGwei"])
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Version Control Passed \n\t\t\t\n`))

  // Token Verification Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Token Verification Checks \n-----------------------\n`))
  verifyTokensAmount();
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Token Verification Passed \n\t\t\t\n`))

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

  if (hre.network.name == "hardhat" || hre.network.name == "localhost") {
    console.log(chalk.bgRed.white(`Can't deploy Uniswap dependency script on Hardhat / localhost network... try testnet / mainnet\n`))
    process.exit(1)
  }

  // Get EPNS ($PUSH) instance first
  const PushToken = await ethers.getContractAt("EPNS", versionDetails.deploy.args.pushTokenAddress)

  // Get Uniswap V2 Router instance
  const UniswapV2Router = await ethers.getContractAt("IUniswapV2Router02", META_INFO.uniswapV2Addr)

  // Get Comm Unlocked instance
  const CommUnlocked = await ethers.getContractAt("Reserves", versionDetails.deploy.args.commUnlockedContract)

  // Get tokens / eth requirements
  const reqTokens = bn(DISTRIBUTION_INFO.community.unlocked.launch.uniswap)
  const reqEth = ethers.utils.parseEther((versionDetails.deploy.args.amountETHForPool + 1.5).toString()) // For handling fees

  // setup secondary signer
  const altMnemonic = fs.readFileSync(`${__dirname}/../wallets/alt_mnemonic.txt`).toString().trim()
  const altWallet = await extractWalletFromMneomonic(altMnemonic)

  // Check if altwallet public key matches
  if (altWallet.address != versionDetails.deploy.args.secondaryWalletAddress) {
    console.log(chalk.bgRed.white(`Wallet address of alt_mnemonic doesn't match deploy config, please correct and retry.\n`))
    process.exit(1)
  }

  // Check if wallet has exact push balance to avoid mishaps
  let pushBalance = await PushToken.balanceOf(signer.address)

  if (pushBalance < reqTokens) {
    // Transfer from Comm Unlocked, doing this again will result in bad things
    await sendFromCommUnlocked(PushToken, CommUnlocked, signer, signer.address, reqTokens)
    pushBalance = await PushToken.balanceOf(signer.address)
  }

  console.log(chalk.bgBlack.white(`Check - Push Balance of ${signer.address}`), chalk.green(`${bnToInt(pushBalance)} PUSH`), chalk.bgBlack.white(`Required: ${bnToInt(reqTokens)} PUSH`))
  if (pushBalance < reqTokens) {
    console.log(chalk.bgRed.white(`Not enough $PUSH Balance.`), chalk.bgGray.white(`Req bal:`), chalk.green(`${bnToInt(reqTokens)} PUSH tokens`), chalk.bgGray.white(`Wallet bal:`), chalk.red(`${bnToInt(pushBalance)} PUSH tokens\n`))
    process.exit(1)
  }

  let ethBalance = await signer.getBalance()
  console.log(chalk.bgBlack.white(`Check - Eth Balance of ${signer.address}`), chalk.green(`${ethers.utils.formatUnits(ethBalance)} ETH`), chalk.bgBlack.white(`Required: ${ethers.utils.formatUnits(reqEth)} ETH`))
  if (ethBalance < reqEth) {
    console.log(chalk.bgRed.white(`Not enough Eth`), chalk.bgGray.white(`Req bal:`), chalk.green(`${ethers.utils.formatEther(reqEth)} ETH`), chalk.bgGray.white(`Wallet bal:`), chalk.red(`${ethers.utils.formatEther(ethBalance)} ETH\n`))
    process.exit(1)
  }

  // Approve call to Uni Router
  const oldAllownce = await PushToken.connect(signer).allowance(signer.address, UniswapV2Router.address)

  console.log(chalk.bgBlue.white(`Approving for Uniswap for adddress ${signer.address}`))
  console.log(chalk.bgBlack.white(`Allowance before Approval:`), chalk.yellow(`${bnToInt(oldAllownce)} PUSH`))

  const approveTx = await PushToken.connect(signer).approve(UniswapV2Router.address, bn(DISTRIBUTION_INFO.community.unlocked.launch.uniswap))
  console.log(chalk.bgBlack.white(`Approving funds for Uni`), chalk.green(`${bnToInt(pushBalance)} PUSH`))

  await approveTx.wait()
  const newAllownce = await PushToken.connect(signer).allowance(signer.address, UniswapV2Router.address)

  console.log(chalk.bgBlack.white(`Allowance after Approval:`), chalk.yellow(`${bnToInt(newAllownce)} PUSH`))
  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${approveTx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${approveTx.hash}`))

  // Deploy the pool if enough ether is present
  const deadline = ethers.constants.MaxUint256

  let overrides = {
      gasPrice: ethers.utils.parseUnits(versionDetails.deploy.args.gasInGwei.toString(), "gwei") ,
      gasLimit: 8000000,

      // To convert Ether to Wei:
      value: ethers.utils.parseEther(versionDetails.deploy.args.amountETHForPool.toString())     // ether in this case MUST be a string
  };

  console.log(chalk.bgBlue.white(`Launching on Uniswap from ${signer.address} with ${DISTRIBUTION_INFO.community.unlocked.launch.uniswap}`))


  const uniTx = await UniswapV2Router.connect(signer).addLiquidityETH(
    PushToken.address,
    bn(DISTRIBUTION_INFO.community.unlocked.launch.uniswap), // total tokens to launch with
    bn(DISTRIBUTION_INFO.community.unlocked.launch.uniswap), // min token require to swap
    ethers.utils.parseEther(versionDetails.deploy.args.amountETHForPool.toString()), // Min eth required to swap
    META_INFO.ownerEOAEventual, // the address to which LP tokens will be sent
    deadline,
    overrides
  )

  await uniTx.wait()
  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${uniTx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${uniTx.hash}`))

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
