const { tokens, CONSTANT_1K, CONSTANT_10K, CONSTANT_100K, CONSTANT_1M } = require('../../../helpers/utils')
const { nftsMappingV2 } = require('./nftsMappingInfoV2.enc')

const nftsV2 = {
  tokens: tokens(9 * CONSTANT_10K), // 90k tokens for 100 Users
  users: 100,
  nftsMappingV2: nftsMappingV2,
  helpers: {
    convertNFTObjectToIndividualArrays: function(nftObject) {
      let nftsObject = {
        recipients: [],
        metadatas: []
      }

      for (const [key, value] of Object.entries(nftObject)) {
        nftsObject.recipients.push(value[0])
        nftsObject.metadatas.push(value[1])
      }

      return nftsObject
    }
  }
}

module.exports = {
  nftsV2: nftsV2
}
