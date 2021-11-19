const deploy = {
  network: {
    mainnet: {
      version: 10
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
      version: 3
    },
    localhost: {
      version: 1
    }
  },
  args: {
    pushTokenAddress: null,
    batchTransferPUSHAddress: null,
    gasInGwei: null
  }
}

exports.deploy = deploy