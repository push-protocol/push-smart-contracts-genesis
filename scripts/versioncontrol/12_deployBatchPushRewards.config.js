const deploy = {
  network: {
    mainnet: {
      version: 7
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
      version: 2
    },
    localhost: {
      version: 1
    }
  },
  args: {
    pushTokenAddress: '0xf418588522d5dd018b425E472991E52EBBeEEEEE',
    batchTransferPUSHAddress: '0xd76ff00d0509970f900913a68dFaB8F480E29A07',
    gasInGwei: 10
  }
}

exports.deploy = deploy
