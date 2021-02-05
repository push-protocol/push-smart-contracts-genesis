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
  VESTING_CLIFF,
  VESTING_CONTRACTS,
  VESTING_START_TIME,
  EPNS_ADVISORS_FUNDS_AMOUNT,
} = require("./constants");

async function deploy(name, _args) {
  const args = _args || [];

  console.log(`📄 ${name}`);
  const contractArtifacts = await ethers.getContractFactory(name);
  const contract = await contractArtifacts.deploy(...args);
  console.log(
    chalk.cyan(name),
    "deployed to:",
    chalk.magenta(contract.address)
  );
  fs.writeFileSync(`artifacts/${name}.address`, contract.address);
  console.log("\n");
  return contract;
}

const isSolidity = (fileName) =>
  fileName.indexOf(".sol") >= 0 && fileName.indexOf(".swp.") < 0;

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

async function autoDeploy() {
  const contractList = fs.readdirSync(config.paths.sources);
  console.log(contractList);
  return contractList
    .filter((fileName) => isSolidity(fileName))
    .reduce((lastDeployment, fileName) => {
      const contractName = fileName.replace(".sol", "");
      const args = readArgumentsFile(contractName);

      // Wait for last deployment to complete before starting the next
      return lastDeployment.then((resultArrSoFar) =>
        deploy(contractName, args).then((result) => [...resultArrSoFar, result])
      );
    }, Promise.resolve([]));
}

async function deployPushToken() {
  const contractName = "EPNS";
  const args = readArgumentsFile(contractName);

  // Wait for last deployment to complete before starting the next
  return await deploy(contractName, args);
}

async function deployVestingContracts(pushToken) {
  return VESTING_CONTRACTS.reduce((lastDeployment, fileName) => {
    const contractName = fileName.replace(".sol", "");
    const args = [pushToken.address, VESTING_START_TIME, VESTING_CLIFF];

    // Wait for last deployment to complete before starting the next
    return lastDeployment.then((contractsObj) =>
      deploy(contractName, args).then((result) => {
        return { ...contractsObj, [contractName]: result };
      })
    );
  }, Promise.resolve([]));
}

async function distributeInitialFunds(pushToken, vestingContracts, adminSigner) {
  let balance;
  console.log(chalk.cyan(`Distributing Initial Funds \n`));
  console.log(chalk.bgBlack.white(`Sending Funds to EPNSAdvisors:`, chalk.magenta(ethers.utils.formatUnits(EPNS_ADVISORS_FUNDS_AMOUNT))));
  
  balance = await pushToken.balanceOf(adminSigner.address);
  console.log(chalk.bgBlack.white(`Push Token Balance Available:`, chalk.magenta(ethers.utils.formatUnits(balance))));
  const txEpnsAdvisors = await pushToken.transfer(vestingContracts.EPNSAdvisors.address, ethers.BigNumber.from(EPNS_ADVISORS_FUNDS_AMOUNT));
  await txEpnsAdvisors.wait();
  console.log(chalk.bgBlack.white(`Tx Hash:`, chalk.magenta(txEpnsAdvisors.hash),`\n`));
  balance = await pushToken.balanceOf(adminSigner.address);
  console.log(chalk.bgBlack.white(`Push Token Balance Available:`, chalk.magenta(ethers.utils.formatUnits(balance))));
}


async function main() {
  console.log(chalk.bgBlack.white(`📡 Deploying Contracts \n`));

  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // auto deploy to read contract directory and deploy them all (add ".args" files for arguments)
  // const pushToken = await autoDeploy();
  // Deploy Push Token
  const pushToken = await deployPushToken();
  // Deploy Vesting Contracts with initial parameters
  const vestingContracts = await deployVestingContracts(pushToken);
  const [adminSigner] = await ethers.getSigners();
  // Distribute initial funds 
  await distributeInitialFunds(pushToken, vestingContracts, adminSigner);
  // OR
  // custom deploy (to use deployed addresses dynamically for example:)
  // const [adminSigner, aliceSigner, bobSigner] = await ethers.getSigners();
  //
  // // We get the contract to deploy
  // const Push = await hre.ethers.getContractFactory("EPNS");
  // const push = await Push.deploy();
  //
  // await push.deployed();

  // console.log("$PUSH deployed to:", push.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
