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
  NFT_INFO
} = require("./constants/constants")

// Primary Function
async function main() {
  // Version Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Version Checks \n-----------------------\n`))
  const versionDetails = versionVerifier(["dummyBlock"])
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Version Control Passed \n\t\t\t\n`))

  // Token Verification Check
  // console.log(chalk.bgBlack.bold.green(`\n✌️  Running Token Verification Checks \n-----------------------\n`))
  // verifyTokensAmount();
  // console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Token Verification Passed \n\t\t\t\n`))

  // First deploy all contracts
  console.log(chalk.bgBlack.bold.green(`\n📡 Deploying ROCKSTAR_V2 NFTs and Minting \n-----------------------\n`));
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

  // Deploy ROCKSTAR ERC721
  const RockstarV2 = await deployContract("RockstarV2", [], "$ROCKSTAR_V2")
  deployedContracts.push(RockstarV2)
  
  // Deploy MintBatchNFT
  const BatchMintNFT = await deployContract("BatchMintNFT", [], "RockstarNFTBatchMinter")
  deployedContracts.push(BatchMintNFT)

  // Hacky cause script crashed
  // const RockstarV2 = await ethers.getContractAt("RockstarV2", "0x5e17D38e31D388E879783c7b81944421D35F4899")
  // const BatchMintNFT = await ethers.getContractAt("BatchMintNFT", "0xbb7D757a6cA797ad76a6522917ecc51Fd39915F8")

  // RockstarV2.filename = 'RockstarV2'
  // RockstarV2.deployargs = []
  // RockstarV2.customid = 'RockstarV2EPNS'

  // BatchMintNFT.filename = 'BatchMintNFT'
  // BatchMintNFT.deployargs = []
  // BatchMintNFT.customid = 'BatchMintNFT'

  // deployedContracts.push(RockstarV2)
  // deployedContracts.push(BatchMintNFT)

  // Batch Mint NFTs
  await batchMintNFTs(RockstarV2, BatchMintNFT)

  // return deployed contracts
  return deployedContracts;
}

async function batchMintNFTs(rockstar, batchMintNFT) {
  // transfer ownership to allow mint from batch contract
  console.log(chalk.bgBlue.white(`Transfering ownership to BatchMintNFT to allow for safe mint`))
  
  let tx = await rockstar.transferOwnership(batchMintNFT.address)

  await tx.wait()
  
  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

  // get individual nfts array
  console.log(chalk.bgBlue.white(`Minting the artworks`))
  let individualNFTInfos = NFT_INFO.nfts.helpers.convertNFTObjectToIndividualArrays(NFT_INFO.nfts.nftsMapping)
  console.log('individualNFTInfos', individualNFTInfos)
  let increment = 20
  let paged = 20
  let count = 0
  let max = 100

  while (paged != max) {
    if (paged + increment > max) {
      paged = max
    }
    else {
      paged = paged + increment
    }

    tx = await batchMintNFT.produceNFTs(rockstar.address, individualNFTInfos.recipients, individualNFTInfos.metadatas, count, paged, {
      gasPrice: ethers.utils.parseUnits("100", "gwei"),
      gasLimit: 9000000,
    })
    await tx.wait()

    console.log(chalk.bgBlack.white(`Transaction hash [${count} to ${paged}]:`), chalk.gray(`${tx.hash}`))
    console.log(chalk.bgBlack.white(`Transaction etherscan [${count} to ${paged}]:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

    count = paged
  }

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
