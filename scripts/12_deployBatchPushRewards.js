// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const fs = require("fs");
const chalk = require("chalk");
const { config, ethers } = require("hardhat");

const { bn, tokens, bnToInt, timeInDays, timeInDate, deployContract, verifyAllContracts, distributeInitialFunds } = require('../helpers/utils')
const { versionVerifier, upgradeVersion } = require('../loaders/versionVerifier')
const { verifyTokensAmount } = require('../loaders/tokenAmountVerifier')

const {
  PUSH_REWARDS_INFO
} = require("./constants/constants")

// Primary Function
async function main() {
  // Version Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Version Checks \n-----------------------\n`))
  const versionDetails = versionVerifier(["pushTokenAddress", "batchTransferPUSHAddress"])
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Version Control Passed \n\t\t\t\n`))

  // Token Verification Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Token Verification Checks \n-----------------------\n`))
  verifyTokensAmount();
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Token Verification Passed \n\t\t\t\n`))

  // First deploy all contracts
  console.log(chalk.bgBlack.bold.green(`\n📡 Dropping Community PUSH rewards \n-----------------------\n`));
  const deployedContracts = await setupAllContracts(versionDetails)
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n All Contracts Deployed \n\t\t\t\n`));

  // Try to verify
  console.log(chalk.bgBlack.bold.green(`\n📡 Verifying Contracts \n-----------------------\n`));
  await verifyAllContracts(deployedContracts, versionDetails)
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

  // Get BatchTransferPUSH instance first
  const BatchTransferPUSH = await ethers.getContractAt("BatchTransferPUSH", versionDetails.deploy.args.batchTransferPUSHAddress)

  // Batch Transfer Tokens
  await batchTransferPUSH(versionDetails.deploy.args.pushTokenAddress, BatchTransferPUSH, versionDetails)

  // return deployed contracts
  return deployedContracts;
}

async function batchTransferPUSH(epnsToken, batchTransferPUSH, versionDetails) {
  // get individual user array
  console.log(chalk.bgBlue.white(`Sending the Tokens`))

  let individualTransferInfo = PUSH_REWARDS_INFO.rewardsInfo.helpers.convertUserObjectToIndividualArrays(PUSH_REWARDS_INFO.rewardsInfo.pushRewardsMapping)
  // console.log(individualTransferInfo.recipients.length)
  // return;

  let increment = 50
  let paged = 0
  let count = 0
  let max = individualTransferInfo.recipients.length

  while (paged != max) {
    if (paged + increment > max) {
      paged = max
    }
    else {
      paged = paged + increment
    }
    console.log(count, paged);

    tx = await batchTransferPUSH.transferPUSH(epnsToken, individualTransferInfo.recipients, individualTransferInfo.amounts, count, paged, {
      gasPrice: ethers.utils.parseUnits(versionDetails.deploy.args.gasInGwei.toString(), "gwei"),
      gasLimit: 8000000,
    })
    await tx.wait()

    console.log(chalk.bgBlack.white(`Transaction hash [${count} to ${paged}]:`), chalk.gray(`${tx.hash}`))
    console.log(chalk.bgBlack.white(`Transaction etherscan [${count} to ${paged}]:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

    count = paged
  }

  // Lastly transfer ownership
  // console.log(chalk.bgBlue.white(`Changing BatchTransferPUSH ownership to eventual owner`))
  // const tx = await BatchTransferPUSH.transferOwnership(META_INFO.multisigOwnerEventual)
  // console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  // console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
