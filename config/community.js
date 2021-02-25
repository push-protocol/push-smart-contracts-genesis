const { tokenInfo } = require('./universal')
const { tokens, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')

const community = {
  commreservoir: {
    deposit: {
      address: '0xB59Cdc85Cacd15097ecE4C77ed9D225014b4D56D',
      tokens: tokens(43 * CONSTANT_1M), // 43 Million Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(60, 24, 60, 60), // 0 Days in secs = 0d * 0h * 0m * 0s
      duration: timeInSecs(120, 24, 60, 60)
    }
  },
  publicsale: {
    deposit: {
      tokens: tokens(5 * CONSTANT_1M) // 5 Million Tokens
    }
  },
  strategic: {
    deposit: {
      tokens: tokens(3 * CONSTANT_1M), // 3 Million Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(120, 24, 60, 60) // 0 Days in secs = 0d * 0h * 0m * 0s
    },
    factory: {

    },
  },
  lprewards: {
    deposit: {
      tokens: tokens(4 * CONSTANT_1M), // 3 Million Tokens
    }
  },
  staking: {
    deposit: {
      tokens: tokens(4 * CONSTANT_1M), // 3 Million Tokens
    }
  }
}

module.exports = {
  community
}
