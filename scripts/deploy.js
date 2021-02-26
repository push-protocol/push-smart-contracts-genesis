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
  const PushToken = await deployContract("EPNS", [signer.address], "$PUSHs")
  deployedContracts.push(PushToken)

  // Next Deploy Vesting Factory Contracts
  // Deploy and Setup Advisors
  deployedContracts = await setupAdvisors(PushToken, deployedContracts, signer)

  // Deploy and Setup Community
  deployedContracts = await setupCommunity(PushToken, deployedContracts, signer)

  // Deploy and Setup Strategic
  deployedContracts = await setupStrategic(PushToken, deployedContracts, signer)

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

  if(Object.entries(VESTING_INFO.advisors.factory).length > 0){
    for await (const [key, value] of Object.entries(VESTING_INFO.advisors.factory)) {
      const advisor = value
      const filename = `${AdvisorsFactory.filename} -> ${key} (Instance)`

      // Deploy Advisor Instance
      console.log(chalk.bgBlue.white(`Deploying Advisors Instance:`), chalk.green(`${filename}`))

      const tx = await AdvisorsFactory.deployFundee(
        advisor.address,
        advisor.start,
        advisor.cliff,
        advisor.duration,
        advisor.revocable,
        advisor.tokens
      )

      const result = await tx.wait()
      const deployedAddress = result["events"][0].address

      console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`));
      console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`));

      const contractArtifacts = await ethers.getContractFactory("FundsDistributor")
      const deployedContract = await contractArtifacts.attach(deployedAddress)

      const advisorInstanceArgs = [advisor.address, advisor.start, advisor.cliff, advisor.duration, true]
      deployedContract.filename = `${AdvisorsFactory.filename} -> ${key} (Instance)`
      deployedContract.deployargs = advisorInstanceArgs

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

  return deployedContracts;
}

// Module Deploy - Strategic
async function setupStrategic(PushToken, deployedContracts, signer) {
  const strategicFactoryArgs = [PushToken.address, VESTING_INFO.community.strategic.deposit.start, VESTING_INFO.community.strategic.deposit.cliff, "StrategicAllocationFactory"]
  const StrategicAllocationFactory = await deployContract("FundsDistributorFactory", strategicFactoryArgs, "StrategicAllocationFactory")
  deployedContracts.push(StrategicAllocationFactory)

  // Next transfer appropriate funds
  await distributeInitialFunds(PushToken, StrategicAllocationFactory, VESTING_INFO.community.strategic.deposit.tokens, signer)

  // Deploy Factory Instances of Strategic Allocation
  console.log(chalk.bgBlue.white(`Deploying all instances of Strategic Allocation`));

  if(Object.entries(VESTING_INFO.community.strategic.factory).length > 0){
    for await (const [key, value] of Object.entries(VESTING_INFO.community.strategic.factory)) {
      const strategicAllocation = value
      const filename = `${StrategicAllocationFactory.filename} -> ${key} (Instance)`

      // Deploy Strategic Allocation Instance
      console.log(chalk.bgBlue.white(`Deploying Strategic Allocation Instance:`), chalk.green(`${filename}`))

      const tx = await StrategicAllocationFactory.deployFundee(
        strategicAllocation.address,
        strategicAllocation.start,
        strategicAllocation.cliff,
        strategicAllocation.duration,
        strategicAllocation.revocable,
        strategicAllocation.tokens
      )

      const result = await tx.wait()
      const deployedAddress = result["events"][0].address

      console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`));
      console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`));

      const contractArtifacts = await ethers.getContractFactory("FundsDistributor")
      const deployedContract = await contractArtifacts.attach(deployedAddress)

      const strategicAllocationInstanceArgs = [strategicAllocation.address, strategicAllocation.start, strategicAllocation.cliff, strategicAllocation.duration, true]
      deployedContract.filename = `${StrategicAllocationFactory.filename} -> ${key} (Instance)`
      deployedContract.deployargs = strategicAllocationInstanceArgs

      deployedContracts.push(deployedContract)
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

  if(Object.entries(VESTING_INFO.team.factory).length > 0){
    for await (const [key, value] of Object.entries(VESTING_INFO.team.factory)) {
      const team = value
      const filename = `${TeamFactory.filename} -> ${key} (Instance)`

      // Deploy Team Instance
      console.log(chalk.bgBlue.white(`Deploying Team Instance:`), chalk.green(`${filename}`))

      const tx = await TeamFactory.deployFundee(
        team.address,
        team.start,
        team.cliff,
        team.duration,
        team.revocable,
        team.tokens
      )

      const result = await tx.wait()
      const deployedAddress = result["events"][0].address

      console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`));
      console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`));

      const contractArtifacts = await ethers.getContractFactory("FundsDistributor")
      const deployedContract = await contractArtifacts.attach(deployedAddress)

      const teamInstanceArgs = [team.address, team.start, team.cliff, team.duration, true]
      deployedContract.filename = `${TeamFactory.filename} -> ${key} (Instance)`
      deployedContract.deployargs = teamInstanceArgs

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

    for await (contract of deployedContracts) {
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
