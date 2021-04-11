const { tokenInfo, vestingDate } = require('./config')
const { tokens, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')

const investors = {
  deposit: {
    tokens: tokens(20.5 * CONSTANT_1M), // 20.5 Million Tokens
    start: dateToEpoch(vestingDate), // 11 April 2021 11 PM GMT
    cliff: timeInSecs(24 * 30, 24, 60, 60) // 730 Days in secs = 24m * 30d * 24h * 60m * 60s
  },
  factory: {
    inv1: {
      address: '0x0000000000000000000000000000000000000000',
      tokens: tokens(6 * CONSTANT_1M), // 6k Tokenss
      timelocked: {
        perc: 20,
        start: dateToEpoch(vestingDate), // 11 April 2021 11 PM GMT
        cliff: timeInSecs(3 * 30, 24, 60, 60), // 3 months
      },
      vested: {
        duration: timeInSecs(21 * 30, 24, 60, 60), // 21 months
      },
      revocable: false
    },
    inv2: {
      address: '0x0000000000000000000000000000000000000000',
      tokens: tokens(3 * CONSTANT_1M), // 6k Tokens
      timelocked: {
        perc: 20,
        start: dateToEpoch(vestingDate), // 11 April 2021 11 PM GMT
        cliff: timeInSecs(3 * 30, 24, 60, 60), // 3 months
      },
      vested: {
        duration: timeInSecs(21 * 30, 24, 60, 60), // 21 months
      },
      revocable: false
    },
  }
}

module.exports = {
  investors
}
