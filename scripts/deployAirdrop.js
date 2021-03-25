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

const {AIRDROP_INFO} = require("./constants")

// Primary Function
async function main() {
  // First deploy all contracts
  console.log(chalk.bgBlack.bold.green(`\n📡 Deploying MerkleDistributor \n-----------------------\n`));
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

  // Generate Merkle Root
  const merkleRoot = await generateMerkleRoot()

  // Deploy MerkleDistributor
  const DistributorArgs = [AIRDROP_INFO.airdrop.pushTokenAddress, merkleRoot]
  const Distributor = await deployContract("MerkleDistributor", DistributorArgs, "MerkleDistributor")
  deployedContracts.push(Distributor)

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
  const contract = await contractArtifacts.deploy(...args);
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
