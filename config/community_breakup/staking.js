const { tokenInfo, stakingDate } = require('../config')
const { bn, tokens, tokensBN, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../../helpers/utils')
const { lpUsersMapping } = require('./lpMappingInfo.sample.js')
const { pushUsersMapping } = require('./pushMappingInfo.sample.js')

const stakingInfo = {
  staking: {
    epochDuration: timeInSecs(21,24,60,60),
    communityVaultAddress: "0x998abeb3E57409262aE5b751f60747921B33613E",
    pushTokenAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  },
  pushToken: {
    startAmount: bn(74400),
    epoch1Start: dateToEpoch(stakingDate), // 14 April 2021 2 PM GMT
    nrOfEpochs: bn(28),
    deprecation: bn(900),
  },
  liquidityPoolTokens: {
    epoch1Start: dateToEpoch(stakingDate), // 14 April 2021 2 PM GMT
    startAmount: bn(74400),
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
