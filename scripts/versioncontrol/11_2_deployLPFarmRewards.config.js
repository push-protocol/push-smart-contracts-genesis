const deploy = {
  network: {
    mainnet: {
      version: 1
    },
    goerli: {
      version: 1
    },
    kovan: {
      version: 1
    },
    ropsten: {
      version: 1
    },
    rinkeby: {
      version: 1
    },
    hardhat: {
      version: 1
    },
    localhost: {
      version: 1
    }
  },
  args: {
    pushTokenAddress: '0xf418588522d5dd018b425E472991E52EBBeEEEEE',
    batchTransferPUSHAddress: '0x4610D5719baf2FAC645932D6dd3d5d4B6d235B2c',
    gasInGwei: 5,
  }
}

exports.deploy = deploy
