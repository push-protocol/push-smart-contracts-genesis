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

const { bn, tokens, bnToInt, timeInDays, timeInDate } = require('../helpers/utils')

const {
  VESTING_INFO,
  DISTRIBUTION_INFO,
  META_INFO
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
  const PushToken = await deployContract("EPNS", [signer.address], "$PUSH")
  deployedContracts.push(PushToken)

  // Next Deploy Vesting Factory Contracts
  // Deploy and Setup Advisors
  deployedContracts = await setupAdvisors(PushToken, deployedContracts, signer)

  // Deploy and Setup Community
  deployedContracts = await setupCommunity(PushToken, deployedContracts, signer)

  // Deploy and Setup Team
  deployedContracts = await setupTeam(PushToken, deployedContracts, signer)

  // Deploy and Setup Investors
  deployedContracts = await setupTeam(PushToken, deployedContracts, signer)

  // Deploy and Setup Foundation
  deployedContracts = await setupFoundation(PushToken, deployedContracts, signer)


  return deployedContracts;
}

// Module Deploy - Advisors
async function setupAdvisors(PushToken, deployedContracts, signer) {
  const advisorsFactoryArgs = [PushToken.address, VESTING_INFO.advisors.deposit.start, VESTING_INFO.advisors.deposit.cliff, "AdvisorsFactory"]
  const AdvisorsFactory = await deployContract("FundsDistributorFactory", advisorsFactoryArgs, "AdvisorsFactory")
  deployedContracts.push(AdvisorsFactory)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, AdvisorsFactory, VESTING_INFO.advisors.deposit.tokens, signer)

  // Deploy Factory Instances of Advisors
  console.log(chalk.bgBlue.white(`Deploying all instances of Advisors`));

  let count = 0
  const identity = "advisors"

  if(Object.entries(VESTING_INFO.advisors.factory).length > 0){
    for await (const [key, value] of Object.entries(VESTING_INFO.advisors.factory)) {
      count = count + 1
      const uniqueId = `${identity}${count}`

      const allocation = value
      const filename = `${AdvisorsFactory.filename} -> ${key} (Instance)`

      // Deploy Advisor Instance
      console.log(chalk.bgBlue.white(`Deploying Advisors Instance:`), chalk.green(`${filename}`))

      const tx = await AdvisorsFactory.deployFundee(
        allocation.address,
        allocation.start,
        allocation.cliff,
        allocation.duration,
        allocation.revocable,
        allocation.tokens,
        uniqueId
      )

      const result = await tx.wait()
      const deployedAddress = result["events"][0].address

      console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`));
      console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`));

      const contractArtifacts = await ethers.getContractFactory("FundsDistributor")
      let deployedContract = await contractArtifacts.attach(deployedAddress)

      const instanceArgs = [allocation.address, allocation.start, allocation.cliff, allocation.duration, allocation.tokens, uniqueId]
      deployedContract.filename = `${AdvisorsFactory.filename} -> ${key} (Instance)`
      deployedContract.deployargs = instanceArgs

      deployedContracts.push(deployedContract)
    }
  } else {
    console.log(chalk.bgBlack.red('No Advisors Instances Found'))
  }

  // Lastly transfer ownership of advisors contract
  console.log(chalk.bgBlue.white(`Changing AdvisorsFactory ownership to eventual owner`))

  const tx = await AdvisorsFactory.transferOwnership(META_INFO.eventualOwner)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

  return deployedContracts;
}

// Module Deploy - Community
async function setupCommunity(PushToken, deployedContracts, signer) {
  // Setup community reserves
  deployedContracts = await setupCommReserves(PushToken, deployedContracts, signer)

  // Setup Public Sale
  deployedContracts = await setupCommPublicSale(PushToken, deployedContracts, signer)

  // Setup Strateic
  deployedContracts = await setupStrategic(PushToken, deployedContracts, signer)

  return deployedContracts
}

