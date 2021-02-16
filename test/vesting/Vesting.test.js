const { time, expectEvent } = require("@openzeppelin/test-helpers");
const {
  EPNS_ADVISORS_FUNDS_AMOUNT,
  TOTAL_EPNS_TOKENS,
} = require("../../scripts/constants");

const { expect } = require("chai");

describe("Vesting tests", function () {
  let EPNSToken;
  let Vesting;
  let owner;
  let beneficiary;
  let addr1;
  let totalToken = ethers.BigNumber.from(TOTAL_EPNS_TOKENS);
  let amount = ethers.BigNumber.from(EPNS_ADVISORS_FUNDS_AMOUNT);
  let epnsToken;
  let start;
  let cliffDuration;
  let duration;
  let epnsInstance;
  let vestingInstance;

  before(async function () {
    [owner, beneficiary, addr1] = await ethers.getSigners();
    EPNSToken = await ethers.getContractFactory("EPNS");
    Vesting = await ethers.getContractFactory("Vesting");
  });

  beforeEach(async function () {
    const now = (await ethers.provider.getBlock()).timestamp;
    start = now + 60;
    cliffDuration = 31536000; // 1 Year
    duration = cliffDuration + 31536000; // 2 Years

    // +1 minute so it starts after contract instantiation
    vestingInstance = await Vesting.deploy(
      beneficiary.address,
      start,
      cliffDuration,
      duration,
      true
    );
    epnsInstance = await EPNSToken.deploy(owner.address);
    await epnsInstance.transfer(vestingInstance.address, amount);
  });

  it("reverts with a duration shorter than the cliff", async function () {
    const cliffDurationShort = duration;
    const durationShort = cliffDuration;

    expect(cliffDurationShort).to.at.least(durationShort);

    const tx = Vesting.deploy(
      beneficiary.address,
      start,
      cliffDurationShort,
      durationShort,
      true
    )

    await expect(tx)
      .to.revertedWith("Vesting::constructor: cliff is longer than duration");
  });

  it("reverts with a null beneficiary.address", async function () {
    const tx = Vesting.deploy(
      "0x0000000000000000000000000000000000000000",
      start,
      cliffDuration,
      duration,
      true
    )
    await expect(tx)
      .to.revertedWith("Vesting::constructor: beneficiary is the zero address");
  });

  it("reverts with a null duration", async function () {
    // cliffDuration should also be 0, since the duration must be larger than the cliff
    await expect(Vesting.deploy(beneficiary.address, start, 0, 0, true))
      .to.revertedWith("Vesting::constructor: duration is 0");
  });

  it("can get state", async function () {
    expect(await vestingInstance.beneficiary()).to.equal(beneficiary.address);
    expect(await vestingInstance.cliff()).to.equal(start + cliffDuration);
    expect(await vestingInstance.start()).to.equal(start);
    expect(await vestingInstance.duration()).to.equal(duration);
    expect(await vestingInstance.revocable()).to.equal(true);
  });

  it("cannot be released before cliff", async function () {
    await expect(vestingInstance.release(epnsInstance.address))
      .to.revertedWith("Vesting::release: no tokens are due");
  });

  it("can be released after cliff", async function () {
    // await time.increaseTo(start.add(cliffDuration).add(time.duration.years(3)));
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      start + cliffDuration,
    ]);
    await ethers.provider.send("evm_mine");
    await vestingInstance.release(epnsInstance.address);

    const eventEmitted = (
      await vestingInstance.queryFilter("TokensReleased")
    )[0];

    expect(eventEmitted.args.token).to.equal(epnsInstance.address);
    expect(eventEmitted.args.amount.toString()).to.equal(
      (await epnsInstance.balanceOf(beneficiary.address)).toString()
    );
  });

  it("should release proper amount after cliff", async function () {
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      start + cliffDuration + 60,
    ]);
    await ethers.provider.send("evm_mine");

    await vestingInstance.release(epnsInstance.address);
    const releaseTime = ethers.BigNumber.from(
      (await ethers.provider.getBlock()).timestamp
    );
    const releasedAmount = amount.mul(releaseTime.sub(start)).div(duration);
    const balance = await epnsInstance.balanceOf(beneficiary.address);
    const released = await vestingInstance.released(epnsInstance.address);

    expect(balance.toString()).to.equal(releasedAmount.toString());
    expect(released.toString()).to.equal(releasedAmount.toString());
  });

  it("should linearly release tokens during vestingInstance period", async function () {
    start = ethers.BigNumber.from(start);
    cliffDuration = ethers.BigNumber.from(cliffDuration);
    duration = ethers.BigNumber.from(duration);

    const vestingPeriod = duration.sub(cliffDuration);
    const checkpoints = 4;

    for (let i = 1; i <= checkpoints; i++) {
      const now = start
        .add(cliffDuration)
        .add(vestingPeriod.mul(i).div(checkpoints));

      await ethers.provider.send("evm_setNextBlockTimestamp", [now.toNumber()]);
      await vestingInstance.release(epnsInstance.address);
      const expectedVesting = amount.mul(now.sub(start)).div(duration);
      expect(
        (await epnsInstance.balanceOf(beneficiary.address)).toString()
      ).to.equal(expectedVesting.toString());
      expect(
        (await vestingInstance.released(epnsInstance.address)).toString()
      ).to.equal(expectedVesting.toString());
      await ethers.provider.send("evm_mine");
    }
  });

  it("should have released all after end", async function () {
    await ethers.provider.send("evm_setNextBlockTimestamp", [start + duration]);
    await ethers.provider.send("evm_mine");

    await vestingInstance.release(epnsInstance.address);
    expect(
      (await epnsInstance.balanceOf(beneficiary.address)).toString()
    ).to.equal(amount.toString());
    expect(
      (await vestingInstance.released(epnsInstance.address)).toString()
    ).to.equal(amount.toString());
  });

  it("should be revoked by owner.address if revocable is set", async function () {
    const tx = await vestingInstance.revoke(epnsInstance.address);
    expect(tx);
  });

  it("should return the non-vested tokens when revoked by owner.address", async function () {
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      start + cliffDuration + 7257600, // 12 Weeks
    ]);
    await ethers.provider.send("evm_mine");

    await vestingInstance.revoke(epnsInstance.address);

    const vested = vestedAmount(
      amount,
      (await ethers.provider.getBlock()).timestamp,
      start,
      cliffDuration,
      duration
    );
    const balance = await epnsInstance.balanceOf(owner.address);
    const expectedBalance = totalToken.sub(amount).add(amount.sub(vested));

    expect(balance.toString()).to.equal(expectedBalance.toString());
  });

  function vestedAmount(total, now, start, cliffDuration, duration) {
    return now < start + cliffDuration
      ? ethers.BigNumber.from(0)
      : total.mul(now - start).div(duration);
  }

  it("should keep the vested tokens when revoked by owner", async function () {
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      start + cliffDuration + 7257600, // 12 Weeks
    ]);
    await ethers.provider.send("evm_mine");

    const now = (await ethers.provider.getBlock()).timestamp;

    const vestedPre = vestedAmount(amount, now, start, cliffDuration, duration);

    await vestingInstance.revoke(epnsInstance.address);

    const vestedPost = vestedAmount(
      amount,
      now,
      start,
      cliffDuration,
      duration
    );

    expect(vestedPre.toString()).to.equal(vestedPost.toString());
  });

  it("should fail to be revoked by owner if revocable not set", async function () {
    const vesting = await Vesting.deploy(
      beneficiary.address,
      start,
      cliffDuration,
      duration,
      false
    );
    const tx = vesting.revoke(epnsInstance.address);
    await expect(tx)
      .to.revertedWith("Vesting::revoke: cannot revoke");
  });

  it("should fail to be revoked a second time", async function () {
    await vestingInstance.revoke(epnsInstance.address);
    const tx = vestingInstance.revoke(epnsInstance.address);
    await expect(tx).
      to.revertedWith("Vesting::revoke: token already revoked");
  });

  it("reverts if the end time is in the past", async function () {
    const now = Math.floor(new Date() / 1000);
    start = now - 3600;
    const tx = Vesting.deploy(
      beneficiary.address,
      start,
      cliffDuration,
      duration,
      true
    )
    await expect(tx)
      .to.revertedWith("Vesting::constructor: final time is before current time");
  });

  it("should change the beneficiary address if beneficiary calls", async function () {
    const advisorsVestingBeneficiary = vestingInstance.connect(beneficiary);
    await advisorsVestingBeneficiary.setBeneficiary(addr1.address);
    const newBeneficiary = await vestingInstance.beneficiary();

    expect(newBeneficiary).to.equal(addr1.address);
  });

  it("should revert if anyone other than beneficiary tries to change beneficiary", async function () {
    const tx = vestingInstance.setBeneficiary(addr1.address);
    await expect(tx)
      .to.revertedWith("Vesting::setBeneficiary: Not contract beneficiary");
  });
});
