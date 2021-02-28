const { tokenInfo } = require('./config')
const { tokens, dateToEpoch, timeInSecs, CONSTANT_1K, CONSTANT_10K, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')

const commreservoir = {
  deposit: {
    address: '0xB59Cdc85Cacd15097ecE4C77ed9D225014b4D56D',
    tokens: tokens(43 * CONSTANT_1M), // 43 Million Tokens
    start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
    cliff: timeInSecs(60, 24, 60, 60), // 0 Days in secs = 0d * 0h * 0m * 0s
    duration: timeInSecs(120, 24, 60, 60)
  }
}

const publicsale = {
  deposit: {
    tokens: tokens(5 * CONSTANT_1M) // 5 Million Tokens
  }
}

const strategic = {
  deposit: {
    tokens: tokens(3 * CONSTANT_1M), // 3 Million Tokens
    start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
    cliff: timeInSecs(120, 24, 60, 60) // 0 Days in secs = 0d * 0h * 0m * 0s
  },
  factory: {
    strategic1: {
      address: '0xB59Cdc85Cacd15097ecE4C77ed9D225014b4D56D',
      tokens: tokens(6 * CONSTANT_1K), // 6k Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(365, 24, 60, 60), // 365 Days in secs = 365d * 24h * 60m * 60s
      duration: timeInSecs(2 * 365, 24, 60, 60), // 2 Years * 365 Days in secs = 365d * 24h * 60m * 60s
      revocable: false
    },
    strategic2: {
      address: '0xfD8D06740291E7F2675Bc584fC6021d488B37c4f',
      tokens: tokens(6 * CONSTANT_1K), // 6k Tokens
      start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
      cliff: timeInSecs(365, 24, 60, 60), // 365 Days in secs = 365d * 24h * 60m * 60s
      duration: timeInSecs(2 * 365, 24, 60, 60), // 2 Years * 365 Days in secs = 365d * 24h * 60m * 60s
      revocables: false
    },
  },
}

const lprewards = {
  deposit: {
    tokens: tokens(4 * CONSTANT_1M), // 3 Million Tokens
  }
}

const staking = {
  deposit: {
    tokens: tokens(4 * CONSTANT_1M), // 3 Million Tokens
  }
}

const community = {
  commreservoir: commreservoir,
  publicsale: publicsale,
  strategic: strategic,
  lprewards: lprewards,
  staking: staking
}

module.exports = {
  community
}
