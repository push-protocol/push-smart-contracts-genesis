const { time, expectEvent } = require("@openzeppelin/test-helpers")

const {
  DISTRIBUTION_INFO
} = require("../../scripts/constants/constants")
const { tokensBN, bnToInt, vestedAmount } = require('../../helpers/utils')

const { expect } = require("chai")

describe("TokenVesting Contract tests", function () {
  let Token
  let token

  let Contract
  let contract

  let owner
  let beneficiary
  let addr1
  let addrs

  let start
  let cliffDuration
  let duration
  let amount

  const totalToken = ethers.BigNumber.from(DISTRIBUTION_INFO.total)

  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    [owner, beneficiary, addr1, ...addrs] = await ethers.getSigners()

    Token = await ethers.getContractFactory("EPNS")
    Contract = await ethers.getContractFactory("TokenVesting")

    const now = await ethers.provider.getBlock()

    start = (now.timestamp + 60)
    cliffDuration = 31536000
    duration = (2 * cliffDuration)

    // +1 minute so it starts after contract instantiation
    contract = await Contract.deploy(
      beneficiary.address,
      start,
      cliffDuration,
      duration,
      true
    )

    token = await Token.deploy(owner.address)

    amount = tokensBN(Math.floor(Math.random() * bnToInt(totalToken)))
    await token.transfer(contract.address, amount)
  })

  afterEach(async function () {
    token = null
    contract = null
  })

  it("reverts with a duration shorter than the cliff", async function () {
    const cliffDurationShort = duration
    const durationShort = cliffDuration

    expect(cliffDurationShort).to.at.least(durationShort)

    const tx = Contract.deploy(
      beneficiary.address,
      start,
      cliffDurationShort,
      durationShort,
      true
    )

    await expect(tx)
      .to.revertedWith("TokenVesting::constructor: cliff is longer than duration")
  })

  it("reverts with a null beneficiary.address", async function () {
    const tx = Contract.deploy(
      "0x0000000000000000000000000000000000000000",
      start,
      cliffDuration,
      duration,
      true
    )
    await expect(tx)
      .to.revertedWith("TokenVesting::constructor: beneficiary is the zero address")
  })

  it("reverts with a null duration", async function () {
    // cliffDuration should also be 0, since the duration must be larger than the cliff
    await expect(Contract.deploy(beneficiary.address, start, 0, 0, true))
      .to.revertedWith("TokenVesting::constructor: duration is 0")
  })

  it("can get state", async function () {
    expect(await contract.beneficiary()).to.equal(beneficiary.address)
    expect(await contract.cliff()).to.equal(start + cliffDuration)
    expect(await contract.start()).to.equal(start)
    expect(await contract.duration()).to.equal(duration)
    expect(await contract.revocable()).to.equal(true)
  })

  it("cannot be released before cliff", async function () {
    await expect(contract.release(token.address))
      .to.revertedWith("TokenVesting::release: no tokens are due")
  })

  it("can be released after cliff", async function () {
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      start + cliffDuration,
    ])
    await ethers.provider.send("evm_mine")
    await contract.release(token.address)

    const eventEmitted = (
      await contract.queryFilter("TokensReleased")
    )[0]

    expect(eventEmitted.args.token).to.equal(token.address)
    expect(eventEmitted.args.amount.toString()).to.equal(
      (await token.balanceOf(beneficiary.address)).toString()
    )
  })

  it("should release proper amount after cliff", async function () {
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      start + cliffDuration + 60,
    ])
    await ethers.provider.send("evm_mine")

    await contract.release(token.address)
    const releaseTime = ethers.BigNumber.from(
      (await ethers.provider.getBlock()).timestamp
    )
    const releasedAmount = amount.mul(releaseTime.sub(start)).div(duration)
    const balance = await token.balanceOf(beneficiary.address)
    const released = await contract.released(token.address)

    expect(balance.toString()).to.equal(releasedAmount.toString())
    expect(released.toString()).to.equal(releasedAmount.toString())
  })

  it("should linearly release tokens during contract period", async function () {
    start = ethers.BigNumber.from(start)
    cliffDuration = ethers.BigNumber.from(cliffDuration)
    duration = ethers.BigNumber.from(duration)

    const vestingPeriod = duration.sub(cliffDuration)
    const checkpoints = 4

    for (let i = 1; i <= checkpoints; i++) {
      const now = start
        .add(cliffDuration)
        .add(vestingPeriod.mul(i).div(checkpoints))

      await ethers.provider.send("evm_setNextBlockTimestamp", [now.toNumber()])
      await contract.release(token.address)
      const expectedContract = amount.mul(now.sub(start)).div(duration)
      expect(
        (await token.balanceOf(beneficiary.address)).toString()
      ).to.equal(expectedContract.toString())
      expect(
        (await contract.released(token.address)).toString()
      ).to.equal(expectedContract.toString())
      await ethers.provider.send("evm_mine")
    }
  })

  it("should have released all after end", async function () {
    await ethers.provider.send("evm_setNextBlockTimestamp", [start + duration])
    await ethers.provider.send("evm_mine")

    await contract.release(token.address)
    expect(
      (await token.balanceOf(beneficiary.address)).toString()
    ).to.equal(amount.toString())
    expect(
      (await contract.released(token.address)).toString()
    ).to.equal(amount.toString())
  })

  it("should be revoked by owner.address if revocable is set", async function () {
    const tx = await contract.revoke(token.address)
    expect(tx)
  })

  it("should return the non-vested tokens when revoked by owner.address", async function () {
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      start + cliffDuration + 7257600, // 12 Weeks
    ])
    await ethers.provider.send("evm_mine")

    await contract.revoke(token.address)

    const vested = vestedAmount(
      amount,
      (await ethers.provider.getBlock()).timestamp,
      start,
      cliffDuration,
      duration
    )
    const balance = await token.balanceOf(owner.address)
    const expectedBalance = totalToken.sub(amount).add(amount.sub(vested))

    expect(balance.toString()).to.equal(expectedBalance.toString())
  })

  it("should return the amount that has already vested", async function () {
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      start + cliffDuration + 7257600, // 12 Weeks
    ])
    await ethers.provider.send("evm_mine")

    const contractVested = await contract.vestedAmount(token.address)

    const vested = vestedAmount(
      amount,
      (await ethers.provider.getBlock()).timestamp,
      start,
      cliffDuration,
      duration
    )

    expect(vested.toString()).to.equal(contractVested.toString())
  })

  function vestedAmount(total, now, start, cliffDuration, duration) {
    return now < start + cliffDuration
      ? ethers.BigNumber.from(0)
      : total.mul(now - start).div(duration)
  }

  it("should keep the vested tokens when revoked by owner", async function () {
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      start + cliffDuration + 7257600, // 12 Weeks
    ])
    await ethers.provider.send("evm_mine")

    const now = (await ethers.provider.getBlock()).timestamp

    await contract.revoke(token.address)

    const contractVested = await contract.vestedAmount(token.address)

    expect((await token.balanceOf(contract.address)).toString()).to.equal(contractVested.toString())
  })

  it("should fail to be revoked by owner if revocable not set", async function () {
    const vesting = await Contract.deploy(
      beneficiary.address,
      start,
      cliffDuration,
      duration,
      false
    )
    const tx = vesting.revoke(token.address)
    await expect(tx)
      .to.revertedWith("TokenVesting::revoke: cannot revoke")
  })

  it("should fail to be revoked a second time", async function () {
    await contract.revoke(token.address)
    const tx = contract.revoke(token.address)
    await expect(tx).
      to.revertedWith("TokenVesting::revoke: token already revoked")
  })

  it("reverts if the end time is in the past", async function () {
    const now = Math.floor(new Date() / 1000)
    start = now - 3600
    const tx = Contract.deploy(
      beneficiary.address,
      start,
      cliffDuration,
      duration,
      true
    )
    await expect(tx)
      .to.revertedWith("TokenVesting::constructor: final time is before current time")
  })

  it("should change the beneficiary address if beneficiary calls", async function () {
    const advisorsContractBeneficiary = contract.connect(beneficiary)
    await advisorsContractBeneficiary.setBeneficiary(addr1.address)
    const newBeneficiary = await contract.beneficiary()

    expect(newBeneficiary).to.equal(addr1.address)
  })

  it("should revert if anyone other than beneficiary tries to change beneficiary", async function () {
    const tx = contract.setBeneficiary(addr1.address)
    await expect(tx)
      .to.revertedWith("TokenVesting::setBeneficiary: Not contract beneficiary")
  })
})
