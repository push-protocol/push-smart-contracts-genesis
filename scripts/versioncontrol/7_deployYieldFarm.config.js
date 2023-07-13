const deploy = {
  network: {
    mainnet: {
      version: 2
    },
    goerli: {
      version: 7
    },
    hardhat: {
      version: 1
    },
    localhost: {
      version: 1
    },
    polygonMumbai: {
      version: 1
    }
  },
  args: {
    pushTokenAddress: null,
    communityVaultAddress: null,
    lpPoolTokenAddress: null
  }
}

exports.deploy = deploy