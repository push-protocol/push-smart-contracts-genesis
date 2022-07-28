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

const {
  VESTING_INFO,
} = require("./constants/constants")

const { tokenInfo } = require('../config/config')
const { tokens, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')
const vestingDate = '12/04/2021 14:00' // dd/mm.yyyy HH:mm UTC

const allocate = {
  factory: {
    person1: {
      address: '0x1',
      tokens: tokens(1), // 60k Tokens
      start: dateToEpoch(vestingDate), // 11 April 2021 11 PM GMT
      cliff: timeInSecs(365, 24, 60, 60), // 365 Days in secs = 365d * 24h * 60m * 60s
      duration: timeInSecs(1460, 24, 60, 60), // 4 Years * 365 Days in secs = 365d * 24h * 60m * 60s
      revocable: true
    },
    person2: {
      address: '0x2',
      tokens: tokens(1 * CONSTANT_1M), // 1M Tokens
      start: dateToEpoch(vestingDate), // 11 April 2021 11 PM GMT
      cliff: timeInSecs(274, 24, 60, 60), // 365 Days in secs = 365d * 24h * 60m * 60s
      duration: timeInSecs(1460, 24, 60, 60), // 4 Years * 365 Days in secs = 365d * 24h * 60m * 60s
      revocable: true
    },
    person3: {
      address: '0x3',
      tokens: tokens(150 * CONSTANT_100K), // 150,000 Tokens
      start: dateToEpoch(vestingDate), // 11 April 2021 11 PM GMT
      cliff: timeInSecs(365, 24, 60, 60), // 365 Days in secs = 365d * 24h * 60m * 60s
      duration: timeInSecs(1460, 24, 60, 60), // 4 Years * 365 Days in secs = 365d * 24h * 60m * 60s
      revocable: true
    },
  }
}

// Primary Function
async function main() {
  // First deploy all contracts
  console.log(chalk.bgBlack.bold.green(`\n📡 Searching for Vanity Addresses \n-----------------------\n`))

  if(Object.entries(allocate.factory).length > 0){
    let count = 0
    const identity = "team"

    for await (const [key, value] of Object.entries(allocate.factory)) {
      count = count + 1
      const uniqueId = `${identity}${count}`

      const allocation = value

      // Deploy Team Instance
      console.log(chalk.bgBlue.white(`Simulating Deploying Team Instance:`), chalk.green(`${uniqueId}`))
      console.log('Object: %o', allocation)
    }
  } else {
    console.log(chalk.bgBlack.red('No Team Instances Found'))
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
