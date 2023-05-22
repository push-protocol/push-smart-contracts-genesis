// import config
const { tokenInfo, multiSigOwner, ownerEOA, uniswapV2Addr } = require('../../config/config')

// const { advisors } = require('../../config/advisors.enc')

const { community } = require('../../config/community')
const { stakingInfo } = require('../../config/community_breakup/staking')
// const { rewardsInfo } = require('../../config/community_breakup/rewards')
// const { nfts } = require('../../config/community_breakup/gratitude/nfts')
// const { nftsV2 } = require('../../config/community_breakup/gratitude/nftsV2')
// const { airdrop } = require('../../config/community_breakup/gratitude/airdrop')

// const { investors } = require('../../config/investors.enc')
// const { investorsA } = require('../../config/investorsA.enc')
// const { team } = require('../../config/team.enc')
// const { foundation } = require('../../config/foundation.enc')

const { tokens, dateToEpoch, timeInSecs,CONSTANT_10K, CONSTANT_100K,CONSTANT_1M } = require('../../helpers/utils')

// const VESTING_INFO = {
//   owner: '',
//   advisors: advisors,
//   community: community,
//   team: team,
//   investors: investors,
//   investorsA: investorsA,
//   foundation: foundation
// }

const DISTRIBUTION_INFO = {
  total: tokens(100 * CONSTANT_1M),
  advisors:  tokens(3.5 * CONSTANT_1M),
  community: {
    commreservoir: community.breakdown.commreservoir.deposit.tokens,
    unlocked: {
      total: community.breakdown.unlocked.deposit.tokens,
      launch: {
        total: community.breakdown.unlocked.breakdown.launch.deposit.tokens,
        uniswap: community.breakdown.unlocked.breakdown.launch.breakdown.uniswap.deposit.tokens,
        polkastarter: community.breakdown.unlocked.breakdown.launch.breakdown.polkastarter.deposit.tokens,
        suprise: community.breakdown.unlocked.breakdown.launch.breakdown.suprise.deposit.tokens,
      },
      gratitude: {
        total: tokens(1554000),//community.breakdown.unlocked.breakdown.gratitude.deposit.tokens,
        nfts: tokens(2.4 * CONSTANT_100K),//nfts.tokens,
        nftsV2: tokens(9 * CONSTANT_10K),//nftsV2.tokens,
        airdrop: tokens(1314000)//airdrop.tokens,
      }
    },
    strategic: community.breakdown.strategic.deposit.tokens,
    lprewards: stakingInfo.helpers.getLiquidityDistributionAmount().toString(),
    staking: stakingInfo.helpers.getPushDistributionAmount().toString(),
  },
  team: tokens(16 * CONSTANT_1M),//team.deposit.tokens,
  foundation: tokens(7 * CONSTANT_1M),//foundation.deposit.tokens,
  investors: tokens(6181508)//investors.deposit.tokens
}

const STAKING_INFO = {
  stakingInfo: stakingInfo,
  stakingAmount: stakingInfo.helpers.getPushDistributionAmount().add(stakingInfo.helpers.getLiquidityDistributionAmount())
}

const META_INFO = {
  multisigOwnerEventual: multiSigOwner,
  ownerEOAEventual: ownerEOA,
  uniswapV2Addr: uniswapV2Addr,
}

// const NFT_INFO = {
//   nfts: nfts,
//   nftsV2: nftsV2
// }

// const AIRDROP_INFO = {
//   airdrop: airdrop
// }

// const PUSH_REWARDS_INFO = {
//   rewardsInfo: rewardsInfo
// }

module.exports = {
  // VESTING_INFO,
  DISTRIBUTION_INFO,
  META_INFO,
  STAKING_INFO,
  // NFT_INFO,
  // AIRDROP_INFO,
  // PUSH_REWARDS_INFO
}
