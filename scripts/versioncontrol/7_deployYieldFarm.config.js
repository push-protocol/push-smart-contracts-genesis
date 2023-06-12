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
    communityVaultAddress: "0x50ccF7e5eD3Fe1Ef526D0D95cf22895AB9855B11",
    lpPoolTokenAddress: "0x698839247E5b83572fFF6ccdcf386CC37e60bEf5"
  }
}

exports.deploy = deploy