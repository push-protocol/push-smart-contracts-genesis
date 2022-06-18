const { tokens, CONSTANT_1K, CONSTANT_10K, CONSTANT_100K, CONSTANT_1M } = require('../../../helpers/utils')
const { nftsMapping } = require('./nftsMappingInfo.enc')

const nfts = {
  tokens: tokens(2.4 * CONSTANT_100K), // 240k tokens for 100 Users
  users: 100,
  nftsMapping: nftsMapping,
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
  nfts: nfts
}
