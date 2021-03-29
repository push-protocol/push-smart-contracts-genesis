const { tokens, dateToEpoch, timeInSecs, CONSTANT_1K, CONSTANT_10K, CONSTANT_100K, CONSTANT_1M } = require('../../helpers/utils')

const strategicMapping = {
  strategic1: {
    address: '0xB59Cdc85Cacd15097ecE4C77ed9D225014b4D56D',
    tokens: tokens(6 * CONSTANT_1K), // 6k Tokenss
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
  strategic2: {
    address: '0xfD8D06740291E7F2675Bc584fC6021d488B37c4f',
    tokens: tokens(6 * CONSTANT_1K), // 6k Tokens
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

module.exports = {
  strategicMapping
}
