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
  const expression = "/[a-z]/{1}$"
  console.log(chalk.bgBlack.bold.green(`\n📡 Searching for Vanity Addresses \n-----------------------\n`))

  await tryToFindVanityAddress(1000000, 5, expression)
  console.log(chalk.bgWhite.bold.black(`\n\t\t\t\n Found Match \n\t\t\t\n`))
}

async function tryToFindVanityAddress(retries, max_nonce, expression) {
  let count = 0;

  for (var i=0; i < retries; i++) {
    const randomWallet = await generateEtherAccount()

    for (var j=0; j < max_nonce; j++) {
      const contractAddr = getContractAddress(randomWallet.address, j)

      var matchResult = contractAddr.toLowerCase().match(expression)

      if (matchResult) {
        console.log(contractAddr)
        console.log(randomWallet)
        console.log(j)
      }

      count++
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
  const rlp_encoded = ethers.utils.RLP.encode(
      [acc_address, ethers.BigNumber.from(nonce.toString()).toHexString()]
  );

  const contract_address_long = ethers.utils.keccak256(rlp_encoded);
  const contract_address = '0x'.concat(contract_address_long.substring(26));
  return ethers.utils.getAddress(contract_address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