async function setupCommReserves(PushToken, deployedContracts, signer) {
  // Deploying Community Reservoir
  const commInitialParams = VESTING_INFO.community.commreservoir.deposit
  const commReservoirArgs = [PushToken.address, commInitialParams.address, commInitialParams.start, commInitialParams.cliff, commInitialParams.duration, true, "Community Vested Reserves"]
  const CommReservoir = await deployContract("VestedReserves", commReservoirArgs, "CommunityVestedReserves")
  deployedContracts.push(CommReservoir)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, CommReservoir, VESTING_INFO.community.commreservoir.deposit.tokens, signer)

  // Lastly transfer ownership of community reservoir contract
  console.log(chalk.bgBlue.white(`Changing CommReservoir ownership to eventual owner`))

  const txCommReservoir = await CommReservoir.transferOwnership(META_INFO.eventualOwner)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${txCommReservoir.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txCommReservoir.hash}`))

  return deployedContracts
}

async function setupCommPublicSale(PushToken, deployedContracts, signer) {
  // Deploying Public Sale
  const publicSaleArgs = [PushToken.address, "PublicSaleReserves"]
  const PublicSaleReserves = await deployContract("Reserves", publicSaleArgs, "PublicSaleReserves")
  deployedContracts.push(PublicSaleReserves)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, PublicSaleReserves, VESTING_INFO.community.publicsale.deposit.tokens, signer)

  // Lastly transfer ownership of public sale contract
  console.log(chalk.bgBlue.white(`Changing PublicSale ownership to eventual owner`))

  const txPublicSale = await PublicSaleReserves.transferOwnership(META_INFO.eventualOwner)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${txPublicSale.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txPublicSale.hash}`))

  return deployedContracts
}

