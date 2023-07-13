const deploy = {
  network: {
    mainnet: {
      version: 1
    },
    goerli: {
      version: 2
    },
    hardhat: {
      version: 1
    },
    localhost: {
      version: 1
    },
    sepolia: {
      version: 1
    }
  },
  args: {
    pushTokenAddress: null
  }
}

exports.deploy = deploy