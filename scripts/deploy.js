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
  VESTING_INFO,
  TOKEN_INFO
} = require("./constants");

// Primary Function
async function main() {
  // First deploy all contracts
  console.log(chalk.bgBlack.bold.green(`\n📡 Deploying Contracts \n-----------------------\n`));
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

  // Deploy EPNS ($PUSH) Tokens first
  const pushTokenArgs = readArgumentsFile("EPNS")
  const PushToken = await deployContract("EPNS", [signer.address])
  deployedContracts.push(PushToken)

  // Next Deploy Vesting Factory Contracts
  // Deploy Advisors Factory
  const advisorsFactoryArgs = [PushToken.address, VESTING_INFO.advisors.deposit.start, VESTING_INFO.advisors.deposit.cliff]
  const AdvisorsFactory = await deployContract("Advisors", advisorsFactoryArgs)
  deployedContracts.push(AdvisorsFactory)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, AdvisorsFactory, VESTING_INFO.advisors.deposit.tokens, signer)

  // Deploy Factory Instances of Advisors

  for (const [key, value] of Object.entries(VESTING_INFO.advisors.factory)) {
    const advisor = value

    // Deploy Advisor Instance
    const tx = await AdvisorsFactory.deployAdvisor(
      advisor.address,
      advisor.start,
      advisor.cliff,
      advisor.duration,
      true,
      advisor.tokens
    )

    const events = await AdvisorsFactory.queryFilter("DeployAdvisor", tx.blockNumber)
    const deployedAddress = events[0].args[0]
    const deployedContract = ethers.contractFactory.attach(deployedAddress)

    const advisorInstanceArgs = [advisor.address, advisor.start, advisor.vesting, advisor.cliff, advisor.duration, true, advisor.tokens]
    deployedContract.filename = `${AdvisorsFactory.filename} -> ${advisor.name}`
    deployedContract.deployargs = advisorInstanceArgs

    deployedContracts.push(deployedContract)
  }

  return deployedContracts;
}

// Verify All Contracts
async function verifyAllContracts(deployedContracts) {
  return new Promise(async function(resolve, reject) {

    for await (contract of deployedContracts) {
      const arguments = contract.deployargs

      if (hre.network.name != "hardhat") {
        // Mostly a real network, verify
        const { spawnSync } = require( 'child_process' );
        const ls = spawnSync( `npx`, [ 'hardhat', 'verify', '--network', hre.network.name, contract.address ].concat(arguments) );

        console.log( `stderr: ${ ls.stderr.toString() }` );
        console.log( `stdout: ${ ls.stdout.toString() }` );
      }
      else {
        console.log(chalk.bgWhiteBright.black(`${contract.filename}.sol`), chalk.bgRed.white(` is on Hardhat network... skipping`));
      }
    }

    resolve();
  });
}

// Helper Functions
// For Deploy
async function deploy(name, _args) {
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
  fs.writeFileSync(`artifacts/${name}.address`, contract.address);
  return contract;
}

async function deployContract(contractName, contractArgs) {
  let contract = await deploy(contractName, contractArgs);

  contract.filename = contractName;
  contract.deployargs = contractArgs;

  return contract;
}

function readArgumentsFile(contractName) {
  let args = [];
  try {
    const argsFile = `./contracts/${contractName}.args`;
    if (fs.existsSync(argsFile)) {
      args = JSON.parse(fs.readFileSync(argsFile));
    }
  } catch (e) {
    console.log(e);
  }

  return args;
}

// For Distributing funds
async function distributeInitialFunds(contract, vestingContract, amount, signer) {
  let balance;
  console.log(chalk.bgBlack.white(`Distributing Initial Funds`));
  console.log(chalk.bgBlack.white(`Sending Funds to ${vestingContract.filename}`), chalk.green(`${ethers.utils.formatUnits(amount)} Tokens`));

  balance = await contract.balanceOf(signer.address)
  console.log(chalk.bgBlack.white(`Push Token Balance Before Transfer:`), chalk.green(`${ethers.utils.formatUnits(balance)} Tokens`));
  const tx = await contract.transfer(vestingContract.address, amount);
  await tx.wait();

  balance = await contract.balanceOf(signer.address)
  console.log(chalk.bgBlack.white(`Push Token Balance After Transfer:`), chalk.green(`${ethers.utils.formatUnits(balance)} Tokens`));

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.green(`${tx.hash}`));
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.green(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
