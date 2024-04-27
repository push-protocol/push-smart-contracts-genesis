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

// Primary Function
async function main() {
  // First deploy all contracts
  console.log(chalk.bgBlack.bold.green(`\n📡 Searching for Vanity Addresses \n-----------------------\n`))

  await tryToFindVanityAddress(100000000000, 2)
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Found Match \n\t\t\t\n`))
}

async function tryToFindVanityAddress(retries, max_nonce) {
  const fs = require('fs');

  const vanityFullPath = `${__dirname}/vanity/vanityFull.js`
  if (!fs.existsSync(vanityFullPath)) {
    fs.writeFileSync(vanityFullPath, `const vanity = {}\n\nexports.vanity = vanity`)
  }

  const vanityWalletsPath = `${__dirname}/vanity/vanityWallets.js`
  if (!fs.existsSync(vanityWalletsPath)) {
    fs.writeFileSync(vanityWalletsPath, `const vanity = {}\n\nexports.vanity = vanity`)
  }

  let vanityFull = require(vanityFullPath)
  if (vanityFull) {
    vanityFull = vanityFull.vanity
  }
  else {
    vanityFull = {}
  }

  let vanityWallets = require(vanityWalletsPath)
  if (vanityWallets) {
    vanityWallets = vanityWallets.vanity
  }
  else {
    vanityWallets = {}
  }

  let count = 0;
  let success = 0;
  let prevSuccess = 0;

  let start = 4; // Example: looking for 3 repeated characters at the start, so put 2
  let end = 4; // Example: looking for 3 repeated characters at the end, so put 2

  // Adjust the regex patterns to use `start` and `end` for dynamic matching
  const regexStart = new RegExp(`^..(.)\\1{${start}}`); // Matches a character that repeats `start` times (total start+1) after the first two characters
  const regexEnd = new RegExp(`(.)\\1{${end}}$`); // Matches a character that repeats `end` times (total end+1) at the end of the string

  for (var i=0; i < retries; i++) {
    const randomWallet = await generateEtherAccount()

    for (var j=max_nonce; j <= max_nonce; j++) {
      // For smart contract, comment out if searching for wallet
      const contractAddr = await getContractAddress(randomWallet.address, j).toLowerCase()

      // For wallet
      // const contractAddr = randomWallet.address;

      const matchResultStart = regexStart.test(contractAddr)
      const matchResultEnd = regexEnd.test(contractAddr)

      if (matchResultStart) {
      // if (matchResultEnd) {
      // if (matchResultStart && matchResultEnd) {
        console.log("Found...")
        console.log(chalk.bgBlack.bold.grey(`📡 Found ${randomWallet.privateKey} `), chalk(` -> ${contractAddr}`))

        vanityFull[contractAddr] = {
          privateKey: randomWallet.privateKey,
          mnemonic: randomWallet.mnemonic,
          nonce: j
        }

        vanityWallets[contractAddr] = {}
        success++
      }

      count++

      if (success != prevSuccess) {
        // Append to file
        const modContent = `const vanity = ${JSON.stringify(vanityFull, null, 2)}\n\nexports.vanity = vanity`
        //const modUnquoted = modContent.replace(/"([^"]+)":/g, '$1:')
        fs.writeFileSync(vanityFullPath, modContent)

        const modContentWallets = `const vanity = ${JSON.stringify(vanityWallets, null, 2)}\n\nexports.vanity = vanity`
        //const modUnquotedWallets = modContentWallets.replace(/"([^"]+)":/g, '$1:')
        fs.writeFileSync(vanityWalletsPath, modContentWallets)

        console.log("Appnded vanity/VanityEth with results")
        prevSuccess = success
      }

      process.stdout.write(`Searched ${count} so far... ${randomWallet.privateKey} ${contractAddr}\r`)
    }


  }
}

async function generateEtherAccount() {
  // find a random eth account
  const bip39 = require("bip39");
  const { hdkey } = require('ethereumjs-wallet')

  const mnemonic = bip39.generateMnemonic()
  const seed = await bip39.mnemonicToSeed(mnemonic)
  const hdwallet = hdkey.fromMasterSeed(seed)
  const wallet_hdpath = "m/44'/60'/0'/0/"
  const account_index = 0
  const fullPath = wallet_hdpath + account_index
  const wallet = hdwallet.derivePath(fullPath).getWallet();
  const privateKey = "0x" + wallet.privateKey.toString("hex");
  const EthUtil = require("ethereumjs-util")
  const address = "0x" + EthUtil.privateToAddress(wallet.privateKey).toString("hex")

  return {
    address: address,
    privateKey: privateKey,
    mnemonic: mnemonic,
    seed: seed
  }
}

function getContractAddress(acc_address, nonce) {
  return ethers.utils.getContractAddress({from: acc_address, nonce: nonce});
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
