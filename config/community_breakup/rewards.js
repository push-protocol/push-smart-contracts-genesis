const { tokenInfo, stakingDate } = require('../config')
const { bn, tokens, tokensBN, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../../helpers/utils')
const { pushRewardsMapping } = require('./pushRewardsMapping.enc.js')

const rewardsInfo = {
  pushRewardsMapping: pushRewardsMapping,
  helpers: {
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
  }
}

module.exports = {
  rewardsInfo,
}
