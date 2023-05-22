const { tokenInfo, vestingDate } = require('./config')
const { tokens, dateToEpoch, timeInSecs, CONSTANT_1K, CONSTANT_10K, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')

const { stakingInfo } = require('./community_breakup/staking')

// const { nfts } = require('./community_breakup/gratitude/nfts')
// const { airdrop } = require('./community_breakup/gratitude/airdrop')

const { strategicMapping } = require('./community_breakup/strategicMappingInfo.sample.js')

const commreservoir = {
  deposit: {
    tokens: tokens(40352667), // 40,352,667 = 40.35% token
    start: dateToEpoch(vestingDate), // 11 April 2021 11 PM GMT
    cliff: timeInSecs(0, 0, 0, 0), // 0 Days in secs = 0d * 0h * 0m * 0s
    duration: timeInSecs(1350, 24, 60, 60)
  }
}

const unlocked = {
  deposit: {
    tokens: tokens(4137333) // 4,137,333 tokens = ~$496,479.96
  },
  breakdown: {
    launch: {
      deposit: {
          tokens: tokens(2583333) // 2,583,333 tokens = ~$309,999.96
      },
      breakdown: {
        polkastarter: {
          deposit: {
            tokens: tokens(833333) // 833,333 tokens = ~$100k
          }
        },
        uniswap: {
          deposit: {
            tokens: tokens(1250000) // 1,250,000 tokens = ~$150k
          },
          amountTokenMin: "100", // tokens don't support decimal, dont forgot to convert to bn
          amountETHMin: "0.000001", // tokens don't support decimal, dont forgot to convert to bn
        },
        suprise: {
          deposit: {
            tokens: tokens(500000) // 500,000 tokens = ~60k
          }
        }
      }
    },
    // gratitude: {
    //   deposit: {
    //     tokens: tokens(1554000) // 1,554,000 tokens = ~$186,480
    //   },
    //   breakdown: {
    //     nfts: nfts,
    //     airdrop: airdrop,
    //   }
    // }
  }
}

const strategic = {
  deposit: {
    tokens: tokens(3 * CONSTANT_1M), // 3 Million Tokens
    start: dateToEpoch(vestingDate), // 11 April 2021 11 PM GMT
    cliff: timeInSecs(24 * 30, 24, 60, 60) // 730 Days in secs = 730d * 0h * 0m * 0s
  },
  factory: strategicMapping
}

const community = {
  deposit: {
    tokens: tokens(53 * CONSTANT_1M) // 53 Million Tokens
  },
  breakdown: {
    commreservoir: commreservoir,
    unlocked: unlocked,
    strategic: strategic,
    stakingInfo: stakingInfo
  }
}

module.exports = {
  community
}
