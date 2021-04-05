// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const fs = require("fs");
const chalk = require("chalk");
const { config, ethers } = require("hardhat");
const { parseBalanceMap } = require("../helpers/parse-balance-map")

const { AIRDROP_INFO } = require("./constants/constants")

const { bn, tokens, bnToInt, timeInDays, timeInDate, readArgumentsFile, deployContract, verifyAllContracts } = require('../helpers/utils')
const { versionVerifier, upgradeVersion } = require('../loaders/versionVerifier')

// Primary Function
async function main() {
  // Version Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Version Checks \n-----------------------\n`))
  const versionDetails = versionVerifier(["pushTokenAddress"])
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Version Control Passed \n\t\t\t\n`))

  // First deploy all contracts
  console.log(chalk.bgBlack.bold.green(`\n📡 Deploying MerkleDistributor \n-----------------------\n`));
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

  // Generate Merkle Root
  const merkleRoot = await generateMerkleRoot()

  // Deploy MerkleDistributor
  const DistributorArgs = [versionDetails.deploy.args.pushTokenAddress, merkleRoot]
  const Distributor = await deployContract("MerkleDistributor", DistributorArgs, "MerkleDistributor")
  deployedContracts.push(Distributor)

  // Push token transfer to MerkleDistributor
  await tokensToDistrbutor(Distributor, versionDetails.deploy.args.pushTokenAddress)

  return deployedContracts;
}

async function generateMerkleRoot() {
  // generate Merkle Root using the addresses in ./data/example.json
  console.log(chalk.bgBlue.white(`Generating Merkle Root`))

  const json = await JSON.parse(fs.readFileSync("./data/example.json", { encoding: 'utf8' }))

  if (typeof json !== 'object') throw new Error('Invalid JSON')
  let res = parseBalanceMap(json)
  console.log(chalk.bgBlack.white(`Merkle Root:`), chalk.gray(`${res.merkleRoot}`))

  //Merkle tree info are written to the file ./data/claims.json
  fs.writeFileSync("./data/claims.json", JSON.stringify(res), { encoding: 'utf8' })

  return res.merkleRoot

}

async function tokensToDistrbutor(Distributor, pushTokenAddress) {
  // transfer PUSH tokens to NFTRewards
  console.log(chalk.bgBlue.white(`Transferring PUSH tokens to Distributor`))

  let pushToken = await ethers.getContractAt("EPNS", pushTokenAddress)
  let tx = await pushToken.transfer(Distributor.address, AIRDROP_INFO.airdrop.tokens)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
