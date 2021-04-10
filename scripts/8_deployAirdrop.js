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
const { verifyTokensAmount } = require('../loaders/tokenAmountVerifier')

// Primary Function
async function main() {
  // Version Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Version Checks \n-----------------------\n`))
  const versionDetails = versionVerifier(["pushTokenAddress", "commUnlockedContract"])
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Version Control Passed \n\t\t\t\n`))

  // Token Verification Check
  console.log(chalk.bgBlack.bold.green(`\n✌️  Running Token Verification Checks \n-----------------------\n`))
  verifyTokensAmount();
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Token Verification Passed \n\t\t\t\n`))

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

  // Get EPNS ($PUSH) instance first
  const PushToken = await ethers.getContractAt("EPNS", versionDetails.deploy.args.pushTokenAddress)

  // Get Comm Unlocked instance
  const CommUnlocked = await ethers.getContractAt("Reserves", versionDetails.deploy.args.commUnlockedContract)

  // Generate Merkle Root
  const merkleRoot = await generateMerkleRoot()

  // Deploy MerkleDistributor
  const DistributorArgs = [PushToken.address, merkleRoot]
  const Distributor = await deployContract("MerkleDistributor", DistributorArgs, "MerkleDistributor")
  deployedContracts.push(Distributor)

  // Push token transfer to MerkleDistributor
  await tokensToDistrbutor(Distributor, PushToken, CommUnlocked)

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

async function tokensToDistrbutor(Distributor, PushToken, CommUnlocked) {
  const signer = await ethers.getSigner(0)

  // Get tokens / eth requirements
  const reqTokens = bn(AIRDROP_INFO.airdrop.tokens)

  // Check if wallet has exact push balance to avoid mishaps
  let pushBalance = await PushToken.balanceOf(Distributor.address)
  console.log(reqTokens.toString());

  console.log(chalk.bgBlack.white(`Check - Push Balance of ${Distributor.address}`), chalk.green(`${bnToInt(pushBalance)} PUSH`), chalk.bgBlack.white(`Required: ${bnToInt(reqTokens)} PUSH`))
  if (pushBalance < reqTokens) {
    // Transfer from Comm Unlocked, doing this again will result in bad things
    console.log(chalk.bgBlack.white(`Transferring the requisite amount...`))

    await sendFromCommUnlocked(PushToken, CommUnlocked, signer, Distributor.address, reqTokens)
    pushBalance = await PushToken.balanceOf(Distributor.address)
  }

  console.log(chalk.bgBlack.white(`Check - Push Balance of ${Distributor.address}`), chalk.green(`${bnToInt(pushBalance)} PUSH`), chalk.bgBlack.white(`Required: ${bnToInt(reqTokens)} PUSH`))
  if (pushBalance < reqTokens) {
    console.log(chalk.bgRed.white(`Not enough $PUSH Balance.`), chalk.bgGray.white(`Req bal:`), chalk.green(`${bnToInt(reqTokens)} PUSH tokens`), chalk.bgGray.white(`Wallet bal:`), chalk.red(`${bnToInt(pushBalance)} PUSH tokens\n`))
    process.exit(1)
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
