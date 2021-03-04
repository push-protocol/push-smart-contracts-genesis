const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers')

const {
  DISTRIBUTION_INFO
} = require("../../scripts/constants")
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

  it('reverts with a duration equal to cliff', async function () {
    const cliffDuration1 = duration
    const duration1 = cliffDuration

    expect(cliffDuration1).to.be.least(duration1)

    await expect(Contract.deploy(beneficiary.address, start, cliffDuration1, duration1, true))
      .to.be.revertedWith('TokenVesting::constructor: cliff is longer than duration')
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
    // 
    // it('can be released after cliff', async function () {
    //   await time.increaseTo(this.start.add(cliffDuration).add(time.duration.weeks(1)))
    //   const { logs } = await contract.release(token.address)
    //   expectEvent.inLogs(logs, 'TokensReleased', {
    //     token: token.address,
    //     amount: await token.balanceOf(beneficiary),
    //   })
    // })
    //
    // it('should release proper amount after cliff', async function () {
    //   await time.increaseTo(this.start.add(cliffDuration))
    //
    //   await contract.release(token.address)
    //   const releaseTime = await time.latest()
    //
    //   const releasedAmount = amount.mul(releaseTime.sub(this.start)).div(duration)
    //   expect(await token.balanceOf(beneficiary)).to.be.bignumber.equal(releasedAmount)
    //   expect(await contract.released(token.address)).to.be.bignumber.equal(releasedAmount)
    // })
    //
    // it('should linearly release tokens during vesting period', async function () {
    //   const vestingPeriod = duration.sub(cliffDuration)
    //   const checkpoints = 4
    //
    //   for (let i = 1; i <= checkpoints; i++) {
    //     const now = this.start.add(cliffDuration).add((vestingPeriod.muln(i).divn(checkpoints)))
    //     await time.increaseTo(now)
    //
    //     await contract.release(token.address)
    //     const expectedVesting = amount.mul(now.sub(this.start)).div(duration)
    //     expect(await token.balanceOf(beneficiary)).to.be.bignumber.equal(expectedVesting)
    //     expect(await contract.released(token.address)).to.be.bignumber.equal(expectedVesting)
    //   }
    // })
    //
    // it('should have released all after end', async function () {
    //   await time.increaseTo(this.start.add(duration))
    //   await contract.release(token.address)
    //   expect(await token.balanceOf(beneficiary)).to.be.bignumber.equal(amount)
    //   expect(await contract.released(token.address)).to.be.bignumber.equal(amount)
    // })
    //
    // it('should be revoked by owner if revocable is set', async function () {
    //   const { logs } = await contract.revoke(token.address, { from: owner })
    //   expectEvent.inLogs(logs, 'TokenVestingRevoked', { token: token.address })
    //   expect(await contract.revoked(token.address)).to.equal(true)
    // })
    //
    // it('should fail to be revoked by owner if revocable not set', async function () {
    //   const vesting = await TokenVesting.new(
    //     beneficiary, this.start, cliffDuration, duration, false, { from: owner }
    //   )
    //
    //   await expectRevert(vesting.revoke(token.address, { from: owner }),
    //     'TokenVesting: cannot revoke'
    //   )
    // })
    //
    // it('should return the non-vested tokens when revoked by owner', async function () {
    //   await time.increaseTo(this.start.add(cliffDuration).add(time.duration.weeks(12)))
    //
    //   const vested = vestedAmount(amount, await time.latest(), this.start, cliffDuration, duration)
    //
    //   await contract.revoke(token.address, { from: owner })
    //
    //   expect(await token.balanceOf(owner)).to.be.bignumber.equal(amount.sub(vested))
    // })
    //
    // it('should keep the vested tokens when revoked by owner', async function () {
    //   await time.increaseTo(this.start.add(cliffDuration).add(time.duration.weeks(12)))
    //
    //   const vestedPre = vestedAmount(amount, await time.latest(), this.start, cliffDuration, duration)
    //
    //   await contract.revoke(token.address, { from: owner })
    //
    //   const vestedPost = vestedAmount(amount, await time.latest(), this.start, cliffDuration, duration)
    //
    //   expect(vestedPre).to.be.bignumber.equal(vestedPost)
    // })
    //
    // it('should fail to be revoked a second time', async function () {
    //   await contract.revoke(token.address, { from: owner })
    //   await expectRevert(contract.revoke(token.address, { from: owner }),
    //     'TokenVesting: token already revoked'
    //   )
    // })
    //
    // function vestedAmount (total, now, start, cliffDuration, duration) {
    //   return (now.lt(start.add(cliffDuration))) ? new BN(0) : total.mul((now.sub(start))).div(duration)
    // }
  })
})
