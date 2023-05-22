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
    }
  },
  args: {
    pushTokenAddress: "0x2b9bE9259a4F5Ba6344c1b1c07911539642a2D33",
   // communityVaultAddress: "0xCE5D1d52cDC0f215B0c34158F32df8D0e5314e26", for one hour epoch
    communityVaultAddress: "0x74883856aFD2C17A57f2bC83e9c6a09cC561dd28",
    lpPoolTokenAddress: "0x698839247E5b83572fFF6ccdcf386CC37e60bEf5"
  }
}

exports.deploy = deploy