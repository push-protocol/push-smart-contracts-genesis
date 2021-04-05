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
      version: 1
    },
    localhost: {
      version: 4
    }
  },
  args: {
    pushTokenAddress: null
  }
}

exports.deploy = deploy