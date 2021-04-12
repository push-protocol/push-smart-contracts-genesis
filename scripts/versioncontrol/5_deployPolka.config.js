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
    pushTokenAddress: '0xf418588522d5dd018b425E472991E52EBBeEEEEE',
    commUnlockedContract: '0x0cc23a784F9753FA3359dC3aC261a6593cCf214e',
    polkaWalletAddress: null,
    amountETHForPolka: null
  }
}

exports.deploy = deploy
