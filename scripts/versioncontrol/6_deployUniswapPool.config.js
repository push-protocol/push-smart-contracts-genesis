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
    pushTokenAddress: '0xccA9728291bC98ff4F97EF57Be3466227b0eb06C',
    commUnlockedContract: '0xc6B407503dE64956Ad3cF5Ab112cA4f56AA13517',
    secondaryWalletAddress: '0xBF68d3B3120F17a5aFE5DFe96B8332CfaD133FFd',
    amountETHForPool: 1,
    gasInGwei: 130
  }
}

exports.deploy = deploy
