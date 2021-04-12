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
    pushTokenAddress: '0x63fea6E447F120B8Faf85B53cdaD8348e645D80E',
    commUnlockedContract: '0x0cc23a784F9753FA3359dC3aC261a6593cCf214e',
    amountETHForPool: null,
    gasInGwei: null
  }
}

exports.deploy = deploy
