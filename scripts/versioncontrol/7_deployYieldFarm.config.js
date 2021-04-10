const deploy = {
  network: {
    mainnet: {
      version: 1,
    },
    goerli: {
      version: 1,
    },
    kovan: {
      version: 1,
    },
    ropsten: {
      version: 1,
    },
    rinkeby: {
      version: 1,
    },
    hardhat: {
      version: 1,
    },
    localhost: {
      version: 1,
    }
  },
  args: {
    pushTokenAddress: '0x38D542f47b1B949146e3961eCd87872fdEA49679',
    communityVaultAddress: '0xc6B407503dE64956Ad3cF5Ab112cA4f56AA13517',
    lpPoolTokenAddress: '0x38D542f47b1B949146e3961eCd87872fdEA49679',
  }
}

exports.deploy = deploy
