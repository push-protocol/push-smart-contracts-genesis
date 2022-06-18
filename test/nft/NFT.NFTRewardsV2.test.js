const {
  NFT_INFO
} = require("../../scripts/constants/constants")
const { bn, tokensBN, bnToInt, vestedAmount } = require('../../helpers/utils')

const { expect } = require("chai")

describe("NFTRewards Contract tests", function () {
  let Token
  let token

  let Rockstar
  let rockstar
  let nftsInfo

  let Contract
  let contract

  let owner
  let alice
  let bob
  let addrs

  const rewardPerNFT = bn(NFT_INFO.nftsV2.tokens).div(bn(NFT_INFO.nftsV2.users))

  before(async function() {
    // Get the ContractFactory and Signers here.
    [owner, alice, bob, ...addrs] = await ethers.getSigners()

    Token = await ethers.getContractFactory("EPNS")
    Rockstar = await ethers.getContractFactory("Rockstar")

    token = await Token.deploy(owner.address)
    rockstar = await Rockstar.deploy()

    // mint all nfts of rockstar
    nftsInfo = NFT_INFO.nfts.helpers.convertNFTObjectToIndividualArrays(NFT_INFO.nftsV2.nftsMappingV2)
    nftsInfo.tokenId = []

    for (let i = 0; i < nftsInfo.recipients.length; i++) {
      // overide owner
      nftsInfo.recipients[i] = owner.address

      const tx = await rockstar.safeMint(nftsInfo.recipients[i], nftsInfo.metadatas[i])
      const result = await tx.wait()
      nftsInfo.tokenId[i] = result.events["0"].args.tokenId.toString()
    }
  })

  beforeEach(async function () {
    const rewardPerNFT = bn(NFT_INFO.nftsV2.tokens).div(bn(NFT_INFO.nftsV2.users))
    Contract = await ethers.getContractFactory("NFTRewardsV2")

    contract = await Contract.deploy(rewardPerNFT, token.address, rockstar.address)
  })

  afterEach(async function () {
    contract = null
  })

  after(async function() {
    token = null
    rockstar = null
  })

  it("should not claim if contract is does not have token balance", async function () {
    await expect(contract.claimReward(nftsInfo.tokenId[0]))
      .to.be.revertedWith('NFTRewardsV2::claimReward: reward exceeds contract balance')
  })

  it("should be able claim if contract has token balance", async function () {
    await token.transfer(contract.address, NFT_INFO.nftsV2.tokens)

    await expect(contract.claimReward(nftsInfo.tokenId[0]))
      .to.emit(contract, 'RewardClaimed')
      .withArgs(owner.address, nftsInfo.tokenId[0], rewardPerNFT);
  })

  it("should show true status on claimable if not claimed", async function () {
    await token.transfer(contract.address, NFT_INFO.nftsV2.tokens)

    expect(await contract.getClaimRewardStatus(nftsInfo.tokenId[0])).to.equal(true)
  })

  it("should show false status on claimable if claimed", async function () {
    await token.transfer(contract.address, NFT_INFO.nftsV2.tokens)

    await contract.claimReward(nftsInfo.tokenId[0])
    expect(await contract.getClaimRewardStatus(nftsInfo.tokenId[0])).to.equal(false)
  })

  it("should revert if already claimed", async function () {
    await token.transfer(contract.address, NFT_INFO.nftsV2.tokens)

    await contract.claimReward(nftsInfo.tokenId[0])
    await expect(contract.claimReward(nftsInfo.tokenId[0]))
      .to.be.revertedWith('NFTRewardsV2::claimReward: reward already claimed')
  })

  it("should revert if not the owner", async function () {
    await token.transfer(contract.address, NFT_INFO.nftsV2.tokens)

    await expect(contract.connect(alice).claimReward(nftsInfo.tokenId[0]))
      .to.be.revertedWith('NFTRewardsV2::claimReward: unauthorized non-owner of NFT')
  })

  it("should reflect push balance on claim reward (new address)", async function () {
    await token.transfer(contract.address, NFT_INFO.nftsV2.tokens)

    expect (await token.balanceOf(alice.address)).to.equal(0)

    await rockstar.connect(owner)['safeTransferFrom(address,address,uint256)'](owner.address, alice.address, nftsInfo.tokenId[0])
    await contract.connect(alice).claimReward(nftsInfo.tokenId[0])

    expect(await token.balanceOf(alice.address)).to.equal(rewardPerNFT)

    await rockstar.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, owner.address, nftsInfo.tokenId[0])
  })

  it("should reflect push balance on claim reward (same address)", async function () {
    await token.transfer(contract.address, NFT_INFO.nftsV2.tokens)

    const balance = await token.balanceOf(owner.address)
    await contract.claimReward(nftsInfo.tokenId[0])

    expect(await token.balanceOf(owner.address)).to.equal(balance.add(rewardPerNFT))
  })

  it("should be able to claim all rewards", async function() {
    await token.transfer(contract.address, NFT_INFO.nftsV2.tokens)
    const balance = await token.balanceOf(alice.address)

    for (let i = 0; i < nftsInfo.recipients.length; i++) {
      await rockstar.connect(owner)['safeTransferFrom(address,address,uint256)'](owner.address, alice.address, nftsInfo.tokenId[i])
      await contract.connect(alice).claimReward(nftsInfo.tokenId[i])
    }

    expect(await token.balanceOf(alice.address)).to.equal(balance.add(rewardPerNFT.mul(NFT_INFO.nftsV2.users)))
  })
})
