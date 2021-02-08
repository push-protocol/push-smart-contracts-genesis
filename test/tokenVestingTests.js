const { time, expectEvent } = require("@openzeppelin/test-helpers");
const {
  EPNS_ADVISORS_FUNDS_AMOUNT,
  VESTING_CLIFF,
  VESTING_DURATION,
} = require("../scripts/constants");

const { expect } = require("chai");

describe("TokenVesting", function () {
  let EPNSToken;
  let TokenVesting;
  let owner;
  let beneficiary;
  let amount = ethers.BigNumber.from(EPNS_ADVISORS_FUNDS_AMOUNT);
  let epnsToken;
  let start;
  let cliffDuration;
  let duration;
  let epnsInstance;
  let vestingInstance;

  before(async function () {
    [owner, beneficiary] = await ethers.getSigners();
    EPNSToken = await ethers.getContractFactory("EPNS");
    TokenVesting = await ethers.getContractFactory("TokenVesting");
  });

  beforeEach(async function () {
    start = (await time.latest()).add(time.duration.minutes(10));
    cliffDuration = time.duration.years(1);
    duration = time.duration.years(2);
    // +1 minute so it starts after contract instantiation
    vestingInstance = await TokenVesting.deploy(
      beneficiary.address,
      start.toString(),
      cliffDuration.toString(),
      duration.toString(),
      true
    );
    epnsInstance = await EPNSToken.deploy(owner.address);
    await epnsInstance.transfer(vestingInstance.address, amount.toString());
  });

  it("reverts with a duration shorter than the cliff", async function () {
    const cliffDurationShort = duration;
    const durationShort = cliffDuration;

    expect(cliffDurationShort).to.be.bignumber.that.is.at.least(durationShort);

    expect(
      TokenVesting.deploy(
        beneficiary.address,
        start.toString(),
        cliffDurationShort.toString(),
        durationShort.toString(),
        true
      )
    ).to.be.revertedWith("TokenVesting: cliff is longer than duration");
  });

  it("reverts with a null beneficiary.address", async function () {
    expect(
      TokenVesting.deploy(
        "0x0000000000000000000000000000000000000000",
        start.toString(),
        cliffDuration.toString(),
        duration.toString(),
        true
      )
    ).to.be.revertedWith("TokenVesting: beneficiary is the zero address");
  });

  it("reverts with a null duration", async function () {
    // cliffDuration should also be 0, since the duration must be larger than the cliff
    expect(
      TokenVesting.deploy(beneficiary.address, start.toString(), 0, 0, true)
    ).to.be.revertedWith("TokenVesting: duration is 0");
  });

  it("can get state", async function () {
    expect(await vestingInstance.beneficiary()).to.equal(beneficiary.address);
    expect(await vestingInstance.cliff()).to.be.equal(
      start.add(cliffDuration).toString()
    );
    expect(await vestingInstance.start()).to.be.equal(start.toString());
    expect(await vestingInstance.duration()).to.be.equal(duration.toString());
    expect(await vestingInstance.revocable()).to.be.equal(true);
  });

  it("cannot be released before cliff", async function () {
    expect(vestingInstance.release(epnsInstance.address)).to.be.revertedWith(
      "TokenVesting: no tokens are due"
    );
  });

//   it("can be released after cliff", async function () {
//     console.log('balance', (await epnsInstance.balanceOf(vestingInstance.address)).toString())
//     await time.increaseTo(start.add(cliffDuration).add(time.duration.years(3)));
//     const { logs } = await vestingInstance.release(epnsInstance.address);
//     expectEvent.inLogs(logs, "TokensReleased", {
//       token: epnsInstance.address,
//       amount: await epnsInstance.balanceOf(beneficiary.address),
//     });
//   });

//   it("should release proper amount after cliff", async function () {
//     await time.increaseTo(start.add(cliffDuration));

//     await vestingInstance.release(epnsInstance.address);
//     const releaseTime = await time.latest();

//     const releasedAmount = amount.mul(releaseTime.sub(start)).div(duration);
//     expect(
//       await epnsInstance.balanceOf(beneficiary.address)
//     ).to.be.bignumber.equal(releasedAmount);
//     expect(
//       await vestingInstance.released(epnsInstance.address)
//     ).to.be.bignumber.equal(releasedAmount);
//   });

//   it("should linearly release tokens during vestingInstance period", async function () {
//     const vestingPeriod = duration.sub(cliffDuration);
//     const checkpoints = 4;

//     for (let i = 1; i <= checkpoints; i++) {
//       const now = start
//         .add(cliffDuration)
//         .add(vestingPeriod.muln(i).divn(checkpoints));
//       await time.increaseTo(now);

//       await vestingInstance.release(epnsInstance.address);
//       const expectedVesting = amount.mul(now.sub(start)).div(duration);
//       expect(
//         await epnsInstance.balanceOf(beneficiary.address)
//       ).to.be.bignumber.equal(expectedVesting);
//       expect(
//         await vestingInstance.released(epnsInstance.address)
//       ).to.be.bignumber.equal(expectedVesting);
//     }
//   });

//   it("should have released all after end", async function () {
//     await time.increaseTo(start.add(duration));
//     await vestingInstance.release(epnsInstance.address);
//     expect(
//       await epnsInstance.balanceOf(beneficiary.address)
//     ).to.be.bignumber.equal(amount);
//     expect(
//       await vestingInstance.released(epnsInstance.address)
//     ).to.be.bignumber.equal(amount);
//   });

//   it("should be revoked by owner.address if revocable is set", async function () {
//     const tx = await vestingInstance.revoke(epnsInstance.address);
//     await tx.wait()
//     console.log(tx)
    
//     expectEvent.inTransaction(tx.hash, "TokenVestingRevoked", {
//       token: epnsInstance.address,
//     });
//     expect(await vestingInstance.revoked(epnsInstance.address)).to.equal(true);
//   });

  it("should fail to be revoked by owner.address if revocable not set", async function () {
    const vestingInstance = await TokenVesting.deploy(
      beneficiary.address,
      start.toString(),
      cliffDuration.toString(),
      duration.toString(),
      false
    );

    expect(vestingInstance.revoke(epnsInstance.address)).to.be.revertedWith(
      "TokenVesting: cannot revoke"
    );
  });

//   it("should return the non-vested tokens when revoked by owner.address", async function () {
//     await time.increaseTo(
//       start.add(cliffDuration).add(time.duration.weeks(12))
//     );

//     const vested = vestedAmount(
//       amount,
//       await time.latest(),
//       start,
//       cliffDuration,
//       duration.toString()
//     );

//     await vestingInstance.revoke(epnsInstance.address);

//     expect(await epnsInstance.balanceOf(owner.address)).to.be.bignumber.equal(
//       amount.sub(vested)
//     );
//   });

//   it("should keep the vested tokens when revoked by owner.address", async function () {
//     await time.increaseTo(
//       start.add(cliffDuration).add(time.duration.weeks(12))
//     );

//     const vestedPre = vestedAmount(
//       amount,
//       await time.latest(),
//       start,
//       cliffDuration.toString(),
//       duration.toString()
//     );

//     await vestingInstance.revoke(epnsInstance.address);

//     const vestedPost = vestedAmount(
//       amount,
//       await time.latest(),
//       start,
//       cliffDuration.toString(),
//       duration.toString()
//     );

//     expect(vestedPre).to.be.bignumber.equal(vestedPost);
//   });

  it("should fail to be revoked a second time", async function () {
    await vestingInstance.revoke(epnsInstance.address);
    expect(vestingInstance.revoke(epnsInstance.address)).to.be.revertedWith(
      "TokenVesting: token already revoked"
    );
  });

  it("reverts if the end time is in the past", async function () {
    const now = await time.latest();
    start = now.sub(duration).sub(time.duration.minutes(1));
    expect(
      TokenVesting.deploy(
        beneficiary.address,
        start.toString(),
        cliffDuration.toString(),
        duration.toString(),
        true
      )
    ).to.be.revertedWith("TokenVesting: final time is before current time");
  });

  function vestedAmount(total, now, start, cliffDuration, duration) {
    return now.lt(start.add(cliffDuration))
      ? new BN(0)
      : total.mul(now.sub(start)).div(duration);
  }
});
