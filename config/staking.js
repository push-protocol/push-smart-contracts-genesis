const { tokenInfo } = require('./config')
const { bn, tokens, tokensBN, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')

const stakingInfo = {
  staking: {
    epochDuration: timeInSecs(7,24,60,60),
    epoch1Start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
  },
  pushToken: {
    startAmount: bn(30000),
    nrOfEpochs: bn(100),
    deprecation: bn(100),
  },
  liquidityPoolTokens: {
    startAmount: bn(30000),
    nrOfEpochs: bn(100),
    deprecation: bn(100),
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
  getPushDistributionAmount,
  getLiquidityDistributionAmount
}
