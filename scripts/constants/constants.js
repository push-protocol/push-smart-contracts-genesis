// import config
const { tokenInfo, multiSigOwner, ownerEOA, uniswapV2Addr } = require('../../config/config')

const { advisors } = require('../../config/advisors.enc')

const { community } = require('../../config/community')
const { stakingInfo } = require('../../config/community_breakup/staking')
const { rewardsInfo } = require('../../config/community_breakup/rewards')
const { nfts } = require('../../config/community_breakup/gratitude/nfts')
const { airdrop } = require('../../config/community_breakup/gratitude/airdrop')

const { investors } = require('../../config/investors.enc')
const { team } = require('../../config/team.enc')
const { foundation } = require('../../config/foundation.enc')

const { tokens, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../../helpers/utils')

const VESTING_INFO = {
  owner: '',
  advisors: advisors,
  community: community,
  team: team,
  investors: investors,
  foundation: foundation
}

const DISTRIBUTION_INFO = {
  total: tokens(100 * CONSTANT_1M),
  advisors: advisors.deposit.tokens,
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
        total: community.breakdown.unlocked.breakdown.gratitude.deposit.tokens,
        nfts: nfts.tokens,
        airdrop: airdrop.tokens,
      }
    },
    strategic: community.breakdown.strategic.deposit.tokens,
    lprewards: stakingInfo.helpers.getLiquidityDistributionAmount().toString(),
    staking: stakingInfo.helpers.getPushDistributionAmount().toString(),
  },
  team: team.deposit.tokens,
  foundation: foundation.deposit.tokens,
  investors: investors.deposit.tokens
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

const NFT_INFO = {
  nfts: nfts
}

const AIRDROP_INFO = {
  airdrop: airdrop
}

const PUSH_REWARDS_INFO = {
  rewardsInfo: rewardsInfo
}

module.exports = {
  VESTING_INFO,
  DISTRIBUTION_INFO,
  META_INFO,
  STAKING_INFO,
  NFT_INFO,
  AIRDROP_INFO,
  PUSH_REWARDS_INFO
}
