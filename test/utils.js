function vestedAmount(total, now, start, cliffDuration, duration) {
    return now < start + cliffDuration
      ? ethers.BigNumber.from(0)
      : total.mul(now - start).div(duration);
  }

module.exports = {
    vestedAmount,
}