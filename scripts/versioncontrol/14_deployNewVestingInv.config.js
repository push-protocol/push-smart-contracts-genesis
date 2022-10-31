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
      version: 1
    }
  },
  args: {
    pushTokenAddress: '0x2b9bE9259a4F5Ba6344c1b1c07911539642a2D33',
    fundsDistributorFactoryAddress: '0x53315D9249e1ad80a44f14323C1Bf4153D8B607a',
    skipCount: "0", //number of objects to skip
  }
}

exports.deploy = deploy