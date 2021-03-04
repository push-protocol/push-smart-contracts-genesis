// import config
const { tokenInfo, multiSigOwner } = require('../config/config')

const { advisors } = require('../config/advisors')
const { community } = require('../config/community')
const { investors } = require('../config/investors')
const { team } = require('../config/team')
const { foundation } = require('../config/foundation')
const { stakingInfo, getPushDistributionAmount, getLiquidityDistributionAmount } = require('../config/staking')

const { nfts, convertNFTObjectToIndividualArrays } = require('../config/nfts')

const { tokens, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../helpers/utils')

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
  commreservoir: community.commreservoir.deposit.tokens,
  publicsale: community.publicsale.deposit.tokens,
  strategic: community.strategic.deposit.tokens,
  lprewards: getLiquidityDistributionAmount(),
  staking: getPushDistributionAmount(),
  team: team.deposit.tokens,
  foundation: foundation.deposit.tokens,
}

const STAKING_INFO = {
  stakingInfo: stakingInfo,
  stakingAmount: getPushDistributionAmount().add(getLiquidityDistributionAmount())
}

const META_INFO = {
  eventualOwner: multiSigOwner
}

const NFT_INFO = {
  nfts: nfts,
  convertNFTObjectToIndividualArrays: convertNFTObjectToIndividualArrays
}

module.exports = {
  VESTING_INFO,
  DISTRIBUTION_INFO,
  META_INFO,
  STAKING_INFO,
  NFT_INFO
}
