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
      version: 5
    }
  },
  args: {
    pushTokenAddress: '0x0fe4223AD99dF788A6Dcad148eB4086E6389cEB6'
  }
}

exports.deploy = deploy
