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
    pushTokenAddress: '0xf63221CE3456A27cAD6B5a8Cd9DEA1E2bEF8f61B',
    commUnlockedContract: '0x9c2E57603538213Ba729430558Ef95ff5537dF80',
    secondaryWalletAddress: '0x959fd7ef9089b7142b6b908dc3a8af7aa8ff0fa1',
    uniPoolEth: tokens(1) // Assuming $1750 = 1 ETher
  }
}

exports.deploy = deploy
