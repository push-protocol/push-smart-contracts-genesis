// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const moment = require('moment')
const hre = require("hardhat");

const fs = require("fs");
const chalk = require("chalk");
const { config, ethers } = require("hardhat");

const { bn, tokens, bnToInt, timeInDays, timeInDate, WETH, UNISWAP_FACTORY, UNISWAP_INIT_CODEHASH } = require('../helpers/utils')

const {
  VESTING_INFO,
  DISTRIBUTION_INFO,
  META_INFO,
  STAKING_INFO
} = require("./constants");
const { getPushDistributionAmount, getLiquidityDistributionAmount } = require('../config/community_breakup/staking');

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

  // Deploy and Setup Staking Contracts
  deployedContracts = await setupStaking(deployedContracts, signer)

  return deployedContracts;
}

// Module Deploy - Staking
async function setupStaking(deployedContracts, signer) {
  const yieldFarmLPInitialArgs = STAKING_INFO.stakingInfo.liquidityPoolTokens

  const communityVault = await ethers.getContractFactory("CommunityVault");
  CommunityVault = await communityVault.attach(STAKING_INFO.stakingInfo.staking.communityVaultAddress)

  console.log(chalk.bgBlue.white(`Deploying Staking Contract`));
  // Deploying Staking Contract
  const stakingInitialArgs = STAKING_INFO.stakingInfo.staking
  const stakingArgs = [yieldFarmLPInitialArgs.epoch1Start, stakingInitialArgs.epochDuration]
  const StakingInstance = await deployContract("Staking", stakingArgs, "Staking")
  deployedContracts.push(StakingInstance)

  console.log(chalk.bgBlue.white(`Deploying LP Yield Farming Contract`));
  // Deploying LP token Yield Farming Contract
  const yieldFarmLPArgs = [
    STAKING_INFO.stakingInfo.staking.pushTokenAddress,
    STAKING_INFO.stakingInfo.staking.pushTokenAddress,
    StakingInstance.address,
    STAKING_INFO.stakingInfo.staking.communityVaultAddress,
    yieldFarmLPInitialArgs.startAmount.mul(ethers.BigNumber.from(10).pow(18)).toString(),
    yieldFarmLPInitialArgs.deprecation.mul(ethers.BigNumber.from(10).pow(18)).toString(),
    yieldFarmLPInitialArgs.nrOfEpochs.toString()
  ]
  const yieldFarmLPInstance = await deployContract("YieldFarm", yieldFarmLPArgs, "YieldFarm")
  deployedContracts.push(yieldFarmLPInstance)

  console.log(chalk.bgBlue.white(`Setting allowance for Staking contracts to spend tokens from CommunityVault`))
  const txCommunityVault = await CommunityVault.setAllowance(yieldFarmLPInstance.address, getLiquidityDistributionAmount())

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${txCommunityVault.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txCommunityVault.hash}`))

  return deployedContracts
}

// Verify All Contracts
async function verifyAllContracts(deployedContracts) {
  return new Promise(async function(resolve, reject) {

    const path = require("path");

    const deployment_path = path.join('artifacts', 'deployment_info')
    const network_path = path.join(deployment_path, hre.network.name)

    if (!fs.existsSync(deployment_path)) {
      fs.mkdirSync(deployment_path)
    }

    if (!fs.existsSync(network_path)) {
      fs.mkdirSync(network_path)
    }

    for await (contract of deployedContracts) {
      fs.writeFileSync(`${network_path}/${contract.filename}.address`, `address: ${contract.address}\nargs: ${contract.deployargs}`);

      const arguments = contract.deployargs

      if (hre.network.name != "hardhat") {
        // Mostly a real network, verify
        const { spawnSync } = require( 'child_process' )
        const ls = spawnSync( `npx`, [ 'hardhat', 'verify', '--network', hre.network.name, contract.address ].concat(arguments) )

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
