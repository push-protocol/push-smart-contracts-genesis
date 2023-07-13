const { tokenInfo, stakingDate } = require('../config')
const { bn, tokens, tokensBN, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../../helpers/utils')
const { lpUsersMapping } = require('./lpMappingInfo.sample.js')
const { pushUsersMapping } = require('./pushMappingInfo.sample.js')

const stakingInfo = {
  staking: {
    epochDuration: timeInSecs(21,24,60,60),
    communityVaultAddress: "0xbbC3D9331dCAf3D0d5abD81f59D6471d3548e1df",
    pushTokenAddress: "0xf418588522d5dd018b425E472991E52EBBeEEEEE"
  },
  pushToken: {
    startAmount: bn(75300),
    epoch1Start: dateToEpoch(stakingDate), // 14 April 2021 2 PM GMT
    nrOfEpochs: bn(28),
    deprecation: bn(900),
  },
  liquidityPoolTokens: {
    epoch1Start: dateToEpoch(stakingDate), // 14 April 2021 2 PM GMT
    startAmount: bn(75300),
    nrOfEpochs: bn(28),
    deprecation: bn(900),
  },
  lpUsersMapping: lpUsersMapping,
  pushUsersMapping: pushUsersMapping,
  helpers: {
    getPushDistributionAmount: function() {
      return tokensBN((stakingInfo.pushToken.startAmount.mul(stakingInfo.pushToken.nrOfEpochs)).sub((stakingInfo.pushToken.nrOfEpochs.mul(stakingInfo.pushToken.nrOfEpochs.sub(1)).div(2)).mul(stakingInfo.pushToken.deprecation)))
    },
    getLiquidityDistributionAmount: function() {
      return tokensBN((stakingInfo.liquidityPoolTokens.startAmount.mul(stakingInfo.liquidityPoolTokens.nrOfEpochs)).sub(((stakingInfo.liquidityPoolTokens.nrOfEpochs.mul(stakingInfo.liquidityPoolTokens.nrOfEpochs.sub(1)).div(2))).mul(stakingInfo.liquidityPoolTokens.deprecation)))
    },
    convertUserObjectToIndividualArrays: function(userObject) {
      let usersObject = {
        recipients: [],
        amounts: []
      }

      for (const [key, value] of Object.entries(userObject)) {
        usersObject.recipients.push(value[0])
        usersObject.amounts.push(ethers.utils.parseEther(value[1]).toString())
      }

      return usersObject
    }
  },
  encrypted: {
    text: "plain"
  }
}

module.exports = {
  stakingInfo,
}
