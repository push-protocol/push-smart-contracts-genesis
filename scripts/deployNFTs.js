// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const fs = require("fs");
const chalk = require("chalk");
const { config, ethers } = require("hardhat");

const {
  NFT_INFO
} = require("./constants")

// Primary Function
async function main() {
  // First deploy all contracts
  console.log(chalk.bgBlack.bold.green(`\n📡 Deploying ROCKSTAR NFTs and Minting \n-----------------------\n`));
  const deployedContracts = await setupAllContracts();
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n All Contracts Deployed \n\t\t\t\n`));

  // Try to verify
  console.log(chalk.bgBlack.bold.green(`\n📡 Verifying Contracts \n-----------------------\n`));
  await verifyAllContracts(deployedContracts);
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n All Contracts Verified \n\t\t\t\n`));
}

// Secondary Functions
// Deploy All Contracts
async function setupAllContracts() {
  let deployedContracts = [];
  const signer = await ethers.getSigner(0)

  // Deploy ROCKSTAR ERC721
  const Rockstar = await deployContract("Rockstar", [signer.address], "$ROCKSTAR")
  deployedContracts.push(Rockstar)

  // Deploy MintBatchNFT
  const BatchMintNFT = await deployContract("BatchMintNFT", [], "RockstarNFTBatchMinter")
  deployedContracts.push(BatchMintNFT)

  // Batch Mint NFTs
  await batchMintNFTs(Rockstar, BatchMintNFT)

  // return deployed contracts
  return deployedContracts;
}

async function batchMintNFTs(rockstar, batchMintNFT) {
  // transfer ownership to allow mint from batch contract
  console.log(chalk.bgBlue.white(`Transfering ownership to BatchMintNFT to allow for safe mint`))

  let tx = await rockstar.transferOwnership(batchMintNFT.address)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

  // get individual nfts array
  console.log(chalk.bgBlue.white(`Minting the artworks`))
  let individualNFTInfos = NFT_INFO.convertNFTObjectToIndividualArrays(NFT_INFO.nfts)

  let increment = 34
  let paged = 0
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
      gasLimit: 7500000
    })
    await tx.wait()

    console.log(chalk.bgBlack.white(`Transaction hash [${count} to ${paged}]:`), chalk.gray(`${tx.hash}`))
    console.log(chalk.bgBlack.white(`Transaction etherscan [${count} to ${paged}]:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

    count = paged
  }

  // Lastly revoke ownership
  console.log(chalk.bgBlue.white(`Revoking Ownership`))

  tx = await batchMintNFT.revokeOwnership(rockstar.address)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))
}

// Verify All Contracts
async function verifyAllContracts(deployedContracts) {
  return new Promise(async function(resolve, reject) {

    for await (contract of deployedContracts) {
      const arguments = contract.deployargs

      if (hre.network.name != "hardhat") {
        // Mostly a real network, verify
        const { spawnSync } = require( 'child_process' )
        const ls = spawnSync( `npx`, [ 'hardhat', 'verify', '--network', hre.network.name, contract.address ] )

        console.log( `stderr: ${ ls.stderr.toString() }` )
        console.log( `stdout: ${ ls.stdout.toString() }` )
      }
      else {
        console.log(chalk.bgWhiteBright.black(`${contract.filename}.sol`), chalk.bgRed.white(` is on Hardhat network... skipping`))
      }
    }

    resolve();
  });
}

// Helper Functions
// For Deploy
async function deploy(name, _args, identifier) {
  const args = _args || [];

  console.log(`📄 ${name}`);
  const contractArtifacts = await ethers.getContractFactory(name);
  const contract = await contractArtifacts.deploy();
  await contract.deployed()
  console.log(
    chalk.cyan(name),
    "deployed to:",
    chalk.magenta(contract.address)
  );
  fs.writeFileSync(`artifacts/${name}_${identifier}.address`, contract.address);
  return contract;
}

async function deployContract(contractName, contractArgs, identifier) {
  let contract = await deploy(contractName, contractArgs, identifier);

  contract.filename = `${contractName} -> ${identifier}`;
  contract.deployargs = contractArgs;

  return contract;
}

function readArgumentsFile(contractName) {
  let args = [];
  try {
    const argsFile = `./contracts/${contractName}.args`
    if (fs.existsSync(argsFile)) {
      args = JSON.parse(fs.readFileSync(argsFile));
    }
  } catch (e) {
    console.log(e);
  }

  return args;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
