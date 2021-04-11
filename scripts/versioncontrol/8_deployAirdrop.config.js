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
    pushTokenAddress: '0xf953b3A269d80e3eB0F2947630Da976B896A8C5b',
    commUnlockedContract: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
  }
}

exports.deploy = deploy
