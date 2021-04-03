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
  const mnemonic = fs.readFileSync(`${__dirname}/../wallets/main_mnemonic.txt`).toString().trim()
  const altWallet = await extractWalletFromMneomonic()

  // Check if altwallet public key matches
  if (altWallet.address != versionDetails.deploy.args.secondaryWalletAddress) {
    console.log(chalk.bgRed.white(`Wallet address of alt_mnemonic doesn't match deploy config, please correct and retry.\n`))
    process.exit(1)
  }

  const provider = ethers.getDefaultProvider(hre.network.name, {
    etherscan: (process.env.ETHERSCAN_API ? process.env.ETHERSCAN_API : null),
    alchemy: (process.env.ALCHEMY_API ? process.env.ALCHEMY_API : null),
  });
  const altSigner = new ethers.Wallet(altWallet.privateKey, provider)

  // Check if wallet has exact push balance to avoid mishaps
  let pushBalance = await PushToken.balanceOf(altSigner.address)

  if (pushBalance < reqTokens) {
    // Transfer from Comm Unlocked, doing this again will result in bad things
    await sendFromCommUnlocked(PushToken, CommUnlocked, signer, altSigner, reqTokens)
    pushBalance = await PushToken.balanceOf(altSigner.address)
  }

  console.log(chalk.bgBlack.white(`Check - Push Balance of ${altSigner.address}`), chalk.green(`${bnToInt(pushBalance)} PUSH`), chalk.bgBlack.white(`Required: ${bnToInt(reqTokens)} PUSH`))
  if (pushBalance == reqTokens) {
    console.log(chalk.bgRed.white(`Not enough $PUSH Balance.`), chalk.bgGray.white(`Req bal:`), chalk.green(`${bnToInt(reqTokens)} PUSH tokens`), chalk.bgGray.white(`Wallet bal:`), chalk.red(`${bnToInt(pushBalance)} PUSH tokens\n`))
    process.exit(1)
  }

  let ethBalance = await altSigner.getBalance()
  console.log(chalk.bgBlack.white(`Check - Eth Balance of ${altSigner.address}`), chalk.green(`${ethers.utils.formatUnits(ethBalance)} ETH`), chalk.bgBlack.white(`Required: ${ethers.utils.formatUnits(reqEth)} ETH`))
  if (ethBalance < reqEth) {
    // try to send eth from main account
    console.log(chalk.bgBlack.white(`Sending ETH Balance to `), chalk.grey(`${altSigner.address}`))

    const tx = await signer.sendTransaction({
      to: altSigner.address,
      value: reqEth
    })

    await tx.wait()
    ethBalance = await altSigner.getBalance()
    console.log(chalk.bgBlack.white(`Receiver ETH Balance After Transfer:`), chalk.yellow(`${ethers.utils.formatUnits(ethBalance)} ETH`))

    console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
    console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))
  }

  if (ethBalance < reqEth) {
    console.log(chalk.bgRed.white(`Not enough Eth`), chalk.bgGray.white(`Req bal:`), chalk.green(`${ethers.utils.formatEther(reqEth)} ETH`), chalk.bgGray.white(`Wallet bal:`), chalk.red(`${ethers.utils.formatEther(ethBalance)} ETH\n`))
    process.exit(1)
  }

  // Approve call to Uni Router
  const oldAllownce = await PushToken.connect(altSigner).allowance(altSigner.address, UniswapV2Router.address)

  console.log(chalk.bgBlue.white(`Approving for Uniswap for adddress ${altSigner.address}`))
  console.log(chalk.bgBlack.white(`Allowance before Approval:`), chalk.yellow(`${bnToInt(oldAllownce)} PUSH`))

  const approveTx = await PushToken.connect(altSigner).approve(UniswapV2Router.address, bn(DISTRIBUTION_INFO.community.unlocked.launch.uniswap))
  console.log(chalk.bgBlack.white(`Approving funds for Uni`), chalk.green(`${bnToInt(pushBalance)} PUSH`))

  await approveTx.wait()
  const newAllownce = await PushToken.connect(altSigner).allowance(altSigner.address, UniswapV2Router.address)

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

  console.log(chalk.bgBlue.white(`Launching on Uniswap from ${altSigner.address} with ${DISTRIBUTION_INFO.community.unlocked.launch.uniswap}`))

  const uniTx = await UniswapV2Router.connect(altSigner).addLiquidityETH(
    PushToken.address,
    bn(DISTRIBUTION_INFO.community.unlocked.launch.uniswap), // total tokens to launch with
    5000000000,
    1000000000, // Min eth required to swap
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

  uint amountTokenDesired,
  uint amountTokenMin, if the amount is less than this amount than don't swap
  uint amountETHMin, if the amount is less than this amount than don't swap
 */
async function deploy() {

  const options = { gasPrice: 110000000000, gasLimit: 8000000 }
  const deadline = ethers.constants.MaxUint256

    let overrides = {
        // To convert Ether to Wei:
        value: ethers.utils.parseEther("1.0")     // ether in this case MUST be a string

        // Or you can use Wei directly if you have that:
        // value: someBigNumber
        // value: 1234   // Note that using JavaScript numbers requires they are less than Number.MAX_SAFE_INTEGER
        // value: "1234567890"
        // value: "0x1234"

        // Or, promises are also supported:
        // value: provider.getBalance(addr)
    };

    options.value = ethers.utils.parseEther("1.0")
    const addLiquidity = await UniswapV2RouterWithSigner.addLiquidityETH(
      process.env.PUSH_CONTRACT_ADDRESS,
      ethers.utils.parseEther("1000000.0"), //tokens to fund liquidity
      ethers.utils.parseEther("100.0"), //
      ethers.utils.parseEther("0.000001"),
      wallet.address,
      deadline,
      { options }
    )
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
