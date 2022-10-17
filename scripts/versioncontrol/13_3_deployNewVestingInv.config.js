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
    pushTokenAddress: null,
    fundsDistributorFactoryAddress: null
  }
}

exports.deploy = deploy