const { tokenInfo } = require('../config')
const { bn, tokens, tokensBN, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../../helpers/utils')

const stakingInfo = {
  staking: {
    epochDuration: timeInSecs(7,24,60,60),
    communityVaultAddress: "0x998abeb3E57409262aE5b751f60747921B33613E",
    pushTokenAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  },
  pushToken: {
    startAmount: bn(30000),
    epoch1Start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
    nrOfEpochs: bn(100),
    deprecation: bn(100),
  },
  liquidityPoolTokens: {
    epoch1Start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
    startAmount: bn(25000),
    nrOfEpochs: bn(100),
    deprecation: bn(100),
  },
  helpers: {
    getPushDistributionAmount: function() {
      return tokensBN(stakingInfo.pushToken.startAmount.mul(stakingInfo.pushToken.nrOfEpochs).sub(stakingInfo.pushToken.deprecation.mul(stakingInfo.pushToken.nrOfEpochs.mul(stakingInfo.pushToken.nrOfEpochs.add(1)).div(2))))
    },
    getLiquidityDistributionAmount: function() {
      return tokensBN(stakingInfo.liquidityPoolTokens.startAmount.mul(stakingInfo.liquidityPoolTokens.nrOfEpochs).sub(stakingInfo.liquidityPoolTokens.deprecation.mul(stakingInfo.liquidityPoolTokens.nrOfEpochs.mul(stakingInfo.liquidityPoolTokens.nrOfEpochs.add(1)).div(2))))
    }
  },
  encrypted: {
    text: "plain"
  }
}

const getPushDistributionAmount = () => {
  return tokensBN(stakingInfo.pushToken.startAmount.mul(stakingInfo.pushToken.nrOfEpochs).sub(stakingInfo.pushToken.deprecation.mul(stakingInfo.pushToken.nrOfEpochs.mul(stakingInfo.pushToken.nrOfEpochs.add(1)).div(2))))
}

const getLiquidityDistributionAmount = () => {
  return tokensBN(stakingInfo.liquidityPoolTokens.startAmount.mul(stakingInfo.liquidityPoolTokens.nrOfEpochs).sub(stakingInfo.liquidityPoolTokens.deprecation.mul(stakingInfo.liquidityPoolTokens.nrOfEpochs.mul(stakingInfo.liquidityPoolTokens.nrOfEpochs.add(1)).div(2))))
}

module.exports = {
  stakingInfo,
}
