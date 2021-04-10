const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers')

const {
  DISTRIBUTION_INFO
} = require("../../scripts/constants/constants")
const { bn, tokensBN, bnToInt, vestedAmount } = require('../../helpers/utils')

const { expect } = require("chai")

describe('OpenZeppelin TokenVesting Test Cases', function () {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

  let Contract
  let contract

  let Token
  let token

  let owner
  let beneficiary

  let start
  let cliffDuration
  let duration

  const amount = tokensBN('1000')

  before(async function() {
    [owner, beneficiary] = await ethers.getSigners()

    Contract = await ethers.getContractFactory("TokenVesting")
    Token = await ethers.getContractFactory("EPNS")
  })

  beforeEach(async function () {
    // +1 minute so it starts after contract instantiation
    const now = await ethers.provider.getBlock()

    start = bn(now.timestamp + (60))
    cliffDuration = start.add(365 * 24 * 60 * 60)
    duration = start.add(2 * 365 * 24 * 60 * 60)
  })

  it('deploys when duration equal to cliff', async function () {
    const cliffDuration1 = duration
    const duration1 = cliffDuration1

    expect(cliffDuration1).to.be.least(duration1)

    await expect(Contract.deploy(beneficiary.address, start, cliffDuration1, duration1, true))
  })

  it('reverts with a duration shorter than the cliff', async function () {
    const cliffDuration1 = duration
    const duration1 = cliffDuration.sub(1)

    expect(cliffDuration1).to.be.least(duration1)

    await expect(Contract.deploy(beneficiary.address, start, cliffDuration1, duration1, true))
      .to.be.revertedWith('TokenVesting::constructor: cliff is longer than duration')
  })

  it('reverts with a null beneficiary', async function () {
    await expect(Contract.deploy(ZERO_ADDRESS, start, cliffDuration, duration, true))
      .to.be.revertedWith('TokenVesting::constructor: beneficiary is the zero address')
  })

  it('reverts with a null duration', async function () {
    // cliffDuration should also be 0, since the duration must be larger than the cliff
    await expect(Contract.deploy(beneficiary.address, start, 0, 0, true))
      .to.be.revertedWith('TokenVesting::constructor: duration is 0')
  })

  it('reverts if the end time is in the past', async function () {
    const start1 = start.sub(100)
    const cliffDuration1 = bn(1)
    const duration1 = bn(2)

    await expect(Contract.deploy(beneficiary.address, start1, cliffDuration1, duration1, true))
      .to.be.revertedWith('TokenVesting::constructor: final time is before current time')
  })

  describe('once deployed', function () {
    beforeEach(async function () {
      contract = await Contract.deploy(beneficiary.address, start, cliffDuration, duration, true)
      token = await Token.deploy(owner.address)
    })

    it('can get state', async function () {
      expect(await contract.beneficiary()).to.equal(beneficiary.address)
      expect(await contract.cliff()).to.equal(start.add(cliffDuration))
      expect(await contract.start()).to.equal(start)
      expect(await contract.duration()).to.equal(duration)
      expect(await contract.revocable()).to.equal(true)
    })

    it('cannot be released before cliff', async function () {
      await expect(contract.release(token.address))
        .to.be.revertedWith('TokenVesting::release: no tokens are due')
    })
  })
})
