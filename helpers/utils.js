require('dotenv').config()

const { ethers } = require("hardhat")
const { tokenInfo } = require('../config/config')

const fs = require("fs")
const chalk = require("chalk")

const moment = require('moment')

// define functions and constants
const CONSTANT_1K = 1000
const CONSTANT_10K = 10 * CONSTANT_1K
const CONSTANT_100K = 10 * CONSTANT_10K
const CONSTANT_1M = 10 * CONSTANT_100K
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const UNISWAP_FACTORY = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
const UNISWAP_INIT_CODEHASH = '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'

bn = function(number, defaultValue = null) { if (number == null) { if (defaultValue == null) { return null } number = defaultValue } return ethers.BigNumber.from(number) }

tokens = function (amount) { return (bn(amount).mul(bn(10).pow(tokenInfo.decimals))).toString() }
tokensBN = function (amount) { return (bn(amount).mul(bn(10).pow(tokenInfo.decimals))) }
bnToInt = function (bnAmount) { return bnAmount.div(bn(10).pow(tokenInfo.decimals)) }

dateToEpoch = function (dated) { return moment(dated, "DD/MM/YYYY HH:mm").valueOf() / 1000 }
timeInSecs = function (days, hours, mins, secs) { return days * hours * mins * secs }
timeInDays = function (secs) { return (secs / (60 * 60 * 24)).toFixed(2) }
timeInDate = function (secs) { return moment(secs * 1000).format("DD MMM YYYY hh:mm a") }

vestedAmount = function (total, now, start, cliffDuration, duration) { return now < start + cliffDuration ? ethers.BigNumber.from(0) : total.mul(now - start).div(duration) }
returnWeight = function (sourceWeight, destBal, destWeight, amount, block, op) {
  // console.log({sourceWeight, destBal, destWeight, amount})
  if (bn(destBal).eq(bn("0"))) return bn(0)
  const dstWeight = bn(destWeight).mul(bn(destBal))
  const srcWeight = bn(sourceWeight).mul(bn(amount))

  const totalWeight = dstWeight.add(srcWeight)
  const totalAmount = bn(destBal).add(amount)

  const totalAmountBy2 = totalAmount.div(bn(2))
  const roundUpWeight = totalWeight.add(totalAmountBy2)
  let holderWeight = roundUpWeight.div(totalAmount)
  if (op == "transfer") {
    return { holderWeight, totalAmount };
  } else {
    holderWeight = block
    return { holderWeight, totalAmount };
  }
}

// Helper Functions
// For Deploy
deploy = async function deploy(name, _args, identifier) {
  const args = _args || []

  console.log(`📄 ${name}`)
  const contractArtifacts = await ethers.getContractFactory(name)
  const contract = await contractArtifacts.deploy(...args)
  await contract.deployed()
  console.log(
    chalk.cyan(name),
    "deployed to:",
    chalk.magenta(contract.address)
  )
  fs.writeFileSync(`artifacts/${name}_${identifier}.address`, contract.address)
  return contract
}

deployContract = async function deployContract(contractName, contractArgs, identifier) {
  let contract = await deploy(contractName, contractArgs, identifier)

  contract.filename = `${contractName} -> ${identifier}`
  contract.deployargs = contractArgs
  contract.customid = identifier

  return contract
}

readArgumentsFile = function readArgumentsFile(contractName) {
  let args = []
  try {
    const argsFile = `./contracts/${contractName}.args`
    if (fs.existsSync(argsFile)) {
      args = JSON.parse(fs.readFileSync(argsFile))
    }
  } catch (e) {
    console.log(e)
  }

  return args
}

