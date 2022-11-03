const deploy = {
  network: {
    mainnet: {
      version: 1
    },
    goerli: {
      version: 2
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
      version: 2
    },
    localhost: {
      version: 1
    }
  },
  args: {
    pushTokenAddress: null,
    fundsDistributorFactoryAddress: null,
    skipCount: null
  }
}

exports.deploy = deploy