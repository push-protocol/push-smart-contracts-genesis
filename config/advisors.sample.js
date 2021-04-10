const { tokenInfo, vestingDate } = require('./config')
const { tokens, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')

const advisors = {
  deposit: {
    tokens: tokens(3.5 * CONSTANT_1M), // 3.5 Million Tokens
    start: dateToEpoch(vestingDate), // 10 April 2021 2 PM GMT
    cliff: timeInSecs(365 * 3, 24, 60, 60) // 3 * 365 Days in secs = 3y * 365d * 24h * 60m * 60s
  },
  factory: {
    adv1: {
      address: '0x0000000000000000000000000000000000000000',
      tokens: tokens(4 * CONSTANT_100K), // 400k Tokens
      start: dateToEpoch(vestingDate), // 10 April 2021 2 PM GMT
      cliff: timeInSecs(0, 0, 0, 0), // 0 Days in secs = 0d * 0h * 0m * 0s
      duration: timeInSecs(270, 24, 60, 60),
      revocable: true
    },
    adv2: {
      address: '0x0000000000000000000000000000000000000000',
      tokens: tokens(6 * CONSTANT_100K), // 600k Tokens
      start: dateToEpoch(vestingDate), // 10 April 2021 2 PM GMT
      cliff: timeInSecs(0, 0, 0, 0), // 0 Days in secs = 0d * 0h * 0m * 0s
      duration: timeInSecs(270, 24, 60, 60),
      revocable: true
    },
    adv3: {
      address: '0x0000000000000000000000000000000000000000',
      tokens: tokens(CONSTANT_1M), // 1 Million Tokens
      start: dateToEpoch(vestingDate), // 10 April 2021 2 PM GMT
      cliff: timeInSecs(0, 0, 0, 0), // 0 Days in secs = 0d * 0h * 0m * 0s
      duration: timeInSecs(270, 24, 60, 60),
      revocable: true
    },
    adv4: {
      address: '0x0000000000000000000000000000000000000000',
      tokens: tokens(CONSTANT_1M), // 1 Million Tokens
      start: dateToEpoch(vestingDate), // 10 April 2021 2 PM GMT
      cliff: timeInSecs(0, 0, 0, 0), // 0 Days in secs = 0d * 0h * 0m * 0s
      duration: timeInSecs(180, 24, 60, 60),
      revocable: true
    },
  }
}


module.exports = {
  advisors
}
