const { tokenInfo } = require('./config')
const { tokens, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')

const { community } = require('./community')

const stakingInfo = {
  staking: {
    epochDuration: timeInSecs(7, 24, 60, 60),
    epoch1Start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
  },
  pushToken: {
    totalDistributedAmount: community.staking.deposit.tokens,
    nrOfEpochs: 100
  },
  liquidityPoolTokens: {
    totalDistributedAmount: community.lprewards.deposit.tokens,
    nrOfEpochs: 150
  },
  encrypted: {
    text: "plain"
  }
}

module.exports = {
  stakingInfo
}
