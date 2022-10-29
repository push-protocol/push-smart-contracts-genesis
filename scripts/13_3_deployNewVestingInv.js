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
  const versionDetails = versionVerifier(["pushTokenAddress", "fundsDistributorFactoryAddress"])
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Version Control Passed \n\t\t\t\n`))

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
  const fundFactoryContract = await ethers.getContractAt("FundsDistributorFactory", versionDetails.deploy.args.fundsDistributorFactoryAddress)

  // Next Deploy Vesting Factory Contracts
  // Deploy and Setup Investors
  
  // Plan 1: Deploy with a Fresh FUND FACTORY Contract
  deployedContracts = await setupInvestors(PushToken, deployedContracts, signer)
  // Plan 2: Deploy with an already existing FUND FACTORY Contract
  //deployedContracts = await setupInvestors(PushToken, fundFactoryContract, deployedContracts, signer)

  return deployedContracts;
}

// Module Deploy - Investors
async function setupInvestors(PushToken, InvestorsAllocationFactory, deployedContracts, signer) {

  //const investorsFactoryArgs = [PushToken.address, VESTING_INFO.investors.deposit.start, VESTING_INFO.community.breakdown.strategic.deposit.cliff, "StrategicAllocationFactory"]

  //const InvestorsAllocationFactory = await deployContract("FundsDistributorFactory", investorsFactoryArgs, "InvestorsAllocationFactory")
  //deployedContracts.push(InvestorsAllocationFactory)

  // Next transfer appropriate funds
  //await distributeInitialFunds(PushToken, InvestorsAllocationFactory, VESTING_INFO.investors.deposit.tokens, signer)

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

    // Vesting parameters 
        const vestedTokens = allocation.tokens ;
        const vestedStart = allocation.vested.start;
        const vestedCliff = allocation.vested.cliff;
        const vestedDuration = allocation.vested.duration;

      // Deploy Strategic Allocation Instance
      console.log(chalk.bgBlue.white(`Deploying Investors Allocation Instance:`), chalk.green(`${filename}`))
      console.log(chalk.bgBlack.gray(`Vested --> Tokens: ${vestedTokens} [${vestedTokens}] Tokens, Start: ${vestedStart}, Cliff: ${vestedCliff}, Duration: ${vestedDuration}`));

      // keep a tab on contract artifacts
      const contractArtifacts = await ethers.getContractFactory("FundsDistributor")

      // Deploy Vested
      const txVested = await InvestorsAllocationFactory.deployFundee(
        allocation.address,
        vestedStart,
        vestedCliff,
        vestedDuration,
        allocation.revocable,
        vestedTokens,
        uniqueVestedId,
        {gasLimit: 9_000_000}
      )

      const resultVested = await txVested.wait()
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

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });