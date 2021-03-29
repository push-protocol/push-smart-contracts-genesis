const { tokenInfo } = require('./config')
const { tokens, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')

const investors = {
  deposit: {
    tokens: tokens(20.5 * CONSTANT_1M), // 20.5 Million Tokens
    start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
    cliff: timeInSecs(24 * 30, 24, 60, 60) // 730 Days in secs = 0d * 0h * 0m * 0s
  },
  factory: {
    inv1: {
      address: '0xB59Cdc85Cacd15097ecE4C77ed9D225014b4D56D',
      tokens: tokens(6 * CONSTANT_1M), // 6k Tokenss
      timelocked: {
        perc: 20,
        start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
        cliff: timeInSecs(3 * 30, 24, 60, 60), // 3 months
      },
      vested: {
        duration: timeInSecs(21 * 30, 24, 60, 60), // 21 months
      },
      revocable: false
    },
    inv2: {
      address: '0xfD8D06740291E7F2675Bc584fC6021d488B37c4f',
      tokens: tokens(3 * CONSTANT_1M), // 6k Tokens
      timelocked: {
        perc: 20,
        start: dateToEpoch('01/03/2021 09:00'), // 01 March 2021 9 AM GMT
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
