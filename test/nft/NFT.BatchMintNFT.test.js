const { time, expectEvent } = require("@openzeppelin/test-helpers")

const {
  NFT_INFO
} = require("../../scripts/constants")
const { tokensBN, bnToInt, vestedAmount } = require('../../helpers/utils')

const { expect } = require("chai")

describe("NFT ($ROCKSTAR) Contract tests", function () {
  let Token
  let token

  let Rockstar
  let rockstar

  let Contract
  let contract

  let owner
  let alice
  let bob
  let addrs

  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    [owner, alice, bob, ...addrs] = await ethers.getSigners()

    Token = await ethers.getContractFactory("EPNS")
    Rockstar = await ethers.getContractFactory("Rockstar")
    Contract = await ethers.getContractFactory("BatchMintNFT")

    token = await Token.deploy(owner.address)
    rockstar = await Rockstar.deploy()
    contract = await Contract.deploy()
  })

  afterEach(async function () {
    token = null
    nft = null
    contract = null
  })

  it("should revert if array is not equal to 100", async function () {
    // transfer ownership to allow mint from batch contract
    await rockstar.transferOwnership(contract.address)

    await expect(contract.produceNFTs(rockstar.address, ['0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000'], ['a', 'b'], 0, 100))
      .to.be.revertedWith('BatchDeploy::batchDeployNFTs: Needs exact 100 recipients')

    // get individual nfts array
    let individualNFTInfos = NFT_INFO.convertNFTObjectToIndividualArrays(NFT_INFO.nfts)
    individualNFTInfos.recipients.push('0x0000000000000000000000000000000000000000')
    individualNFTInfos.metadatas.push('dummy')

    expect(individualNFTInfos.recipients.length).to.be.equal(101)
    expect(individualNFTInfos.metadatas.length).to.be.equal(101)

    await expect(contract.produceNFTs(rockstar.address, individualNFTInfos.recipients, individualNFTInfos.metadatas, 0, 100))
      .to.be.revertedWith('BatchDeploy::batchDeployNFTs: Needs exact 100 recipients')
  })

  it("should revert if array of recipient is not equal to array of metadatas", async function () {
    // transfer ownership to allow mint from batch contract
    await rockstar.transferOwnership(contract.address)

    await expect(contract.produceNFTs(rockstar.address, ['0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000'], ['a', 'b'], 0, 100))
      .to.be.revertedWith('BatchDeploy::batchDeployNFTs: Needs exact 100 recipients')

    // get individual nfts array
    let individualNFTInfos = NFT_INFO.convertNFTObjectToIndividualArrays(NFT_INFO.nfts)
    individualNFTInfos.metadatas.pop()

    expect(individualNFTInfos.recipients.length).to.be.equal(100)
    expect(individualNFTInfos.metadatas.length).to.be.equal(99)

    await expect(contract.produceNFTs(rockstar.address, individualNFTInfos.recipients, individualNFTInfos.metadatas, 0, 100))
      .to.be.revertedWith('BatchDeploy::batchDeployNFTs: recipients and metaddata count mismatch')
  })

  it("should run correctly (batched)", async function () {
    // transfer ownership to allow mint from batch contract
    await rockstar.transferOwnership(contract.address)

    // get individual nfts array
    let individualNFTInfos = NFT_INFO.convertNFTObjectToIndividualArrays(NFT_INFO.nfts)

    let increment = 40
    let paged = 0
    let count = 0
    let max = 100

    while (paged != max) {
      if (paged + increment > max) {
        paged = max
      }
      else {
        paged = paged + increment
      }

      await contract.produceNFTs(rockstar.address, individualNFTInfos.recipients, individualNFTInfos.metadatas, count, paged)
      count = paged
    }

    for (let i = 1; i <= count; i++) {
      expect(await rockstar.tokenURI(i)).to.equal(individualNFTInfos.metadatas[i - 1])
    }
  })

  it("should run correctly unbatched (for benchmark)", async function () {
    // get individual nfts array
    let individualNFTInfos = NFT_INFO.convertNFTObjectToIndividualArrays(NFT_INFO.nfts)

    for (let i = 0; i < individualNFTInfos.recipients.length; i++) {
      await rockstar.safeMint(individualNFTInfos.recipients[i], individualNFTInfos.metadatas[i])
    }

    for (let i = 1; i <= individualNFTInfos.recipients.length; i++) {
      expect(await rockstar.tokenURI(i)).to.equal(individualNFTInfos.metadatas[i - 1])
    }
  })
})
