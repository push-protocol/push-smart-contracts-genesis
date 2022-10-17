const { tokenInfo, vestingDate } = require('./config')
const { tokens, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')

const investors = {
  deposit: {
    tokens: tokens(6181508), // 20.5 Million Tokens
    start: dateToEpoch(vestingDate), // 11 April 2021 11 PM GMT
    cliff: timeInSecs(24 * 30, 24, 60, 60) // 730 Days in secs = 24m * 30d * 24h * 60m * 60s
  },
  factory: {
    inv1: {
      address: '0xf90B86fDbb194a703eA6709B1cB108079A5F9396',
      tokens: tokens(14389), // 6k Tokenss
      vested: {
        start: dateToEpoch('08/11/2021 00:00'), // Mon, 8 Nov 2021 12 AM GMT
        cliff: timeInSecs(0 * 30, 24, 60, 60), // 0 months
        duration: timeInSecs(12 * 30, 24, 60, 60), // 12 months
      },
      revocable: false
    },
    inv2: {
      address: '0x4F20Cb7a1D567A54350a18DAcB0cc803aEBB4483',
      tokens: tokens(1200000), // 1,200,000 Tokens
      vested: {
        start: dateToEpoch('20/12/2021 00:00'), // Mon, 20 Dec 2021 12 AM GMT
        cliff: timeInSecs(12 * 30, 24, 60, 60), // 12 months
        duration: timeInSecs(30 * 30, 24, 60, 60), // 30 months
      },
      revocable: false
    },
  }
}

module.exports = {
  investors
}