async function setupStrategic(PushToken, deployedContracts, signer) {
  const strategicFactoryArgs = [PushToken.address, VESTING_INFO.community.strategic.deposit.start, VESTING_INFO.community.strategic.deposit.cliff, "StrategicAllocationFactory"]
  const StrategicAllocationFactory = await deployContract("FundsDistributorFactory", strategicFactoryArgs, "StrategicAllocationFactory")
  deployedContracts.push(StrategicAllocationFactory)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, StrategicAllocationFactory, VESTING_INFO.community.strategic.deposit.tokens, signer)

  // Deploy Factory Instances of Strategic Allocation
  console.log(chalk.bgBlue.white(`Deploying all instances of Strategic Allocation`));

  let count = 0
  const identity = "strategic"

  if(Object.entries(VESTING_INFO.community.strategic.factory).length > 0){
    for await (const [key, value] of Object.entries(VESTING_INFO.community.strategic.factory)) {
      count = count + 1
      const uniqueTimelockId = `${identity}timelock${count}`
      const uniqueVestedId = `${identity}vested${count}`

      const allocation = value
      const filename = `${StrategicAllocationFactory.filename} -> ${key} (Instance)`

      const tokensInt = bnToInt(bn(allocation.tokens))
      const releaseBuffer = 60 * 10 // 600 seconds

      // split it, timelock
      const timelockStart = allocation.timelocked.start
      const timelockCliff = allocation.timelocked.cliff
      const timelockDuration = timelockCliff + releaseBuffer // add a release buffer of 10 mins

      const timelockTokensInt = Math.floor(tokensInt * (allocation.timelocked.perc / 100))
      const timelockTokens = tokens(timelockTokensInt)

      // vested
      const vestedStart = timelockStart + timelockCliff + releaseBuffer
      const vestedCliff = 0
      const vestedDuration = allocation.vested.duration

      const vestedToknesInt = tokensInt - timelockTokensInt
      const vestedTokens = tokens(vestedToknesInt)

      // Deploy Strategic Allocation Instance
      console.log(chalk.bgBlue.white(`Deploying Strategic Allocation Instance:`), chalk.green(`${filename}`))
      console.log(chalk.bgBlack.gray(`Breakdown: ${tokensInt} [${allocation.tokens}] Tokens`));
      console.log(chalk.bgBlack.gray(`Timelock --> Tokens: ${timelockTokensInt} [${timelockTokens}] Tokens, Start: ${timelockStart} [${timeInDate(timelockStart)}], Cliff: ${timelockCliff} [${timeInDays(timelockCliff)} Days], Duration: ${timelockDuration} [${timeInDays(timelockDuration)} Days]`));
      console.log(chalk.bgBlack.gray(`Vested --> Tokens: ${vestedToknesInt} [${vestedTokens}] Tokens, Start: ${vestedStart} [${timeInDate(vestedStart)}], Cliff: ${vestedCliff} [${timeInDays(vestedCliff)} Days], Duration: ${vestedDuration} [${timeInDays(vestedDuration)} Days]`));

      // keep a tab on contract artifacts
      const contractArtifacts = await ethers.getContractFactory("FundsDistributor")

      // Deploy Timelock
      const txTimelock = await StrategicAllocationFactory.deployFundee(
        allocation.address,
        timelockStart,
        timelockCliff,
        timelockDuration,
        allocation.revocable,
        timelockTokens,
        uniqueTimelockId
      )

      const resultTimelock = await txTimelock.wait()
      const deployedTimelockAddr = resultTimelock["events"][0].address

      console.log(chalk.bgBlack.white(`Transaction hash [Timelock]:`), chalk.gray(`${txTimelock.hash}`));
      console.log(chalk.bgBlack.white(`Transaction etherscan [Timelock]:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txTimelock.hash}`));

      let deployedTimelockContract = await contractArtifacts.attach(deployedTimelockAddr)

      const instanceTimelockArgs = [allocation.address, timelockStart, timelockCliff, timelockDuration, allocation.revocable, uniqueTimelockId]
      deployedTimelockContract.filename = `${StrategicAllocationFactory.filename} -> ${key} (Timelock Instance)`
      deployedTimelockContract.deployargs = instanceTimelockArgs

      deployedContracts.push(deployedTimelockContract)

      // Deploy Vested
      const txVested = await StrategicAllocationFactory.deployFundee(
        allocation.address,
        vestedStart,
        vestedCliff,
        vestedDuration,
        allocation.revocable,
        vestedTokens,
        uniqueVestedId
      )

      const resultVested = await txTimelock.wait()
      const deployedVestedAddr = resultVested["events"][0].address

      console.log(chalk.bgBlack.white(`Transaction hash [Vested]:`), chalk.gray(`${txVested.hash}`));
      console.log(chalk.bgBlack.white(`Transaction etherscan [Vested]:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txVested.hash}`));

      let deployedVestedContract = await contractArtifacts.attach(deployedVestedAddr)

      const instanceVestedArgs = [allocation.address, vestedStart, vestedCliff, vestedDuration, allocation.revocable, uniqueVestedId]
      deployedVestedContract.filename = `${StrategicAllocationFactory.filename} -> ${key} (Vested Instance)`
      deployedVestedContract.deployargs = instanceVestedArgs

      deployedContracts.push(deployedVestedContract)
    }
  } else {
    console.log(chalk.bgBlack.red('No Strategic Allocation Instances Found'))
  }

  // Lastly transfer ownership of startegic allocation factory contract
  console.log(chalk.bgBlue.white(`Changing StrategicAllocationFactory ownership to eventual owner`))

  const tx = await StrategicAllocationFactory.transferOwnership(META_INFO.eventualOwner)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

  return deployedContracts;
}

// Module Deploy - Team
async function setupTeam(PushToken, deployedContracts, signer) {
  const teamFactoryArgs = [PushToken.address, VESTING_INFO.team.deposit.start, VESTING_INFO.team.deposit.cliff, "TeamFactory"]
  const TeamFactory = await deployContract("FundsDistributorFactory", teamFactoryArgs, "TeamFactory")
  deployedContracts.push(TeamFactory)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, TeamFactory, VESTING_INFO.team.deposit.tokens, signer)

  // Deploy Factory Instances of Team
  console.log(chalk.bgBlue.white(`Deploying all instances of Team Members`));

  let count = 0
  const identity = "team"

  if(Object.entries(VESTING_INFO.team.factory).length > 0){
    for await (const [key, value] of Object.entries(VESTING_INFO.team.factory)) {
      count = count + 1
      const uniqueId = `${identity}${count}`

      const allocation = value
      const filename = `${TeamFactory.filename} -> ${key} (Instance)`

      // Deploy Team Instance
      console.log(chalk.bgBlue.white(`Deploying Team Instance:`), chalk.green(`${filename}`))

      const tx = await TeamFactory.deployFundee(
        allocation.address,
        allocation.start,
        allocation.cliff,
        allocation.duration,
        allocation.revocable,
        allocation.tokens,
        uniqueId
      )

      const result = await tx.wait()
      const deployedAddress = result["events"][0].address

      console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`));
      console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`));

      const contractArtifacts = await ethers.getContractFactory("FundsDistributor")
      const deployedContract = await contractArtifacts.attach(deployedAddress)

      const instanceArgs = [allocation.address, allocation.start, allocation.cliff, allocation.duration, allocation.revocable, uniqueId]
      deployedContract.filename = `${TeamFactory.filename} -> ${key} (Instance)`
      deployedContract.deployargs = instanceArgs

      deployedContracts.push(deployedContract)
    }
  } else {
    console.log(chalk.bgBlack.red('No Team Instances Found'))
  }

  // Lastly transfer ownership of team factory contract
  console.log(chalk.bgBlue.white(`Changing TeamFactory ownership to eventual owner`))

  const tx = await TeamFactory.transferOwnership(META_INFO.eventualOwner)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

  return deployedContracts;
}

// Module Deploy - Foundation
async function setupFoundation(PushToken, deployedContracts, signer) {
  // Deploying Community Reservoir
  const commInitialParams = VESTING_INFO.foundation.deposit1
  const commReservoirArgs = [PushToken.address, commInitialParams.address, commInitialParams.start, commInitialParams.cliff, commInitialParams.duration, true, "Community Vested Reserves"]
  const CommReservoir = await deployContract("VestedReserves", commReservoirArgs, "CommunityVestedReserves")
  deployedContracts.push(CommReservoir)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, CommReservoir, VESTING_INFO.community.commreservoir.deposit.tokens, signer)

  // Lastly transfer ownership of community reservoir contract
  console.log(chalk.bgBlue.white(`Changing CommReservoir ownership to eventual owner`))

  const txCommReservoir = await CommReservoir.transferOwnership(META_INFO.eventualOwner)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${txCommReservoir.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txCommReservoir.hash}`))

  return deployedContracts
}

// Module Deploy - Investors
async function setupInvestors(PushToken, deployedContracts, signer) {
  const investorsFactoryArgs = [PushToken.address, VESTING_INFO.investors.deposit.start, VESTING_INFO.community.strategic.deposit.cliff, "StrategicAllocationFactory"]
  const InvestorsAllocationFactory = await deployContract("FundsDistributorFactory", strategicFactoryArgs, "InvestorsAllocationFactory")
  deployedContracts.push(InvestorsAllocationFactory)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, InvestorsAllocationFactory, VESTING_INFO.investors.deposit.tokens, signer)

  // Deploy Factory Instances of Strategic Allocation
  console.log(chalk.bgBlue.white(`Deploying all instances of Strategic Allocation`));

  let count = 0
  const identity = "strategic"

  if(Object.entries(VESTING_INFO.investors.factory).length > 0){
    for await (const [key, value] of Object.entries(VESTING_INFO.investors.factory)) {
      count = count + 1
      const uniqueTimelockId = `${identity}timelock${count}`
      const uniqueVestedId = `${identity}vested${count}`

      const allocation = value
      const filename = `${InvestorsAllocationFactory.filename} -> ${key} (Instance)`

      const tokensInt = bnToInt(bn(allocation.tokens))
      const releaseBuffer = 60 * 10 // 600 seconds

      // split it, timelock
      const timelockStart = allocation.timelocked.start
      const timelockCliff = allocation.timelocked.cliff
      const timelockDuration = timelockCliff + releaseBuffer // add a release buffer of 10 mins

      const timelockTokensInt = Math.floor(tokensInt * (allocation.timelocked.perc / 100))
      const timelockTokens = tokens(timelockTokensInt)

      // vested
      const vestedStart = timelockStart + timelockCliff + releaseBuffer
      const vestedCliff = 0
      const vestedDuration = allocation.vested.duration

      const vestedToknesInt = tokensInt - timelockTokensInt
      const vestedTokens = tokens(vestedToknesInt)

      // Deploy Strategic Allocation Instance
      console.log(chalk.bgBlue.white(`Deploying Investors Allocation Instance:`), chalk.green(`${filename}`))
      console.log(chalk.bgBlack.gray(`Breakdown: ${tokensInt} [${allocation.tokens}] Tokens`));
      console.log(chalk.bgBlack.gray(`Timelock --> Tokens: ${timelockTokensInt} [${timelockTokens}] Tokens, Start: ${timelockStart}, Cliff: ${timelockCliff}, Duration: ${timelockDuration}`));
      console.log(chalk.bgBlack.gray(`Vested --> Tokens: ${vestedToknesInt} [${vestedTokens}] Tokens, Start: ${vestedStart}, Cliff: ${vestedCliff}, Duration: ${vestedDuration}`));

      // keep a tab on contract artifacts
      const contractArtifacts = await ethers.getContractFactory("FundsDistributor")

      // Deploy Timelock
      const txTimelock = await InvestorsAllocationFactory.deployFundee(
        allocation.address,
        timelockStart,
        timelockCliff,
        timelockDuration,
        allocation.revocable,
        timelockTokens,
        uniqueTimelockId
      )

      const resultTimelock = await txTimelock.wait()
      const deployedTimelockAddr = resultTimelock["events"][0].address

      console.log(chalk.bgBlack.white(`Transaction hash [Timelock]:`), chalk.gray(`${txTimelock.hash}`));
      console.log(chalk.bgBlack.white(`Transaction etherscan [Timelock]:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txTimelock.hash}`));

      let deployedTimelockContract = await contractArtifacts.attach(deployedTimelockAddr)

      const instanceTimelockArgs = [allocation.address, timelockStart, timelockCliff, timelockDuration, allocation.revocable, uniqueTimelockId]
      deployedTimelockContract.filename = `${InvestorsAllocationFactory.filename} -> ${key} (Timelock Instance)`
      deployedTimelockContract.deployargs = instanceTimelockArgs

      deployedContracts.push(deployedTimelockContract)

      // Deploy Vested
      const txVested = await InvestorsAllocationFactory.deployFundee(
        allocation.address,
        vestedStart,
        vestedCliff,
        vestedDuration,
        allocation.revocable,
        vestedTokens,
        uniqueVestedId
      )

      const resultVested = await txTimelock.wait()
      const deployedVestedAddr = resultVested["events"][0].address

      console.log(chalk.bgBlack.white(`Transaction hash [Vested]:`), chalk.gray(`${txVested.hash}`));
      console.log(chalk.bgBlack.white(`Transaction etherscan [Vested]:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${txVested.hash}`));

      let deployedVestedContract = await contractArtifacts.attach(deployedVestedAddr)

      const instanceVestedArgs = [allocation.address, vestedStart, vestedCliff, vestedDuration, allocation.revocable, uniqueVestedId]
      deployedVestedContract.filename = `${InvestorsAllocationFactory.filename} -> ${key} (Vested Instance)`
      deployedVestedContract.deployargs = instanceVestedArgs

      deployedContracts.push(deployedVestedContract)
    }
  } else {
    console.log(chalk.bgBlack.red('No Investors Allocation Instances Found'))
  }

  // Lastly transfer ownership of startegic allocation factory contract
  console.log(chalk.bgBlue.white(`Changing InvestorsAllocationFactory ownership to eventual owner`))

  const tx = await InvestorsAllocationFactory.transferOwnership(META_INFO.eventualOwner)

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))

  return deployedContracts;
}

// For Distributing funds
async function distributeInitialFunds(contract, vestingContract, amount, signer) {
  let balance;
  console.log(chalk.bgBlue.white(`Distributing Initial Funds`))
  console.log(chalk.bgBlack.white(`Sending Funds to ${vestingContract.filename}`), chalk.green(`${ethers.utils.formatUnits(amount)} Tokens`))

  balance = await contract.balanceOf(signer.address)
  console.log(chalk.bgBlack.white(`Push Token Balance Before Transfer:`), chalk.yellow(`${ethers.utils.formatUnits(balance)} Tokens`))
  const tx = await contract.transfer(vestingContract.address, amount)
  await tx.wait()

  balance = await contract.balanceOf(signer.address)
  console.log(chalk.bgBlack.white(`Push Token Balance After Transfer:`), chalk.yellow(`${ethers.utils.formatUnits(balance)} Tokens`))

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))
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