// Verify All Contracts
verifyAllContracts = async function verifyAllContracts(deployedContracts, versionDetails) {
  return new Promise(async function(resolve, reject) {
    if (deployedContracts.length == 0) resolve()

    const path = require("path")

    const deployment_path = path.join('artifacts', 'deployment_info')
    const network_path = path.join(deployment_path, hre.network.name)
    const bulk_path = path.join(network_path, process.env.FS_BULK_EXPORT)

    if (!fs.existsSync(deployment_path)) {
      fs.mkdirSync(deployment_path)
    }

    if (!fs.existsSync(network_path)) {
      fs.mkdirSync(network_path)
    }

    if (!fs.existsSync(bulk_path)) {
      fs.mkdirSync(bulk_path)
    }

    let allContractsInfo = '-----\nVersion: ' + versionDetails.version + '\n-----'

    for await (contract of deployedContracts) {
      allContractsInfo = allContractsInfo + '-----'

      let contractInfo = `identifier: ${contract.customid}\nfilename: ${contract.filename}\naddress: ${contract.address}\nargs: ${contract.deployargs}`
      fs.writeFileSync(`${network_path}/${contract.filename}.address`, contractInfo)

      const arguments = contract.deployargs

      if (hre.network.name != "hardhat" && hre.network.name != "localhost") {
        // Mostly a real network, verify
        const { spawnSync } = require( 'child_process' )
        const ls = spawnSync( `npx`, [ 'hardhat', 'verify', '--network', hre.network.name, contract.address ].concat(arguments) )

        console.log( `Error: ${ ls.stderr.toString() }` )
        console.log( `Output: ${ ls.stdout.toString() }` )

        contractInfo = `${contractInfo}\nError: ${ ls.stderr.toString() }\nOutput: ${ ls.stdout.toString() }`
      }
      else {
        console.log(chalk.bgWhiteBright.black(`${contract.filename}.sol`), chalk.bgRed.white(` is on Hardhat network... skipping`))
        contractInfo = contractInfo + "\nOutput: " + hre.network.name + " Network... skipping"
      }

      allContractsInfo = allContractsInfo + "\n" + contractInfo
    }

    fs.writeFileSync(`${bulk_path}/Bulk -> ${contract.customid}.add`, allContractsInfo)

    resolve()
  })
}

// For Distributing funds
distributeInitialFunds = async function distributeInitialFunds(tokenContract, contract, amount, signer) {
  let balance;
  console.log(chalk.bgBlue.white(`Distributing Initial Funds`))
  console.log(chalk.bgBlack.white(`Sending Funds to ${contract.filename}`), chalk.green(`${ethers.utils.formatUnits(amount)} Tokens`))

  balance = await tokenContract.balanceOf(signer.address)
  console.log(chalk.bgBlack.white(`Push Token Balance Before Transfer:`), chalk.yellow(`${ethers.utils.formatUnits(balance)} Tokens`))
  const tx = await tokenContract.transfer(contract.address, amount)
  await tx.wait()

  balance = await tokenContract.balanceOf(signer.address)
  console.log(chalk.bgBlack.white(`Push Token Balance After Transfer:`), chalk.yellow(`${ethers.utils.formatUnits(balance)} Tokens`))

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))
}

// Get private key from mneomonic
extractWalletFromMneomonic = async function (mnemonic) {
  const bip39 = require("bip39");
  const { hdkey } = require('ethereumjs-wallet')

  const seed = await bip39.mnemonicToSeed(mnemonic);
  const hdwallet = hdkey.fromMasterSeed(seed);
  const wallet_hdpath = "m/44'/60'/0'/0/";
  const account_index = 0;
  const fullPath = wallet_hdpath + account_index;
  const wallet = hdwallet.derivePath(fullPath).getWallet();

  const EthUtil = require("ethereumjs-util");
  const address = "0x" + EthUtil.privateToAddress(wallet.privateKey).toString("hex");

  return {
    privateKey: wallet.privateKey,
    address: address
  }
}

module.exports = {
  CONSTANT_1K,
  CONSTANT_10K,
  CONSTANT_100K,
  CONSTANT_1M,
  WETH,
  UNISWAP_FACTORY,
  UNISWAP_INIT_CODEHASH,
  bn,
  tokens,
  tokensBN,
  bnToInt,
  dateToEpoch,
  timeInSecs,
  timeInDays,
  timeInDate,
  vestedAmount,
  returnWeight,
  deploy,
  deployContract,
  readArgumentsFile,
  verifyAllContracts,
  distributeInitialFunds,
  extractWalletFromMneomonic
}
