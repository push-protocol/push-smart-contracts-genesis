const deploy = {
  network: {
    mainnet: {
      version: 1
    },
    goerli: {
      version: 6
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
    dummyBlock: 1
  }
}

exports.deploy = deploy
