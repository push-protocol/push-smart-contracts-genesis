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
      version: 2
    }
  },
  args: {
    pushTokenAddress: '0x59b670e9fA9D0A427751Af201D676719a970857b'
  }
}

exports.deploy = deploy
