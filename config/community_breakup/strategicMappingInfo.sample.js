const { vestingDate } = require('./config')
const { tokens, dateToEpoch, timeInSecs, CONSTANT_1K, CONSTANT_10K, CONSTANT_100K, CONSTANT_1M } = require('../../helpers/utils')

const strategicMapping = {
  strategic1: {
    address: '0x0000000000000000000000000000000000000000',
    tokens: tokens(6 * CONSTANT_1K), // 6k Tokenss
    timelocked: {
      perc: 20,
      start: dateToEpoch(vestingDate), // 10 April 2021 2 PM GMT
      cliff: timeInSecs(3 * 30, 24, 60, 60), // 3 months
    },
    vested: {
      duration: timeInSecs(21 * 30, 24, 60, 60), // 21 months
    },
    revocable: false
  },
  strategic2: {
    address: '0x0000000000000000000000000000000000000000',
    tokens: tokens(6 * CONSTANT_1K), // 6k Tokens
    timelocked: {
      perc: 20,
      start: dateToEpoch(vestingDate), // 10 April 2021 2 PM GMT
      cliff: timeInSecs(3 * 30, 24, 60, 60), // 3 months
    },
    vested: {
      duration: timeInSecs(21 * 30, 24, 60, 60), // 21 months
    },
    revocable: false
  },
}

module.exports = {
  strategicMapping
}
