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
    commUnlockedContract: '0x68A0c548394CF9f5B7284620fE3Cf6918B43D77e',
    secondaryWalletAddress: '0xcb64f3c6b116cd3f1a4da595dc176f1ff967a1e7',
    uniPoolEth: tokens(86) // Assuming $1750 = 1 ETher
  }
}

exports.deploy = deploy
