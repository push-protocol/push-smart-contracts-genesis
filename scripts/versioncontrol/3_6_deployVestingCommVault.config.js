const deploy = {
  network: {
    mainnet: {
      version: 1
    },
    goerli: {
      version: 1
    },
    hardhat: {
      version: 1
    },
    localhost: {
      version: 1
    },
    sepolia: {
      version: 1
    }
  },
  args: {
    // pushTokenAddress: "0x37c779a1564DCc0e3914aB130e0e787d93e21804"
    pushTokenAddress: "0x2b9bE9259a4F5Ba6344c1b1c07911539642a2D33"
  }
}

exports.deploy = deploy