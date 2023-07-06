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
    polygonMumbai: {
      version: 1
    }
  },
  args: {
    pushTokenAddress: "0x2b9bE9259a4F5Ba6344c1b1c07911539642a2D33",
    // communityVaultAddress: "0xCE5D1d52cDC0f215B0c34158F32df8D0e5314e26", for one hour epoch
    communityVaultAddress: "0x9F12858b78a81F61A00Ace5168c90367B16912C1",
    lpPoolTokenAddress: "0x698839247E5b83572fFF6ccdcf386CC37e60bEf5",
  },
};

exports.deploy = deploy;
