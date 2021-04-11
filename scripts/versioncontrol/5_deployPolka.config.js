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
    pushTokenAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    commUnlockedContract: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    polkaWalletAddress: null,
    amountETHForPolka: 7.5
  }
}

exports.deploy = deploy
